const changeEmailBtn = document.getElementById("changeEmailBtn");
const emailInput = document.getElementById("emailInput");

const currentPasswordInput = document.getElementById("currentPasswordInput");
const newPasswordInput = document.getElementById("newPasswordInput");
const repeatPasswordGroup = document.getElementById("repeatPasswordGroup");
const repeatPasswordInput = document.getElementById("repeatPasswordInput");
const changePasswordBtn = document.getElementById("changePasswordBtn");


const changePasswordForm = document.getElementById("changePasswordForm");

// ==================================================
// Cargar email al iniciar la página
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
  const userData = JSON.parse(localStorage.getItem("user"));
  if (userData?.email) {
    emailInput.value = userData.email; // setea el email en el input
  }
});

// ==================================================
// Evento click para cambiar email
// ==================================================
changeEmailBtn.addEventListener("click", async () => {
  const newEmail = emailInput.value.trim();
  const userData = JSON.parse(localStorage.getItem("user")) || {};
  const currentEmail = userData.email || "";

  if (!newEmail) {
    return uiToast("Correo no puede estar vacío", "warning");
  }

  // ❌ Verificar si hubo cambios
  if (newEmail === currentEmail) {
    return uiToast("No se detectaron cambios", "info");
  }

  changeEmailBtn.disabled = true; // deshabilitar mientras se procesa

  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No hay token de autenticación");

    await fetchUpdateEmail({ newEmail }, token);

    // Actualizamos localStorage
    userData.email = newEmail;
    localStorage.setItem("user", JSON.stringify(userData));

    uiToast("Correo actualizado correctamente", "success");

  } catch (err) {
    uiToast(err.message || "Error al actualizar correo", "error");
  } finally {
    changeEmailBtn.disabled = false; // volver a habilitar
  }
});
// ==================================================
// Función para actualizar email en backend
// ==================================================
async function fetchUpdateEmail(newEmail, token) {
  try {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData?.id) throw new Error("Usuario no definido");

    const res = await fetch(`${API_URL}/api/users/me/email`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(newEmail)
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Error al actualizar usuario");

    return result;

  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    throw err;
  }
} 
// ==================================================
// // Cambiar Password
// ==================================================

// ==================================================
// // Evento click para cambiar contraseña
// ==================================================

// Evento click para cambiar contraseña
changePasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // ⛔ evita recarga

  const currentPassword = currentPasswordInput.value.trim();
  const newPassword = newPasswordInput.value.trim();
  const repeatPassword = repeatPasswordInput.value.trim();

  if (!currentPassword || !newPassword || !repeatPassword) {
    return uiToast("Todos los campos son obligatorios", "warning");
  }

  if (newPassword !== repeatPassword) {
    return uiToast("Las nuevas contraseñas no coinciden", "error");
  }

  changePasswordBtn.disabled = true;

  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No hay token de autenticación");

    await fetchUpdatePassword({ currentPassword, newPassword }, token);

    // Limpiar inputs
    currentPasswordInput.value = "";
    newPasswordInput.value = "";
    repeatPasswordInput.value = "";
    repeatPasswordGroup.style.display = "none";

    uiToast("Contraseña actualizada correctamente", "success");
  } catch (err) {
    uiToast(err.message || "Error al actualizar contraseña", "error");
  } finally {
    changePasswordBtn.disabled = false;
  }
});


// ==================================================
// Mostrar input de repetir contraseña cuando el usuario escribe
// ==================================================
// Mostrar input repetir contraseña cuando el usuario escribe nueva contraseña
newPasswordInput.addEventListener("input", () => {
  if (newPasswordInput.value.trim().length > 0) {
    repeatPasswordGroup.style.display = "block";
    changePasswordBtn.disabled = false; // habilitar botón
  } else {
    repeatPasswordGroup.style.display = "none";
    repeatPasswordInput.value = "";
    changePasswordBtn.disabled = true;
  }
});

// ==================================================
// Fetch para actualizar Password en backend
// ==================================================
async function fetchUpdatePassword(updateData, token) {
  try {
    const res = await fetch(`${API_URL}/api/users/me/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });

    const result = await res.json();

    if (!res.ok) throw new Error(result.message || "Error al actualizar contraseña");

    return result;
  } catch (err) {
    console.error("Error al actualizar contraseña:", err);
    throw err;
  }
}
