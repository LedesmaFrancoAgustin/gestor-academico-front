// =============================
// 🟢 Referencias al DOM
// =============================
const academicYearSelect = document.getElementById("academicYearSelect");
const courseSelect = document.getElementById("courseSelect");
const monthSelect = document.getElementById("monthSelect");

let selectedYear = null
let selectedCourse = null
let selectedMonth = null
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

    console.log(" courses:", courses);
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

// =============================
//  Selector del curso
// =============================
courseSelect.addEventListener("change",  () => {
    // Habilitar select de cursos
    selectedCourse = courseSelect.value;
    monthSelect.disabled = false;
});

// =============================
//  Selector del del mes
// =============================
monthSelect.addEventListener("change", async () => {
   
   selectedMonth = monthSelect.value;

   console.log(selectedYear,selectedCourse,selectedMonth)
   const attendanceMonth =  await fetchAttendanceForMonth(selectedCourse, selectedYear, selectedMonth)
    console.log("attendanceMonth: ",attendanceMonth);
   const students =  await fetchStudentsFromCourse(selectedCourse)
   //console.log("students: ",students);

   renderAttendanceTable(attendanceMonth, selectedYear, selectedMonth, students);

 
   initAttendanceTooltips();

  
});

// =====================================================
//  Input`- buscador de alumno por nombre/dni
// ===================================================
// 🔹 Filtrar alumnos de la tabla por nombre o DNI
document.getElementById("searchStudent").addEventListener("input", function() {
    const searchValue = this.value.toLowerCase(); // texto ingresado
    const tableBody = document.getElementById("attendanceTableBody");
    const rows = tableBody.querySelectorAll("tr");

    rows.forEach(row => {
        // Ignorar filas de totales y separadoras
        if (row.classList.contains("spacer-row") || row.classList.contains("total-row")) return;

        const nameCell = row.cells[1]?.textContent.toLowerCase() || "";
        const dniCell = row.cells[2]?.textContent.toLowerCase() || "";

        if (nameCell.includes(searchValue) || dniCell.includes(searchValue)) {
            row.style.display = ""; // mostrar fila
        } else {
            row.style.display = "none"; // ocultar fila
        }
    });
});

// =====================================================
//  click - Boton de editar (Lapiz)
// ===================================================
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("edit-note-icon")) {
    const cell = e.target.closest("td");
    const currentNotes = cell.dataset.tooltip || "";
    
    const notes = prompt("Agregar nota / justificación:", currentNotes);
    if (notes !== null) {
      cell.dataset.tooltip = notes;
    }
  }
});

// =============================
// 🟢 Fetch al backend - 
// =============================
// =============================
//  Fetch Buscar cursos 
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
//  Fetch Buscar inancistencias por curso/año/mes 
// =============================

async function fetchAttendanceForMonth(courseId, year, month) {
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
//  Fetch Buscar alumnos del curso
// =============================

async function fetchStudentsFromCourse(courseId) {
  try {
    const res = await fetch(
      `${API_URL}/api/course/${courseId}/students`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res.ok) {
      console.error("Error al traer los alumnos del curso:", res.status, res.statusText);
      uiToast("Error al traer los alumnos del curso", "error");
      return []; // array vacío en caso de error
    }

    const data = await res.json();
    const students = data.data || [];

      students.sort((a, b) => {
      const nameA = (a.student.apellido + ' ' + a.student.nombre).toLowerCase();
      const nameB = (b.student.apellido + ' ' + b.student.nombre).toLowerCase();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  });

    
    return students || []; // devolvemos siempre un array
  } catch (error) {
    console.error("Error al conectar con el servidor:", error);
    uiToast("Error al conectar con el servidor para traer los alumnos", "error");
    return []; // array vacío
  }
}

// =============================
//  Fetch Cargar asistencias/inassistencias
// =============================

async function fetchCreateAttendance(attendanceData) {
  try {
    const res = await fetch(`${API_URL}/api/attendance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(attendanceData)
    });

    // ❌ Error real del backend
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      uiToast(
        error.message || "Error al cargar asistencias / inasistencias",
        "error"
      );
      return { error: true };
    }

    // 🧹 DELETE → 204 No Content
    if (res.status === 204) {
      return null;
    }

    // ✅ CREATE / UPDATE → puede o no venir body
    const text = await res.text();
    if (!text) return null;

    return JSON.parse(text);

  } catch (error) {
    console.error("Error al conectar con el servidor:", error);
    uiToast("Error al conectar con el servidor", "error");
    return { error: true };
  }
}





// =============================
// 🟢 Renders - 
// =============================

// =====================================================
//  Render tabla de las Fechas/alumnos -- Principal
// =====================================================
// =============================
// 🟢 Render principal
// =============================
function renderAttendanceTable(attendances, year, month, students) {
  const tableHead = document.getElementById("attendanceTableHead");
  const tableBody = document.getElementById("attendanceTableBody");

  tableHead.innerHTML = '';
  tableBody.innerHTML = '';

  const numDays = new Date(year, month, 0).getDate();
  const days = Array.from({ length: numDays }, (_, i) => i + 1);

  const totalsPerDay = Array(numDays).fill(0);
  const absentsPerDay = Array(numDays).fill(0);
  let totalPColumn = 0;
  let totalAColumn = 0;

  renderHeader(tableHead, days, year, month);

  students.forEach((studentObj, index) => {
    const student = studentObj.student;
    const record = attendances.find(a => a._id === student._id);
    const details = record ? record.details : [];

    const totals = renderStudentRow(
      tableBody,
      student,
      details,
      index,
      days,
      totalsPerDay,
      absentsPerDay,
      year,
      month
    );

    totalPColumn += totals.present;
    totalAColumn += totals.absent;
  });

  renderSpacerRow(tableBody, days.length);
  renderTotalsRow(tableBody, totalsPerDay, absentsPerDay, totalPColumn, totalAColumn, year, month);
}
// =============================
// 1️⃣ Render encabezado
// =============================
function renderHeader(tableHead, days, year, month) {
  const initials = ['D','L','M','M','J','V','S'];
  const headRow = document.createElement("tr");

  headRow.innerHTML = `
    <th>#</th>
    <th>Alumno</th>
    <th>DNI</th>
    ${days.map(d => {
      const date = new Date(year, month - 1, d);
      const fullDate =
        date.getUTCFullYear() + "-" +
        String(date.getUTCMonth() + 1).padStart(2, "0") + "-" +
        String(date.getUTCDate()).padStart(2, "0");
      return `
        <th class="widthDate attendance-day" data-date="${fullDate}">
          ${d}<br>
          <span style="font-size:0.7rem;color:#666">${initials[date.getDay()]}</span>
        </th>
      `;
    }).join('')}
    <th class="spacer-col"></th>
    <th class="total-Attendance-Student">Total P</th>
    <th class="total-Attendance-Student">Total A</th>
  `;
  tableHead.appendChild(headRow);
}

// =============================
// 2️⃣ Render fila de alumno
// =============================
function renderStudentRow(tableBody, student, details, index, days, totalsPerDay, absentsPerDay, year, month) {
  const row = document.createElement("tr");
  row.dataset.userId = student._id;

  let totalP = 0;
  let totalA = 0;

  const cells = days.map((d, i) => {
    const fullDate = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const jsDate = new Date(year, month - 1, d);
    const dayOfWeek = jsDate.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) return `<td class="attendance-cell empty"></td>`;

    const att = details.find(a => a.date === fullDate);

    let status = "-";
    let cellClass = "attendance-cell";
    let tooltip = "";

    if (att) {
      if (att.status === "present") {
        status = "P";
        cellClass += " present" + (att.late?.isLate ? " late" : "");
        tooltip = `Llegó tarde: ${att.late?.minutes || 0} min\nNotas: ${att.notes || ''}`;
        totalP++; totalsPerDay[i]++;
      } else {
        status = "A";
        cellClass += " absent" + (att.justification?.isJustified ? " justified" : "");
        tooltip = `Notas: ${att.notes || ''}`;
        totalA++; absentsPerDay[i]++;
      }
    } else {
      cellClass += " empty";
    }

    return `<td class="${cellClass}" data-date="${fullDate}" data-tooltip="${tooltip}">
      <input type="text" maxlength="1" value="${status}" class="attendance-input" data-original="${status}" placeholder="P/A"/>
      <i class="edit-note-icon fa-solid fa-pencil"></i>
    </td>`;
  });

  const studentName = student.apellido + ' ' + student.nombre;
  const studentDNI = student.dni || '';

  row.innerHTML = `
    <td>${index + 1}</td>
    <td>${studentName}</td>
    <td>${studentDNI}</td>
    ${cells.join('')}
    <td class="spacer-col"></td>
    <td class="attendance-cell present total-col"><strong>${totalP}</strong></td>
    <td class="attendance-cell absent total-col"><strong>${totalA}</strong></td>
  `;

  tableBody.appendChild(row);
  return { present: totalP, absent: totalA };
}
// =============================
// 3️⃣ Fila separadora
// =============================
function renderSpacerRow(tableBody, numDays) {
    const spacerRow = document.createElement("tr");
    spacerRow.classList.add("spacer-row");
    spacerRow.innerHTML = `<td colspan="${3 + numDays + 3}"></td>`;
    tableBody.appendChild(spacerRow);
}

// =============================
// 4️⃣ Totales finales
// =============================
function renderTotalsRow(tableBody, totalsPerDay, absentsPerDay, totalPColumn, totalAColumn, year, month) {
  const totalPresentRow = document.createElement("tr");
  totalPresentRow.classList.add("total-row", "total-present");

  totalPresentRow.innerHTML = `
    <td colspan="3"><strong>Total Presentes</strong></td>
    ${totalsPerDay.map((t, i) => {
      const fullDate = `${year}-${String(month).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`;
      return `<td class="attendance-cell present" data-date="${fullDate}">${t}</td>`;
    }).join('')}
    <td class="spacer-col"></td>
    <td class="attendance-cell present total-col"><strong>${totalPColumn}</strong></td>
    <td></td>
  `;
  tableBody.appendChild(totalPresentRow);

  const totalAbsentRow = document.createElement("tr");
  totalAbsentRow.classList.add("total-row", "total-absent");

  totalAbsentRow.innerHTML = `
    <td colspan="3"><strong>Total Ausentes</strong></td>
    ${absentsPerDay.map((t, i) => {
      const fullDate = `${year}-${String(month).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`;
      return `<td class="attendance-cell absent" data-date="${fullDate}">${t}</td>`;
    }).join('')}
    <td class="spacer-col"></td>
    <td class="attendance-cell absent total-col"><strong>${totalAColumn}</strong></td>
    <td></td>
  `;
  tableBody.appendChild(totalAbsentRow);
}

// =============================
//  Funcion para ostrar ensajes flotantes
// =============================

function initAttendanceTooltips() {
  // Primero eliminamos cualquier tooltip existente
  let existingTooltip = document.querySelector('.tooltip-floating');
  if (existingTooltip) existingTooltip.remove();

  // Creamos un tooltip flotante global
  const tooltip = document.createElement('div');
  tooltip.classList.add('tooltip-floating');
  document.body.appendChild(tooltip);

  // Seleccionamos todas las celdas con data-tooltip
  document.querySelectorAll('.attendance-cell[data-tooltip]').forEach(td => {
    td.addEventListener('mouseenter', (e) => {
      tooltip.textContent = td.getAttribute('data-tooltip');
      tooltip.style.display = 'block';
      const rect = td.getBoundingClientRect();
      tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5 + window.scrollY}px`;
      tooltip.style.left = `${rect.left + rect.width/2 - tooltip.offsetWidth/2 + window.scrollX}px`;
    });

    td.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
  });
}



// =============================
// 🟢 Eventos Input / Funciones del mismo - 
// =============================

// =============================
//  Escuchamos los eventos principales del input
// =============================
document.addEventListener("focusin", handleAttendanceFocus);
document.addEventListener("input", handleAttendanceInput);
document.addEventListener("blur", handleAttendanceBlur, true);


// =============================
//  * Al hacer foco:
// * si el valor es "-" lo limpiamos para escribir
// =============================

function handleAttendanceFocus(e) {
  if (!e.target.classList.contains("attendance-input")) return;

  if (e.target.value === "-") {
    e.target.value = "";
  }
}

// =============================
//  * Mientras escribe:
//  * solo permitimos P o A
// =============================
function handleAttendanceInput(e) {
  if (!e.target.classList.contains("attendance-input")) return;

  const input = e.target;
  const value = input.value.toUpperCase();

  // Bloqueamos cualquier otro carácter
  if (value && !["P", "A", "-"].includes(value)) {
    input.value = "";
    return;
  }

  input.value = value;
}

// =============================
//   * Actualiza el color de la celda
//   * según el estado de asistencia
// =============================

function updateAttendanceCellStyle(cell, value) {
  cell.classList.remove("present", "absent", "empty");

  if (value === "P") {
    cell.classList.add("present");
  } else if (value === "A") {
    cell.classList.add("absent");
  } else {
    cell.classList.add("empty");
  }
} 

// ==============================================================================================
//   Actualizar lod totales - funciones
// ================================================================================================

// =============================
//   * Actualiza el total de falta por aluno
// =============================

function updateStudentTotals(row, deltaP, deltaA) {
  const totalPCell = row.querySelector(".total-col.present strong");
  const totalACell = row.querySelector(".total-col.absent strong");

  totalPCell.textContent = parseInt(totalPCell.textContent) + deltaP;
  totalACell.textContent = parseInt(totalACell.textContent) + deltaA;
}

// =============================
//   * Actualiza el falta por dia
// =============================
function updateDayTotals(table, dayIndex, deltaP, deltaA) {
  const totalPresentRow = table.querySelector(".total-present");
  const totalAbsentRow = table.querySelector(".total-absent");

  const presentCell = totalPresentRow.children[dayIndex];
  const absentCell = totalAbsentRow.children[dayIndex];

  presentCell.textContent = parseInt(presentCell.textContent) + deltaP;
  absentCell.textContent = parseInt(absentCell.textContent) + deltaA;
}

function getDelta(oldValue, newValue) {
  let deltaP = 0;
  let deltaA = 0;

  if (oldValue === "P") deltaP--;
  if (oldValue === "A") deltaA--;

  if (newValue === "P") deltaP++;
  if (newValue === "A") deltaA++;

  return { deltaP, deltaA };
}


// =============================
//    * Al perder el foco:
//    * validamos si hubo un cambio real
//    * y preparamos los datos para guardar
// =============================

async function handleAttendanceBlur(e) {
  if (!e.target.classList.contains("attendance-input")) return;

  const input = e.target;
  const newValue = input.value?.toUpperCase() || "-";
  const oldValue = input.dataset.original;
  if (newValue === oldValue) return;

  const cell = input.closest("td");
  const row = input.closest("tr");
  const table = input.closest("table");

  const date = cell.dataset.date;

  const { deltaP, deltaA } = getDelta(oldValue, newValue);

  updateAttendanceCellStyle(cell, newValue);
  updateStudentTotals(row, deltaP, deltaA);

  // Actualiza totales por día usando data-date
  const presentCell = table.querySelector(`.total-present td[data-date="${date}"]`);
  const absentCell = table.querySelector(`.total-absent td[data-date="${date}"]`);
  if (presentCell) presentCell.textContent = parseInt(presentCell.textContent) + deltaP;
  if (absentCell) absentCell.textContent = parseInt(absentCell.textContent) + deltaA;

  // 🔒 Normalizamos visualmente
  input.value = newValue === "-" ? "-" : newValue;  
  input.dataset.original = newValue;

  const userId = row.dataset.userId;

  const attendanceData = {
    userId,
    courseId: selectedCourse,
    academicYear: selectedYear,
    trimester: 1,
    date,
    attendanceStatus:
      newValue === "P" ? "present" :
      newValue === "A" ? "absent" :
      null
  };

  try {
    const res = await fetchCreateAttendance(attendanceData);
    if (res === null) {
      uiToast("Asistencia eliminada", "info");
      return;
    }
    uiToast("Asistencia guardada", "success");
  } catch {
    uiToast("Error al guardar la asistencia", "error");
  }
}
