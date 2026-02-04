// Actualizacion del año copy
const API_URL = "https://gestor-academico-back.vercel.app/";
const token = localStorage.getItem("token");
const WARNING_TIME = 60 * 1000;


let limit = 15;
let currentPage = 1;
let sessionTimeoutId = null;
let logoutTimeoutId = null;


(function init() {

  const userStorage = localStorage.getItem("user");
  if (!userStorage || userStorage === "undefined") return;

  try {
    const user = JSON.parse(userStorage);

    const nameEl = document.getElementById("user-name");
    const rolEl  = document.getElementById("user-rol");

    if (nameEl) nameEl.textContent = user.nombre;
    if (rolEl)  rolEl.textContent  = user.rol;


    scheduleLogout();
  } catch (error) {
    console.error("User corrupto en localStorage", error);
    // Opcional: forzar logout
    // localStorage.removeItem("user");
    // localStorage.removeItem("token");
  }
})();


// Cerrar Secion
document.addEventListener("click", async (e) => {
  if (e.target.id === "logoutBtn") {
    const result = await uiConfirm({
      title: "Cerrar sesión",
      text: "¿Estás seguro de que querés cerrar tu sesión?",
      confirmText: "Sí, cerrar sesión",
      cancelText: "Seguir conectado",
      icon: "warning"
    });

    if (result.isConfirmed) {
      logout();
    }
  }
});

function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

function scheduleLogout() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const decoded = parseJwt(token);
  const expiresAt = decoded.exp * 1000;

  // ⛔ limpiamos cualquier timeout anterior
  if (logoutTimeoutId) {
    clearTimeout(logoutTimeoutId);
    logoutTimeoutId = null;
  }

  // ⏰ preguntar 1 minuto antes
  const timeout = expiresAt - Date.now() - WARNING_TIME;

  if (timeout <= 0) {
    askToKeepSessionAlive();
  } else {
    logoutTimeoutId = setTimeout(askToKeepSessionAlive, timeout);
  }
}




async function refreshToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("No hay refresh token");

  const res = await fetch(`${API_URL}/api/users/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }) // ⚠️ debe llamarse igual
  });

  if (!res.ok) throw new Error("No se pudo renovar la sesión");

  const result = await res.json();
  localStorage.setItem("token", result.data.token);
  localStorage.setItem("refreshToken", result.data.refreshToken || refreshToken);
}


async function askToKeepSessionAlive() {
  try {
    const keepSession = await uiConfirm({
      title: "Sesión por expirar",
      text: "Tu sesión está por expirar. ¿Querés mantenerla activa?",
      confirmText: "Mantener sesión",
      cancelText: "Cerrar sesión",
      icon: "info",
      timer: 30000, // 30 segundos
      timerProgressBar: true,
      allowOutsideClick: false,
      allowEscapeKey: false
    });

    if (keepSession.isConfirmed) {
      // Usuario quiere mantener sesión
      await refreshToken();
      scheduleLogout();
      uiToast("Sesión renovada correctamente", "success");
      location.reload();
    } 
    else if (keepSession.dismiss === "cancel") {
      // Usuario presionó cancelar
      logout();
    } 
    else if (keepSession.dismiss === "timer") {
      // Usuario NO respondió y expiró el timer
      logout();
    }
  } catch (err) {
    console.error("Error al preguntar por sesión:", err);
    logout(); // Por seguridad, cerramos sesión si hay error
  }
}



function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.href = "../../login.html";
}

document.getElementById("year").textContent = new Date().getFullYear();
