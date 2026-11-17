const { criarServicosFirebase } = require("./firebase-admin");

const PROFILE_PATH = "sos_escola_profiles";
const INSTRUCTOR_PATH = "sos_escola_instructors";
const AUTH_USERS_PER_REQUEST = 100;

function respond(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(status).json(body);
}

function criarHandlerInstrutores(obterServicos = criarServicosFirebase) {
  return async function listarInstrutores(req, res) {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return respond(res, 405, { error: "method-not-allowed" });
    }

    const autorizacao = req.headers.authorization;
    const token = typeof autorizacao === "string"
      ? /^Bearer\s+(.+)$/i.exec(autorizacao)?.[1]
      : null;
    if (!token) return respond(res, 401, { error: "authentication-required" });

    try {
      const { auth, database } = obterServicos();
      try {
        await auth.verifyIdToken(token);
      } catch {
        return respond(res, 401, { error: "invalid-authentication" });
      }

      const [profilesSnapshot, instructorsSnapshot] = await Promise.all([
        database.ref(PROFILE_PATH).once("value"),
        database.ref(INSTRUCTOR_PATH).once("value")
      ]);
      const profiles = profilesSnapshot.val();
      const instructors = instructorsSnapshot.val();
      if (profiles === null || instructors === null) return respond(res, 200, []);
      if (
        typeof profiles !== "object" || Array.isArray(profiles) ||
        typeof instructors !== "object" || Array.isArray(instructors)
      ) {
        throw new Error("Firebase instructor data is in an invalid format.");
      }

      const profilesByUid = Object.entries(instructors).flatMap(([uid, authorized]) => {
        const profile = profiles[uid];
        if (
          authorized !== true ||
          !profile ||
          typeof profile !== "object" ||
          Array.isArray(profile) ||
          profile.perfil !== "instrutor" ||
          typeof profile.nome !== "string"
        ) return [];
        return [{
          uid,
          nome: profile.nome,
          profissaoInstrutor: typeof profile.profissaoInstrutor === "string"
            ? profile.profissaoInstrutor
            : ""
        }];
      });
      const existingUids = new Set();
      for (let start = 0; start < profilesByUid.length; start += AUTH_USERS_PER_REQUEST) {
        const batch = profilesByUid.slice(start, start + AUTH_USERS_PER_REQUEST);
        const result = await auth.getUsers(batch.map(({ uid }) => ({ uid })));
        for (const account of result.users) existingUids.add(account.uid);
      }
      const result = profilesByUid
        .filter(({ uid }) => existingUids.has(uid))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

      return respond(res, 200, result);
    } catch (error) {
      console.error("Could not retrieve Firebase instructors.", error);
      return respond(res, 500, { error: "instructors-unavailable" });
    }
  };
}

module.exports = criarHandlerInstrutores();
module.exports.criarHandlerInstrutores = criarHandlerInstrutores;
