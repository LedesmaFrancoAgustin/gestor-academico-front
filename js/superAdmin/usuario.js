// =============================
// 🟢 Variables principales
// =============================

// Tabla
const tbody = document.getElementById("usersTableBody");

// Buscador
const searchInput = document.getElementById("searchUser");

// Overlay + Formulario
const addUserOverlay = document.getElementById("userFormOverlay");
const addUserForm = document.getElementById("addUserForm");
const cancelAddUserBtn = document.getElementById("cancelAddUser");

// Botones
const btnAddUser = document.getElementById("btnAddUser");
const btnReloadUsers = document.getElementById("btnReloadUsers");

// Paginación
const entriesSelect = document.getElementById("entriesPerPage");

// Estado
let editingUserId = null;
let searchTimeout;

// =============================
// 🟢 Inicialización de la tabla
// =============================
async function initUsers() {
  try {
    const data = await fetchUsers();

    // 🔹 Render tabla
    renderUsers(data.users, tbody, currentPage, limit);

    // 🔹 Info inferior
    updateTableInfo(
      Math.min(currentPage * limit, data.total),
      data.total
    );

    // 🔹 Paginación
    renderPagination(data.total, currentPage);

  } catch (err) {
    console.error("Error cargando usuarios:", err);

   renderEmptyTable(tbody);
  }
}

// =============================
// 🟢 Fetch usuarios desde API
// =============================
async function fetchUsers() {
  const q = searchInput.value.trim();
  const params = new URLSearchParams({
    limit,
    page: currentPage
  });

  // 🔍 Búsqueda opcional
  if (q) params.append("q", q);

  const res = await fetch(
    `${API_URL}/api/users/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!res.ok) {
    throw new Error("No se pudieron cargar los usuarios");
  }

  return res.json();
  // ⬅️ devuelve { users, total }
}
// =============================
// 🟢 Función para registrar un usuario
// =============================
async function registerUser(payload) {
  const res = await fetch(`${API_URL}/api/users/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` // ✅ FALTABA ESTO
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok) {
    throw data; // ⬅️ mandamos el error al catch
  }
  return data;
}
// =============================
// 🟢 Función para actualizar un usuario existente
// =============================
async function updateUser(userId, payload) {
  const res = await fetch(`${API_URL}/api/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw data; // ⬅️ así podés capturar err.code si viene del backend
  }

  return data;
}
// =============================
// 🟢 Función para eliminar usuario
// =============================
async function deleteUser(userId) {
  const res = await fetch(`${API_URL}/api/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    },
  });

  if (!res.ok) {
    throw new Error("No se pudo eliminar el usuario");
  }
}
// =============================
// 🔹 Función para renderizar usuarios en la tabla
// =============================
function renderUsers(users, tbody, currentPage = 1, limit = 10) {
  // Limpiar tabla
  tbody.innerHTML = "";

  // 🔹 Caso sin usuarios
  if (!users.length) {
      renderEmptyTable(tbody);
    return;
  }

  // 🔹 Recorrer usuarios
  users.forEach((user, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${(currentPage - 1) * limit + index + 1}</td>

      <td>${user.nombre} ${user.apellido}</td>
      <td>${user.dni || "-"}</td>
      <td>${user.email || "-"}</td>
      <td>${user.rol}</td>

      <td>${user.curso || "-"}</td>
      <td>${user.division || "-"}</td>
      <td>${user.area || "-"}</td>

      <td>
        <span class="badge ${user.activo ? "bg-success" : "bg-danger"}">
          ${user.activo ? "Activo" : "Inactivo"}
        </span>
      </td>

      <td>
        <ul class="action-list text-center">
          <li>
            <a href="#"
               class="editUser"
               data-id="${user._id}"
               data-nombre="${user.nombre}"
               data-apellido="${user.apellido}"
               data-dni="${user.dni || ""}"
               data-email="${user.email}"
               data-rol="${user.rol}"
               data-curso="${user.curso || ""}"
               data-division="${user.division || ""}"
               data-area="${user.area || ""}"
               data-activo="${user.activo}">
              <i class="fa fa-edit"></i>
            </a>
          </li>

          <li>
            <a href="#"
               class="deleteUser"
               data-id="${user._id}"
               data-nombre="${user.nombre}"
               data-apellido="${user.apellido}">
              <i class="fa fa-trash"></i>
            </a>
          </li>
        </ul>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function renderEmptyTable(tbody) {
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="100">
        <div class="d-flex flex-column align-items-center py-4 text-muted">
          <i class="bi bi-people fs-1 mb-2"></i>
          <span class="fw-semibold">No se encontraron usuarios</span>
          <small>Probá con otro nombre o DNI</small>
        </div>
      </td>
    </tr>
  `;
}

// =============================
// 🔹 Delegación de eventos (Editar / Eliminar)
// =============================
tbody.addEventListener("click", async (e) => {
  e.preventDefault();

  const btnEdit = e.target.closest(".editUser");
  const btnDelete = e.target.closest(".deleteUser");

  if (!btnEdit && !btnDelete) return;

  const btn = btnEdit || btnDelete;
  const userId = btn.dataset.id;

  if (!userId) return;

  // ✏️ EDITAR
  if (btnEdit) {
    openEditUserForm(userId, btn.dataset);
  }

  // 🗑️ ELIMINAR
 if (btnDelete) {
  const result = await uiConfirm({
    title: "Eliminar usuario",
    text: `¿Seguro que querés eliminar a ${btn.dataset.nombre} ${btn.dataset.apellido}?`,
    confirmText: "Sí, eliminar"
  });

  if (!result.isConfirmed) return;

  try {
    await deleteUser(userId);
    uiToast("Usuario eliminado correctamente", "success");
    initUsers();
  } catch (error) {
    uiToast("Error al eliminar el usuario", "error");
    console.error(error);
  }
}
});

//=============================
//🟢 Funciones del formulario (USERS)
//=============================
function openAddUserForm() {
  addUserForm.reset(); // 🔹 Limpiar campos
  editingUserId = null;

  document.getElementById("title-form").textContent = "Agregar Usuario";

  // 🔹 En users NO mostramos curso/división por defecto
  document.getElementById("cursoFields")?.classList.add("d-none");

  addUserOverlay.classList.remove("d-none");

  // 🔹 Botón submit
  const submitBtn = addUserForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Agregar usuario';

  // 🔹 Limpiar dataset de edición
  delete addUserForm.dataset.original;
}
function openEditUserForm(userId, data) {
  addUserOverlay.classList.remove("d-none");
  document.getElementById("title-form").textContent = "Editar Usuario";

  // Campos comunes
  document.getElementById("nombre").value = data.nombre || "";
  document.getElementById("apellido").value = data.apellido || "";
  document.getElementById("dni").value = data.dni || "";
  document.getElementById("email").value = data.email || "";
  document.getElementById("rol").value = data.rol;
  document.getElementById("activo").checked = data.activo === "true";

  // Campos condicionales
  document.getElementById("curso").value = data.curso || "";
  document.getElementById("division").value = data.division || "";
  document.getElementById("area").value = data.area || "";

  toggleRoleFields(data.rol); // 👈 importante

  // Password opcional
  const passwordInput = document.getElementById("password");
  passwordInput.value = "";
  passwordInput.required = false;

  // Botón submit
  const submitBtn = addUserForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Actualizar usuario';

  // Guardar original
  addUserForm.dataset.original = JSON.stringify({
    nombre: data.nombre || "",
    apellido: data.apellido || "",
    dni: data.dni || "",
    email: data.email || "",
    rol: data.rol,
    curso: data.curso || "",
    division: data.division || "",
    area: data.area || "",
    activo: data.activo === "true"
  });

  editingUserId = userId;
}
//Esta función controla qué campos mostrar según el rol 👇
function toggleRoleFields(rol) {
  const cursoFields = document.getElementById("cursoFields");
  const areaField = document.getElementById("areaField");

  cursoFields.classList.add("d-none");
  areaField.classList.add("d-none");

  if (rol === "alumno") {
    cursoFields.classList.remove("d-none");
  }

  if (rol === "docente") {
    areaField.classList.remove("d-none");
  }
}


function closeAddUserForm() {
  addUserOverlay.classList.add("d-none");
  editingUserId = null;
}

// =============================
// 🟢 Funciones para repaginacion
// =============================

function updateTableInfo(shown, total) {
  document.getElementById("shownCount").innerText = shown;
  document.getElementById("totalCount").innerText = total;
}

function renderPagination(total, page) {
  const totalPages = Math.ceil(total / limit);
  const pagination = document.getElementById("pagination");

  pagination.innerHTML = "";

  if (totalPages <= 1) return;

  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = startPage + maxVisible - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  // ⬅ Prev
  const prev = document.createElement("li");
  prev.className = page === 1 ? "disabled" : "";
  prev.innerHTML = `<a href="#">&lt;</a>`;
  prev.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      initUsers(); // 🔑 users.js
    }
  };
  pagination.appendChild(prev);

  // 🔢 Números
  for (let i = startPage; i <= endPage; i++) {
    const li = document.createElement("li");
    li.className = i === page ? "active" : "";
    li.innerHTML = `<a href="#">${i}</a>`;
    li.onclick = () => {
      currentPage = i;
      initUsers(); // 🔑 users.js
    };
    pagination.appendChild(li);
  }

  // ➡ Next
  const next = document.createElement("li");
  next.className = page === totalPages ? "disabled" : "";
  next.innerHTML = `<a href="#">&gt;</a>`;
  next.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      initUsers(); // 🔑 users.js
    }
  };
  pagination.appendChild(next);
}

// =============================
// 🔹 Evento submit para agregar o editar
// =============================
addUserForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const rol = document.getElementById("rol").value;

  // 🔹 Payload base
  const payload = {
    nombre: document.getElementById("nombre").value.trim(),
    apellido: document.getElementById("apellido").value.trim(),
    dni: document.getElementById("dni").value.trim(),
    email: document.getElementById("email").value.trim(),
    rol,
    activo: document.getElementById("activo").checked,
  };

  // 🔹 Campos por rol
  if (rol === "alumno") {
    payload.curso = document.getElementById("curso").value.trim();
    payload.division = document.getElementById("division").value.trim();
  }

  if (rol === "docente") {
    payload.area = document.getElementById("area").value.trim();
  }

  // 🔹 Password solo si se escribe
  const password = document.getElementById("password").value.trim();
  if (password) payload.password = password;

  try {
    if (editingUserId) {
      // 🔹 Comparar contra original
      const original = JSON.parse(addUserForm.dataset.original || "{}");
      const updates = {};

      Object.keys(payload).forEach((key) => {
        if (payload[key] !== original[key]) {
          updates[key] = payload[key];
        }
      });

      if (Object.keys(updates).length === 0) {
         await Swal.fire({
          icon: "info",
          title: "Sin cambios",
          text: "No se modificó ningún dato.",
          confirmButtonText: "Aceptar"
        });
        return;
      }

      await updateUser(editingUserId, updates);
      uiToast("Usuario actualizado correctamente", "success");

    } else {
      // 🔹 Crear nuevo usuario
      await registerUser(payload);
      uiToast(UI_MESSAGES.user.created, "success");

    }

    closeAddUserForm();
    initUsers(); // 🔑 users.js
    editingUserId = null;

  } catch (err) {
    if (err.code === "USER_ALREADY_EXISTS") {
    await Swal.fire({
      icon: "warning",
      title: "Usuario ya registrado",
      text: "El email o DNI ya está registrado",
      confirmButtonText: "Entendido"
    });
    return;
  }

     await Swal.fire({
    icon: "error",
    title: "Error al guardar",
    text: "No se pudo guardar el usuario. Intentá nuevamente.",
    confirmButtonText: "Cerrar"
  });
    console.error("Error guardando usuario:", err);
  }
});

// =============================
// 🔹 Buscar usuarios por Nombre o DNI
// =============================
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    currentPage = 1;
    initUsers();
  }, 400);
});

// =============================
// 🔹 Cambiar cantidad por página
// =============================
entriesSelect.addEventListener("change", () => {
  limit = Number(entriesSelect.value);
  currentPage = 1; // 🔑 resetear página
  initUsers();
});

// =============================
// 🔹 Botón abrir formulario
// =============================
document
  .getElementById("btnAddUser")
  ?.addEventListener("click", openAddUserForm);

document
  .getElementById("cancelAddUser")
  ?.addEventListener("click", closeAddUserForm);

  document.getElementById("rol").addEventListener("change", (e) => {
  toggleRoleFields(e.target.value);
});


// =============================
// 🔹 Botón Reload
// =============================
btnReloadUsers.addEventListener("click", () => {
  searchInput.value = "";
 // currentPage = 1;
  initUsers();
});

// =============================
// 🟢 Iniciar tabla al cargar la página
// =============================
initUsers();
