// =============================
// 🟢 Referencias al DOM
// =============================
const academicYearSelect = document.getElementById("academicYearSelect");
const monthSelect = document.getElementById("monthSelect");


let selectedYear = null
let selectedMonth = null

let absencesByYear = [];


// ===========================================================================
// 🟢 Event listeners
// ===========================================================================

// =============================
//  Selector del año
// =============================
academicYearSelect.addEventListener("change", async () => {
  selectedYear = academicYearSelect.value;

  absencesByYear = await fetchAttendanceByYear(selectedYear);

  monthSelect.value = "";
  monthSelect.disabled = false;

  renderAbsences(absencesByYear);
});



// =============================
//  Selector del mes
// =============================
monthSelect.addEventListener("change", () => {
  selectedMonth = monthSelect.value;

  if (!selectedMonth) {
    renderAbsences(absencesByYear, { filtered: false });
    return;
  }

  const filtered = absencesByYear.filter(({ date }) => {
    const month = new Date(date).getMonth() + 1;
    return month === Number(selectedMonth);
  });

  renderAbsences(filtered, { filtered: true });
});





// =============================
// 🟢 Fetch al backend - 
// =============================
// =============================
//  Fetch Buscar cursos 
// =============================
async function fetchAttendanceByYear(year) {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (!token || !user?.id) return [];

    const res = await fetch(
      `${API_URL}/api/attendance/user/${user.id}/year?academicYear=${year}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!res.ok) throw new Error("Error al cargar asistencias");

    const { data } = await res.json();
    return data || [];
  } catch (err) {
    console.error("fetchAttendanceByYear:", err);
    return [];
  }
}


// ===========================================================================
// 🟢  Render Tabla - Desktop
// ===========================================================================

function renderAbsences(data, options = { filtered: false }) {
  renderAbsencesTotals(data); // común a ambos
 const isDesktop = window.innerWidth > 768;
  if (isDesktop) {
    renderAbsencesTable(data, options);
  } else {
    renderAbsencesMobile(data);
  }
}


function renderAbsencesTable(absences = [], options = { filtered: false }) {
  document.getElementById("absencesMobileContainer").innerHTML = "";
  const container = document.getElementById("absencesTableContainer");
  container.innerHTML = "";

  const table = document.createElement("table");
  table.className = "absences-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th><i class="fa-regular fa-calendar"></i> Fecha</th>
        <th><i class="fa-solid fa-layer-group"></i> Trim.</th>
        <th><i class="fa-solid fa-circle-check"></i> Just.</th>
        <th><i class="fa-solid fa-clock"></i> Tarde</th>
        <th><i class="fa-solid fa-note-sticky"></i> Observación</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement("tbody");

  if (absences.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">
          ${options.filtered
            ? '<i class="fa-regular fa-face-smile"></i> No hay inasistencias en este mes'
            : '<i class="fa-solid fa-star"></i> No registra inasistencias este año'}
        </td>
      </tr>
    `;
  } else {
    absences
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(abs => {
        tbody.insertAdjacentHTML("beforeend", `
          <tr>
            <td>
              <i class="fa-regular fa-calendar-days"></i>
              ${formatDate(abs.date)}
            </td>

            <td class="center badge">
              ${abs.trimester}
            </td>

            <td class="center">
              ${abs.justification?.isJustified
                ? '<i class="fa-solid fa-check text-ok"></i>'
                : '<i class="fa-solid fa-xmark text-no"></i>'}
            </td>

            <td class="center">
              ${abs.late?.isLate
                ? `<i class="fa-solid fa-clock text-late"></i> ${abs.late.minutes}m`
                : '—'}
            </td>

            <td class="obs">
              ${abs.notes?.trim()
                ? `<i class="fa-regular fa-comment-dots"></i> ${abs.notes}`
                : '—'}
            </td>
          </tr>
        `);
      });
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

function renderAbsencesTotals(absences = []) {
  const container = document.getElementById("absencesTotalTableContainer");
  container.innerHTML = "";

  const total = absences.length;

  const justified = absences.filter(
    a => a.justification?.isJustified
  ).length;

  container.innerHTML = `
    <div class="absences-totals">
      <div class="total-card">
        <i class="fa-solid fa-user-xmark"></i>
        <span class="label">Total faltas</span>
        <span class="value">${total}</span>
      </div>

      <div class="total-card ok">
        <i class="fa-solid fa-circle-check"></i>
        <span class="label">Justificadas</span>
        <span class="value">${justified}</span>
      </div>
    </div>
  `;
}

// ===========================================================================
// 🟢  Render Tabla - Mobile
// ===========================================================================
function renderAbsencesMobile(absences = []) {
  document.getElementById("absencesTableContainer").innerHTML = "";
  const container = document.getElementById("absencesMobileContainer");
  container.innerHTML = "";

  if (absences.length === 0) {
    container.innerHTML = `
      <div class="mobile-empty">
        <i class="fa-regular fa-face-smile"></i>
        No registra inasistencias
      </div>
    `;
    return;
  }

  absences
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(abs => {
      container.insertAdjacentHTML("beforeend", `
        <div class="absence-card">
          
          <div class="absence-header">
            <span class="date">${formatDate(abs.date)}</span>
            <span class="trim">Trim. ${abs.trimester}</span>
          </div>

          <div class="absence-badges">
            ${
              abs.justification?.isJustified
                ? `<span class="badge ok"><i class="fa-solid fa-check"></i> Justificada</span>`
                : ``
            }

            ${
              abs.late?.isLate
                ? `<span class="badge late"><i class="fa-solid fa-clock"></i> ${abs.late.minutes}m</span>`
                : ""
            }
          </div>

          ${
            abs.notes?.trim()
              ? `<div class="absence-notes">
                   <i class="fa-regular fa-comment-dots"></i>
                   ${abs.notes}
                 </div>`
              : ""
          }

        </div>
      `);
    });
}




function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
