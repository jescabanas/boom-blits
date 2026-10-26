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
    updateDoc,
    serverTimestamp
} from "firebase/firestore";

import { app } from "./firebase-config.js";
import { supabaseUrl, supabasePublishableKey } from "./supabase-config.js";
import { confirmCitizenApproval } from "./citizen-approval-modal.js?v=20260902-hidden-fix";
import { requestText } from "./dialog-ui.js";


// =====================================
// FIREBASE
// =====================================

const auth = getAuth(app);
const db = getFirestore(app);


// =====================================
// HTML ELEMENTS
// =====================================

const welcome =
    document.getElementById("welcome");

const barangayTitle =
    document.getElementById("barangayTitle");

const dashboardBarangayName =
    document.getElementById("dashboardBarangayName");

const totalProjects =
    document.getElementById("totalProjects");

const totalBudget =
    document.getElementById("totalBudget");

const totalSpent =
    document.getElementById("totalSpent");

const remainingBudget =
    document.getElementById("remainingBudget");

const utilization =
    document.getElementById("utilization");

const progressBar =
    document.getElementById("progressBar");

const budgetPieChart =
    document.getElementById("budgetPieChart");

const spentBudgetChart =
    document.getElementById("spentBudgetChart");

const remainingBudgetChart =
    document.getElementById("remainingBudgetChart");

const projectsBtn =
    document.getElementById("projectsBtn");

const addProjectBtn =
    document.getElementById("addProjectBtn");

const addProjectBtn2 =
    document.getElementById("addProjectBtn2");

const viewProjectsBtn =
    document.getElementById("viewProjectsBtn");

const feedbackBtn =
    document.getElementById("feedbackBtn");

const citizenActivityBtn =
    document.getElementById("citizenActivityBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const message =
    document.getElementById("message");

const notificationBtn = document.getElementById("notificationBtn");
const notificationDot = document.getElementById("notificationDot");
const notificationPanel = document.getElementById("notificationPanel");
const notificationList = document.getElementById("notificationList");


// =====================================
// CITIZEN CONFIRMATION ELEMENTS
// =====================================

const pendingCitizenCount =
    document.getElementById(
        "pendingCitizenCount"
    );

const citizenList =
    document.getElementById(
        "citizenList"
    );

const citizenActivityList =
    document.getElementById(
        "citizenActivityList"
    );


// =====================================
// CURRENT USER DATA
// =====================================

let currentUser = null;

let currentUserData = null;


// =====================================
// ANIMATED NUMBER COUNTER
// =====================================

function animateNumber(
    element,
    start,
    end,
    duration = 900,
    formatter = (value) => value
) {

    if (!element) {
        return;
    }


    const startTime =
        performance.now();


    function update(
        currentTime
    ) {

        const elapsed =
            currentTime -
            startTime;


        const progress =
            Math.min(
                elapsed / duration,
                1
            );


        // Smooth ease-out
        const eased =
            1 -
            Math.pow(
                1 - progress,
                3
            );


        const currentValue =
            start +
            (end - start) *
            eased;


        element.textContent =
            formatter(
                currentValue
            );


        if (
            progress < 1
        ) {

            requestAnimationFrame(
                update
            );

        } else {

            element.textContent =
                formatter(
                    end
                );

        }

    }


    requestAnimationFrame(
        update
    );

}


// =====================================
// CHECK LOGIN
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


        console.log(
            "Logged in UID:",
            user.uid
        );


        try {

            // =================================
            // GET USER PROFILE
            // =================================

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

                if (welcome) {

                    welcome.textContent =
                        "User profile not found.";

                }

                console.error(
                    "No user document found."
                );

                return;
            }


            currentUserData =
                userSnapshot.data();


            console.log(
                "User data:",
                currentUserData
            );


            // =================================
            // CHECK ROLE
            // =================================

            const userRole =
                String(
                    currentUserData.role || ""
                )
                .trim()
                .toLowerCase();


            console.log(
                "User role:",
                userRole
            );


            if (
                userRole !== "barangay"
            ) {

                if (welcome) {

                    welcome.textContent =
                        "You are not authorized to access this page.";

                }

                return;
            }


            // =================================
            // DISPLAY USER
            // =================================

            if (welcome) {

                welcome.textContent =
                    `Welcome, ${
                        currentUserData.name ||
                        "Barangay User"
                    }. Review your barangay's latest project information below.`;

            }


            if (barangayTitle) {

                barangayTitle.textContent =
                    `${formatBarangayName(
                        currentUserData.barangayId
                    )} Dashboard`;

            }

            if (dashboardBarangayName) {

                dashboardBarangayName.textContent =
                    formatBarangayName(
                        currentUserData.barangayId
                    );

            }


            // =================================
            // LOAD DASHBOARD
            // =================================

            await loadDashboard();

            await loadBarangayNotifications();


            // =================================
            // LOAD CITIZEN REQUESTS
            // =================================

            await loadCitizenRequests();


        } catch (error) {

            console.error(
                "Dashboard error:",
                error
            );


            if (welcome) {

                welcome.textContent =
                    "Failed to load dashboard.";

            }

        }

    }
);


async function loadBarangayNotifications() {

    if (!currentUserData || !notificationList) return;

    const snapshot = await getDocs(query(
        collection(db, "projects"),
        where("barangayId", "==", currentUserData.barangayId)
    ));

    const verified = snapshot.docs.map((projectDoc) => projectDoc.data())
        .filter((project) => ["verified", "approved"].includes(
            String(project.verificationStatus || "").toLowerCase()
        ));

    notificationDot?.classList.toggle("hidden", verified.length === 0);
    notificationList.innerHTML = verified.length
        ? verified.map((project) => `
            <div class="notification-item">
                <strong>Project verified by DILG</strong>
                <span>${escapeHTML(project.projectName || project.name || "Untitled Project")} is now verified.</span>
            </div>
        `).join("")
        : '<div class="notification-empty">No verified project notifications yet.</div>';
}


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


function formatBarangayName(barangayId) {

    const value =
        String(barangayId || "")
        .trim();

    const numberedBarangay =
        value.match(/^brgy-(\d+)$/i);

    if (numberedBarangay) {

        return `Barangay ${
            Number(numberedBarangay[1])
        }`;

    }

    if (!value) {

        return "Barangay";

    }

    return value
        .split("-")
        .filter(Boolean)
        .map((word) =>
            word.charAt(0).toUpperCase() +
            word.slice(1).toLowerCase()
        )
        .join(" ");

}


// =====================================
// LOAD DASHBOARD DATA
// =====================================

async function loadDashboard() {

    if (!currentUserData) {

        return;
    }


    try {

        // =================================
        // GET PROJECTS
        // =================================

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


        // =================================
        // VARIABLES
        // =================================

        let projectCount = 0;

        let budgetTotal = 0;

        let spentTotal = 0;


        // =================================
        // CALCULATE TOTALS
        // =================================

        querySnapshot.forEach(
            (projectDoc) => {

                const project =
                    projectDoc.data();


                projectCount++;


                budgetTotal +=
                    Number(
                        project.budget
                    ) || 0;


                spentTotal +=
                    Number(
                        project.spent
                    ) || 0;

            }
        );


        // =================================
        // REMAINING
        // =================================

        const remaining =
            budgetTotal -
            spentTotal;


        // =================================
        // UTILIZATION
        // =================================

        let budgetUtilization = 0;


        if (
            budgetTotal > 0
        ) {

            budgetUtilization =
                (
                    spentTotal /
                    budgetTotal
                ) * 100;

        }


        // =================================
        // SAFE UTILIZATION
        // =================================

        const finalUtilization =
            Math.min(
                Math.max(
                    budgetUtilization,
                    0
                ),
                100
            );


        // =================================
        // ANIMATED PROJECT COUNT
        // =================================

        if (totalProjects) {

            animateNumber(
                totalProjects,
                0,
                projectCount,
                800,
                (value) =>
                    Math.round(
                        value
                    )
            );

        }


        // =================================
        // ANIMATED TOTAL BUDGET
        // =================================

        if (totalBudget) {

            animateNumber(
                totalBudget,
                0,
                budgetTotal,
                1000,
                (value) =>
                    `₱${Math.round(
                        value
                    ).toLocaleString()}`
            );

        }


        // =================================
        // ANIMATED TOTAL SPENT
        // =================================

        if (totalSpent) {

            animateNumber(
                totalSpent,
                0,
                spentTotal,
                1000,
                (value) =>
                    `₱${Math.round(
                        value
                    ).toLocaleString()}`
            );

        }


        // =================================
        // ANIMATED REMAINING
        // =================================

        if (remainingBudget) {

            animateNumber(
                remainingBudget,
                0,
                remaining,
                1000,
                (value) =>
                    `₱${Math.round(
                        value
                    ).toLocaleString()}`
            );

        }


        // =================================
        // ANIMATED UTILIZATION
        // =================================

        if (utilization) {

            animateNumber(
                utilization,
                0,
                budgetUtilization,
                900,
                (value) =>
                    `${value.toFixed(
                        2
                    )}%`
            );

        }


        if (budgetPieChart) {
            budgetPieChart.style.setProperty(
                "--utilization",
                `${finalUtilization}%`
            );
        }

        if (spentBudgetChart) {
            spentBudgetChart.textContent =
                `₱${Math.round(spentTotal).toLocaleString()}`;
        }

        if (remainingBudgetChart) {
            remainingBudgetChart.textContent =
                `₱${Math.max(remaining, 0).toLocaleString()}`;
        }

        // =================================
        // ANIMATED PROGRESS BAR
        // =================================

        if (progressBar) {

            progressBar.style.width =
                "0%";


            setTimeout(
                () => {

                    progressBar.style.width =
                        `${finalUtilization}%`;

                },
                150
            );

        }


        // =================================
        // CONSOLE
        // =================================

        console.log(
            "Dashboard loaded successfully."
        );


        console.log(
            "Total Projects:",
            projectCount
        );


        console.log(
            "Total Budget:",
            budgetTotal
        );


        console.log(
            "Total Spent:",
            spentTotal
        );


        console.log(
            "Remaining:",
            remaining
        );


        console.log(
            "Utilization:",
            budgetUtilization
        );


    } catch (error) {

        console.error(
            "Error loading dashboard:",
            error
        );


        if (message) {

            message.textContent =
                "Failed to load dashboard data.";

        }

    }

}


// =====================================
// LOAD CITIZEN REQUESTS
// =====================================

async function loadCitizenRequests() {

    if (!currentUserData) {

        return;
    }


    if (!citizenList) {

        console.error(
            "citizenList element not found."
        );

        return;
    }


    const barangayId =
        String(
            currentUserData.barangayId || ""
        )
        .trim();


    if (!barangayId) {

        citizenList.innerHTML = `
            <div class="empty-projects">
                Barangay ID is missing.
            </div>
        `;

        return;
    }


    try {

        // =================================
        // LOADING
        // =================================

        citizenList.innerHTML = `
            <div class="empty-projects">
                Loading citizen requests...
            </div>
        `;


        // =================================
        // QUERY PENDING CITIZENS
        // =================================

        const citizensQuery =
            query(

                collection(
                    db,
                    "users"
                ),

                where(
                    "barangayId",
                    "==",
                    barangayId
                ),

                where(
                    "role",
                    "==",
                    "citizen"
                ),

                where(
                    "status",
                    "==",
                    "pending"
                )

            );


        const snapshot =
            await getDocs(
                citizensQuery
            );


        console.log(
            "Pending citizen count:",
            snapshot.size
        );


        // =================================
        // UPDATE COUNT
        // =================================

        if (pendingCitizenCount) {

            animateNumber(
                pendingCitizenCount,
                0,
                snapshot.size,
                600,
                (value) =>
                    Math.round(
                        value
                    )
            );

        }


        // =================================
        // CLEAR LIST
        // =================================

        citizenList.innerHTML =
            "";


        // =================================
        // NO REQUESTS
        // =================================

        if (
            snapshot.empty
        ) {

            citizenList.innerHTML = `

                <div class="empty-projects">

                    <h3>
                        No Pending Citizens
                    </h3>

                    <p>
                        There are currently no citizen
                        registration requests.
                    </p>

                </div>

            `;

            return;
        }


        // =================================
        // DISPLAY CITIZENS
        // =================================

        snapshot.forEach(
            (
                citizenDoc,
                index
            ) => {

                displayCitizen(
                    citizenDoc.id,
                    citizenDoc.data(),
                    index
                );

            }
        );


    } catch (error) {

        console.error(
            "Citizen request error:",
            error
        );


        if (pendingCitizenCount) {

            pendingCitizenCount.textContent =
                "Error";

        }


        citizenList.innerHTML = `

            <div class="empty-projects">

                <h3>
                    Failed to Load Citizen Requests
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>

        `;

    }

}


// =====================================
// DISPLAY CITIZEN
// =====================================

function displayCitizen(
    citizenId,
    citizen,
    index = 0
) {

    if (!citizenList) {

        return;
    }


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "request-card";


    // =================================
    // STAGGER ANIMATION DELAY
    // =================================

    card.style.animationDelay =
        `${index * 0.08}s`;


    // =================================
    // NAME
    // =================================

    const firstName =
        citizen.firstName ||
        "";


    const surname =
        citizen.surname ||
        citizen.lastName ||
        "";


    const fullName =
        `${firstName} ${surname}`
            .trim() ||
        "Unknown Citizen";


    // =================================
    // EMAIL
    // =================================

    const email =
        citizen.email ||
        "No email";


    // =================================
    // BARANGAY
    // =================================

    const barangayId =
        citizen.barangayId ||
        "Unknown";

    const verificationDocuments = citizen.verificationDocuments || {};
    const barangayProof = verificationDocuments.barangayProof || verificationDocuments.residencyProof;
    const proofControls = barangayProof?.storagePath
        ? `<div class="citizen-proof-file"><span>${escapeHTML(barangayProof.name || "Barangay Proof / Valid ID")}</span><div><button type="button" class="citizen-proof-btn" data-action="view">View</button><button type="button" class="citizen-proof-btn" data-action="download">Download</button></div></div>`
        : `<div class="citizen-proof-missing">No Barangay Proof / Valid ID uploaded.</div>`;


    // =================================
    // CREATE CARD
    // =================================

    card.innerHTML = `

        <div class="request-header">

            <div>

                <div class="request-name">

                    ${escapeHTML(
                        fullName
                    )}

                </div>

                <div class="request-email">

                    ${escapeHTML(
                        email
                    )}

                </div>

            </div>


            <span class="pending-badge">

                PENDING

            </span>

        </div>


        <div class="request-info">


            <div class="info-box">

                <div class="info-label">
                    First Name
                </div>

                <div class="info-value">

                    ${escapeHTML(
                        firstName || "-"
                    )}

                </div>

            </div>


            <div class="info-box">

                <div class="info-label">
                    Surname
                </div>

                <div class="info-value">

                    ${escapeHTML(
                        surname || "-"
                    )}

                </div>

            </div>


            <div class="info-box">

                <div class="info-label">
                    Barangay
                </div>

                <div class="info-value">

                    ${escapeHTML(
                        barangayId
                    )}

                </div>

            </div>


        </div>


        <div class="citizen-proof-section">
            <div class="info-label">Barangay Proof / Valid ID</div>
            ${proofControls}
        </div>


        <div class="request-actions">

            <button
                type="button"
                class="approve-btn"
            >
                ✓ Approve Citizen
            </button>


            <button
                type="button"
                class="reject-btn"
            >
                ✕ Reject
            </button>

        </div>

    `;


    citizenList.appendChild(
        card
    );

    card.querySelectorAll(".citizen-proof-btn").forEach((proofButton) => {
        proofButton.addEventListener("click", async () => {
            await accessCitizenProof(
                barangayProof.storagePath,
                barangayProof.name,
                proofButton.dataset.action,
                proofButton
            );
        });
    });


    // =================================
    // APPROVE
    // =================================

    const approveBtn =
        card.querySelector(
            ".approve-btn"
        );


    if (approveBtn) {

        approveBtn.addEventListener(
            "click",
            async () => {

                await approveCitizen(
                    citizenId,
                    fullName,
                    approveBtn,
                    card
                );

            }
        );

    }


    // =================================
    // REJECT
    // =================================

    const rejectBtn =
        card.querySelector(
            ".reject-btn"
        );


    if (rejectBtn) {

        rejectBtn.addEventListener(
            "click",
            async () => {

                await rejectCitizen(
                    citizenId,
                    fullName,
                    rejectBtn,
                    card
                );

            }
        );

    }

}


// =====================================
// APPROVE CITIZEN
// =====================================

async function approveCitizen(
    citizenId,
    fullName,
    button,
    card
) {

    const confirmed =
        await confirmCitizenApproval(fullName);


    if (!confirmed) {

        return;
    }

    card.style.transition =
        "opacity 0.18s ease, transform 0.18s ease";

    card.style.opacity = "0";
    card.style.transform = "translateX(18px)";


    try {

        button.disabled =
            true;


        button.textContent =
            "Approving...";


        const citizenRef =
            doc(
                db,
                "users",
                citizenId
            );


        await updateDoc(
            citizenRef,
            {

                status:
                    "approved",

                approvedBy:
                    currentUser.uid,

                approvedAt:
                    serverTimestamp()

            }
        );


        card.remove();

        updatePendingCount();

        checkEmptyCitizens();


    } catch (error) {

        console.error(
            "Approve citizen error:",
            error
        );

        card.style.opacity = "1";
        card.style.transform = "translateX(0)";


        alert(
            "Failed to approve citizen.\n\n" +
            error.message
        );


        button.disabled =
            false;


        button.textContent =
            "✓ Approve Citizen";

    }

}


// =====================================
// REJECT CITIZEN
// =====================================

async function rejectCitizen(
    citizenId,
    fullName,
    button,
    card
) {

    const reason =
        await requestText(
            "Reject Citizen",
            `Reason for rejecting ${fullName}:`
        );


    if (
        reason === null
    ) {

        return;
    }


    const trimmedReason =
        reason.trim();


    if (!trimmedReason) {

        alert(
            "Please enter a reason."
        );

        return;
    }


    try {

        button.disabled =
            true;


        button.textContent =
            "Rejecting...";


        const citizenRef =
            doc(
                db,
                "users",
                citizenId
            );


        await updateDoc(
            citizenRef,
            {

                status:
                    "rejected",

                rejectedBy:
                    currentUser.uid,

                rejectedAt:
                    serverTimestamp(),

                rejectionReason:
                    trimmedReason

            }
        );


        alert(
            `${fullName} has been rejected.`
        );


        // =================================
        // REMOVE CARD WITH ANIMATION
        // =================================

        card.style.transition =
            "opacity 0.3s ease, transform 0.3s ease";

        card.style.opacity =
            "0";

        card.style.transform =
            "translateX(20px)";


        setTimeout(
            () => {

                card.remove();

                updatePendingCount();

                checkEmptyCitizens();

            },
            300
        );


    } catch (error) {

        console.error(
            "Reject citizen error:",
            error
        );


        alert(
            "Failed to reject citizen.\n\n" +
            error.message
        );


        button.disabled =
            false;


        button.textContent =
            "✕ Reject";

    }

}


// =====================================
// UPDATE PENDING COUNT
// =====================================

function updatePendingCount() {

    if (!pendingCitizenCount) {

        return;
    }


    const cards =
        citizenList
            ? citizenList.querySelectorAll(
                ".request-card"
            ).length
            : 0;


    animateNumber(
        pendingCitizenCount,
        0,
        cards,
        400,
        (value) =>
            Math.round(
                value
            )
    );

}


// =====================================
// CHECK EMPTY CITIZENS
// =====================================

function checkEmptyCitizens() {

    if (!citizenList) {

        return;
    }


    const cards =
        citizenList.querySelectorAll(
            ".request-card"
        );


    if (
        cards.length === 0
    ) {

        citizenList.innerHTML = `

            <div class="empty-projects">

                <h3>
                    No Pending Citizens
                </h3>

                <p>
                    All citizen requests
                    have been processed.
                </p>

            </div>

        `;

    }

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
// PROJECTS BUTTON
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
// ADD PROJECT BUTTON
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
// ADD PROJECT QUICK ACTION
// =====================================

if (addProjectBtn2) {

    addProjectBtn2.addEventListener(
        "click",
        () => {

            window.location.href =
                "add-project.html";

        }
    );

}


// =====================================
// VIEW PROJECTS
// =====================================

if (viewProjectsBtn) {

    viewProjectsBtn.addEventListener(
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


                if (message) {

                    message.textContent =
                        "Failed to logout.";

                }

            }

        }
    );

}

async function accessCitizenProof(storagePath, fileName, action, button) {
    const originalText = button.textContent;
    const previewWindow = action === "view" ? window.open("about:blank", "_blank") : null;
    if (previewWindow) previewWindow.opener = null;

    try {
        button.disabled = true;
        button.textContent = "Preparing...";
        const response = await fetch(`${supabaseUrl}/functions/v1/project-documents`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: supabasePublishableKey,
                "x-firebase-token": await currentUser.getIdToken(true)
            },
            body: JSON.stringify({ action, storagePath })
        });
        const result = await response.json();
        if (!response.ok || !result.success || !result.signedUrl) {
            throw new Error(result.error || "The citizen document could not be opened.");
        }

        if (action === "view") {
            if (previewWindow) previewWindow.location.replace(result.signedUrl);
            else window.location.href = result.signedUrl;
        } else {
            const anchor = document.createElement("a");
            anchor.href = result.signedUrl;
            anchor.download = fileName || "citizen-proof";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
        }
    } catch (error) {
        previewWindow?.close();
        alert(error.message || "Failed to access the citizen document.");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

if (citizenActivityBtn) {

    citizenActivityBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "citizen-activity.html";
        }

    );

}


// =====================================
// LOAD CITIZEN DASHBOARD ACTIVITY
// =====================================

async function loadCitizenActivity() {

    if (!currentUserData || !citizenActivityList) {

        return;
    }

    const barangayId =
        String(
            currentUserData.barangayId ||
            ""
        )
        .trim();

    if (!barangayId) {

        return;
    }

    citizenActivityList.innerHTML = `
        <div class="activity-empty">Loading citizen activity...</div>
    `;

    try {

        const activityQuery =
            query(
                collection(
                    db,
                    "citizenActivity"
                ),
                where(
                    "barangayId",
                    "==",
                    barangayId
                )
            );

        const activitySnapshot =
            await Promise.race([
                getDocs(activityQuery),
                new Promise(
                    (_, reject) => {

                        window.setTimeout(
                            () => reject(
                                new Error(
                                    "Activity request timed out."
                                )
                            ),
                            12000
                        );
                    }
                )
            ]);

        const activities =
            activitySnapshot.docs
            .map(
                (activityDoc) => activityDoc.data()
            )
            .sort(
                (first, second) => {

                    const firstTime =
                        first.createdAt?.toDate?.().getTime() ||
                        0;

                    const secondTime =
                        second.createdAt?.toDate?.().getTime() ||
                        0;

                    return secondTime - firstTime;
                }
            )
            .slice(0, 12);

        if (activities.length === 0) {

            citizenActivityList.innerHTML = `
                <div class="activity-empty">
                    No citizen dashboard activity yet.
                </div>
            `;

            return;
        }

        citizenActivityList.innerHTML =
            activities.map(
                (activity) => `
                    <div class="activity-item">
                        <div class="activity-person">
                            ${escapeHTML(
                                activity.citizenName ||
                                "Citizen"
                            )}
                        </div>
                        <div class="activity-details">
                            ${escapeHTML(
                                activity.activity ||
                                "Viewed Citizen Dashboard"
                            )}
                            <span>${escapeHTML(
                                formatActivityDate(
                                    activity.createdAt
                                )
                            )}</span>
                        </div>
                    </div>
                `
            ).join("");

    } catch (error) {

        console.error(
            "Citizen activity error:",
            error
        );

        citizenActivityList.innerHTML = `
            <div class="activity-empty">
                Unable to load citizen activity. Please refresh the page.
            </div>
        `;
    }
}


function formatActivityDate(timestamp) {

    if (!timestamp?.toDate) {

        return "Just now";
    }

    return timestamp.toDate().toLocaleString(
        "en-PH",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}
