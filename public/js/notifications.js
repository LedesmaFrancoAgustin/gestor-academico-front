// =============================
// 🔔 HEADER NOTIFICATIONS
// =============================

// Elementos del DOM
const notificationToggle = document.getElementById("notificationDropdown");
const dropdown = document.getElementById("notifications-dropdown");
const badge = document.getElementById("notifications-badge");

//console.log(dropdown, badge);


//const deleteBtn = link.querySelector(".delete-notification");

// =============================
// 🎨 Iconos por tipo
// =============================
function iconByType(type) {
  switch (type) {
    case "nota": return "📘";
    case "falta": return "❌";
    case "mensaje": return "💬";
    case "sistema": return "📢";
    default: return "🔔";
  }
}



// =============================
// 📥 Cargar notificaciones HEADER
// =============================
async function loadHeaderNotifications() {
  try {
    if (!dropdown || !badge) return;

    const { data: notifications } = await fetchGetNotifications();

    // 🧹 Limpiar notificaciones dinámicas
    dropdown
      .querySelectorAll(".dynamic-notification")
      .forEach(item => item.remove());

    // 🔔 Sin notificaciones
    if (!Array.isArray(notifications) || notifications.length === 0) {
      badge.classList.add("d-none");
      insertEmptyNotification();
      return;
    }

    // 🔢 Badge
    const unread = notifications.filter(n => !n.read).length;
    badge.textContent = unread;
    badge.classList.toggle("d-none", unread === 0);

    // 📌 Insertar antes del item estático ("Ver todas")
    const divider = dropdown.querySelector(".dropdown-divider")?.parentElement;



    notifications.slice(0, 5).forEach(n => {
      const li = document.createElement("li");
      li.classList.add("dynamic-notification");

      const link = document.createElement("a");
      link.href = "#";
      link.className = `dropdown-item ${n.read ? "notification-read" : "fw-bold"}`;

      link.innerHTML = `
        <div class="d-flex justify-content-between align-items-start gap-2">
          <span>
            ${iconByType(n.type)} ${n.title}
            <small class="d-block text-muted">${n.message}</small>
          </span>

          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-check-circle-fill read-icon"
               style="color:${n.read ? "#198754" : "#6c757d"}"></i>

            <button class="btn btn-sm btn-link text-danger p-0 delete-notification">
              <i class="bi bi-x-circle"></i>
            </button>
          </div>
        </div>
      `;

      // ❌ Eliminar
      link.querySelector(".delete-notification").addEventListener("click", async e => {
        e.preventDefault();
        e.stopPropagation();

        await deleteNotification(n._id);
        li.remove();

        if (!n.read) {
          const current = Number(badge.textContent) || 0;
          badge.textContent = Math.max(0, current - 1);
          if (current - 1 <= 0) badge.classList.add("d-none");
        }

        if (!dropdown.querySelector(".dynamic-notification")) {
          insertEmptyNotification();
        }
      });

      // 🟢 Marcar como leída
      link.addEventListener("click", async e => {
        if (e.target.closest(".delete-notification")) return;
        e.preventDefault();
         e.stopPropagation();

        if (n.read) return;

        await markAsRead(n._id);
        n.read = true;

        link.classList.remove("fw-bold");
        link.classList.add("notification-read");

        const icon = link.querySelector(".read-icon");
        if (icon) icon.style.color = "#198754";

        const current = Number(badge.textContent) || 0;
        badge.textContent = Math.max(0, current - 1);
        if (current - 1 <= 0) badge.classList.add("d-none");
      });

      li.appendChild(link);

      // 📥 Inserción segura
     if (divider && divider.nextSibling) {
        dropdown.insertBefore(li, divider.nextSibling);
      } else {
        dropdown.appendChild(li);
      }


    });

  } catch (err) {
    console.error("Error cargando notificaciones:", err);
  }
}
//=============================
// ✅ Traer Notificaciones
// =============================
async function fetchGetNotifications() {
  const res = await fetch(`${API_URL}/api/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

// =============================
// ✅ Marcar como leída
// =============================
async function markAsRead(id) {
  try {
    await fetch(`${API_URL}/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

  } catch (error) {
    console.error("Error marcando notificación:", error);
  }
}
// =============================
// ❌ Eliminar notificación
// =============================
async function deleteNotification(id) {
  try {
    await fetch(`${API_URL}/api/notifications/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch (error) {
    console.error("Error eliminando notificación:", error);
  }
}

// =============================
// 🟡 Notificación vacía
// =============================
function insertEmptyNotification() {
  if (!dropdown) return;

  // ❌ Evitar duplicados
  if (dropdown.querySelector(".dynamic-notification")) return;

  const li = document.createElement("li");
  li.classList.add("dynamic-notification");
  li.innerHTML = `
    <span class="dropdown-item text-muted text-center">
      No tenés notificaciones
    </span>
  `;

  // 📌 Insertar DESPUÉS del divider
  const dividerLi = dropdown.querySelector(".dropdown-divider")?.parentElement;

  if (dividerLi && dividerLi.nextSibling) {
    dropdown.insertBefore(li, dividerLi.nextSibling);
  } else {
    dropdown.appendChild(li);
  }
}





// =============================
// 🚀 Eventos
// =============================

let notificationsLoaded = false;

notificationDropdown.addEventListener("shown.bs.dropdown", () => {
  if (!notificationsLoaded) {
    loadHeaderNotifications();
    notificationsLoaded = true;
  }
});


// Carga inicial (badge)
loadHeaderNotifications();
