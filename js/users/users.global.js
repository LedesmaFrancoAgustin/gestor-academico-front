// teacher.js
const teacherSidebar = document.getElementById("teacherSidebar");
const teacherSidebarToggle = document.getElementById("teacherSidebarToggle");

// ==============================
// Restaurar estado al cargar
// ==============================
const isMobile = window.innerWidth <= 768;

if (isMobile) {
  const isOpen = localStorage.getItem("teacherSidebarOpen") === "true";
  if (isOpen) teacherSidebar.classList.add("open");
} else {
  const isCollapsed = localStorage.getItem("teacherSidebarCollapsed") === "true";
  if (isCollapsed) teacherSidebar.classList.add("collapsed");
}

// ==============================
// Toggle sidebar
// ==============================
teacherSidebarToggle.addEventListener("click", () => {
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    const open = teacherSidebar.classList.toggle("open");
    localStorage.setItem("teacherSidebarOpen", open);
  } else {
    const collapsed = teacherSidebar.classList.toggle("collapsed");
    localStorage.setItem("teacherSidebarCollapsed", collapsed);
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



