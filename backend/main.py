
from pathlib import Path
import csv

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="StudentGuard AI API")

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_FILE = BASE_DIR / "studentguard_sample_dataset.csv"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://studentguardai-frontend.onrender.com",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

def load_students():
    if not CSV_FILE.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Dataset not found: {CSV_FILE}",
        )

    try:
        with CSV_FILE.open(
            "r", newline="", encoding="utf-8-sig"
        ) as file:
            return list(csv.DictReader(file))
    except (OSError, csv.Error) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not read dataset: {exc}",
        )


def calculate_success_score(student):
    attendance = float(student.get("attendance_percentage") or 0)
    assignments = float(student.get("assignment_completion") or 0)
    engagement = float(student.get("engagement_score") or 0)
    technical_skills = float(student.get("technical_skills_score") or 0)
    placement_readiness = float(student.get("placement_readiness_score") or 0)

    score = (
        attendance * 0.25
        + assignments * 0.15
        + engagement * 0.10
        + technical_skills * 0.20
        + placement_readiness * 0.30
    )

    return round(score, 1)

@app.get("/")
def home():
    return {"message": "StudentGuard AI API is running"}


@app.get("/api/students")
def get_students():
    students = load_students()

    for student in students:
        student["student_success_score"] = calculate_success_score(student)

    return students



@app.get("/api/students/{student_id}")
def get_student(student_id: str):
    for student in load_students():
        if student.get("student_id") == student_id:
            student["student_success_score"] = calculate_success_score(student)
            return student

    raise HTTPException(status_code=404, detail="Student not found")