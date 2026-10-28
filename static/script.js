
const API = "/api/students";

const form = document.getElementById("studentForm");
const table = document.getElementById("studentTable");
const message = document.getElementById("message");
const searchInput = document.getElementById("search");

let editingId = null;
let searchTimer;

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
    }

    return data;
}

function showMessage(text, type = "success") {
    message.textContent = text;
    message.className = `message ${type}`;
}

function clearMessage() {
    message.textContent = "";
    message.className = "message";
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function loadStudents() {
    try {
        const query = searchInput.value.trim();
        const students = await apiRequest(
            `${API}?search=${encodeURIComponent(query)}`
        );

        renderStudents(students);
        updateStats(students);
    } catch (error) {
        table.innerHTML = `
            <tr>
                <td colspan="6" class="empty">
                    ${escapeHTML(error.message)}
                </td>
            </tr>`;
        showMessage(
            "Could not load records. Check that Flask is running.",
            "error"
        );
    }
}

function renderStudents(students) {
    if (students.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="6" class="empty">
                    No students found. Add a student to get started.
                </td>
            </tr>`;
        return;
    }

    table.innerHTML = students.map(student => `
        <tr>
            <td>${student.id}</td>
            <td><strong>${escapeHTML(student.name)}</strong></td>
            <td>${escapeHTML(student.roll)}</td>
            <td>${escapeHTML(student.department)}</td>
            <td>${escapeHTML(student.marks)}%</td>
            <td>
                <div class="action-buttons">
                    <button class="edit-btn"
                        data-action="edit" data-id="${student.id}">
                        Edit
                    </button>
                    <button class="delete-btn"
                        data-action="delete" data-id="${student.id}">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");
}

function updateStats(students) {
    document.getElementById("totalStudents").textContent =
        students.length;

    const average = students.length
        ? students.reduce((sum, student) =>
            sum + Number(student.marks), 0) / students.length
        : 0;

    document.getElementById("averageMarks").textContent =
        `${average.toFixed(1)}%`;

    const departments = new Set(
        students.map(student => student.department)
    );

    document.getElementById("totalDepartments").textContent =
        departments.size;
}

form.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage();

    const student = {
        name: document.getElementById("name").value.trim(),
        roll: document.getElementById("roll").value.trim(),
        department: document.getElementById("department").value,
        marks: document.getElementById("marks").value
    };

    try {
        if (editingId !== null) {
            await apiRequest(`${API}/${editingId}`, {
                method: "PUT",
                body: JSON.stringify(student)
            });

            showMessage("Student updated successfully!");
        } else {
            await apiRequest(API, {
                method: "POST",
                body: JSON.stringify(student)
            });

            showMessage("Student added successfully!");
        }

        resetForm();
        await loadStudents();
    } catch (error) {
        showMessage(error.message, "error");
    }
});

table.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    try {
        if (action === "edit") {
            const students = await apiRequest(API);
            const student = students.find(item => item.id === id);

            if (!student) {
                throw new Error("Student not found.");
            }

            editingId = id;

            document.getElementById("name").value = student.name;
            document.getElementById("roll").value = student.roll;
            document.getElementById("department").value =
                student.department;
            document.getElementById("marks").value = student.marks;

            document.getElementById("formTitle").textContent =
                "Edit Student";

            document.getElementById("submitBtn").textContent =
                "Update Student";

            document.getElementById("cancelBtn").classList.remove("hidden");

            clearMessage();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }

        if (action === "delete") {
            if (!confirm("Do you want to delete this student?")) return;

            await apiRequest(`${API}/${id}`, {
                method: "DELETE"
            });

            if (editingId === id) resetForm();

            showMessage("Student deleted successfully!");
            await loadStudents();
        }
    } catch (error) {
        showMessage(error.message, "error");
    }
});

function resetForm() {
    form.reset();
    editingId = null;

    document.getElementById("formTitle").textContent =
        "Add New Student";

    document.getElementById("submitBtn").textContent =
        "+ Add Student";

    document.getElementById("cancelBtn").classList.add("hidden");
}

document.getElementById("cancelBtn").addEventListener("click", () => {
    resetForm();
    clearMessage();
});

searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadStudents, 250);
});

loadStudents();
