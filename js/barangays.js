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
    getDocs
} from "firebase/firestore";

import { app } from "./firebase-config.js";
import {
    barangayDirectory,
    barangayDirectoryById
} from "./barangay-directory.js";


const auth = getAuth(app);
const db = getFirestore(app);


// =====================================
// ELEMENTS
// =====================================

const barangayList =
    document.getElementById("barangayList");

const barangayCount =
    document.getElementById("barangayCount");

const searchInput =
    document.getElementById("searchInput");

const message =
    document.getElementById("message");

const dashboardBtn =
    document.getElementById("dashboardBtn");

const barangaysBtn =
    document.getElementById("barangaysBtn");

const projectsBtn =
    document.getElementById("projectsBtn");

const logoutBtn =
    document.getElementById("logoutBtn");


// =====================================
// STORAGE
// =====================================

let allBarangays = [];


// =====================================
// AUTH CHECK
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

                showError(
                    "User profile not found."
                );

                return;
            }


            const userData =
                userSnapshot.data();


            const role =
                String(
                    userData.role || ""
                )
                .trim()
                .toLowerCase();


            // =====================================
            // DILG ONLY
            // =====================================

            if (role !== "dilg") {

                showError(
                    "You are not authorized to access this page."
                );

                return;
            }


            // =====================================
            // LOAD BARANGAYS
            // =====================================

            await loadBarangays();


        } catch (error) {

            console.error(
                "Authentication error:",
                error
            );


            showError(
                "Failed to load barangays: " +
                error.message
            );

        }

    }
);


// =====================================
// LOAD BARANGAYS
// =====================================

async function loadBarangays() {

    try {

        // =====================================
        // GET REGISTERED BARANGAYS
        // =====================================

        const projectsSnapshot =
            await getDocs(
                collection(
                    db,
                    "projects"
                )
            );


        // =====================================
        // CREATE BARANGAY MAP
        // =====================================

        const barangayMap =
            new Map();


        // =====================================
        // LOAD THE FIXED OFFICIAL DIRECTORY FIRST
        // =====================================

        barangayDirectory.forEach(
            (barangay) => {


                barangayMap.set(
                    barangay.id,
                    {

                        barangayId:
                            barangay.id,

                        name:
                            barangay.name,

                        projectCount:
                            0,

                        budget:
                            0,

                        spent:
                            0,

                        physicalTotal:
                            0,

                        planned:
                            0,

                        ongoing:
                            0,

                        completed:
                            0,

                        submitted:
                            0,

                        verified:
                            0

                    }
                );

            }
        );


        // =====================================
        // ADD PROJECT DATA
        // =====================================

        projectsSnapshot.forEach(
            (projectDoc) => {

                const project =
                    projectDoc.data();


                const barangayId =
                    String(
                        project.barangayId ||
                        ""
                    )
                    .trim();


                if (!barangayId) {
                    return;
                }


                if (!barangayDirectoryById.has(barangayId)) {

                    return;
                }


                const barangay =
                    barangayMap.get(
                        barangayId
                    );


                // =====================================
                // PROJECT COUNT
                // =====================================

                barangay.projectCount++;


                // =====================================
                // BUDGET
                // =====================================

                barangay.budget +=
                    Number(
                        project.budget
                    ) || 0;


                // =====================================
                // SPENT
                // =====================================

                barangay.spent +=
                    Number(
                        project.spent
                    ) || 0;


                // =====================================
                // PHYSICAL PROGRESS
                // =====================================

                barangay.physicalTotal +=
                    Number(
                        project.physicalProgress
                    ) || 0;


                // =====================================
                // PROJECT STATUS
                // =====================================

                const status =
                    String(
                        project.status ||
                        "Planned"
                    )
                    .trim()
                    .toLowerCase();


                if (
                    status === "planned"
                ) {

                    barangay.planned++;

                }

                else if (
                    status === "ongoing"
                ) {

                    barangay.ongoing++;

                }

                else if (
                    status === "completed"
                ) {

                    barangay.completed++;

                }


                // =====================================
                // SUBMISSION / VERIFICATION STATUS
                // =====================================

                const verificationStatus =
                    String(
                        project.verificationStatus ||
                        project.approvalStatus ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                if (
                    verificationStatus ===
                    "submitted"
                ) {

                    barangay.submitted++;

                }


                if (
                    verificationStatus ===
                    "verified" ||
                    verificationStatus ===
                    "approved"
                ) {

                    barangay.verified++;

                }

            }
        );


        // =====================================
        // CONVERT MAP TO ARRAY
        // =====================================

        allBarangays =
            Array.from(
                barangayMap.values()
            );


        // =====================================
        // SORT ALPHABETICALLY
        // =====================================

        allBarangays.sort(
            (a, b) =>
                a.name.localeCompare(
                    b.name,
                    "en",
                    { numeric: true, sensitivity: "base" }
                )
        );


        // =====================================
        // DISPLAY
        // =====================================

        displayBarangays(
            allBarangays
        );


    } catch (error) {

        console.error(
            "Load barangays error:",
            error
        );


        showError(
            "Failed to load barangays: " +
            error.message
        );

    }

}


// =====================================
// DISPLAY BARANGAYS
// =====================================

function displayBarangays(
    barangays
) {

    barangayList.innerHTML =
        "";


    barangayCount.textContent =
        barangays.length;


    if (
        barangays.length === 0
    ) {

        barangayList.innerHTML = `

            <div class="empty">

                No barangays found.

            </div>

        `;

        return;
    }


    barangays.forEach(
        (barangay) => {

            const remaining =
                barangay.budget -
                barangay.spent;


            const utilization =
                barangay.budget > 0

                    ? (
                        barangay.spent /
                        barangay.budget
                    ) * 100

                    : 0;


            const physical =
                barangay.projectCount > 0

                    ? (
                        barangay.physicalTotal /
                        barangay.projectCount
                    )

                    : 0;


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "barangay-card";


            card.innerHTML = `

                <div class="barangay-card-header">

                    <div>

                        <div class="barangay-name">

                            ${escapeHTML(
                                barangay.name
                            )}

                        </div>


                        <div class="barangay-id">

                            ID:
                            ${escapeHTML(
                                barangay.barangayId
                            )}

                        </div>

                    </div>


                    <div class="project-count">

                        ${barangay.projectCount}

                        Project${
                            barangay.projectCount === 1
                                ? ""
                                : "s"
                        }

                    </div>

                </div>


                <!-- FINANCIAL INFORMATION -->

                <div class="financial-grid">


                    <div class="financial-box">

                        <div class="financial-label">

                            Total Budget

                        </div>


                        <div class="financial-value">

                            ${formatCurrency(
                                barangay.budget
                            )}

                        </div>

                    </div>


                    <div class="financial-box">

                        <div class="financial-label">

                            Total Spent

                        </div>


                        <div class="financial-value">

                            ${formatCurrency(
                                barangay.spent
                            )}

                        </div>

                    </div>


                    <div class="financial-box">

                        <div class="financial-label">

                            Remaining

                        </div>


                        <div class="financial-value">

                            ${formatCurrency(
                                remaining
                            )}

                        </div>

                    </div>


                </div>


                <!-- BUDGET UTILIZATION -->

                <div class="utilization-section">

                    <div class="utilization-header">

                        <span>
                            Budget Utilization
                        </span>


                        <strong>

                            ${utilization.toFixed(2)}%

                        </strong>

                    </div>


                    <div class="utilization-container">

                        <div
                            class="utilization-bar"
                            style="
                                width:
                                ${Math.min(
                                    Math.max(
                                        utilization,
                                        0
                                    ),
                                    100
                                )}%;
                            "
                        ></div>

                    </div>

                </div>


                <!-- PROJECT STATUS -->

                <div class="status-row">


                    <div class="status-item">

                        Planned:

                        <strong>
                            ${barangay.planned}/${barangay.projectCount}
                        </strong>

                    </div>


                    <div class="status-item">

                        Ongoing:

                        <strong>
                            ${barangay.ongoing}/${barangay.projectCount}
                        </strong>

                    </div>


                    <div class="status-item">

                        Completed:

                        <strong>
                            ${barangay.completed}/${barangay.projectCount}
                        </strong>

                    </div>


                    <div class="status-item">

                        Physical:

                        <strong>
                            ${physical.toFixed(2)}%
                        </strong>

                    </div>


                </div>


                <!-- DILG MONITORING -->

                <div class="status-row">


                    <div class="status-item">

                        Submitted:

                        <strong>
                            ${barangay.submitted}
                        </strong>

                    </div>


                    <div class="status-item">

                        Verified:

                        <strong>
                            ${barangay.verified}
                        </strong>

                    </div>

                </div>


                <!-- VIEW ONLY -->

                <div class="card-actions">

                    <button
                        class="view-btn"
                        type="button"
                    >

                        View Projects

                    </button>

                </div>

            `;


            barangayList.appendChild(
                card
            );


            // =====================================
            // VIEW PROJECTS
            // =====================================

            const viewButton =
                card.querySelector(
                    ".view-btn"
                );


            viewButton.addEventListener(
                "click",
                () => {

                    window.location.href =
                        `barangay-details.html?barangay=${encodeURIComponent(
                            barangay.barangayId
                        )}`;

                }
            );

        }
    );

}


// =====================================
// SEARCH
// =====================================

searchInput.addEventListener(
    "input",
    () => {

        const search =
            searchInput.value
                .trim()
                .toLowerCase();


        if (!search) {

            displayBarangays(
                allBarangays
            );

            return;
        }


        const filtered =
            allBarangays.filter(
                (barangay) => {

                    return (

                        barangay.name
                            .toLowerCase()
                            .includes(
                                search
                            )

                        ||

                        barangay.barangayId
                            .toLowerCase()
                            .includes(
                                search
                            )

                    );

                }
            );


        displayBarangays(
            filtered
        );

    }
);


// =====================================
// GET BARANGAY NAME
// =====================================

function getBarangayName(
    project,
    barangayId
) {

    if (
        project.barangayName
    ) {

        return String(
            project.barangayName
        );

    }


    if (
        project.barangay
    ) {

        return String(
            project.barangay
        );

    }


    return barangayId;

}


// =====================================
// FORMAT CURRENCY
// =====================================

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
// ERROR
// =====================================

function showError(
    text
) {

    if (message) {

        message.textContent =
            text;

    }

}


// =====================================
// NAVIGATION
// =====================================

dashboardBtn.addEventListener(
    "click",
    () => {

        window.location.href =
            "dilg-dashboard.html";

    }
);


barangaysBtn.addEventListener(
    "click",
    () => {

        window.location.href =
            "barangays.html";

    }
);


projectsBtn.addEventListener(
    "click",
    () => {

        window.location.href =
            "dilg-projects.html";

    }
);


// =====================================
// LOGOUT
// =====================================

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


            showError(
                "Failed to logout."
            );

        }

    }
);
