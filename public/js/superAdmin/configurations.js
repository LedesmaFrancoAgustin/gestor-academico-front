const tabs = document.querySelectorAll('.tab-button');
const contents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    contents.forEach(c => c.classList.remove('active'));
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});


const cards = document.querySelectorAll('.settings-card');

cards.forEach(card => {
  card.addEventListener('click', () => {
    card.classList.toggle('active');
  });
});

// ==================================================
// leer el tab desde la URL
//==================================================


document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const tabFromUrl = params.get("tab") || "perfil";
 console.log(tabFromUrl)
  activateTab(tabFromUrl);
 
});

function activateTab(tabId) {
  // Botones
  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  // Contenidos
  document.querySelectorAll(".tab-content").forEach(content => {
    content.classList.toggle("active", content.id === tabId);
  });
}



// ==================================================
// Modal Email
//==================================================

// Referencias
const emailInput = document.querySelector('#perfil .form-group input[type="email"]');
const emailModal = document.getElementById('emailModal');
const closeEmailModal = document.getElementById('closeEmailModal');
const emailForm = document.getElementById('emailForm');

const editEmailBtn = document.getElementById('editEmailBtn');

// Traer usuario desde localStorage
const userData = localStorage.getItem("user"); // si el objeto está guardado como "user"

if (userData) {
  const user = JSON.parse(userData); // parseamos el JSON
  const userEmailSpan = document.getElementById("userEmail");
  userEmailSpan.textContent = user.email || "correo@dominio.com"; // si no hay email, valor por defecto
}

emailForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const newEmail = document.getElementById('newEmail').value;

  // Actualizar localStorage
  let user = JSON.parse(localStorage.getItem("user"));
  user.email = newEmail;
  localStorage.setItem("user", JSON.stringify(user));

  // Actualizar el span en pantalla
  document.getElementById('userEmail').textContent = newEmail;

  // Cerrar modal
  emailModal.style.display = 'none';
});



editEmailBtn.addEventListener('click', () => {
  emailModal.style.display = 'block';
});

// Cerrar modal
closeEmailModal.addEventListener('click', () => {
  emailModal.style.display = 'none';
});

// Cerrar modal al hacer click afuera del contenido
window.addEventListener('click', (e) => {
  if (e.target === emailModal) {
    emailModal.style.display = 'none';
  }
});

// Guardar correo
emailForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const newEmail = document.getElementById('newEmail').value;
  console.log('Nuevo correo:', newEmail);
  // Aquí podés hacer fetch o tu lógica para actualizar el correo
  emailModal.style.display = 'none';
});


// ==================================================
// Modal Password
//==================================================

const editPasswordBtn = document.getElementById('editPasswordBtn');
const passwordModal = document.getElementById('passwordModal');
const closePasswordModal = document.getElementById('closePasswordModal');
const passwordForm = document.getElementById('passwordForm');

// Abrir modal
editPasswordBtn.addEventListener('click', () => {
  passwordModal.style.display = 'block';
});

// Cerrar modal
closePasswordModal.addEventListener('click', () => {
  passwordModal.style.display = 'none';
});

// Cerrar modal al hacer click afuera
window.addEventListener('click', (e) => {
  if (e.target === passwordModal) {
    passwordModal.style.display = 'none';
  }
});

// Guardar contraseña

passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (newPassword !== confirmPassword) {
    return uiToast("Las contraseñas no coinciden", "warning");
  }

  try {
    await fetchUpdatePassword(currentPassword,newPassword);

    uiToast("Contraseña actualizada correctamente", "success");

    passwordForm.reset();
    passwordModal.style.display = "none";

  } catch (err) {
    console.error(err);
    uiToast(err.message, "error");
  }
});

// ==================================================
// Cambiar email
//==================================================

async function fetchUpdateEmail(updateData) {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user.id;

    const res = await fetch(`${API_URL}/api/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
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
// Cambiar Password
//==================================================

async function fetchUpdatePassword(currentPassword,newPassword) {
  try {

     const res = await fetch(`${API_URL}/api/users/me/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
    },
          body: JSON.stringify({
          currentPassword,
          newPassword
    })
  });


    const result = await res.json();

    if (!res.ok) throw new Error(result.message || "Error al actualizar usuario");

    return result;

  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    throw err;
  }
}


emailForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newEmail = document.getElementById("newEmail").value;

  try {
    await fetchUpdateEmail({ email: newEmail });

    // Actualizar localStorage fuera del fetch
    const user = JSON.parse(localStorage.getItem("user"));
    const updatedUser = { ...user, email: newEmail };
    localStorage.setItem("user", JSON.stringify(updatedUser));

    // Actualizar span en pantalla
    document.getElementById("userEmail").textContent = newEmail;

    // Cerrar modal
    emailModal.style.display = "none";

    uiToast("Correo actualizado correctamente", "success");

  } catch (err) {
    uiToast(err.message || "Error al actualizar correo", "error");
  }
});
