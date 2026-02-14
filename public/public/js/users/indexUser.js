// 1️⃣ Función para obtener las estadísticas del backend
async function fetchDashboardStatsTeacher() {
  try {
    const response = await fetch(`${API_URL}/api/dashboard/stats/teacher`, {
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
function renderDashboardStatsTeacher(data) {
  if (!data) return; // No hacer nada si no hay datos

  const statSubjets = document.getElementById("stat-materias");
  statSubjets.textContent = data.totalSubjects || 0; // Alumnos

  const totalCourses = document.getElementById("stat-cursos");
  totalCourses.textContent = data.totalCourses || 0; // Alumnos

  const statStudents = document.getElementById("stat-alumnos");
  statStudents.textContent = data.totalStudents || 0; // Alumnos

}

// 3️⃣ Ejecutar al cargar la página
window.addEventListener("DOMContentLoaded", async () => {
  const stats = await fetchDashboardStatsTeacher();
  renderDashboardStatsTeacher(stats);
});
