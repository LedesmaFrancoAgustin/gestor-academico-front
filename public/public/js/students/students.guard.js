(function () {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "../../login.html";
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    console.log(payload.rol);
    if (payload.rol !== "alumno") {
      window.location.href = "../../403.html";
      return;
    }

    if (payload.exp * 1000 < Date.now()) {
      localStorage.clear();
      window.location.href = "../../login.html";
    }
  } catch {
    localStorage.clear();
    window.location.href = "../../login.html";
  }
})();
