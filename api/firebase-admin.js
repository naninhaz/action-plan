const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase } = require("firebase-admin/database");

const APP_NAME = "sos-escola-registration";
const DATABASE_URL = "https://sos-escola-a6ccb-default-rtdb.firebaseio.com";

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

module.exports = { criarServicosFirebase };
