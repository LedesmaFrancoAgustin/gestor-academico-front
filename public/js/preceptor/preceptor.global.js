// teacher.js
const teacherSidebar = document.getElementById("preceptorSidebar");
const teacherSidebarToggle = document.getElementById("preceptorSidebarToggle");

// ==============================
// Nombre del usuario
// ==============================

// Obtenemos el usuario de localStorage
const storedUser = localStorage.getItem("user");

if (storedUser) {
  
  try {
    const user = JSON.parse(storedUser); // Convertimos de string a objeto
    const nameElement = document.getElementById("user-LastName");

    // Mostramos el nombre completo
    nameElement.textContent = `${user.apellido} ${user.nombre}`;
  } catch (e) {
    console.error("Error al parsear el usuario:", e);
  }
}

// ==============================
// Restaurar estado al cargar
// ==============================
const isMobile = window.innerWidth <= 768;

if (isMobile) {
  const isOpen = localStorage.getItem("preceptorSidebarOpen") === "true";
  if (isOpen) teacherSidebar.classList.add("open");
} else {
  const isCollapsed = localStorage.getItem("preceptorSidebarCollapsed") === "true";
  if (isCollapsed) teacherSidebar.classList.add("collapsed");
}

// ==============================
// Toggle sidebar
// ==============================
teacherSidebarToggle.addEventListener("click", () => {
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    const open = teacherSidebar.classList.toggle("open");
    localStorage.setItem("preceptorSidebarOpen", open);
  } else {
    const collapsed = teacherSidebar.classList.toggle("collapsed");
    localStorage.setItem("preceptorSidebarCollapsed", collapsed);
  }
});

  /* ==========================
     HANDLE RESIZE
  ========================== */
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      sidebar.classList.remove("open");
    }
  });
