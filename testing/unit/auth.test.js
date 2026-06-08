/**
 * ============================================================
 * UNIT TESTING - Auth Endpoints (Register & Login)
 * Notes App UKPL
 * Tools: Jest + Supertest
 * ============================================================
 *
 * CARA MENJALANKAN:
 *   cd backend
 *   npm install --save-dev jest supertest
 *   npx jest unit/auth.test.js --verbose
 */

const request = require("supertest");
const app = require("../../backend/index"); // Pastikan index.js export app

// ============================================================
// TEST SUITE: POST /register
// ============================================================
describe("Unit Test - POST /register", () => {

  // ── TC-U-REG-01 ──────────────────────────────────────────
  test("TC-U-REG-01: Registrasi berhasil dengan input valid", async () => {
    const uniqueUser = `testuser_${Date.now()}`;
    const res = await request(app)
      .post("/register")
      .send({ username: uniqueUser, password: "password123" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/berhasil/i);
  });

  // ── TC-U-REG-02 ──────────────────────────────────────────
  test("TC-U-REG-02: Gagal jika username kosong", async () => {
    const res = await request(app)
      .post("/register")
      .send({ username: "", password: "password123" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  // ── TC-U-REG-03 ──────────────────────────────────────────
  test("TC-U-REG-03: Gagal jika password kosong", async () => {
    const res = await request(app)
      .post("/register")
      .send({ username: "validuser", password: "" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  // ── TC-U-REG-04 ──────────────────────────────────────────
  test("TC-U-REG-04: Gagal jika username sudah terdaftar (duplikat)", async () => {
    const dupUser = `dupuser_${Date.now()}`;
    // Register pertama kali
    await request(app)
      .post("/register")
      .send({ username: dupUser, password: "abc123" });

    // Register kedua (duplikat)
    const res = await request(app)
      .post("/register")
      .send({ username: dupUser, password: "abc123" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/sudah terdaftar/i);
  });

  // ── TC-U-REG-05 ──────────────────────────────────────────
  test("TC-U-REG-05: Gagal jika body kosong (tidak ada username & password)", async () => {
    const res = await request(app)
      .post("/register")
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  // ── TC-U-REG-06 ──────────────────────────────────────────
  test("TC-U-REG-06: Berhasil dengan username 1 karakter (boundary)", async () => {
    const res = await request(app)
      .post("/register")
      .send({ username: `x${Date.now()}`, password: "p" });

    expect(res.statusCode).toBe(201);
  });
});


// ============================================================
// TEST SUITE: POST /login
// ============================================================
describe("Unit Test - POST /login", () => {

  const testUser = `logintest_${Date.now()}`;
  const testPass = "testpass123";

  // Buat user dulu sebelum test login
  beforeAll(async () => {
    await request(app)
      .post("/register")
      .send({ username: testUser, password: testPass });
  });

  // ── TC-U-LOG-01 ──────────────────────────────────────────
  test("TC-U-LOG-01: Login berhasil dengan credential valid", async () => {
    const res = await request(app)
      .post("/login")
      .send({ username: testUser, password: testPass });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  // ── TC-U-LOG-02 ──────────────────────────────────────────
  test("TC-U-LOG-02: Gagal login dengan password salah", async () => {
    const res = await request(app)
      .post("/login")
      .send({ username: testUser, password: "wrongpassword" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/salah/i);
  });

  // ── TC-U-LOG-03 ──────────────────────────────────────────
  test("TC-U-LOG-03: Gagal login dengan username tidak ada", async () => {
    const res = await request(app)
      .post("/login")
      .send({ username: "userygakterdaftar999", password: "pass123" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/tidak ditemukan/i);
  });

  // ── TC-U-LOG-04 ──────────────────────────────────────────
  test("TC-U-LOG-04: Gagal login dengan username kosong", async () => {
    const res = await request(app)
      .post("/login")
      .send({ username: "", password: "pass123" });

    expect(res.statusCode).not.toBe(200);
  });

  // ── TC-U-LOG-05 ──────────────────────────────────────────
  test("TC-U-LOG-05: Token yang dikembalikan adalah format JWT (3 bagian)", async () => {
    const res = await request(app)
      .post("/login")
      .send({ username: testUser, password: testPass });

    const parts = res.body.token.split(".");
    expect(parts.length).toBe(3); // header.payload.signature
  });
});
