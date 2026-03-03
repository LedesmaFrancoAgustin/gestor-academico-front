const studentSidebar = document.getElementById("studentSidebar");
const studentSidebarToggle = document.getElementById("studentSidebarToggle");

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
  const isOpen = localStorage.getItem("studentSidebarOpen") === "true";
  if (isOpen) studentSidebar.classList.add("open");
} else {
  const isCollapsed = localStorage.getItem("studentSidebarCollapsed") === "true";
  if (isCollapsed) studentSidebar.classList.add("collapsed");
}

// ==============================
// Toggle sidebar
// ==============================
studentSidebarToggle.addEventListener("click", () => {
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    const open = studentSidebar.classList.toggle("open");
    localStorage.setItem("studentSidebarOpen", open);
  } else {
    const collapsed = studentSidebar.classList.toggle("collapsed");
    localStorage.setItem("studentSidebarCollapsed", collapsed);
  }
});
