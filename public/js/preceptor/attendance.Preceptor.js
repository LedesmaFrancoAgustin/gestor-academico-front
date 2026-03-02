// =============================
// 🟢 Referencias al DOM
// =============================
const academicYearSelect = document.getElementById("academicYearSelect");
const courseSelect = document.getElementById("courseSelect");
const monthSelect = document.getElementById("monthSelect");
const typeClassSelect = document.getElementById("attendanceTypeSelect")
const dateSelect = document.getElementById("attendanceDateSelect");
const searchInput = document.getElementById("attendanceSearch");

attendanceDateSelect

const saveAttendanceBtn = document.getElementById("saveAttendanceBtn");

let selectedYear = null
let selectedCourse = null
let selectedMonth = null
let selectedSearchInput = null
let selectedType = "regular"          // Tipo de asistencia ED O Clase

let selectedDate = null;    //fecha seleccionada

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

  loadBusinessDaysInSelect(selectedYear, selectedMonth);
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
  selectedDate = null;
  loadBusinessDaysInSelect(selectedYear, selectedMonth);
  await loadAndRenderAttendance();

  dateSelect.disabled = false;
});
// =============================
//  Selector de dia
// =============================
dateSelect.addEventListener("change", () => {
  selectedDate = dateSelect.value;
  renderByTypeAndDevice();
});
// =======================================================================================
// 🔹 Select para cambiar tipo de asistencia
// =======================================================================================

typeClassSelect.addEventListener("change", (e) => {
  selectedType = e.target.value;
  
  renderByTypeAndDevice();

});


searchInput.addEventListener("input", () => {

  const value = searchInput.value.trim().toLowerCase();
  const isDesktop = window.innerWidth > 768;

  // 🔎 Seleccionamos tabla según versión
  const tableSelector = isDesktop
    ? "#preceptorAttendanceTable"
    : "#preceptorAttendanceMobileTable";

  const tbody = document.querySelector(`${tableSelector} tbody`);
  if (!tbody) return;

  const rows = tbody.querySelectorAll("tr[data-user-id]"); 
  // 🔥 IMPORTANTE: solo filas de alumnos (evita footer)

  rows.forEach(tr => {

    const name = tr.children[1]?.textContent.toLowerCase() || "";

    // 🔎 DNI puede no existir en mobile → lo buscamos seguro
    const dniCell = tr.children[2];
    const dni = dniCell?.textContent?.toLowerCase() || "";

    const match = name.includes(value) || dni.includes(value);

    tr.style.display = match ? "" : "none";
  });

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
 //console.log("monthSelect: ",selectedMonth)
  // 🔥 Guardar en el backend
  await fetchPostAttendanceForMonth(selectedCourse, selectedYear, selectedMonth , attendanceChanges);
});

// =============================
//  Mensaje de avisar para guardar cambios
// =============================
window.addEventListener("beforeunload", function (e) {

  // Si el botón está habilitado → hay cambios sin guardar
  if (!saveAttendanceBtn.disabled) {

    e.preventDefault();
    e.returnValue = ""; // requerido por navegadores modernos

  }

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


// ==============================================================================================================================================================
// 🟢 Render  - Escritorio
// =============================================================================================================================================================
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

  const totalCols = 3 + monthDates.length + 10; // columnas fijas + días + totales
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

  [ "Anterior","Asistencia", "", "J", "A", "EF", "", "A / Mes ","A / General "].forEach(text => {
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
    // 🟢 Crear mapa rápido por fecha a partir de student.records
    // ==================================================

    const detailsMap = new Map();

    Object.entries(student.records || {}).forEach(([key, record]) => {
      //const [dayStr, attendanceType] = key.split("_");
      //const date = parseInt(dayStr, 10); // día como número

      const [dayStr, ...typeParts] = key.split("_");
      const attendanceType = typeParts.join("_"); // ← CORRECCIÓN
      const date = parseInt(dayStr, 10); // día como número

      if (!detailsMap.has(date)) detailsMap.set(date, []);
      detailsMap.get(date).push({
        ...record,
        attendanceType,
        date
      });
    });

    let totalPresents = 0;
    let totalAbsents = 0;
    let totalAbsentsED = 0;
    let totalJustified = 0;

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

       // 🔹 Aquí el fix: obtener el día del mes
      const day = parseInt(date.split("-")[2], 10); // "2026-03-02" → 2
      const records = detailsMap.get(day) || [];


      let code = "";
      let noteText = "";

      records.forEach(record => {

        // 🚫 EDUCACIÓN FÍSICA → NO SE MUESTRA
        if (record.attendanceType === "physical_education") {

          if (record.status === "absent" && !record.justified?.isJustified) {
            totalAbsentsED += 0.5; // media falta
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

            if (record.justified?.isJustified) {
              code = "J";
              totalJustified++;
            } else {
              code = "A";
              totalAbsents++;
            }
          }
        }

      });

      // ==================================================
      // 🔹 Crear input + icon dentro del td
      // ==================================================
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.classList.add("attendance-input");
      input.dataset.userId = student.userId;
      input.dataset.date = date;
      input.dataset.attendanceType = "regular";
      input.value = code || "";
      input.dataset.originalValue = input.value || "";

      input.addEventListener("focus", () => {
        const td = input.closest("td.attendance-cell");
        if (!td) return;
        if (["P", "A", "T", "J"].includes(input.value.toUpperCase())) td.classList.add("show-icon");
      });
      input.addEventListener("blur", () => {
        const td = input.closest("td.attendance-cell");
        if (!td) return;
        td.classList.remove("show-icon");
      });
      input.addEventListener("input", () => {
        const td = input.closest("td.attendance-cell");
        if (!td) return;
        const value = input.value.toUpperCase();
        if (["P", "A", "T", "J"].includes(value)) td.classList.add("show-icon");
        else td.classList.remove("show-icon");
        const tr = input.closest("tr");
        recalculateRowTotals(tr);
        recalculateFooter(tbody, monthDates);
      });

      applyAttendanceStyle(input);
      updateIconState(input);

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

    // ==================================================
    // 🟢 Espacios y totales
    // ==================================================
    const tdSpace = document.createElement("td"); tdSpace.classList.add("total-col-space"); tr.appendChild(tdSpace);

    const tdTotalPre = document.createElement("td");
    tdTotalPre.classList.add("total-col","total-previous");
    tdTotalPre.textContent = student.totalWeightedAbsences ?? 0;
    tr.appendChild(tdTotalPre);

    const tdTotalP = document.createElement("td");
    tdTotalP.classList.add("total-col","total-p");
    tdTotalP.textContent = totalPresents;
    tr.appendChild(tdTotalP);

    const tdSpace1 = document.createElement("td"); tdSpace1.classList.add("total-col-space"); tr.appendChild(tdSpace1);

    const tdTotalJ = document.createElement("td");
    tdTotalJ.classList.add("total-col","total-j");
    tdTotalJ.textContent = totalJustified;
    tr.appendChild(tdTotalJ);

    const tdTotalA = document.createElement("td");
    tdTotalA.classList.add("total-col","total-a");
    tdTotalA.textContent = totalAbsents;
    tr.appendChild(tdTotalA);

    const tdTotalAED = document.createElement("td");
    tdTotalAED.classList.add("total-col","total-aed");
    tdTotalAED.textContent = totalAbsentsED;
    tr.appendChild(tdTotalAED);

    const tdSpace3 = document.createElement("td"); tdSpace3.classList.add("total-col-space"); tr.appendChild(tdSpace3);

    const tdTotalAMonth = document.createElement("td");
    tdTotalAMonth.classList.add("total-col","total-a-general");
    tdTotalAMonth.textContent = totalAbsents + totalAbsentsED ;
    tr.appendChild(tdTotalAMonth);

    const tdTotalAGeneral = document.createElement("td");
    tdTotalAGeneral.classList.add("total-col","total-a-general");
    tdTotalAGeneral.textContent = totalAbsents + totalAbsentsED + student.totalWeightedAbsences ?? 0;
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
// 🟢 Render  Educacion fisica - Escritorio
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
// 🟢 Render body Educación Física adaptado a student.records
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
    // Mapa de detalles por día (solo ED)
    // =======================
    const detailsMap = new Map();
    Object.entries(student.records || {}).forEach(([key, record]) => {
      const [dayStr, ...typeParts] = key.split("_");
      const attendanceType = typeParts.join("_"); // ← CORRECCIÓN

      if (attendanceType !== "physical_education") return;

      const day = parseInt(dayStr, 10); // día del mes
      if (!detailsMap.has(day)) detailsMap.set(day, []);
      detailsMap.get(day).push({
        ...record,
        attendanceType,
        date: day
      });
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

      const day = parseInt(date.split("-")[2], 10); // día del mes
      const records = detailsMap.get(day) || [];
      let code = "";

      records.forEach(record => {
        if (record.status === "present") {
          code = "P";
          totalPresents++;
        } else if (record.status === "absent") {
          if (record.justified?.isJustified) {
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

      input.addEventListener("input", () => {
        const value = input.value.toUpperCase();
        if (["P", "A", "J"].includes(value)) td.classList.add("show-icon");
        else td.classList.remove("show-icon");
        recalculateRowTotalsED(tr);
      });
      input.addEventListener("focus", () => td.classList.add("show-icon"));
      input.addEventListener("blur", () => td.classList.remove("show-icon"));

      applyAttendanceStyle(input);
      updateIconState(input);

      // Icono de nota opcional
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
// ==============================================================================================================================================================
// 🟢 Render  - Mobile
// =============================================================================================================================================================
function renderAttendanceMobile(studentsGrades, selectedDate) {

  const wrapper = document.getElementById("mobileAttendanceContainer");
  const table = document.getElementById("preceptorAttendanceMobileTable");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  wrapper.style.display = "block";
  thead.innerHTML = "";
  tbody.innerHTML = "";

  // 🚨 Caso 1: No hay día seleccionado
    if (!selectedDate) {
    wrapper.style.display = "none";
    return;
  }

  // 🚨 Caso 2: No hay alumnos
  if (!studentsGrades || studentsGrades.length === 0) {
    renderMobileEmptyState(tbody, "No hay alumnos para mostrar");
    return;
  }

  // ✅ Render normal
  renderMobileHeader(thead, selectedDate);
  renderMobileBody(tbody, studentsGrades, selectedDate);
  renderMobileFooter(tbody, studentsGrades, selectedDate);
}

//Render Header - Mobile
function renderMobileHeader(thead, selectedDate) {

  const [year, month, day] = selectedDate.split("-");
  const formattedDate = `${day}/${month}`;

  const trTitle = document.createElement("tr");
  const thTitle = document.createElement("th");
  thTitle.colSpan = 5;
  thTitle.textContent = `Registro de clase - Fecha ${formattedDate}`;
  thTitle.classList.add("text-center");
  trTitle.appendChild(thTitle);
  thead.appendChild(trTitle);

  const tr = document.createElement("tr");

  ["#", "Alumno", "Estado", ""].forEach(text => {
    const th = document.createElement("th");
    th.textContent = text;
    tr.appendChild(th);
  });

  thead.appendChild(tr);
}
//Render body - Mobile
function renderMobileBody(tbody, studentsGrades, selectedDate) {

  const selectedDay = parseInt(selectedDate.split("-")[2], 10);

  studentsGrades.forEach((student, index) => {

    const tr = document.createElement("tr");
    tr.dataset.userId = student.userId;
    tr.dataset.gender = student.genero?.toLowerCase() || "";

    // ============================
    // 🟢 Columna #
    // ============================

    const tdIndex = document.createElement("td");
    tdIndex.textContent = index + 1;
    tr.appendChild(tdIndex);

    // ============================
    // 🟢 Nombre + DNI compacto
    // ============================

    const tdName = document.createElement("td");
    tdName.textContent = student.name; 

    tr.appendChild(tdName);

    

    // ============================
    // 🧠 MAPA DE RECORDS
    // ============================

    const detailsMap = new Map();

    Object.entries(student.records || {}).forEach(([key, record]) => {

      const [dayStr, ...typeParts] = key.split("_");
      const attendanceType = typeParts.join("_");
      const day = parseInt(dayStr, 10);

      if (!detailsMap.has(day)) detailsMap.set(day, []);
      detailsMap.get(day).push({
        ...record,
        attendanceType,
        day
      });

    });

    const records = detailsMap.get(selectedDay) || [];

    let code = "";
    let noteText = "";

    records.forEach(record => {

      if (record.attendanceType !== "regular") return;

      if (record.notes?.trim()) {
        noteText = record.notes;
      }

      if (record.status === "present") {
        code = record.late?.isLate ? "T" : "P";
      }

      if (record.status === "absent") {
        code = record.justified?.isJustified ? "J" : "A";
      }

    });

    // ============================
    // 🟢 Estado editable (SIN td icon extra)
    // ============================

    const tdStatus = document.createElement("td");
    tdStatus.classList.add("mobile-status-cell");

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 1;
    input.classList.add("attendance-input-mobile");

    input.dataset.userId = student.userId;
    input.dataset.date = selectedDate;
    input.dataset.attendanceType = "regular";

    input.value = code;
    input.dataset.originalValue = code;

    if (noteText) {
      input.dataset.note = noteText;
      input.classList.add("has-note");
    }

    // 🎯 INPUT EVENTS
    input.addEventListener("focus", () => {
      tdStatus.classList.add("active");
    });

    input.addEventListener("blur", () => {
      tdStatus.classList.remove("active");
    });

    input.addEventListener("input", () => {
      applyAttendanceStyle(input);
      renderMobileFooter(tbody, studentsGrades, selectedDate);
    });

    applyAttendanceStyle(input);

    // ============================
    // ✏️ ÍCONO FLOTANTE
    // ============================

    const icon = document.createElement("i");
    icon.className = "fa-solid fa-pencil floating-edit-icon";

    icon.addEventListener("click", () => {
      openAttendanceDetailModal({
        userId: input.dataset.userId,
        date: input.dataset.date,
        attendanceType: input.dataset.attendanceType,
        input
      });
    });

    tdStatus.appendChild(input);
    tdStatus.appendChild(icon);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  });
}
//Render Footer - Mobile
// Render Footer - Mobile (igual que escritorio pero por día seleccionado)
function renderMobileFooter(tbody) {

  // 🔥 Eliminar footer anterior si existe
  const oldFooter = tbody.querySelectorAll(".mobile-footer-row, .mobile-footer-separator");
  oldFooter.forEach(row => row.remove());

  const rows = tbody.querySelectorAll("tr[data-user-id]");

  const totals = {
    masculino: { P: 0, A: 0, COUNT: 0 },
    femenino: { P: 0, A: 0, COUNT: 0 }
  };

  rows.forEach(tr => {

    const gender = tr.dataset.gender;
    if (!totals[gender]) return;

    totals[gender].COUNT++;

    const input = tr.querySelector("input.attendance-input-mobile");
    if (!input) return;

    const value = input.value.toUpperCase();

    if (value === "P" || value === "T") {
      totals[gender].P++;
    }

    if (value === "A" || value === "J") {
      totals[gender].A++;
    }

  });

  const totalPresentes =
    totals.masculino.P + totals.femenino.P;

  const totalAusentes =
    totals.masculino.A + totals.femenino.A;

  const totalInscriptos =
    totals.masculino.COUNT + totals.femenino.COUNT;

  // =========================
  // 🔹 Separador
  // =========================

  const separator = document.createElement("tr");
  separator.classList.add("mobile-footer-separator");
  separator.innerHTML = `<td colspan="3"></td>`;
  tbody.appendChild(separator);

  // =========================
  // 🔹 Helper para crear fila
  // =========================

  function createFooterRow(label, value) {
    const tr = document.createElement("tr");
    tr.classList.add("mobile-footer-row");

    tr.innerHTML = `
      <td colspan="2"><strong>${label}</strong></td>
      <td style="text-align:center;"><strong>${value}</strong></td>
    `;

    tbody.appendChild(tr);
  }

  // =========================
  // 🔹 VARONES
  // =========================

  createFooterRow("VARONES PRESENTES", totals.masculino.P);
  createFooterRow("VARONES AUSENTES", totals.masculino.A);
  createFooterRow("TOTAL VARONES", totals.masculino.COUNT);

  // Espacio visual
  createFooterRow(" ", " ");

  // =========================
  // 🔹 MUJERES
  // =========================

  createFooterRow("MUJERES PRESENTES", totals.femenino.P);
  createFooterRow("MUJERES AUSENTES", totals.femenino.A);
  createFooterRow("TOTAL MUJERES", totals.femenino.COUNT);

  // Espacio visual
  createFooterRow(" ", " ");

  // =========================
  // 🔹 TOTALES GENERALES
  // =========================

  createFooterRow("PRESENTES TOTALES", totalPresentes);
  createFooterRow("AUSENTES TOTALES", totalAusentes);
  createFooterRow("TOTAL INSCRIPTOS", totalInscriptos);

}

// =======================================================================================
// 🟢 Render Educación Física - Mobile
// =======================================================================================
// =======================================================================================
// 🟢 Render Header Educación Física - Mobile
// =======================================================================================

function renderAttendanceEDMobile(studentsGrades, selectedDate) {

  const wrapper = document.getElementById("mobileAttendanceContainer");
  const table = document.getElementById("preceptorAttendanceMobileTable");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  wrapper.style.display = "block";
  thead.innerHTML = "";
  tbody.innerHTML = "";

  // 🚨 Caso 1: No hay día seleccionado
  if (!selectedDate) {
    wrapper.style.display = "none";
    return;
  }

  // 🚨 Caso 2: No hay alumnos
  if (!studentsGrades || studentsGrades.length === 0) {
    renderMobileEmptyState(tbody, "No hay alumnos para mostrar");
    return;
  }

  // ✅ Render normal
  renderHeaderEDMobile(thead, selectedDate);
  renderPhysicalEducationMobile(tbody, studentsGrades, selectedDate);
  renderPhysicalEducationMobileFooter(tbody);
}
// =======================================================================================
// 🟢 Render Header Educación Física - Mobile (adaptado)
// =======================================================================================
function renderHeaderEDMobile(thead, selectedDate) {

  if (!thead || !selectedDate) return;

  thead.innerHTML = "";

  const [year, month, day] = selectedDate.split("-");
  const formattedDate = `${day}/${month}`;

  // 🔹 Fila título
  const trTitle = document.createElement("tr");

  const thTitle = document.createElement("th");
  thTitle.colSpan = 5;
  thTitle.textContent = `Registro de E.F - Fecha ${formattedDate}`;
  thTitle.classList.add("attendance-title-mobile");

  trTitle.appendChild(thTitle);
  thead.appendChild(trTitle);

  // 🔹 Fila columnas
  const trColumns = document.createElement("tr");

  const columns = ["#", "Alumno", "Estado", "T/A"];

  columns.forEach(text => {
    const th = document.createElement("th");
    th.textContent = text;
    trColumns.appendChild(th);
  });

  thead.appendChild(trColumns);
}
function renderPhysicalEducationMobile(tbody, studentsGrades, selectedDate) {

  if (!selectedDate || !studentsGrades || !tbody) return;

  const selectedDay = parseInt(selectedDate.split("-")[2], 10);

  studentsGrades.forEach((student, index) => {

    const tr = document.createElement("tr");
    tr.dataset.userId = student.userId;
    tr.dataset.gender = student.genero?.toLowerCase() || "";

    // #
    const tdIndex = document.createElement("td");
    tdIndex.textContent = index + 1;
    tr.appendChild(tdIndex);

    // Nombre
    const tdName = document.createElement("td");
    tdName.textContent = student.name;
    tr.appendChild(tdName);

    // =========================
    // Map registros ED
    // =========================
    const detailsMap = new Map();

    Object.entries(student.records || {}).forEach(([key, record]) => {

      const [dayStr, ...typeParts] = key.split("_");
      const attendanceType = typeParts.join("_");

      if (attendanceType !== "physical_education") return;

      const day = parseInt(dayStr, 10);
      if (!detailsMap.has(day)) detailsMap.set(day, []);
      detailsMap.get(day).push(record);

    });

    // Código día seleccionado
    const recordsToday = detailsMap.get(selectedDay) || [];
    let code = "";

    recordsToday.forEach(record => {
      if (record.status === "present") code = "P";
      else if (record.status === "absent") {
        code = record.justified?.isJustified ? "J" : "A";
      }
    });

    // Totales mensuales
    let totalP = 0;
    let totalA = 0;

    detailsMap.forEach(records => {
      records.forEach(record => {
        if (record.status === "present") totalP++;
        if (record.status === "absent" && !record.justified?.isJustified) totalA++;
      });
    });

    // =========================
    // Celda editable
    // =========================
    const tdStatus = document.createElement("td");
    tdStatus.classList.add("mobile-status-cell");

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 1;
    input.classList.add("attendance-input-mobile");

    input.dataset.userId = student.userId;
    input.dataset.date = selectedDate;
    input.dataset.attendanceType = "physical_education";

    input.value = code;
    input.dataset.originalValue = code;

    input.addEventListener("focus", () => tdStatus.classList.add("active"));
    input.addEventListener("blur", () => tdStatus.classList.remove("active"));

    input.addEventListener("input", () => {
      applyAttendanceStyle(input);
      renderPhysicalEducationMobileFooter(tbody);
    });

    applyAttendanceStyle(input);

    // ✏️ Icono flotante
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-pencil floating-edit-icon";

    icon.addEventListener("click", () => {
      openAttendanceDetailModal({
        userId: input.dataset.userId,
        date: input.dataset.date,
        attendanceType: input.dataset.attendanceType,
        input
      });
    });

    tdStatus.appendChild(input);
    tdStatus.appendChild(icon);
    tr.appendChild(tdStatus);

    const tdTotalA = document.createElement("td");
    tdTotalA.textContent = totalA;
    tdTotalA.classList.add("total-a-ed");
    tr.appendChild(tdTotalA);

    tbody.appendChild(tr);
  });
}
function renderPhysicalEducationMobileFooter(tbody) {

  if (!tbody) return;

  const old = tbody.querySelectorAll(".mobile-footer-row, .mobile-footer-separator");
  old.forEach(el => el.remove());

  const rows = tbody.querySelectorAll("tr[data-user-id]");

  let totalPresentes = 0;
  let totalAusentes = 0;

  rows.forEach(tr => {
    const input = tr.querySelector("input.attendance-input-mobile");
    if (!input) return;

    const value = input.value.toUpperCase();

    if (value === "P") totalPresentes++;
    if (value === "A") totalAusentes++;
  });

  const separator = document.createElement("tr");
  separator.classList.add("mobile-footer-separator");
  separator.innerHTML = `<td colspan="5"></td>`;
  tbody.appendChild(separator);

  function createRow(label, value) {
    const tr = document.createElement("tr");
    tr.classList.add("mobile-footer-row");

    tr.innerHTML = `
      <td colspan="3"><strong>${label}</strong></td>
      <td colspan="2" style="text-align:center;"><strong>${value}</strong></td>
    `;

    tbody.appendChild(tr);
  }

  createRow("PRESENTES TOTALES ED", totalPresentes);
  createRow("AUSENTES TOTALES ED", totalAusentes);
}
// =======================================================================================
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

    //console.log("studentsInfo: ",studentsInfo)

    // 2️⃣ Traer asistencia del mes
    const attendanceMonth = await fetchGetAttendanceForMonth(
      selectedCourse,
      selectedYear,
      selectedMonth
    );

    //console.log("attendanceMonth: ",attendanceMonth)
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

   // console.log("studentsGrades,", studentsGrades)
      renderByTypeAndDevice();
      renderTableInforme(studentsGrades);

  } catch (error) {
    console.error("Error cargando asistencia:", error);
  }
}
//Función para decidir qué render usar
function renderByTypeAndDevice() {
  const isDesktop = window.innerWidth > 768;

  if (isDesktop) {
    if (selectedType === "regular") {
      renderAttendanceTable(studentsGrades, selectedYear, selectedMonth);
    } else if (selectedType === "physical_education") {
      renderPhysicalEducationTable(studentsGrades, selectedYear, selectedMonth);
    }
  } else {
    if (selectedType === "regular") {
      renderAttendanceMobile(studentsGrades, selectedDate);
    } else if (selectedType === "physical_education") {
      renderAttendanceEDMobile(studentsGrades, selectedDate);
    }
  }
}

function renderMobileEmptyState(tbody, message) {

  const tr = document.createElement("tr");

  const td = document.createElement("td");
  td.colSpan = 5; // importante que coincida con tus columnas
  td.classList.add("mobile-empty-state");

  td.innerHTML = `
    <div class="empty-state-content">
      <i class="fa-solid fa-calendar-days empty-icon"></i>
      <p>${message}</p>
    </div>
  `;

  tr.appendChild(td);
  tbody.appendChild(tr);
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
  for (let i = 0; i < 10; i++) {
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

  td.colSpan = 3 + monthDates.length + 10;
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

  // 🔥 Extraer día seguro
  const rawDate = input.dataset.date;

  if (!rawDate || !rawDate.includes("-")) {
    uiToast("Error: fecha inválida en la celda", "error");
    return null;
  }

  const day = parseInt(rawDate.split("-")[2], 10);

  if (!day || day < 1 || day > 31) {
    uiToast("Error: día inválido detectado", "error");
    return null;
  }

  let attendanceStatus = null;
  let late = { isLate: false, minutes: null };
  let justified = { isJustified: false, certificateUrl: null };

  switch (value) {
    case "P":
      attendanceStatus = "present";
      break;

    case "T":
      attendanceStatus = "present";
      late = { isLate: true, minutes: null };
      break;

    case "A":
      attendanceStatus = "absent";
      break;

    case "J":
      attendanceStatus = "absent";
      justified = { isJustified: true, certificateUrl: null };
      break;

    case "":
      attendanceStatus = null;
      break;
  }

  return {
    studentId: input.dataset.userId,
    day,
    attendanceType: input.dataset.attendanceType,
    attendanceStatus,
    late,
    justified,
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
// mapear studentsGrades con información y asistencias de alumnos (solo mapping)
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

  // 2️⃣ Convertimos attendanceMonth en mapa por studentId
  const attendanceMap = new Map(
    (attendanceMonth || []).map(a => [String(a.studentId), a])
  );

  // 3️⃣ Convertimos attendancePreviousStudents en mapa por studentId
  const previousMap = new Map(
    (attendancePreviousStudents || []).map(a => [String(a.studentId), a])
  );

  // 4️⃣ Armamos estructura final
  const studentsGrades = sortedStudents.map(student => {
    const studentIdStr = String(student._id);

    const attendance = attendanceMap.get(studentIdStr);
    const previousAttendance = previousMap.get(studentIdStr);

    return {
      userId: student._id,
      dni: student.dni,
      name: student.name,
      email: student.email,
      genero: student.genero,
      status: student.status,
      // 🔹 dejamos records tal cual para que otra función haga las sumas
      records: attendance?.records ?? {},
      totalWeightedAbsences: previousAttendance?.totalWeightedAbsences ?? 0
    };
  });

  return studentsGrades;
}
// actualizar studetsGrade al enviar al back 
function applyAttendanceChanges() {

  attendanceChanges.forEach((change) => {

    const {
      studentId,
      day,
      attendanceType,
      attendanceStatus,
      late,
      justified,
      notes
    } = change;

    const student = studentsGrades.find(s => s.userId === studentId);
    if (!student) return;

    // 🔥 Asegurar que exista records
    if (!student.records) {
      student.records = {};
    }

    const recordKey = `${day}_${attendanceType}`;

    // ========================
    // DELETE
    // ========================
    if (!attendanceStatus) {
      delete student.records[recordKey];
      return;
    }

    // ========================
    // UPSERT LOCAL
    // ========================
    student.records[recordKey] = {
      status: attendanceStatus,
      late: late || { isLate: false, minutes: null },
      justified: justified || { isJustified: false, certificateUrl: null },
      notes: notes || ""
    };

  });

}
// Calculo poara los informe
function calculateInformeFromStudents(studentsGrades = []) {
  let totalAsistencias = 0;
  let totalInasistencias = 0;

  // Para contar días hábiles únicos
  const diasHabilesSet = new Set();

  studentsGrades.forEach(student => {

    // Recorremos todos los registros del alumno
    Object.entries(student.records || {}).forEach(([key, record]) => {
      const [dayStr, ...typeParts] = key.split("_");
      const attendanceType = typeParts.join("_"); // "regular" o "physical_education"

      if (attendanceType !== "regular") return; // solo contar regular

      const day = parseInt(dayStr, 10);
      diasHabilesSet.add(day); // guardamos como día hábil único

      if (record.status === "present") totalAsistencias++;
      if (record.status === "absent") totalInasistencias++;
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
// Función para cargar días hábiles en el select
function loadBusinessDaysInSelect(year, month) {

  const select = document.getElementById("attendanceDateSelect");

  if (!year || !month || !select) return;

  // 1️⃣ Limpiar
  select.innerHTML = `
    <option value="" selected disabled>Seleccione un día</option>
  `;

  const monthDates = getMonthDays(year, month);
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // 2️⃣ Crear opciones
  monthDates.forEach(date => {

    const dayOfWeek = getDayOfWeek(date);

    if (dayOfWeek === 0 || dayOfWeek === 6) return;

    const option = document.createElement("option");
    option.value = date;

    const dayNumber = date.split("-")[2];
    option.textContent = `${dayNames[dayOfWeek]} ${dayNumber}/${month}`;

    select.appendChild(option);
  });

  // =====================================================
  // 🔥 3️⃣ EXTRA PRO — AUTOSELECCIONAR SI ES MES ACTUAL
  // =====================================================

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;

  if (Number(year) === todayYear && Number(month) === todayMonth) {

    const todayFormatted =
      `${todayYear}-${String(todayMonth).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

    const optionExists = dateSelect.querySelector(
      `option[value="${todayFormatted}"]`
    );

    if (optionExists) {

      // ✅ Selecciona visualmente
      dateSelect.value = todayFormatted;

      // ✅ Actualiza variable global
      selectedDate = todayFormatted;

      // ✅ Dispara evento change (más profesional que llamar render directo)
      dateSelect.dispatchEvent(new Event("change"));

    }

  }

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
    const attendances = Array.isArray(data.data) ? data.data : [];

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
    const attendances = data.data || [];
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

async function fetchPostAttendanceForMonth(courseId, academicYear, month, attendanceChanges) {
  if (!attendanceChanges || attendanceChanges.size === 0) {
    uiToast("No hay cambios para guardar", "info");
    return null;
  }

  try {
    const token = localStorage.getItem("token");

    // 🔹 Convertimos Map → Array en el formato que espera el backend
    const changes = [...attendanceChanges.values()].map(change => ({
      studentId: change.studentId,
      day: change.day,  // número del día
      attendanceType: change.attendanceType, // "regular" | "physical_education"
      attendanceStatus: change.attendanceStatus, // "present" | "absent"
      late: change.late ?? { isLate: false, minutes: null },
      justified: change.justified ?? { isJustified: false, certificateUrl: null },
      notes: change.notes ?? ""
    }));

    const response = await fetch(`${API_URL}/api/attendance/massive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ courseId, academicYear, month, changes })
    });

    const data = await response.json();

    if (!response.ok) {
      uiToast(data?.message || "Error al guardar asistencia", "error");
      return null;
    }

    uiToast("Asistencias guardadas correctamente", "success");

    applyAttendanceChanges()

    // Limpiar buffer
    attendanceChanges.clear();

    // Actualizar valores originales de los inputs
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