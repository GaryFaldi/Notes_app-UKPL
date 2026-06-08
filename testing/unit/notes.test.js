/**
 * ============================================================
 * UNIT TESTING - Notes CRUD Endpoints
 * Notes App UKPL
 * Tools: Jest + Supertest
 * ============================================================
 *
 * CARA MENJALANKAN:
 *   npx jest unit/notes.test.js --verbose
 */

const request = require("supertest");
const app = require("../../backend/index");

// ============================================================
// SETUP: Buat user & ambil token sebelum semua test
// ============================================================
let token = "";
let createdNoteId = null;
const testUser = `notestest_${Date.now()}`;

beforeAll(async () => {
  // Register user baru
  await request(app)
    .post("/register")
    .send({ username: testUser, password: "notes_pass_123" });

  // Login & ambil token
  const loginRes = await request(app)
    .post("/login")
    .send({ username: testUser, password: "notes_pass_123" });

  token = loginRes.body.token;
});


// ============================================================
// TEST SUITE: POST /notes — Buat catatan baru
// ============================================================
describe("Unit Test - POST /notes (Buat Catatan)", () => {

  // ── TC-U-NOT-01 ──────────────────────────────────────────
  test("TC-U-NOT-01: Berhasil membuat catatan baru dengan input valid", async () => {
    const res = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ judul: "Catatan Pertama", isi: "Isi catatan pertama saya" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    createdNoteId = res.body.id; // Simpan ID untuk test selanjutnya
  });

  // ── TC-U-NOT-02 ──────────────────────────────────────────
  test("TC-U-NOT-02: Gagal jika judul kosong", async () => {
    const res = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ judul: "", isi: "Ada isinya" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  // ── TC-U-NOT-03 ──────────────────────────────────────────
  test("TC-U-NOT-03: Gagal jika isi kosong", async () => {
    const res = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ judul: "Ada judulnya", isi: "" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  // ── TC-U-NOT-04 ──────────────────────────────────────────
  test("TC-U-NOT-04: Gagal jika tidak ada token (401/403)", async () => {
    const res = await request(app)
      .post("/notes")
      .send({ judul: "Test", isi: "Test" });

    expect([401, 403]).toContain(res.statusCode);
  });

  // ── TC-U-NOT-05 ──────────────────────────────────────────
  test("TC-U-NOT-05: Gagal jika token tidak valid / palsu", async () => {
    const res = await request(app)
      .post("/notes")
      .set("Authorization", "Bearer tokenpalsu.tidakvalid.sama sekali")
      .send({ judul: "Test", isi: "Test" });

    expect(res.statusCode).toBe(403);
  });

  // ── TC-U-NOT-06 ──────────────────────────────────────────
  test("TC-U-NOT-06: Berhasil membuat catatan dengan isi sangat panjang (boundary)", async () => {
    const longText = "a".repeat(10000);
    const res = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ judul: "Judul Panjang", isi: longText });

    expect(res.statusCode).toBe(201);
  });
});


// ============================================================
// TEST SUITE: GET /notes — Ambil semua catatan
// ============================================================
describe("Unit Test - GET /notes (Daftar Catatan)", () => {

  // ── TC-U-GET-01 ──────────────────────────────────────────
  test("TC-U-GET-01: Berhasil mengambil semua catatan (response array)", async () => {
    const res = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // ── TC-U-GET-02 ──────────────────────────────────────────
  test("TC-U-GET-02: Catatan yang dikembalikan mengandung field yang benar", async () => {
    const res = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    if (res.body.length > 0) {
      const note = res.body[0];
      expect(note).toHaveProperty("id");
      expect(note).toHaveProperty("judul");
      expect(note).toHaveProperty("isi");
      expect(note).toHaveProperty("tanggal_dibuat");
    }
  });

  // ── TC-U-GET-03 ──────────────────────────────────────────
  test("TC-U-GET-03: Gagal tanpa token (401/403)", async () => {
    const res = await request(app).get("/notes");
    expect([401, 403]).toContain(res.statusCode);
  });
});


// ============================================================
// TEST SUITE: GET /notes/:id — Ambil 1 catatan
// ============================================================
describe("Unit Test - GET /notes/:id (Detail Catatan)", () => {

  // ── TC-U-GID-01 ──────────────────────────────────────────
  test("TC-U-GID-01: Berhasil mengambil catatan berdasarkan ID valid", async () => {
    const res = await request(app)
      .get(`/notes/${createdNoteId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id", createdNoteId);
  });

  // ── TC-U-GID-02 ──────────────────────────────────────────
  test("TC-U-GID-02: Gagal (404) dengan ID yang tidak ada", async () => {
    const res = await request(app)
      .get("/notes/999999999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });
});


// ============================================================
// TEST SUITE: PUT /notes/:id — Edit catatan
// ============================================================
describe("Unit Test - PUT /notes/:id (Edit Catatan)", () => {

  // ── TC-U-PUT-01 ──────────────────────────────────────────
  test("TC-U-PUT-01: Berhasil update catatan dengan data valid", async () => {
    const res = await request(app)
      .put(`/notes/${createdNoteId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ judul: "Judul Diupdate", isi: "Isi setelah diupdate" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/diupdate/i);
  });

  // ── TC-U-PUT-02 ──────────────────────────────────────────
  test("TC-U-PUT-02: Gagal update catatan ID yang tidak ada", async () => {
    const res = await request(app)
      .put("/notes/999999999")
      .set("Authorization", `Bearer ${token}`)
      .send({ judul: "Test", isi: "Test" });

    expect(res.statusCode).toBe(404);
  });

  // ── TC-U-PUT-03 ──────────────────────────────────────────
  test("TC-U-PUT-03: Gagal update tanpa token", async () => {
    const res = await request(app)
      .put(`/notes/${createdNoteId}`)
      .send({ judul: "Test", isi: "Test" });

    expect([401, 403]).toContain(res.statusCode);
  });
});


// ============================================================
// TEST SUITE: DELETE /notes/:id — Hapus catatan
// ============================================================
describe("Unit Test - DELETE /notes/:id (Hapus Catatan)", () => {

  // ── TC-U-DEL-01 ──────────────────────────────────────────
  test("TC-U-DEL-01: Berhasil hapus catatan yang ada", async () => {
    // Buat catatan baru dulu untuk dihapus
    const createRes = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ judul: "Untuk Dihapus", isi: "Akan segera dihapus" });

    const newId = createRes.body.id;

    const res = await request(app)
      .delete(`/notes/${newId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/dihapus/i);
  });

  // ── TC-U-DEL-02 ──────────────────────────────────────────
  test("TC-U-DEL-02: Gagal hapus catatan ID tidak ada (404)", async () => {
    const res = await request(app)
      .delete("/notes/999999999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });

  // ── TC-U-DEL-03 ──────────────────────────────────────────
  test("TC-U-DEL-03: Gagal hapus tanpa token", async () => {
    const res = await request(app).delete(`/notes/${createdNoteId}`);
    expect([401, 403]).toContain(res.statusCode);
  });
});
