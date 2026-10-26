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

const requestsList =
    document.getElementById("requestsList");

const message =
    document.getElementById("message");

const barangayTitle =
    document.getElementById("barangayTitle");

const dashboardBtn =
    document.getElementById("dashboardBtn");

const projectsBtn =
    document.getElementById("projectsBtn");

const citizenRequestsBtn =
    document.getElementById("citizenRequestsBtn");

const addProjectBtn =
    document.getElementById("addProjectBtn");

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

            // =================================
            // GET BARANGAY USER PROFILE
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


            if (!userSnapshot.exists()) {

                showMessage(
                    "User profile not found."
                );

                return;
            }


            currentUserData =
                userSnapshot.data();


            // =================================
            // CHECK ROLE
            // =================================

            const role =
                String(
                    currentUserData.role || ""
                )
                .trim()
                .toLowerCase();


            if (role !== "barangay") {

                showMessage(
                    "You are not authorized to access this page."
                );

                return;
            }


            // =================================
            // CHECK BARANGAY ID
            // =================================

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


            // =================================
            // DISPLAY BARANGAY
            // =================================

            if (barangayTitle) {

                barangayTitle.textContent =
                    `Citizen Requests - ${barangayId}`;

            }


            // =================================
            // LOAD CITIZEN REQUESTS
            // =================================

            await loadCitizenRequests();


        } catch (error) {

            console.error(
                "Authentication error:",
                error
            );


            showMessage(
                "Failed to load citizen requests."
            );

        }

    }
);


// =====================================
// LOAD CITIZEN REQUESTS
// =====================================

async function loadCitizenRequests() {

    if (!currentUserData) {

        return;
    }


    if (!requestsList) {

        return;
    }


    try {

        const barangayId =
            String(
                currentUserData.barangayId || ""
            )
            .trim();


        // =================================
        // LOADING
        // =================================

        requestsList.innerHTML = `
            <div class="empty-requests">
                Loading citizen requests...
            </div>
        `;


        // =================================
        // GET ONLY PENDING CITIZENS
        // FROM SAME BARANGAY
        // =================================

        const usersQuery =
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
                usersQuery
            );


        // =================================
        // CLEAR LOADING
        // =================================

        requestsList.innerHTML =
            "";


        // =================================
        // NO PENDING REQUESTS
        // =================================

        if (snapshot.empty) {

            requestsList.innerHTML = `

                <div class="empty-requests">

                    <h3>
                        No Pending Requests
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
        // DISPLAY REQUESTS
        // =================================

        snapshot.forEach(
            (userDoc) => {

                const citizen =
                    userDoc.data();


                displayCitizenRequest(
                    userDoc.id,
                    citizen
                );

            }
        );


    } catch (error) {

        console.error(
            "Load citizen requests error:",
            error
        );


        requestsList.innerHTML = `

            <div class="empty-requests">

                <h3>
                    Failed to Load Requests
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
// DISPLAY CITIZEN REQUEST
// =====================================

function displayCitizenRequest(
    citizenId,
    citizen
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "request-card";


    // =================================
    // NAME
    // =================================

    const firstName =
        citizen.firstName ||
        citizen.name ||
        "";


    const lastName =
        citizen.lastName ||
        citizen.surname ||
        "";


    const fullName =
        `${firstName} ${lastName}`
            .trim() ||
        "Unnamed Citizen";


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


    // =================================
    // CARD
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
                        lastName || "-"
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


    requestsList.appendChild(
        card
    );


    // =================================
    // APPROVE BUTTON
    // =================================

    const approveButton =
        card.querySelector(
            ".approve-btn"
        );


    if (approveButton) {

        approveButton.addEventListener(
            "click",
            async () => {

                await approveCitizen(
                    citizenId,
                    fullName,
                    approveButton,
                    card
                );

            }
        );

    }


    // =================================
    // REJECT BUTTON
    // =================================

    const rejectButton =
        card.querySelector(
            ".reject-btn"
        );


    if (rejectButton) {

        rejectButton.addEventListener(
            "click",
            async () => {

                await rejectCitizen(
                    citizenId,
                    fullName,
                    rejectButton,
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


        checkEmptyRequests();


    } catch (error) {

        console.error(
            "Approve citizen error:",
            error
        );


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


    if (reason === null) {

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


        card.remove();


        checkEmptyRequests();


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
// CHECK EMPTY REQUESTS
// =====================================

function checkEmptyRequests() {

    if (
        requestsList &&
        requestsList.children.length === 0
    ) {

        requestsList.innerHTML = `

            <div class="empty-requests">

                <h3>
                    No Pending Requests
                </h3>

                <p>
                    There are currently no citizen
                    registration requests.
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
// MESSAGE
// =====================================

function showMessage(
    text
) {

    if (message) {

        message.textContent =
            text;

        message.style.color =
            "#b91c1c";

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
// CITIZEN REQUESTS
// =====================================

if (citizenRequestsBtn) {

    citizenRequestsBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "citizen-requests.html";

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
                "projects.html";

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
                    "Failed to logout."
                );

            }

        }
    );

}
