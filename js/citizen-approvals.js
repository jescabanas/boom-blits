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

const applicationList =
    document.getElementById(
        "applicationList"
    );

const message =
    document.getElementById(
        "message"
    );

const welcome =
    document.getElementById(
        "welcome"
    );

const barangayTitle =
    document.getElementById(
        "barangayTitle"
    );

const dashboardBtn =
    document.getElementById(
        "dashboardBtn"
    );

const projectsBtn =
    document.getElementById(
        "projectsBtn"
    );

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


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
                    "You are not authorized to access this page."
                );

                return;
            }


            // =====================================
            // CHECK BARANGAY
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

            welcome.textContent =
                `Welcome, ${currentUserData.name || "Barangay Staff"}!`;


            barangayTitle.textContent =
                `Citizen Applications - ${barangayId}`;


            // =====================================
            // LOAD APPLICATIONS
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
// LOAD APPLICATIONS
// =====================================

async function loadApplications() {

    try {

        applicationList.innerHTML =
            `
                <div class="empty-projects">
                    Loading applications...
                </div>
            `;


        const applicationsQuery =
            query(
                collection(
                    db,
                    "citizenApplications"
                ),

                where(
                    "barangayId",
                    "==",
                    currentUserData.barangayId
                ),

                where(
                    "status",
                    "==",
                    "pending"
                )
            );


        const snapshot =
            await getDocs(
                applicationsQuery
            );


        applicationList.innerHTML =
            "";


        // =====================================
        // NO APPLICATIONS
        // =====================================

        if (
            snapshot.empty
        ) {

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

            return;
        }


        // =====================================
        // DISPLAY APPLICATIONS
        // =====================================

        snapshot.forEach(
            (applicationDoc) => {

                displayApplication(
                    applicationDoc.id,
                    applicationDoc.data()
                );

            }
        );


    } catch (error) {

        console.error(
            "Load applications error:",
            error
        );


        applicationList.innerHTML =
            `
                <div class="empty-projects">

                    Failed to load applications.

                    <br><br>

                    ${escapeHTML(
                        error.message
                    )}

                </div>
            `;

    }

}


// =====================================
// DISPLAY APPLICATION
// =====================================

function displayApplication(
    applicationId,
    application
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "project-card";


    const firstName =
        application.firstName ||
        application.name ||
        "";


    const lastName =
        application.lastName ||
        application.surname ||
        "";


    const fullName =
        `${firstName} ${lastName}`.trim() ||
        "Unknown Citizen";


    const email =
        application.email ||
        "No email";


    const barangayId =
        application.barangayId ||
        "Unknown Barangay";

    const verificationDocuments = application.verificationDocuments || {};
    const documentButton = (document, label) => document?.storagePath
        ? `<span class="citizen-document-file"><span>${escapeHTML(document.name || label)}</span><button type="button" class="citizen-document-btn" data-action="view" data-storage-path="${escapeHTML(document.storagePath)}" data-file-name="${escapeHTML(document.name || label)}">View</button><button type="button" class="citizen-document-btn" data-action="download" data-storage-path="${escapeHTML(document.storagePath)}" data-file-name="${escapeHTML(document.name || label)}">Download</button></span>`
        : `<span class="citizen-document-missing">${escapeHTML(label)} not uploaded</span>`;


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


            <div class="citizen-verification-documents">
                <strong>Verification Documents</strong>
                <div>
                    ${documentButton(
                        verificationDocuments.barangayProof || verificationDocuments.residencyProof,
                        "Barangay Proof / Valid ID"
                    )}
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

    card.querySelectorAll(".citizen-document-btn").forEach((documentButtonElement) => {
        documentButtonElement.addEventListener("click", async () => {
            await downloadCitizenDocument(
                documentButtonElement.dataset.storagePath,
                documentButtonElement.dataset.fileName,
                documentButtonElement,
                documentButtonElement.dataset.action
            );
        });
    });


    // =====================================
    // APPROVE
    // =====================================

    const approveButton =
        card.querySelector(
            ".approve-citizen-btn"
        );


    approveButton.addEventListener(
        "click",
        async () => {

            await approveCitizen(
                applicationId,
                fullName,
                approveButton,
                card
            );

        }
    );


    // =====================================
    // REJECT
    // =====================================

    const rejectButton =
        card.querySelector(
            ".reject-citizen-btn"
        );


    rejectButton.addEventListener(
        "click",
        async () => {

            await rejectCitizen(
                applicationId,
                rejectButton,
                card
            );

        }
    );

}


// =====================================
// APPROVE CITIZEN
// =====================================

async function approveCitizen(
    applicationId,
    fullName,
    button,
    card
) {

    const confirmation =
        await confirmCitizenApproval(fullName);


    if (!confirmation) {

        return;
    }


    try {

        button.disabled =
            true;

        button.textContent =
            "Approving...";


        const applicationRef =
            doc(
                db,
                "citizenApplications",
                applicationId
            );


        await updateDoc(
            applicationRef,
            {

                status:
                    "approved",

                approvedBy:
                    currentUser.uid,

                approvedAt:
                    serverTimestamp()

            }
        );

        await updateDoc(doc(db, "users", applicationId), {
            status: "approved",
            approvedBy: currentUser.uid,
            approvedAt: serverTimestamp()
        });


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
    applicationId,
    button,
    card
) {

    const reason =
        await requestText(
            "Reject Citizen",
            "Why are you rejecting this citizen application?"
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
            "Please enter a reason for rejection."
        );

        return;
    }


    try {

        button.disabled =
            true;

        button.textContent =
            "Rejecting...";


        const applicationRef =
            doc(
                db,
                "citizenApplications",
                applicationId
            );


        await updateDoc(
            applicationRef,
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

        await updateDoc(doc(db, "users", applicationId), {
            status: "rejected",
            rejectedBy: currentUser.uid,
            rejectedAt: serverTimestamp(),
            rejectionReason: trimmedReason
        });


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
// CHECK EMPTY
// =====================================

function checkEmptyApplications() {

    if (
        applicationList.children.length ===
        0
    ) {

        applicationList.innerHTML =
            `
                <div class="empty-projects">

                    <h3>
                        No Pending Applications
                    </h3>

                    <p>
                        All citizen applications
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

if (
    dashboardBtn
) {

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

if (
    projectsBtn
) {

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


                showMessage(
                    "Failed to logout."
                );

            }

        }
    );

}

async function downloadCitizenDocument(storagePath, fileName, button, action = "download") {
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
            throw new Error(result.error || "Download failed.");
        }
        if (action === "view") {
            if (previewWindow) previewWindow.location.replace(result.signedUrl);
            else window.location.href = result.signedUrl;
        } else {
            const anchor = document.createElement("a");
            anchor.href = result.signedUrl;
            anchor.download = fileName || "verification-document";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
        }
    } catch (error) {
        previewWindow?.close();
        alert(error.message || "Failed to download the document.");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}
