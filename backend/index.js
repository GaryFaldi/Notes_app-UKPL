const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "rahasia_super_aman_123"; 

app.use(cors());
app.use(express.json());

// 1. INISIALISASI TABEL
db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    tanggal_daftar TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) console.error("❌ Gagal buat tabel users:", err.message);
  else console.log("✅ Tabel 'users' siap");
});

db.query(`
  CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    judul VARCHAR(255) NOT NULL,
    isi TEXT NOT NULL,
    tanggal_dibuat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`, (err) => {
  if (err) console.error("❌ Gagal buat tabel notes:", err.message);
  else console.log("✅ Tabel 'notes' siap");
});

// 2. MIDDLEWARE OTENTIKASI
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: "Akses ditolak, token tidak ada" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token tidak valid" });
    req.user = user;
    next();
  });
};

// 3. ENDPOINT OTENTIKASI (REGISTER & LOGIN)
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username dan password wajib diisi" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Username sudah terdaftar" });
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: "Registrasi berhasil, silakan login" });
    });
  } catch (error) {
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  
  db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(400).json({ error: "Username tidak ditemukan" });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) return res.status(400).json({ error: "Password salah" });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ message: "Login berhasil", token });
  });
});

// 4. ENDPOINT NOTES (Dilindungi Token & Difilter by user_id)
app.get("/notes", authenticateToken, (req, res) => {
  db.query("SELECT * FROM notes WHERE user_id = ? ORDER BY tanggal_dibuat DESC", [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get("/notes/:id", authenticateToken, (req, res) => {
  db.query("SELECT * FROM notes WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Catatan tidak ditemukan" });
    res.json(results[0]);
  });
});

app.post("/notes", authenticateToken, (req, res) => {
  const { judul, isi } = req.body;
  if (!judul || !isi) return res.status(400).json({ error: "Judul dan isi wajib diisi" });
  
  db.query("INSERT INTO notes (user_id, judul, isi) VALUES (?, ?, ?)", [req.user.id, judul, isi], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Catatan berhasil ditambahkan", id: result.insertId });
  });
});

app.put("/notes/:id", authenticateToken, (req, res) => {
  const { judul, isi } = req.body;
  db.query(
    "UPDATE notes SET judul = ?, isi = ? WHERE id = ? AND user_id = ?",
    [judul, isi, req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: "Catatan tidak ditemukan atau bukan milikmu" });
      res.json({ message: "Catatan berhasil diupdate" });
    }
  );
});

app.delete("/notes/:id", authenticateToken, (req, res) => {
  db.query("DELETE FROM notes WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Catatan tidak ditemukan atau bukan milikmu" });
    res.json({ message: "Catatan berhasil dihapus" });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});