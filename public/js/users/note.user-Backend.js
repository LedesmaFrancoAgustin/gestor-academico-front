
const courseSelect = document.getElementById("courseSelect"); // Selector de curso
const subjectSelect = document.getElementById("subjectSelect");/// Selector de Materia
const gradeTypeSelect = document.getElementById("gradeTypeSelect");/// Selector de Notas

// Orden académico de las notas
const GRADE_ORDER = [
  { key: "firstTerm", label: "1° Trimestre" },
  { key: "secondTerm", label: "2° Trimestre" },
  { key: "recuperatory", label: "Recuperatorio" },
  { key: "december", label: "Diciembre" },
  { key: "february", label: "Febrero" }
];

// Estado actual de la vista
let selectedGradeType = "firstTerm";
let selectedCourseId = null;
let selectedSubjectId = null;

let courseId = null;
let currentSubjectList = [];

let cachedGrades = [];
let cachedRepeatingStudentsGrades = [];

let hasUnsavedChanges = false;


let gradesDraft = {};

// Llamamos a la función al cargar la página
document.addEventListener("DOMContentLoaded", renderCourses);
// Traer los cursos del usuario
async function fetchMyCourses() {
  try {
    const token = localStorage.getItem("token");

    if (!token) return;

    const res = await fetch(`${API_URL}/api/users/my-courses`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Error al cargar cursos");

    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.error(err);
  }
}
// ==============================
// Renderizar cursos en el select
// ==============================
async function renderCourses() {
  const courses = await fetchMyCourses();

  // Limpiamos el select
  courseSelect.innerHTML = `<option value="">Seleccioná un curso</option>`;

  if (courses.length === 0) {
    const option = document.createElement("option");
    option.disabled = true;
    option.textContent = "No tenés cursos asignados";
    courseSelect.appendChild(option);
    return;
  }

  courses.forEach(courseItem => {
    /**
     * ⚠️ Ajustá esto según cómo venga tu backend
     * Ejemplo común:
     * courseItem.course._id
     * courseItem.course.name
     */
    const course = courseItem.course || courseItem;

    const option = document.createElement("option");
    option.value = course._id;
    option.textContent = `${course.name} (${course.code})`;

    courseSelect.appendChild(option);
  });
}
/* =========================
   Selector del curso
========================= */
courseSelect.addEventListener("change", async (e) => {
  courseId = e.target.value;

  subjectSelect.innerHTML = `<option value="">Seleccionar materia</option>`;
  subjectSelect.disabled = true;

  if (!courseId) return;
  currentSubjectList = await fetchMySubjectsByCourse(courseId)

console.log("currentSubjectList: ",currentSubjectList)
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
  if (!selectedSubjectId || !courseId) return;

  cachedGrades = await fetchGradesForCourse(courseId, selectedSubjectId);
  
  const academicYear = new Date().getFullYear(); // 🔥 Año actual automático
  const userStorage = localStorage.getItem("user");
  const user = JSON.parse(userStorage);

  cachedRepeatingStudentsGrades = await fetchRepeatingStudents({
    teacherId: user.id,
    subjectId: selectedSubjectId ,
    academicYear
  });

  console.log(cachedRepeatingStudentsGrades);
  renderCurrentView();

  
});

/* =========================
   Selector de nota
========================= */
gradeTypeSelect.addEventListener("change", (e) => {
  selectedGradeType = e.target.value;
  if (!courseId || cachedGrades.length === 0) return;

  renderCurrentView();
});


/* =========================
   Función principal: cargar notas según pantalla
========================= */
function renderCurrentView() {
  const isDesktop = window.innerWidth > 768;

  if (isDesktop) {
    renderGradesDesktop(cachedGrades);
    renderRepeatingGradesDesktop(cachedRepeatingStudentsGrades);
  } else {
    renderGradesMobile(cachedGrades);
  }
}



/* =========================
   Renderizar tabla editable en escritorio
========================= */
function renderGradesDesktop(students) {
  const gradesContainer = document.getElementById("gradesContainer");
  gradesContainer.innerHTML = "";

  const table = document.createElement("table");
  table.className = "grades-table";

  /* =========================
     Columnas visibles
  ========================= */
  const gradeColumns =
    selectedGradeType === "all"
      ? GRADE_ORDER
      : GRADE_ORDER.slice(
          0,
          GRADE_ORDER.findIndex(g => g.key === selectedGradeType) + 1
        );

  /* =========================
     Header
  ========================= */
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th class="col-index">#</th>
      <th>Alumno</th>
      <th>DNI</th>
      ${gradeColumns.map(g => `<th>${g.label}</th>`).join("")}
    </tr>
  `;

  table.appendChild(thead);

  /* =========================
     Body
  ========================= */
  const tbody = document.createElement("tbody");

  students.forEach((s, index) => {
  const tr = document.createElement("tr");

  let gradeCells = "";

  gradeColumns.forEach(g => {
    const value = s.grades?.[g.key] ?? "";
    const editable =
      selectedGradeType === "all" || g.key === selectedGradeType;

    gradeCells += `
      <td>
        ${
          editable
            ? `<input 
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  class="grade-input"
                  data-student-id="${s.studentId}"
                  data-subject-id="${s.subjectId}"
                  data-grade-type="${g.key}" 
                  data-original="${value ?? ""}"
                  value="${value ?? ""}"
              >`
            : `<span class="grade-readonly">${value || "-"}</span>`
        }
      </td>
    `;
  });

  tr.innerHTML = `
    <td class="col-index">${index + 1}</td>
    <td>${s.studentApellido} ${s.studentNombre}</td>
    <td>${s.studentDni}</td>
    ${gradeCells}
  `;

  tbody.appendChild(tr);
});


  table.appendChild(tbody);
  gradesContainer.appendChild(table);
}
/* =========================
   Renderizar Recursantes tabla editable en escritorio
========================= */
function renderRepeatingGradesDesktop(students) {
  const container = document.getElementById("gradesRecursiveContainer");
  container.innerHTML = "";

  if (!students || students.length === 0) return;

  const title = document.createElement("h3");
  title.className = "repeating-title";
  title.textContent = "Alumnos Recursantes";
  container.appendChild(title);

  const table = document.createElement("table");
  table.className = "grades-table repeating-table";

  const gradeColumns =
    selectedGradeType === "all"
      ? GRADE_ORDER
      : GRADE_ORDER.slice(
          0,
          GRADE_ORDER.findIndex(g => g.key === selectedGradeType) + 1
        );

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th class="col-index">#</th>
      <th>Alumno</th>
      <th>DNI</th>
      ${gradeColumns.map(g => `<th>${g.label}</th>`).join("")}
    </tr>
  `;

  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  students.forEach((s, index) => {
    const tr = document.createElement("tr");

    let gradeCells = "";

    gradeColumns.forEach(g => {
      const value = s.grades?.[g.key] ?? "";
      const editable =
        selectedGradeType === "all" || g.key === selectedGradeType;

      gradeCells += `
        <td>
          ${
            editable
              ? `<input 
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    class="grade-input repeating-input"
                    data-student-id="${s.studentId}"
                    data-subject-id="${selectedSubjectId}"
                    data-is-repeating="${true}"
                    data-grade-type="${g.key}" 
                    data-original="${value ?? ""}"
                    value="${value ?? ""}"
                >`
              : `<span class="grade-readonly">${value || "-"}</span>`
          }
        </td>
      `;
    });

    tr.innerHTML = `
      <td class="col-index">${index + 1}</td>
      <td>
        ${s.studentApellido} ${s.studentNombre}
        <span class="badge-rec">Recursante</span>
      </td>

      <td>${s.studentDni}</td>
      ${gradeCells}
    `;

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

/* =========================
   Renderizar cards en mobile
========================= */
function renderGradesMobile(students) {
  const gradesContainer = document.getElementById("gradesContainer");
  gradesContainer.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "grades-cards";

  /* =========================
     Columnas visibles (MISMA lógica que desktop)
  ========================= */
  const gradeColumns =
    selectedGradeType === "all"
      ? GRADE_ORDER
      : GRADE_ORDER.slice(
          0,
          GRADE_ORDER.findIndex(g => g.key === selectedGradeType) + 1
        );

  students.forEach(s => {
    const card = document.createElement("div");
    card.className = "grade-card";

    let gradesInputs = "";

    gradeColumns.forEach(g => {
      const value = s.grades?.[g.key] ?? "";
      const editable =selectedGradeType === "all" || g.key === selectedGradeType;

      gradesInputs += `
        <div class="grade-field">
          <label>${g.label}</label>
          ${
            editable
              ? `<input
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    class="grade-input "
                    data-student-id="${s.studentId}"
                    data-subject-id="${s.subjectId}"
                    data-grade-type="${g.key}"
                    data-original="${value ?? ""}"
                    value="${value ?? ""}"
                >`
              : `<span class="grade-readonly">${value || "-"}</span>`
          }
        </div>
      `;
    });

    card.innerHTML = `
      <div class="grade-card-header">
        <h4>${s.studentApellido} ${s.studentNombre}</h4>
        <span class="dni">DNI: ${s.studentDni}</span>
      </div>

      <div class="grade-card-body">
        ${gradesInputs}
      </div>
    `;

    grid.appendChild(card);
  });

  gradesContainer.appendChild(grid);
}




/* =========================
   fetch a estudiante
========================= */
async function fetchStudents(courseId) {
  try {
    console.log(courseId)
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/course/${courseId}/students`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Error al cargar alumnos");
    const data = await res.json();
    console.log(data.data)
    return data.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}
// =============================
// 🟢 Fetch de notas de un curso + trimestre (con try/catch)
// =============================
async function fetchGradesForCourse(courseId,subjectId) {
  try {
    const res = await fetch(
      `${API_URL}/api/grade/course/${courseId}/subject/${subjectId}`,
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
// 🟢 Fetch materias del docente
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




///Habilitar botón Guardar
function enableSaveButton() {
  const hasChanges = Object.values(gradesDraft)
    .some(student =>
      Object.values(student).some(g => g.modified)
    );

  document.getElementById("saveGradesBtn").disabled = !hasChanges;
}

//Prevención de salida sin guardar
window.addEventListener("beforeunload", e => {
  if (!document.getElementById("saveGradesBtn").disabled) {
    e.preventDefault();
    e.returnValue = "";
  }
});

/* =========================
   Guardar notas
========================= */
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
      return { success: false, data };
    }

    return { success: true, data };

  } catch (error) {
    console.error("Error al conectar con el servidor:", error);
    return { success: false, data: error };
  }
}

async function saveAllGrades() {
  const user = JSON.parse(localStorage.getItem("user"));
  const teacherId = user.id;

  const inputs = document.querySelectorAll(".grade-input");
  const gradesMap = {};

 inputs.forEach(input => {
    const value = input.value === "" ? null : Number(input.value);
    const original =input.dataset.original === "" ? null : Number(input.dataset.original);

    if (value === original) return; // 🧠 doble seguridad

    const studentId = input.dataset.studentId;
    const subjectId = input.dataset.subjectId;
    const gradeType = input.dataset.gradeType;
    const academicYear = 2026;
    const isRepeating = input.dataset.isRepeating === "true";

   // const teacherId = JSON.parse(localStorage.getItem("user")).id;

    // Creamos un registro por alumno+materia
    const key = `${studentId}-${subjectId}`;
    if (!gradesMap[key]) {
      gradesMap[key] = {
        student: studentId,
        course: courseId,  // variable global del curso seleccionado
        subject: subjectId,
        teacher: teacherId,
        academicYear,
        isRepeating,
        grades: {}
      };
    }

    gradesMap[key].grades[gradeType] = value;
  });

  const gradesArray = Object.values(gradesMap);

  if (gradesArray.length === 0) {
    Swal.fire("Info", "No hay cambios para guardar", "info");
    return;
  }

  const result = await fetchSaveGradesToServer(gradesArray);

if (result.success) {
  // 🧠 ACTUALIZAMOS EL CACHE LOCAL
  applySavedGradesToCache(gradesArray);

   document.querySelectorAll(".grade-input.modified").forEach(input => {
    input.dataset.original = input.value;
    input.classList.remove("modified");
  });
  
  Swal.fire("Éxito", "Notas guardadas correctamente", "success");
  
  hasUnsavedChanges = false;
  document.getElementById("saveGradesBtn").disabled = true;
} else {
  Swal.fire({
    title: "Error guardando notas",
    text: result.data.message || "No se pudieron guardar las notas",
    icon: "error"
  });
}

}

/* =================================================================
  Aplica color al input
========================= ========================================*/
function getGradeClass(value) {
  if (value >= 1 && value <= 4) return "grade-bad";
  if (value <= 6) return "grade-regular";
  return "grade-good";
}


function applyGradeColor(input) {
  const value = input.value === "" ? null : Number(input.value);

  input.classList.remove("grade-low", "grade-mid", "grade-high");

  if (value === null) return;

  if (value >= 1 && value <= 4) {
    input.classList.add("grade-low");
  } else if (value >= 5 && value <= 6) {
    input.classList.add("grade-mid");
  } else if (value >= 7 && value <= 10) {
    input.classList.add("grade-high");
  }
}

/* =================================================================
  Actualizar cachedGrades
========================= ========================================*/
function applySavedGradesToCache(savedGrades) {
  const updateCache = (cache) => {
    savedGrades.forEach(saved => {
      const local = cache.find(
        g =>
          String(g.studentId) === String(saved.student) &&
          String(g.subjectId) === String(saved.subject)
      );

      if (!local) return;

      Object.keys(saved.grades).forEach(term => {
        local.grades[term] = saved.grades[term];
      });
    });
  };

  updateCache(cachedGrades);
  updateCache(cachedRepeatingStudentsGrades);
}


document.getElementById("saveGradesBtn").addEventListener("click", async () => {
 
  await saveAllGrades();
  // 🔹 Aquí harías el POST al backend
  // await fetch(`${API_URL}/api/course/${courseId}/grades`, { method: "POST", body: JSON.stringify(grades) })
});
