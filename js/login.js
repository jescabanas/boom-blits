import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    sendPasswordResetEmail
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


const auth = getAuth(app);
const db = getFirestore(app);


// =====================================
// HTML ELEMENTS
// =====================================

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const rememberMeInput =
    document.getElementById("rememberMe");

const message =
    document.getElementById("message");

const registerBtn =
    document.getElementById("registerBtn");

const loginWrapper =
    document.querySelector(".login-wrapper");

const signupWrapper =
    document.getElementById("signupWrapper");

const backToLoginBtn =
    document.getElementById("backToLoginBtn");

const citizenForgotPasswordBtn =
    document.getElementById("citizenForgotPasswordBtn");

// =====================================
// CITIZEN PASSWORD RESET
// =====================================

if (citizenForgotPasswordBtn) {

    citizenForgotPasswordBtn.addEventListener(
        "click",
        async () => {

            const email =
                emailInput.value.trim();

            if (!email) {

                showMessage(
                    "Enter your citizen email address first.",
                    "error"
                );

                emailInput.focus();

                return;
            }

            const originalText =
                citizenForgotPasswordBtn.textContent;

            try {

                citizenForgotPasswordBtn.disabled =
                    true;

                citizenForgotPasswordBtn.textContent =
                    "Sending...";

                await sendPasswordResetEmail(
                    auth,
                    email
                );

                showMessage(
                    "If this is a registered citizen email, password reset instructions have been sent.",
                    "success"
                );

            } catch (error) {

                console.error(
                    "Citizen password reset error:",
                    error
                );

                if (
                    error.code === "auth/invalid-email"
                ) {

                    showMessage(
                        "Enter a valid citizen email address.",
                        "error"
                    );

                } else if (
                    error.code === "auth/too-many-requests"
                ) {

                    showMessage(
                        "Too many reset attempts. Please try again later.",
                        "error"
                    );

                } else {

                    showMessage(
                        "Unable to send the reset email. Please try again.",
                        "error"
                    );
                }

            } finally {

                citizenForgotPasswordBtn.disabled =
                    false;

                citizenForgotPasswordBtn.textContent =
                    originalText;
            }
        }
    );
}

async function recordCitizenLogin(user, userData, barangayId) {

    const citizenName =
        userData.name ||
        [
            userData.firstName,
            userData.surname || userData.lastName
        ]
        .filter(Boolean)
        .join(" ") ||
        "Citizen";

    try {

        await addDoc(
            collection(
                db,
                "citizenActivity"
            ),
            {
                citizenUid: user.uid,
                citizenName,
                barangayId,
                activity: "Logged in to Citizen Dashboard",
                createdAt: serverTimestamp()
            }
        );

    } catch (error) {

        console.warn(
            "Could not record citizen login:",
            error
        );
    }
}


// =====================================
// LOGIN
// =====================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;

            const shouldRememberUser =
                Boolean(rememberMeInput?.checked);


            // =====================================
            // VALIDATION
            // =====================================

            if (!email || !password) {

                showMessage(
                    "Please enter your email and password.",
                    "error"
                );

                return;
            }


            // =====================================
            // DISABLE LOGIN BUTTON
            // =====================================

            const loginButton =
                loginForm.querySelector(
                    "button[type='submit']"
                );


            if (loginButton) {

                loginButton.disabled =
                    true;

                loginButton.textContent =
                    "Logging in...";

            }


            try {

                // =====================================
                // LOGIN PERSISTENCE
                // =====================================

                await setPersistence(
                    auth,
                    shouldRememberUser
                        ? browserLocalPersistence
                        : browserSessionPersistence
                );


                // =====================================
                // FIREBASE LOGIN
                // =====================================

                const userCredential =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


                console.log(
                    "Firebase UID:",
                    user.uid
                );


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


                    showMessage(
                        "User profile not found in Firestore.",
                        "error"
                    );

                    return;
                }


                const userData =
                    userSnapshot.data();


                console.log(
                    "Logged in user:",
                    userData
                );


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
                    "User role:",
                    role
                );


                // =====================================
                // BARANGAY
                // =====================================

                if (
                    role === "barangay"
                ) {

                    showMessage(
                        "Login successful! Redirecting...",
                        "success"
                    );


                    setTimeout(
                        () => {

                            window.location.href =
                                "barangay.html";

                        },
                        500
                    );


                    return;
                }


                // =====================================
                // DILG
                // =====================================

                if (
                    role === "dilg"
                ) {

                    showMessage(
                        "Login successful! Redirecting to DILG Dashboard...",
                        "success"
                    );


                    setTimeout(
                        () => {

                            window.location.href =
                                "dilg-dashboard.html";

                        },
                        500
                    );


                    return;
                }


                // =====================================
                // CITIZEN
                // =====================================

                if (
                    role === "citizen"
                ) {

                    const status =
                        String(
                            userData.status || ""
                        )
                        .trim()
                        .toLowerCase();


                    const barangayId =
                        String(
                            userData.barangayId || ""
                        )
                        .trim();


                    // =====================================
                    // CHECK BARANGAY
                    // =====================================

                    if (!barangayId) {

                        await signOut(auth);


                        showMessage(
                            "Your account has no assigned barangay. Please contact the barangay.",
                            "error"
                        );


                        return;
                    }


                    // =====================================
                    // PENDING
                    // =====================================

                    if (
                        status === "pending"
                    ) {

                        await signOut(auth);


                        showMessage(
                            "Your account is still pending. Please wait for your barangay to approve your registration.",
                            "error"
                        );


                        return;
                    }


                    // =====================================
                    // REJECTED
                    // =====================================

                    if (
                        status === "rejected"
                    ) {

                        const reason =
                            String(
                                userData.rejectionReason || ""
                            )
                            .trim();


                        await signOut(auth);


                        if (reason) {

                            showMessage(
                                "Your registration was rejected. Reason: " +
                                reason,
                                "error"
                            );

                        }

                        else {

                            showMessage(
                                "Your registration was rejected by the barangay.",
                                "error"
                            );

                        }


                        return;
                    }


                    // =====================================
                    // APPROVED
                    // =====================================

                    if (
                        status === "approved"
                    ) {

                        await recordCitizenLogin(
                            user,
                            userData,
                            barangayId
                        );

                        showMessage(
                            "Login successful! Redirecting to Citizen Dashboard...",
                            "success"
                        );


                        setTimeout(
                            () => {

                                window.location.href =
                                    "citizen.html";

                            },
                            500
                        );


                        return;
                    }


                    // =====================================
                    // UNKNOWN CITIZEN STATUS
                    // =====================================

                    await signOut(auth);


                    showMessage(
                        "Your account has an invalid approval status. Please contact your barangay.",
                        "error"
                    );


                    return;
                }


                // =====================================
                // UNKNOWN ROLE
                // =====================================

                await signOut(auth);


                showMessage(
                    "Unknown user role: " +
                    (
                        userData.role ||
                        "none"
                    ),
                    "error"
                );


            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                let errorMessage =
                    "Login failed.";


                // =====================================
                // FIREBASE AUTH ERRORS
                // =====================================

                if (
                    error.code ===
                    "auth/invalid-credential"
                ) {

                    errorMessage =
                        "Invalid email or password.";

                }

                else if (
                    error.code ===
                    "auth/user-not-found"
                ) {

                    errorMessage =
                        "User account not found.";

                }

                else if (
                    error.code ===
                    "auth/wrong-password"
                ) {

                    errorMessage =
                        "Incorrect password.";

                }

                else if (
                    error.code ===
                    "auth/invalid-email"
                ) {

                    errorMessage =
                        "Invalid email address.";

                }

                else if (
                    error.code ===
                    "auth/too-many-requests"
                ) {

                    errorMessage =
                        "Too many login attempts. Please try again later.";

                }

                else if (
                    error.code ===
                    "permission-denied"
                ) {

                    errorMessage =
                        "Missing or insufficient permissions.";

                }

                else {

                    errorMessage =
                        "Login failed: " +
                        error.message;

                }


                showMessage(
                    errorMessage,
                    "error"
                );


            } finally {

                if (loginButton) {

                    loginButton.disabled =
                        false;

                    loginButton.textContent =
                        "Login";

                }

            }

        }
    );

}


// =====================================
// CREATE CITIZEN ACCOUNT
// =====================================

if (registerBtn) {

    registerBtn.addEventListener(
        "click",
        () => {

            registerBtn.disabled = true;

            loginWrapper?.classList.add(
                "registration-transition"
            );

            const openCitizenRegistration = () => {

                loginWrapper.hidden = true;
                loginWrapper.classList.remove(
                    "registration-transition"
                );

                signupWrapper.hidden = false;
                signupWrapper.classList.add("active");
                registerBtn.disabled = false;
            };

            setTimeout(
                () => {

                    if (!loginWrapper.hidden) {

                        openCitizenRegistration();

                    }

                },
                280
            );

        }
    );

}


if (backToLoginBtn) {

    backToLoginBtn.addEventListener(
        "click",
        () => {

            signupWrapper.classList.add("login-transition");

            const openLogin = () => {

                signupWrapper.hidden = true;
                signupWrapper.classList.remove(
                    "active",
                    "login-transition"
                );

                loginWrapper.hidden = false;
            };

            setTimeout(
                () => {

                    if (!signupWrapper.hidden) {

                        openLogin();

                    }

                },
                280
            );

        }
    );
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

    }

    else {

        message.style.color =
            "#991b1b";

    }

}
