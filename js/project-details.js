import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "firebase/auth";

import {
    getFirestore,
    doc,
    getDoc
} from "firebase/firestore";

import { app } from "./firebase-config.js";
import { supabaseUrl, supabasePublishableKey } from "./supabase-config.js";


const auth = getAuth(app);
const db = getFirestore(app);


// =====================================
// HTML ELEMENTS
// =====================================

const projectTitle =
    document.getElementById("projectTitle");

const barangayName =
    document.getElementById("barangayName");

const projectName =
    document.getElementById("projectName");

const projectDescription =
    document.getElementById("projectDescription");
const fundSourceDisplay = document.getElementById("fundSourceDisplay");

const projectStatus =
    document.getElementById("projectStatus");

const budget =
    document.getElementById("budget");

const spent =
    document.getElementById("spent");

const remaining =
    document.getElementById("remaining");

const utilization =
    document.getElementById("utilization");

const utilizationText =
    document.getElementById("utilizationText");

const financialProgress =
    document.getElementById("financialProgress");

const physicalProgress =
    document.getElementById("physicalProgress");

const physicalProgressBar =
    document.getElementById("physicalProgressBar");

const startDate =
    document.getElementById("startDate");

const targetDate =
    document.getElementById("targetDate");

const financialSummary =
    document.getElementById("financialSummary");

const physicalSummary =
    document.getElementById("physicalSummary");

const financialSummaryBar =
    document.getElementById("financialSummaryBar");

const physicalSummaryBar =
    document.getElementById("physicalSummaryBar");

const message =
    document.getElementById("message");

const backBtn =
    document.getElementById("backBtn");

const dashboardBtn =
    document.getElementById("dashboardBtn");

const projectsBtn =
    document.getElementById("projectsBtn");

const addProjectBtn =
    document.getElementById("addProjectBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const navLabel =
    document.getElementById("navLabel");
const supportingDocumentsSection = document.getElementById("supportingDocumentsSection");
const supportingDocumentsList = document.getElementById("supportingDocumentsList");

let currentRole =
    "";
let currentProjectBarangayId = "";


// =====================================
// URL PROJECT ID
// =====================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const projectId =
    urlParams.get("id");

// DILG's project list marks this navigation so the DILG menu is shown
// immediately while Firebase restores the signed-in user's session.
if (urlParams.get("source") === "dilg") {
    configureDilgView();
}


// =====================================
// CHECK PROJECT ID
// =====================================

if (!projectId) {

    message.textContent =
        "No project selected.";

} else {

    checkUser();

}


// =====================================
// CHECK USER
// =====================================

async function checkUser() {

    onAuthStateChanged(
        auth,
        async (user) => {

            if (!user) {

                window.location.href =
                    "login.html";

                return;
            }


            try {

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

                    message.textContent =
                        "User profile not found.";

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


                if (
                    role !== "barangay" &&
                    role !== "dilg"
                ) {

                    message.textContent =
                        "You are not authorized.";

                    return;
                }


                currentRole =
                    role;

                if (
                    role === "dilg"
                ) {

                    configureDilgView();

                } else {

                    barangayName.textContent =
                        `Barangay: ${userData.barangayId}`;
                }


                await loadProject(
                    projectId,
                    userData.barangayId,
                    role
                );


            } catch (error) {

                console.error(error);

                message.textContent =
                    "Failed to load user.";

            }

        }
    );

}


// =====================================
// LOAD PROJECT
// =====================================

async function loadProject(
    id,
    barangayId,
    role
) {

    try {

        const projectRef =
            doc(
                db,
                "projects",
                id
            );


        const projectSnapshot =
            await getDoc(
                projectRef
            );


        if (
            !projectSnapshot.exists()
        ) {

            message.textContent =
                "Project not found.";

            return;
        }


        const project =
            projectSnapshot.data();
        currentProjectBarangayId = String(project.barangayId || "").trim();


        // =====================================
        // SECURITY CHECK
        // =====================================

        if (
            role === "barangay" &&
            project.barangayId !==
            barangayId
        ) {

            message.textContent =
                "You are not authorized to view this project.";

            return;
        }

        if (
            role === "dilg"
        ) {

            barangayName.textContent =
                `Barangay: ${
                    project.barangayName ||
                    project.barangay ||
                    project.barangayId ||
                    "Not specified"
                }`;
        }

        renderSupportingDocuments(project.documents);


        // =====================================
        // BASIC INFORMATION
        // =====================================

        projectTitle.textContent =
            project.projectName ||
            "Project Details";


        projectName.textContent =
            project.projectName ||
            "Unnamed Project";


        projectDescription.textContent =
            project.description ||
            "No description provided.";

        fundSourceDisplay.textContent = project.fundSource === "Other" && project.fundSourceOther
            ? `Other: ${project.fundSourceOther}`
            : (project.fundSource || "Not specified");


        // =====================================
        // STATUS
        // =====================================

        const status =
            project.status ||
            "Planned";


        projectStatus.textContent =
            status;


        projectStatus.className =
            "status";


        if (status === "Ongoing") {

            projectStatus.classList.add(
                "status-ongoing"
            );

        } else if (
            status === "Completed"
        ) {

            projectStatus.classList.add(
                "status-completed"
            );

        } else {

            projectStatus.classList.add(
                "status-planned"
            );

        }


        // =====================================
        // FINANCIAL DATA
        // =====================================

        const projectBudget =
            Number(
                project.budget
            ) || 0;


        const projectSpent =
            Number(
                project.spent
            ) || 0;


        const projectRemaining =
            projectBudget -
            projectSpent;


        let projectUtilization =
            Number(
                project.utilization
            );


        // Calculate if old project
        // does not have utilization

        if (
            isNaN(projectUtilization)
        ) {

            projectUtilization =
                projectBudget > 0
                    ? (
                        projectSpent /
                        projectBudget
                    ) * 100
                    : 0;

        }


        // =====================================
        // PHYSICAL PROGRESS
        // =====================================

        const projectPhysicalProgress =
            Number(
                project.physicalProgress
            ) || 0;


        // =====================================
        // DISPLAY MONEY
        // =====================================

        budget.textContent =
            formatCurrency(
                projectBudget
            );


        spent.textContent =
            formatCurrency(
                projectSpent
            );


        remaining.textContent =
            formatCurrency(
                projectRemaining
            );


        // =====================================
        // DISPLAY UTILIZATION
        // =====================================

        const safeUtilization =
            Math.min(
                Math.max(
                    projectUtilization,
                    0
                ),
                100
            );


        const safePhysical =
            Math.min(
                Math.max(
                    projectPhysicalProgress,
                    0
                ),
                100
            );


        utilization.textContent =
            `${projectUtilization.toFixed(2)}%`;


        utilizationText.textContent =
            `${projectUtilization.toFixed(2)}%`;


        financialProgress.style.width =
            `${safeUtilization}%`;


        // =====================================
        // PHYSICAL PROGRESS
        // =====================================

        physicalProgress.textContent =
            `${safePhysical}%`;


        physicalProgressBar.style.width =
            `${safePhysical}%`;


        // =====================================
        // SCHEDULE
        // =====================================

        startDate.textContent =
            formatDate(
                project.startDate
            );


        targetDate.textContent =
            formatDate(
                project.targetDate
            );


        // =====================================
        // PERFORMANCE SUMMARY
        // =====================================

        financialSummary.textContent =
            `${projectUtilization.toFixed(2)}%`;


        physicalSummary.textContent =
            `${safePhysical}%`;


        financialSummaryBar.style.width =
            `${safeUtilization}%`;


        physicalSummaryBar.style.width =
            `${safePhysical}%`;


        console.log(
            "Project loaded:",
            project
        );


    } catch (error) {

        console.error(
            "Failed to load project:",
            error
        );


        message.textContent =
            "Failed to load project.";

    }

}

function renderSupportingDocuments(documents) {
    if (!supportingDocumentsSection || !supportingDocumentsList) return;
    const files = Array.isArray(documents)
        ? documents.filter((file) => file && (file.storagePath || file.url))
        : [];
    supportingDocumentsList.replaceChildren();
    supportingDocumentsSection.hidden = files.length === 0;

    files.forEach((file) => {
        const row = document.createElement("div");
        row.className = "details-document-row";
        const info = document.createElement("div");
        info.className = "details-document-info";
        const name = document.createElement("strong");
        name.textContent = file.name || "Project document";
        const type = document.createElement("span");
        type.textContent = file.size ? formatFileSize(file.size) : (file.type || "Supporting file");
        info.append(name, type);

        const actions = document.createElement("div");
        actions.className = "details-document-actions";
        for (const [action, label] of [["view", "Open"], ["download", "Download"]]) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "details-document-btn";
            button.textContent = label;
            button.addEventListener("click", () => accessProjectDocument(file, action, button));
            actions.append(button);
        }

        row.append(info, actions);
        supportingDocumentsList.append(row);
    });
}

function formatFileSize(bytes) {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size <= 0) return "Supporting file";
    return size < 1024 * 1024
        ? `${Math.max(1, Math.round(size / 1024))} KB`
        : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function accessProjectDocument(file, action, button) {
    const previewWindow = action === "view" ? window.open("about:blank", "_blank") : null;
    if (previewWindow) previewWindow.opener = null;
    const originalLabel = button.textContent;
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
        button.textContent = originalLabel;
    }
}


// =====================================
// DILG READ-ONLY VIEW
// =====================================

function configureDilgView() {

    if (backBtn) backBtn.textContent = "Back to Barangay Projects";

    if (
        projectTitle
    ) {

        projectTitle.textContent =
            "DILG Project Review";
    }

    if (
        navLabel
    ) {

        navLabel.textContent =
            "DILG ADMIN";
    }

    const dashboardNavText =
        document.getElementById("dashboardNavText");
    if (dashboardNavText) {
        dashboardNavText.textContent = "Dashboard";
    }

    const projectsNavText =
        document.getElementById("projectsNavText");
    if (projectsNavText) {
        projectsNavText.textContent = "Projects";
    }

    if (
        addProjectBtn
    ) {

        addProjectBtn.style.display =
            "none";
    }

    const feedbackButton =
        document.getElementById(
            "feedbackBtn"
        );

    if (
        feedbackButton
    ) {

        feedbackButton.style.display =
            "none";
    }

    const citizenActivityButton =
        document.getElementById("citizenActivityBtn");
    if (citizenActivityButton) {
        citizenActivityButton.style.display = "none";
    }
}

// =====================================
// FORMAT CURRENCY
// =====================================

function formatCurrency(
    amount
) {

    return `₱${amount.toLocaleString(
        "en-PH",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    )}`;

}


// =====================================
// FORMAT DATE
// =====================================

function formatDate(
    dateString
) {

    if (!dateString) {

        return "-";

    }


    const date =
        new Date(
            dateString +
            "T00:00:00"
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return dateString;

    }


    return date.toLocaleDateString(
        "en-PH",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );

}


// =====================================
// BACK TO PROJECTS
// =====================================

if (backBtn) {

    backBtn.addEventListener(
        "click",
        () => {

            window.location.href = currentRole === "dilg" && currentProjectBarangayId
                ? `barangay-details.html?barangay=${encodeURIComponent(currentProjectBarangayId)}`
                : currentRole === "dilg"
                    ? "dilg-projects.html"
                    : "projects.html";

        }
    );

}


// =====================================
// DASHBOARD
// =====================================

if (dashboardBtn) {

    dashboardBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                currentRole === "dilg"
                    ? "dilg-dashboard.html"
                    : "barangay.html";

        }
    );

}


// =====================================
// PROJECTS
// =====================================

if (projectsBtn) {

    projectsBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                currentRole === "dilg"
                    ? "dilg-projects.html"
                    : "projects.html";

        }
    );

}


// =====================================
// ADD PROJECT
// =====================================

if (addProjectBtn) {

    addProjectBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "add-project.html";

        }
    );

}


// =====================================
// LOGOUT
// =====================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);


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

}
