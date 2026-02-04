const courseSelect = document.getElementById("studentCourseSelect"); // Selector de curso
const btBoletin  = document.getElementById("downloadReportBtn")
let courseId = null
const PERIODS = [
  { key: "firstTerm", label: "1° Trimestre" },
  { key: "secondTerm", label: "2° Trimestre" },
  { key: "recuperatory", label: "Recuperatorio" },
  { key: "december", label: "Diciembre" },
  { key: "february", label: "Febrero" }
];

// ==============================
// Llamamos a la función al cargar la página (fetchMyCourses + renderCourses)
// ==============================
document.addEventListener("DOMContentLoaded", renderCourses);
// ==============================
// Fetch Obtener cursos
// ==============================
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

// ======================================================================
//                            NOTAS
// ======================================================================
/* =========================
   Selector del curso
========================= */
courseSelect.addEventListener("change", async (e) => {
  courseId = e.target.value;

  if (!courseId) return;
  grades = await fetchMyGrade(courseId)

   if (grades.length === 0) {
    uiToast("No tenés notas asignadas en este curso","info");
    return;
  }

  if (window.innerWidth <= 768) {
  renderStudentGradesSheetMobile(grades);
} else {
  renderStudentGradesSheetDesktop(grades);
}

  btBoletin.disabled = false;

});

// ==============================
// Fetch Obtener Notas
// ==============================
async function fetchMyGrade(courseId) {
  try {
    const token = localStorage.getItem("token");

    if (!token) return;

    const res = await fetch(`${API_URL}/api/grade/course/${courseId}/student`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Error al cargar Notas");

    const response  = await res.json();
    return response.data || [];
  } catch (err) {
    console.error(err);
  }
}

function renderStudentGradesSheetDesktop(data = []) {
  if (!Array.isArray(data) || data.length === 0) return;

  const table = document.querySelector(".student-grades-table");
  table.innerHTML = "";

  /* =====================
     THEAD
  ===================== */
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const thPeriod = document.createElement("th");
  thPeriod.className = "period-col";
  thPeriod.textContent = "Período";
  headRow.appendChild(thPeriod);

  data.forEach(item => {
    const th = document.createElement("th");
    th.className = "subject-col";
    th.innerHTML = `<span>${item.subject.name}</span>`;
    headRow.appendChild(th);
  });

  // Columna promedio
  const thAvg = document.createElement("th");
  thAvg.className = "avg-col";
  thAvg.textContent = "Prom.";
  headRow.appendChild(thAvg);

  thead.appendChild(headRow);
  table.appendChild(thead);

  /* =====================
     TBODY
  ===================== */
  const tbody = document.createElement("tbody");

  PERIODS.forEach(period => {
    const tr = document.createElement("tr");

    const th = document.createElement("th");
    th.textContent = period.label;
    tr.appendChild(th);

    const periodGrades = [];

    data.forEach(item => {
      const grade = item.grades?.[period.key];
      const td = document.createElement("td");

      if (grade == null) {
        td.innerHTML = `<span class="grade-empty">—</span>`;
      } else {
        periodGrades.push(grade);
        td.innerHTML = `<span class="grade-badge ${grade < 6 ? "bad" : "good"}">${grade}</span>`;
      }

      tr.appendChild(td);
    });

    // Promedio por período
    const tdAvg = document.createElement("td");
    const avgValue = avg(periodGrades);

    tdAvg.className = "avg-cell";
    tdAvg.innerHTML = avgValue
      ? `<span class="avg-badge">${avgValue}</span>`
      : `<span class="grade-empty">—</span>`;

    tr.appendChild(tdAvg);
    tbody.appendChild(tr);
  });

  /* =====================
     FILA PROMEDIO POR MATERIA
  ===================== */
  const avgRow = document.createElement("tr");
  avgRow.className = "avg-row";

  const thAvgLabel = document.createElement("th");
  thAvgLabel.textContent = "PROMEDIO";
  avgRow.appendChild(thAvgLabel);

  data.forEach(item => {
    const values = Object.values(item.grades).filter(v => typeof v === "number");
    const td = document.createElement("td");

    const value = avg(values);
    td.innerHTML = value
      ? `<span class="avg-badge">${value}</span>`
      : `<span class="grade-empty">—</span>`;

    avgRow.appendChild(td);
  });

  // esquina vacía
  avgRow.appendChild(document.createElement("td"));

  tbody.appendChild(avgRow);
  table.appendChild(tbody);
}

function renderStudentGradesSheetMobile(data = []) {
  const container = document.querySelector(".noteStudent-student-grades-mobile");
  container.innerHTML = "";

  data.forEach(item => {
    const card = document.createElement("div");
    card.className = "noteStudent-grade-card";

    let gradesHTML = "";
    const values = [];

    PERIODS.forEach(period => {
      const grade = item.grades?.[period.key];

      if (typeof grade === "number") values.push(grade);

      gradesHTML += `
        <div class="noteStudent-grade-row">
          <span class="noteStudent-period">${period.label}</span>
          <span class="noteStudent-grade ${grade < 6 ? "bad" : "good"}">
            ${grade ?? "—"}
          </span>
        </div>
      `;
    });

    const avgValue = avg(values);

    card.innerHTML = `
      <h4 class="noteStudent-subject-title">${item.subject.name}</h4>

      <div class="noteStudent-grades-list">
        ${gradesHTML}
      </div>

      <div class="noteStudent-avg-row">
        <span class="noteStudent-avg-label">Promedio</span>
        <span class="noteStudent-avg-value ${avgValue < 6 ? "bad" : "good"}">
          ${avgValue ?? "—"}
        </span>
      </div>
    `;

    container.appendChild(card);
  });
}


function avg(values = []) {
  if (!values.length) return null;
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}

// ======================================================================
//                            Descargar Boletin
// ======================================================================

btBoletin.addEventListener("click", () => {
  downloadBoletin();
});
async function downloadBoletin() {
  try {
    const { blob, fileName } = await fetchBoletin(courseId);

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName; // 🔥 ahora sí viene del back
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);

    btBoletin.disabled = true;

  } catch (err) {
    console.error("Error al descargar boletín", err);
    uiToast("Error al descargar boletin","error");
  }
}
// ==============================
// Fetch Obtener Notas
// ==============================
async function fetchBoletin(courseId) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No hay token");

  const res = await fetch(`${API_URL}/api/pdf/generate/student/${courseId}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error("Error al descargar Boletín");
  }

  const blob = await res.blob();

  // 👇 LEER NOMBRE DESDE EL HEADER
  const disposition = res.headers.get("Content-Disposition");

  let fileName = "boletin.pdf";

  if (disposition && disposition.includes("filename=")) {
    fileName = disposition
      .split("filename=")[1]
      .replace(/"/g, "")
      .trim();
  }

  return { blob, fileName };
}





