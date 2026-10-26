const DARK_MODE_KEY = "barangayTrackerDarkMode";

function getSavedMode() {
    try {
        return localStorage.getItem(DARK_MODE_KEY) === "true";
    } catch (_) {
        return false;
    }
}

function setDarkMode(enabled) {
    document.documentElement.classList.toggle("dark-mode", enabled);
    document.body.classList.toggle("dark-mode", enabled);

    try {
        localStorage.setItem(DARK_MODE_KEY, String(enabled));
    } catch (_) {
        // Dark mode still works for the current page if storage is unavailable.
    }

    const button = document.getElementById("darkModeToggle");

    if (button) {
        button.setAttribute(
            "aria-label",
            enabled ? "Switch to light mode" : "Switch to dark mode"
        );
        button.title = enabled ? "Light mode" : "Dark mode";

        const icon = button.querySelector(".theme-toggle-knob");
        const label = button.querySelector(".dark-mode-label");

        if (icon) icon.textContent = enabled ? "\u263e" : "\u2600";
        if (label) label.textContent = enabled ? "Night Mode" : "Light Mode";
    }
}

function ensureLatestDarkStyles() {
    if (document.getElementById("darkModeLatestStyles")) return;

    const styles = document.createElement("link");
    styles.id = "darkModeLatestStyles";
    styles.rel = "stylesheet";
    styles.href = "./css/dark-mode.css?v=20260904-light-numbers-black";
    document.head.append(styles);
}

function initializeDarkMode() {
    ensureLatestDarkStyles();

    let button = document.getElementById("darkModeToggle");

    if (!button) {
        button = document.createElement("button");
        button.id = "darkModeToggle";
        button.type = "button";
        button.className = "dark-mode-floating";
        button.innerHTML = '<span class="theme-toggle-track"><span class="theme-toggle-knob">\u2600</span></span><span class="dark-mode-label">Light Mode</span>';

        const dateBox = document.querySelector(".date-box");

        if (dateBox?.parentElement) {
            button.classList.add("dark-mode-header");
            dateBox.insertAdjacentElement("afterend", button);
        } else {
            document.body.append(button);
        }
    }

    setDarkMode(getSavedMode());

    button.addEventListener("click", () => {
        setDarkMode(!document.body.classList.contains("dark-mode"));
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDarkMode);
} else {
    initializeDarkMode();
}
