const { criarServicosFirebase } = require("./firebase-admin");

const PROFILE_PATH = "sos_escola_profiles";
const INSTRUCTOR_PATH = "sos_escola_instructors";
const AUTH_USERS_PER_REQUEST = 100;

function respond(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(status).json(body);
}

function criarHandlerPerfis(obterServicos = criarServicosFirebase) {
  return async function listarPerfis(req, res) {
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
      let usuario;
      try {
        usuario = await auth.verifyIdToken(token);
      } catch {
        return respond(res, 401, { error: "invalid-authentication" });
      }

      const [instrutor, perfilInstrutor] = await Promise.all([
        database.ref(`${INSTRUCTOR_PATH}/${usuario.uid}`).once("value"),
        database.ref(`${PROFILE_PATH}/${usuario.uid}`).once("value")
      ]);
      const perfilAtual = perfilInstrutor.val();
      if (
        instrutor.val() !== true ||
        perfilAtual?.perfil !== "instrutor"
      ) {
        return respond(res, 403, { error: "instructor-access-required" });
      }

      const contaInstrutor = await auth.getUser(usuario.uid);
      let atualizouPermissaoDeFotos = false;
      if (contaInstrutor.customClaims?.instructor !== true) {
        await auth.setCustomUserClaims(usuario.uid, {
          ...contaInstrutor.customClaims,
          instructor: true
        });
        atualizouPermissaoDeFotos = true;
      }

      const snapshot = await database.ref(PROFILE_PATH).once("value");
      const dados = snapshot.val();
      if (dados === null) {
        if (atualizouPermissaoDeFotos) res.setHeader("X-Instructor-Claims-Updated", "true");
        return respond(res, 200, {});
      }
      if (typeof dados !== "object" || Array.isArray(dados)) {
        throw new Error("Firebase profiles are in an invalid format.");
      }

      const instrutoresSnapshot = await database.ref(INSTRUCTOR_PATH).once("value");
      const instrutores = instrutoresSnapshot.val();
      if (instrutores !== null && (typeof instrutores !== "object" || Array.isArray(instrutores))) {
        throw new Error("Firebase instructors are in an invalid format.");
      }
      const perfis = Object.entries(dados).filter(([uid, perfil]) =>
        perfil && typeof perfil === "object" && !Array.isArray(perfil) &&
        typeof perfil.nome === "string" &&
        perfil.perfil !== "instrutor" &&
        ![
          "instrutor",
          "profissional-saude",
          "profissional-seguranca-resgate"
        ].includes(perfil.tipo) &&
        perfil.tipoCadastroSolicitado !== "instrutor" &&
        instrutores?.[uid] !== true
      );
      const uidExistentes = new Set();
      for (let inicio = 0; inicio < perfis.length; inicio += AUTH_USERS_PER_REQUEST) {
        const lote = perfis.slice(inicio, inicio + AUTH_USERS_PER_REQUEST);
        const resultado = await auth.getUsers(lote.map(([uid]) => ({ uid })));
        for (const conta of resultado.users) uidExistentes.add(conta.uid);
      }

      const perfisAtivos = Object.fromEntries(
        perfis
          .filter(([uid]) => uidExistentes.has(uid))
          .map(([uid, perfil]) => [uid, {
            uid,
            nome: perfil.nome,
            cargo: typeof perfil.cargo === "string" ? perfil.cargo : "",
            email: typeof perfil.email === "string" ? perfil.email : "",
            perfil: typeof perfil.perfil === "string" ? perfil.perfil : "",
            criadoEm: typeof perfil.criadoEm === "string" ? perfil.criadoEm : "",
            profissaoInstrutor: typeof perfil.profissaoInstrutor === "string"
              ? perfil.profissaoInstrutor
              : "",
            temFoto: typeof perfil.foto === "string"
          }])
      );
      if (atualizouPermissaoDeFotos) res.setHeader("X-Instructor-Claims-Updated", "true");
      return respond(res, 200, perfisAtivos);
    } catch (error) {
      console.error("Could not retrieve active Firebase profiles.", error);
      return respond(res, 500, { error: "profiles-unavailable" });
    }
  };
}

module.exports = criarHandlerPerfis();
module.exports.criarHandlerPerfis = criarHandlerPerfis;
