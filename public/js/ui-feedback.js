// Toast
window.uiToast = (message, type = "info") => {
  const colors = {
    success: "#4CAF50",
    error: "#F44336",
    warning: "#FF9800",
    info: "#2196F3"
  };

  Toastify({
    text: message,
    duration: 3000,
    gravity: "top",
    position: "right",
    close: true,
    stopOnFocus: true,
    style: {
      background: colors[type],
      borderRadius: "8px",
      fontSize: "0.9rem"
    }
  }).showToast();
};

// Confirm
window.uiConfirm = async ({
  title = "¿Estás seguro?",
  text = "Esta acción no se puede deshacer",
  confirmText = "Sí, eliminar",
  cancelText = "Cancelar",
  icon = "warning"
}) => {
  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    reverseButtons: true
  });
};

const UI_MESSAGES = {
  user: {
    created: "Usuario agregado correctamente",
    deleted: "Usuario eliminado correctamente",
    exists: "El email o DNI ya está registrado",
    error: "Error al guardar el usuario"
  },
  course: {
    studentRemoved: "Alumno quitado del curso"
  }
};

// ⚠️ Salida sin guardar
window.uiWarnUnsaved = async ({
  title = "¿Tenés cambios sin guardar?",
  text = "Si salís ahora, perderás todas las notas no guardadas.",
  confirmText = "Salir sin guardar",
  cancelText = "Cancelar"
} = {}) => {
  return Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    reverseButtons: true,
    focusCancel: true,
    allowOutsideClick: false,
    allowEscapeKey: false
  });
};

