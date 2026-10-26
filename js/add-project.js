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
    addDoc,
    serverTimestamp
} from "firebase/firestore";

import { app } from "./firebase-config.js";
import { barangayDirectoryById } from "./barangay-directory.js";
import {
    supabaseUrl,
    supabasePublishableKey
} from "./supabase-config.js";

const auth = getAuth(app);
const db = getFirestore(app);


// =====================================
// HTML ELEMENTS
// =====================================

const projectForm =
    document.getElementById("projectForm");

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

const projectDocument =
    document.getElementById("projectDocument");
const selectedDocumentsList = document.getElementById("selectedDocuments");
let selectedProjectFiles = [];

const message =
    document.getElementById("message");

const cancelBtn =
    document.getElementById("cancelBtn");

const dashboardBtn =
    document.getElementById("dashboardBtn");

const projectsBtn =
    document.getElementById("projectsBtn");

const feedbackBtn =
    document.getElementById("feedbackBtn");

const logoutBtn =
    document.getElementById("logoutBtn");


// =====================================
// CURRENT USER
// =====================================

let currentUser = null;
let currentUserData = null;
const addProjectParams = new URLSearchParams(window.location.search);
const isDilgProjectCreate = addProjectParams.get("source") === "dilg";
const requestedBarangayId = addProjectParams.get("barangay") || "";
let targetBarangayId = null;


// =====================================
// CHECK AUTHENTICATION
// =====================================

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

            // =====================================
            // GET USER PROFILE
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


            if (!userSnapshot.exists()) {

                showMessage(
                    "User profile not found.",
                    "error"
                );

                return;
            }


            currentUserData =
                userSnapshot.data();


            // =====================================
            // CHECK ROLE
            // =====================================

            const role =
                String(
                    currentUserData.role || ""
                )
                .trim()
                .toLowerCase();


            if (role === "barangay") {
                targetBarangayId = String(currentUserData.barangayId || "").trim();
                document.documentElement.classList.add("dilg-nav-ready");
            } else if (role === "dilg" && isDilgProjectCreate && barangayDirectoryById.has(requestedBarangayId)) {
                targetBarangayId = requestedBarangayId;
                configureDilgAddProjectNavigation();
            } else {
                document.documentElement.classList.add("dilg-nav-ready");

                showMessage(
                    "You are not authorized.",
                    "error"
                );

                return;
            }

            const targetBarangay = barangayDirectoryById.get(targetBarangayId);
            if (!targetBarangay) {
                showMessage("This account is not assigned to an official barangay.", "error");
                return;
            }

            const projectFormDescription = document.querySelector(".panel-header p");
            if (projectFormDescription) {
                projectFormDescription.textContent = role === "dilg"
                    ? `DILG is adding this project for ${targetBarangay.name}.`
                    : `Enter the details of the new ${targetBarangay.name} project below.`;
            }


            console.log(
                "Logged in Barangay:",
                currentUserData.barangayId
            );


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


// =====================================
// SUBMIT PROJECT
// =====================================

if (projectForm) {

    projectForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (!currentUserData) {

                showMessage(
                    "User information is not ready. Please wait.",
                    "error"
                );

                return;
            }


            // =====================================
            // GET FORM VALUES
            // =====================================

            const name =
                projectName.value.trim();


            const projectDescription =
                description.value.trim();


            const projectBudget =
                Number(
                    budget.value
                );

            const projectFundSource = fundSource?.value || "";
            const projectFundSourceOther = fundSourceOther?.value.trim() || "";


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

            const selectedDocuments = [...selectedProjectFiles];


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
                isNaN(projectPhysicalProgress) ||
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

            if (
                !barangayDirectoryById.has(
                    String(
                        targetBarangayId ||
                        ""
                    )
                    .trim()
                )
            ) {

                showMessage(
                    "This account is not assigned to an official barangay.",
                    "error"
                );

                return;
            }

            if (selectedDocuments.length > 5) {
                showMessage("You can upload up to 5 supporting documents.", "error");
                return;
            }

            if (selectedDocuments.some((file) => !isAllowedDocument(file))) {

                showMessage(
                    "Please upload a PDF, DOC, or DOCX file only.",
                    "error"
                );

                return;
            }

            if (selectedDocuments.some((file) => file.size > 10 * 1024 * 1024)) {

                showMessage(
                    "The document must not exceed 10 MB.",
                    "error"
                );

                return;
            }


            // =====================================
            // CALCULATE FINANCIAL DATA
            // =====================================

            const remaining =
                projectBudget -
                projectSpent;


            const budgetUtilization =
                projectBudget > 0
                    ? (
                        projectSpent /
                        projectBudget
                    ) * 100
                    : 0;


            // =====================================
            // SAVE PROJECT
            // =====================================

            try {

                const saveButton =
                    document.querySelector(
                        ".save-btn"
                    );


                if (saveButton) {

                    saveButton.disabled =
                        true;

                    saveButton.textContent =
                        "Saving...";

                }


                const documents = [];

                for (const [index, file] of selectedDocuments.entries()) {
                    if (saveButton) saveButton.textContent = `Uploading file ${index + 1} of ${selectedDocuments.length}...`;
                    documents.push(await uploadSupportingDocument(file));
                }

                saveButton.textContent =
                    "Saving project...";

                await addDoc(
                    collection(
                        db,
                        "projects"
                    ),
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
                            budgetUtilization,

                        physicalProgress:
                            projectPhysicalProgress,

                        status:
                            projectStatus,

                        startDate:
                            projectStartDate,

                        targetDate:
                            projectTargetDate,

                        barangayId:
                            targetBarangayId,

                        createdBy:
                            currentUser.uid,

                        createdAt:
                            serverTimestamp(),

                        documents:
                            documents,

                        // =====================================
                        // DILG VERIFICATION
                        // =====================================

                        verificationStatus:
                            "Draft"

                    }
                );


                // =====================================
                // SUCCESS
                // =====================================

                showMessage(
                    "Project added successfully!",
                    "success"
                );


                projectForm.reset();
                selectedProjectFiles = [];
                renderSelectedProjectFiles();
                if (fundSourceOther) {
                    fundSourceOther.hidden = true;
                    fundSourceOther.required = false;
                    fundSourceOther.value = "";
                }


                // Restore defaults

                if (spent) {

                    spent.value =
                        "0";

                }


                if (physicalProgress) {

                    physicalProgress.value =
                        "0";

                }


                // =====================================
                // GO BACK TO PROJECTS
                // =====================================

                setTimeout(
                    () => {

                        window.location.href = getAddProjectReturnUrl();

                    },
                    1000
                );


            } catch (error) {

                console.error(
                    "Failed to add project:",
                    error
                );


                showMessage(
                    "Failed to add project: " +
                    error.message,
                    "error"
                );


                const saveButton =
                    document.querySelector(
                        ".save-btn"
                    );


                if (saveButton) {

                    saveButton.disabled =
                        false;

                    saveButton.textContent =
                        "Save Project";

                }

            }

        }
    );

}


projectDocument?.addEventListener("change", () => {
    const incomingFiles = Array.from(projectDocument.files || []);
    if (selectedProjectFiles.length + incomingFiles.length > 5) {
        showMessage("You can upload up to 5 supporting documents.", "error");
        projectDocument.value = "";
        return;
    }
    selectedProjectFiles.push(...incomingFiles);
    projectDocument.value = "";
    renderSelectedProjectFiles();
});

function renderSelectedProjectFiles() {
    if (!selectedDocumentsList) return;
    selectedDocumentsList.replaceChildren();
    selectedProjectFiles.forEach((file, index) => {
        const item = document.createElement("li");
        const name = document.createElement("span");
        name.textContent = file.name;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-document-btn";
        remove.setAttribute("aria-label", `Remove ${file.name}`);
        remove.textContent = "×";
        remove.addEventListener("click", () => {
            selectedProjectFiles.splice(index, 1);
            renderSelectedProjectFiles();
        });
        item.append(name, remove);
        selectedDocumentsList.append(item);
    });
}

// =====================================
// SHOW MESSAGE
// =====================================

function showMessage(
    text,
    type
) {

    if (!message) {

        return;
    }


    message.textContent =
        text;


    if (
        type === "success"
    ) {

        message.style.color =
            "#166534";

    } else {

        message.style.color =
            "#991b1b";

    }

}


// =====================================
// CANCEL
// =====================================

function configureDilgAddProjectNavigation() {
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
    const pageTitle = document.querySelector(".topbar h1");
    if (pageTitle) pageTitle.textContent = "Add Barangay Project";
}

function getAddProjectReturnUrl() {
    if (String(currentUserData?.role || "").toLowerCase() === "dilg" && targetBarangayId) {
        return `barangay-details.html?barangay=${encodeURIComponent(targetBarangayId)}`;
    }
    return "projects.html";
}

if (cancelBtn) {

    cancelBtn.addEventListener(
        "click",
        () => {

            window.location.href = getAddProjectReturnUrl();

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
// CITIZEN FEEDBACK
// =====================================

if (feedbackBtn) {

    feedbackBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "barangay-feedback.html";

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

}

// =====================================
// DOCUMENT HELPERS
// =====================================

function isAllowedDocument(
    file
) {

    const extension =
        file.name
        .split(".")
        .pop()
        ?.toLowerCase();

    return [
        "pdf",
        "doc",
        "docx"
    ].includes(
        extension
    );
}

async function uploadSupportingDocument(
    file
) {

    if (
        !currentUser
    ) {

        throw new Error(
            "You are not logged in."
        );
    }

    const firebaseToken =
        await currentUser.getIdToken();

    const formData =
        new FormData();

    formData.append(
        "action",
        "upload"
    );

    formData.append(
        "file",
        file
    );

    if (String(currentUserData?.role || "").toLowerCase() === "dilg" && targetBarangayId) {
        formData.append("barangayId", targetBarangayId);
    }

    const response =
        await fetch(
            `${supabaseUrl}/functions/v1/project-documents`,
            {
                method: "POST",
                headers: {
                    apikey:
                        supabasePublishableKey,
                    "x-firebase-token":
                        firebaseToken
                },
                body: formData
            }
        );

    const result =
        await response.json();

    if (
        !response.ok ||
        !result.success ||
        !result.document
    ) {

        throw new Error(
            result.error ||
            "Document upload failed."
        );
    }

    return result.document;
}
