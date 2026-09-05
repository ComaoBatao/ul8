import { auth, db, storage } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";

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

const dropZone = document.getElementById("dropZone");
const browseButton = document.getElementById("browseButton");
const imageFile = document.getElementById("imageFile");
const imageUrl = document.getElementById("imageUrl");
const uploadPrompt = document.getElementById("uploadPrompt");
const filePreview = document.getElementById("filePreview");
const previewImage = document.getElementById("previewImage");
const previewName = document.getElementById("previewName");
const removeFileButton = document.getElementById("removeFileButton");
const titleInput = document.getElementById("title");
const shortDescription = document.getElementById("shortDescription");
const description = document.getElementById("description");
const featured = document.getElementById("featured");
const classified = document.getElementById("classified");
const shortCount = document.getElementById("shortCount");

const adminPreviewImage = document.getElementById("adminPreviewImage");
const adminClassifiedOverlay = document.getElementById("adminClassifiedOverlay");
const adminPreviewTitle = document.getElementById("adminPreviewTitle");
const adminPreviewShort = document.getElementById("adminPreviewShort");
const adminPreviewDate = document.getElementById("adminPreviewDate");

const recordsList = document.getElementById("recordsList");
const adminRecordCount = document.getElementById("adminRecordCount");

const adminModal = document.getElementById("adminModal");
const adminModalClose = document.getElementById("adminModalClose");
const adminModalImage = document.getElementById("adminModalImage");
const adminModalArchiveId = document.getElementById("adminModalArchiveId");
const adminModalTitle = document.getElementById("adminModalTitle");
const adminModalDate = document.getElementById("adminModalDate");
const adminModalDescription = document.getElementById("adminModalDescription");

let selectedFile = null;
let selectedFileObjectUrl = null;
let editingPost = null;
let records = [];

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
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function sanitizeFilename(name) {
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-120);
}

function fileIsValid(file) {
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    setMessage(postMessage, "Formato inválido. Usa PNG, JPG, JPEG, WEBP ou GIF.", "error");
    return false;
  }
  if (file.size > 15 * 1024 * 1024) {
    setMessage(postMessage, "A imagem ultrapassa o limite de 15 MB.", "error");
    return false;
  }
  return true;
}

function setSelectedFile(file) {
  if (!file || !fileIsValid(file)) return;
  clearSelectedFile();
  selectedFile = file;
  selectedFileObjectUrl = URL.createObjectURL(file);
  previewImage.src = selectedFileObjectUrl;
  previewName.textContent = file.name;
  uploadPrompt.hidden = true;
  filePreview.hidden = false;
  imageUrl.value = "";
  updatePreview();
}

function clearSelectedFile() {
  selectedFile = null;
  if (selectedFileObjectUrl) URL.revokeObjectURL(selectedFileObjectUrl);
  selectedFileObjectUrl = null;
  previewImage.src = "";
  uploadPrompt.hidden = false;
  filePreview.hidden = true;
  imageFile.value = "";
}

function getPreviewSource() {
  if (selectedFileObjectUrl) return selectedFileObjectUrl;
  return imageUrl.value.trim();
}

function updatePreview() {
  shortCount.textContent = shortDescription.value.length;
  adminPreviewTitle.textContent = titleInput.value.trim() || "UNTITLED RECORD";
  adminPreviewShort.textContent = shortDescription.value.trim() || "No description.";
  adminPreviewDate.textContent = editingPost ? formatDate(editingPost.createdAt) : formatDate(new Date());
  adminClassifiedOverlay.hidden = !classified.checked;

  const source = getPreviewSource() || editingPost?.imageUrl || "";
  if (source) {
    adminPreviewImage.src = source;
    adminPreviewImage.hidden = false;
    document.querySelector(".preview-placeholder").hidden = true;
  } else {
    adminPreviewImage.removeAttribute("src");
    adminPreviewImage.hidden = true;
    document.querySelector(".preview-placeholder").hidden = false;
  }
}

browseButton.addEventListener("click", () => imageFile.click());
dropZone.addEventListener("click", event => {
  if (event.target === dropZone) imageFile.click();
});
dropZone.addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && event.target === dropZone) imageFile.click();
});
imageFile.addEventListener("change", () => setSelectedFile(imageFile.files[0]));
removeFileButton.addEventListener("click", () => {
  clearSelectedFile();
  updatePreview();
});

["dragenter", "dragover"].forEach(name => dropZone.addEventListener(name, event => {
  event.preventDefault();
  dropZone.classList.add("dragging");
}));
["dragleave", "drop"].forEach(name => dropZone.addEventListener(name, event => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
}));
dropZone.addEventListener("drop", event => {
  const file = event.dataTransfer.files?.[0];
  if (file) setSelectedFile(file);
});

[imageUrl, titleInput, shortDescription, description, featured, classified].forEach(el => {
  el.addEventListener("input", updatePreview);
  el.addEventListener("change", updatePreview);
});
imageUrl.addEventListener("input", () => {
  if (imageUrl.value.trim() && selectedFile) clearSelectedFile();
  updatePreview();
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

async function uploadImage(file) {
  const path = `posts/${Date.now()}_${sanitizeFilename(file.name)}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

  return new Promise((resolve, reject) => {
    task.on("state_changed", snapshot => {
      const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      setMessage(postMessage, `A enviar imagem... ${percent}%`);
    }, reject, async () => {
      const url = await getDownloadURL(task.snapshot.ref);
      resolve({ url, storagePath: path });
    });
  });
}

postForm.addEventListener("submit", async event => {
  event.preventDefault();
  setMessage(postMessage, "");

  const externalUrl = imageUrl.value.trim();
  const existingImage = editingPost?.imageUrl || "";
  if (!selectedFile && !externalUrl && !existingImage) {
    setMessage(postMessage, "Escolhe uma imagem ou introduz um URL.", "error");
    return;
  }

  publishButton.disabled = true;
  publishButton.textContent = editingPost ? "A GUARDAR..." : "A PUBLICAR...";

  try {
    let finalImageUrl = externalUrl || existingImage;
    let storagePath = editingPost?.storagePath || null;
    let oldStoragePathToDelete = null;

    if (selectedFile) {
      const uploaded = await uploadImage(selectedFile);
      finalImageUrl = uploaded.url;
      storagePath = uploaded.storagePath;
      oldStoragePathToDelete = editingPost?.storagePath || null;
    } else if (externalUrl && editingPost?.storagePath) {
      oldStoragePathToDelete = editingPost.storagePath;
      storagePath = null;
    }

    const payload = {
      title: titleInput.value.trim(),
      shortDescription: shortDescription.value.trim(),
      description: description.value.trim(),
      imageUrl: finalImageUrl,
      storagePath,
      featured: featured.checked,
      classified: classified.checked,
      updatedAt: serverTimestamp()
    };

    if (editingPost) {
      await updateDoc(doc(db, "posts", editingPost.id), payload);
      if (oldStoragePathToDelete && oldStoragePathToDelete !== storagePath) {
        deleteObject(ref(storage, oldStoragePathToDelete)).catch(console.warn);
      }
      setMessage(postMessage, "Arquivo atualizado com sucesso.", "success");
    } else {
      await addDoc(collection(db, "posts"), {
        ...payload,
        createdAt: serverTimestamp()
      });
      setMessage(postMessage, "Publicado com sucesso.", "success");
    }

    resetEditor();
    await loadRecords();
  } catch (error) {
    console.error(error);
    setMessage(postMessage, "O Firebase recusou a operação. Confirma a configuração e as Security Rules.", "error");
  } finally {
    publishButton.disabled = false;
    publishButton.textContent = "PUBLICAR";
  }
});

function resetEditor() {
  editingPost = null;
  postForm.reset();
  clearSelectedFile();
  editorTitle.textContent = "NEW ARCHIVE RECORD";
  publishButton.textContent = "PUBLICAR";
  cancelEditButton.hidden = true;
  updatePreview();
}

cancelEditButton.addEventListener("click", resetEditor);

function startEdit(post) {
  editingPost = post;
  clearSelectedFile();
  titleInput.value = post.title || "";
  shortDescription.value = post.shortDescription || "";
  description.value = post.description || "";
  imageUrl.value = post.storagePath ? "" : (post.imageUrl || "");
  featured.checked = Boolean(post.featured);
  classified.checked = Boolean(post.classified);
  editorTitle.textContent = "EDIT ARCHIVE RECORD";
  publishButton.textContent = "GUARDAR ALTERAÇÕES";
  cancelEditButton.hidden = false;
  setMessage(postMessage, `A editar: ${post.title || post.id}`);
  updatePreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function removeRecord(post) {
  const ok = window.confirm(`Apagar definitivamente "${post.title || "este arquivo"}"?`);
  if (!ok) return;
  try {
    await deleteDoc(doc(db, "posts", post.id));
    if (post.storagePath) {
      await deleteObject(ref(storage, post.storagePath)).catch(error => console.warn("Storage delete:", error));
    }
    if (editingPost?.id === post.id) resetEditor();
    await loadRecords();
  } catch (error) {
    console.error(error);
    alert("Não foi possível apagar. Confirma as Security Rules.");
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
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    records = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    renderRecords();
  } catch (error) {
    console.error(error);
    recordsList.innerHTML = '<p class="form-message error">Não foi possível carregar os arquivos.</p>';
  }
}

previewButton.addEventListener("click", () => {
  const source = getPreviewSource() || editingPost?.imageUrl;
  if (!source) {
    setMessage(postMessage, "Adiciona uma imagem para abrir o preview.", "error");
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

updatePreview();
