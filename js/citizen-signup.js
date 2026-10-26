import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "firebase/auth";

import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "firebase/firestore";

import { app } from "./firebase-config.js";
import { confirmAction, requestText } from "./dialog-ui.js";


// =====================================
// FIREBASE
// =====================================

const auth = getAuth(app);
const db = getFirestore(app);


// =====================================
// HTML ELEMENTS
// =====================================

const applicationList =
    document.getElementById("applicationList");

const message =
    document.getElementById("message");

const welcome =
    document.getElementById("welcome");

const barangayTitle =
    document.getElementById("barangayTitle");

const dashboardBtn =
    document.getElementById("dashboardBtn");

const projectsBtn =
    document.getElementById("projectsBtn");

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

            window.location.href = "login.html";

            return;
        }


        currentUser = user;


        try {

            // =====================================
            // GET BARANGAY USER PROFILE
            // =====================================

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const userSnapshot =
                await getDoc(userRef);


            if (!userSnapshot.exists()) {

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


            if (role !== "barangay") {

                showMessage(
                    "You are not authorized to access this page."
                );

                return;
            }


            // =====================================
            // CHECK BARANGAY ID
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


            // =====================================
            // DISPLAY
            // =====================================

            if (welcome) {

                welcome.textContent =
                    `Welcome, ${
                        currentUserData.name ||
                        "Barangay Staff"
                    }!`;

            }


            if (barangayTitle) {

                barangayTitle.textContent =
                    `Citizen Applications - ${barangayId}`;

            }


            // =====================================
            // LOAD PENDING CITIZENS
            // =====================================

            await loadApplications();


        } catch (error) {

            console.error(
                "Authentication error:",
                error
            );


            showMessage(
                "Failed to load citizen applications."
            );

        }

    }
);


// =====================================
// LOAD PENDING CITIZENS
// =====================================

async function loadApplications() {

    try {

        if (!applicationList) {

            return;
        }


        applicationList.innerHTML =
            `
                <div class="empty-projects">
                    Loading applications...
                </div>
            `;


        // =====================================
        // GET PENDING CITIZENS
        // =====================================

        const applicationsQuery =
            query(

                collection(
                    db,
                    "users"
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
                ),

                where(
                    "barangayId",
                    "==",
                    currentUserData.barangayId
                )

            );


        const snapshot =
            await getDocs(
                applicationsQuery
            );


        applicationList.innerHTML =
            "";


        // =====================================
        // NO PENDING APPLICATIONS
        // =====================================

        if (snapshot.empty) {

            showEmptyApplications();

            return;
        }


        // =====================================
        // DISPLAY CITIZENS
        // =====================================

        snapshot.forEach(
            (citizenDoc) => {

                displayApplication(
                    citizenDoc.id,
                    citizenDoc.data()
                );

            }
        );


    } catch (error) {

        console.error(
            "Load applications error:",
            error
        );


        if (applicationList) {

            applicationList.innerHTML =
                `
                    <div class="empty-projects">

                        <h3>
                            Failed to load applications
                        </h3>

                        <br>

                        ${escapeHTML(
                            error.message
                        )}

                    </div>
                `;

        }

    }

}


// =====================================
// DISPLAY CITIZEN
// =====================================

function displayApplication(
    userId,
    citizen
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "project-card";


    const firstName =
        citizen.firstName ||
        "";


    const lastName =
        citizen.surname ||
        citizen.lastName ||
        "";


    const fullName =
        `${firstName} ${lastName}`.trim() ||
        citizen.name ||
        "Unknown Citizen";


    const email =
        citizen.email ||
        "No email";


    const barangayId =
        citizen.barangayId ||
        "Unknown Barangay";


    card.innerHTML =
        `

            <div class="project-card-header">

                <div>

                    <h3>

                        ${escapeHTML(
                            fullName
                        )}

                    </h3>

                    <p>

                        Citizen Registration Request

                    </p>

                </div>


                <div class="status-container">

                    <span class="verification-badge verification-pending">

                        Pending Confirmation

                    </span>

                </div>

            </div>


            <div class="project-info">

                <div>

                    <span>
                        First Name
                    </span>

                    <strong>

                        ${escapeHTML(
                            firstName || "-"
                        )}

                    </strong>

                </div>


                <div>

                    <span>
                        Last Name
                    </span>

                    <strong>

                        ${escapeHTML(
                            lastName || "-"
                        )}

                    </strong>

                </div>


                <div>

                    <span>
                        Email
                    </span>

                    <strong>

                        ${escapeHTML(
                            email
                        )}

                    </strong>

                </div>


                <div>

                    <span>
                        Barangay
                    </span>

                    <strong>

                        ${escapeHTML(
                            barangayId
                        )}

                    </strong>

                </div>

            </div>


            <div class="project-actions">

                <button
                    type="button"
                    class="verify-project-btn approve-citizen-btn"
                >
                    ✓ Approve
                </button>


                <button
                    type="button"
                    class="return-project-btn reject-citizen-btn"
                >
                    ✕ Reject
                </button>

            </div>

        `;


    applicationList.appendChild(
        card
    );


    // =====================================
    // APPROVE BUTTON
    // =====================================

    const approveButton =
        card.querySelector(
            ".approve-citizen-btn"
        );


    if (approveButton) {

        approveButton.addEventListener(
            "click",
            async () => {

                await approveCitizen(
                    userId,
                    approveButton,
                    card
                );

            }
        );

    }


    // =====================================
    // REJECT BUTTON
    // =====================================

    const rejectButton =
        card.querySelector(
            ".reject-citizen-btn"
        );


    if (rejectButton) {

        rejectButton.addEventListener(
            "click",
            async () => {

                await rejectCitizen(
                    userId,
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
    userId,
    button,
    card
) {

    const confirmation =
        await confirmAction(
            "Approve Citizen",
            "This citizen will be allowed to log in.",
            "Approve"
        );


    if (!confirmation) {

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
                userId
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


        alert(
            "Citizen approved successfully."
        );


        card.remove();


        checkEmptyApplications();


    } catch (error) {

        console.error(
            "Approve error:",
            error
        );


        alert(
            "Failed to approve citizen.\n\n" +
            error.message
        );


        button.disabled =
            false;


        button.textContent =
            "✓ Approve";

    }

}


// =====================================
// REJECT CITIZEN
// =====================================

async function rejectCitizen(
    userId,
    button,
    card
) {

    const reason =
        await requestText(
            "Reject Citizen",
            "Why are you rejecting this citizen?"
        );


    if (reason === null) {

        return;
    }


    const trimmedReason =
        reason.trim();


    if (!trimmedReason) {

        alert(
            "Please enter a reason for rejection."
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
                userId
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
            "Citizen application rejected."
        );


        card.remove();


        checkEmptyApplications();


    } catch (error) {

        console.error(
            "Reject error:",
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
// EMPTY APPLICATIONS
// =====================================

function checkEmptyApplications() {

    if (
        applicationList &&
        applicationList.children.length === 0
    ) {

        showEmptyApplications();

    }

}


function showEmptyApplications() {

    if (!applicationList) {

        return;
    }


    applicationList.innerHTML =
        `
            <div class="empty-projects">

                <h3>
                    No Pending Applications
                </h3>

                <p>
                    There are currently no
                    citizen applications waiting
                    for confirmation.
                </p>

            </div>
        `;

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
