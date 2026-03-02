// =============================
// 🟢 Referencias al DOM
// =============================
const statCursos = document.getElementById("stat-cursos");
const statAlumnos = document.getElementById("stat-alumnos");

let preceptorId;

// =============================
// 🟢 Ejecutar al cargar la página
// =============================
window.addEventListener("DOMContentLoaded", async () => {
// Obtenemos el usuario desde localStorage
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return console.warn("No hay usuario en localStorage");

  try {
    const user = JSON.parse(storedUser);
    preceptorId = user.id; // 🔹 asumimos que tu usuario tiene _id
    if (!preceptorId) return console.warn("El usuario no tiene ID");
  } catch (e) {
    console.error("Error al parsear el usuario:", e);
    return;
  }

  const stats = await fetchDashboardStats(preceptorId);
  renderDashboardStats(stats);
});

// =============================
// 🟢 Render datos
// =============================
function renderDashboardStats(data) {
  if (!data) return; // No hacer nada si no hay datos

 // Cursos
  if (statCursos) statCursos.textContent = data.courses ?? 0;

  // Alumnos
  if (statAlumnos) statAlumnos.textContent = data.students ?? 0;
}

// =============================
// 🟢 Fetch - Buscar estudiantes de un curso
// =============================
async function fetchDashboardStats(preceptorId) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("No hay token disponible");
      return {};
    }

    const response = await fetch(`${API_URL}/api/dashboard/stats/${preceptorId}`, {
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
    return result.data; // 🔹 IMPORTANTE: devolver el resultado
  } catch (error) {
    uiToast("Error al obtener información sobre el curso en el servidor", "error");
    console.error("fetchDashboardStats:", error.message);
    return {};
  }
}