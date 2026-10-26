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
    updateDoc,
    serverTimestamp
} from "firebase/firestore";

import { app } from "./firebase-config.js";
import { confirmAction, requestText } from "./dialog-ui.js";
import {
    supabaseUrl,
    supabasePublishableKey
} from "./supabase-config.js";
import { barangayDirectory } from "./barangay-directory.js";

const auth = getAuth(app);
const db = getFirestore(app);
const validationsOnly =
    new URLSearchParams(window.location.search)
    .get("validation") === "true" ||
    new URLSearchParams(window.location.search)
    .get("approval") === "true";

const projectApprovalsBtn =
    document.getElementById("projectApprovalsBtn");

const dilgPageTitle =
    document.getElementById("dilgPageTitle");

const dilgPageDescription =
    document.getElementById("dilgPageDescription");

const projectPanelLabel =
    document.getElementById("projectPanelLabel");

const projectPanelTitle =
    document.getElementById("projectPanelTitle");

const projectPanelDescription =
    document.getElementById("projectPanelDescription");

// =====================================
// HTML ELEMENTS
// =====================================

const totalProjectsElement =
    document.getElementById("totalProjects");

const totalBudgetElement =
    document.getElementById("totalBudget");

const verifiedProjectsElement =
    document.getElementById("verifiedProjects");

const pendingProjectsElement =
    document.getElementById("pendingProjects");

const budgetSummaryPie = document.getElementById("budgetSummaryPie");
const spentPercentPie = document.getElementById("spentPercentPie");
const spentPieAmount = document.getElementById("spentPieAmount");
const remainingPieAmount = document.getElementById("remainingPieAmount");
const spentPiePercent = document.getElementById("spentPiePercent");
const remainingPiePercent = document.getElementById("remainingPiePercent");

const budgetUtilizationElement =
    document.getElementById("budgetUtilization");

const projectListElement =
    document.getElementById("projectList");
const dilgFeedbackList = document.getElementById("dilgFeedbackList");
const dilgProjectsTab = document.getElementById("dilgProjectsTab");
const dilgFeedbackTab = document.getElementById("dilgFeedbackTab");
const dilgProjectsPanel = document.getElementById("dilgProjectsPanel");
const dilgFeedbackPanel = document.getElementById("dilgFeedbackPanel");
const dilgProjectsCount = document.getElementById("dilgProjectsCount");
const dilgFeedbackCount = document.getElementById("dilgFeedbackCount");
const dilgContentTabs = document.querySelector(".dilg-content-tabs");

const barangayFilter = document.getElementById("barangayFilter");
const yearFilter = document.getElementById("yearFilter");
const monthFilter = document.getElementById("monthFilter");

const messageElement =
    document.getElementById("message");

const notificationBtn = document.getElementById("notificationBtn");
const notificationDot = document.getElementById("notificationDot");
const notificationPanel = document.getElementById("notificationPanel");
const notificationList = document.getElementById("notificationList");

const logoutBtn =
    document.getElementById("logoutBtn");

const dashboardBtn =
    document.getElementById("dashboardBtn");

const barangaysBtn =
    document.getElementById("barangaysBtn");

const projectsBtn =
    document.getElementById("projectsBtn");

if (validationsOnly) {

    projectsBtn?.classList.remove("active");
    projectApprovalsBtn?.classList.add("active");
    if (dilgContentTabs) dilgContentTabs.hidden = true;
    if (dilgFeedbackPanel) dilgFeedbackPanel.hidden = true;
    if (dilgProjectsPanel) dilgProjectsPanel.hidden = false;
    dilgProjectsPanel?.removeAttribute("role");
    dilgProjectsPanel?.removeAttribute("aria-labelledby");
    dilgPageTitle && (dilgPageTitle.textContent = "Project Validation");
    dilgPageDescription && (dilgPageDescription.textContent =
        "Review submitted project records before validating or returning them for correction.");
    projectPanelLabel && (projectPanelLabel.textContent = "PROJECT MONITORING");
    projectPanelTitle && (projectPanelTitle.textContent = "Project Records for Validation");
    projectPanelDescription && (projectPanelDescription.textContent =
        "Review submitted project details and supporting documents before validation.");
}

const barangaysBtn2 =
    document.getElementById("barangaysBtn2");

const projectsBtn2 =
    document.getElementById("projectsBtn2");

const overallProgressBar =
    document.getElementById("overallProgressBar");

const barangaysBtn3 =
    document.getElementById("barangaysBtn3");

const projectsBtn3 =
    document.getElementById("projectsBtn3");

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

            const userData =
                userSnapshot.data();

            // =====================================
            // GET ROLE
            // =====================================

            const role =
                String(
                    userData.role || ""
                )
                .trim()
                .toLowerCase();

            console.log(
                "DILG USER UID:",
                user.uid
            );

            console.log(
                "DILG USER DATA:",
                userData
            );

            console.log(
                "ROLE FROM FIRESTORE:",
                role
            );

            // =====================================
            // CHECK ROLE
            // =====================================

            if (
                role !== "dilg"
            ) {

                showMessage(
                    "Not authorized. Role detected: " +
                    (
                        role ||
                        "none"
                    )
                );

                return;
            }

            // =====================================
            // LOAD DASHBOARD
            // =====================================

            await loadDashboard();

        } catch (error) {

            console.error(
                "Authentication error:",
                error
            );

            showMessage(
                "Failed to load dashboard: " +
                error.message
            );
        }
    }
);

// =====================================
// LOAD DASHBOARD
// =====================================

function setDilgContentTab(tabName) {
    const showFeedback = tabName === "feedback";
    dilgProjectsTab?.classList.toggle("active", !showFeedback);
    dilgFeedbackTab?.classList.toggle("active", showFeedback);
    dilgProjectsTab?.setAttribute("aria-selected", String(!showFeedback));
    dilgFeedbackTab?.setAttribute("aria-selected", String(showFeedback));
    if (dilgProjectsPanel) dilgProjectsPanel.hidden = showFeedback;
    if (dilgFeedbackPanel) dilgFeedbackPanel.hidden = !showFeedback;
}

dilgProjectsTab?.addEventListener("click", () => setDilgContentTab("projects"));
dilgFeedbackTab?.addEventListener("click", () => setDilgContentTab("feedback"));

function feedbackDateLabel(value) {
    const date = value?.toDate ? value.toDate() : value?.seconds ? new Date(value.seconds * 1000) : value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
        : "Date unavailable";
}

function renderDilgFeedbackTable(feedbackItems, projects) {
    if (!dilgFeedbackList) return;
    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const rows = feedbackItems.map((feedback, index) => {
        const project = projectMap.get(String(feedback.projectId || ""));
        const projectName = feedback.projectName || project?.projectName || project?.name || project?.title || "Project title unavailable";
        const barangay = feedback.barangayId || project?.barangayName || project?.barangayId || "Barangay unavailable";
        const citizen = feedback.citizenName || feedback.userName || feedback.name || "Citizen";
        const comment = feedback.feedback || feedback.comment || feedback.message || "No written comment";
        const images = Array.isArray(feedback.images) ? feedback.images : [];
        const searchable = `${barangay} ${projectName} ${citizen} ${comment}`.toLowerCase();
        return `<tr data-search="${escapeHTML(searchable)}">
            <td data-label="Barangay"><span class="feedback-barangay">${escapeHTML(barangay)}</span></td>
            <td data-label="Project"><strong>${escapeHTML(projectName)}</strong></td>
            <td data-label="Citizen">${escapeHTML(citizen)}</td>
            <td data-label="Feedback"><details class="feedback-row-details"><summary>Read feedback</summary><p>${escapeHTML(comment)}</p><div class="dilg-feedback-row-images" data-feedback-index="${index}">${images.length ? `<span>${images.length} attached image${images.length === 1 ? "" : "s"} — loading preview…</span>` : ""}</div></details></td>
            <td data-label="Submitted">${escapeHTML(feedbackDateLabel(feedback.createdAt || feedback.timestamp || feedback.date))}</td>
        </tr>`;
    }).join("");

    dilgFeedbackList.innerHTML = feedbackItems.length
        ? `<table class="dilg-feedback-table"><thead><tr><th>Barangay</th><th>Project</th><th>Citizen</th><th>Feedback</th><th>Submitted</th></tr></thead><tbody>${rows}</tbody></table>`
        : `<div class="dilg-feedback-empty"><span class="feedback-empty-icon" aria-hidden="true">✦</span><h3>No citizen feedback yet</h3><p>Feedback submitted for barangay projects will appear here.</p></div>`;

    dilgFeedbackList.querySelectorAll(".dilg-feedback-row-images").forEach((container) => {
        const feedback = feedbackItems[Number(container.dataset.feedbackIndex)];
        const images = Array.isArray(feedback?.images) ? feedback.images : [];
        if (!images.length) return;
        container.replaceChildren();
        Promise.all(images.map(async (imageData) => {
            if (!imageData?.storagePath) return null;
            try {
                const imageUrl = await getDilgDownloadUrl(imageData.storagePath, "view");
                return { imageUrl, name: imageData.name || "Citizen feedback image" };
            } catch (error) {
                console.warn("Could not load DILG feedback image:", error);
                return null;
            }
        })).then((loadedImages) => {
            loadedImages.filter(Boolean).forEach(({ imageUrl, name }) => {
                const link = document.createElement("a");
                link.href = imageUrl;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.title = name;
                const image = document.createElement("img");
                image.src = imageUrl;
                image.alt = name;
                image.loading = "lazy";
                link.append(image);
                container.append(link);
            });
            if (!container.childElementCount) container.textContent = "Image preview unavailable.";
        });
    });

    const feedbackSearch = document.getElementById("dilgFeedbackSearch");
    if (feedbackSearch && !feedbackSearch.dataset.bound) {
        feedbackSearch.dataset.bound = "true";
        feedbackSearch.addEventListener("input", () => {
            const term = feedbackSearch.value.trim().toLowerCase();
            dilgFeedbackList.querySelectorAll(".dilg-feedback-table tbody tr").forEach((row) => {
                row.hidden = !row.dataset.search.includes(term);
            });
        });
    }
}

async function loadDashboard() {

    try {

        if (projectListElement) {
            projectListElement.innerHTML = projectSkeletonMarkup();
        }

        const [
            projectsSnapshot,
            feedbackSnapshot
        ] = await Promise.all([
            getDocs(
                collection(
                    db,
                    "projects"
                )
            ),
            getDocs(
                collection(
                    db,
                    "projectFeedback"
                )
            )
        ]);

        const feedbackByProject =
            new Map();

        feedbackSnapshot.forEach(
            (feedbackDoc) => {

                const feedback =
                    feedbackDoc.data();

                const projectId =
                    String(
                        feedback.projectId ||
                        ""
                    )
                    .trim();

                if (!projectId) {

                    return;
                }

                if (
                    !feedbackByProject.has(
                        projectId
                    )
                ) {

                    feedbackByProject.set(
                        projectId,
                        []
                    );
                }

                feedbackByProject.get(
                    projectId
                )
                .push(
                    feedback
                );
            }
        );

        const projectRecords = projectsSnapshot.docs.map((projectDoc) => ({
            id: projectDoc.id,
            ...projectDoc.data()
        }));
        renderDilgFeedbackTable(feedbackSnapshot.docs.map((feedbackDoc) => ({
            id: feedbackDoc.id,
            ...feedbackDoc.data()
        })), projectRecords);
        if (dilgFeedbackCount) dilgFeedbackCount.textContent = String(feedbackSnapshot.size);

        let totalProjects = 0;
        let totalBudget = 0;
        let totalSpent = 0;
        let verifiedProjects = 0;
        let pendingProjects = 0;

        if (
            projectListElement
        ) {

            projectListElement.innerHTML =
                "";
        }

        // =====================================
        // LOOP THROUGH PROJECTS
        // =====================================

        projectsSnapshot.forEach(
            (projectDoc) => {

                const project =
                    projectDoc.data();

                if (
                    validationsOnly &&
                    String(
                        project.verificationStatus || ""
                    )
                    .trim()
                    .toLowerCase() !== "submitted"
                ) {

                    return;

                }

                totalProjects++;

                totalBudget +=
                    Number(
                        project.budget
                    ) || 0;

                totalSpent +=
                    Number(
                        project.spent
                    ) || 0;

                const verificationStatus =
                    String(project.verificationStatus || "")
                    .trim()
                    .toLowerCase();

                if (
                    verificationStatus === "validated" ||
                    verificationStatus === "verified" ||
                    verificationStatus === "approved"
                ) {

                    verifiedProjects++;

                }

                if (verificationStatus === "submitted") {

                    pendingProjects++;

                }

                displayProject(
                    projectDoc.id,
                    project,
                    feedbackByProject.get(
                        projectDoc.id
                    ) || []
                );
            }
        );

        if (dilgProjectsCount) dilgProjectsCount.textContent = String(totalProjects);

        setupDilgProjectFilters(
            projectsSnapshot.docs.map(
                (projectDoc) => projectDoc.data()
            )
        );

        renderDilgNotifications(
            projectsSnapshot.docs.map(
                (projectDoc) => ({
                    id: projectDoc.id,
                    ...projectDoc.data()
                })
            )
        );

        // =====================================
        // REMAINING
        // =====================================

        const remaining =
            totalBudget -
            totalSpent;

        // =====================================
        // UTILIZATION
        // =====================================

        const utilization =
            totalBudget > 0
                ? (
                    totalSpent /
                    totalBudget
                ) * 100
                : 0;

        // =====================================
        // UPDATE DASHBOARD
        // =====================================

        if (
            totalProjectsElement
        ) {

            totalProjectsElement.textContent =
                totalProjects;
        }

        if (
            totalBudgetElement
        ) {

            totalBudgetElement.textContent =
                formatCurrency(
                    totalBudget
                );
        }

        if (verifiedProjectsElement) {

            verifiedProjectsElement.textContent =
                verifiedProjects;
        }

        if (pendingProjectsElement) {

            pendingProjectsElement.textContent =
                pendingProjects;
        }

        const safeUtilization = Math.min(Math.max(utilization, 0), 100);
        const remainingPercent = 100 - safeUtilization;

        budgetSummaryPie?.style.setProperty(
            "--spent-percent",
            `${safeUtilization}%`
        );

        if (spentPercentPie) spentPercentPie.textContent = `${safeUtilization.toFixed(1)}%`;
        if (spentPieAmount) spentPieAmount.textContent = formatCurrency(totalSpent);
        if (remainingPieAmount) remainingPieAmount.textContent = formatCurrency(remaining);
        if (spentPiePercent) spentPiePercent.textContent = `${safeUtilization.toFixed(1)}% of total budget`;
        if (remainingPiePercent) remainingPiePercent.textContent = `${remainingPercent.toFixed(1)}% available`;

        if (
            budgetUtilizationElement
        ) {

            budgetUtilizationElement.textContent =
                utilization.toFixed(2) +
                "%";
        }

        if (
            overallProgressBar
        ) {

            overallProgressBar.style.width =
                `${Math.min(
                    Math.max(
                        utilization,
                        0
                    ),
                    100
                )}%`;
        }

        // =====================================
        // EMPTY PROJECTS
        // =====================================

        if (
            totalProjects === 0 &&
            projectListElement
        ) {

            projectListElement.innerHTML = `

                <div class="empty-projects">

                    No projects found.

                </div>

            `;
        }

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

        showMessage(
            "Failed to load projects: " +
            error.message
        );
    }
}

function renderDilgNotifications(projects) {

    if (!notificationList) return;

    const submitted = projects.filter((project) =>
        String(project.verificationStatus || "").toLowerCase() === "submitted"
    );

    notificationDot?.classList.toggle("hidden", submitted.length === 0);
    notificationList.innerHTML = submitted.length
        ? submitted.map((project) => `
            <button type="button" class="notification-item" data-validation-project-id="${escapeHTML(project.id || "")}" aria-label="Open Project Validation">
                <strong>New project update for validation</strong>
                <span>${escapeHTML(project.projectName || project.name || "Untitled Project")} — ${escapeHTML(project.barangayId || "Barangay")}</span>
            </button>
        `).join("")
        : '<div class="notification-empty">No project updates waiting for validation.</div>';
}


notificationList?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-validation-project-id]")) return;

    window.location.href = "dilg-projects.html?validation=true";
});


notificationBtn?.addEventListener("click", () => {
    if (notificationPanel) {
        notificationPanel.hidden = !notificationPanel.hidden;
        notificationPanel.classList.toggle(
            "open",
            !notificationPanel.hidden
        );
        notificationBtn.classList.toggle(
            "active",
            !notificationPanel.hidden
        );
    }
    notificationDot?.classList.add("hidden");
});


function setupDilgProjectFilters(projects) {

    if (!barangayFilter || !yearFilter || !monthFilter) return;

    const barangays = [...barangayDirectory]
        .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true, sensitivity: "base" }));
    const years = [...new Set(projects.map((project) => String(project.startDate || project.targetDate || "").slice(0, 4)).filter(Boolean))].sort().reverse();

    barangayFilter.innerHTML = '<option value="">All barangays</option>' + barangays.map((barangay) => `<option value="${escapeHTML(barangay.id)}">${escapeHTML(barangay.name)}</option>`).join("");
    yearFilter.innerHTML = '<option value="">All years</option>' + years.map((year) => `<option value="${year}">${year}</option>`).join("");
    monthFilter.innerHTML = '<option value="">All months</option>' + Array.from({ length: 12 }, (_, index) => `<option value="${String(index + 1).padStart(2, "0")}">${new Date(2000, index).toLocaleString("en", { month: "long" })}</option>`).join("");

    const applyFilters = () => {
        document.querySelectorAll("#projectList .project-card").forEach((card) => {
            const date = card.dataset.startDate || "";
            const matchesBarangay = !barangayFilter.value || card.dataset.barangayId === barangayFilter.value;
            const matchesYear = !yearFilter.value || date.slice(0, 4) === yearFilter.value;
            const matchesMonth = !monthFilter.value || date.slice(5, 7) === monthFilter.value;
            card.style.display = matchesBarangay && matchesYear && matchesMonth ? "" : "none";
        });
    };

    barangayFilter.onchange = applyFilters;
    yearFilter.onchange = applyFilters;
    monthFilter.onchange = applyFilters;
}


// =====================================
// DISPLAY PROJECT
// =====================================

function displayProject(
    projectId,
    project,
    feedbackItems = []
) {

    if (
        !projectListElement
    ) {

        return;
    }

    const card =
        document.createElement(
            "div"
        );

    card.className =
        "project-card";

    card.dataset.barangayId =
        project.barangayId ||
        "";

    card.dataset.startDate =
        project.startDate ||
        project.targetDate ||
        "";

    // =====================================
    // FINANCIAL DATA
    // =====================================

    const budget =
        Number(
            project.budget
        ) || 0;

    const spent =
        Number(
            project.spent
        ) || 0;

    const remaining =
        budget -
        spent;

    const utilization =
        budget > 0
            ? (
                spent /
                budget
            ) * 100
            : 0;

    // =====================================
    // PROJECT DATA
    // =====================================

    const status =
        project.status ||
        "Unknown";

    const projectName =
        project.projectName ||
        project.name ||
        project.title ||
        "Untitled Project";

    const description =
        project.description ||
        "No description";

    const lastUpdated = formatProjectLastUpdated(project);

    const barangayId =
        project.barangayId ||
        "No barangay ID";

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

    let verificationLabel =
        "Draft";

    let verificationClass =
        "verification-draft";

    if (
        verificationLower ===
        "submitted"
    ) {

        verificationLabel =
            "Submitted for Validation";

        verificationClass =
            "verification-pending";
    }

    if (
        verificationLower ===
            "validated" ||
        verificationLower ===
            "verified" ||
        verificationLower ===
            "approved"
    ) {

        verificationLabel =
            "Validated";

        verificationClass =
            "verification-verified";
    }

    if (
        verificationLower ===
        "returned"
    ) {

        verificationLabel =
            "Returned for Correction";

        verificationClass =
            "verification-returned";
    }

    // =====================================
    // RETURN REASON
    // =====================================

    const returnReason =
        String(
            project.returnReason ||
            ""
        )
        .trim();

    const monitoringState =
        getMonitoringState(
            project,
            verificationLower
        );

    const documents =
        Array.isArray(
            project.documents
        )
            ? project.documents.filter(
                (document) =>
                    document &&
                    (
                        document.url ||
                        document.storagePath
                    )
            )
            : [];

    const citizenFeedbackMarkup =
        feedbackItems.length > 0
            ? feedbackItems.map(
                (feedback, index) => `

                    <div class="dilg-feedback-item">
                        <div class="dilg-feedback-meta">
                            <strong>${escapeHTML(
                                feedback.citizenName ||
                                "Citizen"
                            )}</strong>
                            <span>Barangay: ${escapeHTML(
                                feedback.barangayId ||
                                barangayId
                            )}</span>
                        </div>
                        <p>${escapeHTML(
                            feedback.feedback ||
                            "No feedback message"
                        )}</p>
                        <div class="dilg-feedback-images" data-feedback-index="${index}"></div>
                    </div>

                `
            ).join("")
            : `

                <p class="dilg-no-feedback">
                    No citizen feedback for this project yet.
                </p>

            `;

    // =====================================
    // CARD HTML
    // =====================================

    card.innerHTML = `

        <div class="project-card-header">

            <div>

                <h3>

                    ${escapeHTML(
                        projectName
                    )}

                </h3>

                <p>

                    ${escapeHTML(
                        description
                    )}

                </p>

                <div class="project-last-updated">◷ Last updated: ${escapeHTML(lastUpdated)}</div>

            </div>

            <div class="status-container">

                <span class="status">

                    ${escapeHTML(
                        status
                    )}

                </span>

                <span
                    class="
                        verification-badge
                        ${verificationClass}
                    "
                >

                    ${escapeHTML(
                        verificationLabel
                    )}

                </span>

                <span class="monitoring-badge ${monitoringState.className}">

                    ${escapeHTML(
                        monitoringState.label
                    )}

                </span>

            </div>

        </div>


        ${
            verificationLower ===
            "returned"

                ? `

                    <div
                        class="dilg-return-reason"
                        style="
                            margin: 15px 0;
                            padding: 15px;
                            border-left: 5px solid #dc2626;
                            border-radius: 8px;
                            background: #fef2f2;
                            color: #7f1d1d;
                        "
                    >

                        <strong>

                            Return Reason

                        </strong>

                        <p
                            style="
                                margin: 8px 0 0 0;
                            "
                        >

                            ${escapeHTML(
                                returnReason ||
                                "No reason was provided."
                            )}

                        </p>

                    </div>

                `

                : ""
        }


        ${
            documents.length > 0

                ? `

                    <div class="project-documents">

                        <div class="documents-title">
                            ▤ Supporting Documents
                        </div>

                        ${
                            documents.map(
                                (document) => `

                                    <div class="document-row">
                                        <div>
                                            <strong>
                                                ${escapeHTML(
                                                    document.name ||
                                                    "Project document"
                                                )}
                                            </strong>
                                            <span>
                                                ${
                                                    document.size
                                                        ? formatFileSize(
                                                            document.size
                                                        )
                                                        : escapeHTML(
                                                            document.type ||
                                                            "Document link"
                                                        )
                                                }
                                            </span>
                                        </div>
                                        <div class="document-actions">
                                        <button
                                            type="button"
                                            class="export-document-btn"
                                            data-action="view"
                                            data-document-url="${escapeHTML(
                                                document.url ||
                                                ""
                                            )}"
                                            data-document-path="${escapeHTML(
                                                document.storagePath ||
                                                ""
                                            )}"
                                            data-document-name="${escapeHTML(
                                                document.name ||
                                                "project-document"
                                            )}"
                                        >
                                            Open
                                        </button>
                                        <button type="button" class="export-document-btn" data-action="download" data-document-url="${escapeHTML(document.url || "")}" data-document-path="${escapeHTML(document.storagePath || "")}" data-document-name="${escapeHTML(document.name || "project-document")}">Download</button>
                                        </div>
                                    </div>

                                `
                            ).join("")
                        }

                    </div>

                `

                : `

                    <div class="no-documents">
                        No supporting document was uploaded.
                    </div>

                `
        }


        <div class="project-info">

            <div>
                <span>Fund Source</span>
                <strong>${escapeHTML(project.fundSource === "Other" && project.fundSourceOther ? `Other: ${project.fundSourceOther}` : project.fundSource || "Not specified")}</strong>
            </div>

            <div>

                <span>
                    ⌂ Barangay
                </span>

                <strong>

                    ${escapeHTML(
                        barangayId
                    )}

                </strong>

            </div>


            <div>

                <span>
                    ₱ Budget
                </span>

                <strong>

                    ${formatCurrency(
                        budget
                    )}

                </strong>

            </div>


            <div>

                <span>
                    ↗ Utilization
                </span>

                <strong>

                    ${utilization.toFixed(1) + "%"}

                </strong>

            </div>


            <div>

                <span>
                    ◈ Balance
                </span>

                <strong>

                    ${formatCurrency(
                        remaining
                    )}

                </strong>

            </div>

        </div>


        <div class="project-utilization">

            <div class="utilization-header">

                <span>
                    Budget Utilization
                </span>

                <strong>

                    ${utilization.toFixed(2)}%

                </strong>

            </div>


            <div class="progress">

                <div
                    class="progress-bar"
                    style="
                        width:
                        ${Math.min(
                            Math.max(
                                utilization,
                                0
                            ),
                            100
                        )}%
                    "
                ></div>

            </div>

        </div>


        <div class="dilg-project-feedback">

            <div class="documents-title">
                ☷ Citizen Feedback
            </div>

            ${citizenFeedbackMarkup}

        </div>


        <div class="project-actions">

            <button
                type="button"
                class="view-project-btn"
            >

                View

            </button>


            ${
                verificationLower ===
                "submitted"

                    ? `

                        <button
                            type="button"
                            class="verify-project-btn"
                        >

                            ✓ Validate

                        </button>


                        <button
                            type="button"
                            class="return-project-btn"
                        >

                            ↩ Return to Barangay

                        </button>

                    `

                    : ""
            }

        </div>

    `;

    projectListElement.appendChild(
        card
    );
    void loadDilgFeedbackImages(card, feedbackItems);

    // =====================================
    // VIEW
    // =====================================

    const viewButton =
        card.querySelector(
            ".view-project-btn"
        );

    if (
        viewButton
    ) {

        viewButton.addEventListener(
            "click",
            () => {

                window.location.href =
                    `project-details.html?id=${encodeURIComponent(projectId)}&source=dilg`;

            }
        );
    }

    card.querySelectorAll(
        ".export-document-btn"
    ).forEach(
        (exportButton) => {

            exportButton.addEventListener(
                "click",
                async () => {

                    await exportDocument(
                        exportButton.dataset.documentUrl,
                        exportButton.dataset.documentName,
                        exportButton,
                        exportButton.dataset.documentPath,
                        exportButton.dataset.action
                    );

                }
            );

        }
    );

    // =====================================
    // VERIFY
    // =====================================

    const verifyButton =
        card.querySelector(
            ".verify-project-btn"
        );

    if (
        verifyButton
    ) {

        verifyButton.textContent =
            "✓ Validate";

        verifyButton.addEventListener(
            "click",
            async () => {

                await validateProject(
                    projectId,
                    verifyButton
                );

            }
        );
    }

    // =====================================
    // RETURN
    // =====================================

    const returnButton =
        card.querySelector(
            ".return-project-btn"
        );

    if (
        returnButton
    ) {

        returnButton.addEventListener(
            "click",
            async () => {

                await returnProject(
                    projectId,
                    returnButton
                );

            }
        );
    }
}

async function loadDilgFeedbackImages(card, feedbackItems) {
    const imageContainers = card.querySelectorAll(".dilg-feedback-images");
    await Promise.all(Array.from(imageContainers, async (container) => {
        const feedback = feedbackItems[Number(container.dataset.feedbackIndex)];
        const images = Array.isArray(feedback?.images) ? feedback.images : [];
        for (const imageData of images) {
            if (!imageData?.storagePath) continue;
            try {
                const imageUrl = await getDilgDownloadUrl(imageData.storagePath, "view");
                const link = document.createElement("a");
                link.href = imageUrl;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.title = imageData.name || "Open feedback image";
                const image = document.createElement("img");
                image.src = imageUrl;
                image.alt = imageData.name || "Citizen feedback image";
                image.loading = "lazy";
                link.append(image);
                container.append(link);
            } catch (error) {
                console.warn("Could not load DILG feedback image:", error);
            }
        }
    }));
}

// =====================================
// VERIFY PROJECT
// =====================================

async function validateProject(
    projectId,
    button
) {

    const confirmation =
        await confirmAction(
            "Validate Project Update",
            "This will mark the submitted project update as validated.",
            "Validate"
        );

    if (
        !confirmation
    ) {

        return;
    }

    try {

        button.disabled =
            true;

        button.textContent =
            "Validating...";

        const currentUser =
            auth.currentUser;

        if (
            !currentUser
        ) {

            throw new Error(
                "You are not logged in."
            );
        }

        await updateDoc(
            doc(
                db,
                "projects",
                projectId
            ),
            {

                verificationStatus:
                    "Validated",

                validatedBy:
                    currentUser.uid,

                validatedAt:
                    serverTimestamp(),

                // Clear old return reason
                returnReason:
                    ""

            }
        );

        alert(
            "Project update validated successfully."
        );

        await loadDashboard();

    } catch (error) {

        console.error(
            "Validation error:",
            error
        );

        alert(
            "Failed to validate project update.\n\n" +
            error.message
        );

        button.disabled =
            false;

        button.textContent =
            "✓ Validate";
    }
}

// =====================================
// RETURN PROJECT
// =====================================

async function returnProject(
    projectId,
    button
) {

    const reason =
        await requestText(
            "Return for Correction",
            "Enter the DILG remarks for returning this project update to the barangay."
        );

    if (
        reason === null
    ) {

        return;
    }

    const trimmedReason =
        reason.trim();

    if (
        !trimmedReason
    ) {

        alert(
            "Please enter a reason."
        );

        return;
    }

    try {

        button.disabled =
            true;

        button.textContent =
            "Returning...";

        const currentUser =
            auth.currentUser;

        if (
            !currentUser
        ) {

            throw new Error(
                "You are not logged in."
            );
        }

        await updateDoc(
            doc(
                db,
                "projects",
                projectId
            ),
            {

                verificationStatus:
                    "Returned",

                returnedBy:
                    currentUser.uid,

                returnedAt:
                    serverTimestamp(),

                returnReason:
                    trimmedReason

            }
        );

        alert(
            "Project update returned for correction."
        );

        await loadDashboard();

    } catch (error) {

        console.error(
            "Return error:",
            error
        );

        alert(
            "Failed to return project.\n\n" +
            error.message
        );

        button.disabled =
            false;

        button.textContent =
            "↩ Return to Barangay";
    }
}

// =====================================
// FORMAT CURRENCY
// =====================================

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
// MESSAGE
// =====================================

function showMessage(
    text
) {

    if (
        messageElement
    ) {

        messageElement.textContent =
            text;

        messageElement.style.color =
            "#b91c1c";

        return;
    }

    console.error(
        text
    );
}

// =====================================
// DASHBOARD BUTTON
// =====================================

if (
    dashboardBtn
) {

    dashboardBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "dilg-dashboard.html";

        }
    );
}

// =====================================
// BARANGAYS BUTTON
// =====================================

if (
    barangaysBtn
) {

    barangaysBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "barangays.html";

        }
    );
}

// =====================================
// PROJECTS BUTTON
// =====================================

if (
    projectsBtn
) {

    projectsBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "dilg-projects.html";

        }
    );
}

// =====================================
// LOGOUT
// =====================================

if (
    logoutBtn
) {

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

function getMonitoringState(
    project,
    verificationStatus
) {

    const projectStatus = String(
        project.status || ""
    ).trim().toLowerCase();

    const budget = Number(project.budget) || 0;
    const spent = Number(project.spent) || 0;
    const targetDate = project.targetDate
        ? new Date(`${project.targetDate}T23:59:59`)
        : null;

    if (verificationStatus === "submitted") {
        return { label: "For Validation", className: "monitoring-validation" };
    }

    if (verificationStatus === "returned") {
        return { label: "Returned", className: "monitoring-returned" };
    }

    if (projectStatus === "completed") {
        return { label: "Completed", className: "monitoring-completed" };
    }

    if (budget > 0 && spent > budget) {
        return { label: "Over Budget", className: "monitoring-risk" };
    }

    if (targetDate && !Number.isNaN(targetDate.getTime()) && targetDate < new Date()) {
        return { label: "Delayed", className: "monitoring-risk" };
    }

    return { label: "On Track", className: "monitoring-on-track" };
}

function formatFileSize(
    bytes
) {

    const value =
        Number(bytes) ||
        0;

    if (
        value < 1024 * 1024
    ) {

        return `${Math.max(
            1,
            Math.round(value / 1024)
        )} KB`;
    }

    return `${(
        value / (1024 * 1024)
    ).toFixed(1)} MB`;
}

async function exportDocument(
    url,
    fileName,
    button,
    storagePath,
    action = "view"
) {

    if (
        !url &&
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

    try {

        button.disabled =
            true;

        button.textContent = action === "view" ? "Opening..." : "Downloading...";

        if (
            storagePath
        ) {

            url =
                await getDilgDownloadUrl(
                    storagePath,
                    action
                );
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
            "Document export error:",
            error
        );

        previewWindow?.close();
        alert(error.message || "Unable to access the document.");

    } finally {

        button.disabled =
            false;

        button.textContent =
            originalText;
    }
}

async function getDilgDownloadUrl(
    storagePath,
    action = "view"
) {

    const currentUser =
        auth.currentUser;

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
// QUICK ACTIONS
// =====================================

if (
    barangaysBtn2
) {

    barangaysBtn2.addEventListener(
        "click",
        () => {

            window.location.href =
                "barangays.html";

        }
    );
}

if (
    projectsBtn2
) {

    projectsBtn2.addEventListener(
        "click",
        () => {

            window.location.href =
                "dilg-projects.html";

        }
    );
}

if (
    barangaysBtn3
) {

    barangaysBtn3.addEventListener(
        "click",
        () => {

            window.location.href =
                "barangays.html";

        }
    );
}

if (
    projectsBtn3
) {

    projectsBtn3.addEventListener(
        "click",
        () => {

            window.location.href =
                "dilg-projects.html";

        }
    );
}
