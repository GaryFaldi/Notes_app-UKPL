// KONFIGURASI
const BASE_URL = "http://localhost:3001"; // Mengarah ke backend lokal
// const BASE_URL = "https://d-04-488904.et.r.appspot.com"; // Komentari atau hapus URL GCP

let allNotes = [];
let deleteTargetId = null;
let currentDetailId = null; // ID catatan yang sedang dibuka di detail panel

// Cek Otentikasi sebelum memuat catatan
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "login.html";
}

// Helper untuk headers request API
const getHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`
});

// INISIALISASI
document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("username");
  if (username) {
    document.getElementById("user-display").textContent = username;
  }
  muatCatatan();

  // Tutup detail panel dengan tombol Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") tutupDetail();
  });
});

// ─── LOAD SEMUA CATATAN ────────────────────────────────────────────────────────
async function muatCatatan() {
  try {
    const res = await fetch(`${BASE_URL}/notes`, { headers: getHeaders() });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return logout();
      throw new Error("Gagal mengambil data");
    }
    allNotes = await res.json();
    renderCatatan(allNotes);
    updateCount(allNotes.length);
  } catch (err) {
    tampilToast("❌ Gagal memuat catatan: " + err.message, "error");
  }
}

// ─── RENDER CATATAN KE GRID ────────────────────────────────────────────────────
function renderCatatan(notes) {
  const container = document.getElementById("notes-container");

  if (notes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📝</span>
        <p>Belum ada catatan.<br/>Tambah yang pertama!</p>
      </div>`;
    return;
  }

  container.innerHTML = notes.map((note, i) => `
    <div class="note-card" style="animation-delay: ${i * 0.05}s" onclick="lihatDetail(${note.id})">
      <div class="note-judul">${escapeHtml(note.judul)}</div>
      <div class="note-isi">${escapeHtml(note.isi)}</div>
      <div class="note-meta">${formatTanggal(note.tanggal_dibuat)}</div>
      <div class="note-actions" onclick="event.stopPropagation()">
        <button class="btn-edit" onclick="mulaiBukaEdit(${note.id})">✏️ Edit</button>
        <button class="btn-hapus" onclick="bukaModal(${note.id})">🗑️ Hapus</button>
      </div>
    </div>
  `).join("");
}

// ─── SIMPAN CATATAN (Tambah atau Edit) ────────────────────────────────────────
async function simpanCatatan() {
  const judul = document.getElementById("input-judul").value.trim();
  const isi = document.getElementById("input-isi").value.trim();
  const editId = document.getElementById("edit-id").value;

  if (!judul || !isi) {
    tampilToast("⚠️ Judul dan isi tidak boleh kosong!", "error");
    return;
  }

  const payload = { judul, isi };
  const isEdit = editId !== "";
  const url = isEdit ? `${BASE_URL}/notes/${editId}` : `${BASE_URL}/notes`;
  const method = isEdit ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Gagal menyimpan");

    tampilToast(isEdit ? "✅ Catatan diperbarui!" : "✅ Catatan ditambahkan!", "success");
    resetForm();
    muatCatatan();
  } catch (err) {
    tampilToast("❌ " + err.message, "error");
  }
}

// ─── MULAI EDIT — isi form dari data yang ada ─────────────────────────────────
async function mulaiBukaEdit(id) {
  try {
    const res = await fetch(`${BASE_URL}/notes/${id}`, {
      headers: getHeaders()
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return logout();
      throw new Error("Gagal mengambil data catatan");
    }
    const note = await res.json();

    document.getElementById("edit-id").value = note.id;
    document.getElementById("input-judul").value = note.judul;
    document.getElementById("input-isi").value = note.isi;
    document.getElementById("form-title").textContent = "Edit Catatan";
    document.getElementById("btn-batal").style.display = "block";

    document.querySelector(".sidebar").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    tampilToast("❌ " + err.message, "error");
  }
}

// ─── BATAL EDIT ───────────────────────────────────────────────────────────────
function batalEdit() {
  resetForm();
}

function resetForm() {
  document.getElementById("edit-id").value = "";
  document.getElementById("input-judul").value = "";
  document.getElementById("input-isi").value = "";
  document.getElementById("form-title").textContent = "Catatan Baru";
  document.getElementById("btn-batal").style.display = "none";
}

// ─── MODAL HAPUS ──────────────────────────────────────────────────────────────
function bukaModal(id) {
  deleteTargetId = id;
  document.getElementById("modal-hapus").style.display = "flex";
}

function tutupModal() {
  deleteTargetId = null;
  document.getElementById("modal-hapus").style.display = "none";
}

async function konfirmasiHapus() {
  if (!deleteTargetId) return;
  try {
    const res = await fetch(`${BASE_URL}/notes/${deleteTargetId}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Gagal menghapus");
    tampilToast("🗑️ Catatan dihapus", "success");
    tutupModal();
    // Tutup detail panel juga jika catatan yang dihapus sedang dibuka
    if (deleteTargetId === currentDetailId) tutupDetail();
    muatCatatan();
  } catch (err) {
    tampilToast("❌ " + err.message, "error");
    tutupModal();
  }
}

// ─── SEARCH / FILTER ──────────────────────────────────────────────────────────
function filterCatatan() {
  const keyword = document.getElementById("search-input").value.toLowerCase();
  const filtered = allNotes.filter(
    (n) =>
      n.judul.toLowerCase().includes(keyword) ||
      n.isi.toLowerCase().includes(keyword)
  );
  renderCatatan(filtered);
}

// ─── DETAIL PANEL ─────────────────────────────────────────────────────────────

async function lihatDetail(id) {
  try {
    const res = await fetch(`${BASE_URL}/notes/${id}`, { headers: getHeaders() });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return logout();
      throw new Error("Gagal memuat catatan");
    }
    const note = await res.json();

    currentDetailId = note.id;

    // Isi konten panel
    document.getElementById("detail-judul").textContent = note.judul;
    document.getElementById("detail-isi").textContent = note.isi;

    const tglFormat = formatTanggal(note.tanggal_dibuat);
    document.getElementById("detail-tanggal").textContent = tglFormat;
    document.getElementById("detail-info-tanggal").textContent = tglFormat;
    document.getElementById("detail-info-id").textContent = `#${note.id}`;
    document.getElementById("detail-info-panjang").textContent = `${note.isi.length} karakter`;
    document.getElementById("detail-info-user").textContent =
      localStorage.getItem("username") || "-";

    // Buka panel
    document.getElementById("detail-panel").classList.add("open");
    document.getElementById("detail-overlay").classList.add("show");
  } catch (err) {
    tampilToast("❌ " + err.message, "error");
  }
}

function tutupDetail() {
  document.getElementById("detail-panel").classList.remove("open");
  document.getElementById("detail-overlay").classList.remove("show");
  currentDetailId = null;
}

function editDariDetail() {
  const id = currentDetailId;
  tutupDetail();
  // Beri jeda singkat agar panel selesai menutup sebelum form di-scroll
  setTimeout(() => mulaiBukaEdit(id), 250);
}

function hapusDariDetail() {
  const id = currentDetailId;
  tutupDetail();
  setTimeout(() => bukaModal(id), 250);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function updateCount(n) {
  document.getElementById("note-count").textContent = `${n} catatan`;
}

function formatTanggal(str) {
  const d = new Date(str);
  return d.toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "login.html";
}

let toastTimeout;
function tampilToast(pesan, tipe = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = pesan;
  toast.className = `toast ${tipe} show`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}