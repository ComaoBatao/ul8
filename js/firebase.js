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
  apiKey: "AIzaSyCsu4f3EBsNfAAR-2HkmeAZxpCrIAOAz0s",
  authDomain: "ul8-archive.firebaseapp.com",
  projectId: "ul8-archive",
  storageBucket: "ul8-archive.firebasestorage.app",
  messagingSenderId: "950349065344",
  appId: "1:950349065344:web:146deeef4552ef57d0ca65"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
