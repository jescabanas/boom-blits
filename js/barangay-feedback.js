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
    getDocs
} from "firebase/firestore";

import { app } from "./firebase-config.js";
import { supabaseUrl, supabasePublishableKey } from "./supabase-config.js";


// =====================================
// FIREBASE
// =====================================

const auth = getAuth(app);

const db = getFirestore(app);


// =====================================
// HTML ELEMENTS
// =====================================

const barangayTitle =
    document.getElementById(
        "barangayTitle"
    );

const welcome =
    document.getElementById(
        "welcome"
    );

const totalFeedback =
    document.getElementById(
        "totalFeedback"
    );

const feedbackList =
    document.getElementById(
        "feedbackList"
    );

const message =
    document.getElementById(
        "message"
    );


// =====================================
// SIDEBAR BUTTONS
// =====================================

const dashboardBtn =
    document.getElementById(
        "dashboardBtn"
    );

const projectsBtn =
    document.getElementById(
        "projectsBtn"
    );

const addProjectNav =
    document.getElementById(
        "addProjectNav"
    );

const feedbackBtn =
    document.getElementById(
        "feedbackBtn"
    );

const citizenActivityBtn =
    document.getElementById(
        "citizenActivityBtn"
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

let currentBarangayId = null;

// Keeps old feedback records accurate even if they were saved before the
// project title was included in the feedback document.
const projectTitleCache = new Map();

async function getFeedbackProjectTitle(feedback) {

    const savedTitle =
        String(
            feedback.projectName ||
            ""
        )
        .trim();

    if (
        savedTitle &&
        savedTitle.toLowerCase() !==
        "unnamed project"
    ) {

        return savedTitle;
    }

    const projectId =
        String(
            feedback.projectId ||
            ""
        )
        .trim();

    if (!projectId) {

        return "Project title unavailable";
    }

    if (
        !projectTitleCache.has(
            projectId
        )
    ) {

        projectTitleCache.set(
            projectId,
            getDoc(
                doc(
                    db,
                    "projects",
                    projectId
                )
            )
        );
    }

    try {

        const projectSnapshot =
            await projectTitleCache.get(
                projectId
            );

        if (
            projectSnapshot.exists()
        ) {

            const project =
                projectSnapshot.data();

            return (
                project.projectName ||
                project.name ||
                project.title ||
                "Project title unavailable"
            );
        }

    } catch (error) {

        console.warn(
            "Could not load feedback project title:",
            error
        );
    }

    return "Project title unavailable";
}


// =====================================
// CHECK AUTHENTICATION
// =====================================

onAuthStateChanged(
    auth,
    async (user) => {

        // =================================
        // NO USER
        // =================================

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }


        currentUser = user;


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


            // =================================
            // USER PROFILE NOT FOUND
            // =================================

            if (
                !userSnapshot.exists()
            ) {

                showMessage(
                    "User profile not found.",
                    "error"
                );

                return;
            }


            // =================================
            // GET USER DATA
            // =================================

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


            if (
                role !== "barangay"
            ) {

                showMessage(
                    "You are not authorized to access this page.",
                    "error"
                );

                return;
            }


            // =================================
            // GET BARANGAY ID
            // =================================

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


            // =================================
            // DISPLAY USER NAME
            // =================================

            const name =
                currentUserData.name ||
                currentUserData.firstName ||
                "Barangay User";


            if (welcome) {

                welcome.textContent =
                    `Welcome, ${name}!`;

            }


            // =================================
            // DISPLAY BARANGAY TITLE
            // =================================

            if (barangayTitle) {

                barangayTitle.textContent =
                    `Citizen Feedback - ${currentBarangayId}`;

            }


            // =================================
            // LOAD FEEDBACK
            // =================================

            await loadFeedback();


        } catch (error) {

            console.error(
                "Feedback dashboard error:",
                error
            );


            showMessage(
                "Failed to load feedback: " +
                error.message,
                "error"
            );

        }

    }
);


// =====================================
// LOAD FEEDBACK
// =====================================

async function loadFeedback() {

    try {

        // =================================
        // LOADING MESSAGE
        // =================================

        if (feedbackList) {

            feedbackList.innerHTML = `

                <div class="loading">

                    Loading feedback...

                </div>

            `;

        }


        // =================================
        // QUERY PROJECT FEEDBACK
        // =================================

        const feedbackQuery =
            query(

                collection(
                    db,
                    "projectFeedback"
                ),

                where(
                    "barangayId",
                    "==",
                    currentBarangayId
                )

            );


        // =================================
        // GET DATA
        // =================================

        const snapshot =
            await getDocs(
                feedbackQuery
            );


        // =================================
        // CLEAR LIST
        // =================================

        if (feedbackList) {

            feedbackList.innerHTML =
                "";

        }


        let count = 0;


        // =================================
        // DISPLAY FEEDBACK
        // =================================

        for (
            const feedbackDoc of snapshot.docs
        ) {

                const data =
                    feedbackDoc.data();


                count++;


                // =================================
                // PROJECT NAME
                // =================================

                const projectName =
                    await getFeedbackProjectTitle(
                        data
                    );


                // =================================
                // CITIZEN NAME
                // =================================

                const citizenName =
                    data.citizenName ||
                    "Citizen";


                // =================================
                // FEEDBACK
                // =================================

                const feedback =
                    data.feedback ||
                    "No feedback";


                // =================================
                // DATE
                // =================================

                const date =
                    formatDate(
                        data.createdAt
                    );


                // =================================
                // CREATE CARD
                // =================================

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "feedback-card";


                // =================================
                // CARD HTML
                // =================================

                card.innerHTML = `

                    <div class="feedback-top">

                        <div>

                            <h3 class="feedback-project">

                                ${escapeHTML(
                                    projectName
                                )}

                            </h3>


                            <div class="feedback-citizen">

                                Citizen:

                                <strong>

                                    ${escapeHTML(
                                        citizenName
                                    )}

                                </strong>

                            </div>

                        </div>


                        <div class="feedback-date">

                            ${escapeHTML(
                                date
                            )}

                        </div>

                    </div>


                    <div class="feedback-content">

                        <div class="feedback-label">

                            FEEDBACK

                        </div>


                        ${escapeHTML(
                            feedback
                        )}

                    </div>

                `;

                const feedbackImages = Array.isArray(data.images) ? data.images : [];
                if (feedbackImages.length) {
                    const gallery = document.createElement("div");
                    gallery.className = "feedback-image-gallery";
                    const galleryTitle = document.createElement("div");
                    galleryTitle.className = "feedback-label";
                    galleryTitle.textContent = "ATTACHED IMAGES";
                    gallery.append(galleryTitle);
                    card.append(gallery);

                    await Promise.all(feedbackImages.map(async (imageData) => {
                        if (!imageData?.storagePath) return;
                        try {
                            const imageUrl = await getFeedbackImageUrl(imageData.storagePath);
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
                            gallery.append(link);
                        } catch (error) {
                            console.warn("Could not load feedback image:", error);
                        }
                    }));
                }


                // =================================
                // ADD CARD
                // =================================

                if (feedbackList) {

                    feedbackList.appendChild(
                        card
                    );

                }

        }


        // =================================
        // UPDATE TOTAL FEEDBACK
        // =================================

        if (totalFeedback) {

            totalFeedback.textContent =
                count;

        }


        // =================================
        // NO FEEDBACK
        // =================================

        if (
            count === 0
        ) {

            if (feedbackList) {

                feedbackList.innerHTML = `

                    <div class="empty-feedback">

                        <h3>
                            No Citizen Feedback Yet
                        </h3>

                        <p>
                            Citizen feedback for your
                            barangay projects will appear here.
                        </p>

                    </div>

                `;

            }

        }


    } catch (error) {

        console.error(
            "Failed to load feedback:",
            error
        );


        // =================================
        // ERROR DISPLAY
        // =================================

        if (feedbackList) {

            feedbackList.innerHTML = `

                <div class="empty-feedback">

                    <h3>
                        Failed to load feedback
                    </h3>

                    <p>

                        ${escapeHTML(
                            error.message
                        )}

                    </p>

                </div>

            `;

        }


        showMessage(
            "Failed to load citizen feedback.",
            "error"
        );

    }

}

async function getFeedbackImageUrl(storagePath) {
    if (!currentUser) throw new Error("You are not logged in.");
    const response = await fetch(`${supabaseUrl}/functions/v1/project-documents`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            apikey: supabasePublishableKey,
            "x-firebase-token": await currentUser.getIdToken()
        },
        body: JSON.stringify({ action: "view", storagePath })
    });
    const result = await response.json();
    if (!response.ok || !result.success || !result.signedUrl) {
        throw new Error(result.error || "Unable to display feedback image.");
    }
    return result.signedUrl;
}


// =====================================
// DASHBOARD BUTTON
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
// CITIZEN FEEDBACK BUTTON
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


                showMessage(
                    "Failed to logout.",
                    "error"
                );

            }

        }
    );

}


// =====================================
// FORMAT DATE
// =====================================

function formatDate(
    timestamp
) {

    // =================================
    // NO TIMESTAMP
    // =================================

    if (
        !timestamp
    ) {

        return "Date unavailable";

    }


    try {

        // =================================
        // FIRESTORE TIMESTAMP
        // =================================

        const date =
            timestamp.toDate();


        // =================================
        // FORMAT
        // =================================

        return date.toLocaleString(
            "en-PH",
            {
                year:
                    "numeric",

                month:
                    "short",

                day:
                    "numeric",

                hour:
                    "numeric",

                minute:
                    "2-digit"
            }
        );


    } catch (error) {

        console.error(
            "Date formatting error:",
            error
        );


        return "Date unavailable";

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

if (citizenActivityBtn) {

    citizenActivityBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "citizen-activity.html";
        }
    );

}
