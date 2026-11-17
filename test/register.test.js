const assert = require("node:assert/strict");
const { generateKeyPairSync } = require("node:crypto");
const { test } = require("node:test");
const {
  codigoCorreto,
  identificarProfissaoInstrutor,
  respostaErroFirebaseAuth,
  validateRegistration
} = require("../api/register");
const register = require("../api/register");

const cadastroValido = {
  nome: "  Ana Silva  ",
  email: " ANA@ESCOLA.COM ",
  cargo: "Professor(a)",
  senha: "senha-segura"
};

test("validates and normalizes a staff registration", () => {
  assert.deepEqual(validateRegistration(cadastroValido), {
    nome: "Ana Silva",
    email: "ana@escola.com",
    cargo: "Professor(a)",
    profissaoInstrutor: "",
    tipoConta: "equipe",
    senha: "senha-segura"
  });
});

test("accepts instructor registration without a school role", () => {
  const { cargo, ...cadastroInstrutor } = cadastroValido;
  assert.deepEqual(validateRegistration({
    ...cadastroInstrutor,
    codigoInstrutor: "codigo-de-teste"
  }), {
    nome: "Ana Silva",
    email: "ana@escola.com",
    cargo: "",
    profissaoInstrutor: "",
    tipoConta: "instrutor",
    senha: "senha-segura"
  });
  assert.equal(validateRegistration({
    ...cadastroInstrutor,
    codigoInstrutor: "codigo-de-teste",
    profissaoInstrutor: "profissional-seguranca-resgate"
  }).tipoConta, "instrutor");
});

test("derives account type from whether an instructor code is provided", () => {
  assert.equal(validateRegistration({
    ...cadastroValido,
    tipoConta: "instrutor"
  }).tipoConta, "equipe");
  assert.equal(validateRegistration({
    ...cadastroValido,
    codigoInstrutor: "codigo-de-teste"
  }).tipoConta, "instrutor");
  assert.equal(validateRegistration({
    ...cadastroValido,
    profissaoInstrutor: "profissional-saude"
  }), null);
});

test("rejects short passwords, missing staff roles, and malformed instructor codes", () => {
  assert.equal(validateRegistration({ ...cadastroValido, senha: "12345" }), null);
  assert.equal(validateRegistration({ ...cadastroValido, cargo: undefined }), null);
  assert.equal(validateRegistration({
    ...cadastroValido,
    codigoInstrutor: 3636
  }), null);
});

test("compares instructor codes without accepting partial or mismatched values", () => {
  assert.equal(codigoCorreto("convite-seguro", "convite-seguro"), true);
  assert.equal(codigoCorreto("convite-invalido", "convite-seguro"), false);
  assert.equal(codigoCorreto("curto", "convite-seguro"), false);
});

test("detects instructor profession from its code without client-selected profession", () => {
  const codigos = {
    "profissional-saude": "3636",
    "profissional-seguranca-resgate": "1212"
  };
  assert.equal(identificarProfissaoInstrutor("3636", codigos), "profissional-saude");
  assert.equal(
    identificarProfissaoInstrutor("1212", codigos),
    "profissional-seguranca-resgate"
  );
  assert.equal(identificarProfissaoInstrutor("0000", codigos), null);
  assert.equal(
    identificarProfissaoInstrutor("3636", {
      "profissional-saude": "3636",
      "profissional-seguranca-resgate": "3636"
    }),
    null
  );
});

test("maps Firebase Admin failures to safe registration error codes", () => {
  assert.equal(
    respostaErroFirebaseAuth({ code: "auth/insufficient-permission" }),
    "firebase-auth-permission-denied"
  );
  assert.equal(
    respostaErroFirebaseAuth({ code: "auth/invalid-credential" }),
    "firebase-admin-credentials-invalid"
  );
  assert.equal(
    respostaErroFirebaseAuth({ code: "auth/operation-not-allowed" }),
    "firebase-email-password-disabled"
  );
  assert.equal(respostaErroFirebaseAuth({ code: "unknown" }), "account-creation-failed");
});

test("initializes Firebase services using the modular Admin SDK", () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const chavePrivada = privateKey.export({ type: "pkcs8", format: "pem" });
  const variavelAnterior = process.env.FIREBASE_SERVICE_ACCOUNT;
  process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
    project_id: "sos-escola-a6ccb",
    client_email: "test@sos-escola-a6ccb.iam.gserviceaccount.com",
    private_key: chavePrivada
  });

  try {
    const servicos = register.criarServicosFirebase();
    assert.equal(typeof servicos.auth.createUser, "function");
    assert.equal(typeof servicos.database.ref, "function");
    assert.equal(servicos.chaveHash, chavePrivada);
  } finally {
    if (variavelAnterior === undefined) {
      delete process.env.FIREBASE_SERVICE_ACCOUNT;
    } else {
      process.env.FIREBASE_SERVICE_ACCOUNT = variavelAnterior;
    }
  }
});

test("rejects non-POST signup requests", async () => {
  const response = criarResposta();
  await register({ method: "GET", headers: {} }, response);
  assert.equal(response.statusCode, 405);
  assert.deepEqual(response.body, { error: "method-not-allowed" });
});

test("rejects invalid registration data before accessing Firebase", async () => {
  const response = criarResposta();
  await register({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { ...cadastroValido, cargo: undefined }
  }, response);
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: "invalid-registration" });
});

test("completes a staff signup and stores its profile", async () => {
  const state = criarServicosRegistro();
  const response = criarResposta();

  await register({
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": "203.0.113.10"
    },
    body: cadastroValido
  }, response, () => state.servicos);

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, { customToken: "custom-token" });
  assert.equal(state.criado.email, "ana@escola.com");
  assert.deepEqual(state.atualizacoes[0]["sos_escola_profiles/new-user"], {
    uid: "new-user",
    nome: "Ana Silva",
    email: "ana@escola.com",
    cargo: "Professor(a)",
    profissaoInstrutor: "",
    perfil: "equipe",
    criadoEm: state.atualizacoes[0]["sos_escola_profiles/new-user"].criadoEm
  });
});

test("completes instructor signup using the matching invite code", async () => {
  const state = criarServicosRegistro();
  const response = criarResposta();
  const previousCodes = {
    health: process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE,
    rescue: process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE
  };
  process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE = "3636";
  process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE = "1212";

  try {
    await register({
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": "203.0.113.11"
      },
      body: {
        ...cadastroValido,
        codigoInstrutor: "3636"
      }
    }, response, () => state.servicos);

    assert.equal(response.statusCode, 201);
    assert.equal(state.atualizacoes[0]["sos_escola_profiles/new-user"].perfil, "instrutor");
    assert.equal(
      state.atualizacoes[0]["sos_escola_profiles/new-user"].profissaoInstrutor,
      "profissional-saude"
    );
    assert.equal(state.atualizacoes[0]["sos_escola_instructors/new-user"], true);
    assert.deepEqual(state.claims, { uid: "new-user", value: { instructor: true } });
  } finally {
    if (previousCodes.health === undefined) delete process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE;
    else process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE = previousCodes.health;
    if (previousCodes.rescue === undefined) delete process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE;
    else process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE = previousCodes.rescue;
  }
});

function criarServicosRegistro() {
  const atualizacoes = [];
  let criado;
  let claims;
  const database = {
    ref(path = "") {
      if (!path) {
        return { update: async (value) => atualizacoes.push(value) };
      }
      if (path.includes("/cadastros/") || path.includes("/codigos/")) {
        return {
          transaction: async () => ({
            committed: true,
            snapshot: { val: () => ({ expiresAt: Date.now() + 60_000 }) }
          })
        };
      }
      if (path.endsWith("/cadastros") || path.endsWith("/codigos")) {
        return {
          orderByChild() { return this; },
          endAt() { return this; },
          limitToFirst() { return this; },
          once: async () => ({ exists: () => false })
        };
      }
      throw new Error(`Unexpected database path: ${path}`);
    }
  };
  return {
    atualizacoes,
    get criado() { return criado; },
    get claims() { return claims; },
    servicos: {
      auth: {
        createUser: async (user) => {
          criado = user;
          return { uid: "new-user" };
        },
        setCustomUserClaims: async (uid, value) => {
          claims = { uid, value };
        },
        createCustomToken: async () => "custom-token"
      },
      database,
      chaveHash: "test-key"
    }
  };
}

function criarResposta() {
  return {
    headers: {},
    setHeader(nome, valor) {
      this.headers[nome] = valor;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}
