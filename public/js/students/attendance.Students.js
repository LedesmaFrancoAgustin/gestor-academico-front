// =============================
// 🟢 Referencias al DOM
// =============================
const academicYearSelect = document.getElementById("academicYearSelect");
const monthSelect = document.getElementById("monthSelect");


let selectedYear = null
let selectedMonth = null

let absencesByYear = [];
let trimesterDate = new Date("2026-06-01"); // cambiar según tu calendario

let totalG = null;
let totalED = null;
let totalR = null


// ===========================================================================
// 🟢 Event listeners
// ===========================================================================

// =============================
//  Selector del año
// =============================
academicYearSelect.addEventListener("change", async () => {
  selectedYear = academicYearSelect.value;

  absencesByYear = await fetchAttendanceByYear(selectedYear);

  console.log("absencesByYear ",absencesByYear)
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

  const filtered = absencesByYear.filter(abs => {
    const day = abs.dayType.split("_")[0];
    const dateStr = `${abs.academicYear || new Date().getFullYear()}-${String(abs.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const month = new Date(dateStr).getMonth() + 1;
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
// 🟢  Render Tabla - Dirrecionamiento
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

// ===========================================================================
// 🟢  Render Tabla - Escritorio
// ===========================================================================

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
        <th><i class="fa-solid fa-dumbbell"></i> Tipo</th>
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
        <td colspan="6" class="empty-cell">
          ${options.filtered
            ? '<i class="fa-regular fa-face-smile"></i> No hay inasistencias en este mes'
            : '<i class="fa-solid fa-star"></i> No registra inasistencias este año'}
        </td>
      </tr>
    `;
  } else {
    absences
      .sort((a, b) => {
        const dayA = parseInt(a.dayType.split("_")[0]);
        const dayB = parseInt(b.dayType.split("_")[0]);
        return a.month - b.month || dayA - dayB;
      })
      .forEach(abs => {
        const parts = abs.dayType.split("_");
        const day = parts[0];
        const typeRaw = parts.slice(1).join("_"); // "regular" o "physical_education"
        const type = typeRaw === "physical_education" ? "ED" : "Clase"; // ✅ mapeo amigable

        const dateStr = `${abs.academicYear || new Date().getFullYear()}-${String(abs.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

        // determinar trimestre según la fecha de corte
        const absenceDate = new Date(dateStr);
        const trimester = absenceDate < trimesterDate ? 1 : 2;

        tbody.insertAdjacentHTML("beforeend", `
          <tr>
            <td>
              <i class="fa-regular fa-calendar-days"></i>
              ${formatDate(dateStr)}
            </td>

            <td class="center">${trimester}</td>

            <td class="center">${type}</td>

            <td class="center">
              ${abs.justified?.isJustified
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
// ===========================================================================
// 🟢  Render Tabla - Mobile
// ===========================================================================
function renderAbsencesMobile(absences = []) {
  const container = document.getElementById("absencesMobileContainer");
  container.innerHTML = "";
  document.getElementById("absencesTableContainer").innerHTML = ""; // limpiar desktop

  if (!absences || absences.length === 0) {
    container.innerHTML = `
      <div class="mobile-empty">
        <i class="fa-regular fa-face-smile"></i>
        No registra inasistencias
      </div>
    `;
    return;
  }

  // Ordenamos por mes y día
  const sortedAbsences = [...absences].sort((a, b) => {
    const dayA = parseInt(a.dayType.split("_")[0]);
    const dayB = parseInt(b.dayType.split("_")[0]);
    return a.month - b.month || dayA - dayB;
  });

  // Renderizamos cada ausencia
  sortedAbsences.forEach(abs => {
    const [day, ...typeParts] = abs.dayType.split("_");
    const typeRaw = typeParts.join("_");
    const type = typeRaw === "physical_education" ? "ED" : "Clase";

    const dateStr = `${abs.academicYear || new Date().getFullYear()}-${String(abs.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const trimester = Math.ceil(abs.month / 3);

    // Card de ausencia
    const cardHTML = `
      <div class="absence-card">

        <!-- Header: Fecha + Tipo + Trimestre -->
        <div class="absence-header">
          <span class="absence-date">
            <i class="fa-regular fa-calendar-days"></i> ${formatDate(dateStr)}
          </span>
          <span class="absence-type">
            <i class="fa-solid fa-dumbbell"></i> ${type}
          </span>
          <span class="absence-trim">
            <i class="fa-solid fa-layer-group"></i> Trim. ${trimester}
          </span>
        </div>

        <!-- Badges: Justificada / Tarde -->
        <div class="absence-badges">
          ${abs.justified?.isJustified ? `<span class="badge ok"><i class="fa-solid fa-check"></i> Justificada</span>` : ''}
          ${abs.late?.isLate ? `<span class="badge late"><i class="fa-solid fa-clock"></i> ${abs.late.minutes}m</span>` : ''}
        </div>

        <!-- Observaciones -->
        ${abs.notes?.trim() ? `
          <div class="absence-notes">
            <i class="fa-regular fa-comment-dots"></i> ${abs.notes}
          </div>
        ` : ''}
      </div>
    `;

    container.insertAdjacentHTML("beforeend", cardHTML);
  });
}
// ===========================================================================
// 🟢  Render Tabla - Totales
// ===========================================================================

function renderAbsencesTotals(absences = []) {
  const container = document.getElementById("absencesTotalTableContainer");
  container.innerHTML = "";

  let totalGeneral = 0;
  let totalAusente = 0;
  let totalEdFisica = 0;
  let totalTarde = 0;
  let totalJustificadas = 0;

  absences.forEach(a => {
    const parts = a.dayType.split("_");
    const type = parts.slice(1).join("_"); // "regular" o "physical_education"

    // Ausentes
    if (a.status === "absent") {
      if (type === "physical_education") {
        if (!a.justified?.isJustified) {
          totalEdFisica += 0.5;
          totalGeneral += 0.5;
        }
      } else if (type === "regular") {
        if (!a.justified?.isJustified) {
          totalGeneral += 1;
          totalAusente += 1;
        } else {
          totalJustificadas += 1;
        }
      }
    }

    // Presente con tarde
    if (a.status === "present" && a.late?.isLate) {
      totalTarde += 0.25;
      totalGeneral += 0.25;
    }
  });

  container.innerHTML = `
    <div class="absences-totals" style="display: flex; flex-direction: column; gap: 10px;">
      
      <!-- Primera fila: Total general / Justificada -->
      <div class="totals-row" style="display: flex; gap: 15px; justify-content: center;">
        <div class="total-card">
          <i class="fa-solid fa-user-xmark"></i>
          <span class="label">Total general</span>
          <span class="value">${totalGeneral}</span>
        </div>
        <div class="total-card ok">
          <i class="fa-solid fa-circle-check"></i>
          <span class="label">Justificada</span>
          <span class="value">${totalJustificadas}</span>
        </div>
      </div>

      <!-- Segunda fila: Clase / Educación física / Tardanzas -->
      <div class="totals-row" style="display: flex; gap: 15px;">
        <div class="total-card">
          <i class="fa-solid fa-user-xmark"></i>
          <span class="label">Clase</span>
          <span class="value">${totalAusente}</span>
        </div>
        <div class="total-card">
          <i class="fa-solid fa-dumbbell"></i>
          <span class="label">Educación física</span>
          <span class="value">${totalEdFisica}</span>
        </div>
        <div class="total-card">
          <i class="fa-solid fa-clock"></i>
          <span class="label">Tardanzas</span>
          <span class="value">${totalTarde}</span>
        </div>
      </div>

    </div>
  `;
}
// 🔹 Formatear fecha DD/MM/YYYY
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
