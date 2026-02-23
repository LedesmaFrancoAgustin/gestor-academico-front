// =============================
// 🟢 Referencias al DOM
// =============================
const searchInput = document.getElementById("searchStudent");
const academicYearSelect = document.getElementById("academicYearSelect");
const courseSelect = document.getElementById("courseSelect");
const termSelect = document.getElementById("termSelect");

const gradesTableBody = document.getElementById("gradesTableBody");

const btnReload = document.getElementById("btnReloadGrades");

let gradesData = []; // arreglo vacío inicial
let studentIds = [];
let courses = [];


let  subjects = [];

let selectedYear = null;
let selectedCourseId = null;

let courseInfo = null;
let recusantStudent = null
let gradeInfo = null;

let studentsByGrade = null // alumnos mapeados con la notas (Regulares y recursantes)
let allStudents = []; // Copia para usar con el buscador

let selectedFilterGrades = "firstTerm.partial"



// =============================
// 🟢 Event listeners
// =============================

// =============================
//  Selector del año
// =============================
academicYearSelect.addEventListener("change", async () => {
    selectedYear = academicYearSelect.value;
    console.log("Año seleccionado:", selectedYear);

    // Traer cursos del año
    const courses = await fetchAttendanceForYear(selectedYear);

   // console.log(" courses:", courses);
    // Limpiar el select de cursos antes de agregar
    courseSelect.innerHTML = '<option value="" selected disabled> Seleccione un curso </option>';

    if (courses.length === 0) {
        uiToast("Todavía no hay cursos disponibles para este año", "info");
        courseSelect.disabled = true; // Deshabilitar si no hay cursos
        return;
    }

    // Agregar cursos al select
    courses.forEach(course => {
        const option = document.createElement("option");
        option.value = course._id;   // valor que se enviará al backend
        option.textContent = course.name; // lo que ve el usuario
        courseSelect.appendChild(option);
    });

    // Habilitar select de cursos
    courseSelect.disabled = false;
});

// Cambiar curso
courseSelect.addEventListener("change", async () => {
  selectedCourseId = courseSelect.value;
  if (!selectedCourseId) return;
 
  courseInfo = await fetchSubjectAndStudentsFromCourse(selectedCourseId);

  recusantStudent = await fetchGetRecourseFromCourse(selectedCourseId)

  gradeInfo = await fetchGradesForCourse(selectedCourseId,selectedYear)

  studentsByGrade = mappedStudentsByGrade(courseInfo, recusantStudent, gradeInfo );
  
  //console.log("courseInfo ",courseInfo)
  //console.log("recusantStudent ",recusantStudent)
  //console.log("gradeInfo ",gradeInfo)
  //console.log("mappedStudentsByGrade ",studentsByGrade)
  
 
  
  termSelect.disabled = false;
});

// Cambiar Tipo de nota
termSelect.addEventListener("change", async (e) => {
  selectedFilterGrades = e.target.value;
  if (!selectedCourseId) return;

  allStudents = [...studentsByGrade];
  renderGradesByCourse(studentsByGrade)
  
});

// Escuchar Input de notas
document.addEventListener("change", async (e) => {
  if (!e.target.classList.contains("grade-input")) return;

  const input = e.target;
  const rawValue = input.value.trim();

  input.classList.remove("grade-low", "grade-mid", "grade-high");

  let value = null;

  // ============================
  // 1️⃣ Si está vacío → borrar nota
  // ============================
  if (rawValue === "") {
    value = null;
  } else {
    value = Number(rawValue);

    if (isNaN(value) || value < 1 || value > 10) {
      uiToast("La nota debe estar entre 1 y 10", "warning");
      return;
    }

    if (value <= 4) input.classList.add("grade-low");
    else if (value <= 6) input.classList.add("grade-mid");
    else input.classList.add("grade-high");
  }

  try {
    input.disabled = true;

    await fetchPostGrade({
      studentId: input.dataset.student,
      subjectId: input.dataset.subject,
      courseId: selectedCourseId,
      academicYear: selectedYear,
      term: selectedFilterGrades,
      value // 🔥 ahora puede ser null
    });

    updateLocalGrade({
      studentId: input.dataset.student,
      subjectId: input.dataset.subject,
      term: selectedFilterGrades,
      value
    });

    uiToast(value === null ? "Nota eliminada" : "Nota guardada", "success");

  } catch (err) {
    uiToast("Error al guardar nota", "error");
  } finally {
    input.disabled = false;
  }
});

// Input Buscador por Nombre o Dni
searchInput.addEventListener("input", () => {
  const searchTerm = searchInput.value.trim().toLowerCase();

  if (!searchTerm) {
    renderGradesByCourse(allStudents);
    return;
  }

  const filteredStudents = allStudents.filter(student => {

    const fullName =
      `${student.studentNombre} ${student.studentApellido}`.toLowerCase();

    const dni = student.studentDni?.toString() || "";

    return (
      fullName.includes(searchTerm) ||
      dni.includes(searchTerm)
    );
  });

  renderGradesByCourse(filteredStudents);
});
// ====================================================================================================
//  🟢 Render
// ====================================================================================================
function renderGradesByCourse(students) {
  const table = document.getElementById("gradesTable");
  table.innerHTML = "";

  if (!students || !students.length) return;
  if (!selectedFilterGrades || selectedFilterGrades === "select") return;

  // 🔹 Ordenar alumnos por apellido
  students.sort((a, b) =>
    a.studentApellido.localeCompare(b.studentApellido)
  );

  // 🔹 Tomamos materias del primer alumno
  const subjects = students[0].grades;

  // =========================
  // 🧱 CREAR THEAD
  // =========================
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  headerRow.innerHTML = `
    <th>#</th>
    <th>Alumno</th>
    <th>DNI</th>
  `;

  subjects.forEach(subj => {
    headerRow.innerHTML += `
      <th class="subject-col">
        <div class="vertical-header">
          ${subj.subjectName}
        </div>
      </th>
    `;
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // =========================
  // 📦 CREAR TBODY
  // =========================
  const tbody = document.createElement("tbody");

  students.forEach((student, index) => {

    const row = document.createElement("tr");

    // 🔴 Marcar recursantes
    if (student.isRepeating) {
      row.classList.add("repeating-row");
    }

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        ${student.studentApellido}, ${student.studentNombre}
        ${student.isRepeating ? '<span class="badge bg-danger ms-1">Rec.</span>' : ''}
      </td>
      <td>${student.studentDni}</td>
    `;

    student.grades.forEach(subj => {

      const gradeValue = getGradeValue(subj.grades, selectedFilterGrades);
      const gradeClass = getGradeClass(gradeValue);

      row.innerHTML += `
        <td class="subject-col">
          <input 
            type="number"
            min="1"
            max="10"
            step="1"
            class="form-control form-control-sm text-center grade-input ${gradeClass}"
            data-student="${student.studentId}"
            data-subject="${subj.subjectId}"
            value="${gradeValue ?? ""}"
          >
        </td>
      `;
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
}
// ====================================================================================================
//  🟢 Funciones 
// ====================================================================================================
/**
 * Mapea estudiantes de un curso con sus materias y notas
 * @param {Object} courseInfo - Información del curso (students y subjects)
 * @param {Array} gradeInfo - Array de notas por estudiante y materia
 * @returns {Array} - Array de estudiantes con sus materias y notas
 */
function mappedStudentsByGrade(courseInfo, recourseStudents = [], gradeInfo = []) {
  if (!courseInfo?.data) return [];

  console.log("Entro")
  const students = courseInfo.data.students.filter(s => s.active);
  const subjects = courseInfo.data.subjects;

  // 🔹 Map rápido para notas
  const gradeMap = new Map();
  gradeInfo.forEach(g => {
    const key = `${g.studentId}_${g.subjectId}`;
    gradeMap.set(key, g);
  });

  // 🔹 IDs de alumnos regulares
  const courseStudentIds = new Set(
    students.map(s => s.student._id)
  );

  // ============================
  // 1️⃣ ALUMNOS REGULARES
  // ============================
  const mappedRegularStudents = students.map(studentEntry => {
    const student = studentEntry.student;

    const gradesBySubject = subjects.map(subjEntry => {
      const subj = subjEntry.subject;
      const key = `${student._id}_${subj._id}`;
      const gradeObj = gradeMap.get(key);

      return {
        subjectId: subj._id,
        subjectName: subj.name,
        grades: gradeObj?.grades ?? null,
        isRepeating: false
      };
    });

    return {
      studentId: student._id,
      studentNombre: student.nombre,
      studentApellido: student.apellido,
      studentDni: student.dni,
      isRepeating: false,
      grades: gradesBySubject
    };
  });

  // ============================
  // 2️⃣ ALUMNOS RECURSANTES
  // ============================
  const mappedRecourseStudents = [];

  recourseStudents.forEach(r => {

    const studentId = r.studentId;

    // ⚠ Evitar duplicar si ya está como regular
    if (courseStudentIds.has(studentId)) return;

    // ⚠ Evitar duplicados internos
    if (mappedRecourseStudents.some(s => s.studentId === studentId)) return;

    const gradesBySubject = subjects.map(subjEntry => {
      const subj = subjEntry.subject;
      const key = `${studentId}_${subj._id}`;
      const gradeObj = gradeMap.get(key);

      return {
        subjectId: subj._id,
        subjectName: subj.name,
        grades: gradeObj?.grades ?? null,
        isRepeating: true
      };
    });

    mappedRecourseStudents.push({
      studentId,
      studentNombre: r.studentName,
      studentApellido: r.studentLastName, // ⚠ si no viene separado
      studentDni: r.dni,
      isRepeating: true,
      grades: gradesBySubject
    });
  });

  // ============================
  // 3️⃣ UNIFICAR
  // ============================
  return [...mappedRegularStudents, ...mappedRecourseStudents];
}
//* Actualizar Mapeo estudiantes de un curso con sus materias y notas
function updateLocalGrade({
  studentId,
  subjectId,
  term,
  value
}) {
  const student = studentsByGrade.find(s => s.studentId === studentId);
  if (!student) return;

  const subject = student.grades.find(g => g.subjectId === subjectId);
  if (!subject) return;

  if (!subject.grades) subject.grades = {};

  // 🔹 Manejar nested (firstTerm.partial)
  const pathParts = term.split(".");

  if (pathParts.length === 2) {
    const [period, evalType] = pathParts;

    if (!subject.grades[period]) {
      subject.grades[period] = {};
    }

    if (!subject.grades[period][evalType]) {
      subject.grades[period][evalType] = {};
    }

    subject.grades[period][evalType].value = value;

  } else {
    // december, february, recuperatoryFirstTerm
    if (!subject.grades[term]) {
      subject.grades[term] = {};
    }

    subject.grades[term].value = value;
  }
}
// obtener valor dinámico - Esta función interpreta el string tipo "firstTerm.partial"
function getGradeValue(gradesObj, path) {
  if (!gradesObj || !path) return null;

  const keys = path.split(".");
  let result = gradesObj;

  for (let key of keys) {
    if (!result[key]) return null;
    result = result[key];
  }

  return result.value ?? null;
}
//Asignar clases a los inpout de las notas
function getGradeClass(value) {
  if (value === null || value === undefined || value === "") return "";

  const num = Number(value);

  if (num >= 1 && num <= 4) return "grade-low";
  if (num >= 5 && num <= 6) return "grade-mid";
  if (num >= 7 && num <= 10) return "grade-high";

  return "";
}
// ====================================================================================================
//  🟢 Fetch 
// ====================================================================================================

// =============================
//  🟢 Fetch Buscar cursos 
// =============================
async function fetchAttendanceForYear(Year) {
  try {
    const res = await fetch(
      `${API_URL}/api/course/${Year}/year`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res.ok) {
      console.error("Error al traer los cursos:", res.status, res.statusText);
      return {}; // devolvemos un objeto vacío
    }

    const data = await res.json();

    return data.data;

  } catch (error) {
    console.error("Error al traer los cursos:", error);
    uiToast("Error al conectar con el servidor para traer los curso","error");
    return {}; // devolvemos un objeto vacío
  }
}
// =============================
// 🟢 Fetch para traer materias del curso
// =============================
async function fetchSubjectAndStudentsFromCourse(courseId) {
  if (!courseId) {
    console.warn("No se proporcionó courseId");
    return [];
  }

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/course/${courseId}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) throw new Error("Error al cargar el curso");

    
    const resData = await res.json();
    return resData || []; // devolvemos solo el array de materias

  } catch (error) {
    console.error("Error al cargar curso:", error);
    return [];
  }
}
// =============================
// 🟢 Fetch de notas de un curso 
// =============================
async function fetchGradesForCourse(courseId,academicYear) {
  try {
    const res = await fetch(
      `${API_URL}/api/grade/course/${courseId}?academicYear=${academicYear}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res.ok) {
      console.error("Error al traer las notas:", res.status, res.statusText);
      uiToast("Error al traer las notas del curso");
      return [];
    }

    const data = await res.json();
    return data.data || [];

  } catch (error) {
    console.error("Error al traer notas:", error);
    uiToast("Error al conectar con el servidor para traer notas");
    return [];
  }
}
// =============================
// 🟢  Fetch para obtener Notas desde API
// =============================
async function fetchPostGrade({
  studentId,
  subjectId,
  courseId,
  academicYear,   // 👈 AGREGAR
  term,
  value
}) {
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
      academicYear,  // 👈 NECESARIO
      term,
      value
    })
  });
}

// =============================
// 🟢 Fetch Recursantes del curso
// =============================
async function fetchGetRecourseFromCourse(courseId) {
  try {
    const res = await fetch(
      `${API_URL}/api/studentRecourseAssignment/recourse/${courseId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Error al traer recursantes:", res.status, errorText);
      uiToast("Error al traer recursantes del curso", "error");
      return [];
    }

    const json = await res.json();

    // 🔹 Soporta ambas respuestas (directa o envuelta en data)
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.data)) return json.data;

    return [];

  } catch (error) {
    console.error("Error de conexión:", error);
    uiToast("Error al conectar con el servidor", "error");
    return [];
  }
}