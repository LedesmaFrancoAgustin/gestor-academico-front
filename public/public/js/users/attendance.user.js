// =============================
// 🟢 Referencias al DOM
// =============================
const academicYearSelect = document.getElementById("academicYearSelect");
const courseSelect = document.getElementById("courseSelect");
const monthSelect = document.getElementById("monthSelect");
const searchInput = document.getElementById("attendanceSearch");

const attendanceTable = document.getElementById("attendanceTable");


let selectedYear = null
let selectedCourse = null
let selectedMonth = null

let attendanceRows = [];
let cachedAttendance = [];

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
  console.log("Año seleccionado:", selectedYear);

  const courses = await fetchMyCoursesByYear(selectedYear);
  console.log("Courses:", courses);

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

  const attendanceMonth = await fetchAttendanceForMonth(
    selectedCourse,
    selectedYear,
    selectedMonth
  );

  const sortedAttendance = sortStudentsByName(attendanceMonth);

  const isDesktop = window.innerWidth > 768;

  if (isDesktop) {
    renderAttendanceTable(sortedAttendance, selectedYear, selectedMonth);
  } else {
    fillDaySelect(selectedYear, selectedMonth);
    renderAttendanceMobileDay(sortedAttendance, selectedYear, selectedMonth, "01");
  }


  searchInput.value = "";
});


// =============================
//  Input del buscador
// =============================
searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();

  const isDesktop = window.innerWidth > 768;

  if (isDesktop) {
    filterDesktopAttendance(query);
  } else {
    filterMobileAttendance(query);
  }
});

function filterDesktopAttendance(query) {
  let visibleIndex = 1;

  attendanceRows.forEach(row => {
    const name = row.querySelector(".sticky-col.name")?.textContent.toLowerCase();
    const dni = row.querySelector(".sticky-col.dni")?.textContent.toLowerCase();

    const match = name.includes(query) || dni.includes(query);

    if (match) {
      row.style.display = "";
      row.querySelector(".sticky-col.index").textContent = visibleIndex++;
    } else {
      row.style.display = "none";
    }
  });
}

function filterMobileAttendance(query) {
  const mobileList = document.getElementById("attendanceMobileList");
  const selectedDay = daySelect.value || "01";

  if (!query) {
    // 🔥 USAMOS EL CACHE YA ARMADO
    renderAttendanceMobileFromStudents(
      cachedMobileStudents,
      selectedYear,
      selectedMonth,
      selectedDay
    );
    return;
  }

  const normalizedQuery = query.toLowerCase();

  const filtered = cachedMobileStudents.filter(student =>
    student.name.toLowerCase().includes(normalizedQuery) ||
    student.dni.includes(normalizedQuery)
  );

  if (filtered.length === 0) {
    mobileList.innerHTML = `<p class="empty-state">No hay alumnos</p>`;
    return;
  }

  renderAttendanceMobileFromStudents(
    filtered,
    selectedYear,
    selectedMonth,
    selectedDay
  );
}

// =============================
//  Input cambiar el dia
// =============================
daySelect.addEventListener("change", () => {
  const selectedDay = daySelect.value || "01";

  renderAttendanceMobileDay(
    cachedMobileStudents,
    selectedYear,
    selectedMonth,
    selectedDay
  );
});


// =============================
// 🟢 Fetch al backend - 
// =============================
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

// ==============================================================================
// 🟢 Render Tabla Asistencias - Desktop
// =============================================================================

// ==============================================================================
// 🟢 Render Tabla Asistencias - Desktop
// =============================================================================

function renderAttendanceTable(attendanceMonth, year, month) {
    const students = buildStudentMap(attendanceMonth);

    const thead = attendanceTable.querySelector("thead");
    const tbody = attendanceTable.querySelector("tbody");

    thead.innerHTML = "";
    tbody.innerHTML = "";

    const monthDates = getMonthDays(year, month);

    // 🧱 HEADER
    const headRow = document.createElement("tr");

    ["#", "Alumno", "DNI"].forEach(text => {
        const th = document.createElement("th");
        th.classList.add("sticky-col");
        th.textContent = text;
        headRow.appendChild(th);
    });

    const dayInitials = ["D", "L", "M", "M", "J", "V", "S"];

    monthDates.forEach(date => {
        const jsDate = new Date(date);
        const dayOfWeek = jsDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const th = document.createElement("th");
        th.classList.add("day-col");
        if (isWeekend) th.classList.add("weekend");

        th.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center;">
                <span class="day-initial">${dayInitials[dayOfWeek]}</span>
                <span class="day-number">${date.split("-")[2]}</span>
            </div>
        `;

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

    // 🧮 Totales por día
    const dayTotals = monthDates.map(() => ({ present: 0, absent: 0 }));

    // 👨‍🎓 BODY
    students.forEach((student, index) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td class="sticky-col index">${index + 1}</td>
            <td class="sticky-col name" title="${student.name}">${student.name}</td>
            <td class="sticky-col dni">${student.dni}</td>
        `;

        let studentTotalPresent = 0;
        let studentTotalAbsent = 0;

        monthDates.forEach((date, i) => {
            const jsDate = new Date(date);
            const dayOfWeek = jsDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            const td = document.createElement("td");
            td.classList.add("attendance-cell");

            if (isWeekend) {
                td.classList.add("weekend");
                td.textContent = "";
                tr.appendChild(td);
                return;
            }

            const att = student.map[date];

            if (!att) {
                td.textContent = "–";
                td.classList.add("empty");
            } else if (att.status === "present") {
                td.textContent = "P";
                td.classList.add("present");
                studentTotalPresent++;
                dayTotals[i].present++;
            } else {
                td.textContent = "A";
                td.classList.add("absent");
                studentTotalAbsent++;
                dayTotals[i].absent++;
            }

            tr.appendChild(td);
        });

        tr.innerHTML += `<td class="total-col-space"></td>`;
        tr.innerHTML += `
            <td class="total-col present">${studentTotalPresent}</td>
            <td class="total-col absent">${studentTotalAbsent}</td>
        `;

        tbody.appendChild(tr);
    });

    // 🔹 Spacer
    const spacerRow = document.createElement("tr");
    spacerRow.innerHTML = `<td class="sticky-col index"></td><td class="sticky-col name"></td><td class="sticky-col dni"></td>`;
    monthDates.forEach(() => spacerRow.innerHTML += `<td></td>`);
    spacerRow.innerHTML += `<td class="total-col-space"></td>`;
    tbody.appendChild(spacerRow);

    // ➕ Total Ausente por día
    const totalAbsentRow = document.createElement("tr");
    totalAbsentRow.innerHTML = `
        <td class="sticky-col index"></td>
        <td class="sticky-col name">Total Ausente</td>
        <td class="sticky-col dni"></td>
    `;

    dayTotals.forEach((day, i) => {
        const d = new Date(monthDates[i]).getDay();
        totalAbsentRow.innerHTML +=
            d === 0 || d === 6
                ? `<td class="weekend"></td>`
                : `<td class="total-col absent">${day.absent}</td>`;
    });

    totalAbsentRow.innerHTML += `<td class="total-col-space"></td><td></td><td></td>`;
    tbody.appendChild(totalAbsentRow);

    // ➕ Total Presente por día
    const totalPresentRow = document.createElement("tr");
    totalPresentRow.innerHTML = `
        <td class="sticky-col index"></td>
        <td class="sticky-col name">Total Presente</td>
        <td class="sticky-col dni"></td>
    `;

    dayTotals.forEach((day, i) => {
        const d = new Date(monthDates[i]).getDay();
        totalPresentRow.innerHTML +=
            d === 0 || d === 6
                ? `<td class="weekend"></td>`
                : `<td class="total-col present">${day.present}</td>`;
    });

    totalPresentRow.innerHTML += `<td class="total-col-space"></td><td></td><td></td>`;
    tbody.appendChild(totalPresentRow);

    attendanceRows = Array.from(attendanceTable.querySelectorAll("tbody tr"));
}

// =============================
// Generar todos los días del mes (función clave)
// =============
function getMonthDays(year, month) {
  // month viene "04" → convertir a número
  const y = Number(year);
  const m = Number(month) - 1; // JS months 0-11

  const daysInMonth = new Date(y, m + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = (i + 1).toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
}


// ==============================================================================
// 🟢 Render Tabla Asistencias - MOBILE
// =============================================================================

function renderAttendanceMobileDay(attendance, year, month, day) {
  // 🔹 Hacer visible la sección mobile
  const mobileSection = document.querySelector(".attendance-mobile");
  if (mobileSection) mobileSection.style.display = "block";

  // 🔹 Actualizar título con nombre del día
  const mobileTitle = document.getElementById("mobileDayTitle");
  if (mobileTitle) {
    
    const dayName = getDayName(year, month, day);
    mobileTitle.textContent = ` ${monthNames[Number(month)-1]} ${year}`;
  }

  // 🔹 Procesar datos
  cachedMobileStudents = buildStudentMap(attendance);

  // 🔹 Render de los cards
  renderAttendanceMobileFromStudents(
    cachedMobileStudents,
    year,
    month,
    day
  );
}



function renderAttendanceMobileFromStudents(students, year, month, day) {
  const list = document.getElementById("attendanceMobileList");
  list.innerHTML = "";

  const fullDate = `${year}-${month}-${day}`;

  students.forEach(student => {
    const att = student.map?.[fullDate];

    let statusText = "–";
    let statusClass = "";

    if (att) {
      if (att.status === "present") {
        statusText = "P";
        statusClass = "status-present";
        if (att.late?.isLate) statusClass += " late";
      } else {
        statusText = "A";
        statusClass = "status-absent";
        if (att.justification?.isJustified) statusClass += " justified";
      }
    }

    const card = document.createElement("div");
    card.className = "attendance-card";

    card.innerHTML = `
      <div class="info">
        <span class="name">${student.name}</span>
        <span class="dni">${student.dni}</span>
      </div>
      <div class="attendance-status ${statusClass}">
        ${statusText}
      </div>
    `;

    list.appendChild(card);
  });
}


function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function fillDaySelect(year, month) {
  const daySelect = document.getElementById("daySelect");
  if (!daySelect) return;

  daySelect.innerHTML = "";

  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();

  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(Number(year), Number(month)-1, i);
    const dayOfWeek = date.getDay(); // 0=Domingo, 6=Sábado

    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Saltar sábados y domingos

    const dayStr = String(i).padStart(2, "0");
    const dayName = dayNames[dayOfWeek];

    const option = document.createElement("option");
    option.value = dayStr;
    option.textContent = `${dayName} / ${dayStr}`; // Lunes / 04
    daySelect.appendChild(option);
  }

  // Seleccionar primer día válido automáticamente
  daySelect.value = daySelect.options[0]?.value || "01";
}


  // =============================
  // Creamos un helper para el nombre del día
  // =============
function getDayName(year, month, day) {
  // month es "01" a "12" → en Date es 0-11
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return days[date.getDay()];
}

  // =============================
  // Para apear estudiantes
  // =============
function buildStudentMap(students) {
  return students.map(student => {
    if (student.map) return student; // ⛑️ ya normalizado

    const map = {};
    student.details.forEach(d => {
      map[d.date] = d;
    });

    return { ...student, map };
  });
}


  // =============================
  // Ordenar alfabeticamente
  // =============
function sortStudentsByName(students) {
  return [...students].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );
}
