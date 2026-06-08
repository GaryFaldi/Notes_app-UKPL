/**
 * ============================================================
 * INTEGRATION TESTING - Alur End-to-End Notes App
 * Notes App UKPL
 * Tools: Jest + Supertest
 * ============================================================
 *
 * Integration testing menguji ALUR LENGKAP antar komponen:
 * Frontend Request → Backend API → Database → Response
 *
 * CARA MENJALANKAN:
 *   npx jest integration/flow.test.js --verbose --runInBand
 *
 * Note: --runInBand agar test berjalan urut (sequential)
 *       karena tiap test bergantung satu sama lain
 */

const request = require("supertest");
const app = require("../../backend/index");

// ============================================================
// INTEGRATION SUITE 1: Alur Register → Login → CRUD Lengkap
// ============================================================
describe("Integration Test - Alur Pengguna Lengkap (Register → Login → CRUD)", () => {

  let userToken = "";
  let noteId = null;
  const username = `integ_user_${Date.now()}`;
  const password = "integpass123";

  // ── TC-I-01 ──────────────────────────────────────────────
  test("TC-I-01: Pengguna baru berhasil registrasi", async () => {
    const res = await request(app)
      .post("/register")
      .send({ username, password });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/berhasil/i);
  });

  // ── TC-I-02 ──────────────────────────────────────────────
  test("TC-I-02: Pengguna berhasil login setelah registrasi", async () => {
    const res = await request(app)
      .post("/login")
      .send({ username, password });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    userToken = res.body.token;
  });

  // ── TC-I-03 ──────────────────────────────────────────────
  test("TC-I-03: Pengguna berhasil membuat catatan setelah login", async () => {
    const res = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        judul: "Catatan Integrasi",
        isi: "Ini adalah catatan yang dibuat saat integration test",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    noteId = res.body.id;
  });

  // ── TC-I-04 ──────────────────────────────────────────────
  test("TC-I-04: Catatan yang baru dibuat muncul di daftar GET /notes", async () => {
    const res = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    const found = res.body.find((n) => n.id === noteId);
    expect(found).toBeDefined();
    expect(found.judul).toBe("Catatan Integrasi");
  });

  // ── TC-I-05 ──────────────────────────────────────────────
  test("TC-I-05: Pengguna berhasil mengambil detail catatan by ID", async () => {
    const res = await request(app)
      .get(`/notes/${noteId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(noteId);
    expect(res.body.judul).toBe("Catatan Integrasi");
  });

  // ── TC-I-06 ──────────────────────────────────────────────
  test("TC-I-06: Pengguna berhasil mengedit catatan", async () => {
    const res = await request(app)
      .put(`/notes/${noteId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        judul: "Catatan Diupdate",
        isi: "Isi sudah diubah via integration test",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/diupdate/i);
  });

  // ── TC-I-07 ──────────────────────────────────────────────
  test("TC-I-07: Perubahan catatan tersimpan dan bisa diambil kembali", async () => {
    const res = await request(app)
      .get(`/notes/${noteId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.judul).toBe("Catatan Diupdate");
    expect(res.body.isi).toBe("Isi sudah diubah via integration test");
  });

  // ── TC-I-08 ──────────────────────────────────────────────
  test("TC-I-08: Pengguna berhasil menghapus catatan", async () => {
    const res = await request(app)
      .delete(`/notes/${noteId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/dihapus/i);
  });

  // ── TC-I-09 ──────────────────────────────────────────────
  test("TC-I-09: Catatan sudah tidak ada setelah dihapus (404)", async () => {
    const res = await request(app)
      .get(`/notes/${noteId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(404);
  });
});


// ============================================================
// INTEGRATION SUITE 2: Isolasi Data Antar User
// ============================================================
describe("Integration Test - Isolasi Data Antar Pengguna", () => {

  let tokenA = "";
  let tokenB = "";
  let noteIdUserA = null;

  beforeAll(async () => {
    const tsA = Date.now();

    // Register & login User A
    await request(app)
      .post("/register")
      .send({ username: `userA_${tsA}`, password: "passA" });
    const loginA = await request(app)
      .post("/login")
      .send({ username: `userA_${tsA}`, password: "passA" });
    tokenA = loginA.body.token;

    // Register & login User B
    await request(app)
      .post("/register")
      .send({ username: `userB_${tsA}`, password: "passB" });
    const loginB = await request(app)
      .post("/login")
      .send({ username: `userB_${tsA}`, password: "passB" });
    tokenB = loginB.body.token;

    // User A buat catatan
    const noteRes = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ judul: "Rahasia User A", isi: "Tidak boleh dilihat User B" });
    noteIdUserA = noteRes.body.id;
  });

  // ── TC-I-ISO-01 ────────────────────────────────────────
  test("TC-I-ISO-01: User B tidak bisa akses catatan milik User A", async () => {
    const res = await request(app)
      .get(`/notes/${noteIdUserA}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.statusCode).toBe(404);
  });

  // ── TC-I-ISO-02 ────────────────────────────────────────
  test("TC-I-ISO-02: User B tidak bisa edit catatan milik User A", async () => {
    const res = await request(app)
      .put(`/notes/${noteIdUserA}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ judul: "Diretas", isi: "Dicuri User B" });

    expect(res.statusCode).toBe(404);
  });

  // ── TC-I-ISO-03 ────────────────────────────────────────
  test("TC-I-ISO-03: User B tidak bisa hapus catatan milik User A", async () => {
    const res = await request(app)
      .delete(`/notes/${noteIdUserA}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.statusCode).toBe(404);
  });

  // ── TC-I-ISO-04 ────────────────────────────────────────
  test("TC-I-ISO-04: GET /notes User B hanya menampilkan catatan User B saja", async () => {
    // User B buat catatannya sendiri
    await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ judul: "Catatan User B", isi: "Milik B" });

    const res = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.statusCode).toBe(200);
    // Semua catatan yang dikembalikan harus bukan milik user A
    const hasUserANote = res.body.some((n) => n.id === noteIdUserA);
    expect(hasUserANote).toBe(false);
  });
});


// ============================================================
// INTEGRATION SUITE 3: Keamanan Token (JWT)
// ============================================================
describe("Integration Test - Keamanan JWT Token", () => {

  // ── TC-I-JWT-01 ────────────────────────────────────────
  test("TC-I-JWT-01: Semua endpoint /notes ditolak tanpa token", async () => {
    const endpoints = [
      () => request(app).get("/notes"),
      () => request(app).post("/notes").send({ judul: "x", isi: "x" }),
      () => request(app).put("/notes/1").send({ judul: "x", isi: "x" }),
      () => request(app).delete("/notes/1"),
    ];

    for (const call of endpoints) {
      const res = await call();
      expect([401, 403]).toContain(res.statusCode);
    }
  });

  // ── TC-I-JWT-02 ────────────────────────────────────────
  test("TC-I-JWT-02: Token yang dimanipulasi (payload diubah) ditolak", async () => {
    // Buat token palsu dengan mengubah payload
    const fakeToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" + // header asli
      ".eyJpZCI6OTk5OTksInVzZXJuYW1lIjoiaGFja2VyIn0" + // payload diubah
      ".INVALIDSIGNATURE"; // signature palsu

    const res = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${fakeToken}`);

    expect(res.statusCode).toBe(403);
  });

  // ── TC-I-JWT-03 ────────────────────────────────────────
  test("TC-I-JWT-03: Format header Authorization yang salah ditolak", async () => {
    const res = await request(app)
      .get("/notes")
      .set("Authorization", "Token ini-format-salah");

    expect([401, 403]).toContain(res.statusCode);
  });
});
