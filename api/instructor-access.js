const { criarServicosFirebase } = require("./firebase-admin");

const PROFILE_PATH = "sos_escola_profiles";
const INSTRUCTOR_PATH = "sos_escola_instructors";
const PROFISSOES = new Set([
  "profissional-saude",
  "profissional-seguranca-resgate",
  "saude",
  "resgate"
]);

function respond(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(status).json(body);
}

function criarHandlerAcessoInstrutor(obterServicos = criarServicosFirebase) {
  return async function verificarAcessoInstrutor(req, res) {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return respond(res, 405, { error: "method-not-allowed" });
    }

    const autorizacao = req.headers.authorization;
    const token = typeof autorizacao === "string"
      ? /^Bearer\s+(.+)$/i.exec(autorizacao)?.[1]
      : null;
    if (!token) return respond(res, 401, { error: "authentication-required" });

    let services;
    try {
      services = obterServicos();
    } catch (error) {
      console.error("Firebase instructor access is not configured.", error);
      return respond(res, 503, { error: "instructor-access-unavailable" });
    }

    let identity;
    try {
      identity = await services.auth.verifyIdToken(token);
    } catch {
      return respond(res, 401, { error: "invalid-authentication" });
    }

    try {
      const profileRef = services.database.ref(`${PROFILE_PATH}/${identity.uid}`);
      const [profileSnapshot, instructorSnapshot, account] = await Promise.all([
        profileRef.once("value"),
        services.database.ref(`${INSTRUCTOR_PATH}/${identity.uid}`).once("value"),
        services.auth.getUser(identity.uid)
      ]);
      const existingProfile = profileSnapshot.val();
      const existingInstructor = instructorSnapshot.val();
      const profile = existingProfile && typeof existingProfile === "object" &&
        !Array.isArray(existingProfile)
        ? existingProfile
        : {};
      const profession = PROFISSOES.has(profile.profissaoInstrutor)
        ? profile.profissaoInstrutor
        : "";
      const isInstructor = profile.perfil === "instrutor" && Boolean(profession);
      if (!isInstructor) {
        const profileForClient = { ...profile };
        delete profileForClient.foto;
        return respond(res, 200, {
          isInstructor: false,
          classificationRequired: existingInstructor === true ||
            profile.perfil === "instrutor" ||
            profile.tipo === "instrutor" ||
            PROFISSOES.has(profile.tipo) ||
            profile.tipoCadastroSolicitado === "instrutor",
          profile: profileForClient
        });
      }

      const canonicalProfile = {
        ...profile,
        uid: identity.uid,
        perfil: "instrutor",
        profissaoInstrutor: profession,
        cargo: ""
      };
      if (existingInstructor !== true || profile.cargo) {
        await services.database.ref().update({
          [`${PROFILE_PATH}/${identity.uid}`]: canonicalProfile,
          [`${INSTRUCTOR_PATH}/${identity.uid}`]: true
        });
      }

      let updatedClaims = false;
      if (account.customClaims?.instructor !== true) {
        await services.auth.setCustomUserClaims(identity.uid, {
          ...account.customClaims,
          instructor: true
        });
        updatedClaims = true;
      }
      if (updatedClaims) res.setHeader("X-Instructor-Claims-Updated", "true");
      const profileForClient = { ...canonicalProfile };
      delete profileForClient.foto;
      return respond(res, 200, { isInstructor: true, profile: profileForClient });
    } catch (error) {
      console.error("Could not reconcile instructor access for account.", error);
      return respond(res, 500, {
        error: error?.code === "auth/insufficient-permission"
          ? "firebase-auth-permission-denied"
          : "instructor-access-failed"
      });
    }
  };
}

module.exports = criarHandlerAcessoInstrutor();
module.exports.criarHandlerAcessoInstrutor = criarHandlerAcessoInstrutor;
