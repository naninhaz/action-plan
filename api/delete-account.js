const { criarServicosFirebase } = require("./firebase-admin");

const PROFILE_PATH = "sos_escola_profiles";
const INSTRUCTOR_PATH = "sos_escola_instructors";
const RECORDS_PATH = "sos_escola_records";
const FEEDBACK_PATH = "sos_escola_feedback";

function respond(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(status).json(body);
}

function criarHandlerExclusaoConta(obterServicos = criarServicosFirebase) {
  return async function excluirConta(req, res) {
    if (req.method !== "DELETE") {
      res.setHeader("Allow", "DELETE");
      return respond(res, 405, { error: "method-not-allowed" });
    }

    const autorizacao = req.headers.authorization;
    const token = typeof autorizacao === "string"
      ? /^Bearer\s+(.+)$/i.exec(autorizacao)?.[1]
      : null;
    if (!token) return respond(res, 401, { error: "authentication-required" });

    let services;
    try {
      services = obterServicos();
    } catch (error) {
      console.error("Firebase account deletion is not configured.", error);
      return respond(res, 503, { error: "deletion-unavailable" });
    }

    let user;
    try {
      user = await services.auth.verifyIdToken(token);
    } catch {
      return respond(res, 401, { error: "invalid-authentication" });
    }

    try {
      const [authoredRecords, participantRecords, authoredFeedback, receivedFeedback] =
        await Promise.all([
          services.database.ref(RECORDS_PATH).orderByChild("uid").equalTo(user.uid).once("value"),
          services.database.ref(RECORDS_PATH)
            .orderByChild("participanteUid").equalTo(user.uid).once("value"),
          services.database.ref(FEEDBACK_PATH).orderByChild("uid").equalTo(user.uid).once("value"),
          services.database.ref(FEEDBACK_PATH)
            .orderByChild("instrutorUid").equalTo(user.uid).once("value")
        ]);
      const updates = {
        [`${PROFILE_PATH}/${user.uid}`]: null,
        [`${INSTRUCTOR_PATH}/${user.uid}`]: null
      };
      for (const [collection, snapshot] of [
        [RECORDS_PATH, authoredRecords],
        [RECORDS_PATH, participantRecords],
        [FEEDBACK_PATH, authoredFeedback],
        [FEEDBACK_PATH, receivedFeedback]
      ]) {
        const values = snapshot.val();
        if (!values || typeof values !== "object" || Array.isArray(values)) continue;
        for (const id of Object.keys(values)) {
          updates[`${collection}/${id}`] = null;
        }
      }

      await services.database.ref().update(updates);
      await services.auth.deleteUser(user.uid);
      return respond(res, 200, { deleted: true });
    } catch (error) {
      console.error("Could not completely delete Firebase account data.", error);
      return respond(res, 500, { error: "deletion-failed" });
    }
  };
}

module.exports = criarHandlerExclusaoConta();
module.exports.criarHandlerExclusaoConta = criarHandlerExclusaoConta;
