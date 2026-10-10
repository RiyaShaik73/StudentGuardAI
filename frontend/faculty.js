
const API_URL = "http://127.0.0.1:8000/api/students";

let allStudents = [];

async function loadStudents() {
    const tableBody = document.querySelector("#studentTableBody");

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Could not load student data");
        }

        allStudents = await response.json();

        console.log("Students loaded:", allStudents.length);

        renderStudents(allStudents);
        updateDashboard(allStudents);
        
        console.log("Updating charts now...");
        updateStudentCharts(allStudents);
    } catch (error) {
        console.error("Dashboard error:", error);

        if (tableBody) {
            tableBody.innerHTML =
     
            '<tr><td colspan="8">Could not load students. Check that the backend is running.</td></tr>';
        }
    }
}




function renderStudents(students) {
    const tableBody = document.querySelector("#studentTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = students.map(student => {
        const attendance = Number(student.attendance_percentage) || 0;
        const assignments = Number(student.assignment_completion) || 0;
        const engagement = Number(student.engagement_score) || 0;
        const skills = Number(student.technical_skills_score) || 0;
        const readiness = Number(student.placement_readiness_score) || 0;

        const indicators = [
            { name: "Attendance", score: attendance },
            { name: "Assignments", score: assignments },
            { name: "Engagement", score: engagement },
            { name: "Technical skills", score: skills },
            { name: "Placement readiness", score: readiness }
        ];

        const strongest = [...indicators].sort((a, b) => b.score - a.score)[0];
        const weakest = [...indicators].sort((a, b) => a.score - b.score)[0];

        const explanation = strongest.score === weakest.score
            ? `All indicators are at ${strongest.score}/100.`
            : `Strongest: ${strongest.name} (${strongest.score}/100). Needs support: ${weakest.name} (${weakest.score}/100).`;

        const risk = String(student.academic_risk || "Unknown");
        const riskClass = risk.toLowerCase().replace(/[^a-z]/g, "");
        const score = Number(student.student_success_score);
        const safeScore = Number.isFinite(score)
            ? score.toFixed(1) + "/100"
            : "N/A";

        return `
            <tr>
                <td>${student.student_id}</td>
                <td>${student.student_name}</td>
                <td>${student.department}</td>
                <td>${attendance}%</td>
                <td>${student.internal_marks ?? "N/A"}</td>
                <td>
                    <span class="risk-badge ${riskClass}">${risk}</span>
                </td>
                <td>${safeScore}</td>
                <td>${explanation}</td>
            </tr>
        `;
    }).join("");
}

function updateDashboard(students) {
    const total = students.length;

    const highRisk = students.filter(student =>
        String(student.academic_risk).trim().toLowerCase() === "high"
    ).length;

    const avgAttendance = total
        ? students.reduce((sum, student) =>
            sum + (Number(student.attendance_percentage) || 0), 0
        ) / total
        : 0;

    const avgPlacement = total
        ? students.reduce((sum, student) =>
            sum + (Number(student.placement_readiness_score) || 0), 0
        ) / total
        : 0;

    setText("totalStudents", total);
    setText("avgAttendance", avgAttendance.toFixed(1) + "%");
    setText("academicRisk", highRisk);
    setText("avgPlacement", avgPlacement.toFixed(1) + "%");

    console.log("Dashboard updated:", {
        totalStudents: total,
        averageAttendance: avgAttendance.toFixed(1) + "%",
        highRiskStudents: highRisk,
        averagePlacementReadiness: avgPlacement.toFixed(1) + "%"
    });
}


function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function filterStudents() {
    const searchInput = document.getElementById("studentSearch");
    const riskFilter = document.getElementById("riskFilter");

    const search = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    const risk = riskFilter
        ? riskFilter.value.toLowerCase()
        : "all";

    const filtered = allStudents.filter(student => {
        const matchesSearch =
            String(student.student_id).toLowerCase().includes(search) ||
            String(student.student_name).toLowerCase().includes(search) ||
            String(student.department).toLowerCase().includes(search);

        const matchesRisk =
            risk === "all" || risk === "All" ||
            String(student.academic_risk).toLowerCase() === risk;

        return matchesSearch && matchesRisk;
    });

    renderStudents(filtered);
}

document.addEventListener("DOMContentLoaded", () => {
    loadStudents();

    const searchInput = document.getElementById("studentSearch");
    const riskFilter = document.getElementById("riskFilter");

    if (searchInput) {
        searchInput.addEventListener("input", filterStudents);
    }

    if (riskFilter) {
        riskFilter.addEventListener("change", filterStudents);
    }
});


let studentGuardCharts = {};

function createOrUpdateChart(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) {
        console.warn("Chart canvas not found:", id);
        return;
    }

    if (studentGuardCharts[id]) {
        studentGuardCharts[id].destroy();
    }

    studentGuardCharts[id] = new Chart(canvas, config);
}

function updateStudentCharts(students) {
    if (typeof Chart === "undefined") {
        console.error("Chart.js is not loaded. Check the script in faculty-dashboard.html.");
        return;
    }

    const average = (field) => {
        if (!students.length) return 0;
        return students.reduce(
            (sum, student) => sum + (Number(student[field]) || 0),
            0
        ) / students.length;
    };

    // 1. Average academic marks
    createOrUpdateChart("academicChart", {
        type: "bar",
        data: {
            labels: ["Internal Marks", "Attendance %", "Engagement"],
            datasets: [{
                label: "Student Average",
                data: [
                    average("internal_marks"),
                    average("attendance_percentage"),
                    average("engagement_score")
                ],
                backgroundColor: ["#38bdf8", "#2dd4bf", "#a78bfa"]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 2. Placement readiness and technical skills
    createOrUpdateChart("placementChart", {
        type: "bar",
        data: {
            labels: ["Placement Readiness", "Technical Skills"],
            datasets: [{
                label: "Average Score",
                data: [
                    average("placement_readiness_score"),
                    average("technical_skills_score")
                ],
                backgroundColor: ["#2dd4bf", "#60a5fa"]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 3. Academic risk distribution
    const academicRisks = { High: 0, Medium: 0, Low: 0 };
    students.forEach(student => {
        const risk = String(student.academic_risk || "").trim();
        const key = risk.charAt(0).toUpperCase() + risk.slice(1).toLowerCase();
        if (key in academicRisks) academicRisks[key]++;
    });

    createOrUpdateChart("riskChart", {
        type: "doughnut",
        data: {
            labels: Object.keys(academicRisks),
            datasets: [{
                data: Object.values(academicRisks),
                backgroundColor: ["#fb7185", "#fbbf24", "#34d399"]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 4. Placement risk distribution
    const placementRisks = { High: 0, Medium: 0, Low: 0 };
    students.forEach(student => {
        const risk = String(student.placement_risk || "").trim();
        const key = risk.charAt(0).toUpperCase() + risk.slice(1).toLowerCase();
        if (key in placementRisks) placementRisks[key]++;
    });

    createOrUpdateChart("placementriskChart", {
        type: "doughnut",
        data: {
            labels: Object.keys(placementRisks),
            datasets: [{
                data: Object.values(placementRisks),
                backgroundColor: ["#fb7185", "#fbbf24", "#34d399"]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}