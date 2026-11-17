const { criarServicosFirebase } = require("./firebase-admin");
const {
  identificarProfissaoInstrutor,
  registrarLimite
} = require("./register");

const PROFILE_PATH = "sos_escola_profiles";
const INSTRUCTOR_PATH = "sos_escola_instructors";
const CODE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_CODES = 5;

function respond(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(status).json(body);
}

function getClientIp(req) {
  const realIp = req.headers["x-real-ip"];
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",").map((ip) => ip.trim()).filter(Boolean).at(-1) || "";
  }
  return "";
}

function criarHandlerClassificacao(obterServicos = criarServicosFirebase) {
  return async function classifyInstructor(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return respond(res, 405, { error: "method-not-allowed" });
    }

    if (Number(req.headers["content-length"] || 0) > 1024) {
      return respond(res, 413, { error: "request-too-large" });
    }
    if (!String(req.headers["content-type"] || "").includes("application/json")) {
      return respond(res, 415, { error: "json-required" });
    }

    const authorization = req.headers.authorization;
    const token = typeof authorization === "string"
      ? /^Bearer\s+(.+)$/i.exec(authorization)?.[1]
      : null;
    if (!token) return respond(res, 401, { error: "authentication-required" });

    const code = req.body && typeof req.body.codigo === "string"
      ? req.body.codigo
      : "";
    if (!code || code.length > 128) {
      return respond(res, 400, { error: "invalid-instructor-code" });
    }

    let services;
    try {
      services = obterServicos();
    } catch (error) {
      console.error("Firebase instructor classification is not configured.", error);
      return respond(res, 503, { error: "classification-unavailable" });
    }

    let authenticatedUser;
    try {
      authenticatedUser = await services.auth.verifyIdToken(token);
    } catch {
      return respond(res, 401, { error: "invalid-authentication" });
    }

    const expectedCodes = {
      "profissional-saude": process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE,
      "profissional-seguranca-resgate": process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE
    };
    if (
      !Object.values(expectedCodes).every(Boolean) ||
      expectedCodes["profissional-saude"] === expectedCodes["profissional-seguranca-resgate"]
    ) {
      console.error("Health and rescue instructor signup codes are not fully configured.");
      return respond(res, 503, { error: "classification-unavailable" });
    }

    const profissao = identificarProfissaoInstrutor(code, expectedCodes);
    if (!profissao) {
      try {
        const limite = await registrarLimite(
          services.database,
          `${authenticatedUser.uid}:${getClientIp(req) || "unknown"}`,
          services.chaveHash,
          "classificacoes",
          MAX_FAILED_CODES,
          CODE_LIMIT_WINDOW_MS
        );
        if (limite.bloqueado) {
          res.setHeader("Retry-After", String(limite.segundosParaTentar));
          return respond(res, 429, { error: "too-many-code-attempts" });
        }
      } catch (error) {
        console.error("Could not enforce instructor classification rate limit.", error);
        return respond(res, 503, { error: "classification-unavailable" });
      }
      return respond(res, 403, { error: "invalid-instructor-code" });
    }

    try {
      const profileRef = services.database.ref(`${PROFILE_PATH}/${authenticatedUser.uid}`);
      const instructorRef = services.database.ref(`${INSTRUCTOR_PATH}/${authenticatedUser.uid}`);
      const [profileSnapshot, instructorSnapshot, account] = await Promise.all([
        profileRef.once("value"),
        instructorRef.once("value"),
        services.auth.getUser(authenticatedUser.uid)
      ]);
      const previousProfile = profileSnapshot.val();
      const previousInstructor = instructorSnapshot.val();
      if (previousProfile !== null &&
          (typeof previousProfile !== "object" || Array.isArray(previousProfile))) {
        throw new Error("Existing instructor profile has an invalid format.");
      }
      const profissaoAnterior = previousProfile?.profissaoInstrutor;
      if (
        previousProfile?.perfil === "instrutor" &&
        ["profissional-saude", "profissional-seguranca-resgate", "saude", "resgate"]
          .includes(profissaoAnterior) &&
        !(
          (profissaoAnterior === "profissional-saude" || profissaoAnterior === "saude") &&
            profissao === "profissional-saude" ||
          (profissaoAnterior === "profissional-seguranca-resgate" ||
            profissaoAnterior === "resgate") &&
            profissao === "profissional-seguranca-resgate"
        )
      ) {
        return respond(res, 409, { error: "profile-already-classified" });
      }

      const codigoProfissional = profissao === "profissional-saude"
        ? "profissional-saude"
        : "profissional-seguranca-resgate";
      const profile = {
        ...(previousProfile || {}),
        uid: authenticatedUser.uid,
        nome: previousProfile?.nome || account.displayName || account.email || "Instrutor",
        email: previousProfile?.email || account.email || "",
        perfil: "instrutor",
        tipo: codigoProfissional,
        cargo: "",
        profissaoInstrutor: profissao === "profissional-saude" ? "saude" : "resgate",
        criadoEm: previousProfile?.criadoEm || new Date().toISOString()
      };
      delete profile.tipoCadastroSolicitado;

      await services.database.ref().update({
        [`${PROFILE_PATH}/${authenticatedUser.uid}`]: profile,
        [`${INSTRUCTOR_PATH}/${authenticatedUser.uid}`]: true
      });

      try {
        await services.auth.setCustomUserClaims(authenticatedUser.uid, {
          ...account.customClaims,
          instructor: true
        });
      } catch (error) {
        try {
          await services.database.ref().update({
            [`${PROFILE_PATH}/${authenticatedUser.uid}`]: previousProfile,
            [`${INSTRUCTOR_PATH}/${authenticatedUser.uid}`]: previousInstructor
          });
        } catch (rollbackError) {
          console.error("Could not roll back incomplete instructor classification.", rollbackError);
        }
        throw error;
      }

      return respond(res, 200, { perfil: profile });
    } catch (error) {
      console.error("Could not classify legacy instructor account.", error);
      return respond(res, 500, {
        error: error?.code === "auth/insufficient-permission"
          ? "firebase-auth-permission-denied"
          : "classification-failed"
      });
    }
  };
}

module.exports = criarHandlerClassificacao();
module.exports.criarHandlerClassificacao = criarHandlerClassificacao;
