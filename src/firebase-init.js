import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import { get, getDatabase, ref, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCEi_CVVUXyNxWhXXUl6vLVra3mCty6oqc",
  authDomain: "sos-escola-a6ccb.firebaseapp.com",
  projectId: "sos-escola-a6ccb",
  storageBucket: "sos-escola-a6ccb.firebasestorage.app",
  messagingSenderId: "554347345635",
  appId: "1:554347345635:web:a9ef006d7b648259ca37d6",
  measurementId: "G-5NL1BJDXXQ",
  databaseURL: "https://sos-escola-a6ccb-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function databaseFor(databaseUrl) {
  const url = (databaseUrl || firebaseConfig.databaseURL).replace(/\/+$/, "");
  return getDatabase(app, url);
}

window.SosFirebase = {
  currentUser: () => auth.currentUser,
  hasInstructorAccess: async (databaseUrl, uid) => {
    const snapshot = await get(ref(databaseFor(databaseUrl), `sos_escola_instructors/${uid}`));
    return snapshot.val() === true;
  },
  readRecords: async (databaseUrl) => {
    const snapshot = await get(ref(databaseFor(databaseUrl), "sos_escola_records"));
    return snapshot.val();
  },
  onAuthStateChanged: (callback, onError) => onAuthStateChanged(auth, callback, onError),
  signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
  signOut: () => signOut(auth),
  writeRecord: (databaseUrl, record) => set(
    ref(databaseFor(databaseUrl), `sos_escola_records/${record.id}`),
    record
  )
};

async function initializeAnalytics() {
  if (!await isSupported()) {
    console.info("Firebase Analytics is not supported in this browser.");
    return;
  }
  getAnalytics(app);
}

void initializeAnalytics().catch((error) => {
  console.error("Could not initialize Firebase Analytics.", error);
});
