const studentSidebar = document.getElementById("studentSidebar");
const studentSidebarToggle = document.getElementById("studentSidebarToggle");

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
