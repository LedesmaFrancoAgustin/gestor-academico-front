// ===================== VARIABLES GLOBALES =====================
const subjectsTableBody = document.getElementById("subjectsTableBody");
const addSubjectForm = document.getElementById("addSubjectForm");
const subjectFormOverlay = document.getElementById("subjectFormOverlay");
const entriesSelect = document.getElementById("entriesPerPageSubject");
const searchInput = document.getElementById("searchSubject");

let subjects = [];
let itemsPerPage = Number(entriesSelect.value);
let searchQuery = "";
let searchTimeout;


// ===================== CARGAR MATERIAS =====================
async function loadSubjects({ q = "", page = 1, limit = 15 } = {}) {
  try {
    const res = await fetch(`${API_URL}/api/subjects?page=${page}&limit=${limit}&q=${q}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const result = await res.json();

    subjects = result.data.subjects || [];
    renderSubjectsTable(subjects);
    renderSubjectsPagination(subjects, result.data.total, page, limit);
    updateSubjectsTableInfo(subjects.length, result.data.total);

  } catch (error) {
    console.error("Error al cargar materias:", error);
    uiToast("Error al cargar materias", "error");
  }
}

// ===================== RENDER TABLA =====================
function renderSubjectsTable(data) {
  subjectsTableBody.innerHTML = "";

  data.forEach((subject, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${index + 1 + (currentPage - 1) * itemsPerPage}</td>
      <td>${subject.name}</td>
      <td>${subject.code}</td>
      <td>${subject.academicYear}</td>
      <td>${subject.type === "mandatory" ? "Obligatoria" : "Optativa"}</td>
      <td>
        <span class="badge ${subject.active ? "bg-success" : "bg-danger"}">
          ${subject.active ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td>
        <ul class="action-list text-center">
          <li><a href="#" class="editSubject"><i class="fa fa-edit"></i></a></li>
          <li><a href="#" class="deleteSubject"><i class="fa fa-trash"></i></a></li>
        </ul>
      </td>
    `;

    // Botón Editar
    tr.querySelector(".editSubject").addEventListener("click", (e) => {
      e.preventDefault();
      openEditSubject(subject);
    });

    // Botón Eliminar
    tr.querySelector(".deleteSubject").addEventListener("click", async (e) => {
      e.preventDefault();
      if (confirm(`Eliminar la materia "${subject.name}"?`)) {
        try {
          await fetch(`${API_URL}/api/subjects/${subject._id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          alert("Materia eliminada");
          loadSubjects({ q: searchQuery, page: currentPage, limit: itemsPerPage });
        } catch (error) {
          console.error("Error al eliminar materia:", error);
          alert("Error al eliminar materia");
        }
      }
    });

    subjectsTableBody.appendChild(tr);
  });
}

// ===================== ABRIR FORMULARIO PARA EDITAR =====================
function openEditSubject(subject) {
  subjectFormOverlay.classList.remove("d-none");

  document.getElementById("title-form-subject").textContent = "Editar Materia";

  const submitBtn = addSubjectForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Actualizar';

  addSubjectForm.dataset.subjectId = subject._id;

  // Guardar valores originales
  addSubjectForm.dataset.originalData = JSON.stringify({
    name: subject.name,
    code: subject.code,
    academicYear: subject.academicYear,
    type: subject.type,
    active: subject.active
  });

  // Llenar campos
  document.getElementById("name").value = subject.name;
  document.getElementById("code").value = subject.code;
  document.getElementById("academicYear").value = subject.academicYear;
  document.getElementById("type").value = subject.type;
  document.getElementById("activeSubject").checked = subject.active;
}

// ===================== SUBMIT FORMULARIO =====================
addSubjectForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const id = form.dataset.subjectId;
  const originalData = JSON.parse(form.dataset.originalData || "{}");

  const currentData = {
    name: document.getElementById("name").value.trim(),
    code: document.getElementById("code").value.trim(),
    academicYear: document.getElementById("academicYear").value.trim(),
    type: document.getElementById("type").value,
    active: document.getElementById("activeSubject").checked
  };

  // Solo enviar los campos modificados
  const dataToUpdate = {};
  for (let key in currentData) {
    if (currentData[key] !== originalData[key]) {
      dataToUpdate[key] = currentData[key];
    }
  }

  // Si no hay cambios, salir
  if (id && Object.keys(dataToUpdate).length === 0) {
    uiToast("No se modificó ningún dato", "warning");
    return;
  }

  try {
    if (id) {
      // Actualizar materia
      await fetch(`${API_URL}/api/subjects/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(dataToUpdate)
      });
      uiToast("Materia actualizada con éxito", "success");

    } else {
      // Crear materia
      await fetch(`${API_URL}/api/subjects/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(currentData)
      });
      uiToast("Materia creada con éxito", "success");

    }

    // Recargar tabla
    loadSubjects({ q: searchQuery, page: currentPage, limit: itemsPerPage });

    // Cerrar overlay y resetear
    form.reset();
    form.dataset.subjectId = "";
    subjectFormOverlay.classList.add("d-none");

  } catch (error) {
    console.error("Error al guardar materia:", error);
    uiToast("Error al guardar materia", "error");
  }
});

// ===================== BUSCADOR CON DEBOUNCE =====================
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    currentPage = 1;
    const query = searchInput.value.trim(); // texto que escribe el usuario
    loadSubjects({
      q: query,
      page: currentPage,
      limit: entriesSelect.value // el select de cantidad de filas
    });
  }, 400); // debounce de 400ms
});


// ===================== SELECT ENTRIES =====================
entriesSelect.addEventListener("change", () => {
  itemsPerPage = Number(entriesSelect.value);
  currentPage = 1;
  loadSubjects({
    q: searchQuery,
    page: currentPage,
    limit: itemsPerPage
  });
});

// ===================== PAGINACIÓN =====================
function renderSubjectsPagination(data, total, page, limit) {
  const pagination = document.getElementById("paginationSubjects");
  pagination.innerHTML = "";

  const totalPages = Math.ceil(total / limit);

  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${i === page ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener("click", (e) => {
      e.preventDefault();
      currentPage = i;
      loadSubjects({ q: searchQuery, page: currentPage, limit: itemsPerPage });
    });
    pagination.appendChild(li);
  }
}

// ===================== CONTADOR =====================
function updateSubjectsTableInfo(shown, total) {
  document.getElementById("shownCountSubject").textContent = shown;
  document.getElementById("totalCountSubject").textContent = total;
}

// ===================== Boton cancelar =====================
const cancelAddSubjectBtn = document.getElementById("cancelAddSubject");
cancelAddSubjectBtn.addEventListener("click", () => {
  // Cerrar overlay
  subjectFormOverlay.classList.add("d-none");

  // Limpiar campos del formulario
  const form = document.getElementById("addSubjectForm");
  form.reset();

  // Quitar dataset si estaba editando
  delete form.dataset.subjectId;

  // Restaurar título y botón a "Agregar"
  document.getElementById("title-form-subject").textContent = "Agregar Materia";
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="bi bi-plus-lg"></i> Agregar';
});

// ===================== Boton agregar materia =====================
const addSubjectBtn = document.getElementById("btnAddSubject");
addSubjectBtn.addEventListener("click", () => {
  subjectFormOverlay.classList.remove("d-none"); // mostrar overlay
  addSubjectForm.reset(); // limpiar campos
  delete addSubjectForm.dataset.subjectId; // eliminar id por si estaba editando
  document.getElementById("title-form-subject").textContent = "Agregar Materia";
  const submitBtn = addSubjectForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="bi bi-plus-lg"></i> Agregar';
});


// ===================== BOTÓN RECARGAR =====================
const btnReloadSubject = document.getElementById("btnReloadSubject");

if (btnReloadSubject) {
  btnReloadSubject.addEventListener("click", () => {
    searchInput.value = "";
    loadCourses(currentPage );
  });
}


// ===================== INICIALIZAR =====================
loadSubjects({ page: currentPage, limit: itemsPerPage });
