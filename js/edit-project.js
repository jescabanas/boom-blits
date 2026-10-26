import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "firebase/auth";

import {
    getFirestore,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "firebase/firestore";

import { app } from "./firebase-config.js";
import { supabaseUrl, supabasePublishableKey } from "./supabase-config.js";


const auth = getAuth(app);
const db = getFirestore(app);


// =====================================
// HTML ELEMENTS
// =====================================

const editProjectForm =
    document.getElementById("editProjectForm");

const projectName =
    document.getElementById("projectName");

const description =
    document.getElementById("description");

const budget =
    document.getElementById("budget");

const fundSource = document.getElementById("fundSource");
const fundSourceOther = document.getElementById("fundSourceOther");

fundSource?.addEventListener("change", () => {
    const isOther = fundSource.value === "Other";
    if (fundSourceOther) {
        fundSourceOther.hidden = !isOther;
        fundSourceOther.required = isOther;
        if (!isOther) fundSourceOther.value = "";
    }
});

const spent =
    document.getElementById("spent");

const status =
    document.getElementById("status");

const physicalProgress =
    document.getElementById("physicalProgress");

const startDate =
    document.getElementById("startDate");

const targetDate =
    document.getElementById("targetDate");

const message =
    document.getElementById("message");
const projectDocumentsInput = document.getElementById("projectDocuments");
const existingDocumentsElement = document.getElementById("existingDocuments");
let existingDocuments = [];
let selectedNewFiles = [];
let currentProjectData = null;
const newDocumentsList = document.getElementById("newDocumentsList");

const backBtn =
    document.getElementById("backBtn");

const cancelBtn =
    document.getElementById("cancelBtn");

const dashboardBtn =
    document.getElementById("dashboardBtn");

const projectsBtn =
    document.getElementById("projectsBtn");

const addProjectBtn =
    document.getElementById("addProjectBtn");

const logoutBtn =
    document.getElementById("logoutBtn");


// =====================================
// GET PROJECT ID FROM URL
// =====================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const projectId =
    urlParams.get("id");


// =====================================
// CURRENT USER DATA
// =====================================

let currentUser = null;
let currentUserData = null;


// =====================================
// CHECK PROJECT ID
// =====================================

if (!projectId) {

    showMessage(
        "No project was selected.",
        "error"
    );

} else {

    checkAuthentication();

}


// =====================================
// AUTHENTICATION
// =====================================

function checkAuthentication() {

    onAuthStateChanged(
        auth,
        async (user) => {

            if (!user) {

                window.location.href =
                    "login.html";

                return;
            }


            currentUser = user;


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

                    showMessage(
                        "User profile not found.",
                        "error"
                    );

                    return;
                }


                currentUserData =
                    userSnapshot.data();


                const role =
                    String(
                        currentUserData.role || ""
                    )
                    .trim()
                    .toLowerCase();


                if (role !== "barangay" && role !== "dilg") {
                    document.documentElement.classList.add("dilg-nav-ready");

                    showMessage(
                        "You are not authorized to edit projects.",
                        "error"
                    );

                    disableForm();

                    return;
                }

                if (role === "dilg") configureDilgEditNavigation();
                else document.documentElement.classList.add("dilg-nav-ready");


                await loadProject();


            } catch (error) {

                console.error(
                    "Authentication error:",
                    error
                );


                showMessage(
                    "Failed to load user information.",
                    "error"
                );

            }

        }
    );

}


// =====================================
// LOAD PROJECT
// =====================================

async function loadProject() {

    try {

        const projectRef =
            doc(
                db,
                "projects",
                projectId
            );


        const projectSnapshot =
            await getDoc(
                projectRef
            );


        if (
            !projectSnapshot.exists()
        ) {

            showMessage(
                "Project not found.",
                "error"
            );

            disableForm();

            return;
        }


        const project =
            projectSnapshot.data();
        currentProjectData = project;

        // =====================================
        // SECURITY CHECK
        // =====================================

        if (
            String(currentUserData.role || "").toLowerCase() === "barangay" &&
            project.barangayId !== currentUserData.barangayId
        ) {

            showMessage(
                "You are not authorized to edit this project.",
                "error"
            );

            disableForm();

            return;
        }

        existingDocuments = Array.isArray(project.documents) ? project.documents : [];
        renderExistingDocuments();


        // =====================================
        // LOAD DATA INTO FORM
        // =====================================

        projectName.value =
            project.projectName || "";


        description.value =
            project.description || "";


        budget.value =
            project.budget ?? 0;

        fundSource.value = project.fundSource || "";
        fundSourceOther.value = project.fundSourceOther || "";
        fundSourceOther.hidden = fundSource.value !== "Other";
        fundSourceOther.required = fundSource.value === "Other";


        spent.value =
            project.spent ?? 0;


        status.value =
            project.status || "Planned";


        physicalProgress.value =
            project.physicalProgress ?? 0;


        startDate.value =
            project.startDate || "";


        targetDate.value =
            project.targetDate || "";


        console.log(
            "Project loaded for editing:",
            project
        );


    } catch (error) {

        console.error(
            "Failed to load project:",
            error
        );


        showMessage(
            "Failed to load project.",
            "error"
        );

    }

}


// =====================================
// SAVE CHANGES
// =====================================

editProjectForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        if (!currentUserData) {

            showMessage(
                "User information is not ready.",
                "error"
            );

            return;
        }


        // =====================================
        // GET VALUES
        // =====================================

        const name =
            projectName.value.trim();


        const projectDescription =
            description.value.trim();


        const projectBudget =
            Number(
                budget.value
            );

        const projectFundSource = fundSource.value;
        const projectFundSourceOther = fundSourceOther.value.trim();


        const projectSpent =
            Number(
                spent.value
            );


        const projectStatus =
            status.value;


        const projectPhysicalProgress =
            Number(
                physicalProgress.value
            );


        const projectStartDate =
            startDate.value;


        const projectTargetDate =
            targetDate.value;


        // =====================================
        // VALIDATION
        // =====================================

        if (!name) {

            showMessage(
                "Please enter the project name.",
                "error"
            );

            return;
        }


        if (!projectDescription) {

            showMessage(
                "Please enter a project description.",
                "error"
            );

            return;
        }

        if (!projectFundSource || (projectFundSource === "Other" && !projectFundSourceOther)) {
            showMessage("Please select or specify the project's fund source.", "error");
            return;
        }


        if (
            isNaN(projectBudget) ||
            projectBudget <= 0
        ) {

            showMessage(
                "Please enter a valid allocated budget.",
                "error"
            );

            return;
        }


        if (
            isNaN(projectSpent) ||
            projectSpent < 0
        ) {

            showMessage(
                "Please enter a valid amount spent.",
                "error"
            );

            return;
        }


        if (
            projectSpent >
            projectBudget
        ) {

            showMessage(
                "Amount spent cannot be greater than the allocated budget.",
                "error"
            );

            return;
        }


        if (
            isNaN(
                projectPhysicalProgress
            ) ||
            projectPhysicalProgress < 0 ||
            projectPhysicalProgress > 100
        ) {

            showMessage(
                "Physical progress must be between 0 and 100%.",
                "error"
            );

            return;
        }


        if (!projectStartDate) {

            showMessage(
                "Please select a start date.",
                "error"
            );

            return;
        }


        if (!projectTargetDate) {

            showMessage(
                "Please select a target completion date.",
                "error"
            );

            return;
        }


        if (
            projectTargetDate <
            projectStartDate
        ) {

            showMessage(
                "Target completion cannot be earlier than the start date.",
                "error"
            );

            return;
        }

        const newFiles = [...selectedNewFiles];
        if (existingDocuments.length + newFiles.length > 5) {
            showMessage("A project can have up to 5 supporting documents total.", "error");
            return;
        }
        if (newFiles.some((file) => !isAllowedDocument(file))) {
            showMessage("Please upload PDF, DOC, or DOCX files only.", "error");
            return;
        }
        if (newFiles.some((file) => file.size > 10 * 1024 * 1024)) {
            showMessage("Each document must not exceed 10 MB.", "error");
            return;
        }


        // =====================================
        // CALCULATE FINANCIAL DATA
        // =====================================

        const remaining =
            projectBudget -
            projectSpent;


        const utilization =
            projectBudget > 0
                ? (
                    projectSpent /
                    projectBudget
                ) * 100
                : 0;


        // =====================================
        // BUTTON
        // =====================================

        const saveButton =
            document.querySelector(
                ".save-btn"
            );


        saveButton.disabled =
            true;


        saveButton.textContent =
            "Saving...";


        // =====================================
        // UPDATE FIRESTORE
        // =====================================

        try {

            const updatedDocuments = [...existingDocuments];
            for (const [index, file] of newFiles.entries()) {
                saveButton.textContent = `Uploading file ${index + 1} of ${newFiles.length}...`;
                updatedDocuments.push(await uploadSupportingDocument(file));
            }

            const projectRef =
                doc(
                    db,
                    "projects",
                    projectId
                );


            await updateDoc(
                projectRef,
                {

                    projectName:
                        name,

                    description:
                        projectDescription,

                    budget:
                        projectBudget,

                    fundSource:
                        projectFundSource,

                    fundSourceOther:
                        projectFundSource === "Other" ? projectFundSourceOther : "",

                    spent:
                        projectSpent,

                    remaining:
                        remaining,

                    utilization:
                        utilization,

                    physicalProgress:
                        projectPhysicalProgress,

                    status:
                        projectStatus,

                    startDate:
                        projectStartDate,

                    targetDate:
                        projectTargetDate,

                    documents:
                        updatedDocuments,

                    // An edited project update must be submitted again
                    // for DILG monitoring validation.
                    verificationStatus:
                        String(currentUserData.role || "").toLowerCase() === "dilg"
                            ? (currentProjectData.verificationStatus || "Draft")
                            : "Draft",

                    lastUpdatedAt:
                        serverTimestamp(),

                    returnReason:
                        String(currentUserData.role || "").toLowerCase() === "dilg"
                            ? (currentProjectData.returnReason || "")
                            : ""

                }
            );


            // =====================================
            // SUCCESS
            // =====================================

            showMessage(
                "Project updated successfully!",
                "success"
            );


            setTimeout(
                () => {

                    window.location.href = getProjectsReturnUrl();

                },
                1000
            );


        } catch (error) {

            console.error(
                "Failed to update project:",
                error
            );


            showMessage(
                "Failed to update project: " +
                error.message,
                "error"
            );


            saveButton.disabled =
                false;


            saveButton.textContent =
                "Save Changes";

        }

    }
);


// =====================================
// SHOW MESSAGE
// =====================================

function showMessage(
    text,
    type
) {

    message.textContent =
        text;


    if (type === "success") {

        message.style.color =
            "#166534";

    } else {

        message.style.color =
            "#991b1b";

    }

}

function renderExistingDocuments() {
    if (!existingDocumentsElement) return;
    if (!existingDocuments.length) {
        existingDocumentsElement.textContent = "No supporting documents uploaded yet.";
        return;
    }
    existingDocumentsElement.replaceChildren();
    const list = document.createElement("ul");
    existingDocuments.forEach((file, index) => {
        const item = document.createElement("li");
        const name = document.createElement("span");
        name.textContent = file?.name || "Supporting document";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-document-btn";
        remove.setAttribute("aria-label", `Remove ${name.textContent}`);
        remove.textContent = "\u00d7";
        remove.addEventListener("click", () => {
            existingDocuments.splice(index, 1);
            renderExistingDocuments();
        });
        item.append(name, remove);
        list.append(item);
    });
    existingDocumentsElement.append(list);
}

projectDocumentsInput?.addEventListener("change", () => {
    const incomingFiles = Array.from(projectDocumentsInput.files || []);
    if (existingDocuments.length + selectedNewFiles.length + incomingFiles.length > 5) {
        showMessage("A project can have up to 5 supporting documents total.", "error");
        projectDocumentsInput.value = "";
        return;
    }
    selectedNewFiles.push(...incomingFiles);
    projectDocumentsInput.value = "";
    renderNewDocuments();
});

function renderNewDocuments() {
    if (!newDocumentsList) return;
    newDocumentsList.replaceChildren();
    selectedNewFiles.forEach((file, index) => {
        const item = document.createElement("li");
        const name = document.createElement("span");
        name.textContent = file.name;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-document-btn";
        remove.setAttribute("aria-label", `Remove ${file.name}`);
        remove.textContent = "\u00d7";
        remove.addEventListener("click", () => {
            selectedNewFiles.splice(index, 1);
            renderNewDocuments();
        });
        item.append(name, remove);
        newDocumentsList.append(item);
    });
}

function isAllowedDocument(file) {
    return ["pdf", "doc", "docx"].includes(file.name.split(".").pop()?.toLowerCase());
}

async function uploadSupportingDocument(file) {
    if (!currentUser) throw new Error("You are not logged in.");
    const formData = new FormData();
    formData.append("action", "upload");
    formData.append("file", file);
    if (String(currentUserData?.role || "").toLowerCase() === "dilg" && currentProjectData?.barangayId) {
        formData.append("barangayId", currentProjectData.barangayId);
    }
    const response = await fetch(`${supabaseUrl}/functions/v1/project-documents`, {
        method: "POST",
        headers: {
            apikey: supabasePublishableKey,
            "x-firebase-token": await currentUser.getIdToken()
        },
        body: formData
    });
    const result = await response.json();
    if (!response.ok || !result.success || !result.document) {
        throw new Error(result.error || "Document upload failed.");
    }
    return result.document;
}

function configureDilgEditNavigation() {
    const navigation = document.querySelector(".sidebar .navigation");
    if (navigation) {
        navigation.innerHTML = `
            <div class="nav-label">DILG ADMIN</div>
            <a class="nav-item" href="dilg-dashboard.html"><span class="nav-icon">⌂</span><span>Dashboard</span></a>
            <a class="nav-item" href="barangays.html"><span class="nav-icon">▦</span><span>All Barangays</span></a>
            <a class="nav-item" href="dilg-projects.html"><span class="nav-icon">▤</span><span>Projects</span></a>
        `;
    }
    document.documentElement.classList.add("dilg-nav-ready");
    if (backBtn) backBtn.textContent = "Back to Barangay Projects";
}

function getProjectsReturnUrl() {
    const isDilg = String(currentUserData?.role || "").toLowerCase() === "dilg";
    if (isDilg && currentProjectData?.barangayId) {
        return `barangay-details.html?barangay=${encodeURIComponent(currentProjectData.barangayId)}`;
    }
    return "projects.html";
}


// =====================================
// DISABLE FORM
// =====================================

function disableForm() {

    const inputs =
        editProjectForm.querySelectorAll(
            "input, textarea, select, button"
        );


    inputs.forEach(
        (input) => {

            input.disabled =
                true;

        }
    );

}


// =====================================
// BACK BUTTON
// =====================================

if (backBtn) {

    backBtn.addEventListener(
        "click",
        () => {
            window.location.href = getProjectsReturnUrl();

        }
    );

}


// =====================================
// CANCEL BUTTON
// =====================================

if (cancelBtn) {

    cancelBtn.addEventListener(
        "click",
        () => {
            window.location.href = getProjectsReturnUrl();

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
                "barangay.html";

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
                "projects.html";

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
