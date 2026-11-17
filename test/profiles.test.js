const assert = require("node:assert/strict");
const { test } = require("node:test");
const { criarHandlerPerfis } = require("../api/profiles");

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

function criarBanco(
  instrutor,
  perfis,
  instrutores = {},
  perfilInstrutor = { perfil: "instrutor" }
) {
  return {
    ref(caminho) {
      return {
        async once() {
          const valor = caminho === "sos_escola_instructors/instructor"
            ? instrutor
            : caminho === "sos_escola_instructors"
              ? instrutores
            : caminho === "sos_escola_profiles/instructor"
              ? perfilInstrutor
            : caminho === "sos_escola_profiles"
              ? perfis
              : null;
          return { val: () => valor };
        }
      };
    }
  };
}

test("returns only profiles whose Firebase Authentication accounts still exist", async () => {
  const handler = criarHandlerPerfis(() => ({
    auth: {
      verifyIdToken: async () => ({ uid: "instructor" }),
      getUser: async () => ({ customClaims: { instructor: true } }),
      setCustomUserClaims: async () => {},
      getUsers: async (identificadores) => ({
        users: identificadores
          .filter(({ uid }) => uid === "active" || uid === "pendingInstructor")
          .map(({ uid }) => ({ uid }))
      })
    },
    database: criarBanco(true, {
      active: { nome: "Ana", foto: `data:image/jpeg;base64,${"A".repeat(90_000)}` },
      deleted: { nome: "Bia" },
      invalid: { cargo: "Professor(a)" },
      instructor: { nome: "Instrutora", perfil: "instrutor" },
      pendingInstructor: { nome: "Instrutor pendente", perfil: "equipe", tipo: "instrutor" },
      legacyInstructor: { nome: "Instrutor antigo" }
    }, { instructor: true, legacyInstructor: true })
  }));
  const response = criarResposta();

  await handler({
    method: "GET",
    headers: { authorization: "Bearer token" }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    active: {
      uid: "active",
      nome: "Ana",
      cargo: "",
      email: "",
      perfil: "",
      criadoEm: "",
      profissaoInstrutor: "",
      temFoto: true
    }
  });
  assert.equal(response.headers["Cache-Control"], "no-store");
});

test("requires an authenticated instructor to read profiles", async () => {
  let consultouPerfis = false;
  const handler = criarHandlerPerfis(() => ({
    auth: {
      verifyIdToken: async () => ({ uid: "staff" }),
      getUser: async () => ({ customClaims: {} }),
      setCustomUserClaims: async () => {},
      getUsers: async () => ({ users: [] })
    },
    database: {
      ref(caminho) {
        return {
          async once() {
            if (caminho === "sos_escola_profiles") consultouPerfis = true;
            return { val: () => false };
          }
        };
      }
    }
  }));
  const response = criarResposta();

  await handler({
    method: "GET",
    headers: { authorization: "Bearer token" }
  }, response);

  assert.equal(response.statusCode, 403);
  assert.equal(consultouPerfis, false);
});

test("does not grant instructor access when the profile is classified as a participant", async () => {
  const handler = criarHandlerPerfis(() => ({
    auth: {
      verifyIdToken: async () => ({ uid: "staff" }),
      getUser: async () => ({ customClaims: { instructor: true } }),
      setCustomUserClaims: async () => {},
      getUsers: async () => ({ users: [] })
    },
    database: {
      ref(caminho) {
        return {
          async once() {
            if (caminho === "sos_escola_instructors/staff") {
              return { val: () => true };
            }
            if (caminho === "sos_escola_profiles/staff") {
              return { val: () => ({ perfil: "equipe", cargo: "Professor(a)" }) };
            }
            return { val: () => ({}) };
          }
        };
      }
    }
  }));
  const response = criarResposta();

  await handler({
    method: "GET",
    headers: { authorization: "Bearer token" }
  }, response);

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { error: "instructor-access-required" });
});

test("rejects profile requests without a bearer token", async () => {
  const response = criarResposta();
  await criarHandlerPerfis()({ method: "GET", headers: {} }, response);
  assert.equal(response.statusCode, 401);
});

test("refreshes the instructor claim for existing authorized instructors", async () => {
  let claimsDefinidas;
  const handler = criarHandlerPerfis(() => ({
    auth: {
      verifyIdToken: async () => ({ uid: "instructor" }),
      getUser: async () => ({ customClaims: { existing: true } }),
      setCustomUserClaims: async (uid, claims) => {
        claimsDefinidas = { uid, claims };
      },
      getUsers: async () => ({ users: [] })
    },
    database: criarBanco(true, null)
  }));
  const response = criarResposta();

  await handler({
    method: "GET",
    headers: { authorization: "Bearer token" }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["X-Instructor-Claims-Updated"], "true");
  assert.deepEqual(claimsDefinidas, {
    uid: "instructor",
    claims: { existing: true, instructor: true }
  });
});
