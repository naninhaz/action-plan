const assert = require("node:assert/strict");
const { test } = require("node:test");
const { criarHandlerAcessoInstrutor } = require("../api/instructor-access");

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

function criarServicos({ profile, instructor = true, claims = {}, erroClaims } = {}) {
  const updates = [];
  let claimsDefinidas;
  const database = {
    ref(path = "") {
      if (!path) {
        return { update: async (value) => updates.push(value) };
      }
      return {
        once: async () => ({
          val: () => path.endsWith("/legacy-user") && path.includes("profiles")
            ? profile
            : instructor
        })
      };
    }
  };
  return {
    updates,
    get claimsDefinidas() { return claimsDefinidas; },
    services: {
      auth: {
        verifyIdToken: async () => ({ uid: "legacy-user" }),
        getUser: async () => ({ customClaims: claims }),
        setCustomUserClaims: async (uid, value) => {
          if (erroClaims) throw erroClaims;
          claimsDefinidas = { uid, value };
        }
      },
      database
    }
  };
}

test("repairs instructor marker and custom claim for an already classified user", async () => {
  const state = criarServicos({
    profile: {
      nome: "Instrutora",
      perfil: "instrutor",
      profissaoInstrutor: "profissional-saude",
      cargo: "cargo legado"
    },
    instructor: null,
    claims: { existing: true }
  });
  const response = criarResposta();

  await criarHandlerAcessoInstrutor(() => state.services)({
    method: "GET",
    headers: { authorization: "Bearer valid-token" }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.isInstructor, true);
  assert.equal(response.body.profile.cargo, "");
  assert.equal(state.updates[0]["sos_escola_instructors/legacy-user"], true);
  assert.deepEqual(state.claimsDefinidas, {
    uid: "legacy-user",
    value: { existing: true, instructor: true }
  });
  assert.equal(response.headers["X-Instructor-Claims-Updated"], "true");
});

test("does not grant instructor access to participant profiles", async () => {
  const state = criarServicos({
    profile: { perfil: "equipe", cargo: "Professor(a)" },
    instructor: null
  });
  const response = criarResposta();

  await criarHandlerAcessoInstrutor(() => state.services)({
    method: "GET",
    headers: { authorization: "Bearer valid-token" }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.isInstructor, false);
  assert.equal(response.body.classificationRequired, false);
  assert.deepEqual(response.body.profile, { perfil: "equipe", cargo: "Professor(a)" });
  assert.equal(state.claimsDefinidas, undefined);
  assert.deepEqual(state.updates, []);
});

test("flags a legacy instructor marker for code-based reclassification without granting access", async () => {
  const state = criarServicos({
    profile: {
      perfil: "equipe",
      cargo: "",
      tipo: "equipe",
      tipoCadastroSolicitado: "instrutor",
      foto: "data:image/jpeg;base64,private-photo-data"
    },
    instructor: true
  });
  const response = criarResposta();

  await criarHandlerAcessoInstrutor(() => state.services)({
    method: "GET",
    headers: { authorization: "Bearer valid-token" }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.isInstructor, false);
  assert.equal(response.body.classificationRequired, true);
  assert.equal(response.body.profile.foto, undefined);
  assert.equal(state.claimsDefinidas, undefined);
  assert.deepEqual(state.updates, []);
});

test("reports missing Firebase Auth permissions when repairing instructor claims", async () => {
  const state = criarServicos({
    profile: {
      perfil: "instrutor",
      profissaoInstrutor: "profissional-saude"
    },
    erroClaims: Object.assign(new Error("permission denied"), {
      code: "auth/insufficient-permission"
    })
  });
  const response = criarResposta();

  const erroConsoleAnterior = console.error;
  console.error = () => {};
  try {
    await criarHandlerAcessoInstrutor(() => state.services)({
      method: "GET",
      headers: { authorization: "Bearer valid-token" }
    }, response);
  } finally {
    console.error = erroConsoleAnterior;
  }

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { error: "firebase-auth-permission-denied" });
});

test("requires a valid bearer token before accessing Firebase", async () => {
  let initialized = false;
  const response = criarResposta();

  await criarHandlerAcessoInstrutor(() => {
    initialized = true;
    return {};
  })({ method: "GET", headers: {} }, response);

  assert.equal(response.statusCode, 401);
  assert.equal(initialized, false);
});
