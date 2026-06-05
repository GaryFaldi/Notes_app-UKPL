const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "notes_db",
});

db.connect((err) => {
  if (err) {
    console.error("❌ Gagal koneksi ke database:", err.message);
    process.exit(1);
  }
  console.log("✅ Berhasil terhubung ke MySQL Localhost");
});

module.exports = db;