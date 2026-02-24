// ===================== VARIABLES GLOBALES =====================
const coursesTableBody = document.getElementById("usersTableBodyCourse");
const addCourseForm = document.getElementById("addCourseForm");
const courseFormOverlay = document.getElementById("courseFormOverlay");
const btnAddCourse = document.getElementById("btnAddCourse");
const btnCancelCourse = document.getElementById("cancelAddCourse");
const entriesSelectCourse = document.getElementById("entriesPerPage");
const paginationCourse = document.getElementById("pagination");
const shownCountCourse = document.getElementById("shownCount");
const totalCountCourse = document.getElementById("totalCount");
const searchInputCourse = document.getElementById("searchCourse"); // input buscador

const panelInfo = document.getElementById("courseOverlay");

let courses = [];
let searchQueryCourse = "";
let searchTimeoutCourse;

let selectedCourseId = null;

// Creamos una variable que guarda si se presionó
let confirmAddUserPressed = false;
let confirmAddStudentPressed = false;
let confirmAddSubjectPressed = false;

let courseUsers = []; // Array global - los usuarios del curso

// ===================== CARGAR CURSOS =====================
async function loadCourses(page = 1, query = "") {
  currentPage = page;
  const limit = Number(entriesSelectCourse.value);

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/course?limit=${limit}&page=${page}&q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await res.json();
    if (res.ok) {
      courses = result.data?.courses || [];
      const total = result.data?.total || 0;

      renderCoursesTable(courses);
      updateCoursesTableInfo(courses.length, total);
      renderCoursesPagination(total, page);
    } else {
      uiToast("Error al cargar cursos", "error");
    }
  } catch (error) {
    console.error("Error de conexión:", error);
  }
}

// ===================== RENDER TABLA =====================
function renderCoursesTable(data) {
  coursesTableBody.innerHTML = "";

  data.forEach((course, index) => {
    const tr = document.createElement("tr");
    

    tr.dataset.courseId = course._id; // 👈 CLAVE
    tr.innerHTML = `
        <td>${index + 1 + (currentPage - 1) * Number(entriesSelectCourse.value)}</td>
        <td>${course.name}</td>
        <td>${course.code}</td>
        <td>${course.modality}</td>
        <td>${course.academicYear}</td>
        <td>
          <span class="badge ${course.active ? "bg-success" : "bg-secondary"}">
            ${course.active ? "Activo" : "Inactivo"}
          </span>
        </td>
         <!-- ACCIONES -->
        <td >
          <ul class="action-list">
            <li> <a href="#" class="addUsers" title="Agregar usuarios"> <i class="fa fa-user-plus"></i> </a>
              </li>
            <li> <a href="#" class="addStudents" title="Agregar alumnos"><i class="fa fa-graduation-cap"></i> </a>
              </li>
            <li> <a href="#" class="addRepeaters" title="Agregar recursantes"> <i class="fa fa-user-clock"></i> </a>
               </li>
            <li><a href="#" class="addSubjects" title="Agregar materias"> <i class="fa fa-book"></i></a>
              </li>
          </ul>
        </td>
         <!-- MODIFICACIONES -->
        <td>
          <ul class="action-list ">
            
            <li> <a href="#" class="editCourse" title="Editar curso"> <i class="fa fa-edit"></i> </a>
              </li>
            <li> <a href="#" class="deleteCourse" title="Eliminar curso"> <i class="fa fa-trash"></i></a>
              </li>
            <li> <a href="#" class="viewCourse" title="Ver curso"> <i class="fa fa-eye"></i> </a>
              </li>
          </ul>
        </td>
      `;

    // Botón Editar
    tr.querySelector(".editCourse").addEventListener("click", (e) => {
      e.preventDefault();
      openEditCourse(course);
    });

    // Botón Eliminar
    tr.querySelector(".deleteCourse").addEventListener("click", (e) => {
      e.preventDefault();
      deleteCourse(course._id);
    });

    coursesTableBody.appendChild(tr);
  });
}

// ===================== ACTUALIZAR CONTADOR =====================
function updateCoursesTableInfo(shown, total) {
  shownCountCourse.textContent = shown;
  totalCountCourse.textContent = total;
}

// ===================== PAGINACIÓN =====================
function renderCoursesPagination(totalItems, page = 1) {
  const limit = Number(entriesSelectCourse.value);
  const totalPages = Math.ceil(totalItems / limit);
  paginationCourse.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${i === page ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener("click", (e) => {
      e.preventDefault();
      loadCourses(i, searchQueryCourse);
    });
    paginationCourse.appendChild(li);
  }
}

// ===================== FORMULARIO AGREGAR/EDITAR =====================
function showCourseForm() {
  courseFormOverlay.classList.remove("d-none");
}

function hideCourseForm() {
  courseFormOverlay.classList.add("d-none");
}

btnAddCourse.addEventListener("click", () => {
  addCourseForm.reset();
  delete addCourseForm.dataset.courseId;
  document.getElementById("title-form-course").textContent = "Agregar Curso";
  const submitBtn = addCourseForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="bi bi-plus-lg"></i> Agregar';
  showCourseForm();
});

btnCancelCourse.addEventListener("click", () => {
  hideCourseForm();
  addCourseForm.reset();
});

// ===================== ABRIR FORMULARIO PARA EDITAR =====================
function openEditCourse(course) {
  courseFormOverlay.classList.remove("d-none");

  document.getElementById("title-form-course").textContent = "Editar Curso";
  const submitBtn = addCourseForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Actualizar';

  addCourseForm.dataset.courseId = course._id;
  addCourseForm.dataset.originalData = JSON.stringify({
    name: course.name,
    code: course.code,
    modality: course.modality,
    academicYear: course.academicYear,
    active: course.active
  });

  document.getElementById("nombre").value = course.name;
  document.getElementById("codigo").value = course.code;
  document.getElementById("modality").value = course.modality;
  document.getElementById("anioAcademico").value = course.academicYear;
  document.getElementById("activoCourse").checked = course.active;
}

// ===================== SUBMIT FORMULARIO =====================
addCourseForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const cursoData = {
    name: document.getElementById("nombre").value.trim(),
    code: document.getElementById("codigo").value.trim(),
    modality: document.getElementById("modality").value.trim(),
    academicYear: Number(document.getElementById("anioAcademico").value),
    active: document.getElementById("activoCourse").checked
  };


  const token = localStorage.getItem("token");
  const courseId = addCourseForm.dataset.courseId;
  const originalData = JSON.parse(addCourseForm.dataset.originalData || "{}");


  try {
    let method, url, body;

    if (courseId) {
      const updatedData = {};
      Object.keys(cursoData).forEach(key => {
        if (cursoData[key] !== originalData[key]) 
          updatedData[key] = cursoData[key];
      });

      console.log("updatedData",updatedData)
      if (Object.keys(updatedData).length === 0) {
        uiToast("No se modificó ningún dato", "warning");
        return;
      }

      method = "PUT";
      url = `${API_URL}/api/course/${courseId}`;
      body = JSON.stringify(updatedData);
    } else {
      method = "POST";
      url = `${API_URL}/api/course`;
      body = JSON.stringify(cursoData);
    }
    console.log("cursoData", cursoData);


    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body
    });

    //const result = await res.json();
    if (res.ok) {
      loadCourses(currentPage, searchQueryCourse);
      addCourseForm.reset();
      hideCourseForm();
      uiToast(
        courseId ? "Curso actualizado con éxito" : "Curso creado con éxito",
        "success"
      );
      delete addCourseForm.dataset.courseId;
    } else {
      uiToast("Error al guardar curso", "error");

    }
  } catch (error) {
    console.error("Error al guardar curso:", error);
    uiToast("Error al guardar curso", "error");
  }
});

// ===================== ELIMINAR CURSO =====================
async function deleteCourse(courseId) {
  const result = await Swal.fire({
    title: "Eliminar curso",
    html: `
      <p>Esta acción <strong>no se puede deshacer</strong>.</p>
      <p>Escribí <b>ELIMINAR</b> para confirmar.</p>
      <input
        type="text"
        id="confirmInput"
        class="swal2-input"
        placeholder="Escribí ELIMINAR"
      />
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    focusConfirm: false,
    preConfirm: () => {
      const value = document.getElementById("confirmInput").value;
      if (value !== "ELIMINAR") {
        Swal.showValidationMessage("Tenés que escribir ELIMINAR para continuar");
        return false;
      }
      return true;
    }
  });

  if (!result.isConfirmed) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_URL}/api/course/${courseId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (res.ok) {
      uiToast("Curso eliminado correctamente", "success");
      loadCourses(currentPage, searchQueryCourse);
    } else {
      uiToast(data.message || "Error al eliminar el curso", "error");
    }
  } catch (error) {
    console.error("Error al eliminar curso:", error);
    uiToast("Error al eliminar el curso", "error");
  }
}


// ===================== SELECT ENTRIES =====================
entriesSelectCourse.addEventListener("change", () => loadCourses(1, searchQueryCourse));

// ===================== BUSCADOR CON DEBOUNCE =====================
searchInputCourse.addEventListener("input", () => {
  clearTimeout(searchTimeoutCourse);
  searchTimeoutCourse = setTimeout(() => {
    searchQueryCourse = searchInputCourse.value.trim();
    currentPage = 1;
    loadCourses(currentPage, searchQueryCourse);
  }, 400); // debounce 400ms
});

// ===================== BOTÓN RECARGAR =====================
const btnReloadCourse = document.getElementById("btnReloadCourse");
  btnReloadCourse.addEventListener("click", () => {
    searchInputCourse.value = "";
    loadCourses(currentPage );
  });


//============================================================== Usuarios ========================================
// ===================== Boton de agregar usuarios al curso=====================

document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".addUsers");
  if (!btn) return;

  e.preventDefault();

  const row = btn.closest("tr");
  selectedCourseId = row.dataset.courseId;
  const courseName = row.querySelector("td:nth-child(2)").textContent;

  console.log("selectedCourseId: ",selectedCourseId)
  await openAddUserPanel(selectedCourseId, courseName);


  
});

// ===================== Funcion para abrir el render de agregar usuarios =====================
async function openAddUserPanel(courseId, courseName) {

  
  if (!courseId) {
  uiToast("Seleccioná un curso primero", "info");
  return;
}

  // Actualizar nombre del curso en el panel
  document.getElementById("usersPanelCourseName").textContent = courseName || "";

  // Abrir overlay
  document.getElementById("usersOverlay").classList.remove("d-none");

  // Limpiar inputs y resultados
  document.getElementById("userSearchInput").value = "";
  document.getElementById("usersSearchResults").innerHTML = "";

  // Cargar usuarios del curso
  await loadCourseUsers(courseId);
}
// ===================== Fetch usuario en curso =====================
let courseUsersIds = [];
async function loadCourseUsers(courseId) {
  try {
    const res = await fetch(`${API_URL}/api/course/${courseId}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await res.json();
    const users = result.data || [];

    // ⚠️ Solo usuarios válidos (no null)
    courseUsersIds = users
      .filter(u => u.user)        // eliminar null
      .map(u => u.user._id);      // obtener id

  } catch (err) {
    console.error("Error cargando usuarios del curso", err);
    courseUsersIds = [];
  }
}

// ===================== Cerrar panel =====================

function closeUsersPanel() {
  document.getElementById("usersOverlay").classList.add("d-none");
  //selectedCourseId = null;
  
if (!panelInfo.classList.contains("d-none")&& confirmAddUserPressed) {
    loadCourseUsersInfo(selectedCourseId)
    confirmAddUserPressed = false;
  
  // Aquí ponés la acción que querés realizar
}
}

document
  .getElementById("closeUsersPanel")
  .addEventListener("click", closeUsersPanel);

// Click afuera del panel
document.getElementById("usersOverlay").addEventListener("click", (e) => {
  if (e.target.id === "usersOverlay") {
    closeUsersPanel();
  }
});

// ===================== Buscar Usuarios =====================
document
  .getElementById("userSearchInput")
  .addEventListener("input", async (e) => {
    const q = e.target.value.trim();
    const tbody = document.getElementById("usersSearchResults");

    if (q.length < 2) {
      tbody.innerHTML = "";
      return;
    }

    const roles = ["PRECEPTOR", "TUTOR", "DIRECTIVO", "DOCENTE"];
    const rolesQuery = roles.join(",");

    const res = await fetch(
      `${API_URL}/api/users/search?limit=15&page=1&q=${q}&roles=${rolesQuery}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const data = await res.json();
    const users = data.users || [];

    renderUsers(users);
  });
// ===================== Render Usuarios =====================
function renderUsers(users) {
  const tbody = document.getElementById("usersSearchResults");
  tbody.innerHTML = "";

  users.forEach((user , index ) => {
    // 🔹 Verificar si el usuario ya está en el curso
    const alreadyInCourse = courseUsersIds.includes(user._id);

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${user.nombre} ${user.apellido}</td>
      <td>${user.email}</td>
      <td>${user.dni}</td>
      <td>
        <select class="form-select form-select-sm role-select " ${alreadyInCourse ? "disabled" : ""}>
          <option value="preceptor" ${user.rol === "preceptor" ? "selected" : ""}>
            Preceptor
          </option>
          <option value="tutor" ${user.rol === "tutor" ? "selected" : ""}>
            Tutor
          </option>
          <option value="directivo" ${user.rol === "directivo" ? "selected" : ""}>
            Directivo
          </option>
          <option value="docente" ${user.rol === "docente" ? "selected" : ""}>
            Docente
          </option>
        </select>
      </td>
      <td>
        <button
          class="btn btn-sm ${alreadyInCourse ? "btn-secondary" : "btn-success"} confirmAddUser"
          data-user-id="${user._id}"
          ${alreadyInCourse ? "disabled" : ""}
        >
          ${alreadyInCourse ? "Ya agregado" : "Agregar"}
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ===================== Boton agregar =====================
  document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".confirmAddUser");
  if (!btn) return;

  const userId = btn.dataset.userId;
  const courseId = selectedCourseId;
  console.log("confirmeAddUser courseId: ",courseId)

  if (!selectedCourseId) {
  uiToast("Seleccioná un curso primero", "warning");
  return;
}


  const row = btn.closest("tr");
  const role = row.querySelector(".role-select")?.value;

  if (!role) {
  uiToast("Seleccione un rol", "warning");
  return;
}


  btn.disabled = true;
  btn.textContent = "Agregando...";

  try {
    const res = await fetch(
      `${API_URL}/api/course/${selectedCourseId}/users`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          role
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Error al agregar usuario");
    }

    // ✅ Feedback visual
    btn.textContent = "Agregado";
    btn.classList.remove("btn-success");
    btn.classList.add("btn-secondary");
    confirmAddUserPressed = true;

    uiToast("Usuario agregado", "success");


  } catch (error) {
    console.error(error);
    btn.disabled = false;
    btn.textContent = "Agregar";
  }
});

// ===================== Agregar estudiantes ==========================================================================
// Abrir overlay al hacer clic en el ícono de agregar alumnos
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".addStudents");
  if (!btn) return;

  e.preventDefault();

  const row = btn.closest("tr");
  selectedCourseId = row.dataset.courseId;
  const courseName = row.querySelector("td:nth-child(2)").textContent;

  openAddStudentPanel(selectedCourseId,courseName)

});

// ===================== Funcion para abrir el render de agregar estudiantes =====================
async function openAddStudentPanel(courseId, courseName) {

  
  if (!courseId) {
  uiToast("Seleccioná un curso primero", "info");
  return;
}

  document.getElementById("studentsPanelCourseName").textContent = courseName;
  document.getElementById("studentsOverlay").classList.remove("d-none");

  document.getElementById("studentSearchInput").value = "";
  document.getElementById("studentsSearchResults").innerHTML = "";

  // Cargar alumnos ya asignados
  loadCourseStudents(selectedCourseId);


}

// Cerrar overlay
document.getElementById("closeStudentsOverlay").addEventListener("click", () => {
  document.getElementById("studentsOverlay").classList.add("d-none");

if (!panelInfo.classList.contains("d-none")&& confirmAddStudentPressed) {
    loadCourseStudentsInfo(selectedCourseId)
    
    console.log("entro")
    confirmAddStudentPressed = false;
  
  // Aquí ponés la acción que querés realizar
}
});

// ===================== Agregar Recusante ==========================================================================
// Abrir overlay al hacer clic en el ícono de agregar alumnos
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".addRepeaters");
  if (!btn) return;

  e.preventDefault();

  const row = btn.closest("tr");
  selectedCourseId = row.dataset.courseId;

  openAddStudentRepeatersPanel(selectedCourseId)

});

// Abrir overlay al hacer clic en el ícono de agregar alumnos desde el panel de infoCurso
const addBtn = document.getElementById("addStudentsRecourse");

addBtn.addEventListener("click", (e) => {
  e.preventDefault();

  if (!selectedCourseId) {
    uiToast("Seleccioná un curso primero", "warning");
    return;
  }

  openAddStudentRepeatersPanel(selectedCourseId);
});

// -------------------------------- función openAddStudentRepeatersPanel -----------------------------
const modal = document.getElementById("repeatersModal");
const closeBtn = document.getElementById("closeRepeatersModal");

async function openAddStudentRepeatersPanel(courseId) {

  const resultsContainer = document.getElementById("repeatersResults");

  modal.classList.remove("hidden");

  inputSearchRepeaters.value = "";
  inputSearchRepeaters.disabled = true;
  resultsContainer.innerHTML = "";

  subjectSelectRepeaters.innerHTML = `
    <option value="" selected disabled>Cargando materias...</option>
  `;

  try {

    const response = await fetchTeacherAndSubjetsAssignmment(courseId);
    const subjectsArray = response.data;

    console.log("subjectsArray: " , subjectsArray)

    if (!subjectsArray || subjectsArray.length === 0) {
      subjectSelectRepeaters.innerHTML = `
        <option value="" disabled selected>No hay materias disponibles</option>
      `;
      return;
    }

    // 🔥 FILTRAR SOLO TITULARES
    const titulares = subjectsArray.filter(
      item => item.teacherStatusSubject === true
    );

    if (titulares.length === 0) {
      subjectSelectRepeaters.innerHTML = `
        <option value="" disabled selected>No hay materias titulares</option>
      `;
      return;
    }

    subjectSelectRepeaters.innerHTML = `
      <option value="" selected disabled>Seleccionar materia</option>
    `;

    titulares.forEach(item => {

      const option = document.createElement("option");

      // value = TeachingAssignmentId
      option.value = item.subjectId;

      // 🔹 data attribute → teachingAssignmentId
      option.dataset.teachingAssignmentId = item.TeachingAssignmentId;

      // 🔹 data attribute → academicYearCourse
      option.dataset.academicYearCourse = item.academicYearCourse;

      // texto = Materia - Docente
      option.textContent = `${item.subjectName} - ${item.teacherApellido} ${item.teacherNombre}`;

      subjectSelectRepeaters.appendChild(option);

    });

  } catch (error) {

    console.error("Error cargando materias:", error);

    subjectSelectRepeaters.innerHTML = `
      <option value="" disabled selected>Error al cargar materias</option>
    `;
  }
}

// -------------------------------- cerrar modal Recursante -----------------------------

closeBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

// cerrar haciendo click afuera
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
  }
});


// -------------------------------- Selecionar materia para recursar-----------------------------
const subjectSelectRepeaters = document.getElementById("subjectSelectRepeaters");
subjectSelectRepeaters.addEventListener("change", () => {

    if (subjectSelectRepeaters.value) {
    inputSearchRepeaters.disabled = false;
    inputSearchRepeaters.focus();
  } else {
    inputSearchRepeaters.disabled = true;
  }

});

// -------------------------------- input buscar recursante -----------------------------
const inputSearchRepeaters = document.getElementById("searchRepeatersInput");
let debounceTimer;


inputSearchRepeaters.addEventListener("input", async (e) => {

  const query = e.target.value.trim();
 
  // limpiar timer anterior
  clearTimeout(debounceTimer);

  // si está vacío, limpiar resultados
  if (!query) {
    renderRepeatersResults([]);
    return;
  }

  // esperar 400ms antes de hacer fetch
  debounceTimer = setTimeout(async () => {
    const subjectId = subjectSelectRepeaters.value.trim();
    console.log("subjectId: ",subjectId)
    const students = await fetchStudentsRepeaters(10, query , subjectId);
    renderRepeatersResults(students);
  }, 400);


});



// -------------------------------- render de estudiante recursantes -----------------------------
function renderRepeatersResults(students) {

  const container = document.getElementById("repeatersResults");

  // Si no hay resultados
  if (!students || students.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        No se encontraron alumnos recursantes.
      </div>
    `;
    return;
  }

  let html = `
    <table class="repeaters-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Alumno</th>
          <th>DNI</th>
          <th>Email</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
  `;

  students.forEach((student, index) => {
    html += `
      <tr>
        <td>${index + 1}</td>
        <td>${student.name} ${student.lastname}</td>
        <td>${student.dni}</td>
        <td>${student.email || "-"}</td>
        <td>
          <button 
            class="btn-add-repeater"
            data-id="${student._id}"
          >
            Agregar
          </button>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// -------------------------------- Agregar recursante boton  -----------------------------
const repeatersContainer = document.getElementById("repeatersResults");

repeatersContainer.addEventListener("click", async (e) => {

  const button = e.target.closest(".btn-add-repeater");
  if (!button) return;

  // 🔒 Evita doble click mientras procesa
  if (button.disabled) return;

  if (!subjectSelectRepeaters.value) {
    uiToast("Seleccioná una materia primero", "warning");
    return;
  }

  const selectedOption =
    subjectSelectRepeaters.options[subjectSelectRepeaters.selectedIndex];

  if (!selectedOption) {
    uiToast("Materia inválida", "error");
    return;
  }

  const studentId = button.dataset.id;
  const teachingAssignmentId = selectedOption.dataset.teachingAssignmentId;
  const academicYear = selectedOption.dataset.academicYearCourse;

  console.log(studentId , teachingAssignmentId , academicYear)

  try {

    button.disabled = true;
    button.textContent = "Agregando...";

    await fetchCreateStudentRecourseAssignment(
      studentId,
      teachingAssignmentId,
      academicYear
    );

    button.textContent = "Agregado ✓";
    button.classList.add("success");

    uiToast("Materia a recursante agregada correctamente", "success");

  } catch (error) {

    console.error(error);

    button.disabled = false;
    button.textContent = "Agregar";

    uiToast(
      error?.message || "Error inesperado al agregar recursado",
      "error"
    );
  }

});


// -------------------------------- Fetch traer recursantes -----------------------------
async function fetchStudentsRepeaters( limit , query , subjectId) {
  try {
    const res = await fetch(`${API_URL}/api/StudentSubjectStatus/students/pending/subjectId?limit=${limit}&q=${query}&subjectId=${subjectId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await res.json();
    
    const students = result.data || [];
  console.log("students: ", students)
   return students
  } catch (err) {
    console.error("Error cargando alumnos recursantes", err);
    courseStudentsIds = [];
  }
}


async function fetchTeacherAndSubjetsAssignmment(courseId) {
  try {
    const res = await fetch(`${API_URL}/api/TeachingAssignment/teachers/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(result.message || "Error al solicitar materias");
    
    const result = await res.json();
    return result;

  } catch (err) {
    console.error("Error al solicitar materias: ", err);
    throw err;
  }
}

async function fetchCreateStudentRecourseAssignment( studentId, teachingAssignmentId, academicYear) {
  try {
    const res = await fetch(`${API_URL}/api/studentRecourseAssignment`, {
      method: "POST", // 🔥 IMPORTANTE
      headers: {
        "Content-Type": "application/json", // 🔥 Necesario para body JSON
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        studentId,
        teachingAssignmentId,
        academicYear
      })
    });

    const result = await res.json(); // 👈 primero parseamos

    if (!res.ok) {
      throw new Error(result.message || "Error al crear recursante");
    }

    return result;

  } catch (err) {
    console.error("Error al crear recursante:", err);
    throw err;
  }
}




// ===================== Buscar alumnos desde el backend =====================
document.getElementById("studentSearchInput").addEventListener("input", async (e) => {
  const q = e.target.value.trim();
  const tbody = document.getElementById("studentsSearchResults");

  if (q.length < 2) {
    tbody.innerHTML = "";
    return;
  }

  const roles = ["alumno"];
  const rolesQuery = roles.join(",");

  const res = await fetch(`${API_URL}/api/users/search?limit=15&page=1&q=${q}&roles=${rolesQuery}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  const students = data.users || [];
  // courseData es lo que recibís del backend

  console.log("students",students)
  // Render alumnos
  renderStudents(students);
});

// ===================== Renderizar resultados con botón “Agregar”=====================
function renderStudents(students) {
  const tbody = document.getElementById("studentsSearchResults");
  tbody.innerHTML = "";

  students.forEach((student,index) => {
    // Verificar si el alumno ya está en el curso
    const alreadyInCourse = courseStudentsIds.includes(student._id);

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${student.nombre} ${student.apellido}</td>
      <td>${student.email}</td>
      <td>${student.dni}</td>
      <td>
        <button
          class="btn btn-sm ${alreadyInCourse ? "btn-secondary" : "btn-success"} confirmAddStudent"
          data-student-id="${student._id}"
          ${alreadyInCourse ? "disabled" : ""}
        >
          ${alreadyInCourse ? "Ya agregado" : "Agregar"}
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ===================== Agregar alumno al curso con fetch=====================
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".confirmAddStudent");
  if (!btn) return;

  const studentId = btn.dataset.studentId;
  if (!selectedCourseId) {
    alert("No hay curso seleccionado");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/course/${selectedCourseId}/students`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ studentId })
    });

    const data = await res.json();

    if (res.ok) {
      // Deshabilitar botón y cambiar texto
      btn.classList.remove("btn-success");
      btn.classList.add("btn-secondary");
      btn.disabled = true;
      btn.textContent = "Ya agregado";
      confirmAddStudentPressed = true;

      // Agregar alumno al array local
      courseStudentsIds.push(studentId);
      uiToast("Estudiante agregado correctamente", "success");


    } else {
      uiToast("Error agregando alumno", "error");
      console.error("Error agregando alumno:", data);
    }
  } catch (error) {
    console.error("Error de conexión:", error);
    uiToast("Error de conexión", "error");

  }
});
// ===================== Buscar estudiantes en el curso =====================
let courseStudentsIds = [];

async function loadCourseStudents(courseId) {
  try {
    const res = await fetch(`${API_URL}/api/course/${courseId}/students`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await res.json();
    const students = result.data || [];

    // ⚠️ Solo alumnos válidos (no null)
    courseStudentsIds = students
      .filter(s => s.student)   // eliminar null
      .map(s => s.student._id); // obtener id

  } catch (err) {
    console.error("Error cargando alumnos del curso", err);
    courseStudentsIds = [];
  }
}

// ===================== Subjects ===================================================================================================

// =====================  Abrir overlay al hacer clic en el ícono de agregar materias======================
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".addSubjects");
  if (!btn) return;

  e.preventDefault();

  const row = btn.closest("tr");
  selectedCourseId = row.dataset.courseId;
  const courseName = row.querySelector("td:nth-child(2)").textContent;

  openAddSubjectPanel(selectedCourseId, courseName)
});

 

  // ===================== Funcion para abrir el render de agregar estudiantes =====================
async function openAddSubjectPanel(courseId, courseName) {

  
  if (!courseId) {
  uiToast("Seleccioná un curso primero", "info");
  return;
}

  document.getElementById("subjectsPanelCourseName").textContent = courseName;
  document.getElementById("subjectsOverlay").classList.remove("d-none");

  document.getElementById("subjectSearchInput").value = "";
  document.getElementById("subjectsSearchResults").innerHTML = "";

  // Aquí podés llamar a la función que cargue las materias ya asignadas al curso
  loadCourseSubjects(selectedCourseId);


}
// Cerrar overlay
document.getElementById("closeSubjectsOverlay").addEventListener("click", () => {
  document.getElementById("subjectsOverlay").classList.add("d-none");


  if (!panelInfo.classList.contains("d-none")&& confirmAddSubjectPressed) {
    loadCourseSubjectsInfo(selectedCourseId)
    console.log("entro curso")
    confirmAddSubjectPressed = false;
  
  // Aquí ponés la acción que querés realizar
}

});


// ===================== Función para cargar materias del curso =====================
let courseSubjectsIds = []; // IDs de materias ya agregadas al curso

async function loadCourseSubjects(courseId) {
  try {
    const res = await fetch(`${API_URL}/api/course/${courseId}/subjects`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await res.json();
    const subjects = result.data || [];

    // ⚠️ Solo materias válidas (no null)
    courseSubjectsIds = subjects
      .filter(s => s.subject)    // eliminar null
      .map(s => s.subject._id);  // obtener id

  } catch (err) {
    console.error("Error cargando materias del curso", err);
    courseSubjectsIds = [];
  }
}

// ===================== Función para renderizar las materias=====================
function renderSubjects(subjects) {
  const tbody = document.getElementById("subjectsSearchResults");
  tbody.innerHTML = "";

  subjects.forEach((subject,index) => {
    const alreadyInCourse = courseSubjectsIds.includes(subject._id);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${subject.name}</td>
      <td>${subject.code || "-"}</td>
      <td>${subject.academicYear || "-"}</td>
      <td>
        <span class="badge ${subject.active ? "bg-success" : "bg-danger"}">
          ${subject.active ? "Activo" : "Inactiva"}
        </span>
      </td>
      <td>
        <button
          class="btn btn-sm ${alreadyInCourse ? "btn-secondary" : "btn-success"} confirmAddSubject"
          data-subject-id="${subject._id}"
          ${alreadyInCourse ? "disabled" : ""}
        >
          ${alreadyInCourse ? "Ya agregado" : "Agregar"}
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ===================== Buscador de materias =====================
document.getElementById("subjectSearchInput").addEventListener("input", async (e) => {
  const q = e.target.value.trim();
  const tbody = document.getElementById("subjectsSearchResults");

  if (q.length < 2) {
    tbody.innerHTML = "";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/subjects?q=${q}&limit=15&page=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const resData = await res.json();
    const subjects = resData.data.subjects || [];

    renderSubjects(subjects);

  } catch (err) {
    console.error("Error buscando materias", err);
  }
});

// ===================== Agregar materia al curso =====================
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".confirmAddSubject");
  if (!btn) return;

  const subjectId = btn.dataset.subjectId;
  if (!selectedCourseId) return alert("No hay curso seleccionado");

  try {
    const res = await fetch(`${API_URL}/api/course/${selectedCourseId}/subjects`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ subjectId })
    });

    const data = await res.json();

    if (res.ok) {
      // ⚡ Actualizamos los IDs locales para deshabilitar botón sin recargar
      courseSubjectsIds.push(subjectId);
      btn.textContent = "Ya agregado";
      btn.classList.remove("btn-success");
      btn.classList.add("btn-secondary");
      btn.disabled = true;
      confirmAddSubjectPressed = true;

      uiToast("Materia agregada correctamente", "success");

    } else {
      uiToast("Error agregando materia", "error");
      console.error("Error agregando materia:", data);

    }

  } catch (err) {
    uiToast("Error agregando materia", "error");
    console.error("Error agregando materia al curso", err);
  }
});


// =======================================================================
// 🟢 Panel para ver informacion del curso
// =======================================================================

// Abrir overlay (por ejemplo al clickear "Ver curso")
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".viewCourse");
  if (!btn) return;
  e.preventDefault();

  document.getElementById("courseOverlay").classList.remove("d-none");

  const courseRow = btn.closest("tr");
  selectedCourseId = courseRow.dataset.courseId;

  loadCourseInfo(selectedCourseId);
});

// 🔹 Traer y renderizar usuarios del curso
async function loadCourseUsersInfo(courseId) {
  try {
    const res = await fetch(`${API_URL}/api/course/${courseId}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    const users = data.data || [];

    // Guardamos en variable global para usar al asignar materias
    courseUsers = users;
    // 🔤 Ordenar alfabéticamente
    sortUsers(users, { by: "apellido" });

    const tbody = document.getElementById("courseUsersList");

    tbody.innerHTML = ""; // Limpiar tabla

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted py-4">
            No se encontraron usuarios
          </td>
        </tr>
      `;
      return;
    }

    users.forEach((u, index) => {
      const tr = document.createElement("tr");

      // Si u.user es null, mostramos un placeholder
      const userId = u.user?._id || "-";
      const nombre = u.user?.nombre || "-";
      const apellido = u.user?.apellido || "";
      const email = u.user?.email || "-";
      const dni = u.user?.dni || "-";
      const role = u.role || "-";
      const status = u.status || "-";

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${apellido} ${nombre} </td>
        <td>${email}</td>
        <td>${dni}</td>
        <td>${role}</td>
        <td>
          <span class="badge ${status === "activo" ? "bg-success" : "bg-danger"}">
            ${status}
          </span>
        </td>
        <td class="text-center">
          ${
            u.user
              ? `
            <!-- 🔄 Cambiar estado -->
            <a href="#"
              class="changeUsersStatus text-warning me-2"
              data-user-id="${userId}"
              data-current-status="${status}"
              title="Cambiar estado del alumno">
              <i class="fa fa-exchange-alt"></i>
            </a>

            <!-- ❌ Eliminar por error de carga -->
            <a href="#"
              class="removeUserFromCourse text-danger"
              data-user-id="${userId}"
              title="Eliminar alumno (error de carga)">
              <i class="fa fa-trash"></i>
            </a>
          `
              : `<span class="text-muted">Usuario no disponible</span>`
          }
        </td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error cargando usuarios del curso", err);
    uiToast("Error cargando usuarios del curso", "error");
  }
}


async function loadCourseStudentsInfo(courseId) {
  try {
    const res = await fetch(`${API_URL}/api/course/${courseId}/students`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    const students = data.data || [];
    sortUsers(students, { by: "apellido" });

    const tbody = document.getElementById("courseStudentsList");

    tbody.innerHTML = ""; // Limpiar tabla

    if (students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted py-4">
            No se encontraron estudiantes
          </td>
        </tr>
      `;
      return;
    }

    students.forEach((s, index) => {
      const tr = document.createElement("tr");

      // ⚠️ Manejo defensivo para estudiante eliminado
      const studentId = s.student?._id || "-";
      const nombre = s.student?.nombre || "-";
      const apellido = s.student?.apellido || "";
      const dni = s.student?.dni || "-";
      const email = s.student?.email || "-";
      const status = s.status || "-";

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${apellido} ${nombre}</td>
        <td>${dni}</td>
        <td>${email}</td>
        <td>
          <span class="badge ${
            status === "activo" ? "bg-success" : "bg-danger"
          }">
            ${status}
          </span>
        </td>
        <td class="text-center">
          ${
            s.student
              ? `
            <!-- 🔄 Cambiar estado -->
            <a href="#"
              class="changeStudentStatus text-warning me-2"
              data-student-id="${studentId}"
              data-current-status="${status}"
              title="Cambiar estado del alumno">
              <i class="fa fa-exchange-alt"></i>
            </a>

            <!-- ❌ Eliminar por error de carga -->
            <a href="#"
              class="rollbackStudentFromCourse text-danger"
              data-student-id="${studentId}"
              title="Eliminar alumno (error de carga)">
              <i class="fa fa-trash"></i>
            </a>
          `
              : `<span class="text-muted">Alumno no disponible</span>`
          }
        </td>
      `;

      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Error cargando estudiantes del curso", err);
    uiToast("Error cargando estudiantes del curso", "error");
  }
}

async function loadCourseRepeaters(courseId) {
  try {
    const res = await fetch(`${API_URL}/api/studentRecourseAssignment/recourse/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const response = await res.json();
    const repeaters = response.data; // 👈 IMPORTANTE

    const tbody = document.getElementById("courseRepeatersList");

    if (!repeaters || repeaters.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">
            No hay recursantes registrados
          </td>
        </tr>
      `;
      return;
    }

    let html = "";

    repeaters.forEach((item, index) => {
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${item.studentName}</td>
          <td>${item.dni}</td>
          <td>${item.email || "-"}</td>
          <td>${item.subject}</td> <!-- 👈 cambiado -->
          <td>
            <button class="btn btn-sm  btn-remove-recourse text-danger" 
                    data-id="${item.id}" title="Eliminar alumno (error de carga)">
                    <i class="fa fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

  } catch (err) {
    console.error("Error cargando recursante del curso", err);
    uiToast("Error cargando recursante del curso", "error");
  }
}




// 🔹 Traer y renderizar materias del curso
async function loadCourseSubjectsInfo(courseId) {
  try {
    const data = await fetchSubjetcByCourse(courseId);
    const subjects = data.data || [];

    const teacher = await fetchTeacherBySubjetc(courseId);
    console.log("teacher: ", teacher);

    sortUsers(subjects, { by: "name" });
    const tbody = document.getElementById("courseSubjectsList");
    tbody.innerHTML = "";

    if (subjects.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-4">
            No se encontraron materias
          </td>
        </tr>
      `;
      return;
    }

    subjects.forEach((sub, index) => {
      const { subject } = sub;
      const tr = document.createElement("tr");

      const subjectId = subject?._id || "-";
      const name = subject?.name || "-";
      const code = subject?.code || "-";
      const type = subject?.type === "mandatory" ? "Obligatoria" : "Optativa";
      const status = subject?.active ? "Activo" : "Inactiva";
      const badgeClass = subject?.active ? "bg-success" : "bg-danger";

      /* ⛔ NO ponemos "Sin docente" acá */
      const teacherHtml = `
        <div class="teacher-cell d-flex align-items-center gap-2">
          
          <select
            class="form-select form-select-sm teacher-select"
            data-subject-id="${subjectId}"
            data-course-id="${courseId}"
          ></select>

          <!-- 🔹 Estado -->
          <span
            class="teacher-status badge status-inactive"
            title="Estado del docente en la materia"
          >
            Inactivo
          </span>


          <div class="teacher-actions d-flex gap-2">
            <a href="#"
              class="addTeacherByCourse text-success"
              data-subject-id="${subjectId}"
              title="Asignar docente">
              <i class="fa fa-plus"></i>
            </a>

            <a href="#"
              class="activateTeacherFromSubject text-primary"
              data-subject-id="${subjectId}"
              title="Activar docente">
              <i class="fa fa-check-circle"></i>
            </a>


            <a href="#"
              class="removeTeacherFromSubject text-danger"
              data-subject-id="${subjectId}"
              title="Quitar docente">
              <i class="fa fa-trash"></i>
            </a>
          </div>

        </div>
      `;


      /* 🔹 Render fila */
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${name}</td>
        <td>${code}</td>
        <td>${type}</td>
        <td class="teacher-column-cell" >${teacherHtml}</td>
        <td>
          <span class="badge ${badgeClass}">
            ${status}
          </span>
        </td>
        <td class="text-center">
          ${
            subject
              ? `<a href="#"
                  class="removeSubjectFromCourse text-danger"
                  data-subject-id="${subjectId}"
                  title="Quitar materia">
                  <i class="fa fa-trash"></i>
                </a>`
              : `<span class="text-muted">Materia no disponible</span>`
          }
        </td>
      `;

      /* 🔹 Cargar docentes */
      const select = tr.querySelector(".teacher-select");
      const removeBtn = tr.querySelector(".removeTeacher");
      const statusSpan = tr.querySelector(".teacher-status");


      const teachersBySubject = Array.isArray(teacher?.data)
        ? teacher.data.filter(t => t.subjectId === subjectId)
        : [];

      if (teachersBySubject.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Sin docente";
        select.appendChild(opt);
        select.disabled = true;
      } else {
        // Activo primero
        teachersBySubject.sort((a, b) => {
          return Number(b.teacherStatusSubject) - Number(a.teacherStatusSubject);
        });

        let activeStatus = "inactive";

        teachersBySubject.forEach(t => {
          const option = document.createElement("option");
          option.value = t.teacherId;

          const isActive = Boolean(t.teacherStatusSubject);

          option.textContent = isActive
            ? `${t.teacherApellido} ${t.teacherNombre} (Actual)`
            : `${t.teacherApellido} ${t.teacherNombre}`;

          option.dataset.status = isActive ? "active" : "inactive";
          option.dataset.academicYear = t.academicYearCourse;

          if (isActive) {
            option.selected = true;
            activeStatus = "active";
          }

          select.appendChild(option);
        });

        // 🔹 FORZAMOS el badge con el estado real
        updateTeacherStatusBadge(statusSpan, activeStatus);

        // 🔹 Cambio manual
        select.addEventListener("change", e => {
          const option = e.target.options[e.target.selectedIndex];
          updateTeacherStatusBadge(
            statusSpan,
            option?.dataset.status || "inactive"
          );
        });




      }

      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Error cargando materias del curso", err);
    uiToast("Error cargando materias del curso", "error");
  }
}

function updateTeacherStatusBadge(span, status) {
  if (status === "active") {
    span.textContent = "Activo";
    span.classList.remove("status-inactive");
    span.classList.add("status-active");
  } else {
    span.textContent = "Inactivo";
    span.classList.remove("status-active");
    span.classList.add("status-inactive");
  }
}

// ==================================================
// Fetch obtener materia del curso
//==================================================

async function fetchSubjetcByCourse(courseId) {
  try {
    const res = await fetch(`${API_URL}/api/course/${courseId}/subjects`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(result.message || "Error al actualizar usuario");
    
    const result = await res.json();
    return result;

  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    throw err;
  }
}

// ==================================================
// Fetch obtener materia del curso
//==================================================

async function fetchTeacherBySubjetc(courseId) {
  try {
    const res = await fetch(`${API_URL}/api/TeachingAssignment/teachers/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(result.message || "Error al actualizar usuario");
    
    const result = await res.json();
    return result;

  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    throw err;
  }
}

// ==================================================
// Fetch Asignar docente a materia del curso
//==================================================

async function fetchTeacherAssignSubject(courseId, subjectId, teacherId) {
  try {
    console.log(courseId,subjectId,teacherId)
    const res = await fetch(`${API_URL}/api/TeachingAssignment/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        teacher: teacherId,
        subject: subjectId,
        course: courseId,
        academicYear: new Date().getFullYear()
      })
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || "Error al asignar docente");
    }

    return result;

  } catch (err) {
    console.error("Error al asignar docente:", err);
    throw err;
  }
}

// ==================================================
// Fetch Borrar docente de la materia del curso
//==================================================

async function fetchDeleteTeacherAssignSubject(courseId, subjectId, teacherId ,academicYear) {
  try {
    console.log(courseId,subjectId,teacherId)
    const res = await fetch(`${API_URL}/api/TeachingAssignment/hardDelete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        teacherId: teacherId,
        subjectId: subjectId,
        courseId: courseId,
        academicYear: academicYear
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(result.message || "Error al eliminar docente de la materia");
    }

     return {
        ok: res.ok,
        data
      };

  } catch (err) {
    console.error("Error al eliminar docente:", err);
    throw err;
  }
}
// ==================================================
// Fetch Cambiar estado docente en la materia del curso
//==================================================
async function fetchActivateTeacherAssignSubject(courseId,subjectId,teacherId,academicYear) {
try {
    console.log(courseId,subjectId,teacherId)
    const res = await fetch(`${API_URL}/api/TeachingAssignment/state`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        teacherId: teacherId,
        subjectId: subjectId,
        courseId: courseId,
        academicYear: academicYear
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(result.message || "Error al actualizar estado del docente en la materia");
    }

     return {
        ok: res.ok,
        data
      };

  } catch (err) {
    console.error("Error al actualizar estado:", err);
    throw err;
  }
}

// 🔹 Función principal para mostrar toda la info del curso
async function loadCourseInfo(courseId) {
  await loadCourseUsersInfo(courseId);
  await loadCourseStudentsInfo(courseId);
  await loadCourseRepeaters(courseId);
  await loadCourseSubjectsInfo(courseId);
}


// ===================== Boton de agregar usuarios al curso desde panel de info=====================
document.getElementById("btnAddUser")?.addEventListener("click", async () => {
  const courseName = document.querySelector("#courseOverlay .overlay-title h3")?.textContent;
  await openAddUserPanel(selectedCourseId, courseName);
});

// ===================== Boton de agregar alumnos al curso desde panel de info=====================
document.getElementById("btnAddStudent")?.addEventListener("click", async () => {
  const courseName = document.querySelector("#courseOverlay .overlay-title h3")?.textContent;
  await openAddStudentPanel(selectedCourseId, courseName);
});

// ===================== Boton de agregar Materias al curso desde panel de info=====================
document.getElementById("btnAddSubject")?.addEventListener("click", async () => {
  const courseName = document.querySelector("#courseOverlay .overlay-title h3")?.textContent;
  await openAddSubjectPanel(selectedCourseId, courseName);
});

// ===================== Boton de agregar Docentes A las materias=====================
// Delegar click en toda la tabla
document.getElementById("courseSubjectsList").addEventListener("click", async (e) => {
  const target = e.target.closest(".addTeacherByCourse");
  if (!target) return;

  const subjectId = target.dataset.subjectId;
  const courseName = document.querySelector("#courseOverlay .overlay-title h3")?.textContent;

  await openAddTeacherByCoursePanel(selectedCourseId,subjectId, courseName);
});

// Abrir modal
async function openAddTeacherByCoursePanel(courseId, subjectId, courseName) {
  if (!courseId || !subjectId) {
    uiToast("Faltan datos del curso o materia", "info");
    return;
  }

  console.log("courseUsers: ", courseUsers);

  document.getElementById("teacherModalCourseName").textContent = courseName;

  const select = document.getElementById("teacherModalSelect");

  // 👉 Guardamos subjectId en el select
  select.dataset.subjectId = subjectId;
  select.dataset.courseId = courseId; // ya que estamos 😉

  // Limpiar opciones
  select.innerHTML = '<option value="">-- Selecciona un docente --</option>';

  courseUsers.forEach(cu => {
    if (cu.role === "docente" && cu.status === "activo") {
      const option = document.createElement("option");
      option.value = cu.user._id;
      option.textContent =
        `${cu.user.apellido} ${cu.user.nombre}` || cu.user.dni;
      select.appendChild(option);
    }
  });

  document
    .getElementById("addTeacherBySubjetcModal")
    .classList.remove("d-none");
}


//asignar docente a materia + curso
document.getElementById("confirmAddTeacher").addEventListener("click", async () => {
  const select = document.getElementById("teacherModalSelect");

  const teacherId = select.value;
  const subjectId = select.dataset.subjectId;
  const courseId = select.dataset.courseId;

  if (!teacherId) {
    uiToast("Seleccioná un docente", "info");
    return;
  }

  try {
    await fetchTeacherAssignSubject(courseId, subjectId, teacherId);
    loadCourseSubjectsInfo(courseId)
    uiToast("Docente asignado correctamente", "success");
  } catch (err) {
    uiToast(err.message, "error");
  }
});

// Cerrar modal con botón Cancelar
document.getElementById("cancelAddTeacher").addEventListener("click", () => {
  document.getElementById("addTeacherBySubjetcModal").classList.add("d-none");
});

// Cerrar modal con botón ✕
document.getElementById("closeTeacherModal").addEventListener("click", () => {
  document.getElementById("addTeacherBySubjetcModal").classList.add("d-none");
});

// Cerrar modal al hacer click fuera del contenido
document.getElementById("addTeacherBySubjetcModal").addEventListener("click", (e) => {
  if (e.target.id === "addTeacherBySubjetcModal") {
    e.currentTarget.classList.add("d-none");
  }
});

// ===================== Boton de Elimminar Docentes A las materias=====================
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".removeTeacherFromSubject");
  if (!btn) return;

  e.preventDefault();

  const row = btn.closest("tr");
  const select = row.querySelector(".teacher-select");

  if (!select) {
    uiToast("No se pudo identificar el docente asignado", "error");
    return;
  }


  const selectedOption = select.options[select.selectedIndex];

  if (!selectedOption) {
    uiToast("No se pudo identificar la asignación", "error");
    return;
  }

  const teacherId = selectedOption.value;
  const academicYear = selectedOption.dataset.academicYear;
  const subjectId = select.dataset.subjectId;
  const courseId = select.dataset.courseId;

  const status = selectedOption.dataset.status;

  // 🛑 Confirmación
    if (status === "active") {
      const confirmDelete = confirm(
        "Estás por eliminar el docente activo. ¿Continuar?"
      );
      if (!confirmDelete) return;
    }


  try {
    const res = await fetchDeleteTeacherAssignSubject(
      courseId,
      subjectId,
      teacherId,
      academicYear
    );
    if (!res.ok) {
      throw new Error("Error al eliminar la asignación acaaa");
    }

    uiToast(
      "Docente eliminado correctamente de la materia",
      "success"
    );

    // 🔁 refrescar UI
    loadCourseSubjectsInfo(selectedCourseId);

  } catch (error) {
    uiToast(
      error.message || "No se pudo eliminar el docente",
      "error"
    );
  }
});

// ===================== Boton de Cambiar estado activo al  Docentes en la materia=====================
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".activateTeacherFromSubject");
  if (!btn) return;

  e.preventDefault();

  const row = btn.closest("tr");
  const select = row.querySelector(".teacher-select");

  if (!select) {
    uiToast("No se pudo identificar el docente", "error");
    return;
  }

  const selectedOption = select.options[select.selectedIndex];

  if (!selectedOption) {
    uiToast("Seleccioná un docente", "warning");
    return;
  }

  const teacherId = selectedOption.value;
  const academicYear = selectedOption.dataset.academicYear;
  const subjectId = select.dataset.subjectId;
  const courseId = select.dataset.courseId;

  console.log("teacherId: ",teacherId,"subjectId: ",subjectId,"courseId: " ,courseId, "academicYear: ",academicYear)
  
  try {
    const res = await fetchActivateTeacherAssignSubject(
      courseId,
      subjectId,
      teacherId,
      academicYear
    );

    if (!res.ok) {
      throw new Error(res.data?.message || "No se pudo activar el docente");
    }

    uiToast("Docente activado correctamente", "success");
      // 🔁 refrescar UI
    loadCourseSubjectsInfo(selectedCourseId);

  } catch (error) {
    uiToast(error.message, "error");
  }

  
});



// Cerrar overlay
document.getElementById("closeSubjectsOverlay").addEventListener("click", () => {
  document.getElementById("subjectsOverlay").classList.add("d-none");


  if (!panelInfo.classList.contains("d-none")&& confirmAddSubjectPressed) {
    loadCourseSubjectsInfo(selectedCourseId)
    console.log("entro curso")
    confirmAddSubjectPressed = false;
  
  // Aquí ponés la acción que querés realizar
}

});


// Cerrar overlay
document.getElementById("closeCourseOverlay").addEventListener("click", () => {
  document.getElementById("courseOverlay").classList.add("d-none");
});


// ===================== Eliminar usuario de curso =====================
document.getElementById("courseUsersList").addEventListener("click", async (e) => {
  const link = e.target.closest(".removeUserFromCourse");
  if (!link) return;

  e.preventDefault(); // ⬅️ importante con <a>

  const userId = link.dataset.userId;
  const courseId = selectedCourseId;
  console.log("courseId: ",courseId)
  console.log("userId: ",userId)
  // Confirmación moderna
  const result = await uiConfirm({
    title: "Quitar usuario",
    text: "¿Quitar usuario del curso?",
    confirmText: "Sí, quitar"
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`${API_URL}/api/course/${courseId}/users/${userId}/rollback`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("No se pudo quitar el usuario");

    await loadCourseUsersInfo(courseId);

    // ✅ Mensaje de éxito
    uiToast("Usuario quitado del curso", "success");

  } catch (err) {
    console.error("Error quitando usuario del curso:", err);

    // ⚠️ Mensaje de error moderno
    uiToast("Error al quitar usuario", "error");
  }
});


// ===================== Eliminar alumno de curso =====================

document.getElementById("courseStudentsList").addEventListener("click", async (e) => {
  const link = e.target.closest(".rollbackStudentFromCourse");
  if (!link) return;

  e.preventDefault();

  const studentId = link.dataset.studentId;
  const courseId = selectedCourseId;

  // Confirmación moderna
  const result = await uiConfirm({
    title: "Eliminar alumno",
    text: "¿Eliminar este alumno del curso?",
    confirmText: "Sí, eliminar"
  });

  if (!result.isConfirmed) return;

  try {
    await fetch(`${API_URL}/api/course/${courseId}/students/${studentId}/rollback`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    await loadCourseStudentsInfo(courseId);

    // Mensaje de éxito
    uiToast("Alumno eliminado correctamente del curso", "success");

  } catch (err) {
    console.error("Error eliminando alumno:", err);

    // Mensaje de error moderno
    uiToast("No se pudo eliminar el alumno", "error");
  }
});


// ===================== Eliminar alumno Recursante del curso =====================

// Delegación de eventos para los botones de eliminar recursante
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-remove-recourse");
  if (!btn) return;

  e.preventDefault();

  // 🔹 Tomamos el ID del estudiante recursante
  const studentRecourseAssignmentId = btn.dataset.id;

  if (!studentRecourseAssignmentId) {
    uiToast("ID del recursante no encontrado", "error");
    return;
  }

  // 🔹 Confirmación antes de eliminar
  const confirmDelete = confirm(
    "¿Estás seguro que querés eliminar este recursante? Esta acción es irreversible."
  );

  if (!confirmDelete) return;

  try {
    const res = await fetch(
      `${API_URL}/api/studentRecourseAssignment/recourse/students/${studentRecourseAssignmentId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Error eliminando recursante");
    }

    // 🔹 Mensaje de éxito
    uiToast(data.message || "Recursante eliminado correctamente", "success");

    // 🔹 Opcional: eliminar la fila de la tabla directamente
    const row = btn.closest("tr");
    if (row) row.remove();

  } catch (err) {
    console.error(err);
    uiToast(err.message || "Error eliminando recursante", "error");
  }
});



// ===================== Eliminar materia de curso =====================

document.getElementById("courseSubjectsList").addEventListener("click", async (e) => {
  const btn = e.target.closest(".removeSubjectFromCourse");
  if (!btn) return;

  e.preventDefault();

  const subjectId = btn.dataset.subjectId;
  const courseId = selectedCourseId;

  // Confirmación moderna
  const result = await uiConfirm({
    title: "Quitar materia",
    text: "¿Quitar esta materia del curso?",
    confirmText: "Sí, quitar"
  });

  if (!result.isConfirmed) return;

  try {
    await fetch(`${API_URL}/api/course/${courseId}/subjects/${subjectId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    await loadCourseSubjectsInfo(courseId);

    // Mensaje de éxito
    uiToast("Materia quitada del curso", "success");

  } catch (err) {
    console.error("Error quitando materia:", err);

    // Mensaje de error moderno
    uiToast("No se pudo quitar la materia", "error");
  }
});

// ===================== Funcion  para ordenar Alfabeticamente =====================
function sortUsers(users, { by = "apellido", locale = "es" } = {}) {
  return [...users].sort((a, b) => {
    const valA = a.user?.[by] || "";
    const valB = b.user?.[by] || "";
    return valA.localeCompare(valB, locale);
  });
}



// =============================
// 🟢 INICIALIZAR 
// =============================

document.addEventListener("DOMContentLoaded", () => {
  loadCourses();
});
