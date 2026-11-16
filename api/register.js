const { createHmac, timingSafeEqual } = require("node:crypto");
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase } = require("firebase-admin/database");

const APP_NAME = "sos-escola-registration";
const DATABASE_URL = "https://sos-escola-a6ccb-default-rtdb.firebaseio.com";
const RATE_LIMIT_PATH = "sos_escola_signup_attempts";
const CODE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const REGISTRATION_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_FAILED_CODES = 5;
const MAX_REGISTRATIONS = 20;
const CARGOS = new Set([
  "Professor(a)",
  "Auxiliar / Cuidador(a)",
  "Funcionário(a) de Apoio / Cozinha",
  "Gestão Escolar"
]);

function respond(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(status).json(body);
}

function validateRegistration(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (body.codigoInstrutor !== undefined && typeof body.codigoInstrutor !== "string") return null;
  const tipoConta = typeof body.codigoInstrutor === "string" && body.codigoInstrutor.length > 0
    ? "instrutor"
    : "equipe";
  const cargo = tipoConta === "instrutor"
    ? ""
    : typeof body.cargo === "string"
      ? body.cargo
      : "";
  const senha = typeof body.senha === "string" ? body.senha : "";

  if (
    nome.length < 2 ||
    nome.length > 100 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    (tipoConta === "equipe" && !CARGOS.has(cargo)) ||
    senha.length < 6 ||
    senha.length > 128
  ) {
    return null;
  }

  return { nome, email, cargo, senha, tipoConta };
}

function codigoCorreto(informado, esperado) {
  if (typeof informado !== "string" || typeof esperado !== "string") return false;
  const recebido = Buffer.from(informado);
  const configurado = Buffer.from(esperado);
  return recebido.length === configurado.length && timingSafeEqual(recebido, configurado);
}

function criarServicosFirebase() {
  const credencialJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!credencialJson) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured.");

  const credencial = JSON.parse(credencialJson);
  if (
    credencial.project_id !== "sos-escola-a6ccb" ||
    !credencial.client_email ||
    !credencial.private_key
  ) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is invalid or incomplete.");
  }

  const appExistente = getApps().find((item) => item.name === APP_NAME);
  const app = appExistente || initializeApp({
    credential: cert(credencial),
    databaseURL: DATABASE_URL
  }, APP_NAME);

  return {
    auth: getAuth(app),
    database: getDatabase(app),
    chaveHash: credencial.private_key
  };
}

function obterIpCliente(req) {
  const realIp = req.headers["x-real-ip"];
  const forwardedFor = req.headers["x-forwarded-for"];
  const valor = typeof realIp === "string" && realIp.trim()
    ? realIp.trim()
    : typeof forwardedFor === "string"
      ? forwardedFor.split(",").map((ip) => ip.trim()).filter(Boolean).at(-1)
      : "";
  return valor || "";
}

async function registrarLimite(database, ip, chaveHash, categoria, maximo, janelaMs) {
  const agora = Date.now();
  const chaveIp = createHmac("sha256", chaveHash).update(ip).digest("hex");
  const caminho = `${RATE_LIMIT_PATH}/${categoria}`;
  const tentativas = database.ref(`${caminho}/${chaveIp}`);
  const resultado = await tentativas.transaction((atual) => {
    if (!atual || atual.expiresAt <= agora) {
      return { count: 1, expiresAt: agora + janelaMs };
    }
    if (atual.count >= maximo) return;
    return { count: atual.count + 1, expiresAt: atual.expiresAt };
  });

  const antigas = await database.ref(caminho)
    .orderByChild("expiresAt")
    .endAt(agora)
    .limitToFirst(100)
    .once("value");
  if (antigas.exists()) {
    const remocoes = {};
    for (const chave of Object.keys(antigas.val())) remocoes[chave] = null;
    await database.ref(caminho).update(remocoes);
  }

  const expiracao = resultado.snapshot.val()?.expiresAt || agora + janelaMs;
  return {
    bloqueado: !resultado.committed,
    segundosParaTentar: Math.max(1, Math.ceil((expiracao - agora) / 1000))
  };
}

async function removerContaParcial(auth, database, uid, tipoConta) {
  const remocoes = { [`sos_escola_profiles/${uid}`]: null };
  if (tipoConta === "instrutor") remocoes[`sos_escola_instructors/${uid}`] = null;
  try {
    await database.ref().update(remocoes);
  } catch (error) {
    console.error("Could not remove incomplete Firebase registration data.", error);
  }
  try {
    await auth.deleteUser(uid);
  } catch (error) {
    console.error("Could not remove incomplete Firebase Authentication account.", error);
  }
}

module.exports = async function register(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return respond(res, 405, { error: "method-not-allowed" });
  }

  const tamanho = Number(req.headers["content-length"] || 0);
  if (tamanho > 16 * 1024) return respond(res, 413, { error: "request-too-large" });
  if (!String(req.headers["content-type"] || "").includes("application/json")) {
    return respond(res, 415, { error: "json-required" });
  }

  const cadastro = validateRegistration(req.body);
  if (!cadastro) return respond(res, 400, { error: "invalid-registration" });

  let servicos;
  try {
    servicos = criarServicosFirebase();
  } catch (error) {
    console.error("Firebase registration is not configured.", error);
    return respond(res, 503, { error: "registration-unavailable" });
  }

  if (cadastro.tipoConta === "instrutor") {
    const codigoEsperado = process.env.INSTRUCTOR_SIGNUP_CODE;
    if (!codigoEsperado) {
      console.error("INSTRUCTOR_SIGNUP_CODE is not configured.");
      return respond(res, 503, { error: "registration-unavailable" });
    }

    if (!codigoCorreto(req.body.codigoInstrutor, codigoEsperado)) {
      const ip = obterIpCliente(req);
      if (!ip) return respond(res, 503, { error: "registration-unavailable" });

      try {
        const limite = await registrarLimite(
          servicos.database,
          ip,
          servicos.chaveHash,
          "codigos",
          MAX_FAILED_CODES,
          CODE_LIMIT_WINDOW_MS
        );
        if (limite.bloqueado) {
          res.setHeader("Retry-After", String(limite.segundosParaTentar));
          return respond(res, 429, { error: "too-many-code-attempts" });
        }
      } catch (error) {
        console.error("Could not enforce instructor signup rate limit.", error);
        return respond(res, 503, { error: "registration-unavailable" });
      }

      return respond(res, 403, { error: "invalid-instructor-code" });
    }
  }

  const ip = obterIpCliente(req);
  if (!ip) return respond(res, 503, { error: "registration-unavailable" });
  try {
    const limite = await registrarLimite(
      servicos.database,
      ip,
      servicos.chaveHash,
      "cadastros",
      MAX_REGISTRATIONS,
      REGISTRATION_LIMIT_WINDOW_MS
    );
    if (limite.bloqueado) {
      res.setHeader("Retry-After", String(limite.segundosParaTentar));
      return respond(res, 429, { error: "too-many-registrations" });
    }
  } catch (error) {
    console.error("Could not enforce registration rate limit.", error);
    return respond(res, 503, { error: "registration-unavailable" });
  }

  let usuario;
  try {
    usuario = await servicos.auth.createUser({
      email: cadastro.email,
      password: cadastro.senha,
      displayName: cadastro.nome
    });
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      return respond(res, 409, { error: "email-already-registered" });
    }
    if (error.code === "auth/invalid-email" || error.code === "auth/invalid-password") {
      return respond(res, 400, { error: "invalid-registration" });
    }
    console.error("Could not create Firebase Authentication account.", error);
    return respond(res, 500, { error: "registration-failed" });
  }

  try {
    const atualizacoes = {
      [`sos_escola_profiles/${usuario.uid}`]: {
        uid: usuario.uid,
        nome: cadastro.nome,
        email: cadastro.email,
        cargo: cadastro.cargo,
        perfil: cadastro.tipoConta,
        criadoEm: new Date().toISOString()
      }
    };
    if (cadastro.tipoConta === "instrutor") {
      atualizacoes[`sos_escola_instructors/${usuario.uid}`] = true;
    }
    await servicos.database.ref().update(atualizacoes);

    const customToken = await servicos.auth.createCustomToken(usuario.uid);
    return respond(res, 201, { customToken });
  } catch (error) {
    console.error("Could not finish Firebase registration.", error);
    await removerContaParcial(
      servicos.auth,
      servicos.database,
      usuario.uid,
      cadastro.tipoConta
    );
    return respond(res, 500, { error: "registration-failed" });
  }
};

module.exports.validateRegistration = validateRegistration;
module.exports.codigoCorreto = codigoCorreto;
module.exports.criarServicosFirebase = criarServicosFirebase;
