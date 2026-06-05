# 📝 Notes App - Dokumentasi Teknis

Project ini adalah aplikasi Notes (Catatan) berbasis web dengan arsitektur **Frontend-Backend-Database**. Pengguna dapat membuat akun, login, membuat catatan, mengedit, dan menghapus catatan dengan sistem keamanan berbasis JWT.

---

## 📊 Struktur Project

```
Project Akhir/
├── backend/
│   ├── package.json      # Dependensi Node.js
│   ├── index.js          # Server Express & Endpoint API
│   └── db.js             # Konfigurasi koneksi MySQL
│
└── frontend/
    ├── index.html        # Halaman utama (daftar catatan)
    ├── login.html        # Halaman login
    ├── register.html     # Halaman registrasi
    ├── app.js            # Logika CRUD catatan & API calls
    ├── auth.js           # Logika login & registrasi
    └── style.css         # Styling aplikasi
```

---

## 🏗️ Arsitektur Teknis

```
┌─────────────────┐
│   Frontend      │ (HTML, CSS, JavaScript)
│  - login.html   │
│  - register.html│
│  - index.html   │
└────────┬────────┘
         │ HTTP Requests
         │ (Fetch API + JWT Token)
         ▼
┌─────────────────────────────────────┐
│   Backend (Express.js)              │
│  - /register (POST)                 │
│  - /login (POST)                    │
│  - /notes (GET, POST)               │
│  - /notes/:id (GET, PUT, DELETE)    │
│  - JWT Authentication Middleware    │
└────────┬────────────────────────────┘
         │ SQL Queries
         │ (Koneksi MySQL)
         ▼
┌─────────────────────────────────────┐
│   MySQL Database                    │
│  - users (table)                    │
│  - notes (table)                    │
│  - Foreign Key: user_id → users.id  │
└─────────────────────────────────────┘
```

---

## 🔌 **Backend: Koneksi Database (db.js)**

### 📄 File: `backend/db.js`

**Peran:** Menghubungkan backend Express dengan MySQL database.

```javascript
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",      // Server MySQL (default: localhost)
  user: process.env.DB_USER || "root",           // User MySQL (default: root)
  password: process.env.DB_PASSWORD || "",       // Password MySQL (kosong untuk lokal)
  database: process.env.DB_NAME || "notes_db",   // Nama database
});

db.connect((err) => {
  if (err) {
    console.error("❌ Gagal koneksi ke database:", err.message);
    process.exit(1);  // Stop server jika koneksi gagal
  }
  console.log("✅ Berhasil terhubung ke MySQL Localhost");
});

module.exports = db;  // Export connection untuk dipakai di index.js
```

**Konfigurasi Koneksi:**
- `host`: Alamat server MySQL (default: localhost untuk dev lokal)
- `user`: Username MySQL (default: root)
- `password`: Password MySQL (default: kosong untuk dev lokal)
- `database`: Nama database yang digunakan (default: notes_db)

**Status Connection:**
- ✅ Jika berhasil: "Berhasil terhubung ke MySQL Localhost"
- ❌ Jika gagal: Server akan stop (exit code 1)

---

## 🔒 **Backend: Inisialisasi Tabel & Middleware (index.js)**

### 📄 File: `backend/index.js` - Bagian 1: Inisialisasi Tabel

**Peran:** Membuat tabel `users` dan `notes` di database MySQL secara otomatis saat server dijalankan.

```javascript
// BAGIAN 1: INISIALISASI TABEL

// ✅ Membuat tabel USERS
db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,          -- ID unik pengguna
    username VARCHAR(100) UNIQUE NOT NULL,      -- Username (wajib unik & tidak null)
    password VARCHAR(255) NOT NULL,             -- Password (encrypted dengan bcrypt)
    tanggal_daftar TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Waktu registrasi otomatis
  )
`, (err) => {
  if (err) console.error("❌ Gagal buat tabel users:", err.message);
  else console.log("✅ Tabel 'users' siap");
});

// ✅ Membuat tabel NOTES
db.query(`
  CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,           -- ID unik catatan
    user_id INT NOT NULL,                        -- ID pemilik catatan (FK ke users.id)
    judul VARCHAR(255) NOT NULL,                 -- Judul catatan
    isi TEXT NOT NULL,                           -- Isi catatan
    tanggal_dibuat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Waktu catatan dibuat
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE  -- Jika user dihapus, catatan juga terhapus
  )
`, (err) => {
  if (err) console.error("❌ Gagal buat tabel notes:", err.message);
  else console.log("✅ Tabel 'notes' siap");
});
```

**Penjelasan:**
- `CREATE TABLE IF NOT EXISTS`: Hanya buat tabel jika belum ada (aman untuk dijalankan berkali-kali)
- `id INT AUTO_INCREMENT PRIMARY KEY`: Setiap row memiliki ID unik yang otomatis bertambah
- `UNIQUE NOT NULL`: Username harus unik dan tidak boleh kosong
- `FOREIGN KEY`: Menghubungkan `notes.user_id` ke `users.id`
- `ON DELETE CASCADE`: Jika user dihapus, semua catatan user otomatis terhapus

---

### 📄 File: `backend/index.js` - Bagian 2: Middleware Autentikasi

**Peran:** Mengecek apakah client mengirimkan JWT token yang valid sebelum mengakses endpoint protected.

```javascript
// BAGIAN 2: MIDDLEWARE OTENTIKASI

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];           // Baca header: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];      // Ambil token dari "Bearer <token>"
  
  if (!token) {
    // ❌ Jika tidak ada token, akses ditolak
    return res.status(401).json({ error: "Akses ditolak, token tidak ada" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // ❌ Jika token invalid/expired, akses ditolak
      return res.status(403).json({ error: "Token tidak valid" });
    }
    // ✅ Token valid, simpan data user di request object
    req.user = user;  // req.user = { id, username }
    next();           // Lanjut ke endpoint berikutnya
  });
};
```

**Alur Kerja:**
1. Client mengirim request dengan header `Authorization: Bearer <token>`
2. Middleware mengekstrak token dari header
3. Verifikasi token menggunakan JWT_SECRET
4. Jika valid → `req.user` diisi dengan data user, proses dilanjutkan
5. Jika invalid → Response error 403, proses dihentikan

**Keamanan:** Hanya request dengan token valid yang bisa akses endpoint `/notes`, `/notes/:id`, dst.

---

## 👤 **Backend: Autentikasi - Register & Login**

### 📄 File: `backend/index.js` - Bagian 3: Register Endpoint

**Peran:** Membuat akun pengguna baru dengan password yang dienkripsi.

```javascript
// BAGIAN 3: ENDPOINT REGISTER

app.post("/register", async (req, res) => {
  const { username, password } = req.body;  // Ambil dari body request
  
  // ✅ Validasi input
  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password wajib diisi" });
  }

  try {
    // 🔐 Enkripsi password menggunakan bcryptjs (salted hash)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 💾 Insert ke database
    db.query(
      "INSERT INTO users (username, password) VALUES (?, ?)", 
      [username, hashedPassword],  // Gunakan parameterized query (aman dari SQL injection)
      (err) => {
        if (err) {
          // ❌ Jika username sudah terdaftar (UNIQUE constraint)
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Username sudah terdaftar" });
          }
          return res.status(500).json({ error: err.message });
        }
        // ✅ Registrasi berhasil
        res.status(201).json({ message: "Registrasi berhasil, silakan login" });
      }
    );
  } catch (error) {
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});
```

**Alur Registrasi:**
1. User menginput username & password di frontend
2. Frontend kirim POST request ke `/register`
3. Backend terima data, validasi input
4. Password di-hash dengan bcryptjs (bukan disimpan plain text)
5. Insert ke tabel `users`
6. Jika username sudah ada → Error 400 "Username sudah terdaftar"
7. Jika berhasil → Response 201 "Registrasi berhasil, silakan login"

**Keamanan Enkripsi Password:**
```
Password asli: "123456"
                ↓ bcrypt.hash(password, 10)
Password terenkripsi: "$2a$10$h9R8u7x/nS...qL9k2p3m4"
                ↓ Disimpan di database
Saat login, password dicocokkan dengan bcrypt.compare()
```

---

### 📄 File: `backend/index.js` - Bagian 4: Login Endpoint

**Peran:** Memverifikasi credential pengguna dan mengeluarkan JWT token.

```javascript
// BAGIAN 4: ENDPOINT LOGIN

app.post("/login", (req, res) => {
  const { username, password } = req.body;  // Ambil username & password dari body
  
  // 🔍 Cari user berdasarkan username
  db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // ❌ Username tidak ditemukan
    if (results.length === 0) {
      return res.status(400).json({ error: "Username tidak ditemukan" });
    }

    const user = results[0];  // Ambil user dari database
    
    // 🔐 Verifikasi password (cocokkan dengan hash yang tersimpan)
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      // ❌ Password salah
      return res.status(400).json({ error: "Password salah" });
    }

    // ✅ Password benar, buat JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },  // Payload
      JWT_SECRET,                                 // Secret key
      { expiresIn: "24h" }                       // Token berlaku 24 jam
    );
    
    res.json({ message: "Login berhasil", token });
  });
});
```

**Alur Login:**
1. User input username & password di frontend
2. Frontend kirim POST request ke `/login`
3. Backend cari user di database berdasarkan username
4. Jika tidak ada → Response error 400 "Username tidak ditemukan"
5. Jika ada, bandingkan password dengan hash di database menggunakan `bcrypt.compare()`
6. Jika tidak match → Response error 400 "Password salah"
7. Jika match → Generate JWT token (berisi id & username, berlaku 24 jam)
8. Kirim token ke frontend
9. Frontend simpan token di `localStorage` untuk request selanjutnya

**JWT Token Format:**
```
Header.Payload.Signature

Header: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
Payload: eyJpZCI6MSwicm9sZSI6InVzZXIifQ
Signature: SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

---

## 📝 **Backend: CRUD Notes Endpoints**

### 📄 File: `backend/index.js` - Bagian 5: Endpoint Notes (CRUD)

#### 🔍 **GET /notes** - Ambil semua catatan user

**Peran:** Mengambil semua catatan milik user yang ter-autentikasi.

```javascript
// ✅ GET /notes - Ambil semua catatan milik user yang login

app.get("/notes", authenticateToken, (req, res) => {
  // req.user.id didapat dari middleware authenticateToken
  db.query(
    "SELECT * FROM notes WHERE user_id = ? ORDER BY tanggal_dibuat DESC",
    [req.user.id],  // Filter hanya catatan milik user yang login
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);  // Return array catatan
    }
  );
});
```

**Keamanan:**
- `authenticateToken` middleware: Hanya user yang login yang bisa akses
- `WHERE user_id = ?`: Filter catatan hanya milik user yang login
- `ORDER BY tanggal_dibuat DESC`: Urutkan dari terbaru ke terlama

**Response Contoh:**
```json
[
  {
    "id": 1,
    "user_id": 5,
    "judul": "Catatan Penting",
    "isi": "Ini adalah catatan saya",
    "tanggal_dibuat": "2024-01-15T10:30:00.000Z"
  }
]
```

---

#### 🔍 **GET /notes/:id** - Ambil 1 catatan berdasarkan ID

```javascript
// ✅ GET /notes/:id - Ambil catatan spesifik

app.get("/notes/:id", authenticateToken, (req, res) => {
  db.query(
    "SELECT * FROM notes WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],  // Cek id catatan & user_id (keamanan)
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) {
        return res.status(404).json({ error: "Catatan tidak ditemukan" });
      }
      res.json(results[0]);  // Return 1 catatan
    }
  );
});
```

**Keamanan:**
- Check `id = ?`: Pastikan ID catatan ada
- Check `user_id = ?`: Pastikan catatan milik user yang login (tidak bisa akses catatan orang lain)

---

#### ✏️ **POST /notes** - Buat catatan baru

```javascript
// ✅ POST /notes - Buat catatan baru

app.post("/notes", authenticateToken, (req, res) => {
  const { judul, isi } = req.body;  // Ambil judul & isi dari body
  
  // Validasi input
  if (!judul || !isi) {
    return res.status(400).json({ error: "Judul dan isi wajib diisi" });
  }
  
  // 💾 Insert catatan baru ke database
  db.query(
    "INSERT INTO notes (user_id, judul, isi) VALUES (?, ?, ?)",
    [req.user.id, judul, isi],  // req.user.id dari middleware
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      // result.insertId = id catatan yang baru dibuat
      res.status(201).json({ 
        message: "Catatan berhasil ditambahkan", 
        id: result.insertId 
      });
    }
  );
});
```

**Alur:**
1. User login, ambil token dari localStorage
2. User isi form judul & isi
3. Frontend kirim POST ke `/notes` dengan token di header
4. Middleware verifikasi token → extract user.id
5. Backend insert catatan ke tabel `notes` dengan user_id dari middleware
6. Return ID catatan yang dibuat (untuk update UI)

---

#### 📝 **PUT /notes/:id** - Edit catatan

```javascript
// ✅ PUT /notes/:id - Update catatan yang ada

app.put("/notes/:id", authenticateToken, (req, res) => {
  const { judul, isi } = req.body;
  
  db.query(
    "UPDATE notes SET judul = ?, isi = ? WHERE id = ? AND user_id = ?",
    [judul, isi, req.params.id, req.user.id],  // Pastikan milik user yg login
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // affectedRows = jumlah row yang ter-update (0 jika ID tidak ada atau bukan milik user)
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Catatan tidak ditemukan atau bukan milikmu" });
      }
      
      res.json({ message: "Catatan berhasil diupdate" });
    }
  );
});
```

**Keamanan:**
- Check `WHERE id = ? AND user_id = ?`: Hanya user yang punya catatan yang bisa edit
- Jika `affectedRows === 0`: Berarti catatan tidak ada atau milik orang lain

---

#### 🗑️ **DELETE /notes/:id** - Hapus catatan

```javascript
// ✅ DELETE /notes/:id - Hapus catatan

app.delete("/notes/:id", authenticateToken, (req, res) => {
  db.query(
    "DELETE FROM notes WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],  // Hanya hapus jika milik user yang login
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Catatan tidak ditemukan atau bukan milikmu" });
      }
      
      res.json({ message: "Catatan berhasil dihapus" });
    }
  );
});
```

---

## 🎨 **Frontend: Autentikasi (auth.js)**

### 📄 File: `frontend/auth.js` - Koneksi ke Backend Authentication

**Peran:** Handle login dan register di frontend, mengirim request ke backend `/login` dan `/register`.

#### 📤 **Kirim Request ke Backend**

```javascript
// Konfigurasi URL backend
const BASE_URL = "http://localhost:3001";  // ← Pastikan sama dengan backend port

// ====== FORM REGISTER ======
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      // 📤 Kirim POST request ke backend /register
      const res = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })  // Kirim data user
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);  // Jika error, tampilkan error message
      
      // ✅ Registrasi berhasil
      tampilToast(data.message, "success");
      setTimeout(() => { 
        window.location.href = "login.html";  // Redirect ke login page
      }, 1500);
    } catch (err) {
      // ❌ Tampilkan error
      tampilToast("❌ " + err.message, "error");
    }
  });
}

// ====== FORM LOGIN ======
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      // 📤 Kirim POST request ke backend /login
      const res = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);  // Jika error, tampilkan error message
      
      // ✅ Login berhasil, simpan token di localStorage
      localStorage.setItem("token", data.token);        // Simpan JWT token
      localStorage.setItem("username", username);       // Simpan username
      
      tampilToast(data.message, "success");
      setTimeout(() => { 
        window.location.href = "index.html";  // Redirect ke halaman utama
      }, 1000);
    } catch (err) {
      tampilToast("❌ " + err.message, "error");
    }
  });
}

// ====== REDIRECT JIKA SUDAH LOGIN ======
if (localStorage.getItem("token")) {
  window.location.href = "index.html";  // Jika sudah login, langsung ke app
}
```

**Alur Lengkap Register:**
```
User Input: username, password
        ↓
    Form Submit (prevent default)
        ↓
fetch() POST ke http://localhost:3001/register
        ↓
Backend validasi & hash password → Insert DB
        ↓
Response OK? 
    → YES: Toast "Registrasi berhasil" → Redirect login.html
    → NO: Toast error message
```

**Alur Lengkap Login:**
```
User Input: username, password
        ↓
    Form Submit
        ↓
fetch() POST ke http://localhost:3001/login
        ↓
Backend verifikasi password → Generate JWT token
        ↓
Response OK?
    → YES: Save token & username di localStorage → Redirect index.html
    → NO: Toast error message
```

**Storage di localStorage:**
```javascript
// Setelah login, browser menyimpan:
localStorage.setItem("token", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");
localStorage.setItem("username", "john_doe");

// Data ini persisten sampai user logout (atau clear browser cache)
// Setiap request ke /notes harus kirim token di header Authorization
```

---

## 📝 **Frontend: CRUD Notes (app.js)**

### 📄 File: `frontend/app.js` - Logika Catatan

#### 🔐 **Proteksi Akses - Cek Token di Awal**

```javascript
// ====== PROTEKSI HALAMAN ======
const token = localStorage.getItem("token");

if (!token) {
  // ❌ Jika tidak ada token, redirect ke login page
  window.location.href = "login.html";
}

// ====== HELPER FUNCTION UNTUK HEADERS ======
const getHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`  // ← Kirim token di setiap request
});

// Contoh header yang dikirim:
// {
//   "Content-Type": "application/json",
//   "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
// }
```

**Keamanan:**
- Hanya orang yang punya token sah yang bisa akses halaman index.html
- Setiap request ke backend harus sertakan token di header `Authorization`
- Backend akan verifikasi token dan reject jika invalid

---

#### 📥 **Muat Semua Catatan dari Backend**

```javascript
// ====== LOAD CATATAN ======
async function muatCatatan() {
  try {
    // 📤 Request ke backend /notes (GET)
    const res = await fetch(`${BASE_URL}/notes`, { 
      headers: getHeaders()  // ← Sertakan token di header
    });
    
    // ❌ Jika response tidak ok (misalnya token expired)
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return logout();  // Logout dan redirect ke login page
      }
      throw new Error("Gagal mengambil data");
    }
    
    // ✅ Parsing response JSON (array of notes)
    allNotes = await res.json();
    
    // Render catatan ke UI
    renderCatatan(allNotes);
    updateCount(allNotes.length);
  } catch (err) {
    tampilToast("❌ Gagal memuat catatan: " + err.message, "error");
  }
}

// Call function saat halaman load
document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("username");
  if (username) {
    document.getElementById("user-display").textContent = username;
  }
  muatCatatan();  // Muat catatan saat page load
});
```

**Alur:**
1. Page load → DOMContentLoaded event
2. Ambil username dari localStorage, tampilkan di UI
3. Call `muatCatatan()`
4. Fetch ke backend `/notes` dengan token di header
5. Backend terima, verifikasi token, ambil catatan dari DB (WHERE user_id = token.id)
6. Backend kirim array catatan
7. Frontend render ke UI

---

#### 🎨 **Render Catatan ke HTML**

```javascript
// ====== RENDER CATATAN ======
function renderCatatan(notes) {
  const container = document.getElementById("notes-container");

  // Jika tidak ada catatan, tampilkan empty state
  if (notes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📝</span>
        <p>Belum ada catatan.<br/>Tambah yang pertama!</p>
      </div>`;
    return;
  }

  // Generate HTML untuk setiap catatan
  container.innerHTML = notes.map((note, i) => `
    <div class="note-card" style="animation-delay: ${i * 0.05}s">
      <div class="note-judul">${escapeHtml(note.judul)}</div>
      <div class="note-isi">${escapeHtml(note.isi)}</div>
      <div class="note-meta">${formatTanggal(note.tanggal_dibuat)}</div>
      <div class="note-actions">
        <button class="btn-edit" onclick="mulaiBukaEdit(${note.id})">✏️ Edit</button>
        <button class="btn-hapus" onclick="bukaModal(${note.id})">🗑️ Hapus</button>
      </div>
    </div>
  `).join("");
}

// Helper: Escape HTML untuk keamanan (prevent XSS)
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Helper: Format tanggal
function formatTanggal(str) {
  const d = new Date(str);
  return d.toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
```

**Keamanan XSS Prevention:**
```javascript
// ❌ TIDAK AMAN (XSS vulnerability):
container.innerHTML = `<div>${note.judul}</div>`;
// Jika note.judul = "<script>alert('hacked')</script>", script akan execute

// ✅ AMAN (menggunakan escapeHtml):
container.innerHTML = `<div>${escapeHtml(note.judul)}</div>`;
// Script tags akan di-encode menjadi &lt;script&gt;
```

---

#### ➕ **Tambah Catatan Baru (POST)**

```javascript
// ====== SIMPAN CATATAN (Tambah atau Edit) ======
async function simpanCatatan() {
  const judul = document.getElementById("input-judul").value.trim();
  const isi = document.getElementById("input-isi").value.trim();
  const editId = document.getElementById("edit-id").value;

  // Validasi input
  if (!judul || !isi) {
    tampilToast("⚠️ Judul dan isi tidak boleh kosong!", "error");
    return;
  }

  const payload = { judul, isi };
  const isEdit = editId !== "";  // Cek apakah mode edit atau tambah baru
  
  // Jika edit: PUT ke /notes/{id}, jika tambah: POST ke /notes
  const url = isEdit ? `${BASE_URL}/notes/${editId}` : `${BASE_URL}/notes`;
  const method = isEdit ? "PUT" : "POST";

  try {
    // 📤 Kirim request ke backend
    const res = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(payload)  // Kirim judul & isi
    });
    
    if (!res.ok) throw new Error("Gagal menyimpan");

    // ✅ Berhasil
    tampilToast(isEdit ? "✅ Catatan diperbarui!" : "✅ Catatan ditambahkan!", "success");
    resetForm();
    muatCatatan();  // Reload catatan dari server
  } catch (err) {
    tampilToast("❌ " + err.message, "error");
  }
}

// Helper: Reset form
function resetForm() {
  document.getElementById("edit-id").value = "";
  document.getElementById("input-judul").value = "";
  document.getElementById("input-isi").value = "";
  document.getElementById("form-title").textContent = "Catatan Baru";
  document.getElementById("btn-batal").style.display = "none";
}
```

**Alur Tambah Catatan:**
```
User isi form judul & isi
        ↓
Click button "Simpan"
        ↓
simpanCatatan() dipanggil
        ↓
Validasi input
        ↓
fetch() POST ke http://localhost:3001/notes
    Body: { judul: "...", isi: "..." }
    Headers: { Authorization: "Bearer <token>" }
        ↓
Backend terima → Validasi token → Insert ke DB
        ↓
Response: { message: "Catatan berhasil ditambahkan" }
        ↓
Frontend reload catatan → render ulang
        ↓
Toast "✅ Catatan ditambahkan!"
```

---

#### ✏️ **Edit Catatan (GET single, lalu PUT)**

```javascript
// ====== MULAI EDIT ======
async function mulaiBukaEdit(id) {
  try {
    // 📤 Ambil data catatan yang akan diedit
    const res = await fetch(`${BASE_URL}/notes/${id}`, { 
      headers: getHeaders()
    });
    
    if (!res.ok) throw new Error("Gagal mengambil data catatan");
    
    const note = await res.json();

    // Isi form dengan data catatan
    document.getElementById("edit-id").value = note.id;
    document.getElementById("input-judul").value = note.judul;
    document.getElementById("input-isi").value = note.isi;
    
    // Update UI form
    document.getElementById("form-title").textContent = "Edit Catatan";
    document.getElementById("btn-batal").style.display = "block";

    // Scroll ke form
    document.querySelector(".sidebar").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    tampilToast("❌ " + err.message, "error");
  }
}
```

**Alur Edit:**
```
User click button "Edit" pada catatan
        ↓
mulaiBukaEdit(id) dipanggil
        ↓
fetch() GET ke http://localhost:3001/notes/{id}
        ↓
Backend terima → Verifikasi token & ownership → Return catatan
        ↓
Frontend terima data → Isi form dengan data catatan
        ↓
Form title: "Edit Catatan" + Show "Batal" button
        ↓
User ubah form & click "Simpan"
        ↓
simpanCatatan() dipanggil
        ↓
Detect editId !== "" → PUT mode
        ↓
fetch() PUT ke http://localhost:3001/notes/{id}
        ↓
Backend update catatan di DB
        ↓
Frontend reload & render catatan
```

---

#### 🗑️ **Hapus Catatan (DELETE)**

```javascript
// ====== MODAL HAPUS & KONFIRMASI ======

function bukaModal(id) {
  deleteTargetId = id;  // Simpan ID catatan yang akan dihapus
  document.getElementById("modal-hapus").style.display = "flex";
}

function tutupModal() {
  deleteTargetId = null;
  document.getElementById("modal-hapus").style.display = "none";
}

async function konfirmasiHapus() {
  if (!deleteTargetId) return;
  
  try {
    // 📤 Kirim DELETE request ke backend
    const res = await fetch(`${BASE_URL}/notes/${deleteTargetId}`, { 
      method: "DELETE",
      headers: getHeaders()
    });
    
    if (!res.ok) throw new Error("Gagal menghapus");
    
    // ✅ Berhasil dihapus
    tampilToast("🗑️ Catatan dihapus", "success");
    tutupModal();
    muatCatatan();  // Reload catatan
  } catch (err) {
    tampilToast("❌ " + err.message, "error");
    tutupModal();
  }
}
```

**Alur Hapus:**
```
User click button "Hapus" pada catatan
        ↓
bukaModal(id) → Tampilkan modal konfirmasi
        ↓
User click "Hapus" di modal
        ↓
konfirmasiHapus() dipanggil
        ↓
fetch() DELETE ke http://localhost:3001/notes/{id}
        ↓
Backend terima → Verifikasi token & ownership → Delete dari DB
        ↓
Response: { message: "Catatan berhasil dihapus" }
        ↓
Frontend tutup modal, reload catatan
        ↓
Toast "🗑️ Catatan dihapus"
```

---

#### 🔍 **Search / Filter Catatan**

```javascript
// ====== SEARCH / FILTER ======
function filterCatatan() {
  const keyword = document.getElementById("search-input").value.toLowerCase();
  
  // Filter array allNotes berdasarkan keyword
  const filtered = allNotes.filter(
    (n) =>
      n.judul.toLowerCase().includes(keyword) ||
      n.isi.toLowerCase().includes(keyword)
  );
  
  // Render catatan yang ter-filter
  renderCatatan(filtered);
}
```

**Cara kerja:**
```
User ketik di search input
        ↓
oninput event → filterCatatan() dipanggil
        ↓
Ambil keyword, convert ke lowercase
        ↓
Filter allNotes: cari yang judul/isi-nya mengandung keyword
        ↓
Render hasil filter (client-side filtering, tidak perlu fetch backend)
```

---

## 🚀 **Cara Menjalankan Project**

### 1️⃣ **Persiapan Awal**

**Pastikan sudah install:**
- Node.js & npm: https://nodejs.org/
- MySQL Server: https://www.mysql.com/

**Buat database MySQL:**
```sql
CREATE DATABASE notes_db;
```

---

### 2️⃣ **Run Backend (Terminal 1)**

```bash
# Masuk folder backend
cd backend

# Install dependencies
npm install

# Jalankan server
npm start
```

**Output yang benar:**
```
✅ Berhasil terhubung ke MySQL Localhost
✅ Tabel 'users' siap
✅ Tabel 'notes' siap
🚀 Server berjalan di http://localhost:3001
```

---

### 3️⃣ **Run Frontend (Terminal 2)**

**Opsi 1: Buka langsung di browser**
```bash
# Double-click frontend/index.html
# atau drag ke browser
```

**Opsi 2: Gunakan HTTP Server**
```bash
# Masuk folder frontend
cd frontend

# Jalankan HTTP server (Python 3)
python -m http.server 3000

# atau gunakan Node.js http-server
npx http-server -p 3000
```

Frontend berjalan di `http://localhost:3000`

---

## 🔗 **API Endpoints Summary**

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/register` | ❌ | Registrasi akun baru |
| POST | `/login` | ❌ | Login & dapatkan JWT token |
| GET | `/notes` | ✅ | Ambil semua catatan user |
| GET | `/notes/:id` | ✅ | Ambil 1 catatan |
| POST | `/notes` | ✅ | Buat catatan baru |
| PUT | `/notes/:id` | ✅ | Edit catatan |
| DELETE | `/notes/:id` | ✅ | Hapus catatan |

**Auth = ✅** berarti endpoint membutuhkan JWT token di header `Authorization: Bearer <token>`

---

## 🔐 **Alur Keamanan Lengkap**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. REGISTRASI PENGGUNA                                      │
├─────────────────────────────────────────────────────────────┤
│ User → Frontend (input username & password)                 │
│     ↓                                                        │
│ Frontend → POST /register (plaintext password)              │
│     ↓                                                        │
│ Backend → bcrypt.hash(password, 10) [ENKRIPSI]              │
│     ↓                                                        │
│ Backend → INSERT INTO users (username, hashed_password)     │
│     ↓                                                        │
│ Database → Simpan dengan password ter-enkripsi              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. LOGIN & DAPAT TOKEN                                      │
├─────────────────────────────────────────────────────────────┤
│ User → Frontend (input username & password)                 │
│     ↓                                                        │
│ Frontend → POST /login (plaintext password)                 │
│     ↓                                                        │
│ Backend → SELECT * FROM users WHERE username = ?           │
│     ↓                                                        │
│ Backend → bcrypt.compare(password, hashed_password)        │
│     ↓ (Match?)                                              │
│ Backend → jwt.sign({id, username}, SECRET, {exp: "24h"})   │
│     ↓                                                        │
│ Frontend → localStorage.setItem("token", token)            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. AKSES CATATAN DENGAN TOKEN                               │
├─────────────────────────────────────────────────────────────┤
│ Frontend → GET /notes {Authorization: "Bearer <token>"}     │
│     ↓                                                        │
│ Backend → jwt.verify(token, SECRET)                         │
│     ↓ (Valid?)                                              │
│ Backend → SELECT * FROM notes WHERE user_id = token.id     │
│     ↓ (Filter by user ID untuk keamanan)                    │
│ Database → Return catatan milik user tersebut               │
│     ↓                                                        │
│ Frontend → Render catatan di UI                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ **Fitur Keamanan**

### 1. **Password Encryption (Hashing)**
- Password tidak pernah disimpan plain text
- Menggunakan bcryptjs dengan salt 10 rounds
- Saat login, password dicocokkan dengan hash menggunakan `bcrypt.compare()`

### 2. **JWT Token Authentication**
- Token digenerate setelah login sukses
- Token mengandung: user ID, username, expire time (24 jam)
- Setiap request ke `/notes/*` harus sertakan token
- Backend verifikasi token dengan secret key

### 3. **User Isolation**
- Query menggunakan `WHERE user_id = ?` untuk filter
- Pengguna hanya bisa akses catatan miliknya sendiri
- Tidak bisa akses catatan pengguna lain

### 4. **SQL Injection Prevention**
- Query menggunakan parameterized queries: `WHERE id = ?`
- Data user tidak langsung masuk ke query string
- Database driver handle escaping otomatis

### 5. **XSS Prevention (Frontend)**
- Menggunakan `escapeHtml()` untuk encode HTML entities
- `&` → `&amp;`, `<` → `&lt;`, dst
- Prevent script injection di catatan

### 6. **CORS Protection**
```javascript
app.use(cors());  // Allow cross-origin requests (bisa dikonfigurasi lebih ketat)
```

---

## 📁 **File Breakdown & Responsibilities**

| File | Peran | Key Concepts |
|------|-------|--------------|
| `backend/db.js` | Koneksi MySQL | mysql.createConnection, environment variables |
| `backend/index.js` | Server & API | Express, routing, middleware, JWT, bcrypt |
| `frontend/auth.js` | Register/Login | Fetch POST, localStorage, form submission |
| `frontend/app.js` | CRUD Notes | Fetch GET/POST/PUT/DELETE, DOM manipulation |
| `frontend/*.html` | UI Templates | Form elements, modal, note cards |
| `frontend/style.css` | Styling | CSS variables, flexbox, responsive design |

---

## ⚙️ **Environment Variables (Optional)**

Buat file `.env` di folder backend untuk konfigurasi (opsional):

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=notes_db
JWT_SECRET=rahasia_super_aman_123
PORT=3001
```

Load dengan package seperti `dotenv`:
```bash
npm install dotenv
```

```javascript
require('dotenv').config();
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
```

---

## 🐛 **Troubleshooting**

| Error | Penyebab | Solusi |
|-------|----------|--------|
| "❌ Gagal koneksi ke database" | MySQL tidak jalan / config salah | Pastikan MySQL running, cek host/user/password di db.js |
| "❌ Username sudah terdaftar" | Username sudah ada di database | Gunakan username yang berbeda |
| "Akses ditolak, token tidak ada" | Tidak kirim token di header | Pastikan localStorage ada token, kirim di header Authorization |
| "Token tidak valid" | Token expired atau invalid signature | Re-login untuk dapatkan token baru |
| "CORS error" | Frontend port berbeda dengan backend | Pastikan backend punya `app.use(cors())` |
| "POST http://localhost:3001/login 404" | Backend tidak jalan atau port salah | Jalankan backend dengan `npm start` |

---

## 📚 **Referensi & Technology Stack**

**Backend:**
- **Express.js** - Web framework
- **MySQL2** - Database driver
- **bcryptjs** - Password hashing
- **jsonwebtoken (JWT)** - Token-based authentication
- **CORS** - Cross-origin resource sharing

**Frontend:**
- **Vanilla JavaScript** - Logic & API calls
- **Fetch API** - HTTP requests
- **localStorage** - Browser storage untuk token
- **CSS3** - Styling & animations

---

## 📝 **Notes**

- Project ini menggunakan **localhost** untuk development
- Untuk production, gunakan environment variables dan secret keys yang aman
- Database schema menggunakan **ON DELETE CASCADE** untuk relasi user-notes
- Frontend **tidak ada build process**, bisa langsung diakses dari browser
- Backend membutuhkan **npm install** untuk dependencies

---

**Created: 2026-06-05**
**Project: Notes App UKPL**
