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
    query,
    where,
    getDocs,
    deleteDoc,
    updateDoc,
    serverTimestamp
} from "firebase/firestore";

import { app } from "./firebase-config.js";
import { confirmAction } from "./dialog-ui.js";
import { supabaseUrl, supabasePublishableKey } from "./supabase-config.js";

const auth = getAuth(app);
const db = getFirestore(app);

// =====================================
// HTML ELEMENTS
// =====================================

const projectList =
    document.getElementById("projectList");

const yearFilter = document.getElementById("yearFilter");
const monthFilter = document.getElementById("monthFilter");

const message =
    document.getElementById("message");

const barangayName =
    document.getElementById("barangayName");

const addProjectBtn =
    document.getElementById("addProjectBtn");

const addProjectNav =
    document.getElementById("addProjectNav");

const dashboardBtn =
    document.getElementById("dashboardBtn");

const feedbackBtn =
    document.getElementById("feedbackBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

// =====================================
// CURRENT USER
// =====================================

let currentUser = null;
let currentUserData = null;

// =====================================
// AUTHENTICATION
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

            if (
                !userSnapshot.exists()
            ) {

                showMessage(
                    "User profile not found."
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

            if (
                role !== "barangay"
            ) {

                showMessage(
                    "You are not authorized."
                );

                return;
            }

            // =====================================
            // BARANGAY ID
            // =====================================

            const barangayId =
                String(
                    currentUserData.barangayId || ""
                )
                .trim();

            if (!barangayId) {

                showMessage(
                    "Barangay ID is missing."
                );

                return;
            }

            if (barangayName) {

                barangayName.textContent =
                    `Barangay: ${barangayId}`;

            }

            // =====================================
            // LOAD PROJECTS
            // =====================================

            await loadProjects();

        } catch (error) {

            console.error(
                "Authentication error:",
                error
            );

            showMessage(
                "Failed to load projects."
            );
        }
    }
);

// =====================================
// LOAD PROJECTS
// =====================================

async function loadProjects() {

    try {

        projectList.innerHTML = projectSkeletonMarkup();

        const projectsQuery =
            query(
                collection(
                    db,
                    "projects"
                ),
                where(
                    "barangayId",
                    "==",
                    currentUserData.barangayId
                )
            );

        const querySnapshot =
            await getDocs(
                projectsQuery
            );

        projectList.innerHTML =
            "";

        // =====================================
        // NO PROJECTS
        // =====================================

        if (
            querySnapshot.empty
        ) {

            projectList.innerHTML = `

                <div class="empty">

                    <h3>
                        No Projects Yet
                    </h3>

                    <p>
                        Start by adding your
                        first barangay project.
                    </p>

                </div>

            `;

            return;
        }

        // =====================================
        // DISPLAY PROJECTS
        // =====================================

        projectList.innerHTML = `
            <div class="project-table-summary" id="projectTableSummary">Showing ${querySnapshot.size} projects</div>
            <div class="project-table-wrap">
                <table class="project-table">
                    <thead>
                        <tr>
                            <th scope="col">#</th>
                            <th scope="col">Project Title</th>
                            <th scope="col">Allocated Budget</th>
                            <th scope="col">Spend</th>
                            <th scope="col">Fund Source</th>
                            <th scope="col">Utilization</th>
                            <th scope="col">Balance</th>
                            <th scope="col">Schedule</th>
                            <th scope="col">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="projectTableBody"></tbody>
                </table>
            </div>
        `;

        const projectTableBody = document.getElementById("projectTableBody");
        const currencyFormatter = new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        let projectRowNumber = 0;

        querySnapshot.forEach(
            (projectDoc) => {

                const project =
                    projectDoc.data();

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

                const remaining =
                    projectBudget -
                    projectSpent;

                let utilization =
                    Number(
                        project.utilization
                    );

                if (
                    isNaN(
                        utilization
                    )
                ) {

                    utilization =
                        projectBudget > 0
                            ? (
                                projectSpent /
                                projectBudget
                            ) * 100
                            : 0;
                }

                // =====================================
                // =====================================
                // PROJECT STATUS
                // =====================================

                const projectStatus =
                    String(
                        project.status ||
                        "Planned"
                    )
                    .trim();

                let statusClass =
                    "status-planned";

                if (
                    projectStatus
                        .toLowerCase() ===
                    "ongoing"
                ) {

                    statusClass =
                        "status-ongoing";
                }

                if (
                    projectStatus
                        .toLowerCase() ===
                    "completed"
                ) {

                    statusClass =
                        "status-completed";
                }

                // =====================================
                // VERIFICATION STATUS
                // =====================================

                const verificationStatus =
                    String(
                        project.verificationStatus ||
                        "Draft"
                    )
                    .trim();

                const verificationLower =
                    verificationStatus
                        .toLowerCase();

                // =====================================
                // DILG RETURN REASON
                // =====================================

                const returnReason =
                    String(
                        project.returnReason ||
                        ""
                    )
                    .trim();

                const projectTitle = project.projectName || project.name || project.title || "Unnamed Project";
                const fundSource = project.fundSource === "Other" && project.fundSourceOther
                    ? `Other: ${project.fundSourceOther}`
                    : project.fundSource || "Not specified";
                const schedule = [
                    project.startDate ? `Start: ${project.startDate}` : "",
                    project.targetDate ? `Target: ${project.targetDate}` : ""
                ].filter(Boolean).join("\n") || "Not specified";

                const card = document.createElement("tr");
                card.className = "project-table-row";
                card.dataset.startDate = project.startDate || project.targetDate || "";
                card.dataset.projectId = projectDoc.id;
                projectRowNumber += 1;

                card.innerHTML = `
                    <td class="project-row-number" data-label="#">${projectRowNumber}</td>
                    <td class="project-title-cell" data-label="Project Title">
                        <strong>${escapeHTML(projectTitle)}</strong>
                        <span>${escapeHTML(project.description || "No description")}</span>
                    </td>
                    <td class="money-cell" data-label="Allocated Budget">${currencyFormatter.format(projectBudget)}</td>
                    <td class="money-cell" data-label="Spend">${currencyFormatter.format(projectSpent)}</td>
                    <td data-label="Fund Source">${escapeHTML(fundSource)}</td>
                    <td data-label="Utilization">${utilization.toFixed(1)}%</td>
                    <td class="money-cell" data-label="Balance">${currencyFormatter.format(remaining)}</td>
                    <td class="schedule-cell" data-label="Schedule">${escapeHTML(schedule)}</td>
                    <td>
                        <button class="project-actions-toggle" type="button" aria-label="Project actions" aria-haspopup="true" aria-expanded="false">&#9776;</button>
                    </td>
                `;

                const actionRow = document.createElement("tr");
                actionRow.className = "project-actions-menu-row";
                actionRow.hidden = true;
                actionRow.innerHTML = `
                    <td colspan="9">
                        <div class="project-table-actions">
                            <button class="action-btn view-btn" data-id="${escapeHTML(projectDoc.id)}" type="button">View</button>
                            ${canEditProject(verificationStatus) ? `<button class="action-btn edit-btn" data-id="${escapeHTML(projectDoc.id)}" type="button">Edit</button>` : ""}
                            ${canDeleteProject(verificationStatus) ? `<button class="action-btn delete-btn" data-id="${escapeHTML(projectDoc.id)}" type="button">Delete</button>` : ""}
                            ${canSubmitProject(verificationStatus) ? `<button class="action-btn submit-btn" data-id="${escapeHTML(projectDoc.id)}" type="button">Submit for Validation</button>` : ""}
                        </div>
                    </td>
                `;
                projectTableBody.appendChild(card);
                projectTableBody.appendChild(actionRow);

                const actionsToggle = card.querySelector(".project-actions-toggle");
                actionsToggle?.addEventListener("click", () => {
                    const shouldOpen = actionRow.hidden;
                    projectTableBody.querySelectorAll(".project-actions-menu-row").forEach((row) => { row.hidden = true; });
                    projectTableBody.querySelectorAll(".project-actions-toggle").forEach((button) => { button.setAttribute("aria-expanded", "false"); });
                    if (shouldOpen) {
                        actionRow.hidden = false;
                        actionsToggle.setAttribute("aria-expanded", "true");
                    }
                });


                // =====================================
                // VIEW
                // =====================================

                const viewButton =
                    actionRow.querySelector(
                        ".view-btn"
                    );

                if (viewButton) {

                    viewButton.addEventListener(
                        "click",
                        () => {

                            window.location.href =
                                `project-details.html?id=${projectDoc.id}`;

                        }
                    );
                }

                // =====================================
                // EDIT
                // =====================================

                const editButton =
                    actionRow.querySelector(
                        ".edit-btn"
                    );

                if (editButton) {

                    editButton.addEventListener(
                        "click",
                        () => {

                            window.location.href =
                                `edit-project.html?id=${projectDoc.id}`;

                        }
                    );
                }


                // =====================================
                // DELETE
                // =====================================

                const deleteButton =
                    actionRow.querySelector(
                        ".delete-btn"
                    );

                if (deleteButton) {

                    deleteButton.addEventListener(
                        "click",
                        async () => {

                            const confirmDelete =
                                await confirmAction(
                                    "Delete Project",
                                    "Are you sure you want to delete this project?",
                                    "Delete"
                                );

                            if (
                                !confirmDelete
                            ) {

                                return;
                            }

                            try {

                                deleteButton.disabled =
                                    true;

                                deleteButton.textContent =
                                    "Deleting...";

                                await deleteDoc(
                                    doc(
                                        db,
                                        "projects",
                                        projectDoc.id
                                    )
                                );

                                await loadProjects();

                            } catch (error) {

                                console.error(
                                    "Delete error:",
                                    error
                                );

                                alert(
                                    "Failed to delete project."
                                );

                                deleteButton.disabled =
                                    false;

                                deleteButton.textContent =
                                    "Delete";
                            }

                        }
                    );
                }


                // =====================================
                // SUBMIT TO DILG
                // =====================================

                const submitButton =
                    actionRow.querySelector(
                        ".submit-btn"
                    );

                if (submitButton) {

                    submitButton.addEventListener(
                        "click",
                        async () => {

                            const confirmSubmit =
                                await confirmAction(
                                    "Submit Project Update",
                                    "Submit this project update to DILG for validation?",
                                    "Submit"
                                );

                            if (
                                !confirmSubmit
                            ) {

                                return;
                            }

                            try {

                                submitButton.disabled =
                                    true;

                                submitButton.textContent =
                                    "Submitting...";

                                await updateDoc(
                                    doc(
                                        db,
                                        "projects",
                                        projectDoc.id
                                    ),
                                    {

                                        verificationStatus:
                                            "Submitted",

                                        submittedAt:
                                            serverTimestamp(),

                                        submittedBy:
                                            currentUser.uid

                                    }
                                );

                                alert(
                                    "Project update submitted to DILG for validation."
                                );

                                await loadProjects();

                            } catch (error) {

                                console.error(
                                    "Submit error:",
                                    error
                                );

                                alert(
                                    "Failed to submit project."
                                );

                                submitButton.disabled =
                                    false;

                                submitButton.textContent =
                                    "Submit for Validation";
                            }

                        }
                    );
                }

            }
        );

        setupProjectDateFilters(
            querySnapshot.docs.map(
                (projectDoc) => projectDoc.data()
            )
        );

    } catch (error) {

        console.error(
            "Error loading projects:",
            error
        );

        projectList.innerHTML = `

            <div class="empty">

                <h3>
                    Failed to load projects
                </h3>

                <p>
                    ${escapeHTML(
                        error.message ||
                        "Unknown error"
                    )}
                </p>

            </div>

        `;
    }
}

// =====================================
// CAN EDIT
// =====================================

function canEditProject(
    verificationStatus
) {

    const status =
        String(
            verificationStatus ||
            "Draft"
        )
        .trim()
        .toLowerCase();

    return (
        status === "draft" ||
        status === "returned" ||
        status === "validated" ||
        status === "verified" ||
        status === "approved"
    );
}

// =====================================
// CAN SUBMIT
// =====================================

function canSubmitProject(
    verificationStatus
) {

    const status =
        String(
            verificationStatus ||
            "Draft"
        )
        .trim()
        .toLowerCase();

    return (
        status === "draft" ||
        status === "returned"
    );
}

// =====================================
// VERIFICATION LABEL
// =====================================

function getVerificationLabel(
    status
) {

    const value =
        String(
            status ||
            "Draft"
        )
        .trim()
        .toLowerCase();

    if (
        value === "submitted"
    ) {

        return "Submitted for Validation";
    }

    if (
        value === "validated" ||
        value === "verified" ||
        value === "approved"
    ) {

        return "Validated";
    }

    if (
        value === "returned"
    ) {

        return "Returned for Correction";
    }

    return "Draft";
}

// =====================================
// VERIFICATION CSS CLASS
// =====================================

function getVerificationClass(
    status
) {

    const value =
        String(
            status ||
            "Draft"
        )
        .trim()
        .toLowerCase();

    if (
        value === "submitted"
    ) {

        return "verification-pending";
    }

    if (
        value === "validated" ||
        value === "verified" ||
        value === "approved"
    ) {

        return "verification-verified";
    }

    if (
        value === "returned"
    ) {

        return "verification-returned";
    }

    return "verification-draft";
}

// =====================================
// ESCAPE HTML
// =====================================

function setupProjectDateFilters(projects) {

    if (!yearFilter || !monthFilter) return;

    const years = [...new Set(projects.map((project) => String(project.startDate || project.targetDate || "").slice(0, 4)).filter(Boolean))].sort().reverse();
    yearFilter.innerHTML = '<option value="">All years</option>' + years.map((year) => `<option value="${year}">${year}</option>`).join("");
    monthFilter.innerHTML = '<option value="">All months</option>' + Array.from({ length: 12 }, (_, index) => `<option value="${String(index + 1).padStart(2, "0")}">${new Date(2000, index).toLocaleString("en", { month: "long" })}</option>`).join("");

    const applyFilters = () => {
        document.querySelectorAll("#projectList .project-table-row").forEach((card) => {
            const date = card.dataset.startDate || "";
            card.style.display = (!yearFilter.value || date.slice(0, 4) === yearFilter.value) && (!monthFilter.value || date.slice(5, 7) === monthFilter.value) ? "" : "none";
        });
    };

    yearFilter.onchange = applyFilters;
    monthFilter.onchange = applyFilters;
}

function canDeleteProject(
    verificationStatus
) {

    const status = String(
        verificationStatus || "Draft"
    ).trim().toLowerCase();

    return status === "draft" || status === "returned";
}

function formatProjectLastUpdated(project) {
    const value = project.updatedAt || project.validatedAt || project.submittedAt ||
        project.returnedAt || project.createdAt || project.startDate || project.targetDate;

    if (!value) return "Not recorded yet";

    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function projectSkeletonMarkup() {
    return Array.from({ length: 3 }, () => `
        <div class="project-skeleton" aria-label="Loading project" role="status">
            <span class="skeleton-line skeleton-title"></span>
            <span class="skeleton-line skeleton-text"></span>
            <span class="skeleton-line skeleton-text short"></span>
            <div class="skeleton-info-row"><span></span><span></span><span></span></div>
            <span class="skeleton-line skeleton-action"></span>
        </div>
    `).join("");
}


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
// SUPPORTING DOCUMENTS
// =====================================

async function openBarangayDocument(
    documentUrl,
    fileName,
    button,
    storagePath,
    action = "view"
) {

    if (
        !documentUrl &&
        !storagePath
    ) {

        alert(
            "The document link is unavailable."
        );

        return;
    }

    const originalText =
        button.textContent;
    const previewWindow = action === "view" ? window.open("about:blank", "_blank") : null;
    if (previewWindow) previewWindow.opener = null;

    let url =
        documentUrl ||
        "";

    try {

        button.disabled =
            true;

        button.textContent = action === "view" ? "Opening..." : "Downloading...";

        if (
            storagePath
        ) {

            try {

                    url =
                    await getBarangayDocumentUrl(
                        storagePath,
                        action
                    );

            } catch (signedUrlError) {

                console.warn(
                    "Signed document URL unavailable; using the stored URL.",
                    signedUrlError
                );

                if (
                    !documentUrl
                ) {

                    throw signedUrlError;
                }

                url =
                    documentUrl;
            }
        }

        if (action === "view") {
            if (previewWindow) previewWindow.location.replace(url);
            else window.location.href = url;
            return;
        }
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName || "project-document";
        document.body.appendChild(link);
        link.click();
        link.remove();

    } catch (error) {

        console.error(
            "Document download error:",
            error
        );

        alert(
            error.message ||
            "Unable to download the document."
        );

        previewWindow?.close();

    } finally {

        button.disabled =
            false;

        button.textContent =
            originalText;
    }
}

async function getBarangayDocumentUrl(
    storagePath,
    action = "view"
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

    const response =
        await fetch(
            `${supabaseUrl}/functions/v1/project-documents`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                    apikey:
                        supabasePublishableKey,
                    "x-firebase-token":
                        firebaseToken
                },
                body: JSON.stringify(
                    {
                        action,
                        storagePath: storagePath
                    }
                )
            }
        );

    const result =
        await response.json();

    if (
        !response.ok ||
        !result.success ||
        !result.signedUrl
    ) {

        throw new Error(
            result.error ||
            "Unable to prepare the document."
        );
    }

    return result.signedUrl;
}

// =====================================
// MESSAGE
// =====================================

function showMessage(
    text
) {

    if (message) {

        message.textContent =
            text;
    }
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
// ADD PROJECT NAVIGATION
// =====================================

if (addProjectNav) {

    addProjectNav.addEventListener(
        "click",
        () => {

            window.location.href =
                "add-project.html";

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
