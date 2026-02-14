// =============================
// 🟢 Referencias al DOM



// =============================
const gradesTableBody = document.getElementById("gradesTableBody");
const searchInput = document.getElementById("searchStudent");
const courseSelect = document.getElementById("courseSelect");
const termSelect = document.getElementById("termSelect");
const btnReload = document.getElementById("btnReloadGrades");

let gradesData = []; // arreglo vacío inicial
let studentIds = [];
let courses = [];

let  subjects = [];

let selectedCourseId = "";
let selectedFilterGrades = "firstTerm"


// =============================
// 🟢 Event listeners
// =============================
searchInput.addEventListener("input", () => {
  if (!selectedCourseId) return;
  loadStudentsAndGrades(selectedCourseId);
});


termSelect.addEventListener("change", async (e) => {
  selectedFilterGrades = e.target.value;
  if (!selectedCourseId) return;
  await loadStudentsAndGrades(selectedCourseId);
});

btnReload.addEventListener("click", () => {
  // Recargar datos desde API
  fetchGradesFromAPI();
});
// Cambiar curso
courseSelect.addEventListener("change", async () => {
  selectedCourseId = courseSelect.value;
  if (!selectedCourseId) return;

  await updateTableHeaders(selectedCourseId); // columna materias
  await loadStudentsAndGrades(selectedCourseId); // alumnos + notas
});

// =============================
// 👆 Listener delegado para inputs de notas
// =============================
gradesTableBody.addEventListener("focusin", (e) => {
  const input = e.target.closest(".grade-input");
  if (!input) return;

  const tr = input.closest("tr");
  if (tr) tr.classList.add("resaltado");

  const nombreTd = tr?.querySelector("td:nth-child(2)"); // segunda columna
  if (nombreTd) nombreTd.classList.add("resaltado-nombre");
});

gradesTableBody.addEventListener("focusout", (e) => {
  const input = e.target.closest(".grade-input");
  if (!input) return;

  const tr = input.closest("tr");
  if (tr) tr.classList.remove("resaltado");

  const nombreTd = tr?.querySelector("td:nth-child(2)");
  if (nombreTd) nombreTd.classList.remove("resaltado-nombre");
});


gradesTableBody.addEventListener("change", async (e) => {
  const input = e.target.closest(".grade-input");
  if (!input) return;

  const value = Number(input.value);

  if (value < 1 || value > 10) {
    uiToast("La nota debe estar entre 1 y 10", "warning");
    return;
  }

  try {
    await fetchPostGrade({
      studentId: input.dataset.studentId,
      subjectId: input.dataset.subjectId,
      courseId: selectedCourseId,
      term: selectedFilterGrades, // 👈 clave
      value
    });

    uiToast("Nota guardada", "success");
  } catch {
    uiToast("Error al guardar nota", "error");
  }
});


// =============================
// 🟢 Llenar el select con cursos obtenidos desde API
// =============================
async function fillCourseSelect() {
    courses = await fetchCourseFromAPI();

  // Llenar el select
  courseSelect.innerHTML = '<option value="">Todos los cursos</option>';
  courses.forEach(c => {
    const option = document.createElement("option");
    option.value = c._id; // o c.id según tu modelo
    option.textContent = c.name;
    courseSelect.appendChild(option);
  });

  return ; // opcional, si querés usarlo después
}

// =============================
// 🟢 Función para filtrar estudiantes por búsqueda
// =============================
function filterStudents(students, searchText) {
  if (!Array.isArray(students)) return [];

  if (!searchText) return students;

  const lowerSearch = searchText.trim().toLowerCase();

  return students.filter(s =>
    s.nombre?.toLowerCase().includes(lowerSearch) ||
    s.apellido?.toLowerCase().includes(lowerSearch) ||
    s.dni?.toString().includes(lowerSearch)
  );
}


// =============================
// 🟢 Función para cargar estudiantes + notas de un curso
// =============================
async function loadStudentsAndGrades(courseId) {
  if (!courseId) return;

  const course = courses.find(c => c._id === courseId);
  if (!course) return;

  const studentIds = course.students.map(s => s.student);

  // Traer estudiantes
  const students = await fetchUsersByIdsAndRoles({
    ids: studentIds,
    roles: ["alumno"]
  });

  // Traer notas
  const gradesMap = await fetchGradesForCourse(courseId);

  // Filtrar según búsqueda
  const filteredStudents = filterStudents(students, searchInput.value);

  // Renderizar
  renderGradesByCourse(filteredStudents, gradesMap);
}
// =============================
// 🟢 Fetch de notas de un curso + trimestre (con try/catch)
// =============================
async function fetchGradesForCourse(courseId) {
  try {
    const res = await fetch(
      `${API_URL}/api/grade/course/${courseId}?term=${selectedFilterGrades}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res.ok) {
      console.error("Error al traer las notas:", res.status, res.statusText);
      uiToast("Error al traer las notas del curso");
      return {}; // devolvemos un objeto vacío
    }

    const data = await res.json();
    const gradesArray = data.data || [];

    // Map para acceso rápido: gradesMap[studentId][subjectId] = value
    const gradesMap = {};
    gradesArray.forEach(g => {
      if (!gradesMap[g.studentId]) gradesMap[g.studentId] = {};
      gradesMap[g.studentId][g.subjectId] = g.value;
    });

    return gradesMap;

  } catch (error) {
    console.error("Error al traer notas:", error);
    uiToast("Error al conectar con el servidor para traer notas");
    return {}; // devolvemos un objeto vacío
  }
}

// =============================
// 🟢  Fetch para obtener Notas desde API
// =============================
async function fetchPostGrade({ studentId, subjectId, courseId, term, value }) {
  return fetch(`${API_URL}/api/grade/register/individualNote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      studentId,
      subjectId,
      courseId,
      term,
      value
    })
  });
}
// =============================
// 🟢  Fetch para obtener cursos activos desde API
// =============================
async function fetchCourseFromAPI() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/course/active`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Error al cargar los cursos");

    const resData = await res.json();
    return resData.data.data || []; // devolvemos solo el array de cursos
   

  } catch (error) {
    console.error("Error al cargar cursos:", error);
    return [];
  }
}

// =============================
// 🟢 Fetch para obtener usuarios por IDs y roles
// =============================
async function fetchUsersByIdsAndRoles({ ids = [], roles = [], q = "", limit = 50, page = 1 }) {
  try {
    if (!ids || ids.length === 0) return [];

    const token = localStorage.getItem("token");

    // 🔹 Construir query params para q, limit, page
    const params = new URLSearchParams({ q, limit, page });

    // 🔹 POST al endpoint
    const res = await fetch(`${API_URL}/api/users/search/ids?${params.toString()}`, {
      method: "POST", // ✅ Debe ser POST para enviar body
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ ids, roles }) // ✅ enviar arrays grandes en el body
    });

    if (!res.ok) throw new Error(`Error al obtener usuarios: ${res.status}`);

    const resData = await res.json();
    return resData.data || [];

  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return [];
  }
}


// =============================
// 🟢 Fetch para traer materias del curso
// =============================
async function fetchSubjectFromCourse(courseId) {
  if (!courseId) {
    console.warn("No se proporcionó courseId");
    return [];
  }

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/course/${courseId}/subjects`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) throw new Error("Error al cargar las materias");

    
    const resData = await res.json();
    console.log("resData: ",resData)
    return resData.data || []; // devolvemos solo el array de materias

  } catch (error) {
    console.error("Error al cargar materias:", error);
    return [];
  }
}

// =============================
// 🟢 Función para actualizar las columnas según las materias
// =============================
async function updateTableHeaders(courseId) {
  subjects = await fetchSubjectFromCourse(courseId);
  console.log("subjects: ",subjects)
  // Primeras columnas fijas
  let headerHTML = `
    <tr>
      <th>#</th>
      <th>Usuario</th>
      <th>DNI</th>
  `;

subjects.forEach(sub => {
  headerHTML += `
    <th
      class="vertical-text"
      data-subject-id="${sub.subject?._id || ""}">
      ${sub.subject?.name || "-"}
    </th>
  `;
});
  // Si quieres que siempre haya al menos 4 columnas de materias
  for (let i = subjects.length; i < 4; i++) {
    headerHTML += `<th>-</th>`;
  }

  headerHTML += `</tr>`;

  // Reemplazamos el thead
  gradesTable.querySelector("thead").innerHTML = headerHTML;
}

// =============================
// 🟢 Función para renderizar tabla de notas
// =============================
function renderGradesByCourse(students, gradesMap) {
  gradesTableBody.innerHTML = "";

  // Tomar materias del header
  const subjectIds = Array.from(
    gradesTable.querySelectorAll("thead th[data-subject-id]")
  ).map(th => th.dataset.subjectId);

  students.forEach((student, index) => {
    let gradesHTML = "";

    subjectIds.forEach(subjectId => {
      const value = gradesMap?.[student._id]?.[subjectId] ?? "";

      // Asignar clase según valor
      let gradeClass = "";
      if (value >= 1 && value <= 4) gradeClass = "grade-red";
      else if (value >= 5 && value <= 6) gradeClass = "grade-yellow";
      else if (value >= 7) gradeClass = "grade-green";

      gradesHTML += `
        <td>
          <input
            type="number"
            min="1"
            max="10"
            class="form-control form-control-sm grade-input ${gradeClass}"
            data-student-id="${student._id}"
            data-subject-id="${subjectId}"
            value="${value}"
            style="text-align:center;"
          />
        </td>
      `;
    });

    gradesTableBody.insertAdjacentHTML(
      "beforeend",
      `
      <tr>
        <td>${index + 1}</td>
        <td>${student.apellido} ${student.nombre}</td>
        <td>${student.dni}</td>
        ${gradesHTML}
      </tr>
      `
    );
  });
}

function getGradeForSubject(grades = [], subjectId) {
  if (!grades || !subjectId) return "";

  const grade = grades.find(
    g => g.subject?._id === subjectId || g.subject === subjectId
  );

  return grade?.value ?? "";
}


// =============================
// 🟢  Funcion  para ordenar Alfabeticamente 
// =============================

function sortUsers(users, { by = "apellido", locale = "es" } = {}) {
  return [...users].sort((a, b) => {
    const valA = a.user?.[by] || "";
    const valB = b.user?.[by] || "";
    return valA.localeCompare(valB, locale);
  });
}


// =============================
// 🟢 Inicialización
// =============================
function initGrade() {
    fillCourseSelect();
  }

initGrade()
