
const toggleSidebarButton = document.getElementById('toggleSidebar');

toggleSidebarButton.addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  const content = document.getElementById('content');
  const footer = document.getElementById('footer');
  const sidebarContainer = document.querySelector('.sidebar-container');
  const icon = toggleSidebarButton.querySelector('i');

  sidebar.classList.toggle('hidden');
  content.classList.toggle('expanded');
  footer.classList.toggle('expandedFooter');
  sidebarContainer.classList.toggle('collapsed');

  icon.classList.toggle('rotate');

  console.log(icon);

});








