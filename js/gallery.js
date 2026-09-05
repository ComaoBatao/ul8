import { db } from "./firebase.js";
import {
  collection,
  getDocsFromServer,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const gallery = document.getElementById("gallery");
const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const errorDetail = document.getElementById("errorDetail");
const emptyState = document.getElementById("emptyState");
const archiveCount = document.getElementById("archiveCount");
const retryButton = document.getElementById("retryButton");
const databaseStatus = document.getElementById("databaseStatus");
const databaseStatusText = document.getElementById("databaseStatusText");
const logo = document.getElementById("siteLogo");
const logoFallback = document.getElementById("logoFallback");

const modal = document.getElementById("postModal");
const closeModal = document.getElementById("closeModal");
const modalImageWrap = document.getElementById("modalImageWrap");
const modalImage = document.getElementById("modalImage");
const modalArchiveId = document.getElementById("modalArchiveId");
const modalTitle = document.getElementById("modalTitle");
const modalDate = document.getElementById("modalDate");
const modalDescription = document.getElementById("modalDescription");
const revealButton = document.getElementById("revealButton");

let posts = [];
const tilts = [-1.6, 1.1, -.7, 1.8, -.9, .6];

logo.addEventListener("error", () => {
  logo.hidden = true;
  logoFallback.hidden = false;
});

function setDatabaseStatus(state) {
  databaseStatus.classList.remove("checking", "online", "offline");
  databaseStatus.classList.add(state);

  if (state === "online") databaseStatusText.textContent = "LIVE DATABASE";
  else if (state === "offline") databaseStatusText.textContent = "DATABASE OFFLINE";
  else databaseStatusText.textContent = "CONNECTING...";
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

function dateFromValue(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = dateFromValue(value);
  if (!date) return "DATE UNKNOWN";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function archiveNumber(index) {
  return String(posts.length - index).padStart(3, "0");
}

function renderPosts() {
  gallery.innerHTML = "";
  archiveCount.textContent = `ARCHIVE // ${String(posts.length).padStart(2, "0")} RECORDS`;

  if (!posts.length) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  posts.forEach((post, index) => {
    const article = document.createElement("article");
    article.className = `photo-card${post.classified ? " is-classified" : ""}`;
    article.style.setProperty("--tilt", `${tilts[index % tilts.length]}deg`);
    article.style.animationDelay = `${Math.min(index * 70, 560)}ms`;
    article.tabIndex = 0;
    article.setAttribute("role", "button");
    article.setAttribute("aria-label", `Abrir ${post.title || "arquivo"}`);

    article.innerHTML = `
      <div class="photo-frame">
        <div class="photo-image-wrap">
          ${post.featured ? '<span class="featured-badge">FEATURED</span>' : ""}
          <img src="${escapeHtml(post.imageUrl || "")}" alt="${escapeHtml(post.title || "Fotografia UL8")}" loading="lazy" />
          ${post.classified ? '<div class="classified-overlay"><span>CLASSIFIED</span></div>' : ""}
        </div>
        <div class="photo-caption">
          <p class="archive-id">ARCHIVE // ${archiveNumber(index)}</p>
          <h3>${escapeHtml(post.title || "UNTITLED RECORD")}</h3>
          <p>${escapeHtml(post.shortDescription || "")}</p>
          <time>${formatDate(post.createdAt)}</time>
        </div>
      </div>`;

    const cardImage = article.querySelector("img");
    cardImage.addEventListener("error", () => {
      cardImage.classList.add("broken-image");
      cardImage.alt = "IMAGE UNAVAILABLE";
    });

    const open = () => openPost(post, index);
    article.addEventListener("click", open);
    article.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });

    gallery.appendChild(article);
  });
}

function openPost(post, index) {
  modalImage.src = post.imageUrl || "";
  modalImage.alt = post.title || "Fotografia UL8";
  modalArchiveId.textContent = `ARCHIVE // ${archiveNumber(index)}`;
  modalTitle.textContent = post.title || "UNTITLED RECORD";
  modalDate.textContent = formatDate(post.createdAt);
  modalDescription.textContent = post.description || post.shortDescription || "";

  modalImageWrap.classList.toggle("is-classified", Boolean(post.classified));
  revealButton.hidden = !post.classified;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  closeModal.focus();
}

function closePostModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
  modalImage.src = "";
  modalImageWrap.classList.remove("is-classified");
  revealButton.hidden = true;
}

revealButton.addEventListener("click", () => {
  modalImageWrap.classList.remove("is-classified");
  revealButton.hidden = true;
});
closeModal.addEventListener("click", closePostModal);
modal.addEventListener("click", event => {
  if (event.target.matches("[data-close-modal]")) closePostModal();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !modal.hidden) closePostModal();
});

function withTimeout(promise, milliseconds) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error("Firebase response timeout");
      error.code = "ul8/timeout";
      reject(error);
    }, milliseconds);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function loadPosts() {
  loadingState.hidden = false;
  errorState.hidden = true;
  emptyState.hidden = true;
  gallery.innerHTML = "";
  archiveCount.textContent = "ARCHIVE // -- RECORDS";
  setDatabaseStatus("checking");

  try {
    const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snapshot = await withTimeout(getDocsFromServer(postsQuery), 10000);

    posts = snapshot.docs.map(docSnapshot => ({
      id: docSnapshot.id,
      ...docSnapshot.data()
    }));

    // Mantém a data como ordem principal dentro de cada grupo e põe FEATURED primeiro.
    posts.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));

    setDatabaseStatus("online");
    renderPosts();
  } catch (error) {
    console.error("UL8 Firestore error:", error);
    posts = [];
    setDatabaseStatus("offline");
    errorState.hidden = false;
    errorDetail.textContent = error?.code ? `ERROR // ${error.code}` : "ERROR // CONNECTION FAILED";
  } finally {
    loadingState.hidden = true;
  }
}

retryButton.addEventListener("click", loadPosts);
loadPosts();
