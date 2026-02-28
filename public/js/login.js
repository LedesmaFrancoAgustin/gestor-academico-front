const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const identifier = document.getElementById("identifier").value;
  const password = document.getElementById("passwordUser").value;

  if (!identifier) {
    uiToast("Debes ingresar email o DNI", "error");
    return;
  } else if (!/^\d+$/.test(identifier) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
    uiToast("Debe ser un correo válido o un DNI numérico", "error");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/users/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password })
    });

    const result = await response.json();


   if (!response.ok) {
    uiToast(result.message || "Error al iniciar sesión", "error");
  return;
  }
    // ✅ ACA ESTÁ LA CLAVE
    const { token, refreshToken ,user } = result.data;

    localStorage.setItem("token", token);
    localStorage.setItem("refreshToken",refreshToken );
    localStorage.setItem("user", JSON.stringify(user));
    scheduleLogout();

    redirectByRole(user.rol)

  } catch (error) {
    console.error("Error login:", error);
    uiToast("No se pudo conectar al servidor", "error");

  }
});

function redirectByRole(role) {
  switch (role) {
    case "superAdmin":
      window.location.href = "./pages/superAdmin/indexSuperAdmin.html";
      break;

    case "docente":
      window.location.href = "./pages/user/indexUser.html";
      break;

    case "alumno":
      window.location.href = "./pages/student/index-Students.html";
      break;

    case "preceptor":
      window.location.href = "./pages/preceptor/index-Preceptor.html";
      break;

    default:
      uiToast("Rol no autorizado", "error");
      localStorage.clear();
      break;
  }
}


//Ocultar contraseña
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("passwordUser");

togglePassword.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePassword.innerHTML = isPassword
    ? '<i class="bi bi-eye-slash"></i>'
    : '<i class="bi bi-eye"></i>';
});

