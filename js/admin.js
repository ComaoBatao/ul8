import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocsFromServer,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");
const adminIdentity = document.getElementById("adminIdentity");

const postForm = document.getElementById("postForm");
const postMessage = document.getElementById("postMessage");
const publishButton = document.getElementById("publishButton");
const editorTitle = document.getElementById("editorTitle");
const cancelEditButton = document.getElementById("cancelEditButton");
const previewButton = document.getElementById("previewButton");

const imageUrl = document.getElementById("imageUrl");
const titleInput = document.getElementById("title");
const shortDescription = document.getElementById("shortDescription");
const description = document.getElementById("description");
const featured = document.getElementById("featured");
const classified = document.getElementById("classified");
const shortCount = document.getElementById("shortCount");

const adminPreviewImage = document.getElementById("adminPreviewImage");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const adminClassifiedOverlay = document.getElementById("adminClassifiedOverlay");
const adminPreviewTitle = document.getElementById("adminPreviewTitle");
const adminPreviewShort = document.getElementById("adminPreviewShort");
const adminPreviewDate = document.getElementById("adminPreviewDate");
const urlStatus = document.getElementById("urlStatus");

const recordsList = document.getElementById("recordsList");
const adminRecordCount = document.getElementById("adminRecordCount");

const adminModal = document.getElementById("adminModal");
const adminModalClose = document.getElementById("adminModalClose");
const adminModalImage = document.getElementById("adminModalImage");
const adminModalArchiveId = document.getElementById("adminModalArchiveId");
const adminModalTitle = document.getElementById("adminModalTitle");
const adminModalDate = document.getElementById("adminModalDate");
const adminModalDescription = document.getElementById("adminModalDescription");

let editingPost = null;
let records = [];
let previewCheckId = 0;

function setMessage(element, text = "", type = "") {
  element.textContent = text;
  element.className = `form-message${type ? ` ${type}` : ""}`;
}

function dateFromValue(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = dateFromValue(value) || new Date();
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function isValidImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function currentImageUrl() {
  return imageUrl.value.trim() || editingPost?.imageUrl || "";
}

function checkImagePreview(source) {
  const checkId = ++previewCheckId;

  if (!source) {
    adminPreviewImage.removeAttribute("src");
    adminPreviewImage.hidden = true;
    previewPlaceholder.hidden = false;
    urlStatus.textContent = "";
    urlStatus.className = "url-status";
    return;
  }

  if (!isValidImageUrl(source)) {
    adminPreviewImage.removeAttribute("src");
    adminPreviewImage.hidden = true;
    previewPlaceholder.hidden = false;
    urlStatus.textContent = "URL inválido.";
    urlStatus.className = "url-status error";
    return;
  }

  urlStatus.textContent = "A verificar imagem...";
  urlStatus.className = "url-status";

  const tester = new Image();
  tester.onload = () => {
    if (checkId !== previewCheckId) return;
    adminPreviewImage.src = source;
    adminPreviewImage.hidden = false;
    previewPlaceholder.hidden = true;
    urlStatus.textContent = "Imagem carregada.";
    urlStatus.className = "url-status success";
  };
  tester.onerror = () => {
    if (checkId !== previewCheckId) return;
    adminPreviewImage.removeAttribute("src");
    adminPreviewImage.hidden = true;
    previewPlaceholder.hidden = false;
    urlStatus.textContent = "Não foi possível carregar esta imagem. Confirma se é um link direto.";
    urlStatus.className = "url-status error";
  };
  tester.src = source;
}

function updatePreview(checkUrl = false) {
  shortCount.textContent = shortDescription.value.length;
  adminPreviewTitle.textContent = titleInput.value.trim() || "UNTITLED RECORD";
  adminPreviewShort.textContent = shortDescription.value.trim() || "No description.";
  adminPreviewDate.textContent = editingPost ? formatDate(editingPost.createdAt) : formatDate(new Date());
  adminClassifiedOverlay.hidden = !classified.checked;

  const source = currentImageUrl();
  if (checkUrl) {
    checkImagePreview(source);
  } else if (!source) {
    checkImagePreview("");
  }
}

[titleInput, shortDescription, description, featured, classified].forEach(element => {
  element.addEventListener("input", () => updatePreview(false));
  element.addEventListener("change", () => updatePreview(false));
});

let urlDebounce;
imageUrl.addEventListener("input", () => {
  clearTimeout(urlDebounce);
  urlDebounce = setTimeout(() => updatePreview(true), 350);
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  setMessage(loginMessage, "A autenticar...");

  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById("email").value.trim(),
      document.getElementById("password").value
    );
    setMessage(loginMessage, "");
  } catch (error) {
    console.error(error);
    setMessage(loginMessage, "Login inválido ou sem acesso.", "error");
  }
});

logoutButton.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async user => {
  const loggedIn = Boolean(user);
  loginPanel.hidden = loggedIn;
  dashboard.hidden = !loggedIn;

  if (loggedIn) {
    adminIdentity.textContent = `${user.email || "Authenticated user"} // UID: ${user.uid}`;
    await loadRecords();
  }
});

postForm.addEventListener("submit", async event => {
  event.preventDefault();
  setMessage(postMessage, "");

  const finalImageUrl = imageUrl.value.trim() || editingPost?.imageUrl || "";
  if (!finalImageUrl || !isValidImageUrl(finalImageUrl)) {
    setMessage(postMessage, "Introduz um URL válido para a imagem.", "error");
    imageUrl.focus();
    return;
  }

  publishButton.disabled = true;
  publishButton.textContent = editingPost ? "A GUARDAR..." : "A PUBLICAR...";

  try {
    const payload = {
      title: titleInput.value.trim(),
      shortDescription: shortDescription.value.trim(),
      description: description.value.trim(),
      imageUrl: finalImageUrl,
      featured: featured.checked,
      classified: classified.checked,
      updatedAt: serverTimestamp()
    };

    if (editingPost) {
      await updateDoc(doc(db, "posts", editingPost.id), {
        ...payload,
        // Remove este campo se o post tiver sido criado pela antiga versão com Storage.
        storagePath: deleteField()
      });
      setMessage(postMessage, "Arquivo atualizado com sucesso.", "success");
    } else {
      await addDoc(collection(db, "posts"), {
        ...payload,
        createdAt: serverTimestamp()
      });
      setMessage(postMessage, "Publicado com sucesso.", "success");
    }

    resetEditor(false);
    await loadRecords();
  } catch (error) {
    console.error(error);
    const detail = error?.code ? ` (${error.code})` : "";
    setMessage(postMessage, `O Firebase recusou a operação${detail}. Confirma as Firestore Rules.`, "error");
  } finally {
    publishButton.disabled = false;
    publishButton.textContent = editingPost ? "GUARDAR ALTERAÇÕES" : "PUBLICAR";
  }
});

function resetEditor(clearMessage = true) {
  editingPost = null;
  postForm.reset();
  editorTitle.textContent = "NEW ARCHIVE RECORD";
  publishButton.textContent = "PUBLICAR";
  cancelEditButton.hidden = true;
  if (clearMessage) setMessage(postMessage, "");
  updatePreview(true);
}

cancelEditButton.addEventListener("click", () => resetEditor());

function startEdit(post) {
  editingPost = post;
  titleInput.value = post.title || "";
  shortDescription.value = post.shortDescription || "";
  description.value = post.description || "";
  imageUrl.value = post.imageUrl || "";
  featured.checked = Boolean(post.featured);
  classified.checked = Boolean(post.classified);
  editorTitle.textContent = "EDIT ARCHIVE RECORD";
  publishButton.textContent = "GUARDAR ALTERAÇÕES";
  cancelEditButton.hidden = false;
  setMessage(postMessage, `A editar: ${post.title || post.id}`);
  updatePreview(true);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function removeRecord(post) {
  const ok = window.confirm(`Apagar definitivamente "${post.title || "este arquivo"}"?`);
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "posts", post.id));
    if (editingPost?.id === post.id) resetEditor();
    await loadRecords();
  } catch (error) {
    console.error(error);
    alert(`Não foi possível apagar${error?.code ? ` (${error.code})` : ""}. Confirma as Firestore Rules.`);
  }
}

function renderRecords() {
  recordsList.innerHTML = "";
  adminRecordCount.textContent = `${records.length} RECORD${records.length === 1 ? "" : "S"}`;

  if (!records.length) {
    recordsList.innerHTML = '<p class="muted">Ainda não existem publicações.</p>';
    return;
  }

  records.forEach(post => {
    const row = document.createElement("div");
    row.className = "record-row";

    const image = document.createElement("img");
    image.src = post.imageUrl || "";
    image.alt = "";
    image.loading = "lazy";

    const info = document.createElement("div");
    info.className = "record-info";

    const name = document.createElement("strong");
    name.textContent = post.title || "UNTITLED RECORD";

    const meta = document.createElement("span");
    meta.textContent = `${formatDate(post.createdAt)}${post.featured ? " • FEATURED" : ""}${post.classified ? " • CLASSIFIED" : ""}`;
    info.append(name, meta);

    const actions = document.createElement("div");
    actions.className = "record-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "secondary-button";
    editButton.textContent = "EDITAR";
    editButton.addEventListener("click", () => startEdit(post));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "secondary-button delete";
    deleteButton.textContent = "APAGAR";
    deleteButton.addEventListener("click", () => removeRecord(post));

    actions.append(editButton, deleteButton);
    row.append(image, info, actions);
    recordsList.appendChild(row);
  });
}

async function loadRecords() {
  recordsList.innerHTML = '<p class="muted">A carregar...</p>';

  try {
    const recordsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocsFromServer(recordsQuery);
    records = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    renderRecords();
  } catch (error) {
    console.error(error);
    recordsList.innerHTML = `<p class="form-message error">Não foi possível carregar os arquivos${error?.code ? ` (${error.code})` : ""}.</p>`;
  }
}

previewButton.addEventListener("click", () => {
  const source = currentImageUrl();
  if (!source || !isValidImageUrl(source)) {
    setMessage(postMessage, "Adiciona um URL válido para abrir o preview.", "error");
    return;
  }

  adminModalImage.src = source;
  adminModalArchiveId.textContent = editingPost ? "ARCHIVE // EDIT" : "ARCHIVE // NEW";
  adminModalTitle.textContent = titleInput.value.trim() || "UNTITLED RECORD";
  adminModalDate.textContent = editingPost ? formatDate(editingPost.createdAt) : formatDate(new Date());
  adminModalDescription.textContent = description.value.trim() || shortDescription.value.trim() || "No description.";
  adminModal.hidden = false;
  document.body.style.overflow = "hidden";
});

function closeAdminModal() {
  adminModal.hidden = true;
  document.body.style.overflow = "";
  adminModalImage.removeAttribute("src");
}

adminModalClose.addEventListener("click", closeAdminModal);
adminModal.addEventListener("click", event => {
  if (event.target.matches("[data-admin-close]")) closeAdminModal();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !adminModal.hidden) closeAdminModal();
});

updatePreview(true);
