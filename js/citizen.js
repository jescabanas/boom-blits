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
    addDoc,
    serverTimestamp
} from "firebase/firestore";

import { app } from "./firebase-config.js";
import { supabaseUrl, supabasePublishableKey } from "./supabase-config.js";


const auth = getAuth(app);
const db = getFirestore(app);


// =====================================
// HTML ELEMENTS
// =====================================

const citizenTitle =
    document.getElementById("citizenTitle");

const welcome =
    document.getElementById("welcome");

const citizenName =
    document.getElementById("citizenName");

const barangayName =
    document.getElementById("barangayName");

const totalProjects =
    document.getElementById("totalProjects");

const totalSpent =
    document.getElementById("totalSpent");

const ongoingProjects =
    document.getElementById("ongoingProjects");

const completedProjects =
    document.getElementById("completedProjects");

const projectStatusChart =
    document.getElementById("projectStatusChart");

const chartProjectTotal =
    document.getElementById("chartProjectTotal");

const projectsList =
    document.getElementById("projectsList");

const yearFilter =
    document.getElementById("yearFilter");

const monthFilter =
    document.getElementById("monthFilter");

const projectDescription =
    document.getElementById("projectDescription");

const dashboardBarangayName =
    document.getElementById("dashboardBarangayName");

const projectsPageHeading =
    document.getElementById("projectsPageHeading");

const logoutBtn =
    document.getElementById("logoutBtn");

const dashboardBtn =
    document.getElementById("dashboardBtn");

const projectsBtn =
    document.getElementById("projectsBtn");

const message =
    document.getElementById("message");


// =====================================
// DETAILS ELEMENTS
// =====================================

const projectDetailsPanel =
    document.getElementById(
        "projectDetailsPanel"
    );

const detailsProjectName =
    document.getElementById(
        "detailsProjectName"
    );

const projectDetails =
    document.getElementById(
        "projectDetails"
    );

const closeDetailsBtn =
    document.getElementById(
        "closeDetailsBtn"
    );


// =====================================
// FEEDBACK ELEMENTS
// =====================================

const feedbackForm =
    document.getElementById(
        "feedbackForm"
    );

const feedbackProjectId =
    document.getElementById(
        "feedbackProjectId"
    );

const feedbackText =
    document.getElementById(
        "feedbackText"
    );

const feedbackSubmitBtn =
    document.getElementById(
        "feedbackSubmitBtn"
    );

const feedbackMessage =
    document.getElementById(
        "feedbackMessage"
    );
const feedbackImagesInput = document.getElementById("feedbackImages");
const feedbackImagePreview = document.getElementById("feedbackImagePreview");
let selectedFeedbackImages = [];


// =====================================
// CURRENT USER
// =====================================

let currentUserData = null;

let currentUser = null;

let currentBarangayId = null;

const isCitizenDetailsPage =
    document.body.classList.contains("citizen-project-details-page");

// =====================================
// CHECK AUTH
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

                await signOut(auth);

                window.location.href =
                    "login.html";

                return;
            }


            currentUserData =
                userSnapshot.data();


            // =====================================
            // ROLE
            // =====================================

            const role =
                String(
                    currentUserData.role || ""
                )
                .trim()
                .toLowerCase();


            // =====================================
            // STATUS
            // =====================================

            const status =
                String(
                    currentUserData.status || ""
                )
                .trim()
                .toLowerCase();


            if (
                role !== "citizen"
            ) {

                await signOut(auth);

                window.location.href =
                    "login.html";

                return;
            }


            if (
                status !== "approved"
            ) {

                await signOut(auth);

                window.location.href =
                    "login.html";

                return;
            }


            // =====================================
            // BARANGAY
            // =====================================

            currentBarangayId =
                String(
                    currentUserData.barangayId || ""
                )
                .trim();


            if (!currentBarangayId) {

                showMessage(
                    "Your account has no assigned barangay.",
                    "error"
                );

                return;
            }


            // =====================================
            // CITIZEN NAME
            // =====================================

            const name =
                currentUserData.name ||
                (
                    currentUserData.firstName &&
                    currentUserData.surname
                        ? `${currentUserData.firstName} ${currentUserData.surname}`
                        : currentUserData.firstName
                ) ||
                "Citizen";


            if (welcome) {

                welcome.textContent =
                    `Welcome, ${name}. Official project information for your community.`;

            }


            if (citizenName) {

                citizenName.textContent =
                    name;

            }


            if (barangayName) {

                barangayName.textContent =
                    currentBarangayId;

            }


            if (citizenTitle) {

                citizenTitle.textContent =
                    isCitizenDetailsPage
                        ? "Project Details"
                        : projectsList
                        ? `${formatBarangayName(currentBarangayId)} Projects`
                        : "Citizen Dashboard";

            }


            if (projectDescription) {

                projectDescription.textContent =
                    `Projects submitted by ${formatBarangayName(currentBarangayId)}.`;

            }

            if (dashboardBarangayName) {

                dashboardBarangayName.textContent =
                    formatBarangayName(currentBarangayId);

            }

            if (projectsPageHeading) {
                projectsPageHeading.textContent =
                    `${formatBarangayName(currentBarangayId)} Projects`;
            }

            // =====================================
            // LOAD PROJECTS
            // =====================================

            if (isCitizenDetailsPage) {

                const projectId = new URLSearchParams(
                    window.location.search
                ).get("projectId");

                if (projectId) {
                    await openProjectDetails(projectId);
                } else {
                    showMessage("No project was selected.", "error");
                }

            } else if (projectsList && !document.body.classList.contains("citizen-summary-page")) {
                await loadCitizenProjects();
            } else {
                await loadCitizenSummary();
            }


        } catch (error) {

            console.error(
                "Citizen dashboard error:",
                error
            );


            showMessage(
                "Failed to load citizen dashboard: " +
                error.message,
                "error"
            );

        }

    }
);


// =====================================
// LOAD PROJECTS
// =====================================

async function loadCitizenSummary() {

    try {
        const projectsQuery = query(
            collection(db, "projects"),
            where("barangayId", "==", currentBarangayId)
        );

        const snapshot = await getDocs(projectsQuery);
        const projects = snapshot.docs
            .map((projectDoc) => projectDoc.data());

        updateProjectSummary(projects);
        renderProjectStatusChart(projects);

    } catch (error) {
        console.error("Citizen summary error:", error);
        showMessage("Failed to load project summary: " + error.message, "error");
    }
}

async function loadCitizenProjects() {

    if (!projectsList) {

        return;
    }


    try {

        projectsList.innerHTML = `

            ${projectSkeletonMarkup()}

        `;


        const projectsQuery =
            query(
                collection(
                    db,
                    "projects"
                ),

                where(
                    "barangayId",
                    "==",
                    currentBarangayId
                )
            );


        const snapshot =
            await getDocs(
                projectsQuery
            );


        projectsList.innerHTML = `
            <div class="citizen-project-table-wrap">
                <table class="citizen-project-table">
                    <thead><tr>
                        <th>#</th><th>Project</th><th>Project Spending</th><th>Status</th><th>Schedule</th><th>Last Updated</th><th>Actions</th>
                    </tr></thead>
                    <tbody id="citizenProjectTableBody"></tbody>
                </table>
            </div>
        `;
        const projectTableBody = document.getElementById("citizenProjectTableBody");


        let projectCount = 0;

        let spentTotal = 0;


        snapshot.forEach(
            (projectDoc) => {

                const project =
                    projectDoc.data();

                projectCount++;


                const spent =
                    Number(
                        project.spent
                    ) || 0;


                spentTotal +=
                    spent;


                const projectName =
                    project.projectName ||
                    project.name ||
                    project.title ||
                    "Unnamed Project";


                const description =
                    project.description ||
                    "No description available.";


                const status =
                    project.status ||
                    project.verificationStatus ||
                    "No status";

                const schedule =
                    getProjectSchedule(
                        status,
                        project.startDate,
                        project.targetDate
                    );


                // =====================================
                const lastUpdated = formatProjectLastUpdated(project);
                const tableRow = document.createElement("tr");
        tableRow.className = "citizen-project-row";
                tableRow.dataset.startDate = project.startDate || project.targetDate || "";
                tableRow.innerHTML = `
                    <td>${projectCount}</td>
                    <td class="citizen-project-title"><strong>${escapeHTML(projectName)}</strong><span>${escapeHTML(description)}</span></td>
                    <td class="citizen-project-money">${formatCurrency(spent)}</td>
                    <td><span class="citizen-project-status">${escapeHTML(status)}</span></td>
                    <td class="citizen-project-schedule"><span>${escapeHTML(schedule.label)}</span><strong>${escapeHTML(schedule.date)}</strong></td>
                    <td>${escapeHTML(lastUpdated)}</td>
                    <td><button class="feedback-btn view-details-btn" type="button" data-project-id="${escapeHTML(projectDoc.id)}">View</button></td>
                `;
                projectTableBody.appendChild(tableRow);

            }
        );


        // =====================================
        // STATS
        // =====================================

        if (totalProjects) {

            totalProjects.textContent =
                projectCount;

        }


        if (totalSpent) {

            totalSpent.textContent =
                formatCurrency(
                    spentTotal
                );

        }

        const visibleProjects = snapshot.docs
            .map((projectDoc) => projectDoc.data());

        updateProjectSummary(visibleProjects);

        setupProjectDateFilters(visibleProjects);

        renderProjectStatusChart(visibleProjects);


        // =====================================
        // EMPTY
        // =====================================

        if (
            projectCount === 0
        ) {

            projectsList.innerHTML = `

                <div class="empty">

                    No projects have been posted
                    by your barangay yet.

                </div>

            `;

            return;
        }


        // =====================================
        // DETAILS BUTTONS
        // =====================================

        const detailButtons =
            document.querySelectorAll(
                ".view-details-btn"
            );


        detailButtons.forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    async () => {

                        const projectId =
                            button.dataset.projectId;


                        window.location.href =
                            `citizen-project-details.html?projectId=${encodeURIComponent(projectId)}`;

                    }
                );

            }
        );


    } catch (error) {

        console.error(
            "Project loading error:",
            error
        );


        projectsList.innerHTML = `

            <div class="empty">

                Failed to load projects.

                <br><br>

                ${escapeHTML(
                    error.message
                )}

            </div>

        `;

    }

}


// =====================================
// OPEN PROJECT DETAILS
// =====================================

async function openProjectDetails(
    projectId
) {

    if (
        !currentBarangayId
    ) {

        return;
    }


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

            return;
        }


        const project =
            projectSnapshot.data();


        // =====================================
        // SECURITY CHECK
        // =====================================

        if (
            normalizeBarangayId(project.barangayId) !==
            normalizeBarangayId(currentBarangayId)
        ) {

            showMessage(
                "You are not allowed to view this project.",
                "error"
            );

            return;
        }


        const projectName =
            project.projectName ||
            project.name ||
            project.title ||
            "Unnamed Project";


        const description =
            project.description ||
            "No description available.";


        const spent =
            Number(
                project.spent
            ) || 0;


        const status =
            project.status ||
            project.verificationStatus ||
            "No status";
        const fundSourceLabel = project.fundSource === "Other" && project.fundSourceOther
            ? `Other: ${project.fundSourceOther}`
            : (project.fundSource || "Not specified");

        const schedule =
            getProjectSchedule(
                status,
                project.startDate,
                project.targetDate
            );


        if (detailsProjectName) {

            detailsProjectName.textContent =
                projectName;

        }


        if (projectDetails) {

            projectDetails.innerHTML = `

                <div class="detail-description">

                    <span class="detail-label">Project Description</span>

                    <p>${escapeHTML(description)}</p>

                </div>


                <div class="details-grid">


                    <div class="detail-item">

                        <span>Fund Source</span>

                        <strong>${escapeHTML(fundSourceLabel)}</strong>

                    </div>

                    <div class="detail-item">

                        <span>
                            Barangay
                        </span>

                        <strong>
                            ${escapeHTML(
                                formatBarangayName(currentBarangayId)
                            )}
                        </strong>

                    </div>


                    <div class="detail-item">

                        <span>
                                ₱ Project Spending
                        </span>

                        <strong>
                            ${formatCurrency(
                                spent
                            )}
                        </strong>

                    </div>


                    <div class="detail-item">

                        <span>
                            ${escapeHTML(schedule.label)}
                        </span>

                        <strong>
                            ${escapeHTML(schedule.date)}
                        </strong>

                    </div>


                    <div class="detail-item">

                        <span>
                            Current Status
                        </span>

                        <strong class="detail-status-value">
                            ${escapeHTML(status)}
                        </strong>

                    </div>

                </div>

            `;

        }


        if (feedbackProjectId) {

            feedbackProjectId.value =
                projectId;

        }


        if (feedbackMessage) {

            feedbackMessage.textContent =
                "";

        }


        if (feedbackText) {

            feedbackText.value =
                "";

        }


        if (projectDetailsPanel) {

            projectDetailsPanel.style.display =
                "block";


            if (!isCitizenDetailsPage) {
                projectDetailsPanel.scrollIntoView({
                    behavior: "smooth"
                });
            }

        }


    } catch (error) {

        console.error(
            "Details error:",
            error
        );


        showMessage(
            "Failed to load project details: " +
            error.message,
            "error"
        );

    }

}


// =====================================
// SUBMIT FEEDBACK
// =====================================

feedbackImagesInput?.addEventListener("change", () => {
    const newFiles = Array.from(feedbackImagesInput.files || []);
    if (selectedFeedbackImages.length + newFiles.length > 5) {
        showFeedbackMessage("You can attach up to 5 images.", "error");
        feedbackImagesInput.value = "";
        return;
    }
    const invalidFile = newFiles.find((file) => !isAllowedFeedbackImage(file));
    if (invalidFile) {
        showFeedbackMessage("Please choose JPG, PNG, or WEBP images only.", "error");
        feedbackImagesInput.value = "";
        return;
    }
    if (newFiles.some((file) => file.size > 10 * 1024 * 1024)) {
        showFeedbackMessage("Each image must not exceed 10 MB.", "error");
        feedbackImagesInput.value = "";
        return;
    }
    selectedFeedbackImages.push(...newFiles);
    feedbackImagesInput.value = "";
    renderFeedbackImagePreview();
});

function isAllowedFeedbackImage(file) {
    return ["jpg", "jpeg", "png", "webp"].includes(file.name.split(".").pop()?.toLowerCase());
}

function renderFeedbackImagePreview() {
    if (!feedbackImagePreview) return;
    feedbackImagePreview.querySelectorAll("img[data-preview-url]").forEach((image) => URL.revokeObjectURL(image.dataset.previewUrl));
    feedbackImagePreview.replaceChildren();
    selectedFeedbackImages.forEach((file, index) => {
        const item = document.createElement("div");
        item.className = "feedback-image-item";
        const image = document.createElement("img");
        image.src = URL.createObjectURL(file);
        image.dataset.previewUrl = image.src;
        image.alt = file.name;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "feedback-image-remove";
        remove.textContent = "\u00d7";
        remove.setAttribute("aria-label", `Remove ${file.name}`);
        remove.addEventListener("click", () => {
            selectedFeedbackImages.splice(index, 1);
            renderFeedbackImagePreview();
        });
        item.append(image, remove);
        feedbackImagePreview.append(item);
    });
}

if (feedbackForm) {

    feedbackForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (
                !currentUser ||
                !currentUserData
            ) {

                return;
            }


            const projectId =
                feedbackProjectId.value.trim();


            const feedback =
                feedbackText.value.trim();


            if (
                !projectId ||
                !feedback
            ) {

                showFeedbackMessage(
                    "Please enter your feedback.",
                    "error"
                );

                return;
            }


            if (
                feedback.length < 5
            ) {

                showFeedbackMessage(
                    "Please write at least 5 characters.",
                    "error"
                );

                return;
            }


            if (feedbackSubmitBtn) {

                feedbackSubmitBtn.disabled =
                    true;

                feedbackSubmitBtn.textContent =
                    "Submitting...";

            }


            try {

                // =====================================
                // VERIFY PROJECT
                // =====================================

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

                    showFeedbackMessage(
                        "Project not found.",
                        "error"
                    );

                    return;
                }


                const project =
                    projectSnapshot.data();


                // =====================================
                // BARANGAY SECURITY CHECK
                // =====================================

        const projectBarangayId = normalizeBarangayId(
            project.barangayId
        );

        const citizenBarangayId = normalizeBarangayId(
            currentBarangayId
        );

        const projectBarangayName = normalizeBarangayId(
            project.barangayName
        );

        if (
            projectBarangayId !== citizenBarangayId &&
            projectBarangayName !== citizenBarangayId
        ) {

                    showFeedbackMessage(
                        "You cannot submit feedback for this project.",
                        "error"
                    );

                    return;
                }


                // =====================================
                // GET CITIZEN NAME
                // =====================================

                const citizenName =
                    currentUserData.name ||
                    (
                        currentUserData.firstName &&
                        currentUserData.surname
                            ? `${currentUserData.firstName} ${currentUserData.surname}`
                            : currentUserData.firstName
                    ) ||
                    "Citizen";

                let uploadedFeedbackImages = [];
                if (selectedFeedbackImages.length) {
                    if (feedbackSubmitBtn) feedbackSubmitBtn.textContent = "Uploading images...";
                    uploadedFeedbackImages = await uploadFeedbackImages(projectId, selectedFeedbackImages);
                }


                // =====================================
                // SAVE FEEDBACK
                // =====================================

                await addDoc(
                    collection(
                        db,
                        "projectFeedback"
                    ),
                    {

                        projectId:
                            projectId,

                        projectName:
                            project.projectName ||
                            project.name ||
                            project.title ||
                            "Unnamed Project",

                        barangayId:
                            currentBarangayId,

                        citizenUid:
                            currentUser.uid,

                        citizenName:
                            citizenName,

                        feedback:
                            feedback,

                        images:
                            uploadedFeedbackImages,

                        createdAt:
                            serverTimestamp()

                    }
                );


                showFeedbackMessage(
                    "Feedback submitted successfully!",
                    "success"
                );


                feedbackText.value =
                    "";

                selectedFeedbackImages = [];
                renderFeedbackImagePreview();


            } catch (error) {

                console.error(
                    "Feedback error:",
                    error
                );


                showFeedbackMessage(
                    "Failed to submit feedback: " +
                    error.message,
                    "error"
                );


            } finally {

                if (feedbackSubmitBtn) {

                    feedbackSubmitBtn.disabled =
                        false;

                    feedbackSubmitBtn.textContent =
                        "Submit Feedback";

                }

            }

        }
    );

}

async function uploadFeedbackImages(projectId, files) {
    const formData = new FormData();
    formData.append("action", "upload-feedback-images");
    formData.append("projectId", projectId);
    files.forEach((file) => formData.append("files", file));
    const response = await fetch(`${supabaseUrl}/functions/v1/project-documents`, {
        method: "POST",
        headers: {
            apikey: supabasePublishableKey,
            "x-firebase-token": await currentUser.getIdToken()
        },
        body: formData
    });
    const result = await response.json();
    if (!response.ok || !result.success || !Array.isArray(result.documents)) {
        throw new Error(result.error || "Image upload failed.");
    }
    return result.documents;
}


// =====================================
// CLOSE DETAILS
// =====================================

if (closeDetailsBtn) {

    closeDetailsBtn.addEventListener(
        "click",
        () => {

            if (isCitizenDetailsPage) {
                window.location.href = "citizen-projects.html";
                return;
            }

            if (
                projectDetailsPanel
            ) {

                projectDetailsPanel.style.display =
                    "none";

            }

        }
    );

}


// =====================================
// DASHBOARD BUTTON
// =====================================

if (dashboardBtn) {

    dashboardBtn.addEventListener(
        "click",
        () => {

            window.location.href = "citizen.html";

        }
    );

}


// =====================================
// PROJECTS BUTTON
// =====================================

if (projectsBtn) {

    projectsBtn.addEventListener(
        "click",
        () => {

            window.location.href = "citizen-projects.html";

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


                showMessage(
                    "Failed to logout.",
                    "error"
                );

            }

        }
    );

}


// =====================================
// FORMAT CURRENCY
// =====================================

function formatBarangayName(barangayId) {

    const value = String(barangayId || "").trim();
    const numberedBarangay = value.match(/^brgy-(\d+)$/i);

    if (numberedBarangay) {
        return `Barangay ${Number(numberedBarangay[1])}`;
    }

    return value
        .split("-")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ") || "Barangay";
}

function normalizeBarangayId(barangayId) {

    return String(barangayId || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function updateProjectSummary(projects) {

    let spentTotal = 0;
    let ongoingCount = 0;
    let completedCount = 0;

    projects.forEach((project) => {
        spentTotal += Number(project.spent) || 0;

        const status = String(
            project.status || project.verificationStatus || ""
        ).toLowerCase();

        if (status.includes("ongoing")) ongoingCount++;
        if (status.includes("completed")) completedCount++;
    });

    if (totalProjects) totalProjects.textContent = projects.length;
    if (totalSpent) totalSpent.textContent = formatCurrency(spentTotal);
    if (ongoingProjects) ongoingProjects.textContent = ongoingCount;
    if (completedProjects) completedProjects.textContent = completedCount;
}

function renderProjectStatusChart(projects) {

    if (!projectStatusChart) return;

    const groups = [
        { key: "completed", label: "Completed", count: 0 },
        { key: "ongoing", label: "Ongoing", count: 0 },
        { key: "forImplementation", label: "For implementation", count: 0 },
        { key: "other", label: "Other status", count: 0 }
    ];

    projects.forEach((project) => {
        const status = String(
            project.status || project.verificationStatus || ""
        ).toLowerCase();

        if (status.includes("completed")) {
            groups[0].count++;
        } else if (status.includes("ongoing")) {
            groups[1].count++;
        } else if (
            status.includes("submitted") ||
            status.includes("validated") ||
            status.includes("verified") ||
            status.includes("approved") ||
            status.includes("pending") ||
            status.includes("planning")
        ) {
            groups[2].count++;
        } else {
            groups[3].count++;
        }
    });

    if (chartProjectTotal) {
        chartProjectTotal.textContent = projects.length;
    }

    if (!projects.length) {
        projectStatusChart.innerHTML =
            '<div class="chart-loading">No project records are available yet.</div>';
        return;
    }

    const largestCount = Math.max(
        ...groups.map((group) => group.count),
        1
    );

    projectStatusChart.innerHTML = groups.map((group) => {
        const percent = Math.max(
            group.count ? 10 : 0,
            Math.round((group.count / largestCount) * 100)
        );

        return `
            <div class="chart-row">
                <div class="chart-label"><span>${escapeHTML(group.label)}</span><strong>${group.count}</strong></div>
                <div class="chart-track" aria-hidden="true"><span class="chart-bar" style="width: ${percent}%"></span></div>
            </div>
        `;
    }).join("");
}

function setupProjectDateFilters(projects) {

    if (!yearFilter || !monthFilter) return;

    const years = [...new Set(projects.map((project) => String(project.startDate || project.targetDate || "").slice(0, 4)).filter(Boolean))].sort().reverse();
    yearFilter.innerHTML = '<option value="">All years</option>' + years.map((year) => `<option value="${year}">${year}</option>`).join("");
    monthFilter.innerHTML = '<option value="">All months</option>' + Array.from({ length: 12 }, (_, index) => `<option value="${String(index + 1).padStart(2, "0")}">${new Date(2000, index).toLocaleString("en", { month: "long" })}</option>`).join("");

    const applyFilters = () => {
        document.querySelectorAll("#projectsList .citizen-project-row").forEach((card) => {
            const date = card.dataset.startDate || "";
            const matchesYear = !yearFilter.value || date.slice(0, 4) === yearFilter.value;
            const matchesMonth = !monthFilter.value || date.slice(5, 7) === monthFilter.value;
            card.style.display = matchesYear && matchesMonth ? "" : "none";
        });
    };

    yearFilter.onchange = applyFilters;
    monthFilter.onchange = applyFilters;
}


function getProjectSchedule(
    status,
    startDate,
    targetDate
) {

    const normalizedStatus =
        String(status || "")
        .trim()
        .toLowerCase();

    if (normalizedStatus === "ongoing") {

        return {
            label: "Ongoing Since",
            date: formatProjectDate(startDate)
        };
    }

    if (normalizedStatus === "completed") {

        return {
            label: "Completed By",
            date: formatProjectDate(targetDate)
        };
    }

    return {
        label: "Target Completion",
        date: formatProjectDate(targetDate)
    };
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


function formatProjectDate(value) {

    if (!value) {

        return "Date not set";
    }

    const date =
        new Date(
            `${value}T00:00:00`
        );

    if (Number.isNaN(date.getTime())) {

        return String(value);
    }

    return date.toLocaleDateString(
        "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
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
// SHOW MESSAGE
// =====================================

function showMessage(
    text,
    type
) {

    if (!message) {

        alert(text);

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
// FEEDBACK MESSAGE
// =====================================

function showFeedbackMessage(
    text,
    type
) {

    if (!feedbackMessage) {

        alert(text);

        return;
    }


    feedbackMessage.textContent =
        text;


    if (
        type === "success"
    ) {

        feedbackMessage.style.color =
            "#166534";

    } else {

        feedbackMessage.style.color =
            "#991b1b";

    }

}
