// =============================
// 🟢 Referencias al DOM
// =============================
const academicYearSelect = document.getElementById("academicYearSelect");
const courseSelect = document.getElementById("courseSelect");

const searchInputStudents = document.getElementById("studentsSearch");


let studentsInfo = [];

// =============================
//  Selector del año
// =============================
academicYearSelect.addEventListener("change", async () => {
  selectedYear = academicYearSelect.value;
  const courses = await fetchGetCoursesByYear(selectedYear);
 
  courseSelect.innerHTML =
    '<option value="" selected disabled>Seleccione un curso</option>';

  if (!courses.length) {
    uiToast("Todavía no hay cursos disponibles para este año", "info");
    courseSelect.disabled = true;
    return;
  }

  courses.forEach(course => {
    const option = document.createElement("option");
    option.value = course._id;
    option.textContent = course.name;
    courseSelect.appendChild(option);
  });

  courseSelect.disabled = false;
});

// =============================
//  Selector del curso
// =============================
courseSelect.addEventListener("change", async () => {
  selectedCourse = courseSelect.value;

  // 1️⃣ Traer alumnos del curso
    const studentsInfo = await fetchGetStudentsByCourse(selectedCourse);

    loadAndRenderAttendance(studentsInfo)
});

// =============================
//  Buscador de alunos Nombre/Dni
// =============================
searchInputStudents.addEventListener("input", () => {
  const query = searchInputStudents.value.trim().toLowerCase();

  // Filtrar estudiantes por nombre, apellido o dni
  const filteredStudents = studentsInfo.filter(student => {
    const fullName = `${student.name}`.toLowerCase();
    const dni = student.dni?.toLowerCase() || "";
    return fullName.includes(query) || dni.includes(query);
  });

  // Detectar desktop o mobile
  const isDesktop = window.innerWidth > 768;

  if (isDesktop) {
    renderStudentsTable(filteredStudents);
  } else {
    renderStudentsTableMobile(filteredStudents);
  }
});


// =======================================================================================
// 🟢 Render Tabla estudiantes 
// =======================================================================================
function renderStudentsTable(students) {
    const table = document.getElementById("preceptorStudentsTable");
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");

    // Limpiar tabla
    thead.innerHTML = "";
    tbody.innerHTML = "";

    // Crear cabecera
    const headers = ["#", "Nombre", "Género", "DNI", "Email", "Legajo", "Fecha Nac.", "Libro/Folio", "Status"];
    const headerRow = document.createElement("tr");
    headers.forEach(headerText => {
        const th = document.createElement("th");
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Crear filas de alumnos
    students.forEach((student, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${student?.name}</td>
            <td>${student.genero}</td>
            <td>${student.dni}</td>
            <td>${student.email}</td>
            <td>${student.legajo}</td>
            <td>${formatDate(student.fechaNacimiento)}</td>
            <td>${student.libroFolio}</td>
            <td class="${student.status === 'activo' ? 'status-activo' : 'status-inactivo'}">${student.status}</td>
        `;
        tbody.appendChild(tr);
    });
}

// =======================================================================================
// 🟢 Render Tabla estudiantes  - Mobile
// =======================================================================================
function renderStudentsTableMobile(students) {
  const container = document.getElementById("preceptorStudentsTable");
  container.innerHTML = ""; // Limpiar tabla anterior (desktop)

  students.forEach((student, index) => {
    const card = document.createElement("div");
    card.className = "student-card";

    card.innerHTML = `
      <div class="card-header">
        <span class="student-index">${index + 1}.</span>
        <span class="student-name">${student.name}</span>
        <span class="student-status ${student.status === 'activo' ? 'status-activo' : 'status-inactivo'}">${student.status}</span>
      </div>
      <div class="card-body">
        <div><strong>DNI:</strong> ${student.dni}</div>
        <div><strong>Género:</strong> ${student.genero || '-'}</div>
        <div><strong>Fecha Nac.:</strong> ${formatDate(student.fechaNacimiento)}</div>
        <div><strong>Legajo:</strong> ${student.legajo || '-'}</div>
        <div><strong>Email:</strong> ${student.email || '-'}</div>
        <div><strong>Libro/Folio:</strong> ${student.libroFolio || '-'}</div>
      </div>
    `;
    container.appendChild(card);
  });
}
// =======================================================================================
// 🟢 Funciones 
// =======================================================================================
async function  loadAndRenderAttendance  (){
    // 1️⃣ Traer alumnos del curso
    studentsInfo = await fetchGetStudentsByCourse(selectedCourse);

    console.log(studentsInfo)

    const isDesktop = window.innerWidth > 768;
    if (isDesktop) {
      renderStudentsTable(studentsInfo);
    } else {
      renderStudentsTableMobile(studentsInfo);
    }
    
}

// =============================
// 🔹 Formatear fecha igual que en MongoDB
// =============================
function formatDate(fechaNacimiento) {
   console.log(fechaNacimiento)
  if (!fechaNacimiento || fechaNacimiento == "-") return "-";
  // Si viene como objeto {$date: "..."} usamos .$date
  const dateStr = fechaNacimiento.$date || fechaNacimiento;
  const d = new Date(dateStr);

  const day = d.getUTCDate().toString().padStart(2, "0");
  const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = d.getUTCFullYear();

  return `${day}/${month}/${year}`;
}


// =======================================================================================
// 🟢 Fetch 
// =======================================================================================
// =============================
// 🟢 Fetch - Obtener cursos asignados a un preceptor por año (userId desde localStorage)
// =============================
async function fetchGetCoursesByYear(year) {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user")); // recordá parsear el JSON

    if (!token) {
      console.warn("No hay token disponible");
      return [];
    }

    if (!user?.id) {
      console.warn("No hay usuario logueado");
      return [];
    }

    if (!year) {
      console.warn("Debe indicar un año académico");
      return [];
    }

    const usersId = user.id;

    console.log(usersId, year)
    // Llamada al endpoint
    const response = await fetch(
      `${API_URL}/api/course/${usersId}/AssignedToCourse?year=${year}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: No se pudieron cargar los cursos`);
    }

    const result = await response.json();
    return result?.data ?? [];

  } catch (error) {
    uiToast("Error al obtener cursos en servidor", "error");
    console.error("fetchGetCoursesByYear:", error.message);
    return [];
  }
}

// =============================
// 🟢 Fetch - Buscar estudiantes de un curso
// =============================
async function fetchGetStudentsByCourse(courseId) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("No hay token disponible");
      return [];
    }

    if (!courseId) {
      console.warn("Debe indicar un curso válido");
      return [];
    }

    const response = await fetch(`${API_URL}/api/course/${courseId}/students`, {
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
    // Normalizar datos: asegurarse de que cada estudiante tenga status
    return Array.isArray(result?.data)
    ? result.data.map(s => {
        const student = s.student || {};
        return {
          _id: student._id || s._id || "-", // fallback si no existe
          name: student.apellido && student.nombre ? `${student.apellido} ${student.nombre}` : "Alumno no encontrado",
          genero: student.genero || "-",
          dni: student.dni || "-",
          email: student.email || "-",
          legajo: student.legajo || "-",
          fechaNacimiento: student.fechaNacimiento || "-",
          libroFolio: student.libroFolio || "-",
          status: s.status || "No asignado"
        };
      })
    : [];


  } catch (error) {
    uiToast("Error al obtener informacion sobre el curso en el servidor", "error");
    console.error("fetchGetStudentsByCourse:", error.message);
    return [];
  }
}