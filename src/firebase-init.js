import { getAnalytics, isSupported } from "firebase/analytics";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  updateProfile,
  signOut
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import {
  get,
  getDatabase,
  onValue,
  orderByChild,
  equalTo,
  query,
  ref,
  set,
  update
} from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCEi_CVVUXyNxWhXXUl6vLVra3mCty6oqc",
  authDomain: "sos-escola-a6ccb.firebaseapp.com",
  projectId: "sos-escola-a6ccb",
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

async function lerPerfisAtivos() {
  const usuario = auth.currentUser;
  if (!usuario) throw new Error("É necessário entrar com uma conta Firebase.");
  const token = await usuario.getIdToken();
  const fazerRequisicao = (idToken) => fetch("/api/profiles", {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: "no-store"
  });
  let response = await fazerRequisicao(token);
  if (response.status === 404) {
    throw new Error(
      "A API de perfis não está publicada nesta versão (HTTP 404). Publique a versão mais recente no Vercel."
    );
  }
  if (response.headers.get("X-Instructor-Claims-Updated") === "true") {
    response = await fazerRequisicao(await usuario.getIdToken(true));
  }
  const texto = await response.text();
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error(`O servidor retornou uma resposta inválida (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(dados.error || "Não foi possível carregar os perfis ativos.");
  }
  return dados;
}

window.SosFirebase = {
  currentUser: () => auth.currentUser,
  createAccountAndProfile: async ({
    nome,
    email,
    password,
    cargo,
    tipoConta,
  }) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    const profileRef = ref(
      databaseFor(firebaseConfig.databaseURL),
      `sos_escola_profiles/${user.uid}`
    );
    try {
      await set(profileRef, {
        uid: user.uid,
        nome,
        email: user.email || email,
        cargo: tipoConta === "instrutor" ? "" : cargo,
        tipo: "equipe",
        perfil: "equipe",
        profissaoInstrutor: "",
        ...(tipoConta === "instrutor" ? { tipoCadastroSolicitado: "instrutor" } : {}),
        criadoEm: new Date().toISOString()
      });
      await updateProfile(user, { displayName: nome });
    } catch (error) {
      try {
        await set(profileRef, null);
      } catch (cleanupProfileError) {
        console.error("Could not remove the incomplete Firebase profile.", cleanupProfileError);
      }
      try {
        await deleteUser(user);
      } catch (cleanupError) {
        console.error("Could not remove the incomplete Firebase account.", cleanupError);
      }
      throw error;
    }
    return user;
  },
  resolveInstructorAccount: async () => {
    const usuario = auth.currentUser;
    if (!usuario) throw new Error("É necessário entrar com uma conta Firebase.");
    const response = await fetch("/api/instructor-access", {
      headers: { Authorization: `Bearer ${await usuario.getIdToken()}` },
      cache: "no-store"
    });
    if (response.status === 404) {
      throw new Error("instructor-access-not-published");
    }
    const texto = await response.text();
    let dados;
    try {
      dados = JSON.parse(texto);
    } catch (error) {
      throw new Error(`O servidor retornou uma resposta inválida (HTTP ${response.status}).`, {
        cause: error
      });
    }
    if (!response.ok) throw new Error(dados.error || "Não foi possível validar o perfil.");
    if (response.headers.get("X-Instructor-Claims-Updated") === "true") {
      await usuario.getIdToken(true);
    }
    return dados;
  },
  refreshCurrentUserToken: async () => {
    if (!auth.currentUser) throw new Error("É necessário entrar com uma conta Firebase.");
    await auth.currentUser.getIdToken(true);
  },
  hasInstructorAccess: async (databaseUrl, uid) => {
    const snapshot = await get(ref(databaseFor(databaseUrl), `sos_escola_instructors/${uid}`));
    return snapshot.val() === true;
  },
  readProfile: async (databaseUrl, uid) => {
    const snapshot = await get(ref(databaseFor(databaseUrl), `sos_escola_profiles/${uid}`));
    return snapshot.val();
  },
  readProfiles: lerPerfisAtivos,
  readInstructors: async () => {
    const usuario = auth.currentUser;
    if (!usuario) throw new Error("É necessário entrar com uma conta Firebase.");
    const response = await fetch("/api/instructors", {
      headers: { Authorization: `Bearer ${await usuario.getIdToken()}` },
      cache: "no-store"
    });
    const texto = await response.text();
    let dados;
    try {
      dados = JSON.parse(texto);
    } catch (error) {
      throw new Error(`O servidor retornou uma resposta inválida (HTTP ${response.status}).`, {
        cause: error
      });
    }
    if (!response.ok) throw new Error(dados.error || "Não foi possível carregar instrutores.");
    if (!Array.isArray(dados)) throw new Error("A lista de instrutores está em um formato inválido.");
    return dados;
  },
  readRecords: async (databaseUrl) => {
    const snapshot = await get(ref(databaseFor(databaseUrl), "sos_escola_records"));
    return snapshot.val();
  },
  readMyRecords: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("É necessário entrar com uma conta Firebase.");
    const registros = ref(databaseFor(firebaseConfig.databaseURL), "sos_escola_records");
    const [proprios, deParticipante] = await Promise.all([
      get(query(registros, orderByChild("uid"), equalTo(uid))),
      get(query(registros, orderByChild("participanteUid"), equalTo(uid)))
    ]);
    return { ...proprios.val(), ...deParticipante.val() };
  },
  readMyInstructorFeedback: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("É necessário entrar com uma conta Firebase.");
    const snapshot = await get(query(
      ref(databaseFor(firebaseConfig.databaseURL), "sos_escola_feedback"),
      orderByChild("instrutorUid"),
      equalTo(uid)
    ));
    return snapshot.val();
  },
  writeInstructorFeedback: (feedback) => set(
    ref(databaseFor(firebaseConfig.databaseURL), `sos_escola_feedback/${feedback.id}`),
    feedback
  ),
  readProfilePhoto: async (uid) => {
    const usuario = auth.currentUser;
    if (!uid || !usuario) {
      throw new Error("É necessário entrar com uma conta Firebase.");
    }
    const snapshot = await get(ref(
      databaseFor(firebaseConfig.databaseURL),
      `sos_escola_profiles/${uid}/foto`
    ));
    const foto = snapshot.val();
    if (foto === null) return null;
    if (
      typeof foto !== "string" ||
      !foto.startsWith("data:image/jpeg;base64,") ||
      foto.length >= 100_000
    ) {
      throw new Error("A foto armazenada no perfil tem um formato inválido.");
    }
    return foto;
  },
  uploadProfilePhoto: async (foto) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("É necessário entrar com uma conta Firebase.");
    if (
      typeof foto !== "string" ||
      !foto.startsWith("data:image/jpeg;base64,") ||
      foto.length >= 100_000
    ) {
      throw new Error("A foto comprimida deve ser JPEG e menor que 100 KB.");
    }
    await update(ref(
      databaseFor(firebaseConfig.databaseURL),
      `sos_escola_profiles/${uid}`
    ), { foto });
    return foto;
  },
  deleteAccount: async () => {
    const usuario = auth.currentUser;
    if (!usuario) throw new Error("É necessário entrar com uma conta Firebase.");
    const response = await fetch("/api/delete-account", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${await usuario.getIdToken()}` },
      cache: "no-store"
    });
    const texto = await response.text();
    let dados;
    try {
      dados = JSON.parse(texto);
    } catch (error) {
      throw new Error(`O servidor retornou uma resposta inválida (HTTP ${response.status}).`, {
        cause: error
      });
    }
    if (!response.ok) throw new Error(dados.error || "Não foi possível excluir a conta.");
    if (dados.deleted !== true) throw new Error("O servidor não confirmou a exclusão da conta.");
  },
  subscribeToProfiles: (databaseUrl, onData, onError) => {
    let requestId = 0;
    const atualizarPerfis = () => {
      const requestAtual = ++requestId;
      void lerPerfisAtivos().then((perfis) => {
        if (requestAtual === requestId) onData(perfis);
      }).catch((error) => {
        if (requestAtual === requestId) onError(error);
      });
    };
    atualizarPerfis();
    const timer = window.setInterval(atualizarPerfis, 60000);
    return () => {
      requestId += 1;
      window.clearInterval(timer);
    };
  },
  subscribeToRecords: (databaseUrl, onData, onError) => onValue(
    ref(databaseFor(databaseUrl), "sos_escola_records"),
    (snapshot) => onData(snapshot.val()),
    onError
  ),
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
