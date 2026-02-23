// =============================
// 🟢 Referencias al DOM
// =============================
const academicYearSelect = document.getElementById("academicYearSelect");
const courseSelect = document.getElementById("courseSelect");
const monthSelect = document.getElementById("monthSelect");
const searchInput = document.getElementById("attendanceSearch");

const saveAttendanceBtn = document.getElementById("saveAttendanceBtn");


const attendanceTable = document.getElementById("attendanceTable");

const tooltip = document.getElementById("attendanceTooltip");


let selectedYear = null
let selectedCourse = null
let selectedMonth = null

let studentsInfo = [];
let attendanceRows = [];
let cachedAttendance = [];

let studentsGrades = []; //  Estudiantes mapeados con notas
let attendanceChanges = []; // Guardar asistencia / inacistencia

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];


// ===========================================================================
// 🟢 Event listeners
// ===========================================================================

// =============================
//  Selector del año
// =============================
academicYearSelect.addEventListener("change", async () => {
  selectedYear = academicYearSelect.value;
  //console.log("Año seleccionado:", selectedYear);

  const courses = await fetchGetCoursesByYear(selectedYear);
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

  courseSelect.disabled = false;
});

// =============================
//  Selector del curso
// =============================
courseSelect.addEventListener("change",  async () => {
    // Habilitar select de cursos
    selectedCourse = courseSelect.value;

    studentsInfo = await fetchGetStudentsByCourse(selectedCourse)

    monthSelect.disabled = false;
});

// =============================
//  Selector del del mes
// =============================
monthSelect.addEventListener("change", async () => {
  selectedMonth = monthSelect.value;

  const attendanceMonth = await fetchGetAttendanceForMonth(
    selectedCourse,
    selectedYear,
    selectedMonth
  );


  //console.log("studentsInfo: ", studentsInfo)
  //console.log("attendanceMonth: ", attendanceMonth)
  studentsGrades =  mapStudentsForTable(studentsInfo , attendanceMonth )

  console.log("studentsGrades: ", studentsGrades)

  //const sortedAttendance = sortStudentsByName(attendanceMonth);

  const isDesktop = window.innerWidth > 768;

  if (isDesktop) {
    //console.log("sortedAttendance: ",sortedAttendance)
    renderAttendanceTable(studentsGrades, selectedYear, selectedMonth);
  } else {
  }


  searchInput.value = "";
});
// =============================
//  Guardar asistencias / inasistencias
// =============================
document
  .getElementById("saveAttendanceBtn")
  .addEventListener("click", saveAttendanceMassive);

// =============================
//  Mensaje de advertensia que no se guardo la asistencia
// =============================
  window.addEventListener("beforeunload", function (e) {

  if (attendanceChanges.length > 0) {
    e.preventDefault();
    e.returnValue = ""; // necesario para que el navegador muestre el mensaje
  }

});
// =============================
//  Icono para editar asistencia/inasistencia - (Tarde,Justificativo)
// =============================
document.addEventListener("click", (e) => {
  if (!e.target.closest(".attendance-cell")) {
    document.querySelectorAll(".edit-note-icon").forEach(icon => icon.remove());
  }
});
// =======================================================================================
// 🟢 Render
// =======================================================================================
//Render principal
function renderAttendanceTable(students, year, month) {
  const attendanceTable = document.getElementById("preceptorAttendanceTable");
  const thead = attendanceTable.querySelector("thead");
  const tbody = attendanceTable.querySelector("tbody");

  thead.innerHTML = "";
  tbody.innerHTML = "";

  const monthDates = getMonthDays(year, month);

  renderHeader(thead, monthDates);
  renderBody(tbody, students, monthDates);
  renderFooterTotals(tbody, monthDates);

  updateTotals(tbody, monthDates);
}
//Render Header
function renderHeader(thead, monthDates) {
  const dayInitials = ["D", "L", "M", "M", "J", "V", "S"];
  const headRow = document.createElement("tr");

  ["#", "Alumno", "DNI"].forEach(text => {
    const th = document.createElement("th");
    th.classList.add("sticky-col");
    th.textContent = text;
    headRow.appendChild(th);
  });

  monthDates.forEach(date => {
    const dayOfWeek = getDayOfWeek(date); // ✅ seguro
    const th = document.createElement("th");
    th.classList.add("day-col");

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      th.classList.add("weekend");
      th.innerHTML = "";
    } else {
      th.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center;">
          <span class="day-initial">${dayInitials[dayOfWeek]}</span>
          <span class="day-number">${date.split("-")[2]}</span>
        </div>
      `;
    }

    headRow.appendChild(th);
  });

  const thSpace = document.createElement("th");
  thSpace.classList.add("total-col-space");
  headRow.appendChild(thSpace);

  ["T/P", "T/A"].forEach(text => {
    const th = document.createElement("th");
    th.classList.add("total-col");
    th.textContent = text;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
}
//Render Body
function renderBody(tbody, students, monthDates) {


  students.forEach((student, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="sticky-col index">${index + 1}</td>
      <td class="sticky-col name" title="${student.name}">${student.name}</td>
      <td class="sticky-col dni">${student.dni}</td>
    `;

    monthDates.forEach(date => {
      const dayOfWeek = getDayOfWeek(date); // ✅ seguro
      const td = document.createElement("td");
      td.classList.add("attendance-cell");

     /* // 🔥 Boton 
      td.addEventListener("click", () => {

        if (td.querySelector(".edit-note-icon")) return;

        document.querySelectorAll(".edit-note-icon").forEach(icon => icon.remove());

        const icon = document.createElement("i");
        icon.className = "edit-note-icon fa-solid fa-pencil";

        icon.dataset.userId = student.id;
        icon.dataset.date = date;

        icon.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openAttendanceDetailModal({
            userId: icon.dataset.userId,
            date: icon.dataset.date
          });
        });

        td.appendChild(icon);
      });
*/
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        td.classList.add("weekend");
        tr.appendChild(td);
        return;
      }

      const att = student.details.find(d => d.date === date);

      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.style.width = "28px";
      input.style.textAlign = "center";
      input.dataset.userId = student.id;   // o como tengas el id
      input.dataset.date = date;            // YYYY-MM-DD
      

      if (att) {

        
        input.addEventListener("mouseenter", (e) => {

          const lines = [];

          // Fecha siempre
          lines.push(`<strong>${att.date}</strong>`);

          // Tarde
          if (att.late?.isLate) {
            lines.push(`⏰ Llegó tarde (${att.late.minutes} min)`);
          }

          // Justificación
          if (att.attendanceStatus === "absent") {

            if (att.justification?.isJustified) {
              lines.push("📄 Justificado");
            } else {
              lines.push("❌ No justificado");
            }

          }

          // Notas
          if (att.notes) {
            lines.push(`📝 ${att.notes}`);
          }

          tooltip.innerHTML = lines.join("<br>");

          tooltip.style.left = e.pageX + 15 + "px";
          tooltip.style.top = e.pageY + 15 + "px";
          tooltip.classList.add("show");

        });

        input.addEventListener("mousemove", (e) => {
          tooltip.style.left = e.pageX + 15 + "px";
          tooltip.style.top = e.pageY + 15 + "px";
        });

        input.addEventListener("mouseleave", () => {
          tooltip.classList.remove("show");
        });

      }
        if (!att) {
        input.value = "";
        input.classList.add("empty");
        } else if (att.attendanceStatus === "present") {
        input.value = "P";

          if (att.late?.isLate) {
            input.classList.add("present-late");
          } else {
            input.classList.add("present-normal");
          }

      } else if (att.attendanceStatus === "absent") {
        input.value = "A";

          if (att.justification?.isJustified) {
            input.classList.add("absent-justified");
          } else {
            input.classList.add("absent-unjustified");
          }
      }

      input.dataset.original = input.value;  // 🔹 Guardamos el estado original

      input.addEventListener("input", e => {

      
      let val = e.target.value.toUpperCase();

      if (val !== "P" && val !== "A") {
        val = "";
      }

      e.target.value = val;

      // 🔥 Estado visual base
      e.target.classList.remove("present", "absent", "empty");

      if (val === "P") {
        e.target.classList.add("present");
      } else if (val === "A") {
        e.target.classList.add("absent");
      } else {
        e.target.classList.add("empty");
      }

      // 🔥 Detectar modificación
      if (val !== e.target.dataset.original) {
        e.target.classList.add("modified");
      } else {
        e.target.classList.remove("modified");
      }

      

      const userId = e.target.dataset.userId;
      const date = e.target.dataset.date;

      let attendanceStatus = null;
      let action = "update";

        /*
        ========================
        Si el usuario limpia el input
        → no borramos
        → solo no registramos estado
        ========================
        */

        if (val === "") {

          registerChange({
            userId,
            date,
            action: "delete"
          });

          return;
        }

        if (val === "P") attendanceStatus = "present";
        if (val === "A") attendanceStatus = "absent";

      registerChange({
        userId,
        date,
        action,
        attendanceStatus: attendanceStatus,
      });

      updateTotals(tbody, monthDates);

      updateIconVisibility(e.target);
      saveAttendanceBtn.disabled = false;
    });

      input.addEventListener("focus", () => {
    updateIconVisibility(input);
  });

  input.addEventListener("blur", () => {
  setTimeout(() => updateIconVisibility(input), 150);
});

    
      td.appendChild(input);
      tr.appendChild(td);
    });

    const tdSpace = document.createElement("td");
    tdSpace.classList.add("total-col-space");
    tr.appendChild(tdSpace);

    const tdPresent = document.createElement("td");
    tdPresent.classList.add("total-col", "present");
    tr.appendChild(tdPresent);

    const tdAbsent = document.createElement("td");
    tdAbsent.classList.add("total-col", "absent");
    tr.appendChild(tdAbsent);

    tbody.appendChild(tr);
  });
}
//Render Footer
function renderFooterTotals(tbody, monthDates) {
  const spacerRow = document.createElement("tr");
  spacerRow.innerHTML = `
    <td class="sticky-col index"></td>
    <td class="sticky-col name"></td>
    <td class="sticky-col dni"></td>
  `;
  monthDates.forEach(() => spacerRow.innerHTML += `<td></td>`);
  spacerRow.innerHTML += `<td class="total-col-space"></td>`;
  tbody.appendChild(spacerRow);

  const totalAbsentRow = document.createElement("tr");
  totalAbsentRow.classList.add("total-absent-row");
  totalAbsentRow.innerHTML = `
    <td class="sticky-col index"></td>
    <td class="sticky-col name">Total Ausente</td>
    <td class="sticky-col dni"></td>
  `;
  monthDates.forEach(() => totalAbsentRow.innerHTML += `<td class="total-col absent">0</td>`);
  totalAbsentRow.innerHTML += `<td class="total-col-space"></td><td></td><td></td>`;
  tbody.appendChild(totalAbsentRow);

  const totalPresentRow = document.createElement("tr");
  totalPresentRow.classList.add("total-present-row");
  totalPresentRow.innerHTML = `
    <td class="sticky-col index"></td>
    <td class="sticky-col name">Total Presente</td>
    <td class="sticky-col dni"></td>
  `;
  monthDates.forEach(() => totalPresentRow.innerHTML += `<td class="total-col present">0</td>`);
  totalPresentRow.innerHTML += `<td class="total-col-space"></td><td></td><td></td>`;
  tbody.appendChild(totalPresentRow);
}
//calcular totales
function updateTotals(tbody, monthDates) {
  const rows = tbody.querySelectorAll("tr");
  const dayCounts = monthDates.map(() => ({ present: 0, absent: 0 }));

  rows.forEach(row => {
    const inputs = row.querySelectorAll("td.attendance-cell input");
    let rowPresent = 0;
    let rowAbsent = 0;

    inputs.forEach((input, i) => {
      const dayOfWeek = getDayOfWeek(monthDates[i]); // ✅ seguro
      if (dayOfWeek === 0 || dayOfWeek === 6) return;

      if (input.value === "P") {
        rowPresent++;
        dayCounts[i].present++;
      } else if (input.value === "A") {
        rowAbsent++;
        dayCounts[i].absent++;
      }
    });

    const totalPresentTd = row.querySelector(".total-col.present");
    const totalAbsentTd = row.querySelector(".total-col.absent");

    if (totalPresentTd) totalPresentTd.textContent = rowPresent;
    if (totalAbsentTd) totalAbsentTd.textContent = rowAbsent;
  });

  const totalPresentRow = tbody.querySelector(".total-present-row");
  const totalAbsentRow = tbody.querySelector(".total-absent-row");

  monthDates.forEach((date, i) => {
    const dayOfWeek = getDayOfWeek(date); // ✅ seguro

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (totalPresentRow)
        totalPresentRow.querySelectorAll("td.total-col.present")[i].textContent = "";
      if (totalAbsentRow)
        totalAbsentRow.querySelectorAll("td.total-col.absent")[i].textContent = "";
      return;
    }

    if (totalPresentRow)
      totalPresentRow.querySelectorAll("td.total-col.present")[i].textContent =
        dayCounts[i].present;

    if (totalAbsentRow)
      totalAbsentRow.querySelectorAll("td.total-col.absent")[i].textContent =
        dayCounts[i].absent;
  });
}
// =======================================================================================
// 🟢 Funciones 
// =======================================================================================
  // =============================
  // Ordenar alfabeticamente
  // =============
function sortStudentsByName(students) {
  return [...students].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );
}
  // =============================
  // Función para mapear alumnos con sus faltas
  // ============================
function mapStudentsForTable(studentsInfo, attendanceMonth) {
  // Crear un mapa para acceder rápido por DNI
  const attendanceMap = {};
  attendanceMonth.forEach(record => {
    attendanceMap[record._id] = record;
  });

  // Mapear estudiantes con su info y detalles
  const studentsGrades = studentsInfo.map(student => {
    const attendance = attendanceMap[student._id] || { details: [], absents: 0, presents: 0 };

    return {
      id: student._id,
      name: student.name,
      dni: student.dni,
      email: student.email,
      details: attendance.details.map(detail => ({
        id: detail._id || null,   // si cada detalle tiene id
        date: detail.date,
        attendanceStatus: detail.status, // 👈 cambiar esto
        notes: detail.notes,
        late: detail.late,
        justification: detail.justification
      })),
      absents: attendance.absents || 0,
      presents: attendance.presents || 0
    };
  });

  return studentsGrades;
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
//"YYYY-MM-DD" con ceros a la izquierda:
function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
// ========================================== 
// Guardar asistencias / inasistencias
// ======================================= 
async function saveAttendanceMassive() {

  if (!attendanceChanges || attendanceChanges.length === 0) {
    uiToast("No hay cambios para guardar", "info");
    return;
  }

  console.log("attendanceChanges: ",attendanceChanges)

  const result = await fetchPostAttendanceForMonth(
    selectedCourse,
    selectedYear,
    1,
    attendanceChanges
  );

  if (result) {
    attendanceChanges = []; // 🔥 limpiar cambios
    uiToast("Asistencia guardada correctamente", "success");

    document.querySelectorAll(".modified").forEach(input => {
      input.classList.remove("modified");
      input.dataset.original = input.value;
    });
  }
}
//Función registerChange (anti-duplicados)
function registerChange(change) {

  const index = attendanceChanges.findIndex(item =>
    item.userId === change.userId &&
    item.date === change.date
  );

  const input = document.querySelector(
    `input[data-user-id="${change.userId}"][data-date="${change.date}"]`
  );

  if (!input) return;

  const originalValue = input.dataset.original || "";
  /*
  ================================
  NORMAL UPDATE
  ================================
  */

  const currentValue =
    change.attendanceStatus === "present" ? "P" :
    change.attendanceStatus === "absent" ? "A" :
    "";

  // 🔥 Si vuelve al valor original → eliminar cambio
  if (currentValue === originalValue) {

    if (index !== -1) {
      attendanceChanges.splice(index, 1);
    }

    input.classList.remove("modified");

  } else {

    if (index !== -1) {

      attendanceChanges[index] = {
        ...attendanceChanges[index],
        ...change
      };

    } else {
      attendanceChanges.push(change);
    }

    input.classList.add("modified");
  }

  console.log("Cambios actuales:", attendanceChanges);

  updateSaveButtonState();
}
function updateSaveButtonState() {
  if (!saveAttendanceBtn) return;

  saveAttendanceBtn.disabled = attendanceChanges.length === 0;

  if (attendanceChanges.length === 0) {
    saveAttendanceBtn.classList.add("disabled");
  } else {
    saveAttendanceBtn.classList.remove("disabled");
  }
}
// ========================================== 
// Abreir modal editar  asistencias / inasistencias (Tarde-Observacion) 
// ======================================= 
function openAttendanceDetailModal({ userId, date }) {

  const existing = document.querySelector(".attendance-popover");
  if (existing) existing.remove();

  // 🔥 Buscar student y attendance detail
  const student = studentsGrades.find(s => s.id === userId);
  const att = student?.details?.find(d => d.date === date);
/*
    const hasAttendance =
    att &&
    (att.attendanceStatus === "present" ||
    att.attendanceStatus === "absent");

  if (!hasAttendance) return;
*/
  const popover = document.createElement("div");
  popover.className = "attendance-popover";

  popover.innerHTML = `
    <div class="popover-header">
      <strong>Detalle</strong>
      <button class="close-popover">&times;</button>
    </div>

    <label class="popover-check">
      <input type="checkbox" id="lateCheck"> Llegó tarde
    </label>

    <input type="number" id="lateMinutes" placeholder="Minutos" min="1" style="display:none;">

    <label class="popover-check">
      <input type="checkbox" id="justifiedCheck"> Justificado
    </label>

    <textarea id="attendanceNote" rows="3" placeholder="Observación..."></textarea>

    <button class="save-popover">Guardar</button>
  `;

  document.body.appendChild(popover);

  // 🔥 Referencias
  const lateCheck = popover.querySelector("#lateCheck");
  const lateMinutes = popover.querySelector("#lateMinutes");
  const justifiedCheck = popover.querySelector("#justifiedCheck");
  const noteArea = popover.querySelector("#attendanceNote");

  // ==============================
  // 🔥 PRELOAD DATOS SI EXISTEN
  // ==============================

  if (att) {

    if (att.late?.isLate) {
      lateCheck.checked = true;
      lateMinutes.style.display = "block";
      lateMinutes.value = att.late.minutes || "";
    }

    if (att.justification?.isJustified) {
      justifiedCheck.checked = true;
    }

    if (att.notes) {
      noteArea.value = att.notes;
    }
  }

  // Mostrar minutos solo si está checkeado
  lateCheck.addEventListener("change", () => {
    lateMinutes.style.display = lateCheck.checked ? "block" : "none";
  });

  // 🔥 Posicionar cerca del icono
  const icon = document.querySelector(
    `.edit-note-icon[data-user-id="${userId}"][data-date="${date}"]`
  );

  if (icon) {
    const rect = icon.getBoundingClientRect();

    popover.style.top = rect.bottom + window.scrollY + 5 + "px";
    popover.style.left = rect.left + window.scrollX - 180 + "px";
  }

  // Cerrar modal
  popover.querySelector(".close-popover").addEventListener("click", () => {
    popover.remove();
  });

  // Guardar
  popover.querySelector(".save-popover").addEventListener("click", () => {

  registerChange({
    userId,
    date,
    action: "update",

    late: {
      isLate: lateCheck.checked,
      minutes: lateCheck.checked
        ? parseInt(lateMinutes.value) || 0
        : null
    },

    justification: {
      isJustified: justifiedCheck.checked
    },

    notes: noteArea.value
  });

  popover.remove();
});

  // Click afuera
  setTimeout(() => {
    document.addEventListener("click", function handler(e) {
      if (!popover.contains(e.target) &&
          !e.target.classList.contains("edit-note-icon")) {

        popover.remove();
        document.removeEventListener("click", handler);
      }
    });
  }, 0);
}

// ========================================== 
// Hacer visible el icono ver modal (Justificado-Tarde-Notas) 
// ======================================= 
  function updateIconVisibility(input) {

  const value = input.value.trim();
  const td = input.parentElement;

  let icon = td.querySelector(".edit-note-icon");

  // 🔥 Solo mostrar si:
  // - input está focus
  // - valor es P o A
  if (
    document.activeElement !== input ||
    !value ||
    (value !== "P" && value !== "A")
  ) {

    if (icon) icon.remove();
    return;
  }

  // Crear icono si no existe
  if (!icon) {

    icon = document.createElement("i");
    icon.className = "edit-note-icon fa-solid fa-pencil";

    icon.dataset.userId = input.dataset.userId;
    icon.dataset.date = input.dataset.date;

    icon.addEventListener("click", ev => {
      ev.stopPropagation();

      openAttendanceDetailModal({
        userId: icon.dataset.userId,
        date: icon.dataset.date
      });
    });

    td.appendChild(icon);
  }
}

// =======================================================================================
// 🟢 Fetch 
// =======================================================================================
// =============================
// 🟢 Fetch - Buscar cursos por año (Preceptor)
// =============================
async function fetchGetCoursesByYear(year) {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      console.warn("No hay token disponible");
      return [];
    }

    if (!year) {
      console.warn("Debe indicar un año académico");
      return [];
    }

    const response = await fetch(
      `${API_URL}/api/course/${year}/listCourse`,
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
    console.error("fetchCoursesByYear:", error.message);
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
          name: s.student ? `${s.student.nombre} ${s.student.apellido}` : "Alumno no encontrado",
          dni: s.student?.dni || "-",
          email: s.student?.email || "-",
          status: s.status || "No asignado"
        }))
      : [];

  } catch (error) {
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
//  🟢 Fetch Cargar asistencias/inasistencias Masiva
// =============================

async function fetchPostAttendanceForMonth(courseId, academicYear, trimester, attendanceChanges) {
  console.log("attendanceChanges: ",attendanceChanges)
  try {
    const token = localStorage.getItem("token")

    const response = await fetch(`${API_URL}/api/attendance/massive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        courseId,
        academicYear,
        trimester,
        changes: attendanceChanges
      })
    });

    const data = await response.json();

    if (!response.ok) {
      uiToast(data?.message || "Error al guardar asistencia", "error");
      return null;
    }

    console.log("Resultado:", data);

    return data; // 🔥 ahora sí devuelve algo

  } catch (error) {
    console.error("Error:", error);
    uiToast("Error al conectar con el servidor", "error");
    return null;
  }
}




/*
Si está:

⏰ tarde → pequeño puntito naranja

📄 justificado → pequeño iconito azul

📝 nota → pequeño indicador gris


*/