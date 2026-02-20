async function loadComponent(elementId, url) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    const html = await response.text();
    element.innerHTML = html;

    // Trigger custom event for other scripts to know the component is ready
    element.dispatchEvent(
      new CustomEvent("componentLoaded", {
        detail: { id: elementId, url: url },
      }),
    );
  } catch (error) {
    console.error("Error loading component:", error);
  }
}

// Automatically load common components on DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
  // Load Header
  await loadComponent("appHeader", "components/header.html");

  // Load Left Sidebar
  await loadComponent("appMenubar", "components/sidebar.html");

  // Load Right Sidebar
  await loadComponent("appRightSidebar", "components/sidebar-right.html");

  // Load Sidebar Modals shell
  await loadComponent("appSidebarModals", "components/sidebar-modals.html");

  // Load Modals
  await loadComponent("appModals", "components/modals.html");

  // Load Individual Panel Components into both Desktop Sidebar and Mobile Tabs
  const panels = [
    { name: "ask-ai", file: "ask-ai.html" },
    { name: "team", file: "team.html" },
    { name: "connect", file: "connect.html" },
    { name: "assign-email", file: "assign-email.html" },
    { name: "open-email", file: "open-email.html" },
    { name: "unopen-email", file: "unopen-email.html" },
  ];

  for (const panel of panels) {
    const desktopId = `content-${panel.name}-desktop`;
    const mobileId = `content-${panel.name}-mobile`;
    const filePath = `components/panels/${panel.file}`;

    // Load into Desktop Sidebar Shell (if exists)
    if (document.getElementById(desktopId)) {
      await loadComponent(desktopId, filePath);
    }
    // Load into Mobile Tabs Shell (if exists)
    if (document.getElementById(mobileId)) {
      await loadComponent(mobileId, filePath);
    }
  }

  // Re-initialize main UI features from main.js (sidebar togglers, tooltips, etc.)
  if (typeof window.initMainFeatures === "function") {
    window.initMainFeatures();
  }

  // Trigger app integration after layout is ready
  if (typeof initAppIntegration === "function") {
    initAppIntegration();
  }
});

function initAppIntegration() {
  // Detect which page we are on
  const hasInboxTab = document.getElementById("inbox-tab");
  const isInboxPage = hasInboxTab || window.location.pathname.includes("inbox");
  const isReadEmailPage =
    document.querySelector(".mail-read-wrapper") ||
    window.location.pathname.includes("read-email");

  if (hasInboxTab) {
    // We check for the element specifically because initInboxIntegration needs it
    if (typeof initInboxIntegration === "function") {
      initInboxIntegration();
    }
  } else if (isReadEmailPage) {
    if (typeof initReadEmailIntegration === "function") {
      initReadEmailIntegration();
    }
  }
}
