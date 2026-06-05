const BASE_URL = "http://localhost:3001";
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

// Redirect jika sudah login
if (localStorage.getItem("token")) {
  window.location.href = "index.html";
}

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username);
      tampilToast(data.message, "success");
      setTimeout(() => { window.location.href = "index.html"; }, 1000);
    } catch (err) {
      tampilToast("❌ " + err.message, "error");
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);
      
      tampilToast(data.message, "success");
      setTimeout(() => { window.location.href = "login.html"; }, 1500);
    } catch (err) {
      tampilToast("❌ " + err.message, "error");
    }
  });
}