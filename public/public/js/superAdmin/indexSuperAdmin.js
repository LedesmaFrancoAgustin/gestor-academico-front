// 1️⃣ Función para obtener las estadísticas del backend
async function fetchDashboardStats() {
  try {
    const response = await fetch(`${API_URL}/api/dashboard/stats`, {
      headers: {
        "Authorization": `Bearer ${token}` // si usás token
      }
    });

    if (!response.ok) throw new Error("Error al cargar estadísticas");

    const res = await response.json();
    return res.data; // Retorna solo los datos

  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return null; // Devuelve null si hay error
  }
}

// 2️⃣ Función para renderizar los datos en el DOM
function renderDashboardStats(data) {
  if (!data) return; // No hacer nada si no hay datos

  const statCards = document.querySelectorAll(".stat-card .stat-number");
  if (statCards.length >= 4) {
    statCards[0].textContent = data.students || 0; // Alumnos
    statCards[1].textContent = data.teachers || 0; // Docentes
    statCards[2].textContent = data.courses || 0;  // Cursos
    statCards[3].textContent = data.subjects || 0; // Materias
  }
}

// 3️⃣ Ejecutar al cargar la página
window.addEventListener("DOMContentLoaded", async () => {
  const stats = await fetchDashboardStats();
  renderDashboardStats(stats);
});
