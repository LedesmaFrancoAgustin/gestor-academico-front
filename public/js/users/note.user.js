const academicYearSelect = document.getElementById("academicYearSelect");
const courseSelect = document.getElementById("courseSelect"); // Selector de curso
const subjectSelect = document.getElementById("subjectSelect");/// Selector de Materia
const gradeTypeSelect = document.getElementById("gradeTypeSelect");/// Selector de Notas

const user = JSON.parse(localStorage.getItem("user"));; // 🔥 Perfil del docente

const badgeLabel = document.getElementById("labelAcademicCalendar");  // Label de fechas academicas

// Orden académico de las notas
const GRADE_ORDER = [
  "firstTerm.partial",
  "firstTerm.final",
  "secondTerm.partial",
  "secondTerm.final",
  "recuperatoryFirstTerm",
  "december",
  "february"
];

const TERM_CUT_MAP = {
  firstTerm: "firstTermFinal",
  secondTerm: "secondTermFinal",
  recuperatoryFirstTerm: "recuperatory",
  december: "december",
  february: "february",
  all: null
};



// Estado actual de la vista
let selectedGradeType = "firstTerm";
let selectedCourseId = null;
let selectedSubjectId = null;
let academicYear = null;

let configAcademicCalendar = []    //Datos de calendario academico 
let regularStudent = []    //Datos de alumnos regular
let repeatingStudents = [] //Datos de alumnos recursante

let cachedGrades = [];   //Notas de estudiantes

let studentsWithGrades= [];; // Estudiantes con notas

let gradesDraft = {};

// ==========================================================================================================================
// 🟢 Eventos
// ==========================================================================================================================
// =============================
//  Selector del año
// =============================
academicYearSelect.addEventListener("change", async (e) => {
  academicYear = academicYearSelect.value;
  //console.log("Año seleccionado:", academicYear);

  const courses = await fetchMyCoursesByYear(academicYear);
  //console.log("Courses:", courses);

  courseSelect.innerHTML =
    '<option value="" selected disabled>Seleccione un curso</option>';

  if (!courses.length) {
    uiToast("Todavía no hay cursos disponibles para este año", "info");
    courseSelect.disabled = true;
    return;
  }

  courses.forEach(course => {
    const option = document.createElement("option");
    option.value = course._id;
    option.textContent = course.name;
    courseSelect.appendChild(option);
  });

  configAcademicCalendar = await fetchGetAcademicYearPeriodConfig(academicYear)
  console.log("configAcademicCalendar: ",configAcademicCalendar)
  updateAcademicCalendarLabel(selectedGradeType)

    if (e.target.value) {
    badgeLabel.classList.remove("hidden");
  } else {
    badgeLabel.classList.add("hidden");
  }

  courseSelect.disabled = false;
});
/* =========================
   Selector del curso
========================= */
courseSelect.addEventListener("change", async (e) => {
  selectedCourseId = e.target.value;

  subjectSelect.innerHTML = `<option value="">Seleccionar materia</option>`;
  subjectSelect.disabled = true;

  if (!selectedCourseId) return;
  currentSubjectList = await fetchMySubjectsByCourse(selectedCourseId)

   if (currentSubjectList.length === 0) {
    uiToast("No tenés materias asignadas en este curso","info");
    return;
  }

   currentSubjectList.forEach(subj => {
    const option = document.createElement("option");
    option.value = subj._id ?? subj; // por si viene solo el id
    option.textContent = subj.name ?? "Materia";
    subjectSelect.appendChild(option);
  });

  subjectSelect.disabled = false;

  //cachedGrades = await fetchGradesForCourse(courseId,subjectId);
  //renderCurrentView();
});
/* =========================
   Selector de Materia
========================= */
subjectSelect.addEventListener("change", async (e) => {
  selectedSubjectId = e.target.value;
  if (!selectedSubjectId || !selectedCourseId) return;

  regularStudent = await fetchStudentsFromCourse(selectedCourseId);

  repeatingStudents = await fetchRepeatingStudents({
    teacherId: user.id,
    subjectId: selectedSubjectId ,
    academicYear
  });

  if(regularStudent.length > 1 || repeatingStudents.length > 1 )
   cachedGrades = await fetchGradesForCourse(selectedCourseId,selectedSubjectId,academicYear);

  //console.log("regularStudent: ",regularStudent)
  //console.log("repeatingStudents: ",repeatingStudents)
  //console.log("cachedGrades ready to render:", cachedGrades);
  
  // 🔹 Merge todo en un solo array listo para render
  studentsWithGrades = mergeGrades(regularStudent, repeatingStudents, cachedGrades);


  console.log("Students ready to render:", studentsWithGrades);
  //console.log("regularStudent: ",regularStudent)
  //console.log("repeatingStudents: ",repeatingStudents)
  //console.log("CachedGrades: ",CachedGrades)
  renderCurrentView();
  
});

/* =========================
   Selector de nota
========================= */
gradeTypeSelect.addEventListener("change", (e) => {
  selectedGradeType = e.target.value;
  if (!courseSelect || cachedGrades === null) return;

  renderCurrentView();
  //lockTermsBySelectedTerm(selectedGradeType);
  updateAcademicCalendarLabel(selectedGradeType)
});
/* =========================
   Que cambie el color mientras escribe
========================= */
document.addEventListener("input", (e) => {
  if (!e.target.classList.contains("grade-input")) return;

  const input = e.target;

  // remover clases anteriores
  input.classList.remove("low", "mid", "high");

  const newClass = getGradeColorClass(input.value);

  if (newClass) {
    input.classList.add(newClass);
  }
});

/* =========================
   Boton de Guardar Nota
========================= */
document.getElementById("saveGradesBtn").addEventListener("click", async () => {
 
  await saveAllGrades();
  // 🔹 Aquí harías el POST al backend
  // await fetch(`${API_URL}/api/course/${courseId}/grades`, { method: "POST", body: JSON.stringify(grades) })
});

// ==========================================================================================================================
// 🟢 Render
// ==========================================================================================================================
/* =========================
   Función principal: cargar notas según pantalla
========================= */
function renderCurrentView() {
  const isDesktop = window.innerWidth > 768;

  if (isDesktop) {
    renderGradesDesktop(studentsWithGrades);
    //console.log("studentsWithGrades: ",studentsWithGrades)
  } else {
    renderGradesMobile(studentsWithGrades);
  }
}
/* =========================
   Render Desktop
========================= */
function renderGradesDesktop(students = []) { // 🔹 default a arreglo vacío
  const gradesContainer = document.getElementById("gradesContainer");
  gradesContainer.innerHTML = "";

  const container = document.getElementById("gradesRecursiveContainer");
  container.innerHTML = "";
  if (!students || students.length === 0) {
    gradesContainer.innerHTML = "<p>No hay alumnos para mostrar.</p>";
    return;
  }

  const regularStudents = students.filter(s => !s.isRepeating);
  const repeatingStudents = students.filter(s => s.isRepeating);

  renderRegularTable(regularStudents);
  renderRepeatingTable(repeatingStudents);
}
function renderRegularTable(students) {
  const gradesContainer = document.getElementById("gradesContainer");
  if (students.length === 0) return;

  const table = document.createElement("table");
  table.className = "grades-table";

  const { columns: gradeColumns, active } = getGradeColumns();

  const hasFirstTerm = gradeColumns.some(g =>
    g.path.startsWith("firstTerm")
  );

  const hasSecondTerm = gradeColumns.some(g =>
    g.path.startsWith("secondTerm")
  );

  table.innerHTML = `
    <thead>
      <tr>
        <th rowspan="2">#</th>
        <th rowspan="2">Alumno</th>
        <th rowspan="2">DNI</th>

        ${hasFirstTerm ? `<th colspan="2">1° Cuatrimestre</th>` : ""}
        ${hasSecondTerm ? `<th colspan="2">2° Cuatrimestre</th>` : ""}

        ${gradeColumns.some(g => g.path  === "recuperatoryFirstTerm") ? `<th rowspan="2">Recuperatorio 1°C</th>` : ""}
        ${gradeColumns.some(g => g.path  === "december") ? `<th rowspan="2">Diciembre</th>` : ""}
        ${gradeColumns.some(g => g.path  === "february") ? `<th rowspan="2">Febrero</th>` : ""}
      </tr>

      <tr>
        ${hasFirstTerm ? `
          <th>Parcial</th>
          <th>Final</th>
        ` : ""}

        ${hasSecondTerm ? `
          <th>Parcial</th>
          <th>Final</th>
        ` : ""}
      </tr>
    </thead>
    <tbody>
      ${students.map((s, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${s.studentApellido} ${s.studentNombre}</td>
          <td>${s.studentDni}</td>

          ${gradeColumns.map(g => {
            const gradeObj = s.grades[g.path];
            const value = gradeObj?.value ?? null;
            const colorClass = getGradeColorClass(value);

            const [periodKey, evaluationType] = g.path.split(".");
            const isOpen = isEvaluationOpen(periodKey, evaluationType);

            const isViewOnly = active === "all";
            const isEditable = !isViewOnly && g.path === active && isOpen;

           let tooltipText = "";

            if (active === "all") {
              tooltipText = "Modo solo lectura";
            } else if (!isOpen) {
              tooltipText = "Fuera de fecha de carga";
            }

            const tooltipAttr = tooltipText 
              ? `data-tooltip="${tooltipText}"` 
              : '';

            return `
            <td>
              <div class="grade-wrapper" ${tooltipAttr}>
                <input 
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  class="grade-input ${colorClass} ${!isEditable ? "grade-disabled" : ""}"
                  data-student-id="${s.studentId}"
                  data-grade-type="${g.path}"
                  data-original="${value ?? ''}"
                  data-is-repeating="${s.isRepeating}"
                  value="${value ?? ''}"
                  placeholder="-"
                  ${!isEditable ? "disabled" : ""}
                >
              </div>
            </td>
          `;
          }).join("")}

        </tr>
      `).join("")}
    </tbody>
  `;


  gradesContainer.appendChild(table);
}

function renderRepeatingTable(students) {
  const container = document.getElementById("gradesRecursiveContainer");
  if (students.length === 0) return;

  const title = document.createElement("h3");
  title.textContent = "Alumnos Recursantes";
  container.appendChild(title);

  const table = document.createElement("table");
  table.className = "grades-table repeating-table";

  const { columns: gradeColumns, active } = getGradeColumns();

  const hasFirstTerm = gradeColumns.some(g =>
      g.path.startsWith("firstTerm")
    );

    const hasSecondTerm = gradeColumns.some(g =>
      g.path.startsWith("secondTerm")
    );

  table.innerHTML = `
    <thead>
      <tr>
        <th rowspan="2">#</th>
        <th rowspan="2">Alumno</th>
        <th rowspan="2">DNI</th>

        ${hasFirstTerm ? `<th colspan="2">1° Cuatrimestre</th>` : ""}
        ${hasSecondTerm ? `<th colspan="2">2° Cuatrimestre</th>` : ""}

        ${gradeColumns.some(g => g.path  === "recuperatoryFirstTerm") ? `<th rowspan="2">Recuperatorio 1°C</th>` : ""}
        ${gradeColumns.some(g => g.path  === "december") ? `<th rowspan="2">Diciembre</th>` : ""}
        ${gradeColumns.some(g => g.path  === "february") ? `<th rowspan="2">Febrero</th>` : ""}
      </tr>

      <tr>
        ${hasFirstTerm ? `
          <th>Parcial</th>
          <th>Final</th>
        ` : ""}

        ${hasSecondTerm ? `
          <th>Parcial</th>
          <th>Final</th>
        ` : ""}
      </tr>
    </thead>

    <tbody>
      ${students.map((s, i) => `
        <tr>
          <td>${i + 1}</td>

          <td>
            ${s.studentApellido} ${s.studentNombre}
            <span class="badge-rec">Recursante</span>
          </td>

          <td>${s.studentDni}</td>

          ${gradeColumns.map(g => {
            const gradeObj = s.grades[g.path];
            const value = gradeObj?.value ?? null;
            const colorClass = getGradeColorClass(value);
            
            const [periodKey, evaluationType] = g.path.split(".");
            const isOpen = isEvaluationOpen(periodKey, evaluationType);

            const isViewOnly = active === "all";
            const isEditable = !isViewOnly && g.path === active && isOpen;

            let tooltipText = "";

            if (active === "all") {
              tooltipText = "Modo solo lectura";
            } else if (!isOpen) {
              tooltipText = "Fuera de ventana de carga";
            }

            const tooltipAttr = tooltipText 
              ? `data-tooltip="${tooltipText}"` 
              : '';

            return `
              <td>
                <input 
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  class="grade-input ${colorClass} ${!isEditable ? "grade-disabled" : ""}"
                  data-student-id="${s.studentId}"
                  data-grade-type="${g.path}"
                  data-original="${value ?? ''}"
                  data-is-repeating="${s.isRepeating}"
                  value="${value ?? ''}"
                  placeholder="-"
                  ${tooltipAttr}
                  ${!isEditable ? "disabled" : ""}
                >
              </td>
            `;
          }).join("")}

        </tr>
      `).join("")}
    </tbody>
  `;

  container.appendChild(table);
}
/* =========================
   Render Mobile
========================= */
function renderGradesMobile(students = []) {
  const container = document.getElementById("gradesContainer");
  container.innerHTML = "";

  if (!students || students.length === 0) {
    container.innerHTML = "<p class='no-students'>No hay alumnos para mostrar.</p>";
    return;
  }

  const { columns: gradeColumns, active } = getGradeColumns();

  console.log("gradeColumns:", gradeColumns);

  function createCard(s, index) {

    const card = document.createElement("div");
    card.className = `grade-card pro-card ${s.isRepeating ? "repeating-card" : ""}`;

    card.innerHTML = `
      <div class="card-header compact">
        <div class="student-main">
          <span class="index-box">${index + 1}</span>
          <div>
            <div class="student-name">
              ${s.studentApellido} ${s.studentNombre}
              ${s.isRepeating ? `<span class="badge-rec">Recursante</span>` : ""}
            </div>
            <div class="student-dni">DNI: ${s.studentDni}</div>
          </div>
        </div>
      </div>

      <div class="card-body compact">
        ${gradeColumns.map(g => {

          const gradeObj = s.grades[g.path];
          const value = gradeObj?.value ?? null;
          const colorClass = getGradeColorClass(value);

          const [periodKey, evaluationType] = g.path.split(".");
          const isOpen = isEvaluationOpen(periodKey, evaluationType);

          const isViewOnly = active === "all";
          const isEditable = !isViewOnly && g.path === active && isOpen;

          let tooltipText = "";

          if (isViewOnly) {
            tooltipText = "Modo solo lectura";
          } else if (!isOpen) {
            tooltipText = "Fuera de fecha de carga";
          }

          const tooltipAttr = tooltipText
            ? `data-tooltip="${tooltipText}"`
            : "";

          return `
          <div class="grade-row compact">
            <span class="grade-label">${g.label}</span>

            <div class="grade-wrapper">
              <div class="input-group">

                ${
                  !isEditable && tooltipText
                    ? `<i class="lock-icon fa-solid fa-lock" data-tooltip="${tooltipText}"></i>`
                    : ""
                }

                <input
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  class="grade-input ${colorClass} ${!isEditable ? "grade-disabled" : ""}"
                  data-student-id="${s.studentId}"
                  data-grade-type="${g.path}"
                  data-original="${value ?? ''}"
                  data-is-repeating="${s.isRepeating}"
                  value="${value ?? ''}"
                  placeholder="-"
                  ${!isEditable ? "disabled" : ""}
                >

              </div>
            </div>
          </div>
        `;
        }).join("")}
      </div>
    `;

    return card;
  }

  students.forEach((s, i) => {
    container.appendChild(createCard(s, i));
  });
}
// ==========================================================================================================================
// 🟢 Funciones
// ==========================================================================================================================
//validar si está abierto -- Fecha validad para cargar nota
function isEvaluationOpen(periodKey, evaluationType) {
  if (!configAcademicCalendar?.periods) return false;

  const period = configAcademicCalendar.periods.find(p => p.key === periodKey);
  if (!period) return false;

  // Si está cerrado manualmente
  if (period.isManuallyClosed) return false;

  const evaluation = period.evaluations.find(e => e.type === evaluationType);
  if (!evaluation) return false;

  const now = new Date();
  const start = new Date(evaluation.gradingWindow.startDate);
  const end = new Date(evaluation.gradingWindow.endDate);

  return now >= start && now <= end;
}
function getNestedGradeValue(grades, path) {
  return path.split(".").reduce((acc, k) => acc?.[k], grades)?.value ?? null;
}
function getGradeColumns() {

  const selected = document.getElementById("gradeTypeSelect").value;

  if (selected === "all") {
    return {
      columns: GRADE_ORDER.map(pathToColumnObject),
      active: null
    };
  }

  const selectedIndex = GRADE_ORDER.indexOf(selected);
  if (selectedIndex === -1) return { columns: [], active: null };

  const allowed = GRADE_ORDER.slice(0, selectedIndex + 1);

  return {
    columns: allowed.map(pathToColumnObject),
    active: selected
  };
}
//Convertir path → objeto columna
function pathToColumnObject(path) {

  const keys = {
    "firstTerm.partial": "firstTermPartial",
    "firstTerm.final": "firstTermFinal",
    "secondTerm.partial": "secondTermPartial",
    "secondTerm.final": "secondTermFinal",
    "recuperatoryFirstTerm": "recuperatoryFirstTerm",
    "december": "december",
    "february": "february"
  };

  const labels = {
    "firstTerm.partial": "1°C - Parcial",
    "firstTerm.final": "1°C - Final",
    "secondTerm.partial": "2°C - Parcial",
    "secondTerm.final": "2°C - Final",
    "recuperatoryFirstTerm": "Recup. 1°C",
    "december": "Diciembre",
    "february": "Febrero"
  };

  return {
    path,                 // 🔥 no tocar
    key: keys[path],      // 🔥 no tocar
    label: labels[path]   // ✅ nuevo campo seguro
  };
}

//Función para bloquear según término
function lockTermsBySelectedTerm(selectedTerm) {

  const termOrder = [
    "firstTerm",
    "secondTerm",
    "recuperatory",
    "december",
    "february"
  ];

  const selectedIndex = termOrder.indexOf(selectedTerm);

  document.querySelectorAll(".grade-input").forEach(input => {

    const inputTerm = input.dataset.gradeType;
    const inputIndex = termOrder.indexOf(inputTerm);

    if (inputIndex !== selectedIndex) {
      input.disabled = true;
      input.classList.add("input-locked");
    } else {
      input.disabled = false;
      input.classList.remove("input-locked");
    }

  });

}

// ==============================
/**
 * Merge students with their grades
 * @param {Array} regularStudents - alumnos regulares
 * @param {Array} repeatingStudents - alumnos recursantes
 * @param {Array} cachedGrades - notas ya cargadas
 * @returns {Array} alumnos con sus notas y flag isRepeating
 */
function mergeGrades(regularStudents, repeatingStudents, cachedGrades) {

  const allStudents = [];

  // 🔹 Paths reales del schema actual
  const gradePaths = [
    "firstTerm.partial",
    "firstTerm.final",
    "secondTerm.partial",
    "secondTerm.final",
    "recuperatoryFirstTerm",
    "december",
    "february"
  ];

  // 🔹 Helper para acceder a propiedades anidadas
  const getNestedValue = (obj, path) =>
    path.split(".").reduce((acc, key) => acc?.[key], obj);

  // 🔹 Creamos estructura base vacía
  const createEmptyGrades = () => {
    const obj = {};
    gradePaths.forEach(path => {
      obj[path] = {
        value: null,
        loadedAt: null,
        loadedBy: null
      };
    });
    return obj;
  };

  // 🔥 OPTIMIZACIÓN IMPORTANTE
  // Convertimos cachedGrades en lookup por studentId
  const gradesByStudent = Object.fromEntries(
    cachedGrades.map(g => [g.studentId?.toString(), g])
  );

  // 🔹 Función que arma las notas para un alumno
  const getGrades = (studentId) => {

    const gradeObj = gradesByStudent[studentId?.toString()];

    if (!gradeObj || !gradeObj.grades) {
      return createEmptyGrades();
    }

    const orderedGrades = createEmptyGrades();

    gradePaths.forEach(path => {

      const gradeData = getNestedValue(gradeObj.grades, path);

      if (gradeData) {
        orderedGrades[path] = {
          value: gradeData.value ?? null,
          loadedAt: gradeData.loadedAt ?? null,
          loadedBy: gradeData.loadedBy ?? null
        };
      }
    });

    return orderedGrades;
  };

  // 🔹 Regulares
  regularStudents.forEach(s => {
    allStudents.push({
      studentId: s.student._id,
      studentNombre: s.student.nombre,
      studentApellido: s.student.apellido,
      studentDni: s.student.dni,
      grades: getGrades(s.student._id),
      isRepeating: false
    });
  });

  // 🔹 Recursantes
  repeatingStudents.forEach(s => {
    allStudents.push({
      studentId: s.studentId,
      studentNombre: s.studentNombre,
      studentApellido: s.studentApellido,
      studentDni: s.studentDni,
      grades: getGrades(s.studentId),
      isRepeating: true
    });
  });

  return allStudents;
}

// ==========================================================================================================================
// 🟢 FUncion -  guardar Nota 
// ==========================================================================================================================

/* =================================================================
   Cargar notas
========================= ========================================*/
//Cuando se escribe una nota
document
  .querySelector(".grades-content")
  .addEventListener("input", e => {
    if (!e.target.classList.contains("grade-input")) return;

    const el = e.target;

    // 🎨 color dinámico
    //applyGradeColor(el);

    const original =
      el.dataset.original === "" ? null : Number(el.dataset.original);

    const current =
      el.value === "" ? null : Number(el.value);

    // 🔄 Si vuelve al valor original
    if (current === original) {
      el.classList.remove("modified");

      const { studentId, gradeType } = el.dataset;

      if (gradesDraft[studentId]) {
        delete gradesDraft[studentId][gradeType];

        if (Object.keys(gradesDraft[studentId]).length === 0) {
          delete gradesDraft[studentId];
        }
      }

      enableSaveButton();
      return;
    }


    // 🔄 Limpio estados previos
    el.classList.remove("input-error");
    el.setCustomValidity("");

   // 🔴 VALIDACIÓN DE RANGO (BORRA Y LIMPIA DRAFT)
    if (current !== null && (current < 1 || current > 10)) {
        el.value = "";
        el.classList.remove("modified");
        el.classList.add("input-error");

        el.setCustomValidity("La nota debe estar entre 1 y 10");
        el.reportValidity();

        const { studentId, gradeType } = el.dataset;

        // 🧹 BORRAMOS EL CAMBIO DEL DRAFT
        if (gradesDraft[studentId]) {
          delete gradesDraft[studentId][gradeType];

          if (Object.keys(gradesDraft[studentId]).length === 0) {
            delete gradesDraft[studentId]; // limpia alumno vacío
          }
        }

        enableSaveButton();
        return;
    }
    // ✅ Es válida y distinta
    el.classList.add("modified");

    const { studentId, gradeType } = el.dataset;

    if (!gradesDraft[studentId]) {
      gradesDraft[studentId] = {};
    }

    gradesDraft[studentId][gradeType] = {
      value: current,
      modified: true
    };

    enableSaveButton();
  });

/* =========================
   Guardar notas
========================= */
async function saveAllGrades() {

  const inputs = document.querySelectorAll(".grade-input");
  const gradesMap = {};

  inputs.forEach(input => {

    if (input.disabled) return; // 🔥 no procesar bloqueados

    const value = input.value === "" ? null : Number(input.value);
    const original = input.dataset.original === "" 
      ? null 
      : (input.dataset.original != null ? Number(input.dataset.original) : null);

    if (value === original) return;

    const studentId = input.dataset.studentId;
    const gradeType = input.dataset.gradeType;
    const isRepeating = input.dataset.isRepeating === "true";

    const key = `${studentId}-${selectedSubjectId}`;

    if (!gradesMap[key]) {
      gradesMap[key] = {
        student: studentId,
        course: selectedCourseId,
        subject: selectedSubjectId,
        academicYear,
        isRepeating,
        grades: {}
      };
    }

    gradesMap[key].grades[gradeType] = { value };
  });

  const gradesArray = Object.values(gradesMap);

  if (gradesArray.length === 0) {
    uiToast("No hay cambios para guardar", "info");
    return;
  }

  const result = await fetchSaveGradesToServer(gradesArray);

  if (result?.success) {

    applySavedGradesToCache(gradesArray);

    document.querySelectorAll(".grade-input.modified").forEach(input => {
      input.dataset.original = input.value;
      input.classList.remove("modified");
    });

    uiToast("Notas guardadas correctamente", "success");

    hasUnsavedChanges = false;
    document.getElementById("saveGradesBtn").disabled = true;

  } else {

    uiToast(result?.message || "Error guardando notas", "error");

  }
}

function applySavedGradesToCache(savedGradesArray) {

  console.log("cachedGrades ready to render:", savedGradesArray);
  if (!Array.isArray(savedGradesArray)) {
    savedGradesArray = [savedGradesArray];
  }

  savedGradesArray.forEach(saved => {

    const studentId = saved.student; // 🔥 viene así del backend
    const grades = saved.grades;

    if (!studentId) {
      console.error("❌ student undefined en:", saved);
      return;
    }

    /* =========================
       1️⃣ ACTUALIZAR CACHE
    ========================= */

    let existingCache = cachedGrades.find(
      g => g.studentId?.toString() === studentId.toString()
    );

    if (!existingCache) {
      existingCache = {
        studentId: studentId,
        grades: {}
      };
      cachedGrades.push(existingCache);
    }

    /* =========================
       2️⃣ ACTUALIZAR studentsWithGrades
    ========================= */

    const existingStudent = studentsWithGrades.find(
      s => s.studentId?.toString() === studentId.toString()
    );


    Object.keys(grades || {}).forEach(term => {

      const incoming = grades[term];

      const normalized = {
        value: incoming?.value ?? null,
        loadedAt: incoming?.loadedAt ?? null,
        loadedBy: incoming?.loadedBy ?? null
      };

      // actualizar cache
      existingCache.grades[term] = normalized;

      // actualizar modelo renderizado
      if (existingStudent) {
        if (!existingStudent.grades) {
          existingStudent.grades = {};
        }
        existingStudent.grades[term] = normalized;
      }

    });

  });

  console.log("✅ Cache actualizado:", cachedGrades);
  console.log("✅ studentsWithGrades actualizado:", studentsWithGrades);
}
///Funcion para el color de input
function getGradeColorClass(value) {
  const num = Number(value);

  if (!value && value !== 0) return "";

  if (num >= 1 && num <= 4) return "low";
  if (num >= 5 && num <= 6) return "mid";
  if (num >= 7 && num <= 10) return "high";

  return "";
}

///Habilitar botón Guardar
function enableSaveButton() {
  const hasChanges = Object.values(gradesDraft)
    .some(student =>
      Object.values(student).some(g => g.modified)
    );

  document.getElementById("saveGradesBtn").disabled = !hasChanges;
}
//Función para actualizar el label fecha de carga
function updateAcademicCalendarLabel(gradePath) {

  const label = document.getElementById("labelAcademicCalendar");

  if (!configAcademicCalendar?.periods) return;

  // Si selecciona Todas
  if (gradePath === "all") {
    label.classList.remove("hidden");
    label.innerHTML = `
      <div class="period-header">Modo visualización</div>
      <div class="period-status neutral">Todas las evaluaciones</div>
    `;
    return;
  }

  const [periodKey, evaluationType] = gradePath.split(".");

  const period = configAcademicCalendar.periods.find(
    p => p.key === periodKey
  );

  if (!period) return;

  let evaluation = null;

  if (evaluationType) {
    evaluation = period.evaluations.find(e => e.type === evaluationType);
  } else {
    // Para casos como recuperatorio, diciembre, febrero
    evaluation = period.evaluations[0];
  }

  if (!evaluation?.gradingWindow) return;

  const now = new Date();
  const startDate = new Date(evaluation.gradingWindow.startDate);
  const endDate = new Date(evaluation.gradingWindow.endDate);

  const start = formatDate(startDate);
  const end = formatDate(endDate);

  let statusClass = "";
  let statusText = "";

  if (period.isManuallyClosed) {
    statusClass = "closed";
    statusText = "Cerrado";
  } else if (now < startDate || now > endDate) {
    statusClass = "out";
    statusText = "Fuera de fecha";
  } else {
    statusClass = "active";
    statusText = "Habilitado";
  }

  label.classList.remove("hidden");

  label.innerHTML = `
    <div class="period-header">Período de carga</div>
    <div class="period-body">
        <span class="period-dates">${start} — ${end}</span>
        <span class="period-status ${statusClass}">
            ${statusText}
        </span>
    </div>
  `;
}



//Función para formatear fechas
function formatDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}


// ==========================================================================================================================
// 🟢 Fetch 
// ==========================================================================================================================
// =============================
//  Fetch Buscar cursos 
// =============================
async function fetchMyCoursesByYear(year) {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (!token || !user?.id) return [];

    const res = await fetch(
      `${API_URL}/api/TeachingAssignment/myCourseByYear/user/${user.id}?year=${year}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!res.ok) throw new Error("Error al cargar cursos");

    const { data } = await res.json();
    return data || [];
  } catch (err) {
    console.error("fetchMyCoursesByYear:", err);
    return [];
  }
}
// =============================
//  Fetch materias del docente
// =============================
async function fetchMySubjectsByCourse(courseId) {
  try {
    const res = await fetch(
      `${API_URL}/api/teachingAssignment/mySubjects/${courseId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!res.ok) {
      console.error("Error al traer materias del docente");
      return [];
    }

    const data = await res.json();
    return data.data || [];

  } catch (error) {
    console.error("Error fetchMySubjectsByCourse:", error);
    return [];
  }
}
// ==============================
// //  Fetch - Traer los alumnos del Curso(Docente)
// ==============================
async function fetchStudentsFromCourse(courseId) {
  try {
    const token = localStorage.getItem("token");

    if (!token) return;

    const res = await fetch(`${API_URL}/api/course/${courseId}/students`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Error al obtener alumnos del curso");

    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.error(err);
  }
}
/* =========================
   Fetch - Recursantes por Profesor + Materia
========================= */
async function fetchRepeatingStudents({ teacherId, subjectId, academicYear }) {
  try {

    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_URL}/api/studentRecourseAssignment/recourse/teacher/${teacherId}?subjectId=${subjectId}&academicYear=${academicYear}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Error al cargar recursantes");
    }

    const data = await res.json();
    return data.data || [];

  } catch (err) {
    console.error("Error fetch recursantes:", err);
    return [];
  }
}
// =============================
// 🟢 Fetch de notas de un curso + trimestre (con try/catch)
// =============================
async function fetchGradesForCourse(courseId,subjectId,academicYear) {
  try {
    const res = await fetch(
      `${API_URL}/api/grade/course/${courseId}/subject/${subjectId}?academicYear=${academicYear}`,
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
// 🟢 Fetch para guardar notas
// =============================
async function fetchSaveGradesToServer(gradesArray) {
  try {
    const res = await fetch(`${API_URL}/api/grade/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(gradesArray)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Error guardando notas:", data.message || data);
      return {
      success: false,
      message: data.message || "Error en el servidor"
    };
    }

    return data.data; // 🔥 devolvemos exactamente lo que manda el backend

  } catch (error) {
    console.error("Error al conectar con el servidor:", error);
    return { success: false, data: error };
  }
}
// =============================
// 🟢 Fetch Buscar configuraciones de fecha
// =============================
async function fetchGetAcademicYearPeriodConfig(academicYear) {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (!token || !user?.id) return null;

    const res = await fetch(`${API_URL}/api/academicYearPeriodConfig/${academicYear}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    const response = await res.json(); // 🔹 leer siempre el JSON

    if (!res.ok) {
      uiToast(response.message || "Error obteniendo la configuración", "error");
      return null;
    }

    return response.data; // 🔹 devuelve solo los datos si todo OK
  } catch (err) {
    console.error("Error en fetchGetAcademicYearPeriodConfig:", err);
    //uiToast(err.message || "Error al conectar con el servidor", "error");
    return null;
  }
}