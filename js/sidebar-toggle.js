function initializeSidebarToggle() {

    const sidebar = document.querySelector(".sidebar");

    if (!sidebar || sidebar.dataset.toggleReady === "true") {
        return;
    }

    const logo = sidebar.querySelector(".logo");
    const sidebarTop = sidebar.querySelector(".sidebar-top") || sidebar;
    const navigation = sidebar.querySelector(".navigation");
    const navigationLabel = String(
        navigation?.querySelector(".nav-label")?.textContent || ""
    ).trim().toUpperCase();

    if (logo && !logo.querySelector(".logo-mark")) {

        const logoMark = document.createElement("div");
        logoMark.className = "logo-mark";
        logoMark.textContent = "BT";
        logo.prepend(logoMark);
    }

    if (navigationLabel === "DILG ADMIN") {

        logo?.querySelector(".logo-mark")?.replaceChildren("BT");

        const dilgIcons = {
            Dashboard: "\u2302",
            Barangays: "\u25a6",
            Projects: "\u25a3",
            "Project Validation": "\u2713",
            Logout: "\u21aa"
        };

        sidebar.querySelectorAll(
            ".nav-item, .logout-btn"
        ).forEach((item) => {

            const label = String(
                item.querySelector("span:last-child")?.textContent || ""
            ).trim();

            const icon = item.querySelector(".nav-icon");

            if (icon && dilgIcons[label]) {
                icon.textContent = dilgIcons[label];
            }
        });
    }

    const sharedNavigationIcons = {
        Dashboard: "\u2302",
        Projects: "\u25a3",
        "Add Project": "\uff0b",
        "Citizen Feedback": "\u2637",
        "Citizen Activity": "\u25f7",
        Logout: "\u21aa"
    };

    sidebar.querySelectorAll(
        ".nav-item, .logout-btn"
    ).forEach((item) => {

        const label = String(
            item.querySelector("span:last-child")?.textContent || ""
        ).trim();

        const icon = item.querySelector(".nav-icon");

        if (icon && sharedNavigationIcons[label]) {
            icon.textContent = sharedNavigationIcons[label];
        }
    });

    const logoMark = logo?.querySelector(".logo-mark");

    if (logoMark) {
        const logoImage = document.createElement("img");
        logoImage.src = "./assets/barangay-tracker-logo.jpg";
        logoImage.alt = "Barangay Tracker";
        logoImage.decoding = "async";
        logoMark.classList.add("brand-logo-mark");
        logoMark.replaceChildren(logoImage);
    }

    let toggle = document.getElementById("sidebarToggle");

    if (!toggle) {

        toggle = document.createElement("button");
        toggle.className = "sidebar-toggle";
        toggle.id = "sidebarToggle";
        toggle.type = "button";
        toggle.textContent = "\u2630";
    }

    toggle.classList.add("nav-item", "sidebar-toggle");

    if (navigation) {

        const navLabel = navigation.querySelector(".nav-label");

        navigation.insertBefore(
            toggle,
            navLabel?.nextSibling || navigation.firstChild
        );

    } else if (toggle.parentElement !== sidebarTop) {

        sidebarTop.insertBefore(
            toggle,
            logo?.nextSibling || sidebarTop.firstChild
        );
    }

    const setCollapsed = (isCollapsed) => {

        document.documentElement.classList.toggle(
            "sidebar-collapsed",
            isCollapsed
        );

        document.body.classList.toggle(
            "sidebar-collapsed",
            isCollapsed
        );

        toggle.setAttribute(
            "aria-label",
            isCollapsed ? "Expand navigation" : "Collapse navigation"
        );

        toggle.setAttribute(
            "aria-expanded",
            String(!isCollapsed)
        );

        toggle.title = isCollapsed
            ? "Expand navigation"
            : "Collapse navigation";
    };

    try {

        setCollapsed(
            localStorage.getItem("sidebarCollapsed") === "true"
        );

    } catch (_) {

        setCollapsed(false);
    }

    toggle.addEventListener("click", () => {

        const isCollapsed = !document.body.classList.contains(
            "sidebar-collapsed"
        );

        setCollapsed(isCollapsed);

        try {

            localStorage.setItem(
                "sidebarCollapsed",
                String(isCollapsed)
            );

        } catch (_) {
            // The menu still works when browser storage is unavailable.
        }
    });

    sidebar.dataset.toggleReady = "true";
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSidebarToggle);
} else {
    initializeSidebarToggle();
}
