import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "firebase/auth";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    getDocs,
    deleteDoc
} from "firebase/firestore";

import { app } from "./firebase-config.js";
import { supabaseUrl, supabasePublishableKey } from "./supabase-config.js";
import { confirmAction } from "./dialog-ui.js";


const auth = getAuth(app);
const db = getFirestore(app);


// =====================================
// ELEMENTS
// =====================================

const barangayNameElement =
    document.getElementById("barangayName");

const barangayIdElement =
    document.getElementById("barangayId");

const totalProjectsElement =
    document.getElementById("totalProjects");
const plannedProjectCount = document.getElementById("plannedProjectCount");
const ongoingProjectCount = document.getElementById("ongoingProjectCount");
const completedProjectCount = document.getElementById("completedProjectCount");

const totalBudgetElement =
    document.getElementById("totalBudget");

const totalSpentElement =
    document.getElementById("totalSpent");

const remainingBudgetElement =
    document.getElementById("remainingBudget");

const budgetUtilizationElement =
    document.getElementById("budgetUtilization");

const progressBar =
    document.getElementById("progressBar");

const projectsList =
    document.getElementById("projectsList");
const dilgAddProjectBtn = document.getElementById("dilgAddProjectBtn");

const messageElement =
    document.getElementById("message");

const backBtn =
    document.getElementById("backBtn");

const logoutBtn =
    document.getElementById("logoutBtn");


// =====================================
// GET BARANGAY ID FROM URL
// =====================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const barangayId =
    urlParams.get("barangay");

dilgAddProjectBtn?.addEventListener("click", () => {
    window.location.href = `add-project.html?source=dilg&barangay=${encodeURIComponent(barangayId || "")}`;
});


// =====================================
// CHECK BARANGAY ID
// =====================================

if (!barangayId) {

    showError(
        "No barangay was selected."
    );

}


// =====================================
// AUTH CHECK
// =====================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }


        try {

            // =====================================
            // GET USER
            // =====================================

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const userSnapshot =
                await getDoc(
                    userRef
                );


            if (
                !userSnapshot.exists()
            ) {

                showError(
                    "User profile not found."
                );

                return;
            }


            const userData =
                userSnapshot.data();


            const role =
                String(
                    userData.role || ""
                )
                .trim()
                .toLowerCase();


            // =====================================
            // DILG ONLY
            // =====================================

            if (
                role !== "dilg"
            ) {

                showError(
                    "You are not authorized to access this page."
                );

                return;
            }


            // =====================================
            // LOAD BARANGAY
            // =====================================

            await loadBarangayProjects();


        } catch (error) {

            console.error(
                "Authentication error:",
                error
            );


            showError(
                "Failed to load barangay details: " +
                error.message
            );

        }

    }
);


// =====================================
// LOAD PROJECTS
// =====================================

async function loadBarangayProjects() {

    try {

        const projectsSnapshot =
            await getDocs(
                collection(
                    db,
                    "projects"
                )
            );


        let projects = [];

        let totalBudget = 0;

        let totalSpent = 0;


        // =====================================
        // FILTER BARANGAY PROJECTS
        // =====================================

        projectsSnapshot.forEach(
            (projectDoc) => {

                const project =
                    projectDoc.data();


                const projectBarangayId =
                    String(
                        project.barangayId ||
                        ""
                    ).trim();


                if (
                    projectBarangayId ===
                    barangayId
                ) {

                    projects.push({
                        ...project,
                        id: projectDoc.id
                    });


                    totalBudget +=
                        Number(
                            project.budget
                        ) || 0;


                    totalSpent +=
                        Number(
                            project.spent
                        ) || 0;

                }

            }
        );


        // =====================================
        // BARANGAY NAME
        // =====================================

        let barangayName =
            barangayId;


        if (
            projects.length > 0
        ) {

            const firstProject =
                projects[0];


            if (
                firstProject.barangayName
            ) {

                barangayName =
                    firstProject.barangayName;

            } else if (
                firstProject.barangay
            ) {

                barangayName =
                    firstProject.barangay;

            }

        }


        // =====================================
        // UPDATE HEADER
        // =====================================

        barangayNameElement.textContent =
            barangayName;


        barangayIdElement.textContent =
            "Barangay ID: " +
            barangayId;


        // =====================================
        // CALCULATE
        // =====================================

        const remaining =
            totalBudget -
            totalSpent;


        const utilization =
            totalBudget > 0
                ? (
                    totalSpent /
                    totalBudget
                ) * 100
                : 0;


        // =====================================
        // UPDATE STATS
        // =====================================

        totalProjectsElement.textContent =
            projects.length;

        const statusCounts = { planned: 0, ongoing: 0, completed: 0 };
        projects.forEach((project) => {
            const status = String(project.status || "Planned").trim().toLowerCase();
            if (Object.prototype.hasOwnProperty.call(statusCounts, status)) statusCounts[status]++;
        });
        const total = projects.length;
        plannedProjectCount.textContent = `${statusCounts.planned}/${total}`;
        ongoingProjectCount.textContent = `${statusCounts.ongoing}/${total}`;
        completedProjectCount.textContent = `${statusCounts.completed}/${total}`;


        totalBudgetElement.textContent =
            formatCurrency(
                totalBudget
            );


        totalSpentElement.textContent =
            formatCurrency(
                totalSpent
            );


        remainingBudgetElement.textContent =
            formatCurrency(
                remaining
            );


        budgetUtilizationElement.textContent =
            utilization.toFixed(2) +
            "%";


        progressBar.style.width =
            Math.min(
                Math.max(
                    utilization,
                    0
                ),
                100
            ) + "%";


        // =====================================
        // DISPLAY PROJECTS
        // =====================================

        displayProjects(
            projects
        );


    } catch (error) {

        console.error(
            "Load projects error:",
            error
        );


        showError(
            "Failed to load projects: " +
            error.message
        );

    }

}


// =====================================
// DISPLAY PROJECTS
// =====================================

function displayProjects(
    projects
) {

    projectsList.innerHTML = "";

    if (projects.length === 0) {
        projectsList.innerHTML = '<div class="empty">No projects found for this barangay.</div>';
        return;
    }

    const currency = (value) => formatCurrency(Number(value) || 0);
    const rows = projects.map((project, index) => {
        const name = project.projectName || project.name || project.title || "Untitled Project";
        const budget = Number(project.budget) || 0;
        const spent = Number(project.spent) || 0;
        const utilization = budget > 0 ? (spent / budget) * 100 : 0;
        const remaining = budget - spent;
        const fundSource = project.fundSource === "Other" && project.fundSourceOther
            ? `Other: ${project.fundSourceOther}`
            : project.fundSource || "Not specified";
        const schedule = [
            project.startDate ? `<span>Start: ${escapeHTML(project.startDate)}</span>` : "",
            project.targetDate ? `<span>Target: ${escapeHTML(project.targetDate)}</span>` : ""
        ].filter(Boolean).join("") || "<span>Not specified</span>";
        return `
            <tr data-project-id="${escapeHTML(project.id)}">
                <td data-label="#">${index + 1}</td>
                <td class="dilg-project-title-cell" data-label="Project Title"><strong>${escapeHTML(name)}</strong><span>${escapeHTML(project.description || "No description")}</span></td>
                <td class="money-cell" data-label="Allocated Budget">${currency(budget)}</td>
                <td class="money-cell" data-label="Spend">${currency(spent)}</td>
                <td data-label="Fund Source">${escapeHTML(fundSource)}</td>
                <td data-label="Utilization">${utilization.toFixed(1)}%</td>
                <td class="money-cell" data-label="Balance">${currency(remaining)}</td>
                <td class="dilg-project-schedule" data-label="Schedule">${schedule}</td>
                <td data-label="Actions"><div class="dilg-project-row-actions"><button class="dilg-project-actions-toggle" type="button" aria-label="Project actions" aria-expanded="false">&#9776;</button></div></td>
            </tr>
            <tr class="dilg-project-actions-menu-row" data-project-menu="${escapeHTML(project.id)}" hidden>
                <td colspan="9"><div class="dilg-project-row-actions">
                    <button class="dilg-project-view-btn" type="button" data-project-id="${escapeHTML(project.id)}">View</button>
                    <button class="dilg-project-edit-btn" type="button" data-project-id="${escapeHTML(project.id)}">Edit</button>
                    <button class="dilg-project-delete-btn" type="button" data-project-id="${escapeHTML(project.id)}">Delete</button>
                </div></td>
            </tr>
        `;
    }).join("");

    projectsList.innerHTML = `
        <div class="dilg-project-table-summary">Showing ${projects.length} project${projects.length === 1 ? "" : "s"}</div>
        <div class="dilg-project-table-wrap">
            <table class="dilg-project-table">
                <thead><tr>
                    <th>#</th><th>Project Title</th><th>Allocated Budget</th><th>Spend</th><th>Fund Source</th>
                    <th>Utilization</th><th>Balance</th><th>Schedule</th><th>Actions</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;

    projectsList.querySelectorAll(".dilg-project-actions-toggle").forEach((toggle) => {
        toggle.addEventListener("click", () => {
            const projectId = toggle.closest("tr")?.dataset.projectId;
            const menuRow = Array.from(projectsList.querySelectorAll(".dilg-project-actions-menu-row"))
                .find((row) => row.dataset.projectMenu === projectId);
            const shouldOpen = menuRow?.hidden;
            projectsList.querySelectorAll(".dilg-project-actions-menu-row").forEach((row) => { row.hidden = true; });
            projectsList.querySelectorAll(".dilg-project-actions-toggle").forEach((button) => button.setAttribute("aria-expanded", "false"));
            if (menuRow && shouldOpen) {
                menuRow.hidden = false;
                toggle.setAttribute("aria-expanded", "true");
            }
        });
    });
    projectsList.querySelectorAll(".dilg-project-view-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const projectId = button.dataset.projectId;
            window.location.href = `project-details.html?id=${encodeURIComponent(projectId)}&source=dilg`;
        });
    });

    projectsList.querySelectorAll(".dilg-project-edit-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const projectId = button.dataset.projectId;
            window.location.href = `edit-project.html?id=${encodeURIComponent(projectId)}&source=dilg`;
        });
    });

    projectsList.querySelectorAll(".dilg-project-delete-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const shouldDelete = await confirmAction(
                "Delete Project",
                "Are you sure you want to permanently delete this project?",
                "Delete"
            );
            if (!shouldDelete) return;

            button.disabled = true;
            button.textContent = "Deleting...";
            try {
                await deleteDoc(doc(db, "projects", button.dataset.projectId));
                await loadBarangayProjects();
            } catch (error) {
                console.error("DILG project delete failed:", error);
                button.disabled = false;
                button.textContent = "Delete";
                showError("Failed to delete project: " + error.message);
            }
        });
    });

}

async function accessProjectDocument(file, action, button) {
    const previewWindow = action === "view" ? window.open("about:blank", "_blank") : null;
    if (previewWindow) previewWindow.opener = null;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = action === "view" ? "Opening..." : "Downloading...";

    try {
        let url = file.url || "";
        if (file.storagePath) {
            const user = auth.currentUser;
            if (!user) throw new Error("You are not logged in.");
            const response = await fetch(`${supabaseUrl}/functions/v1/project-documents`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    apikey: supabasePublishableKey,
                    "x-firebase-token": await user.getIdToken()
                },
                body: JSON.stringify({ action, storagePath: file.storagePath })
            });
            const result = await response.json();
            if (!response.ok || !result.success || !result.signedUrl) {
                throw new Error(result.error || "Unable to prepare the document.");
            }
            url = result.signedUrl;
        }
        if (!url) throw new Error("The document link is unavailable.");

        if (action === "view") {
            if (previewWindow) previewWindow.location.replace(url);
            else window.location.href = url;
        } else {
            const link = document.createElement("a");
            link.href = url;
            link.download = file.name || "project-document";
            document.body.append(link);
            link.click();
            link.remove();
        }
    } catch (error) {
        previewWindow?.close();
        console.error("Failed to access project document:", error);
        alert(error.message || "Unable to access the document.");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}


// =====================================
// FORMAT CURRENCY
// =====================================

function formatCurrency(
    amount
) {

    return `₱${Number(
        amount
    ).toLocaleString(
        "en-PH",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    )}`;

}


// =====================================
// ESCAPE HTML
// =====================================

function escapeHTML(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(value);


    return div.innerHTML;

}


// =====================================
// ERROR
// =====================================

function showError(
    text
) {

    messageElement.textContent =
        text;

}


// =====================================
// BACK BUTTON
// =====================================

backBtn.addEventListener(
    "click",
    () => {

        window.location.href =
            "barangays.html";

    }
);


// =====================================
// LOGOUT
// =====================================

logoutBtn.addEventListener(
    "click",
    async () => {

        try {

            await signOut(
                auth
            );


            window.location.href =
                "login.html";


        } catch (error) {

            console.error(
                "Logout error:",
                error
            );

        }

    }
);
