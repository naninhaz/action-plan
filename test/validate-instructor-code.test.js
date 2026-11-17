const assert = require("node:assert/strict");
const { test } = require("node:test");
const { criarHandlerValidacaoCodigo } = require("../api/validate-instructor-code");

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

function criarServicos() {
  const tentativas = [];
  return {
    tentativas,
    services: {
      chaveHash: "test-secret",
      database: {
        ref(path) {
          if (path.includes("/codigos/")) {
            return {
              transaction: async () => {
                tentativas.push(path);
                return {
                  committed: true,
                  snapshot: { val: () => ({ expiresAt: Date.now() + 60_000 }) }
                };
              }
            };
          }
          return {
            orderByChild() { return this; },
            endAt() { return this; },
            limitToFirst() { return this; },
            once: async () => ({ exists: () => false })
          };
        }
      }
    }
  };
}

test("validates an access code before account creation without returning the code", async () => {
  const state = criarServicos();
  const response = criarResposta();
  const previousCodes = {
    health: process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE,
    rescue: process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE
  };
  process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE = "3636";
  process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE = "1212";

  try {
    await criarHandlerValidacaoCodigo(() => state.services)({
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "16"
      },
      body: { codigo: "1212" }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { valid: true });
    assert.equal(state.tentativas.length, 0);

    const responseHealth = criarResposta();
    await criarHandlerValidacaoCodigo(() => state.services)({
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "16"
      },
      body: { codigo: "3636" }
    }, responseHealth);
    assert.deepEqual(responseHealth.body, { valid: true });
  } finally {
    if (previousCodes.health === undefined) delete process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE;
    else process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE = previousCodes.health;
    if (previousCodes.rescue === undefined) delete process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE;
    else process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE = previousCodes.rescue;
  }
});

test("rejects invalid codes and applies a server-side attempt limit", async () => {
  const state = criarServicos();
  const response = criarResposta();
  const previousCodes = {
    health: process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE,
    rescue: process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE
  };
  process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE = "3636";
  process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE = "1212";

  try {
    await criarHandlerValidacaoCodigo(() => state.services)({
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "16",
        "x-real-ip": "203.0.113.20"
      },
      body: { codigo: "0000" }
    }, response);

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.body, { error: "invalid-instructor-code" });
    assert.equal(state.tentativas.length, 1);
  } finally {
    if (previousCodes.health === undefined) delete process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE;
    else process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE = previousCodes.health;
    if (previousCodes.rescue === undefined) delete process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE;
    else process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE = previousCodes.rescue;
  }
});
