// =============================
// 🟢 Referencias al DOM
// =============================
const academicYearSelect = document.getElementById("academicYearSelect");
const courseSelect = document.getElementById("courseSelect");
const monthSelect = document.getElementById("monthSelect");
const typeClassSelect = document.getElementById("attendanceTypeSelect")
const searchInput = document.getElementById("attendanceSearch");


const saveAttendanceBtn = document.getElementById("saveAttendanceBtn");

let selectedYear = null
let selectedCourse = null
let selectedMonth = null
let selectedSearchInput = null
let selectedType = "regular"          // Tipo de asistencia ED O Clase

let studentsInfo = [];
let studentsGrades = []  // Estudiante con informmacion y asistencia/ausentes
//let attendancePreviousStudents = []  // Ausentes previuos del curso

let currentMonthDates = [];

const trimester = 1;

const attendanceChanges = new Map();  //Map para evitar duplicados por alumno + fecha.
// ===========================================================================
// 🟢 Event listeners
// ===========================================================================

// =============================
//  Selector del año
// =============================
academicYearSelect.addEventListener("change", async () => {
  selectedYear = academicYearSelect.value;
  const courses = await fetchGetCoursesByYear(selectedYear);
 
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

  courseSelect.disabled = false;
});

// =============================
//  Selector del curso
// =============================
courseSelect.addEventListener("change", async () => {
  selectedCourse = courseSelect.value;
  monthSelect.disabled = false;
  await loadAndRenderAttendance();
});
// =============================
//  Selector del del mes
// =============================
monthSelect.addEventListener("change", async () => {
  selectedMonth = monthSelect.value;
  searchInput.value = "";
  await loadAndRenderAttendance();
});

// =======================================================================================
// 🔹 Select para cambiar tipo de asistencia
// =======================================================================================

typeClassSelect.addEventListener("change", (e) => {
  selectedType = e.target.value;
  const year = selectedYear;
  const month = selectedMonth;

  //await loadAndRenderAttendance();


  console.log("studentsGrades: ", studentsGrades)

  if (selectedType === "regular") {
    renderAttendanceTable(studentsGrades, year, month);
  } else if (selectedType === "physical_education") {
    renderPhysicalEducationTable(studentsGrades, year, month);
  }
});


searchInput.addEventListener("input", () => {
  const value = searchInput.value.trim().toLowerCase();

  const tbody = document.querySelector("#preceptorAttendanceTable tbody");
  const rows = tbody.querySelectorAll("tr");

  rows.forEach(tr => {
    const name = tr.children[1]?.textContent.toLowerCase() || "";
    const dni  = tr.children[2]?.textContent.toLowerCase() || "";

    const match = name.includes(value) || dni.includes(value);
    tr.style.display = match ? "" : "none";
  });

  // 🔥 opcional: recalcular totales solo visibles
  //recalculateFooter(tbody, getCurrentMonthDates());
});

// =============================
//  Boton guardar asistencias Masivas
// =============================
saveAttendanceBtn.addEventListener("click", async () => {

  // 🔥 AUTO COMPLETAR P PARA LOS DEMÁS VACÍOS SOLO EN DÍAS CON A/J/T
  const allInputs = document.querySelectorAll(".attendance-input");

  allInputs.forEach(input => {
    const value = input.value.toUpperCase();
    const type = input.dataset.attendanceType;

    // Solo si es A, J o T
    if (["A", "J", "T"].includes(value)) {
      const date = input.dataset.date;

      // Buscar todos los inputs del mismo día y tipo
      const sameDayInputs = document.querySelectorAll(
        `.attendance-input[data-date="${date}"][data-attendance-type="${type}"]`
      );

      sameDayInputs.forEach(otherInput => {
        if (otherInput.value === "") {
          // Completar con P
          otherInput.value = "P";
          applyAttendanceStyle(otherInput);
          updateIconState(otherInput);

          const otherKey = `${otherInput.dataset.userId}_${otherInput.dataset.date}_${type}`;
          const otherPayload = buildAttendancePayload(otherInput);

          attendanceChanges.set(otherKey, otherPayload);
        }
      });
    }
  });

  // 🔥 Guardar en el backend
  await fetchPostAttendanceForMonth(selectedCourse, selectedYear, trimester, attendanceChanges);
});



// ===========================================================================
// 🟢 Event listeners - Para Render
// ===========================================================================

// ===========================================================================
//  Presente a todos los alumnos por fecha
// ===========================================================================
document.addEventListener("click", (e) => {
  if (!e.target.closest(".fill-present-btn")) return;

  const btn = e.target.closest(".fill-present-btn");
  const date = btn.dataset.date;

  const inputs = document.querySelectorAll(`.attendance-input[data-date="${date}"]`);

  inputs.forEach(input => {
    if (input.value === "") {
      input.value = "P";
      applyAttendanceStyle(input);
      updateIconState(input);

      const key = `${input.dataset.userId}_${input.dataset.date}_${input.dataset.attendanceType}`;
      const payload = buildAttendancePayload(input);
      attendanceChanges.set(key, payload);
    }
  });

  saveAttendanceBtn.disabled = attendanceChanges.size === 0 ? true : false;
  //uiToast(`Todos los alumnos marcados como presentes el ${date}`, "success");
});

// ===========================================================================
//  Interacion con cada imput
// ===========================================================================
document.addEventListener("input", async (e) => {
  if (!e.target.classList.contains("attendance-input")) return;

  const input = e.target;
  //const type = input.dataset.attendanceType; // "regular" o "physical_education"
  let value = input.value.toUpperCase();

  // Validación según tipo
  if (selectedType === "regular") {
    if (!["P", "T", "A", "J", ""].includes(value)) {
      input.value = "";
      return;
    }
  } else if (selectedType === "physical_education") {
    if (!["P", "A","J" ,""].includes(value)) {
      input.value = "";
      return;
    }
  }

  input.value = value;
  applyAttendanceStyle(input);
  updateIconState(input);

  const originalValue = input.dataset.originalValue || "";
  const key = `${input.dataset.userId}_${input.dataset.date}_${selectedType}`; // 🔹 incluir tipo

  if (value === originalValue) {
    attendanceChanges.delete(key);
  } else {
    const payload = buildAttendancePayload(input);
    attendanceChanges.set(key, payload);
  }

  saveAttendanceBtn.disabled = attendanceChanges.size === 0 ? true : false;
});


// =======================================================================================
// 🟢 Render 
// =======================================================================================
function renderAttendanceTable(studentsGrades, year, month) {

  if (!month || !year) {
    return;
  }
  const attendanceTable = document.getElementById("preceptorAttendanceTable");
  const thead = attendanceTable.querySelector("thead");
  const tbody = attendanceTable.querySelector("tbody");

  thead.innerHTML = "";
  tbody.innerHTML = "";

  currentMonthDates  = getMonthDays(year, month);

  renderHeader(thead, currentMonthDates );
  renderBody(tbody, studentsGrades, currentMonthDates );
  renderFooterTotals(tbody, currentMonthDates );



  //updateTotals(tbody, monthDates);
}

//Render Header
function renderHeader(thead, monthDates) {

  const dayInitials = ["D", "L", "M", "M", "J", "V", "S"];

  // ==================================================
  // 🟢 FILA SUPERIOR (TÍTULO GENERAL)
  // ==================================================
  const groupRow = document.createElement("tr");
  groupRow.classList.add("tr-Header");

  const totalCols = 3 + monthDates.length + 9; // columnas fijas + días + totales
  const thTitle = document.createElement("th");
  thTitle.colSpan = totalCols;
  thTitle.textContent = "Registro de asistencia de clases";
  thTitle.classList.add("text-center");
  thTitle.style.fontWeight = "bold";
  thTitle.style.fontSize = "1.1em";

  groupRow.appendChild(thTitle);
  thead.appendChild(groupRow);

  // ==================================================
  // 🟢 FILA INFERIOR (LA ORIGINAL)
  // ==================================================

  const headRow = document.createElement("tr");
  headRow.classList.add("tr-Header");

  ["#", "Alumno", "DNI"].forEach(text => {
    const th = document.createElement("th");
    th.classList.add("sticky-col");
    th.textContent = text;
    headRow.appendChild(th);
  });

    monthDates.forEach(date => {

    const dayOfWeek = getDayOfWeek(date);
    const th = document.createElement("th");
    th.classList.add("day-col");

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      th.classList.add("weekend");
      th.innerHTML = "";
    } else {
      th.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
          <span class="day-initial">${dayInitials[dayOfWeek]}</span>
          <span class="day-number">${date.split("-")[2]}</span>
          <button class="fill-present-btn" data-date="${date}" title="Completar P todos">
            <i class="fa fa-arrow-down"></i>
          </button>
        </div>
      `;
    }

    headRow.appendChild(th);
  });

  const thSpace = document.createElement("th");
  thSpace.classList.add("total-col-space");
  headRow.appendChild(thSpace);

  [ "Anterior","Asistencia", "", "J", "A", "EF", "", "TOTAL"].forEach(text => {
    const th = document.createElement("th");
    th.classList.add("total-col");
    th.textContent = text;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
}

function renderBody(tbody, studentsGrades, monthDates) {

  studentsGrades.forEach((student, index) => {

    const tr = document.createElement("tr");

      tr.dataset.userId = student.userId;
      tr.dataset.gender = student.genero?.toLowerCase() || "";

    // ==================================================
    // 🟢 Columnas fijas
    // ==================================================

    const tdIndex = document.createElement("td");
    tdIndex.classList.add("sticky-col");
    tdIndex.textContent = index + 1;
    tr.appendChild(tdIndex);

    const tdName = document.createElement("td");
    tdName.classList.add("sticky-col");
    tdName.textContent = student.name;
    tr.appendChild(tdName);

    const tdDni = document.createElement("td");
    tdDni.classList.add("sticky-col");
    tdDni.textContent = student.dni;
    tr.appendChild(tdDni);

    // ==================================================
    // 🟢 Crear mapa rápido por fecha
    // ==================================================

    const detailsMap = new Map();

    (student.details || []).forEach(d => {
      if (!detailsMap.has(d.date)) {
        detailsMap.set(d.date, []);
      }
      detailsMap.get(d.date).push(d);
    });

    let totalPresents = 0;
    let totalAbsents = 0;
    let totalAbsentsED = 0;
    let totalJustified = 0;
    let tdTotalPrevious = 0;

    // ==================================================
    // 🟢 Columnas por día
    // ==================================================

    monthDates.forEach(date => {

      const td = document.createElement("td");
      td.classList.add("attendance-cell");

      const dayOfWeek = getDayOfWeek(date);

      // 🚫 Fin de semana vacío
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        td.classList.add("weekend");
        tr.appendChild(td);
        return;
      }

      const records = detailsMap.get(date) || [];

      let code = "";
      let noteText = "";

      records.forEach(record => {

        // 🚫 EDUCACIÓN FÍSICA → NO SE MUESTRA
        if (record.attendanceType === "physical_education") {

          if (record.status === "absent") {

             if (!record.justification?.isJustified) {
                totalAbsentsED += 0.5; // media falta
            } 
          }

          return; // no mostrar nada en la celda
        }

        // 🟢 REGULAR (se muestra)
        if (record.attendanceType === "regular") {

          if (record.notes && record.notes.trim() !== "") {
            noteText = record.notes;
          }

          if (record.status === "present") {

            if (record.late?.isLate) {
              code = "T";
              totalAbsents += 0.25;
            } else {
              code = "P";
            }

            totalPresents++;

          } else if (record.status === "absent") {

            if (record.justification?.isJustified) {
              code = "J";
              totalJustified++;
            } else {
              code = "A";
              totalAbsents++;
            }

            
          }
        }

      });

      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.classList.add("attendance-input");
        input.dataset.userId = student.userId;
        input.dataset.date = date;
        input.dataset.attendanceType = "regular";
      input.value = code || ""; // ← si tenía P/A/T/J lo carga
      input.dataset.originalValue = input.value || "";

          // Mostrar icono al enfocar si el valor es válido
          input.addEventListener("focus", () => {
            const td = input.closest("td.attendance-cell");
            if (!td) return;

            if (["P", "A", "T", "J"].includes(input.value.toUpperCase())) {
              td.classList.add("show-icon");
            }
          });

          // Ocultar al salir
          input.addEventListener("blur", () => {
            const td = input.closest("td.attendance-cell");
            if (!td) return;

            td.classList.remove("show-icon");
          });

          // 🔥 CLAVE: reaccionar cuando escribe
          input.addEventListener("input", () => {
            const td = input.closest("td.attendance-cell");
            if (!td) return;

            const value = input.value.toUpperCase();

            if (["P", "A", "T", "J"].includes(value)) {
              td.classList.add("show-icon");
            } else {
              td.classList.remove("show-icon");
            }

            // 🔥 Actualiza solo esta fila
            const tr = input.closest("tr");
            recalculateRowTotals(tr);
            // 🔥 ACTUALIZA TOTALES
            recalculateFooter(tbody, monthDates);
     
          });

      applyAttendanceStyle(input);  // Apñcar estilo de colores

      updateIconState(input); // Apñcar el icono cuando es valido

      const icon = document.createElement("i");
      icon.className = "edit-note-icon fa-solid fa-pencil";

          if (noteText) {

            input.dataset.note = noteText;
            input.classList.add("has-note");

            const tooltip = document.createElement("div");
            tooltip.className = "attendance-tooltip";
            tooltip.textContent = noteText;

            td.appendChild(tooltip);
            td.classList.add("has-tooltip");
          }

        // Mostrar modal para notes
          icon.addEventListener("click", (e) => {
            e.stopPropagation();
            console.log("click")
            openAttendanceDetailModal({
              userId: input.dataset.userId,
              date: input.dataset.date,
              attendanceType: input.dataset.attendanceType,
              input // 👈 PASAMOS EL INPUT REAL
            });
          });

      // 🔹 Agregamos input + icon dentro del td
      td.appendChild(input);
      td.appendChild(icon);

      tr.appendChild(td);
    });

    // ==================================================
    // 🟢 Espacio visual
    // ==================================================

    const tdSpace = document.createElement("td");
    tdSpace.classList.add("total-col-space");
    tr.appendChild(tdSpace);

    // ==================================================
    // 🟢 Totales Ausentes previos
    // ==================================================

    const tdTotalPre = document.createElement("td");
    tdTotalPre.classList.add("total-col","total-previous");
    tdTotalPre.textContent = student.totalWeightedAbsences ?? 0; // ← aquí
    tr.appendChild(tdTotalPre);

     // ==================================================
    // 🟢 Totales Aistencias
    // ==================================================

     const tdTotalP = document.createElement("td");
    tdTotalP.classList.add("total-col","total-p");
    tdTotalP.textContent = totalPresents;
    tr.appendChild(tdTotalP);

    // ==================================================
    // 🟢 Espacio visual
    // ==================================================

    const tdSpace1 = document.createElement("td");
    tdSpace1.classList.add("total-col-space");
    tr.appendChild(tdSpace1);

     // ==================================================
    // 🟢 Totales Justificados
    // ==================================================

    const tdTotalJ = document.createElement("td");
    tdTotalJ.classList.add("total-col","total-j");
    tdTotalJ.textContent = totalJustified;
    tr.appendChild(tdTotalJ);

    // ==================================================
    // 🟢 Totales Ausentes
    // ==================================================

    const tdTotalA = document.createElement("td");
    tdTotalA.classList.add("total-col","total-a");
    tdTotalA.textContent = totalAbsents;
    tr.appendChild(tdTotalA);

    // ==================================================
    // 🟢 Totales ED
    // ==================================================
    const tdTotalAED = document.createElement("td");
    tdTotalAED.classList.add("total-col","total-aed");
    tdTotalAED.textContent = totalAbsentsED;
    tr.appendChild(tdTotalAED);

    // ==================================================
    // 🟢 Espacio visual
    // ==================================================
    const tdSpace3 = document.createElement("td");
    tdSpace3.classList.add("total-col-space");
    tr.appendChild(tdSpace3);

    const tdTotalAGeneral = document.createElement("td");
    tdTotalAGeneral.classList.add("total-col","total-a-general");
    tdTotalAGeneral.textContent = totalAbsents + totalAbsentsED ;
    tr.appendChild(tdTotalAGeneral);

    tbody.appendChild(tr);
  });
}

function renderFooterTotals(tbody, monthDates) {

  const dateIndexMap = {};
  monthDates.forEach((date, i) => {
    dateIndexMap[date] = i;
  });

  const rows = tbody.querySelectorAll("tr[data-gender]");

  const totals = {
    masculino: {
      P: Array(monthDates.length).fill(0),
      A: Array(monthDates.length).fill(0),
      COUNT: 0
    },
    femenino: {
      P: Array(monthDates.length).fill(0),
      A: Array(monthDates.length).fill(0),
      COUNT: 0
    }
  };

  const dayHasData = Array(monthDates.length).fill(false);

  rows.forEach(tr => {

    const gender = tr.dataset.gender;
    if (!totals[gender]) return;

    totals[gender].COUNT++;

    const inputs = tr.querySelectorAll("td input.attendance-input");

    inputs.forEach((input) => {

      const date = input.dataset.date;
      const realIndex = dateIndexMap[date];

      const dayOfWeek = getDayOfWeek(date);
      if (dayOfWeek === 0 || dayOfWeek === 6) return;

      const value = input.value.toUpperCase();

      if (["P", "T", "A", "J"].includes(value)) {
        dayHasData[realIndex] = true;
      }

      if (value === "P" || value === "T") {
        totals[gender].P[realIndex]++;
      }

      if (value === "A" || value === "J") {
        totals[gender].A[realIndex]++;
      }

    });

  });

  // =========================
  // 🔹 CREAR FILAS
  // =========================
  createEmptyRow(tbody, monthDates);

  createFooterRowByDay(tbody, "VARONES PRESENTES", totals.masculino.P, monthDates, dayHasData);
  createFooterRowByDay(tbody, "VARONES AUSENTES", totals.masculino.A, monthDates, dayHasData);
  createFooterRowByDay(
    tbody,
    "TOTAL VARONES",
    Array(monthDates.length).fill(totals.masculino.COUNT),
    monthDates,
    dayHasData
  );

  createEmptyRow(tbody, monthDates);

  createFooterRowByDay(tbody, "MUJERES PRESENTES", totals.femenino.P, monthDates, dayHasData);
  createFooterRowByDay(tbody, "MUJERES AUSENTES", totals.femenino.A, monthDates, dayHasData);
  createFooterRowByDay(
    tbody,
    "TOTAL MUJERES",
    Array(monthDates.length).fill(totals.femenino.COUNT),
    monthDates,
    dayHasData
  );

  createEmptyRow(tbody, monthDates);

  const totalPresentes = monthDates.map((_, i) =>
    totals.masculino.P[i] + totals.femenino.P[i]
  );

  const totalAusentes = monthDates.map((_, i) =>
    totals.masculino.A[i] + totals.femenino.A[i]
  );

  const totalInscriptos = Array(monthDates.length).fill(
    totals.masculino.COUNT + totals.femenino.COUNT
  );

  createFooterRowByDay(tbody, "PRESENTES TOTALES", totalPresentes, monthDates, dayHasData);
  createFooterRowByDay(tbody, "AUSENTES TOTALES", totalAusentes, monthDates, dayHasData);
  createFooterRowByDay(tbody, "TOTAL INSCRIPTOS", totalInscriptos, monthDates, dayHasData);
}

// =======================================================================================
// 🟢 Render  Educacion fisica
// =======================================================================================

// =======================================================================================
// Render  Educacion fisica -Hender
// =======================================================================================
function renderHeaderED(thead, monthDates) {
  const dayInitials = ["D", "L", "M", "M", "J", "V", "S"];

  // ========================
  // Fila 1: título general
  // ========================
  const trTitle = document.createElement("tr");
  const thTitle = document.createElement("th");
  thTitle.colSpan = 3 + monthDates.length + 2; // columnas fijas + días + totales
  thTitle.textContent = "Registro de asistencia Educación Física";
  thTitle.classList.add("attendance-title");
  thTitle.style.textAlign = "center";
  thTitle.style.fontWeight = "bold";
  thTitle.style.fontSize = "1.1em";
  trTitle.appendChild(thTitle);
  thead.appendChild(trTitle);

  // ========================
  // Fila 2: columnas fijas + días + totales
  // ========================
  const tr = document.createElement("tr");

  // Columnas fijas
  ["#", "Nombre", "DNI"].forEach(text => {
    const th = document.createElement("th");
    th.classList.add("sticky-col");
    th.textContent = text;
    tr.appendChild(th);
  });

  // Columnas por día
  monthDates.forEach(date => {
    const dayOfWeek = getDayOfWeek(date);
    const th = document.createElement("th");
    th.classList.add("attendance-day-header");

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      th.textContent = ""; // fin de semana vacío
    } else {
      th.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
          <span class="day-initial">${dayInitials[dayOfWeek]}</span>
          <span class="day-number">${date.split("-")[2]}</span>
          <button class="fill-present-btn" data-date="${date}" title="Completar P todos">
            <i class="fa fa-arrow-down"></i>
          </button>
        </div>
      `;
    }

    tr.appendChild(th);
  });

  // Totales ED: presentes y ausentes
  const thTotalP = document.createElement("th");
  thTotalP.classList.add("total-col");
  thTotalP.textContent = "Total P";
  tr.appendChild(thTotalP);

  const thTotalA = document.createElement("th");
  thTotalA.classList.add("total-col");
  thTotalA.textContent = "Total A";
  tr.appendChild(thTotalA);

  thead.appendChild(tr);
}
// =======================================================================================
// 🟢 Render body Educación Física
// =======================================================================================
function renderPhysicalEducationTable(studentsGrades, year, month) {
  if (!month || !year) return;

  const attendanceTable = document.getElementById("preceptorAttendanceTable");
  const thead = attendanceTable.querySelector("thead");
  const tbody = attendanceTable.querySelector("tbody");

  thead.innerHTML = "";
  tbody.innerHTML = "";

  const monthDates = getMonthDays(year, month);

  // Render header
  renderHeaderED(thead, monthDates);

  // Render body
  studentsGrades.forEach((student, index) => {
    const tr = document.createElement("tr");
    tr.dataset.userId = student.userId;

    // =======================
    // Columnas fijas
    // =======================
    const tdIndex = document.createElement("td");
    tdIndex.classList.add("sticky-col");
    tdIndex.textContent = index + 1;
    tr.appendChild(tdIndex);

    const tdName = document.createElement("td");
    tdName.classList.add("sticky-col");
    tdName.textContent = student.name;
    tr.appendChild(tdName);

    const tdDni = document.createElement("td");
    tdDni.classList.add("sticky-col");
    tdDni.textContent = student.dni;
    tr.appendChild(tdDni);

    // =======================
    // Mapa de detalles por fecha (solo ED)
    // =======================
    const detailsMap = new Map();
    (student.details || []).forEach(d => {
      if (d.attendanceType === "physical_education") {
        if (!detailsMap.has(d.date)) detailsMap.set(d.date, []);
        detailsMap.get(d.date).push(d);
      }
    });

    let totalPresents = 0;
    let totalAbsents = 0;

    monthDates.forEach(date => {
      const td = document.createElement("td");
      td.classList.add("attendance-cell");

      const dayOfWeek = getDayOfWeek(date);
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        td.classList.add("weekend");
        tr.appendChild(td);
        return;
      }

      const records = detailsMap.get(date) || [];
      let code = "";

      records.forEach(record => {
        if (record.status === "present") {
          code = "P";
          totalPresents++;
        } else if (record.status === "absent") {

            if (record.justification?.isJustified) {
              code = "J";
            } else {
              code = "A";
              totalAbsents++;
            }

            
          }

      });

      // =======================
      // Input editable
      // =======================
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.classList.add("attendance-input");
      input.dataset.userId = student.userId;
      input.dataset.date = date;
      input.dataset.attendanceType = "physical_education";
      input.value = code;
      input.dataset.originalValue = input.value;

      // Solo acepta P o A
      input.addEventListener("input", () => {
        const value = input.value.toUpperCase();
        if (["P", "A" , "J"].includes(value)) {
          td.classList.add("show-icon");
        } else {
          td.classList.remove("show-icon");
        }

        // Actualiza totales
        recalculateRowTotalsED(tr);
      });

      input.addEventListener("focus", () => td.classList.add("show-icon"));
      input.addEventListener("blur", () => td.classList.remove("show-icon"));

      applyAttendanceStyle(input);
      updateIconState(input);

      // Icono de nota (opcional, aunque ED no requiere)
      const icon = document.createElement("i");
      icon.className = "edit-note-icon fa-solid fa-pencil";
      icon.addEventListener("click", (e) => {
        e.stopPropagation();
        openAttendanceDetailModal({
          userId: input.dataset.userId,
          date: input.dataset.date,
          attendanceType: input.dataset.attendanceType,
          input
        });
      });

      td.appendChild(input);
      td.appendChild(icon);
      tr.appendChild(td);
    });

    // =======================
    // Totales
    // =======================
    const tdTotalP = document.createElement("td");
    tdTotalP.classList.add("total-col", "total-p");
    tdTotalP.textContent = totalPresents;
    tr.appendChild(tdTotalP);

    const tdTotalA = document.createElement("td");
    tdTotalA.classList.add("total-col", "total-a-ed");
    tdTotalA.textContent = totalAbsents;
    tr.appendChild(tdTotalA);

    tbody.appendChild(tr);
  });
}
// =======================================================================================
// 🟢 Render asistencias/Inasistencias Informe
// =======================================================================================

function renderTableInforme(studentsGrades = []) {

  const table = document.getElementById("preceptorAttendanceInformeTable");

    if (!table) {
      return; // 🔥 no romper nunca en producción
    }
    
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  // 🔹 Calculamos datos
  const {
    totalAsistencias,
    totalInasistencias,
    asistenciaMedia,
    porcentajeAsistencia
  } = calculateInformeFromStudents(studentsGrades);

  // 🔹 Limpiar tabla
  thead.innerHTML = "";
  tbody.innerHTML = "";

  // =============================
  // 🟢 Header
  // =============================
  thead.innerHTML = `
    <tr>
      <th class="informe-title">Asistencias / Inasistencias</th>
      <th class="informe-total">Total</th>
    </tr>
  `;

  // =============================
  // 🟢 Body con datos reales
  // =============================
  tbody.innerHTML = `
    <tr>
      <td>Total de asistencias</td>
      <td>${totalAsistencias}</td>
    </tr>

    <tr>
      <td>Total de inasistencias</td>
      <td>${totalInasistencias}</td>
    </tr>

    <tr>
      <td>Asistencia media</td>
      <td>${asistenciaMedia}</td>
    </tr>

    <tr class="informe-highlight">
      <td>% de asistencia</td>
      <td>${porcentajeAsistencia} %</td>
    </tr>
  `;
}
// ======================================================================================================================
// 🟢 Funciones  Para el render - principal
// ======================================================================================================================
async function loadAndRenderAttendance() {

  // 🔒 Validaciones
  if (!selectedCourse || !selectedYear || !selectedMonth) {
    return;
  }

  try {

    // 1️⃣ Traer alumnos del curso
    studentsInfo = await fetchGetStudentsByCourse(selectedCourse);

    // 2️⃣ Traer asistencia del mes
    const attendanceMonth = await fetchGetAttendanceForMonth(
      selectedCourse,
      selectedYear,
      selectedMonth
    );
    // 3️⃣ Traer asistencia de meses anteriores
    const attendancePreviousStudents = await fetchGetPreviousAttendance(
      selectedCourse,
      selectedYear,
      selectedMonth
    );

    //console.log("attendancePreviousStudents,", attendancePreviousStudents)


    // 4️⃣ Mapear para la tabla
    studentsGrades = mapStudentsForTable(
      studentsInfo,
      attendanceMonth,
      attendancePreviousStudents
    );

    //console.log("studentsGrades,", studentsGrades)

    // 4️⃣ Render
    renderAttendanceTable(studentsGrades, selectedYear, selectedMonth);
      console.log("studentsGrades ",studentsGrades)
    renderTableInforme(studentsGrades);

  } catch (error) {
    console.error("Error cargando asistencia:", error);
  }
}
// =======================================================================================
// 🟢 Funciones  Para el render
// =======================================================================================
//Atualiza totales por alumnos 
function recalculateRowTotals(tr) {

  let totalPresents = 0;
  let totalAbsents = 0;
  let totalJustified = 0;

  const inputs = tr.querySelectorAll("input.attendance-input");

  inputs.forEach(input => {

    const value = input.value.toUpperCase();

    if (value === "P") totalPresents++;
    if (value === "T") {
      totalPresents++;
      totalAbsents += 0.25;
    }
    if (value === "A") totalAbsents++;
    if (value === "J") totalJustified++;

  });

  const tdP = tr.querySelector(".total-p");
  const tdJ = tr.querySelector(".total-j");
  const tdA = tr.querySelector(".total-a");
  const tdAGeneral = tr.querySelector(".total-a-general");

  if (tdP) tdP.textContent = totalPresents;
  if (tdJ) tdJ.textContent = totalJustified;
  if (tdA) tdA.textContent = totalAbsents;
  if (tdAGeneral) tdAGeneral.textContent = totalAbsents; // si no incluís ED acá

}

function recalculateRowTotalsED(tr) {
  let totalPresents = 0;
  let totalAbsents = 0;

  const inputs = tr.querySelectorAll("input.attendance-input");

  inputs.forEach(input => {
    const value = input.value.toUpperCase();
    if (value === "P") totalPresents++;
    if (value === "A") totalAbsents += 0.5;
  });

  const tdP = tr.querySelector(".total-p");
  const tdA = tr.querySelector(".total-a-ed");

  if (tdP) tdP.textContent = totalPresents;
  if (tdA) tdA.textContent = totalAbsents;
}
//createFooterRow alineado perfecto
function createFooterRowByDay(tbody, label, valuesArray, monthDates, dayHasData) {

  const tr = document.createElement("tr");
  tr.classList.add("table-secondary", "fw-bold", "footer-row");

  // 🔹 3 columnas fijas
  tr.appendChild(document.createElement("td"));

  const tdName = document.createElement("td");
  tdName.textContent = label;
  tr.appendChild(tdName);

  tr.appendChild(document.createElement("td"));

  // 🔹 Columnas por día
  monthDates.forEach((date, i) => {

    const td = document.createElement("td");
    const dayOfWeek = getDayOfWeek(date);

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      td.classList.add("weekend");
      td.textContent = "";
    } else {
      td.textContent = dayHasData[i] ? valuesArray[i] : "";
    }

    tr.appendChild(td);
  });

  // 🔹 8 columnas finales vacías
  for (let i = 0; i < 9; i++) {
    tr.appendChild(document.createElement("td"));
  }

  tbody.appendChild(tr);
}
//Actualiozar los totales 
function recalculateFooter(tbody, monthDates) {

  // 🔥 Eliminar solo footers
  const oldFooters = tbody.querySelectorAll(".footer-row");
  oldFooters.forEach(row => row.remove());

  // 🔥 Volver a generar
  renderFooterTotals(tbody, monthDates);
}
//EmptyRow fila vacia para espacio
function createEmptyRow(tbody, monthDates) {

  const tr = document.createElement("tr");
  const td = document.createElement("td");

  tr.classList.add("footer-row");

  td.colSpan = 3 + monthDates.length + 9;
  td.innerHTML = "&nbsp;";

  tr.appendChild(td);
  tbody.appendChild(tr);
}
function openAttendanceDetailModal({ userId, date, attendanceType, input }) {

  const key = `${userId}_${date}`;

  // 🔎 Obtener nota actual (buffer o dataset)
  let currentNote = attendanceChanges.get(key)?.notes;

  if (currentNote === undefined) {
    currentNote = input.dataset.note || "";
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "attendance-modal";

  modal.innerHTML = `
    <div class="attendance-modal-header">
      <h3>Observación</h3>
      <button id="cancelNote">&times;</button>
    </div>

    <p><strong>Fecha:</strong> ${date}</p>

    <textarea 
      id="attendanceNote" 
      rows="3" 
      placeholder="Escribí la observación..."
    ></textarea>

    <div class="modal-buttons">
      <button id="saveNote">Guardar</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // ✅ Insertar valor de forma segura (sin innerHTML dinámico)
  const textarea = modal.querySelector("#attendanceNote");
  textarea.value = currentNote || "";
  textarea.focus();

  modal.querySelector("#cancelNote").onclick = () => overlay.remove();

  modal.querySelector("#saveNote").onclick = () => {

    const note = textarea.value.trim();
    const originalNote = input.dataset.note || "";
    const originalValue = input.dataset.originalValue || "";

    // ==================================================
    // 🔥 Detectar cambio real (nota + asistencia)
    // ==================================================

    if (
      note === originalNote &&
      input.value === originalValue
    ) {
      attendanceChanges.delete(key);
    } else {
      const payload = buildAttendancePayload(input, note);
      attendanceChanges.set(key, payload);
    }

    // ==================================================
    // 🔥 Actualizar dataset para mantener sincronizado
    // ==================================================

    input.dataset.note = note;

    // ==================================================
    // 🔥 Tooltip dinámico
    // ==================================================

    const td = input.closest("td");
    let tooltip = td.querySelector(".attendance-tooltip");

    if (!tooltip && note !== "") {
      tooltip = document.createElement("div");
      tooltip.className = "attendance-tooltip";
      td.appendChild(tooltip);
    }

    if (tooltip) {
      tooltip.textContent = note;
    }

    td.classList.toggle("has-tooltip", note !== "");
    input.classList.toggle("has-note", note !== "");

    // ==================================================
    // 🔥 Control botón guardar masivo
    // ==================================================

    saveAttendanceBtn.disabled = attendanceChanges.size === 0;

    overlay.remove();
  };
}
//Para hacer visible el icono de agregar observaciones - Cuando tiene las opciones (A-P-J-T)
function updateIconState(input) {

  const td = input.closest("td.attendance-cell");
  if (!td) return;

  const value = input.value.toUpperCase();

  if (["P", "A", "T", "J"].includes(value)) {
    td.classList.add("has-attendance");
  } else {
    td.classList.remove("has-attendance");
  }
}
//Función que convierte letra → payload
function buildAttendancePayload(input, note = null) {

  const value = input.value.toUpperCase();

  let attendanceStatus = null;
  let late = { isLate: false };
  let justification = { isJustified: false };

  switch (value) {

    case "P":
      attendanceStatus = "present";
      break;

    case "T":
      attendanceStatus = "present";
      late = { isLate: true };
      break;

    case "A":
      attendanceStatus = "absent";
      break;

    case "J":
      attendanceStatus = "absent";
      justification = { isJustified: true };
      break;

    case "":
      attendanceStatus = null;
      break;
  }

  return {
    userId: input.dataset.userId,
    courseId: selectedCourse,
    academicYear: selectedYear,
    trimester: Number(trimester),
    date: input.dataset.date,
    attendanceType: input.dataset.attendanceType,
    attendanceStatus,
    late,
    justification,
    notes: note ?? ""
  };
}
//Función para aplicar estilos
function applyAttendanceStyle(input) {

  input.classList.remove(
    "attendance-p",
    "attendance-a",
    "attendance-t",
    "attendance-j"
  );

  const value = input.value.toUpperCase();

  switch (value) {
    case "P":
      input.classList.add("attendance-p");
      break;
    case "T":
      input.classList.add("attendance-t");
      break;
    case "A":
      input.classList.add("attendance-a");
      break;
    case "J":
      input.classList.add("attendance-j");
      break;
  }
}

//generar todas las fechas del mes
function getMonthDays(year, month) {
  const days = [];
  const date = new Date(year, month - 1, 1);

  while (date.getMonth() === month - 1) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    days.push(`${y}-${m}-${d}`);
    date.setDate(date.getDate() + 1);
  }

  return days;
}

// para día de semana
// 🔒 Fecha segura (sin UTC)
function getDayOfWeek(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}
// =======================================================================================
// 🟢 Funciones
// =======================================================================================
// mapear studetsGrade coninformacion y asistencias de alumnos
function mapStudentsForTable(
  studentsInfo = [],
  attendanceMonth = [],
  attendancePreviousStudents = []
) {
  if (!Array.isArray(studentsInfo)) return [];

  // 1️⃣ Ordenamos A → Z por nombre
  const sortedStudents = [...studentsInfo].sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  );

  // 2️⃣ Convertimos attendanceMonth en mapa por userId como string
  const attendanceMap = new Map(
    (attendanceMonth || []).map(a => [
      String(a.userId || a._id),
      a
    ])
  );

  // 3️⃣ Convertimos attendancePreviousStudents en mapa por userId como string
  const previousMap = new Map(
    (attendancePreviousStudents?.data || []).map(a => [
      String(a.userId || a._id),
      a
    ])
  );

  // 4️⃣ Armamos estructura final
  const studentsGrades = sortedStudents.map(student => {
    const userIdStr = String(student._id);

    const attendance = attendanceMap.get(userIdStr);
    const previousAttendance = previousMap.get(userIdStr);

    return {
      userId: student._id,
      dni: student.dni,
      name: student.name,
      email: student.email,
      genero: student.genero,
      status: student.status,
      presents: attendance?.presents ?? 0,
      absents: attendance?.absents ?? 0,
      details: attendance?.details ?? [],
      totalWeightedAbsences: previousAttendance?.totalWeightedAbsences ?? 0
    };
  });

  return studentsGrades;
}
// actualizar studetsGrade al enviar al back 
function applyAttendanceChanges() {

  attendanceChanges.forEach((change, key) => {

    const parts = key.split("_");

    const userId = parts[0];
    const date = parts[1];
    const attendanceType = parts.slice(2).join("_");

    const student = studentsGrades.find(s => s.userId === userId);
    if (!student) return;

    const existingIndex = student.details.findIndex(d =>
      d.date === date && d.attendanceType === attendanceType
    );

    const normalizedDetail = {
      date,
      attendanceType,
      trimester: change.trimester,
      status: change.attendanceStatus, // 🔥 siempre usar status
      notes: change.notes || "",
      late: change.late || { isLate: false },
      justification: change.justification || { isJustified: false }
    };

    if (existingIndex !== -1) {
      // 🔁 Reemplazo limpio
      student.details[existingIndex] = {
        ...student.details[existingIndex],
        ...normalizedDetail
      };
    } else {
      // ➕ Nuevo
      student.details.push(normalizedDetail);
    }

  });

}
// Calculo poara los informe
function calculateInformeFromStudents(studentsGrades = []) {

  let totalAsistencias = 0;
  let totalInasistencias = 0;

  // Para contar días hábiles únicos
  const diasHabilesSet = new Set();

  studentsGrades.forEach(student => {

    const regularDetails = (student.details || []).filter(
      d => d.attendanceType === "regular"
    );

    regularDetails.forEach(detail => {

      // Guardamos la fecha como día hábil
      diasHabilesSet.add(detail.date);

      if (detail.status === "present") {
        totalAsistencias++;
      }

      if (detail.status === "absent") {
        totalInasistencias++;
      }

    });

  });

  const asistenciaIdeal = totalAsistencias + totalInasistencias;

  const diasHabiles = diasHabilesSet.size;

  const porcentajeAsistencia =
    asistenciaIdeal > 0
      ? ((totalAsistencias * 100) / asistenciaIdeal).toFixed(2)
      : 0;

  const asistenciaMedia =
    diasHabiles > 0
      ? (totalAsistencias / diasHabiles).toFixed(2)
      : 0;

  return {
    totalAsistencias,
    totalInasistencias,
    asistenciaIdeal,
    diasHabiles,
    asistenciaMedia,
    porcentajeAsistencia
  };
}
// =======================================================================================
// 🟢 Fetch 
// =======================================================================================
// =============================
// 🟢 Fetch - Obtener cursos asignados a un preceptor por año (userId desde localStorage)
// =============================
async function fetchGetCoursesByYear(year) {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user")); // recordá parsear el JSON

    if (!token) {
      console.warn("No hay token disponible");
      return [];
    }

    if (!user?.id) {
      console.warn("No hay usuario logueado");
      return [];
    }

    if (!year) {
      console.warn("Debe indicar un año académico");
      return [];
    }

    const usersId = user.id;

    console.log(usersId, year)
    // Llamada al endpoint
    const response = await fetch(
      `${API_URL}/api/course/${usersId}/AssignedToCourse?year=${year}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: No se pudieron cargar los cursos`);
    }

    const result = await response.json();
    return result?.data ?? [];

  } catch (error) {
    uiToast("Error al obtener cursos en servidor", "error");
    console.error("fetchGetCoursesByYear:", error.message);
    return [];
  }
}
// =============================
// 🟢 Fetch - Buscar estudiantes de un curso
// =============================
async function fetchGetStudentsByCourse(courseId) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("No hay token disponible");
      return [];
    }

    if (!courseId) {
      console.warn("Debe indicar un curso válido");
      return [];
    }

    const response = await fetch(`${API_URL}/api/course/${courseId}/students`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error ${response.status}: ${text}`);
    }

    const result = await response.json();
    // Normalizar datos: asegurarse de que cada estudiante tenga status
    return Array.isArray(result?.data)
      ? result.data.map(s => ({
          _id: s.student._id,
          name: s.student ? `${s.student.apellido} ${s.student.nombre}` : "Alumno no encontrado",
          genero: s.student.genero || "No asignado" ,
          dni: s.student?.dni || "-",
          email: s.student?.email || "-",
          status: s.status || "No asignado"
        }))
      : [];

  } catch (error) {
    uiToast("Error al obtener informacion sobre el curso en el servidor", "error");
    console.error("fetchGetStudentsByCourse:", error.message);
    return [];
  }
}
// =============================
//  🟢 Fetch Buscar inancistencias por curso/año/mes 
// =============================

async function fetchGetAttendanceForMonth(courseId, year, month) {
  try {
    const res = await fetch(
      `${API_URL}/api/attendance/course/month/${courseId}?year=${year}&month=${month}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res.ok) {
      console.error("Error al traer las asistencias:", res.status, res.statusText);
      uiToast("Error al traer las asistencias del curso", "error");
      return []; // array vacío en caso de error
    }

    const data = await res.json();
    const attendances = data.data || [];

    return attendances || []; // devolvemos siempre un array
  } catch (error) {
    console.error("Error al conectar con el servidor:", error);
    uiToast("Error al conectar con el servidor para traer las asistencias", "error");
    return []; // array vacío
  }
}

// =============================
// 🟢 Fetch Buscar inasistencias acumuladas meses anteriores
// =============================
async function fetchGetPreviousAttendance(courseId, year, month) {
  try {
    const token = localStorage.getItem("token"); // asegurarse de tener token
    if (!token) throw new Error("No se encontró token de autenticación");

    const res = await fetch(
      `${API_URL}/api/attendance/${courseId}/previous?year=${year}&month=${month}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!res.ok) {
      console.error(
        "Error al traer las asistencias Previas:",
        res.status,
        res.statusText
      );
      uiToast("Error al traer las asistencias previas del curso", "error");
      return [];
    }

    const data = await res.json();
    const attendances = data || [];
    return attendances; // siempre devolvemos un array
  } catch (error) {
    console.error("Error al conectar con el servidor:", error);
    uiToast(
      "Error al conectar con el servidor para traer las asistencias previas",
      "error"
    );
    return [];
  }
}


// =============================
//  🟢 Fetch Cargar asistencias/inasistencias Masiva
// =============================

async function fetchPostAttendanceForMonth(courseId, academicYear, trimester, attendanceChanges ) {

  if (!attendanceChanges || attendanceChanges.size === 0) {
    uiToast("No hay cambios para guardar", "info");
    return null;
  }
  
  try {

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_URL}/api/attendance/massive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        courseId,
        academicYear,
        trimester: Number(trimester),
        attendanceType: selectedType,
        changes: [...attendanceChanges.values()] // 🔥 convertimos Map → Array
      })
    });

    const data = await response.json();

    if (!response.ok) {
      uiToast(data?.message || "Error al guardar asistencia", "error");
      return null;
    }

    uiToast("Asistencias guardadas correctamente", "success");

    applyAttendanceChanges()

    // 🔥 limpiar buffer
    attendanceChanges.clear();

    // 🔥 actualizar valores originales
    document.querySelectorAll(".attendance-input").forEach(input => {
      input.dataset.originalValue = input.value;
    });

    saveAttendanceBtn.disabled = true;

    return data;

  } catch (error) {
    console.error("Error:", error);
    uiToast("Error al conectar con el servidor", "error");
    return null;
  }
}