const assert = require("node:assert/strict");
const { generateKeyPairSync } = require("node:crypto");
const { test } = require("node:test");
const { codigoCorreto, validateRegistration } = require("../api/register");
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
    tipoConta: "equipe",
    senha: "senha-segura"
  });
});

test("accepts instructor registration without a school role", () => {
  const { cargo, ...cadastroInstrutor } = cadastroValido;
  assert.deepEqual(validateRegistration({
    ...cadastroInstrutor,
    codigoInstrutor: "convite"
  }), {
    nome: "Ana Silva",
    email: "ana@escola.com",
    cargo: "",
    tipoConta: "instrutor",
    senha: "senha-segura"
  });
});

test("derives staff access when no instructor code is provided", () => {
  assert.equal(validateRegistration({
    ...cadastroValido,
    tipoConta: "instrutor"
  }).tipoConta, "equipe");
  const codigoInvalido = validateRegistration({
    ...cadastroValido,
    codigoInstrutor: "codigo-incorreto"
  });
  assert.equal(codigoInvalido.tipoConta, "instrutor");
  assert.equal(codigoInvalido.cargo, "");
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
