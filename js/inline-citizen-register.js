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

const signupForm = document.getElementById("signupForm");
const signupBarangay = document.getElementById("signupBarangay");
const signupMessage = document.getElementById("signupMessage");
const signupSubmitButton = document.getElementById("signupSubmitButton");

document.querySelectorAll(".signup-password-toggle").forEach((toggleButton) => {
    toggleButton.addEventListener("click", () => {
        const passwordField = document.getElementById(
            toggleButton.dataset.passwordTarget
        );

        if (!passwordField) return;

        const isHidden = passwordField.type === "password";
        passwordField.type = isHidden ? "text" : "password";
        toggleButton.textContent = isHidden ? "Hide" : "Show";
    });
});

barangayDirectory.forEach((barangay) => {
    const option = document.createElement("option");
    option.value = barangay.id;
    option.textContent = barangay.name;
    signupBarangay?.appendChild(option);
});

function showSignupMessage(text, type) {
    if (!signupMessage) return;
    signupMessage.textContent = text;
    signupMessage.style.color = type === "error" ? "#b91c1c" : "#166534";
}

function validateVerificationFile(file) {
    const allowedExtensions = ["pdf", "jpg", "jpeg", "png"];
    const extension = file?.name.split(".").pop()?.toLowerCase();
    return file && allowedExtensions.includes(extension) && file.size <= 10 * 1024 * 1024;
}

async function uploadVerificationDocument(user, barangayProof) {
    const formData = new FormData();
    formData.append("action", "upload-citizen-verification");
    formData.append("barangayProof", barangayProof);

    const response = await fetch(`${supabaseUrl}/functions/v1/project-documents`, {
        method: "POST",
        headers: {
            apikey: supabasePublishableKey,
            "x-firebase-token": await user.getIdToken(true)
        },
        body: formData
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "File upload failed.");
    return result.documents;
}

signupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstName = document.getElementById("signupFirstName").value.trim();
    const surname = document.getElementById("signupSurname").value.trim();
    const barangayId = signupBarangay.value;
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;
    const barangayProof = document.getElementById("signupBarangayProof").files[0];

    if (!firstName || !surname || !barangayId || !email || !password || !confirmPassword || !barangayProof) {
        showSignupMessage("Please complete all fields.", "error");
        return;
    }

    if (!barangayDirectoryById.has(barangayId)) {
        showSignupMessage("Please select a barangay from the official list.", "error");
        return;
    }

    if (password !== confirmPassword) {
        showSignupMessage("Passwords do not match.", "error");
        return;
    }

    if (password.length < 6) {
        showSignupMessage("Password must be at least 6 characters.", "error");
        return;
    }

    if (!validateVerificationFile(barangayProof)) {
        showSignupMessage("The file must be PDF, JPG, JPEG, or PNG and no larger than 10 MB.", "error");
        return;
    }

    signupSubmitButton.disabled = true;
    signupSubmitButton.textContent = "Submitting...";

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        await setDoc(doc(db, "users", userCredential.user.uid), {
            firstName,
            surname,
            email,
            barangayId,
            role: "citizen",
            status: "pending",
            createdAt: new Date()
        });

        signupSubmitButton.textContent = "Uploading files...";
        const verificationDocuments = await uploadVerificationDocument(userCredential.user, barangayProof);

        await updateDoc(doc(db, "users", userCredential.user.uid), { verificationDocuments });
        await setDoc(doc(db, "citizenApplications", userCredential.user.uid), {
            firstName,
            surname,
            email,
            barangayId,
            citizenUid: userCredential.user.uid,
            status: "pending",
            verificationDocuments,
            createdAt: new Date()
        });

        window.location.href = "citizen-confirmation.html";
    } catch (error) {
        const errors = {
            "auth/email-already-in-use": "This email is already registered.",
            "auth/invalid-email": "Invalid email address.",
            "auth/weak-password": "Password is too weak.",
            "permission-denied": "Registration was blocked by Firestore rules."
        };

        showSignupMessage(errors[error.code] || error.message || "Registration failed.", "error");
        signupSubmitButton.disabled = false;
        signupSubmitButton.textContent = "Submit Registration";
    }
});
