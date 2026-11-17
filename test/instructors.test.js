const assert = require("node:assert/strict");
const { test } = require("node:test");
const { criarHandlerInstrutores } = require("../api/instructors");

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

test("returns only authorized instructor identity fields to signed-in users", async () => {
  const handler = criarHandlerInstrutores(() => ({
    auth: {
      verifyIdToken: async () => ({ uid: "participant" }),
      getUsers: async (identifiers) => ({
        users: identifiers
          .filter(({ uid }) => uid === "instructor")
          .map(({ uid }) => ({ uid }))
      })
    },
    database: {
      ref(path) {
        return {
          once: async () => ({
            val: () => path === "sos_escola_profiles"
              ? {
                instructor: {
                  nome: "Instrutora",
                  email: "private@example.com",
                  perfil: "instrutor",
                  profissaoInstrutor: "profissional-saude"
                },
                participant: { nome: "Participante", perfil: "equipe" }
              }
              : { instructor: true, participant: false }
          })
        };
      }
    }
  }));
  const response = criarResposta();

  await handler({
    method: "GET",
    headers: { authorization: "Bearer token" }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, [{
    uid: "instructor",
    nome: "Instrutora",
    profissaoInstrutor: "profissional-saude"
  }]);
});

test("requires authentication before reading instructor profiles", async () => {
  let servicesRead = false;
  const response = criarResposta();
  await criarHandlerInstrutores(() => {
    servicesRead = true;
    return {};
  })({ method: "GET", headers: {} }, response);

  assert.equal(response.statusCode, 401);
  assert.equal(servicesRead, false);
});
