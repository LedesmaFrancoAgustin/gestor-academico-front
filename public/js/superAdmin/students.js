// =============================
// 🟢 Variables principales
// =============================
const tbody = document.getElementById("usersTableBody");
const searchInput = document.getElementById("searchStudent");

const addUserOverlay = document.getElementById("userFormOverlay");
const addUserForm = document.getElementById("addUserForm");
const cancelAddUserBtn = document.getElementById("cancelAddUser");

const entriesSelect = document.getElementById("entriesPerPage");

const btReloadStudents = document.getElementById("btReloadStudents");

let editingUserId = null; // 🔹 almacena el ID si estamos editando
let searchTimeout;

// =============================
// 🟢 Inicialización de la tabla
// =============================
async function initStudents() {
  try {
    const data = await fetchStudents();
    renderStudents(data.users, tbody);

    updateTableInfo(
      Math.min(currentPage * limit, data.total),
      data.total
    );

    renderPagination(data.total, currentPage);

  } catch (err) {
    console.error("Error cargando alumnos:", err);
    renderEmptyTable(tbody)
  }
}


// =============================
// 🟢 Fetch alumnos desde API
// =============================
async function fetchStudents() {
  const q = searchInput.value.trim();

  const params = new URLSearchParams({
    limit,
    page: currentPage,
    roles: "alumno"
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

  if (!res.ok) throw new Error("No se pudieron cargar los alumnos");

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
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Error al actualizar el usuario");
  return res.json();
}
// =============================
// 🟢 Función para eliminar alumno
// =============================
async function deleteStudent(userId) {
  const res = await fetch(`${API_URL}/api/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo eliminar el alumno");
}
// =============================
// 🔹 Delegación para Editar y Eliminar
// =============================
tbody.addEventListener("click",async (e) => {
  const editBtn = e.target.closest(".editUser");
  const deleteBtn = e.target.closest(".deleteUser");

  if (editBtn) {
    e.preventDefault();

    const student = {
      _id: editBtn.dataset.id,
      nombre: editBtn.dataset.nombre,
      apellido: editBtn.dataset.apellido,
      dni: editBtn.dataset.dni,
      email: editBtn.dataset.email,
      rol: editBtn.dataset.rol,
      curso: editBtn.dataset.curso,

      legajo: editBtn.dataset.legajo,
      genero: editBtn.dataset.genero,
      libroFolio: editBtn.dataset.libroFolio,

      activo: editBtn.dataset.activo === "true",
      // 🔹 Convertimos fechaNacimiento a YYYY-MM-DD
      fechaNacimiento: editBtn.dataset.fechaNacimiento 
        ? new Date(editBtn.dataset.fechaNacimiento).toISOString().split("T")[0]
        : ""

    };

    openEditStudent(student);
  }

if (!deleteBtn) return;

  e.preventDefault();

  const studentName = `${deleteBtn.dataset.nombre} ${deleteBtn.dataset.apellido}`;

  const result = await uiConfirm({
    title: "Eliminar alumno",
    text: `¿Seguro que querés eliminar al alumno ${studentName}?`,
    confirmText: "Sí, eliminar"
  });

  if (!result.isConfirmed) return;

  try {
    await deleteStudent(deleteBtn.dataset.id);
    uiToast("Alumno eliminado correctamente", "success");
    initStudents();
  } catch (error) {
    uiToast("Error al eliminar el alumno", "error");
    console.error(error);
  }

});


// =============================
// 🔹 Función para renderizar alumnos en la tabla
// =============================
function renderStudents(students, tbody, currentPage = 1, limit = 10) {
  // Limpiar tabla
  tbody.innerHTML = "";

  // 🔹 Caso sin alumnos
  if (!students.length) {
    renderEmptyTable(tbody)
    return;
  }

  // 🔹 Recorrer alumnos
  students.forEach((user, index) => {
    const tr = document.createElement("tr");

    // 🔹 Render básico de fila
    tr.innerHTML = `
      <td>${(currentPage - 1) * limit + index + 1}</td>
      <td>${user.nombre} ${user.apellido}</td>
      <td>${user.dni || "-"}</td>
      <td>${user.email || "-"}</td>
      <td>${formatDate(user.fechaNacimiento)}</td>
      <td>${user.rol}</td>
      <td>${user.activeCourse?.name || "-"}</td>
      <td>${user.activeCourse?.modality  || "-"}</td>
      <td>${user.legajo || "-"}</td>
      <td>${user.libroFolio || "-"}</td>
      <td>
        <span class="badge ${user.activo ? "bg-success" : "bg-danger"}">
          ${user.activo ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td>
        <ul class="action-list text-center">
          <li>
            <a href="#" class="editUser" 
                data-id="${user._id}" 
                data-nombre="${user.nombre}" 
                data-apellido="${user.apellido}" 
                data-dni="${user.dni || ''}" 
                data-email="${user.email}" 
                data-rol="${user.rol}" 
                data-curso="${user.curso || ''}" 
                data-legajo="${user.legajo || ''}" 
                data-fecha-Nacimiento="${user.fechaNacimiento || ''}" 
                data-genero="${user.genero || ''}" 
                data-libro-Folio="${user.libroFolio || ''}" 
                data-activo="${user.activo}">
                <i class="fa fa-edit"></i>
            </a>
           </li>
          <li><a href="#" class="deleteUser" data-id="${user._id}"
                data-nombre="${user.nombre}" data-apellido="${user.apellido}" >
                <i class="fa fa-trash"></i></a></li>
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
// 🔹 Función utilitaria para formatear fechas DD/MM/YYYY
// =============================
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2,"0")}/${
    (d.getMonth() + 1).toString().padStart(2,"0")
  }/${d.getFullYear()}`;
}

// =============================
// 🟢 Funciones del formulario
// =============================

// Abrir formulario de agregar alumno
function openAddStudentForm() {
  addUserForm.reset(); // 🔹 Limpiar campos
  document.getElementById("title-form").textContent = "Agregar Alumno"; // 🔹 Actualizar título
  //document.getElementById("cursoFields").classList.remove("d-none"); // 🔹 Mostrar curso/división
  addUserOverlay.classList.remove("d-none"); // 🔹 Mostrar overlay

  // Cambiar texto del botón submit
  const submitBtn = addUserForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Agregar alumno';
}

// Cerrar formulario
function closeAddStudentForm() {
  addUserOverlay.classList.add("d-none");
}

// =============================
// 🔹 Función para abrir formulario en modo edición
// =============================
function openEditStudent(student) {
  addUserOverlay.classList.remove("d-none");
  document.getElementById("title-form").textContent = "Editar Alumno";

  // Llenar campos
  document.getElementById("nombre").value = student.nombre;
  document.getElementById("apellido").value = student.apellido;
  document.getElementById("dni").value = student.dni || "";
  document.getElementById("email").value = student.email || "";

  document.getElementById("legajo").value = student.legajo || "";
  document.getElementById("libroFolio").value = student.libroFolio || "";
  document.getElementById("fechaNacimiento").value = student.fechaNacimiento || "";
  document.getElementById("genero").value = student.genero || "";

  document.getElementById("activo").checked = student.activo;

  // Contraseña opcional al editar
  const passwordInput = document.getElementById("password");
  passwordInput.value = "";
  passwordInput.required = false;

  // Cambiar texto del botón submit
  const submitBtn = addUserForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Actualizar';

  // 🔹 Guardamos copia original para comparar
  addUserForm.dataset.original = JSON.stringify(student);

  editingUserId = student._id;
}

// =============================
// 🟢 Funciones para repaginacion
// =============================

function updateTableInfo(shown, total) {
  document.getElementById("shownCount").innerText = shown;
  document.getElementById("totalCount").innerText = total;
}

// Render paginacion
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
      initStudents();
    }
  };
  pagination.appendChild(prev);

  // Números
  for (let i = startPage; i <= endPage; i++) {
    const li = document.createElement("li");
    li.className = i === page ? "active" : "";
    li.innerHTML = `<a href="#">${i}</a>`;
    li.onclick = () => {
      currentPage = i;
      initStudents();
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
      initStudents();
    }
  };
  pagination.appendChild(next);
}


// =============================
// 🔹 Evento submit para agregar o editar
// =============================
addUserForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Recopilar valores del formulario
  const payload = {
    nombre: document.getElementById("nombre").value.trim(),
    apellido: document.getElementById("apellido").value.trim(),
    dni: document.getElementById("dni").value.trim(),
    email: document.getElementById("email").value.trim(),
    rol:"alumno",

    legajo: document.getElementById("legajo").value.trim(),
    libroFolio: document.getElementById("libroFolio").value.trim(),
    fechaNacimiento: document.getElementById("fechaNacimiento").value.trim(),
    genero: document.getElementById("genero").value.trim(),

    activo: document.getElementById("activo").checked,
  };

  // 🔹 Solo enviar password si se escribió algo
  const password = document.getElementById("password").value.trim();
  if (password) payload.password = password;

  try {
    if (editingUserId) {
      // 🔹 Comparar con el usuario original guardado en el dataset
      const original = JSON.parse(addUserForm.dataset.original || "{}");
      const updates = {};

      Object.keys(payload).forEach(key => {
        if (payload[key] !== original[key]) updates[key] = payload[key];
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

      // 🔹 Actualizar solo los campos modificados
      await updateUser(editingUserId, updates);
      uiToast("Usuario actualizado correctamente", "success");

    } else {
      // 🔹 Registrar nuevo alumno
      await registerUser(payload);
       uiToast(UI_MESSAGES.user.created, "success");
    }

    closeAddStudentForm();
    initStudents();
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
// 🔹 Evento Input para Buscar Alumnos por Nombre o Dni
// =============================
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    currentPage = 1;

    initStudents();
  }, 400);
});

// =============================
// 🔹 Cambiar cantidad por página
// =============================
entriesSelect.addEventListener("change", () => {
  limit = Number(entriesSelect.value);
  currentPage = 1; // 🔑 resetear página
  initStudents();
});

// =============================
// 🔹 Botón de abrir formulario
// =============================
document.getElementById("btnAddStudent")?.addEventListener("click", openAddStudentForm);

document.getElementById("cancelAddUser")?.addEventListener("click", closeAddStudentForm);
// =============================
// 🔹 Botón de btnReload
// =============================

btReloadStudents.addEventListener("click", () => {
  searchInput.value = "";
  initStudents();
});

// =============================
// 🟢 Carga masiva
// =============================

const btnMassive = document.getElementById("btnAddStudentMassive");
const fileInput = document.getElementById("massiveStudentFile");

btnMassive.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
    uiToast("Solo se permiten archivos Excel (.xlsx o .xls)", "error");
    fileInput.value = "";
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  await fetchPostMassiveStudents(formData);
});

async function fetchPostMassiveStudents(formData) {
  let loadingToast;

  try {
    btnMassive.disabled = true;

    loadingToast = uiLoadingToast("Cargando alumnos...");

    const response = await fetch(`${API_URL}/api/importMassive/students`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Error en la carga");
    }

    // 🔥 Cerrar loading antes del toast final
    loadingToast.hideToast();

    // ==========================
    // 🔎 Si hay errores
    // ==========================
    if (data.errors?.length) {

      console.table(data.errors);

      const errorList = data.errors
        .map(e => `Fila ${e.row} | DNI: ${e.dni} → ${e.error}`)
        .join("\n");

      console.log("Detalle errores:\n" + errorList);

      uiToast(
        `Insertados: ${data.inserted} | Actualizados: ${data.updated} | Errores: ${data.errors.length}`,
        "warning"
      );

    } else {

      uiToast(
        `Insertados: ${data.inserted} | Actualizados: ${data.updated}`,
        "success"
      );
    }

  } catch (error) {

    console.error(error);

    if (loadingToast) loadingToast.hideToast();

    uiToast("Error en la carga masiva", "error");

  } finally {

    btnMassive.disabled = false;
    fileInput.value = "";
  }
}


// =============================
// 🟢 Iniciar tabla al cargar la página
// =============================
initStudents();
