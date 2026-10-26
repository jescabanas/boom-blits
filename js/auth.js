import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "./firebase-config.js";

const auth = getAuth(app);
const db = getFirestore(app);

const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        // Login sa Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;

        console.log("Logged in:", user.uid);

        // Kunin ang user profile sa Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            message.textContent = "User profile not found.";
            return;
        }

        const userData = userDoc.data();

        console.log("User profile:", userData);

        // Check role
        if (userData.role === "barangay") {

            window.location.href = "barangay.html";

        } else {

            message.textContent = "Unknown user role.";

        }

    } catch (error) {

        console.error("Login error:", error);

        message.textContent = "Login failed: " + error.message;
    }
});