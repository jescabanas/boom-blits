import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "./firebase-config.js";

const auth = getAuth(app);
const db = getFirestore(app);
const activityList = document.getElementById("citizenActivityList");
const activityCount = document.getElementById("activityCount");
const barangayTitle = document.getElementById("barangayTitle");
const message = document.getElementById("message");

function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = String(value || "");
    return element.innerHTML;
}

function formatDate(timestamp) {
    if (!timestamp?.toDate) return "Just now";
    return timestamp.toDate().toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function getInitials(name) {
    return String(name || "Citizen")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

async function loadActivity(barangayId) {
    const snapshot = await getDocs(query(
        collection(db, "citizenActivity"),
        where("barangayId", "==", barangayId)
    ));

    const activities = snapshot.docs.map((item) => item.data())
        .sort((first, second) => (
            second.createdAt?.toDate?.().getTime() || 0
        ) - (
            first.createdAt?.toDate?.().getTime() || 0
        ));

    if (activities.length === 0) {
        activityCount.textContent = "0";
        activityList.innerHTML = '<div class="activity-empty">No citizen dashboard activity yet.</div>';
        return;
    }

    activityCount.textContent = activities.length;

    activityList.innerHTML = activities.map((activity) => `
        <div class="activity-item">
            <div class="activity-avatar">${escapeHTML(getInitials(activity.citizenName))}</div>
            <div class="activity-person">${escapeHTML(activity.citizenName || "Citizen")}</div>
            <div class="activity-details">${escapeHTML(activity.activity || "Viewed Citizen Dashboard")}<span>${escapeHTML(formatDate(activity.createdAt))}</span></div>
        </div>
    `).join("");
}

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.replace("login.html"); return; }
    try {
        const profileSnapshot = await getDoc(doc(db, "users", user.uid));
        const profile = profileSnapshot.data();
        if (!profileSnapshot.exists() || String(profile.role || "").toLowerCase() !== "barangay") {
            window.location.replace("login.html");
            return;
        }
        const barangayId = String(profile.barangayId || "").trim();
        barangayTitle.textContent = `Activity for ${barangayId}`;
        await loadActivity(barangayId);
    } catch (error) {
        console.error("Failed to load citizen activity:", error);
        activityList.innerHTML = '<div class="activity-empty">Unable to load citizen activity. Check Firestore Rules, then refresh.</div>';
        message.textContent = error.message;
    }
});

document.getElementById("logoutBtn").addEventListener("click", async () => { await signOut(auth); window.location.href = "login.html"; });
