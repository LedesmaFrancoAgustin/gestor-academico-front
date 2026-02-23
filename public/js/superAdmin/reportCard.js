// =============================
// 🟢 Referencias al DOM
// =============================

const academicYearSelect = document.getElementById("yearAcademicSelect");

const openModal = document.getElementById("btnAddConfig");
const rcmModal = document.getElementById("reportCardModal");
const rcmBtnClose = document.getElementById("rcmBtnCloseModal");
const rcmBtnCancel = document.getElementById("rcmBtnCancel")

const defaultPeriods = ["firstTerm","secondTerm","recuperatory","december","february"];

let selectedYear = null
let selectedYearId = null

let currentConfigId = null;
let currentPeriodKey = null;

let currentEvaluationType = null;
let originalPeriodSnapshot = null;



// =============================
// 🟢 Event listeners
// =============================
// =============================
//  Selector del año
// =============================
academicYearSelect.addEventListener("change", async () => {
  selectedYear = academicYearSelect.value;

  const GetConfig = await fetchGetAcademicYearPeriodConfig(selectedYear);
  if (GetConfig)
    selectedYearId = GetConfig._id
    currentConfig = GetConfig; // 🚀 guardar globalmente

  renderAcademicYearConfigTable(GetConfig)

});

// =============================
//  Eventos Modal - Crear Fechas
// =============================
// Eventos
openModal.addEventListener("click", openReportCardModal);
rcmBtnClose.addEventListener("click", closeReportCardModal);
rcmBtnCancel.addEventListener("click", closeReportCardModal);
btnSaveReportCard.addEventListener("click",saveReportCardConfig); // Listener para el botón guardar
// Cerrar al clickear fuera del contenido
rcmModal.addEventListener("click", (e) => {
  if (e.target === rcmModal) closeReportCardModal();
});
// Cancelar modal
rcmBtnCancel.addEventListener("click", () => {
  modal.classList.remove("show");
  modal.style.display = "none";
  configForm.reset();
  periodsContainer.innerHTML = "";
});
// =============================
//  Eventos Modal - Editar fechas
// =============================
// boton para actualizar fechas
document.getElementById("btnSaveEditPeriod").addEventListener("click", async () => {
  const start = document.getElementById("editPeriodStart").value;
  const end = document.getElementById("editPeriodEnd").value;
  const pub = document.getElementById("editPeriodPublication").value;

  if (!start || !end || !pub) {
    return uiToast("Todos los campos de fecha son obligatorios", "error");
  }

  // 🔹 Comparar si hubo cambios reales
  if (
    start === originalPeriodSnapshot.start &&
    end === originalPeriodSnapshot.end &&
    pub === originalPeriodSnapshot.publication
  ) {
    return uiToast("No se modificó ninguna fecha", "info");
  }

  const evaluationData = {
    gradingWindow: {
      startDate: new Date(start + "T00:00:00").toISOString(),
      endDate: new Date(end + "T00:00:00").toISOString()
    },
    publicationDate: new Date(pub + "T00:00:00").toISOString()
  };

  try {
    const updated = await fetchUpdateAcademicYearPeriodConfig(currentConfigId, {
      periodKey: currentPeriodKey,
      evaluationType: currentEvaluationType, // 🔥 IMPORTANTE
      evaluationData
    });

    if (updated) {
      uiToast("Periodo actualizado correctamente", "success");

      // 🔹 Actualizamos el currentConfig LOCAL (sin recargar todo)
      const period = currentConfig.periods.find(p => p.key === currentPeriodKey);
      const evaluation = period.evaluations.find(e => e.type === currentEvaluationType);

      evaluation.gradingWindow = evaluationData.gradingWindow;
      evaluation.publicationDate = evaluationData.publicationDate;
    }

    document.getElementById("editPeriodModal").classList.remove("show");

    renderAcademicYearConfigTable(currentConfig);

  } catch (err) {
    console.error(err);
    uiToast(err.message || err, "error");
  }
});
document.getElementById("btnCancelEditPeriod").addEventListener("click", () => {
  document.getElementById("editPeriodModal").classList.remove("show");
});
document.getElementById("btnCloseEditPeriod").addEventListener("click", () => {
  document.getElementById("editPeriodModal").classList.remove("show");
});


// =============================
// 🟢 Render
// =============================
function renderAcademicYearConfigTable(config) {
  const tbody = document.getElementById("configsTableBody");
  tbody.innerHTML = "";

  if (!config || !config.periods || config.periods.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="7" class="text-center text-muted py-4">
        <i class="fa fa-exclamation-circle fa-lg me-2"></i>
        No hay configuración de períodos para este año académico
      </td>
    `;
    tbody.appendChild(tr);
    return;
  }

  const { academicYear, periods } = config;

  const formatDate = dateStr => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-AR");
  };

  const today = new Date();

  periods.forEach(period => {

    if (!period.evaluations || period.evaluations.length === 0) return;

    period.evaluations.forEach(evaluation => {

      const { gradingWindow, publicationDate, type } = evaluation;

      let estado = "Cerrado";

      if (
        !period.isManuallyClosed &&
        gradingWindow?.startDate &&
        gradingWindow?.endDate
      ) {
        const start = new Date(gradingWindow.startDate);
        const end = new Date(gradingWindow.endDate);

        if (today >= start && today <= end) {
          estado = "Abierto";
        }
      }

      let estadoBadge = estado === "Abierto"
        ? `<span class="badge bg-success">${estado}</span>`
        : `<span class="badge bg-danger">${estado}</span>`;

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${academicYear}</td>
        <td>${period.name}</td>
        <td>${type === "partial" ? "Parcial" : "Final"}</td>
        <td>${formatDate(gradingWindow?.startDate)}</td>
        <td>${formatDate(gradingWindow?.endDate)}</td>
        <td>${formatDate(publicationDate)}</td>
        <td>${estadoBadge}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-edit"
            title="Editar Fecha"
            data-period-key="${period.key}"
            data-evaluation-type="${type}">
            <i class="fa fa-edit"></i>
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  });

  // Evento editar
  document.addEventListener("click", e => {
    if (e.target.closest(".btn-edit")) {
      const btn = e.target.closest(".btn-edit");
      const periodKey = btn.dataset.periodKey;
      const evaluationType = btn.dataset.evaluationType;

      const period = currentConfig.periods.find(p => p.key === periodKey);
      const evaluation = period.evaluations.find(e => e.type === evaluationType);

      openEditPeriodModal(selectedYearId, period, evaluation);
    }
  });
}
// =============================
// 🟢 Funciones
// =============================
function openEditPeriodModal(configId, period, evaluation) {
  currentConfigId = configId;
  currentPeriodKey = period.key;
  currentEvaluationType = evaluation.type;

  if (!evaluation) {
    uiToast("No se encontró la evaluación", "error");
    return;
  }

  // 🔹 Guardamos snapshot ORIGINAL para comparar cambios
  originalPeriodSnapshot = {
    start: formatInputDate(evaluation.gradingWindow?.startDate),
    end: formatInputDate(evaluation.gradingWindow?.endDate),
    publication: formatInputDate(evaluation.publicationDate)
  };

  document.getElementById("editPeriodTitle").innerText =
    `Editar ${period.name} - ${evaluation.type}`;

  document.getElementById("editPeriodName").innerText =
    `${period.name} (${evaluation.type})`;

  document.getElementById("editPeriodStart").value =
    originalPeriodSnapshot.start;

  document.getElementById("editPeriodEnd").value =
    originalPeriodSnapshot.end;

  document.getElementById("editPeriodPublication").value =
    originalPeriodSnapshot.publication;

  document.getElementById("editPeriodModal").classList.add("show");
}

function formatInputDate(date) {
  if (!date) return "";

  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
// Abrir modal
function openReportCardModal() {
  rcmModal.classList.add("show");
}
// Cerrar modal
function closeReportCardModal() {
  rcmModal.classList.remove("show");
}
// 🔹 Función para obtener los datos del modal en el formato correcto
function getAcademicYearPeriodDataForBackend() {
  const academicYear = parseInt(document.getElementById("academicYear").value);
  const modal = document.getElementById("reportCardModal");
  const periodCards = modal.querySelectorAll(".rcf-period-card");

  const periods = [];
  const invalidPeriods = [];

  periodCards.forEach(card => {

    const key = card.dataset.key;
    const nameText = card.querySelector(".rcf-period-title").textContent.trim();

    const evaluationBlocks = card.querySelectorAll(".rcf-evaluation-block");

    const evaluations = [];
    let periodHasError = false;

    evaluationBlocks.forEach(block => {

      const type = block.dataset.type;

      const startDate = block.querySelector('[data-field="startDate"]')?.value;
      const endDate = block.querySelector('[data-field="endDate"]')?.value;
      const publicationDate = block.querySelector('[data-field="publicationDate"]')?.value;

      console.log("Periodo:", nameText);
      console.log("Tipo:", type);
      console.log({ startDate, endDate, publicationDate });

      if (!startDate || !endDate || !publicationDate) {
        periodHasError = true;
        return;
      }

      evaluations.push({
        type,
        gradingWindow: { startDate, endDate },
        publicationDate,
        isManuallyClosed: false
      });
    });

    if (periodHasError) {
      invalidPeriods.push(nameText);
      return;
    }

    periods.push({
      key,
      name: nameText,
      evaluations
    });

  });

  if (invalidPeriods.length > 0) {
    uiToast(
      `Completa todas las fechas de: ${invalidPeriods.join(", ")}`,
      "warning"
    );
    return null;
  }

  return { academicYear, periods };
}
// 🔹 Función para guardar en backend
async function saveReportCardConfig() {
  const data = getAcademicYearPeriodDataForBackend();
  if (!data) return; // si hay periodos incompletos no envía nada

  const result = await fetchCreateAcademicYearPeriodConfig(data);
  if (result) {
    uiToast("¡Fechas guardadas correctamente!", "success");
    document.getElementById("reportCardModal").classList.remove("show");
  }
}

// =============================
// 🟢 Fetch
// =============================
// =============================
//  Fetch Guardar configuraciones 
// =============================
async function fetchCreateAcademicYearPeriodConfig(data) {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (!token || !user?.id) return null;

    const res = await fetch(`${API_URL}/api/academicYearPeriodConfig/`, {
      method: "POST", // 🔹 POST para crear
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data) // 🔹 enviar los datos al backend
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Error creando la configuración");
    }

    const response = await res.json();
    return response.data; // 🔹 devuelve solo los datos
  } catch (err) {
    console.error("Error en fetchCreateAcademicYearPeriodConfig:", err);
    uiToast(err , "error");
    return null;
  }
}
// =============================
//  Fetch Buscar configuraciones 
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
// =============================
//  Fetch Actualizar fechas
// =============================
async function fetchUpdateAcademicYearPeriodConfig(configId, data) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/api/academicYearPeriodConfig/${configId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.message || "Error actualizando periodo");
  }

  const response = await res.json();
  return response.data;
}





