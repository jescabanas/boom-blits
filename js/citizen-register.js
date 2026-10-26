import {
    getAuth,
    createUserWithEmailAndPassword
} from "firebase/auth";

import {
    getFirestore,
    doc,
    setDoc,
    updateDoc
} from "firebase/firestore";

import { app } from "./firebase-config.js";
import { supabaseUrl, supabasePublishableKey } from "./supabase-config.js";
import {
    barangayDirectory,
    barangayDirectoryById
} from "./barangay-directory.js";


const auth = getAuth(app);
const db = getFirestore(app);


// =====================================
// HTML ELEMENTS
// =====================================

const registerForm =
    document.getElementById("registerForm");

const firstNameInput =
    document.getElementById("firstName");

const surnameInput =
    document.getElementById("surname");

const barangaySelect =
    document.getElementById("barangayId");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const confirmPasswordInput =
    document.getElementById("confirmPassword");

const barangayProofInput = document.getElementById("barangayProof");

const message =
    document.getElementById("message");

const registerButton =
    document.getElementById("registerButton");

const loginLink =
    document.getElementById("loginLink");

const registrationCard =
    document.querySelector(".register-card");

const registrationInfoPanel =
    document.querySelector(".register-intro-panel");

function validateVerificationFile(file) {
    const extension = file?.name.split(".").pop()?.toLowerCase();
    return file && ["pdf", "jpg", "jpeg", "png"].includes(extension) && file.size <= 10 * 1024 * 1024;
}

async function uploadVerificationDocument(user, barangayProof) {
    const formData = new FormData();
    formData.append("action", "upload-citizen-verification");
    formData.append("barangayProof", barangayProof);
    const response = await fetch(`${supabaseUrl}/functions/v1/project-documents`, {
        method: "POST",
        headers: { apikey: supabasePublishableKey, "x-firebase-token": await user.getIdToken(true) },
        body: formData
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "File upload failed.");
    return result.documents;
}


if (loginLink) {

    loginLink.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            loginLink.setAttribute("aria-disabled", "true");

            registrationCard?.classList.add(
                "login-transition"
            );

            let loginRedirected = false;

            const openLogin = () => {

                if (loginRedirected) return;

                loginRedirected = true;

                window.location.href = "login.html";

            };

            registrationInfoPanel?.addEventListener(
                "animationend",
                (animationEvent) => {

                    if (
                        animationEvent.animationName ===
                        "signupPanelMoveLeft"
                    ) {

                        openLogin();

                    }

                },
                { once: true }
            );

            setTimeout(openLogin, 650);

        }
    );
}


// =====================================
// LOAD BARANGAYS
// =====================================

function loadBarangays() {

    barangayDirectory.forEach(
        (barangay) => {


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    barangay.id;


                option.textContent =
                    barangay.name;


                barangaySelect.appendChild(
                    option
                );

        }
    );

}


// =====================================
// REGISTER
// =====================================

registerForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const firstName =
            firstNameInput.value.trim();


        const surname =
            surnameInput.value.trim();


        const barangayId =
            barangaySelect.value;


        const email =
            emailInput.value.trim();


        const password =
            passwordInput.value;


        const confirmPassword =
            confirmPasswordInput.value;

        const barangayProof = barangayProofInput.files[0];


        // =====================================
        // VALIDATION
        // =====================================

        if (
            !firstName ||
            !surname ||
            !barangayId ||
            !email ||
            !password ||
            !confirmPassword ||
            !barangayProof
        ) {

            showMessage(
                "Please complete all fields.",
                "error"
            );

            return;
        }

        if (!barangayDirectoryById.has(barangayId)) {

            showMessage(
                "Please select a barangay from the official list.",
                "error"
            );

            return;
        }


        if (
            password !==
            confirmPassword
        ) {

            showMessage(
                "Passwords do not match.",
                "error"
            );

            return;
        }


        if (
            password.length < 6
        ) {

            showMessage(
                "Password must be at least 6 characters.",
                "error"
            );

            return;
        }

        if (!validateVerificationFile(barangayProof)) {
            showMessage("The file must be PDF, JPG, JPEG, or PNG and no larger than 10 MB.", "error");
            return;
        }


        // =====================================
        // DISABLE BUTTON
        // =====================================

        registerButton.disabled =
            true;


        registerButton.textContent =
            "Submitting...";


        try {

            // =====================================
            // CREATE FIREBASE AUTH ACCOUNT
            // =====================================

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const user =
                userCredential.user;


            // =====================================
            // CREATE USER PROFILE
            // =====================================

            await setDoc(
                doc(
                    db,
                    "users",
                    user.uid
                ),
                {

                    firstName:
                        firstName,

                    surname:
                        surname,

                    email:
                        email,

                    barangayId:
                        barangayId,

                    role:
                        "citizen",

                    status:
                        "pending",

                    createdAt:
                        new Date()

                }
            );

            registerButton.textContent = "Uploading files...";
            const verificationDocuments = await uploadVerificationDocument(user, barangayProof);
            await updateDoc(doc(db, "users", user.uid), { verificationDocuments });
            await setDoc(doc(db, "citizenApplications", user.uid), {
                firstName,
                surname,
                email,
                barangayId,
                citizenUid: user.uid,
                status: "pending",
                verificationDocuments,
                createdAt: new Date()
            });


            // =====================================
            // GO TO CONFIRMATION PAGE
            // =====================================

            window.location.href =
                "citizen-confirmation.html";


        } catch (error) {

            console.error(
                "Registration error:",
                error
            );


            let errorMessage =
                "Registration failed.";


            if (
                error.code ===
                "auth/email-already-in-use"
            ) {

                errorMessage =
                    "This email is already registered.";

            } else if (
                error.code ===
                "auth/invalid-email"
            ) {

                errorMessage =
                    "Invalid email address.";

            } else if (
                error.code ===
                "auth/weak-password"
            ) {

                errorMessage =
                    "Password is too weak.";

            } else if (
                error.code ===
                "permission-denied"
            ) {

                errorMessage =
                    "Registration was blocked by Firestore rules.";

            } else {

                errorMessage =
                    error.message;

            }


            showMessage(
                errorMessage,
                "error"
            );


            registerButton.disabled =
                false;


            registerButton.textContent =
                "Submit Registration";

        }

    }
);


// =====================================
// MESSAGE
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
// START
// =====================================

loadBarangays();
