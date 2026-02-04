const coursesContainer = document.getElementById("coursesGrid"); // div donde se van a mostrar los cursos
const subjectsGridContainer = document.getElementById("subjectsGrid");

subjectsGrid
// Llamamos a la función al cargar la página
document.addEventListener("DOMContentLoaded", renderCourses);
// Traer los cursos del usuario
async function fetchMyCourses() {
  try {
    const token = localStorage.getItem("token");

    if (!token) return;

    const res = await fetch(`${API_URL}/api/users/my-courses`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Error al cargar cursos");

    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.error(err);
  }
}

// =============================
// 🟢 Fetch materias del docente
// =============================
async function fetchMySubjectsByCourse() {
  try {
     const userRaw = localStorage.getItem("user");

    if (!userRaw) {
      console.error("❌ No hay usuario en localStorage");
      return [];
    }

    const user = JSON.parse(userRaw);
    const userId = user.id;

    if (!userId) {
      console.error("❌ El usuario no tiene id:", user);
      return [];
    }
    const res = await fetch(
      `${API_URL}/api/teachingAssignment/mySubjects/user/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!res.ok) {
      console.error("Error al traer materias del docente");
      return [];
    }

    const data = await res.json();
    return data.data || [];

  } catch (error) {
    console.error("Error fetchMySubjectsByCourse:", error);
    return [];
  }
}


// Renderizamos los cursos
// Renderizamos los cursos
async function renderCourses() {
  const courses = await fetchMyCourses();

  if (!courses || courses.length === 0) {
    coursesContainer.innerHTML = `<p>No tenés cursos asignados.</p>`;
    return;
  }

  const subjets = await fetchMySubjectsByCourse();

   if (!subjets || subjets.length === 0) {
    subjectsGridContainer.innerHTML = `<p>No tenés materias asignadas.</p>`;
    return;
  }

  // Limpiar container
  coursesContainer.innerHTML = "";
  subjectsGridContainer.innerHTML = "";

  courses.forEach((c) => {
  const div = document.createElement("article");
  div.className = "course-card";

  div.innerHTML = `
    <div class="course-card-header">
      <span class="course-badge">${c.name}</span>
      <span class="course-year">${c.academicYear}</span>
    </div>

    <h3 class="course-title">${c.code}</h3>

    <div class="course-info">
      <span>👥 ${c.studentsCount} alumnos</span>
      <span>🕒 Turno indefinido</span>
    </div>

    <button class="course-btn" data-course-id="${c._id}">
      Ver curso
    </button>
  `;

  coursesContainer.appendChild(div);

  
});

 subjets.forEach((s) => {
  const div = document.createElement("article");
  div.className = "subject-card";

  div.innerHTML = `
    <div class="subject-card-header">
      <span class="subject-badge">${s.name}</span>
    </div>

    <h3 class="subject-title">${s.code}</h3>
  `;

  subjectsGridContainer.appendChild(div);

  
});

document.querySelectorAll(".course-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const courseId = btn.getAttribute("data-course-id");
    LoadCourses(courseId); // Cargar alumnos
    studentsModal.style.display = "flex"; // Abrir modal
  });
});


}

/* =========================
   Cargar alumnos según pantalla
========================= */
async function LoadCourses(courseId) {
  const studentsContainer = document.getElementById("studentsContainer");
  studentsContainer.innerHTML = `<p>Cargando alumnos...</p>`;

  const students = await fetchStudents(courseId);

  if (!students || students.length === 0) {
    studentsContainer.innerHTML = `<p>No hay alumnos en este curso.</p>`;
    return;
  }

  studentsContainer.innerHTML = ""; // Limpiar contenedor

  // Detectar si es escritorio
  const isDesktop = window.innerWidth > 768;

  if (isDesktop) {
    renderStudentsDesktop(students); // paso el array de alumnos
  } else {
    renderStudentsMobile(students);  // paso el array de alumnos
  }
}

/* =========================
   Renderizar versión móvil (cards)
========================= */
function renderStudentsMobile(students) {
  const studentsContainer = document.getElementById("studentsContainer");
  studentsContainer.innerHTML = ""; // limpiar

  students.forEach((s, index) => {
  const div = document.createElement("div");
  div.className = "student-card";

  div.innerHTML = `
    <div class="student-card-header">
      <span class="student-index">#${index + 1}</span>
      <span class="status ${s.student.activo ? 'active' : 'inactive'}">
        ${s.student.activo ? 'Activo' : 'Inactivo'}
      </span>
    </div>

    <h4 class="student-name">
      ${s.student.nombre} ${s.student.apellido}
    </h4>

    <p class="student-dni">
      <strong>DNI:</strong> ${s.student.dni || '-'}
    </p>

    <p class="student-email">
      ${s.student.email || '-'}
    </p>
  `;

  studentsContainer.appendChild(div);
});
}

/* =========================
   Renderizar versión escritorio (tabla)
========================= */
function renderStudentsDesktop(students) {
  const studentsContainer = document.getElementById("studentsContainer");
  studentsContainer.innerHTML = ""; // limpiar

  const table = document.createElement("table");
  table.className = "students-table";

  // Header
  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Nombre</th>
        <th>Dni</th>
        <th>Email</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  students.forEach((s, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="student-index">${index + 1}</td>

      <td class="student-name">
        ${s.student.nombre} ${s.student.apellido}
      </td>

      <td class="student-dni">
        ${s.student.dni || '-'}
      </td>

      <td class="student-email">
        ${s.student.email || '-'}
      </td>

      <td>
        <span class="status ${s.student.activo ? 'active' : 'inactive'}">
          ${s.student.activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
    `;

    tbody.appendChild(tr);
  });


  studentsContainer.appendChild(table);
}



async function fetchStudents(courseId) {
  try {
    console.log(courseId)
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/course/${courseId}/students`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Error al cargar alumnos");
    const data = await res.json();
    console.log(data.data)
    return data.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}



/* =========================
 //JS para abrir y cerrar el modal
========================= */


const studentsModal = document.getElementById("studentsModal");
const closeStudentsModal = document.getElementById("closeStudentsModal");

// Cerrar modal con la X
closeStudentsModal.addEventListener("click", () => {
  studentsModal.style.display = "none";
  document.getElementById("studentsContainer").innerHTML = ""; // limpiar contenido
});

// Cerrar modal al hacer click fuera del contenido
studentsModal.addEventListener("click", (e) => {
  if (e.target === studentsModal) {
    studentsModal.style.display = "none";
    document.getElementById("studentsContainer").innerHTML = "";
  }
});

/* =========================
   Detectar cambio de tamaño para re-render
========================= */
window.addEventListener("resize", () => {
  const openModal = document.getElementById("studentsModal").classList.contains("open");
  if (openModal) {
    const courseId = document.querySelector(".course-btn.active")?.getAttribute("data-course-id");
    if (courseId) LoadCourses(courseId);
  }
});



