import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";

// ================================================================
// 1) Firebase Console > Project settings > Your apps > Web app
// 2) Copia o firebaseConfig e substitui os valores abaixo.
// A config do cliente identifica o projeto; a segurança real está nas
// Firestore/Storage Security Rules, não em esconder estes valores.
// ================================================================
const firebaseConfig = {
  apiKey: "COLOCA_AQUI",
  authDomain: "COLOCA_AQUI.firebaseapp.com",
  projectId: "COLOCA_AQUI",
  storageBucket: "COLOCA_AQUI.firebasestorage.app",
  messagingSenderId: "COLOCA_AQUI",
  appId: "COLOCA_AQUI"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
