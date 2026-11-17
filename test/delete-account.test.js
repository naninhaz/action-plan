const assert = require("node:assert/strict");
const { test } = require("node:test");
const { criarHandlerExclusaoConta } = require("../api/delete-account");

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

function criarServicos(registros, feedbacks) {
  const updates = [];
  const deletedUsers = [];
  const database = {
    ref(path = "") {
      if (!path) {
        return { update: async (value) => updates.push(value) };
      }
      const query = { field: "", expected: "" };
      const reference = {
        orderByChild(field) {
          query.field = field;
          return reference;
        },
        equalTo(expected) {
          query.expected = expected;
          return reference;
        },
        async once() {
          const records = path === "sos_escola_records" ? registros : feedbacks;
          const found = Object.fromEntries(
            Object.entries(records).filter(([, value]) => value[query.field] === query.expected)
          );
          return { val: () => found };
        }
      };
      return reference;
    }
  };
  return {
    services: {
      auth: {
        verifyIdToken: async () => ({ uid: "self" }),
        deleteUser: async (uid) => deletedUsers.push(uid)
      },
      database
    },
    updates,
    deletedUsers
  };
}

test("deletes only data belonging to the authenticated user", async () => {
  const state = criarServicos({
    ownQuiz: { uid: "self", tipo: "questionario" },
    instructorAssessment: { uid: "other-instructor", participanteUid: "self" },
    anotherUser: { uid: "other" }
  }, {
    submittedFeedback: { uid: "self", instrutorUid: "instructor" },
    receivedFeedback: { uid: "participant", instrutorUid: "self" },
    unrelatedFeedback: { uid: "other", instrutorUid: "another-instructor" }
  });
  const response = criarResposta();

  await criarHandlerExclusaoConta(() => state.services)({
    method: "DELETE",
    headers: { authorization: "Bearer token" }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { deleted: true });
  assert.equal(state.updates.length, 1);
  assert.equal(state.updates[0]["sos_escola_profiles/self"], null);
  assert.equal(state.updates[0]["sos_escola_instructors/self"], null);
  assert.equal(state.updates[0]["sos_escola_records/ownQuiz"], null);
  assert.equal(state.updates[0]["sos_escola_records/instructorAssessment"], null);
  assert.equal(state.updates[0]["sos_escola_records/anotherUser"], undefined);
  assert.equal(state.updates[0]["sos_escola_feedback/submittedFeedback"], null);
  assert.equal(state.updates[0]["sos_escola_feedback/receivedFeedback"], null);
  assert.equal(state.updates[0]["sos_escola_feedback/unrelatedFeedback"], undefined);
  assert.deepEqual(state.deletedUsers, ["self"]);
});

test("does not initialize Firebase for unauthenticated account deletion", async () => {
  let initialized = false;
  const response = criarResposta();

  await criarHandlerExclusaoConta(() => {
    initialized = true;
    return {};
  })({ method: "DELETE", headers: {} }, response);

  assert.equal(response.statusCode, 401);
  assert.equal(initialized, false);
});
