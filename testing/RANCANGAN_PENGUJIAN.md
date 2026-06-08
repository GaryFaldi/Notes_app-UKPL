# 📋 RANCANGAN PENGUJIAN STLC — Notes App UKPL

**Proyek:** Notes App (Express.js + MySQL + JWT)
**Dibuat:** 2026-06-06
**Metodologi:** Software Testing Life Cycle (STLC)

---

## 1. RINGKASAN EKSEKUTIF

| Jenis Testing | Tools | Jumlah Test Case | Target |
|---|---|---|---|
| Unit Testing | Jest + Supertest | 25 TC | Pass 100% |
| Integration Testing | Jest + Supertest | 14 TC | Pass 100% |
| Load Testing | Apache JMeter | 2 Thread Group | Error < 5%, RT < 2000ms |
| Stress Testing | Apache JMeter | 3 Step (50→100→200 user) | Temukan titik batas |

---

## 2. PERSIAPAN LINGKUNGAN PENGUJIAN

### 2.1 Prasyarat
```
✅ Node.js v18+ terinstall
✅ MySQL Server berjalan di localhost:3306
✅ Backend berjalan di localhost:3001 (npm start)
✅ Database 'notes_db' sudah dibuat
✅ Apache JMeter 5.6+ terinstall (untuk Load & Stress Test)
```

### 2.2 Setup Unit & Integration Test
```bash
# Di folder testing/
npm install

# Pastikan backend bisa di-import (export app di index.js)
# Tambahkan di akhir backend/index.js:
# if (require.main === module) { app.listen(PORT) }
# module.exports = app;
```

---

## 3. UNIT TESTING

**Definisi:** Menguji setiap endpoint API secara terisolasi.

**File:** `unit/auth.test.js` dan `unit/notes.test.js`

**Cara Jalankan:**
```bash
npm run test:unit
```

---

### 3.1 Test Case — POST /register

| ID | Nama Test Case | Input | Expected Result | Status |
|---|---|---|---|---|
| TC-U-REG-01 | Registrasi berhasil | username unik, password valid | HTTP 201, message berhasil | ⬜ |
| TC-U-REG-02 | Gagal username kosong | username: "", password: valid | HTTP 400, ada error | ⬜ |
| TC-U-REG-03 | Gagal password kosong | username: valid, password: "" | HTTP 400, ada error | ⬜ |
| TC-U-REG-04 | Gagal username duplikat | username: sudah ada | HTTP 400, "sudah terdaftar" | ⬜ |
| TC-U-REG-05 | Gagal body kosong | {} | HTTP 400, ada error | ⬜ |
| TC-U-REG-06 | Berhasil 1 karakter (boundary) | username: 1 char | HTTP 201 | ⬜ |

---

### 3.2 Test Case — POST /login

| ID | Nama Test Case | Input | Expected Result | Status |
|---|---|---|---|---|
| TC-U-LOG-01 | Login berhasil | credential valid | HTTP 200, ada token | ⬜ |
| TC-U-LOG-02 | Gagal password salah | password: salah | HTTP 400, error password | ⬜ |
| TC-U-LOG-03 | Gagal username tidak ada | username: tidak terdaftar | HTTP 400, error username | ⬜ |
| TC-U-LOG-04 | Gagal username kosong | username: "" | HTTP ≠ 200 | ⬜ |
| TC-U-LOG-05 | Token format JWT valid | credential valid | Token = 3 bagian (header.payload.sig) | ⬜ |

---

### 3.3 Test Case — POST /notes

| ID | Nama Test Case | Input | Expected Result | Status |
|---|---|---|---|---|
| TC-U-NOT-01 | Berhasil buat catatan | judul+isi valid, token valid | HTTP 201, ada id | ⬜ |
| TC-U-NOT-02 | Gagal judul kosong | judul: "" | HTTP 400 | ⬜ |
| TC-U-NOT-03 | Gagal isi kosong | isi: "" | HTTP 400 | ⬜ |
| TC-U-NOT-04 | Gagal tanpa token | (no auth header) | HTTP 401/403 | ⬜ |
| TC-U-NOT-05 | Gagal token palsu | token: invalid | HTTP 403 | ⬜ |
| TC-U-NOT-06 | Berhasil isi panjang (boundary) | isi: 10.000 karakter | HTTP 201 | ⬜ |

---

### 3.4 Test Case — GET, PUT, DELETE /notes

| ID | Nama Test Case | Input | Expected Result | Status |
|---|---|---|---|---|
| TC-U-GET-01 | Berhasil get semua catatan | token valid | HTTP 200, array | ⬜ |
| TC-U-GET-02 | Response field lengkap | token valid | Ada id, judul, isi, tanggal | ⬜ |
| TC-U-GET-03 | Gagal tanpa token | (no auth) | HTTP 401/403 | ⬜ |
| TC-U-GID-01 | Berhasil get by ID | ID valid, token valid | HTTP 200, data catatan | ⬜ |
| TC-U-GID-02 | Gagal ID tidak ada | ID: 999999999 | HTTP 404 | ⬜ |
| TC-U-PUT-01 | Berhasil update catatan | ID valid, data baru | HTTP 200, message update | ⬜ |
| TC-U-PUT-02 | Gagal update ID tak ada | ID: 999999999 | HTTP 404 | ⬜ |
| TC-U-PUT-03 | Gagal update tanpa token | (no auth) | HTTP 401/403 | ⬜ |
| TC-U-DEL-01 | Berhasil hapus catatan | ID valid | HTTP 200, message hapus | ⬜ |
| TC-U-DEL-02 | Gagal hapus ID tak ada | ID: 999999999 | HTTP 404 | ⬜ |
| TC-U-DEL-03 | Gagal hapus tanpa token | (no auth) | HTTP 401/403 | ⬜ |

---

## 4. INTEGRATION TESTING

**Definisi:** Menguji alur antar komponen (Request → API → Database → Response).

**File:** `integration/flow.test.js`

**Cara Jalankan:**
```bash
npm run test:integration
```

---

### 4.1 Suite 1: Alur Pengguna Lengkap (Register → Login → CRUD)

| ID | Nama Test Case | Alur | Expected Result | Status |
|---|---|---|---|---|
| TC-I-01 | Registrasi user baru | POST /register | HTTP 201, berhasil | ⬜ |
| TC-I-02 | Login setelah register | POST /login | HTTP 200, dapat token | ⬜ |
| TC-I-03 | Buat catatan setelah login | POST /notes | HTTP 201, dapat ID | ⬜ |
| TC-I-04 | Catatan baru muncul di list | GET /notes | Catatan baru ada di array | ⬜ |
| TC-I-05 | Ambil detail catatan | GET /notes/:id | HTTP 200, data benar | ⬜ |
| TC-I-06 | Edit catatan | PUT /notes/:id | HTTP 200, berhasil | ⬜ |
| TC-I-07 | Perubahan tersimpan di DB | GET /notes/:id | Data = data yang baru diedit | ⬜ |
| TC-I-08 | Hapus catatan | DELETE /notes/:id | HTTP 200, berhasil | ⬜ |
| TC-I-09 | Catatan tidak ada setelah hapus | GET /notes/:id | HTTP 404 | ⬜ |

---

### 4.2 Suite 2: Isolasi Data Antar User

| ID | Nama Test Case | Kondisi | Expected Result | Status |
|---|---|---|---|---|
| TC-I-ISO-01 | User B tidak bisa GET catatan User A | Token B, ID catatan A | HTTP 404 | ⬜ |
| TC-I-ISO-02 | User B tidak bisa EDIT catatan User A | Token B, PUT ID catatan A | HTTP 404 | ⬜ |
| TC-I-ISO-03 | User B tidak bisa HAPUS catatan User A | Token B, DELETE ID catatan A | HTTP 404 | ⬜ |
| TC-I-ISO-04 | GET /notes hanya tampilkan catatan sendiri | Token B | Tidak ada catatan milik A | ⬜ |

---

### 4.3 Suite 3: Keamanan JWT

| ID | Nama Test Case | Input | Expected Result | Status |
|---|---|---|---|---|
| TC-I-JWT-01 | Semua endpoint ditolak tanpa token | GET/POST/PUT/DELETE tanpa auth | HTTP 401/403 semua | ⬜ |
| TC-I-JWT-02 | Token yang dimanipulasi ditolak | Token dengan payload diubah | HTTP 403 | ⬜ |
| TC-I-JWT-03 | Format Authorization salah | "Token xxx" bukan "Bearer xxx" | HTTP 401/403 | ⬜ |

---

## 5. LOAD TESTING (JMeter)

**Definisi:** Menguji performa sistem dengan beban pengguna normal yang realistis.

**File:** `jmeter/load_test.jmx`

### 5.1 Cara Menjalankan
```bash
# Pastikan backend berjalan dahulu:
cd backend && npm start

# Jalankan via JMeter GUI:
# Buka JMeter → File → Open → load_test.jmx → Ctrl+R

# Atau via command line (headless, lebih efisien):
jmeter -n -t jmeter/load_test.jmx -l hasil_load.jtl -e -o report_load/

# Buka laporan HTML:
# Buka report_load/index.html di browser
```

---

### 5.2 Konfigurasi Load Test

| Parameter | Nilai |
|---|---|
| Jumlah Thread (User) | 50 |
| Ramp-Up Time | 30 detik |
| Loop Count | 3x (untuk CRUD) |
| Think Time | 300–500ms antar request |
| Duration | Maksimal 2 menit |

---

### 5.3 Test Case Load Test

| ID | Nama | Endpoint | User | Threshold | Status |
|---|---|---|---|---|---|
| TC-LT-REG | Load test register | POST /register | 50 | RT < 2000ms, Error < 5% | ⬜ |
| TC-LT-LOG | Load test login | POST /login | 50 | RT < 2000ms, Token berhasil | ⬜ |
| TC-LT-GET | Load test get notes | GET /notes | 50 | RT < 2000ms, Status 200 | ⬜ |
| TC-LT-POST | Load test buat catatan | POST /notes | 50 | RT < 2000ms, Status 201 | ⬜ |
| TC-LT-PUT | Load test edit catatan | PUT /notes/:id | 50 | RT < 2000ms, Status 200 | ⬜ |
| TC-LT-DEL | Load test hapus catatan | DELETE /notes/:id | 50 | RT < 2000ms, Status 200 | ⬜ |

---

### 5.4 Kriteria Lulus Load Test

```
✅ LULUS jika:
   - Average Response Time ≤ 2000ms
   - 90th Percentile ≤ 3000ms
   - Error Rate ≤ 5%
   - Throughput ≥ 10 request/second

❌ GAGAL jika:
   - Average Response Time > 2000ms
   - Error Rate > 5%
   - Server timeout / tidak merespons
```

---

## 6. STRESS TESTING (JMeter)

**Definisi:** Menguji batas maksimal sistem dengan terus menaikkan beban sampai gagal.

**File:** `jmeter/stress_test.jmx`

### 6.1 Cara Menjalankan
```bash
# Via command line:
jmeter -n -t jmeter/stress_test.jmx -l hasil_stress.jtl -e -o report_stress/

# Buka laporan:
# report_stress/index.html
```

---

### 6.2 Skenario Bertahap

```
┌─────────────────────────────────────────────────────────┐
│ STRESS TEST STEPS                                       │
├──────────┬─────────┬──────────┬───────────────────────┤
│  Step    │  User   │ Durasi   │ Ekspektasi            │
├──────────┼─────────┼──────────┼───────────────────────┤
│  STEP 1  │   50    │ 60 detik │ ✅ Semua OK            │
│  STEP 2  │  100    │ 60 detik │ ✅ Masih OK            │
│  STEP 3  │  200    │ 60 detik │ ⚠️ Mungkin lambat      │
│ (STEP 4) │  500    │ 60 detik │ ❌ Mulai error         │
│ (STEP 5) │ 1000    │ 60 detik │ ❌ Server breakdown    │
└──────────┴─────────┴──────────┴───────────────────────┘
* Step 4 dan 5 bisa ditambahkan manual di JMeter GUI
```

---

### 6.3 Test Case Stress Test

| ID | Step | User | Endpoint | Expected | Status |
|---|---|---|---|---|---|
| TC-ST-01 | Step 1 | 50 | GET + POST /notes | Error < 5%, RT < 2s | ⬜ |
| TC-ST-02 | Step 2 | 100 | GET + POST /notes | Error < 10%, RT < 5s | ⬜ |
| TC-ST-03 | Step 3 | 200 | GET + POST /notes | Catat titik degradasi | ⬜ |

---

### 6.4 Yang Diamati Saat Stress Test

```
📊 Metrik yang dicatat per Step:
   - Average Response Time
   - Error Rate (%)
   - Throughput (req/sec)
   - Max Response Time

🔍 Titik yang dicari:
   - "Degradation Point": Step dimana RT mulai naik signifikan
   - "Break Point": Step dimana Error Rate > 50% atau server crash
```

---

## 7. CARA MENJALANKAN SEMUA TEST

### Step 1 — Persiapkan Backend
```bash
# Terminal 1: Jalankan MySQL (pastikan sudah jalan)

# Terminal 2: Jalankan Backend
cd "Project Akhir/backend"
npm install
npm start

# Pastikan output:
# ✅ Berhasil terhubung ke MySQL Localhost
# 🚀 Server berjalan di http://localhost:3001
```

### Step 2 — Persiapkan index.js untuk Export App
```javascript
// Tambahkan di BAWAH file backend/index.js:
if (require.main === module) {
  app.listen(PORT || 3001, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT || 3001}`);
  });
}
module.exports = app; // ← PENTING untuk testing
```

### Step 3 — Jalankan Unit Test
```bash
cd testing
npm install
npm run test:unit
```

### Step 4 — Jalankan Integration Test
```bash
npm run test:integration
```

### Step 5 — Jalankan Load Test (JMeter)
```bash
# GUI Mode (untuk pemula):
# Buka JMeter → File → Open → testing/jmeter/load_test.jmx → Ctrl+R

# Headless mode (lebih cepat):
jmeter -n -t testing/jmeter/load_test.jmx -l hasil_load.jtl -e -o report_load/
```

### Step 6 — Jalankan Stress Test (JMeter)
```bash
jmeter -n -t testing/jmeter/stress_test.jmx -l hasil_stress.jtl -e -o report_stress/
```

---

## 8. TEMPLATE LAPORAN HASIL

### Unit & Integration Test
```
Tanggal Eksekusi : ___________
Tester           : ___________
Environment      : localhost
Node.js Version  : ___________

Hasil Unit Test:
  Total TC    : 25
  Passed      : ___
  Failed      : ___
  Pass Rate   : ___%

Hasil Integration Test:
  Total TC    : 14
  Passed      : ___
  Failed      : ___
  Pass Rate   : ___%

Catatan / Bug Ditemukan:
  1. ___________
  2. ___________
```

### Load & Stress Test (JMeter)
```
LOAD TEST RESULT (50 User):
  Endpoint              | Avg RT  | 90th pct | Error% | Pass/Fail
  ──────────────────────┼─────────┼──────────┼────────┼──────────
  POST /register        | ___ms   | ___ms    | ___%   | ____
  POST /login           | ___ms   | ___ms    | ___%   | ____
  GET /notes            | ___ms   | ___ms    | ___%   | ____
  POST /notes           | ___ms   | ___ms    | ___%   | ____
  PUT /notes/:id        | ___ms   | ___ms    | ___%   | ____
  DELETE /notes/:id     | ___ms   | ___ms    | ___%   | ____

STRESS TEST RESULT:
  Step 1 (50 user)  : Error = ___%,  Avg RT = ___ms  → Status: ____
  Step 2 (100 user) : Error = ___%,  Avg RT = ___ms  → Status: ____
  Step 3 (200 user) : Error = ___%,  Avg RT = ___ms  → Status: ____

  Degradation Point : _____ user
  Break Point       : _____ user
```

---

## 9. STRUKTUR FILE TESTING

```
testing/
├── package.json              ← Konfigurasi Jest
├── unit/
│   ├── auth.test.js          ← Unit test: Register & Login (11 TC)
│   └── notes.test.js         ← Unit test: CRUD Notes (14 TC)
├── integration/
│   └── flow.test.js          ← Integration test: Alur + Isolasi + JWT (14 TC)
└── jmeter/
    ├── load_test.jmx         ← JMeter: Load Test 50 user
    └── stress_test.jmx       ← JMeter: Stress Test bertahap 50→100→200 user
```
