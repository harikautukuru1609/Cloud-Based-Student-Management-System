
from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__)

DATA_FILE = os.path.join(app.root_path, "students.json")


def load_students():
    if not os.path.exists(DATA_FILE):
        save_students([])
    with open(DATA_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def save_students(students):
    with open(DATA_FILE, "w", encoding="utf-8") as file:
        json.dump(students, file, indent=4)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/students", methods=["GET"])
def get_students():
    students = load_students()
    search = request.args.get("search", "").strip().lower()

    if search:
        students = [
            s for s in students
            if search in s["name"].lower()
            or search in s["roll"].lower()
        ]

    return jsonify(students)


@app.route("/api/students", methods=["POST"])
def add_student():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    roll = str(data.get("roll", "")).strip()
    department = str(data.get("department", "")).strip()

    if not name or not roll or not department:
        return jsonify({"error": "Please fill in all fields."}), 400

    try:
        marks = float(data.get("marks"))
        if not 0 <= marks <= 100:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Marks must be between 0 and 100."}), 400

    students = load_students()

    if any(s["roll"].lower() == roll.lower() for s in students):
        return jsonify({"error": "Roll number already exists."}), 409

    student = {
        "id": max((s.get("id", 0) for s in students), default=0) + 1,
        "name": name,
        "roll": roll,
        "department": department,
        "marks": marks
    }

    students.append(student)
    save_students(students)

    return jsonify(student), 201


@app.route("/api/students/<int:student_id>", methods=["PUT"])
def update_student(student_id):
    data = request.get_json(silent=True) or {}
    students = load_students()

    student = next(
        (s for s in students if s.get("id") == student_id), None
    )

    if student is None:
        return jsonify({"error": "Student not found."}), 404

    name = str(data.get("name", "")).strip()
    roll = str(data.get("roll", "")).strip()
    department = str(data.get("department", "")).strip()

    if not name or not roll or not department:
        return jsonify({"error": "Please fill in all fields."}), 400

    try:
        marks = float(data.get("marks"))
        if not 0 <= marks <= 100:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Marks must be between 0 and 100."}), 400

    duplicate = any(
        s["id"] != student_id and s["roll"].lower() == roll.lower()
        for s in students
    )

    if duplicate:
        return jsonify({"error": "Roll number already exists."}), 409

    student.update({
        "name": name,
        "roll": roll,
        "department": department,
        "marks": marks
    })

    save_students(students)
    return jsonify(student)


@app.route("/api/students/<int:student_id>", methods=["DELETE"])
def delete_student(student_id):
    students = load_students()
    updated = [s for s in students if s.get("id") != student_id]

    if len(updated) == len(students):
        return jsonify({"error": "Student not found."}), 404

    save_students(updated)
    return jsonify({"message": "Student deleted successfully."})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
