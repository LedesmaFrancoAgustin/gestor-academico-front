// =============================
// 🟢 Variables principales (Teachers)
// =============================

// 🔹 Body de la tabla de docentes
const teachersTbody = document.getElementById("teachersTableBody");

// 🔹 Input de búsqueda (nombre / DNI del docente)
const searchInput = document.getElementById("searchTeacher");

// 🔹 Overlay y formulario para agregar / editar docentes
const addUserOverlay = document.getElementById("teacherFormOverlay");
const addUserForm = document.getElementById("addTeacherForm");
const cancelAddUserBtn = document.getElementById("cancelAddTeacher");

// 🔹 Selector de cantidad de registros por página
const entriesSelect = document.getElementById("entriesPerPage");

// 🔹 Botón recargar docentes
const btnReloadTeachers = document.getElementById("btnReloadTeachers");

// 🔹 Estado de edición
let editingUserId = null; // Guarda el ID del docente si estamos editando

// 🔹 Timeout para el debounce del buscador
let searchTimeout;

// =============================
// 🟢 Inicialización de la tabla
// =============================
async function initTeachers() {
  try {
    const data = await fetchTeachers();
    // 🔹 Renderizar docentes
    renderTeachers(data.users, teachersTbody);
    // 🔹 Info: mostrando X de Y
    updateTableInfo(
      Math.min(currentPage * limit, data.total),
      data.total
    );
    // 🔹 Paginación
    renderPagination(data.total, currentPage);

  } catch (err) {
    console.error("Error cargando docentes:", err);
    renderEmptyTable(tbody);
  }
}
// =============================
// 🟢 Fetch docentes desde API
// =============================
async function fetchTeachers() {
  const q = searchInput.value.trim();

  const params = new URLSearchParams({
    limit,
    page: currentPage,
    roles: "docente"
  });

  if (q) params.append("q", q);

  const res = await fetch(
    `${API_URL}/api/users/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!res.ok) throw new Error("No se pudieron cargar los docentes");

  return res.json();
  // ⬅️ devuelve { users, total }
}
// =============================
// 🟢 Función genérica para registrar usuarios
// =============================
async function registerUser(payload) {
  
  const res = await fetch(`${API_URL}/api/users/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok) {
    throw data; // ⬅️ se maneja en el catch
  }

  return data;
}

// =============================
// 🟢 Actualizar usuario (docente)
// =============================
async function updateTeacher(userId, payload) {
  // 🔹 Nunca permitir cambiar el rol desde el front
  payload.rol = "docente";

  // 🔹 Si la contraseña viene vacía, no se envía
  if (!payload.password) {
    delete payload.password;
  }

  const res = await fetch(`${API_URL}/api/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw error;
  }

  return res.json();
}
// =============================
// 🟢 Función para eliminar docente
// =============================
async function deleteTeacher(userId) {
  const res = await fetch(`${API_URL}/api/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const error = await res.json();
    throw error;
  }

  return true; // 🔹 opcional, por claridad
}
// =============================
// 🔹 Delegación para Editar y Eliminar (Docentes)
// =============================
teachersTbody.addEventListener("click", async (e) => {
  const editBtn = e.target.closest(".editTeacher");
  const deleteBtn = e.target.closest(".deleteTeacher");

  // ✏️ Editar docente
  if (editBtn) {
    e.preventDefault();

    const teacher = {
      _id: editBtn.dataset.id,
      nombre: editBtn.dataset.nombre,
      apellido: editBtn.dataset.apellido,
      dni: editBtn.dataset.dni,
      email: editBtn.dataset.email,
      rol: "docente",
      area: editBtn.dataset.area,
      activo: editBtn.dataset.activo === "true",
    };

    openEditTeacher(teacher);
  }

  // 🗑️ Eliminar docente
  if (deleteBtn) {
  e.preventDefault();

  const teacherName = `${deleteBtn.dataset.nombre} ${deleteBtn.dataset.apellido}`;

  const result = await uiConfirm({
    title: "Eliminar docente",
    text: `¿Seguro que querés eliminar al docente ${teacherName}?`,
    confirmText: "Sí, eliminar"
  });

  if (!result.isConfirmed) return;

  try {
    await deleteTeacher(deleteBtn.dataset.id);
    uiToast("Docente eliminado correctamente", "success");
    initTeachers();
  } catch (error) {
    uiToast("Error al eliminar el docente", "error");
    console.error(error);
  }
}


});

// =============================
// 🟢 Función para renderizar docentes en la tabla
// =============================
function renderTeachers(teachers, tbody, currentPage = 1, limit = 10) {
  // 🔹 Limpiar tabla antes de renderizar
  tbody.innerHTML = "";

  // 🔹 Caso: no hay docentes
  if (!teachers.length) {
    renderEmptyTable(tbody);
    return;
  }

  // 🔹 Recorrer docentes
  teachers.forEach((teacher, index) => {
    const tr = document.createElement("tr");

    // 🔹 Construcción de la fila
    tr.innerHTML = `
      <!-- Nº -->
      <td>${(currentPage - 1) * limit + index + 1}</td>

      <!-- Nombre -->
      <td>${teacher.nombre} ${teacher.apellido}</td>

      <!-- DNI -->
      <td>${teacher.dni || "-"}</td>

      <!-- Email -->
      <td>${teacher.email || "-"}</td>

      <!-- Rol -->
      <td>${teacher.rol}</td>

      <!-- Area -->
      <td>${teacher.area || "-"}</td>

      <!-- Cursos-->
      <td>${teacher.curso || "-"}</td>

      <!-- Estado -->
      <td>
        <span class="badge ${teacher.activo ? "bg-success" : "bg-danger"}">
          ${teacher.activo ? "Activo" : "Inactivo"}
        </span>
      </td>

      <!-- Acciones -->
      <td>
        <ul class="action-list text-center">
          <li>
            <a href="#" 
               class="editTeacher"
               data-id="${teacher._id}"
               data-nombre="${teacher.nombre}"
               data-apellido="${teacher.apellido}"
               data-dni="${teacher.dni || ""}"
               data-email="${teacher.email}"
               data-rol="${teacher.rol}"
               data-curso="${teacher.curso || ""}"
               data-area="${teacher.area || ""}"
               data-activo="${teacher.activo}">
              <i class="fa fa-edit"></i>
            </a>
          </li>

          <li>
            <a href="#" 
               class="deleteTeacher"
               data-id="${teacher._id}"
               data-nombre="${teacher.nombre}"
               data-apellido="${teacher.apellido}">
              <i class="fa fa-trash"></i>
            </a>
          </li>
        </ul>
      </td>
    `;

    // 🔹 Agregar fila a la tabla
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
// 🟢 Funciones del formulario (DOCENTES)
// =============================

// =============================
// 🔹 Abrir formulario para agregar docente
// =============================
function openAddTeacherForm() {
  // 🔹 Limpiar formulario
  addUserForm.reset();

  // 🔹 Título del formulario
  document.getElementById("title-form").textContent = "Agregar Docente";

  // 🔹 Ocultar campos de curso/división (docentes no pertenecen a un curso fijo)
 // document.getElementById("cursoFields").classList.add("d-none");

  // 🔹 Mostrar overlay
  addUserOverlay.classList.remove("d-none");

  // 🔹 Configurar botón submit
  const submitBtn = addUserForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Agregar docente';

  // 🔹 Resetear estado edición
  editingUserId = null;
}

// =============================
// 🔹 Cerrar formulario
// =============================
function closeAddTeacherForm() {
  addUserOverlay.classList.add("d-none");
}

// =============================
// 🔹 Abrir formulario en modo edición (docente)
// =============================
function openEditTeacher(teacher) {
  // 🔹 Mostrar formulario
  addUserOverlay.classList.remove("d-none");

  // 🔹 Título del formulario
  document.getElementById("title-form").textContent = "Editar Docente";

  // 🔹 Completar campos
  document.getElementById("nombre").value = teacher.nombre;
  document.getElementById("apellido").value = teacher.apellido;
  document.getElementById("dni").value = teacher.dni || "";
  document.getElementById("email").value = teacher.email;
  document.getElementById("area").value = teacher.area;
  document.getElementById("activo").checked = teacher.activo;

  // 🔹 Ocultar curso/división
  //document.getElementById("cursoFields").classList.add("d-none");

  // 🔹 Contraseña opcional en edición
  const passwordInput = document.getElementById("password");
  passwordInput.value = "";
  passwordInput.required = false;

  // 🔹 Cambiar texto del botón submit
  const submitBtn = addUserForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Actualizar';

  // 🔹 Guardar estado original (para detectar cambios)
  addUserForm.dataset.original = JSON.stringify(teacher);

  // 🔹 ID del docente en edición
  editingUserId = teacher._id;
}

// =============================
// 🟢 Funciones para repaginación (DOCENTES)
// =============================

// =============================
// 🔹 Actualizar info de la tabla
// =============================
function updateTableInfo(shown, total) {
  document.getElementById("shownCount").innerText = shown;
  document.getElementById("totalCount").innerText = total;
}

// =============================
// 🔹 Renderizar paginación
// =============================
function renderPagination(total, page) {
  const totalPages = Math.ceil(total / limit);
  const pagination = document.getElementById("pagination");

  // 🔹 Limpiar paginación
  pagination.innerHTML = "";

  // 🔹 No mostrar si hay una sola página
  if (totalPages <= 1) return;

  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = startPage + maxVisible - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  // ⬅️ Prev
  const prev = document.createElement("li");
  prev.className = page === 1 ? "disabled" : "";
  prev.innerHTML = `<a href="#">&lt;</a>`;
  prev.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      initTeachers(); // 👈 docentes
    }
  };
  pagination.appendChild(prev);

  // 🔢 Números de página
  for (let i = startPage; i <= endPage; i++) {
    const li = document.createElement("li");
    li.className = i === page ? "active" : "";
    li.innerHTML = `<a href="#">${i}</a>`;
    li.onclick = () => {
      currentPage = i;
      initTeachers(); // 👈 docentes
    };
    pagination.appendChild(li);
  }

  // ➡️ Next
  const next = document.createElement("li");
  next.className = page === totalPages ? "disabled" : "";
  next.innerHTML = `<a href="#">&gt;</a>`;
  next.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      initTeachers(); // 👈 docentes
    }
  };
  pagination.appendChild(next);
}

// =============================
// 🔹 Evento submit para agregar o editar DOCENTE
// =============================
addUserForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // =============================
  // 🔹 Recopilar valores del formulario
  // =============================
  const payload = {
    nombre: document.getElementById("nombre").value.trim(),
    apellido: document.getElementById("apellido").value.trim(),
    dni: document.getElementById("dni").value.trim(),
    email: document.getElementById("email").value.trim(),
    rol: "docente", // 👈 rol fijo para teachers
    area: document.getElementById("area").value.trim(),
    activo: document.getElementById("activo").checked,
  };

  // 🔹 Solo enviar password si se escribió algo
  const password = document.getElementById("password").value.trim();
  if (password) payload.password = password;

  try {
    if (editingUserId) {
      // =============================
      // 🔹 Edición: comparar con datos originales
      // =============================
      const original = JSON.parse(addUserForm.dataset.original || "{}");
      const updates = {};

      Object.keys(payload).forEach((key) => {
        if (payload[key] !== original[key]) {
          updates[key] = payload[key];
        }
      });

      // 🔹 Si no hay cambios
      if (Object.keys(updates).length === 0) {
        await Swal.fire({
          icon: "info",
          title: "Sin cambios",
          text: "No se modificó ningún dato.",
          confirmButtonText: "Aceptar"
        });
        return;
      }

      // 🔹 Actualizar solo campos modificados
      await updateTeacher(editingUserId, updates);
      uiToast("Usuario actualizado correctamente", "success");

    } else {
      // =============================
      // 🔹 Registrar nuevo docente
      // =============================
      await registerUser(payload);
      uiToast(UI_MESSAGES.user.created, "success");
    }

    // =============================
    // 🔹 Reset UI
    // =============================
    closeAddTeacherForm(); // 👈 función equivalente en teachers.js
    initTeachers();        // 👈 recargar tabla
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
    console.error("Error guardando docente:", err);
  }
});

// =============================
// 🔹 Evento Input para Buscar DOCENTES por Nombre o DNI
// =============================
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);

  // 🔹 Delay para evitar demasiados requests
  searchTimeout = setTimeout(() => {
    currentPage = 1; // 🔑 resetear página
    initTeachers();
  }, 400);
});

// =============================
// 🔹 Cambiar cantidad de registros por página
// =============================
entriesSelect.addEventListener("change", () => {
  limit = Number(entriesSelect.value);
  currentPage = 1; // 🔑 resetear página
  initTeachers();
});

// =============================
// 🔹 Botón para abrir formulario "Agregar Docente"
// =============================
document
  .getElementById("btnAddTeacher")
  ?.addEventListener("click", openAddTeacherForm);

// =============================
// 🔹 Botón cancelar formulario
// =============================
document
  .getElementById("cancelAddTeacher")
  ?.addEventListener("click", closeAddTeacherForm);

// =============================
// 🔹 Botón Reload Docentes
// =============================
btnReloadTeachers.addEventListener("click", () => {
  searchInput.value = "";
  currentPage = 1;
  initTeachers();
});

// =============================
// 🟢 Inicializar tabla al cargar la página
// =============================
initTeachers();

