const assert = require("node:assert/strict");
const { test } = require("node:test");
const { criarHandlerClassificacao } = require("../api/classify-instructor");

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

test("classifies an authenticated legacy account from the code and preserves custom claims", async () => {
  const updates = [];
  let claimsDefinidas;
  const services = {
    auth: {
      verifyIdToken: async () => ({ uid: "legacy-user" }),
      getUser: async () => ({
        uid: "legacy-user",
        email: "legacy@example.com",
        displayName: "Legacy User",
        customClaims: { existing: true }
      }),
      setCustomUserClaims: async (uid, claims) => {
        claimsDefinidas = { uid, claims };
      }
    },
    database: {
      ref(path) {
        if (!path) {
          return { update: async (data) => updates.push(data) };
        }
        return {
          once: async () => ({ val: () => null })
        };
      }
    },
    chaveHash: "test-hash-key"
  };
  const anteriores = {
    saude: process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE,
    resgate: process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE
  };
  process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE = "3636";
  process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE = "1212";

  try {
    const response = criarResposta();
    await criarHandlerClassificacao(() => services)({
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
        "content-length": "16"
      },
      body: { codigo: "1212" }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.perfil.profissaoInstrutor, "resgate");
    assert.equal(response.body.perfil.perfil, "instrutor");
    assert.equal(response.body.perfil.tipo, "profissional-seguranca-resgate");
    assert.equal(updates[0]["sos_escola_instructors/legacy-user"], true);
    assert.equal(
      updates[0]["sos_escola_profiles/legacy-user"].profissaoInstrutor,
      "resgate"
    );
    assert.deepEqual(claimsDefinidas, {
      uid: "legacy-user",
      claims: { existing: true, instructor: true }
    });
  } finally {
    if (anteriores.saude === undefined) delete process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE;
    else process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE = anteriores.saude;
    if (anteriores.resgate === undefined) delete process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE;
    else process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE = anteriores.resgate;
  }
});

test("promotes a legacy participant profile after validating an instructor code", async () => {
  const updates = [];
  const services = {
    auth: {
      verifyIdToken: async () => ({ uid: "legacy-user" }),
      getUser: async () => ({
        uid: "legacy-user",
        email: "legacy@example.com",
        displayName: "Legacy User",
        customClaims: {}
      }),
      setCustomUserClaims: async () => {}
    },
    database: {
      ref(path) {
        if (!path) return { update: async (data) => updates.push(data) };
        return {
          once: async () => ({
            val: () => path.endsWith("sos_escola_profiles/legacy-user")
              ? {
                perfil: "equipe",
                cargo: "",
                tipoCadastroSolicitado: "instrutor"
              }
              : null
          })
        };
      }
    },
    chaveHash: "test-hash-key"
  };
  const previousCodes = {
    health: process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE,
    rescue: process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE
  };
  process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE = "3636";
  process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE = "1212";

  try {
    const response = criarResposta();
    await criarHandlerClassificacao(() => services)({
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
        "content-length": "16"
      },
      body: { codigo: "3636" }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.perfil.perfil, "instrutor");
    assert.equal(response.body.perfil.cargo, "");
    assert.equal(response.body.perfil.profissaoInstrutor, "saude");
    assert.equal(response.body.perfil.tipo, "profissional-saude");
    assert.equal(response.body.perfil.tipoCadastroSolicitado, undefined);
    assert.equal(updates[0]["sos_escola_instructors/legacy-user"], true);
  } finally {
    if (previousCodes.health === undefined) delete process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE;
    else process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE = previousCodes.health;
    if (previousCodes.rescue === undefined) delete process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE;
    else process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE = previousCodes.rescue;
  }
});

test("requires an authenticated request before initializing Firebase", async () => {
  let initialized = false;
  const response = criarResposta();
  await criarHandlerClassificacao(() => {
    initialized = true;
    return {};
  })({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { codigo: "3636" }
  }, response);

  assert.equal(response.statusCode, 401);
  assert.equal(initialized, false);
});
