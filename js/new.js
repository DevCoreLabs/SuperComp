/**
 * API Integration for Dynamic Email Loading
 * Handles fetching emails for Inbox, Draft, Spam, Sent, and Starred tabs.
 * Also handles loading single email details on read-email.html.
 */

const API_BASE = "https://api.mail.supercomp.ai/api";

const API_ENDPOINTS = {
  login: `${API_BASE}/user_login`,
  emailCounts: `${API_BASE}/email-counts`,
  emails: `${API_BASE}/emails`, // Query params: email, filter/folder, page
  emailDetail: `${API_BASE}/emails`, // Appendix: /{id}
  autoLabels: `${API_BASE}/auto-labels`,
  customAutoLabels: `${API_BASE}/auto-labels/custom`,
  buildOwnForm: `${API_BASE}/auto-labels/form`,
  smartSort: `${API_BASE}/smart-sort`,
  remindersConfig: `${API_BASE}/reminders/config`,
  remindersSet: `${API_BASE}/reminders/set`,
  remindersConfirm: `${API_BASE}/reminders/confirm-datetime`,
  templatesConfig: `${API_BASE}/templates/ui-config`,
  templatesList: `${API_BASE}/templates`,
  templatesVariables: `${API_BASE}/templates/variables`,
  settings: `${API_BASE}/settings`,
  addSubUser: `${API_BASE}/settings/add-sub-user`,
  automaticReplies: `${API_BASE}/settings/automatic-replies`,
  signature: `${API_BASE}/settings/signature`,
  signaturesList: `${API_BASE}/signatures`,
  createSubUser: `${API_BASE}/sub-users`,
  saveAutoReplies: `${API_BASE}/auto-replies`,
  updateSignature: `${API_BASE}/signatures`,
  askAI: `${API_BASE}/ask-ai`,
  teamConfig: `${API_BASE}/team-members`,
  teamInvite: `${API_BASE}/team/invite`,
  talkToSales: `${API_BASE}/team/talk-to-sales`,
  unopenedEmails: `${API_BASE}/emails/unopened`,
  openedEmails: `${API_BASE}/emails/opened`,
  assignEmail: `${API_BASE}/emails/assign-modal`,
  connect: `${API_BASE}/connect`,
};

// Settings Tab Configuration
const SETTINGS_TAB_CONFIG = {
  edit_profile: {
    target: "#v-pills-profile",
    endpoint: `${API_BASE}/settings`,
    render: (content) => renderSettingsEditProfile(content),
  },
  add_sub_user: {
    target: "#v-pills-subuser",
    endpoint: `${API_BASE}/settings/add-sub-user`,
    render: (content) => renderSettingsAddSubUser(content),
  },
  signature: {
    target: "#v-pills-signature",
    endpoint: `${API_BASE}/settings/signature`,
    render: (content) => renderSettingsSignature(content),
  },
  automatic_replies: {
    target: "#v-pills-automaticreply",
    endpoint: `${API_BASE}/settings/automatic-replies`,
    render: (content) => renderSettingsAutomaticReplies(content),
  },
};

const APP_SPINNER_HTML = `
  <div class="d-flex justify-content-center align-items-center h-100 p-5 text-center">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
`;

/**
 * Gets the Authorization headers with the token from localStorage
 */
function getAuthHeaders() {
  const token = localStorage.getItem("auth_token") || "";
  return {
    Authorization: `Bearer ${token}`,
    // "X-Client-Type": "api",
    "Content-Type": "application/json",
  };
}

/**
 * Shows a toast notification using Toastify-js
 * @param {string} message - The message to show
 * @param {string} type - 'success', 'error', 'info', 'warning'
 */
function showAppToast(message, type = "success") {
  let bgColor = "#323232"; // Gmail's dark snackbar color
  if (type === "error") bgColor = "#d93025"; // Gmail error red
  // Removed warning and info colors as per instruction, default will be dark for success/info/warning

  if (typeof Toastify !== "undefined") {
    Toastify({
      text: message,
      duration: 5000,
      gravity: "bottom",
      position: "left",
      close: false,
      stopOnFocus: true,
      style: {
        background: bgColor,
        color: "#ffffff",
        borderRadius: "4px",
        padding: "14px 24px",
        fontSize: "14px",
        fontFamily: "'Roboto', 'Product Sans', Arial, sans-serif",
        boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        minWidth: "250px",
      },
    }).showToast();
  } else {
    // Fallback if Toastify is not loaded
    console.log(`Toast (${type}): ${message}`);
    // Only alert if it's an error and we are in a context where user needs to know
    if (type === "error") alert(message);
  }
}

/**
 * Global handler for Schedule Send finalization
 * Listens for predefined options or custom date confirmation
 */
$(document).on(
  "click",
  "#scheduleSendModal .schedule-option[data-time], #dtp-confirm",
  function (e) {
    let confirmMsg = "";

    if ($(this).hasClass("schedule-option")) {
      const timeText = $(this).find(".text-muted").text();
      const labelText = $(this).find(".fs-14").text();
      confirmMsg = `Email scheduled for ${labelText} (${timeText})`;
    } else if (this.id === "dtp-confirm" && window.isSchedulingSend) {
      const dateInput = document.querySelector("#dtp-date");
      const timeInput = document.querySelector("#dtp-time");
      const date = dateInput ? dateInput.value : "";
      const time = timeInput
        ? timeInput.options
          ? timeInput.options[timeInput.selectedIndex].text
          : timeInput.value
        : "";

      if (!date) return;
      confirmMsg = `Email scheduled for ${date} at ${time}`;
      window.isSchedulingSend = false;
    }

    if (confirmMsg) {
      showAppToast(confirmMsg);

      // Hide Modals
      const scheduleModal = document.getElementById("scheduleSendModal");
      const dateModal = document.getElementById("dateTimeModal");
      if (window.bootstrap && window.bootstrap.Modal) {
        const sm = bootstrap.Modal.getInstance(scheduleModal);
        if (sm) sm.hide();
        const dm = bootstrap.Modal.getInstance(dateModal);
        if (dm) dm.hide();
      }

      // Close Editors
      if (window.popupManager) window.popupManager.close();
      if (window.forwardPopup) window.forwardPopup.close();
      if (window.jQuery && $("#gmail-reply-editor").hasClass("show")) {
        $("#gmail-reply-editor").removeClass("show");
        $("#gmail-reply-editor .formatting-toolbar").removeClass("show");
        $(
          '#gmail-reply-editor .btn[title="Text formatting"], #gmail-reply-editor .btn[data-bs-title="Text formatting"]',
        )
          .removeClass("active")
          .css({
            "background-color": "transparent",
            color: "#5f6368",
          });
        $(".mail-read-bottom-bar").show();
      }
    }
  },
);

/**
 * Global handler for transitioning from Schedule Send to Date/Time Picker
 */
$(document).on("click", "#btn-pick-date-time", function () {
  window.isSchedulingSend = true;
  const scheduleModalEl = document.getElementById("scheduleSendModal");
  const dateTimeModalEl = document.getElementById("dateTimeModal");

  if (window.bootstrap && window.bootstrap.Modal) {
    const sm = bootstrap.Modal.getInstance(scheduleModalEl);
    if (sm) sm.hide();
    const nextModal = new bootstrap.Modal(dateTimeModalEl);
    nextModal.show();
  }
});

// Global State
let currentPage = 1;
let currentTab = "inbox"; // Default tab
let currentInboxSubTab = "primary"; // Default inbox sub-tab

// Initialize on Document Ready
// Note: Initialization is now handled by layout.js after sidebar is loaded.
// If layout.js is not present, call initAppIntegration() manually or add it back.

// Guards to prevent duplicate logic
let isInboxInitialized = false;

async function initInboxIntegration() {
  if (isInboxInitialized) return;
  isInboxInitialized = true;

  try {
    const userEmail = getUserEmail();
    // Call the login API automatically on page load
    const data = await login(userEmail, "");

    if (data && data.success) {
      // Check for tab parameter in URL
      const urlParams = new URLSearchParams(window.location.search);
      const targetTab = urlParams.get("tab");

      if (
        targetTab &&
        ["inbox", "draft", "spam", "sent", "starred"].includes(targetTab)
      ) {
        currentTab = targetTab;
        // Trigger bootstrap tab switch if possible
        const tabEl = document.querySelector(
          `[href="#${mapTypeToTabPaneId(targetTab)}"], [data-bs-target="#${mapTypeToTabPaneId(targetTab)}"]`,
        );
        if (tabEl) {
          const tab = new bootstrap.Tab(tabEl);
          tab.show();
        }
      }

      // Load initial data after successful login
      loadEmails(currentTab, 1);
      fetchBadgeCounts();
    }
  } catch (error) {
    console.error("Auto-login failed:", error);
  }

  // Attach Event Listeners to Tabs
  setupTabListeners();
  setupInboxSubTabListeners();
  setupAutoLabelModal();
  setupNewAutoLabelModal();
  setupBuildOwnModal();
  setupBuildOwnSaveListener();
  setupSmartSortModal();
  setupReminderModal();
  setupTemplateModal();
  setupSettingsModal();
  setupNewSignatureModal();
}

async function initReadEmailIntegration() {
  const urlParams = new URLSearchParams(window.location.search);
  const emailId = urlParams.get("id");
  const hasAttachment = urlParams.get("has_attachment") === "true";

  if (emailId) {
    loadEmailDetail(emailId, hasAttachment);
  }

  // Initialize shared features on read-email page
  fetchBadgeCounts();
  setupTabListeners();
  setupAutoLabelModal();
  setupNewAutoLabelModal();
  setupBuildOwnModal();
  setupBuildOwnSaveListener();
  setupSmartSortModal();
  setupReminderModal();
  setupTemplateModal();
  setupSettingsModal();
  setupEmailDetailsToggle();
  setupNewSignatureModal();
}

/**
 * Sets up click listeners for the sidebar tabs to switch categories
 */
function setupTabListeners() {
  const tabMap = {
    "inbox-tab": "inbox",
    "drafts-tab": "draft",
    "spam-tab": "spam",
    "sent-tab": "sent",
    "starred-tab": "starred",
  };

  // Check if we are on inbox page (by looking for the tab content container)
  const isInboxPage = !!document.getElementById("inbox-tab");

  document.querySelectorAll(".mail-nav-item").forEach((link) => {
    link.addEventListener("click", (e) => {
      // Find the tab type
      let rawTab = link.getAttribute("data-tab");
      let targetId =
        link.getAttribute("href")?.substring(1) ||
        link.getAttribute("data-bs-target")?.substring(1);

      // Normalize tab name
      let tabType = rawTab;
      if (tabType === "drafts") tabType = "draft"; // Normalize

      if (!tabType && tabMap[targetId]) {
        tabType = tabMap[targetId];
      }
      if (!tabType && targetId && targetId.includes("-tab")) {
        // Fallback for names like 'drafts' vs 'draft'
        const candidate = targetId.replace("-tab", "");
        tabType = candidate === "drafts" ? "draft" : candidate;
      }

      if (!tabType) return;

      if (!isInboxPage) {
        // Not on inbox page, redirect
        e.preventDefault();
        window.location.href = `inbox.html?tab=${tabType}`;
        return;
      }

      // On inbox page, handle tab switch
      currentTab = tabType;
      currentPage = 1;
      loadEmails(currentTab, currentPage, currentInboxSubTab);
    });
  });
}

/**
 * Sets up click listeners for the inbox sub-tabs (Primary, Operations, etc.)
 */
function setupInboxSubTabListeners() {
  const subTabs = document.querySelectorAll(
    "#inbox-sub-tabs .nav-link, [data-inbox-tab]",
  );

  subTabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();

      // Remove active class from siblings
      subTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const category = tab.getAttribute("data-inbox-tab");
      if (category) {
        currentInboxSubTab = category;
        // Only reload if we are currently on the inbox tab
        if (currentTab === "inbox") {
          loadEmails("inbox", 1, currentInboxSubTab);
        }
      }
    });
  });
}

/**
 * Fetches badge counts and updates the sidebar
 */
let isFetchingBadgeCounts = false;
async function fetchBadgeCounts() {
  if (isFetchingBadgeCounts) return;
  isFetchingBadgeCounts = true;

  try {
    const email = getUserEmail();
    // Construct URL manually to avoid URLSearchParams encoding '@' as '%40'
    const url = `${API_ENDPOINTS.emailCounts}?email=${email}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    if (data.success && data.counts) {
      updateBadges(data.counts);
    }
  } catch (error) {
    console.error("Error fetching badge counts:", error);
  } finally {
    isFetchingBadgeCounts = false;
  }
}

/**
 * Updates the badge numbers in the DOM
 */
function updateBadges(counts) {
  const updateTabBadge = (tabId, count, isInbox = false) => {
    // Support both href="#inbox-tab" and data-tab="inbox" selectors
    const selectors = [
      `a[href="#${tabId}"]`,
      `a[data-bs-target="#${tabId}"]`,
      `a[data-tab="${tabId.replace("-tab", "")}"]`,
    ];

    const tabLinks = document.querySelectorAll(selectors.join(","));

    tabLinks.forEach((tabLink) => {
      let badge = tabLink.querySelector(".badge");

      if (isInbox) {
        // Inbox always shows badge
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "badge badge-sm text-black ms-auto";
          tabLink.appendChild(badge);
        }
        badge.textContent = count.toLocaleString();
      } else {
        if (count > 0) {
          if (!badge) {
            badge = document.createElement("span");
            badge.className = "badge badge-sm text-black ms-auto"; // Use same style as Inbox for consistency
            tabLink.appendChild(badge);
          }
          badge.textContent = count.toLocaleString();
        } else if (badge) {
          // Hide or remove badge if count is 0
          badge.remove();
        }
      }
    });
  };

  updateTabBadge("inbox-tab", counts.inbox, true);
  updateTabBadge("drafts-tab", counts.draft);
  updateTabBadge("spam-tab", counts.spam);
  updateTabBadge("sent-tab", counts.sent);
  updateTabBadge("starred-tab", counts.starred);

  // Unread Highlight (Optional Implementation - e.g., Update document title or specific UI element)
  // The spec mentioned: UI Usage • Unread highlight → counts.unread_inbox
  // Current UI doesn't have a specific "unread highlight" element defined in the brief,
  // but often this means the Inbox count itself might need to separate total vs unread, or bolding.
  // For now, adhering to the basic badge update.
}

/**
 * Fetches emails for a specific category
 */
let isEmailsLoading = false;
/**
 * Helper function to get the actual container for content
 * If SimpleBar is initialized, returns .simplebar-content, otherwise returns the container itself
 */
function getActualContainer(container) {
  if (typeof SimpleBar !== "undefined") {
    const simpleBarInstance = SimpleBar.instances.get(container);
    if (simpleBarInstance) {
      const simplebarContent = container.querySelector(".simplebar-content");
      if (simplebarContent) {
        return simplebarContent;
      }
    }
  }
  return container;
}

async function loadEmails(type, page = 1, subCategory = "primary") {
  if (isEmailsLoading) return;
  isEmailsLoading = true;

  const listContainerId = getListContainerId(type);
  const listContainer = document.querySelector(listContainerId);

  if (!listContainer) {
    isEmailsLoading = false;
    return;
  }

  // Get the actual container (SimpleBar content wrapper if available)
  const actualContainer = getActualContainer(listContainer);

  // Show loading state
  actualContainer.innerHTML =
    '<li class="text-center p-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></li>';

  try {
    const email = getUserEmail();
    // folder param
    let folderParam = type;

    // Construct URL manually to avoid URLSearchParams encoding '@' as '%40'
    const url = `${API_ENDPOINTS.emails}?email=${email}&filter=${folderParam}&page=${page}`;

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    if (data.success) {
      const emails = data.emails || data.drafts || [];
      renderEmailList(emails, listContainer);
      if (data.meta) updatePaginationInfo(data.meta);
    } else {
      actualContainer.innerHTML =
        '<li class="text-center p-4 text-danger">Failed to load emails.</li>';
    }
  } catch (error) {
    console.error(`Error loading ${type} emails:`, error);
    actualContainer.innerHTML =
      '<li class="text-center p-4 text-danger">Error loading emails. Please try again.</li>';
  } finally {
    isEmailsLoading = false;
  }
}

/**
 * Fetches a single email detail
 */
let isEmailDetailLoading = false;
// Refactored fetch function
async function fetchEmailDetail(id, hasAttachment = false) {
  try {
    const userEmail = getUserEmail();
    let url = `${API_ENDPOINTS.emailDetail}/${id}?email=${encodeURIComponent(userEmail)}&service=gmail&auto_label=true`;

    if (hasAttachment) {
      url += "&includeAttachments=true";
    }

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching email detail", error);
    throw error;
  }
}

async function loadEmailDetail(id, hasAttachment = false) {
  if (isEmailDetailLoading) return;
  isEmailDetailLoading = true;

  try {
    const data = await fetchEmailDetail(id, hasAttachment);

    if (data.success && data.email) {
      renderEmailDetail(data.email);
    }
  } catch (error) {
    // Error logged in fetchEmailDetail
  } finally {
    isEmailDetailLoading = false;
  }
}

// Function to open draft in compose modal
async function openDraft(id) {
  try {
    // Fetch full details (assuming API returns same structure for drafts)
    // Need to check if draft endpoint is different? usually same /emails/{id}
    const data = await fetchEmailDetail(id, true); // Include attachments if any

    if (data.success && data.email) {
      if (window.openComposeWithDraft) {
        window.openComposeWithDraft(data.email);
      } else {
        console.error("openComposeWithDraft not defined");
      }
    }
  } catch (e) {
    showAppToast("Failed to load draft", "error");
  }
}

function renderEmailDetail(email) {
  // Store email data globally for Reply/Reply All functionality
  window.currentEmailData = email;

  // Subject and Label
  const titleEl = document.querySelector(".mail-title");
  if (titleEl) {
    let labelHtml = "";
    if (email.labels && email.labels.length > 0) {
      const label = email.labels[0];
      labelHtml = `<span class="${label.color || "bg-primary"} ms-2 fs-6 badge fw-normal">${escapeHtml(label.name)}</span>`;
    }
    titleEl.innerHTML = `${escapeHtml(email.subject)} ${labelHtml}`;
  }

  // Time
  const timeEl = document.querySelector(
    ".mail-body .px-3.pt-3 .d-flex.column-gap-3 small",
  );
  if (timeEl) timeEl.textContent = email.time_text;

  // Sender Name
  const senderNameEl = document.querySelector(".mail-user");
  if (senderNameEl) senderNameEl.textContent = email.from.name;

  // Sender Detail
  const senderDetailLink = document.querySelector(
    ".d-flex.flex-wrap.align-items-center.text-sm a.text-1xs",
  );
  if (senderDetailLink)
    senderDetailLink.textContent = `${email.from.name} ${email.from.email}`;

  // To/CC Details for Dropdown
  const detailsBody = document.getElementById("detailsBody");
  if (detailsBody) {
    let detailsRows = "";

    // From
    detailsRows += `<tr><td class="text-gray text-end pe-3" style="width: 100px;">from:</td><td><span class="fw-medium text-dark">${escapeHtml(email.from.name)}</span> <span class="text-gray">&lt;${escapeHtml(email.from.email)}&gt;</span></td></tr>`;

    // To
    if (email.to && email.to.length > 0) {
      const toStr = email.to
        .map(
          (t) =>
            `${escapeHtml(t.name || t.email)} &lt;${escapeHtml(t.email)}&gt;`,
        )
        .join(", ");
      detailsRows += `<tr><td class="text-gray text-end pe-3">to:</td><td>${toStr}</td></tr>`;
    }

    // CC
    if (email.cc && email.cc.length > 0) {
      const ccStr = email.cc
        .map(
          (c) =>
            `${escapeHtml(c.name || c.email)} &lt;${escapeHtml(c.email)}&gt;`,
        )
        .join(", ");
      detailsRows += `<tr><td class="text-gray text-end pe-3">cc:</td><td>${ccStr}</td></tr>`;
    }

    // BCC
    if (email.bcc && email.bcc.length > 0) {
      const bccStr = email.bcc
        .map(
          (b) =>
            `${escapeHtml(b.name || b.email)} &lt;${escapeHtml(b.email)}&gt;`,
        )
        .join(", ");
      detailsRows += `<tr><td class="text-gray text-end pe-3">bcc:</td><td>${bccStr}</td></tr>`;
    }

    // Date
    detailsRows += `<tr><td class="text-gray text-end pe-3">date:</td><td>${escapeHtml(email.time_text || "")}</td></tr>`;

    // Subject
    detailsRows += `<tr><td class="text-gray text-end pe-3">subject:</td><td>${escapeHtml(email.subject)}</td></tr>`;

    detailsBody.innerHTML = detailsRows;
  }

  // Body
  const bodyEl = document.querySelector(".mail-read-body");
  if (bodyEl) bodyEl.innerHTML = email.body_html;

  // Star state
  if (email.starred) {
    const starIcon = document.querySelector(".mail-item-bookmark i");
    if (starIcon) {
      starIcon.classList.remove("fi-rr-star");
      starIcon.classList.add("fi-sr-star", "text-warning");
    }
  }
}

/**
 * Capture current user email from UI
 */
function getAccountEmail() {
  const emailEl = document.getElementById("user-email");
  return emailEl ? emailEl.textContent.trim() : "arunloganathan01@gmail.com";
}

/**
 * Capture email ID from URL or triggers
 */
function getTargetEmailId() {
  // 1. From global state (set by trigger or config)
  if (window.currentReminderEmailId) {
    console.log("🎯 Found ID in global state:", window.currentReminderEmailId);
    return window.currentReminderEmailId;
  }

  // 2. From LocalStorage (for testing/persistence)
  const fromStorage = localStorage.getItem("target_email_id");
  if (fromStorage) {
    console.log("🎯 Found ID in LocalStorage:", fromStorage);
    return fromStorage;
  }

  // 3. From URL (on read-email.html)
  const urlParams = new URLSearchParams(window.location.search);
  const fromUrl = urlParams.get("id");
  if (fromUrl) {
    console.log("🎯 Found ID in URL:", fromUrl);
    return fromUrl;
  }

  // 4. Fallback: search for first selected item in the list
  const checked = document.querySelectorAll(".checkable-check-input:checked");
  console.log("🎯 Checked inputs count:", checked.length);
  if (checked.length > 0) {
    const id = checked[0].getAttribute("data-email-id") || "";
    console.log("🎯 Found ID in checked list:", id);
    return id;
  }

  console.warn("⚠️ No target email ID found!");
  return "";
}

/**
 * Formats a Date object to DD/MM/YYYY
 */
function formatDateToDDMMYYYY(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

async function handleSetReminder(reminderTime, reminderNote, showAlert = true) {
  const emailId = getTargetEmailId();
  const accountEmail = getAccountEmail();

  if (!emailId) {
    showAppToast("Please select an email to set a reminder.", "warning");
    return null;
  }

  const payload = {
    email_id: emailId,
    account_email: accountEmail,
    reminder_time: reminderTime,
    reminder_note: reminderNote,
  };
  console.log("🚀 ~ handleSetReminder ~ payload:", payload);

  const modalEl = document.getElementById("staticBackdrop");
  const btn = modalEl
    ? modalEl.querySelector(".modal-footer .btn-primary")
    : null;
  const originalText = btn ? btn.innerHTML : "";

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Setting...';
    }

    const response = await fetch(API_ENDPOINTS.remindersSet, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (data.success || data.status === "success") {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      if (showAlert) {
        showAppToast(
          data.message || data.error || "Reminder set successfully",
          "success",
        );
      }
      return data;
    } else {
      showAppToast(
        data.error || data.message || "Error setting reminder",
        "error",
      );
      return data;
    }
  } catch (err) {
    console.error("Reminder set error:", err);
    showAppToast("Error setting reminder. Please try again.", "error");
    return null;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

async function handleConfirmDateTime(selectedDate, selectedTime, reminderNote) {
  const emailId = getTargetEmailId();
  const accountEmail = getAccountEmail();

  if (!emailId) {
    showAppToast("Please select an email to confirm reminder.", "warning");
    return;
  }

  const payload = {
    email_id: emailId,
    account_email: accountEmail,
    selectedDate,
    selectedTime,
    reminder_note: reminderNote,
  };
  console.log("🚀 ~ handleConfirmDateTime ~ payload:", payload);

  const btn = document.getElementById("dtp-confirm");
  const originalText = btn ? btn.innerHTML : "";

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Confirming...';
    }

    const response = await fetch(API_ENDPOINTS.remindersConfirm, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (data.success || data.status === "success") {
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("dateTimeModal"),
      );
      if (modal) modal.hide();

      showAppToast(
        data.message || data.error || "Reminder confirmed successfully",
        "success",
      );
    } else {
      showAppToast(
        data.error || data.message || "Error confirming reminder",
        "error",
      );
    }
  } catch (err) {
    console.error("Confirm datetime error:", err);
    showAppToast("An error occurred during confirmation.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

function getListContainerId(type) {
  if (type === "inbox") return "#inbox-mail-list";

  const tabPaneId = mapTypeToTabPaneId(type);
  return `#${tabPaneId} .mail-list`;
}

function mapTypeToTabPaneId(type) {
  switch (type) {
    case "inbox":
      return "inbox-tab";
    case "draft":
    case "drafts":
      return "drafts-tab";
    case "spam":
      return "spam-tab";
    case "sent":
      return "sent-tab";
    case "starred":
      return "starred-tab";
    default:
      return "inbox-tab";
  }
}

/**
 * Renders the list of email items into the DOM
 */
function renderEmailList(emails, container) {
  // Get the actual container (SimpleBar content wrapper if available)
  const actualContainer = getActualContainer(container);

  actualContainer.innerHTML = "";

  // Only clear checks on reload if wanted? For now let's just render.

  if (!Array.isArray(emails) || emails.length === 0) {
    actualContainer.innerHTML =
      '<li class="text-center p-4 text-muted">No emails found.</li>';
    return;
  }

  const fragment = document.createDocumentFragment();

  emails.forEach((email) => {
    const li = document.createElement("li");
    li.className = `mail-list-item checkable-item ${email.unread ? "mail-unread" : ""}`;
    li.setAttribute("data-email-id", email.id);

    let labelsHtml = "";
    if (email.labels && email.labels.length > 0) {
      labelsHtml = email.labels
        .map(
          (label) =>
            `<span class="${label.color} me-1 custom-label-badge px-2 rounded-2">${escapeHtml(label.name)}</span>`,
        )
        .join("");
    }

    const attachmentIcon = email.has_attachment
      ? '<i class="fi fi-rr-paperclip ms-2 text-muted"></i>'
      : "";
    const starActive = email.starred ? "active" : "";

    // Only show "Assigned to" if there's an actual assignee
    const assignedToHtml = email.assigned_to
      ? `<div class="mail-item-meta ms-auto"><small class="mail-item-time text-nowrap">Assigned to: ${escapeHtml(email.assigned_to)}</small></div>`
      : "";

    // Safely construct HTML
    li.innerHTML = `
            <div class="form-check my-0 me-2">
                <input class="form-check-input checkable-check-input" type="checkbox" data-email-id="${email.id}">
            </div>
            <a class="mail-item-bookmark ${starActive}" href="javascript:void(0);" data-email-id="${email.id}">
                <i class="fi fi-rr-star me-2 me-sm-3"></i>
            </a>
            <a ${currentTab === "draft" ? `href="#" onclick="openDraft('${email.id}'); return false;"` : `href="read-email.html?id=${email.id}&has_attachment=${email.has_attachment}"`} class="mail-item-content ms-2 ms-sm-0 me-2">
                <div class="mail-item-username">
                    ${labelsHtml}
                    <span class="me-2">${escapeHtml(email.from.name)}</span>
                </div>
                <span class="mail-item-subject">${escapeHtml(email.subject)}</span>
                <span class="mail-item-text text-body"> ${escapeHtml(email.snippet)}</span>
                ${attachmentIcon}
            </a>
            ${assignedToHtml}
            <div class="mail-item-meta ms-auto">
                <small class="mail-item-time">${escapeHtml(email.time)}</small>
                <div class="mail-item-actions">
                    <button class="btn btn-white btn-sm text-danger btn-shadow btn-icon waves-effect" title="Delete">
                        <i class="fi fi-rr-trash"></i>
                    </button>
                    <button class="btn btn-white btn-sm btn-shadow btn-icon waves-effect" title="Archive">
                        <i class="fi fi-rr-box"></i>
                    </button>
                    <button class="btn btn-white btn-sm btn-shadow btn-icon waves-effect" title="More">
                        <i class="fi fi-rr-menu-dots"></i>
                    </button>
                </div>
            </div>
        `;
    fragment.appendChild(li);
  });

  actualContainer.appendChild(fragment);

  // Recalculate SimpleBar if it's initialized on the original container
  if (typeof SimpleBar !== "undefined") {
    const simpleBarInstance = SimpleBar.instances.get(container);
    if (simpleBarInstance) {
      simpleBarInstance.recalculate();
    }
  }
}

function updatePaginationInfo(meta) {
  if (!meta) return;
  const activeTabPane = document.querySelector(".tab-pane.active");
  if (activeTabPane) {
    const paginationText = activeTabPane.querySelector(".mail-header span");
    if (paginationText) {
      paginationText.textContent = `${meta.start} - ${meta.end} of ${meta.total}`;
    }
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Gets the email of the logged-in user from the DOM
 */
function getUserEmail() {
  const emailEl = document.getElementById("user-email");
  if (emailEl) {
    return emailEl.textContent.trim();
  }
  // Fallback if element not found (default from user request)
  return "arunloganathan01@gmail.com";
}

/**
 * Performs login and saves the token to localStorage
 */
async function login(email, password) {
  try {
    const response = await fetch(API_ENDPOINTS.login, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    // console.log("🚀 ~ login ~ response:", response)

    if (!response.ok)
      throw new Error(`Login failed! status: ${response.status}`);

    const data = await response.json();

    if (data.success && data.token) {
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user_email", data.email); // Save email as well
      localStorage.setItem(
        "target_email_id",
        data.email_id || "19c0be8c64efe2d6",
      ); // Set target ID for reminders
      // Optionally redirect or reload data
      console.log("Login successful, token and email saved.");
      return data;
    } else {
      showAppToast(data.error || data.message || "Login failed", "error");
      throw new Error(data.error || data.message || "Login failed");
    }
  } catch (error) {
    console.error("Error during login:", error);
    if (!window.location.pathname.includes("index")) {
      // Don't toast on landing page unless manual
      showAppToast(
        "Session login failed. Please check your connection.",
        "error",
      );
    }
    throw error;
  }
}

/**
 * Sets up the Auto Label modal listener to fetch data on show
 */
function setupAutoLabelModal() {
  const modalEl = document.getElementById("autolabel");
  if (!modalEl) return;

  modalEl.addEventListener("show.bs.modal", function () {
    fetchAutoLabels();
  });
}

/**
 * Fetches auto labels from the API
 */
let isFetchingAutoLabels = false;
async function fetchAutoLabels() {
  if (isFetchingAutoLabels) return;
  isFetchingAutoLabels = true;

  const listEl = document.getElementById("autolabel-list");
  const loaderEl = document.getElementById("autolabel-loader");

  if (!listEl || !loaderEl) return;

  // Reset state
  listEl.innerHTML = "";
  loaderEl.classList.remove("d-none");

  try {
    const response = await fetch(API_ENDPOINTS.autoLabels, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch labels");

    const data = await response.json();

    if (data.success && data.defaultAutoLabels) {
      renderAutoLabels(data.defaultAutoLabels);
    } else {
      listEl.innerHTML =
        '<li class="list-group-item text-danger">No labels found.</li>';
    }
  } catch (error) {
    console.error("Error fetching auto labels:", error);
    listEl.innerHTML =
      '<li class="list-group-item text-danger">Error loading labels.</li>';
  } finally {
    loaderEl.classList.add("d-none");
    isFetchingAutoLabels = false;
  }
}

/**
 * Renders the auto labels in the modal
 */
function renderAutoLabels(labels) {
  const listEl = document.getElementById("autolabel-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  labels.forEach((label) => {
    // Map API color to UI class if possible
    let colorClass = "bg-primary"; // default
    const apiColor = (label.color || "").toLowerCase();

    // Simple mapping based on expected API values vs observed UI classes
    if (apiColor === "red") colorClass = "bg-red";
    else if (apiColor === "green") colorClass = "bg-green";
    else if (apiColor === "blue") colorClass = "bg-darkblue";
    else if (apiColor === "yellow") colorClass = "bg-orange";
    else if (apiColor === "gray") colorClass = "bg-secondary";
    else if (
      [
        "primary",
        "secondary",
        "success",
        "danger",
        "warning",
        "info",
        "light",
        "dark",
        "darkblue",
        "orange",
        "lightgreen",
        "draft",
      ].includes(apiColor)
    ) {
      colorClass = `bg-${apiColor}`;
    }

    const col = document.createElement("div");
    col.className = "col-6 col-md-4 col-lg-2 d-flex align-items-center";

    col.innerHTML = `
             <input type="checkbox" class="me-2" value="${label.id}">
             <span class="${colorClass}">${escapeHtml(label.name)}</span>
        `;

    listEl.appendChild(col);
  });
}

/**
 * Sets up the Build Own modal listener to fetch form data on show
 */
function setupBuildOwnModal() {
  const modalEl = document.getElementById("buildown");
  if (!modalEl) return;

  modalEl.addEventListener("show.bs.modal", function () {
    fetchBuildOwnData();
  });
}

/**
 * Fetches form schema and categories for Build Own modal
 */
let isFetchingBuildOwnData = false;
async function fetchBuildOwnData() {
  if (isFetchingBuildOwnData) return;
  isFetchingBuildOwnData = true;

  const listEl = document.getElementById("buildown-categories-list");
  const loaderEl = document.getElementById("buildown-loader");

  if (!listEl || !loaderEl) return;

  // Reset state
  listEl.innerHTML = "";
  loaderEl.classList.remove("d-none");

  try {
    const response = await fetch(API_ENDPOINTS.buildOwnForm, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch form data");

    const data = await response.json();

    if (data.success) {
      if (data.formFields) {
        renderBuildOwnForm(data.formFields);
      }

      // Check for either labelCategory or checkboxLabels
      const labelData = data.labelCategory || data.checkboxLabels;

      if (labelData && labelData.options) {
        // If options is an object (new format), convert to array of keys
        const options = Array.isArray(labelData.options)
          ? labelData.options
          : Object.keys(labelData.options);

        const defaultValue = labelData.default || labelData.selectedOption;

        renderBuildOwnCategories(options, defaultValue, labelData.options);
      } else {
        listEl.innerHTML =
          '<div class="col-12 text-danger">No categories found.</div>';
      }
    } else {
      listEl.innerHTML =
        '<div class="col-12 text-danger">Failed to load data.</div>';
    }
  } catch (error) {
    console.error("Error fetching build own data:", error);
    listEl.innerHTML =
      '<div class="col-12 text-danger">Error loading categories.</div>';
  } finally {
    loaderEl.classList.add("d-none");
    isFetchingBuildOwnData = false;
  }
}

/**
 * Renders categories in Build Own modal
 */
function renderBuildOwnCategories(options, defaultValue, apiOptions = null) {
  const listEl = document.getElementById("buildown-categories-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  // Manual mapping for colors since API doesn't provide them yet
  const colorMap = {
    inProgress: "bg-primary",
    movementType: "bg-darkblue",
    completed: "bg-green",
    reference: "bg-draft",
    urgent: "bg-red",
    actionRequired: "bg-orange",
    commercialStage: "bg-lightgreen",
  };

  // Manual mapping for display names (fallback)
  const nameMap = {
    inProgress: "In Progress",
    movementType: "Movement Type",
    completed: "Completed",
    reference: "Reference",
    urgent: "Urgent",
    actionRequired: "Action Required",
    commercialStage: "Commercial stage",
  };

  options.forEach((opt) => {
    const colorClass = colorMap[opt] || "bg-primary";

    // Priority: API label > manual nameMap > raw opt key
    let displayName = opt;
    if (apiOptions && apiOptions[opt] && apiOptions[opt].label) {
      displayName = apiOptions[opt].label;
    } else if (nameMap[opt]) {
      displayName = nameMap[opt];
    }
    const isChecked = opt === defaultValue ? "checked" : "";

    const col = document.createElement("div");
    col.className = "col-6 col-md-4 col-lg-3 d-flex align-items-center";

    // Using checkbox as per UI design, but with radio behavior logic
    // Added id and for attribute as per user request to make label clickable
    col.innerHTML = `
             <input type="checkbox" class="me-2 buildown-cat-check" value="${opt}" id="cat-${opt}" ${isChecked}>
             <label for="cat-${opt}" class="${colorClass}" style="cursor: pointer;">${displayName}</label>
        `;

    listEl.appendChild(col);

    // Add click listener for radio-like behavior
    const checkbox = col.querySelector('input[type="checkbox"]');
    checkbox.addEventListener("change", function () {
      if (this.checked) {
        // Find all other checkboxes and uncheck them
        const allChecks = listEl.querySelectorAll(".buildown-cat-check");
        allChecks.forEach((cb) => {
          if (cb !== this) cb.checked = false;
        });
      }
    });
  });
}

/**
 * Renders the form fields for Build Own modal
 */
function renderBuildOwnForm(fields) {
  const container = document.getElementById("buildown-dynamic-fields");
  if (!container) return;
  container.innerHTML = "";

  // Define preferred order and label mapping
  const fieldConfig = {
    labelName: {
      label: "Label name",
      order: 1,
      typeOverride: "text",
      placeholder: "Eg. Travel plans",
    },
    from: {
      label: "From",
      order: 2,
      typeOverride: "email",
      placeholder: "Eg. ceo@xyz.com",
    },
    to: {
      label: "To",
      order: 3,
      typeOverride: "email",
      placeholder: "Eg. accounts@xyz.com",
    },
    subject: {
      label: "Subject",
      order: 4,
      typeOverride: "text",
      placeholder: "Eg. Book two tickets from FRA to MAA",
    },
    aiPrompt: {
      label: "AI prompt",
      order: 5,
      typeOverride: "textarea",
      placeholder: "Eg. Book two tickets from FRA to MAA",
    },
    preview: {
      label: "Preview",
      order: 6,
      typeOverride: "textarea",
      placeholder: "Enter criteria above to preview matching emails.",
    },
  };

  const keys = Object.keys(fields).sort((a, b) => {
    const orderA = fieldConfig[a]?.order || 99;
    const orderB = fieldConfig[b]?.order || 99;
    return orderA - orderB;
  });

  keys.forEach((key) => {
    const fieldData = fields[key];
    const config = fieldConfig[key] || { label: key, placeholder: "" };
    const labelText = config.label || key;

    // API type 'textarea' -> use textarea tag, otherwise input
    const isTextarea = fieldData.type === "textarea";
    // Use override type if defined (e.g. email) otherwise API type or text
    const inputType = config.typeOverride || fieldData.type || "text";

    const required = fieldData.required ? "required" : "";
    const readonly = fieldData.readonly ? "readonly" : "";
    const placeholder = config.placeholder || "";

    const wrapper = document.createElement("div");
    wrapper.className = "col-12";

    let inputHtml = "";
    if (isTextarea) {
      inputHtml = `<textarea class="form-control" id="input-${key}" rows="2" style="height: 100px" placeholder="${placeholder}" ${required} ${readonly}></textarea>`;
    } else {
      inputHtml = `<input type="${inputType}" class="form-control" id="input-${key}" placeholder="${placeholder}" ${required} ${readonly}>`;
    }

    wrapper.innerHTML = `
           <label for="input-${key}" class="form-label">${labelText}</label>
           ${inputHtml}
       `;
    container.appendChild(wrapper);
  });
}

/**
 * Sets up the listener for the Save button in Build Own modal
 */
function setupBuildOwnSaveListener() {
  const saveBtn = document.getElementById("buildown-save-btn");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", saveBuildOwnLabel);
}

/**
 * Handles the saving of the Build Own label form
 */
async function saveBuildOwnLabel() {
  const saveBtn = document.getElementById("buildown-save-btn");

  // helper to get val
  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  };

  // Get Form Data
  const payload = {
    labelName: getVal("input-labelName"),
    from: getVal("input-from"),
    to: getVal("input-to"),
    subject: getVal("input-subject"),
    aiPrompt: getVal("input-aiPrompt"),
    category: "",
  };

  // Get Category
  const checkedCat = document.querySelector(".buildown-cat-check:checked");
  if (checkedCat) {
    payload.category = checkedCat.value;
  }

  // Validation
  if (!payload.labelName) {
    showAppToast("Label name is required", "warning");
    return;
  }

  if (!payload.category) {
    showAppToast("Please select a category", "warning");
    return;
  }

  // Loading state
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const response = await fetch(API_ENDPOINTS.autoLabels, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.success) {
      // Close modal
      const modalEl = document.getElementById("buildown");
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) {
        modalInstance.hide();
      } else {
        const closeBtn = modalEl.querySelector('[data-bs-dismiss="modal"]');
        if (closeBtn) closeBtn.click();
      }
      showAppToast(
        data.message || data.error || "Label saved successfully!",
        "success",
      );
    } else {
      showAppToast(data.error || data.message || "Unknown error", "error");
    }
  } catch (error) {
    console.error("Error saving build own label:", error);
    showAppToast("Error saving data. Please try again.", "error");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  }
}

/**
 * Sets up the Smart Sort modal listener to fetch data on show
 */
function setupSmartSortModal() {
  const modalEl = document.getElementById("exampleModalToggle");
  if (!modalEl) return;

  modalEl.addEventListener("show.bs.modal", function () {
    fetchSmartSortData();
  });
}

/**
 * Fetches data for Smart Sort and Build Your Own modals
 */
let isFetchingSmartSort = false;
async function fetchSmartSortData() {
  if (isFetchingSmartSort) return;
  isFetchingSmartSort = true;

  const modalEl = document.getElementById("exampleModalToggle");
  const smartSortModalBody = modalEl
    ? modalEl.querySelector(".modal-body")
    : null;

  if (!smartSortModalBody) {
    isFetchingSmartSort = false;
    return;
  }

  // Optional: Add loading state to modal body
  const loader = document.createElement("div");
  loader.id = "smartsort-loader";
  loader.className = "text-center p-3";
  loader.innerHTML =
    '<div class="spinner-border text-primary" role="status"></div>';

  // Check if we already have categories to prevent layout jump
  const hasCategories =
    smartSortModalBody.querySelector(".category-list").children.length > 0;
  if (!hasCategories) {
    smartSortModalBody.appendChild(loader);
  }

  try {
    const userEmail = getUserEmail();
    const url = `https://api.mail.supercomp.ai/api/smart-sort?email=${userEmail}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch smart sort data");

    const data = await response.json();

    if (data.success) {
      renderSmartSortModal(data.smartSort);
      renderSmartSortBuildYourOwnModal(data.buildYourOwn);
    }
  } catch (error) {
    console.error("Error fetching smart sort data:", error);
  } finally {
    const loaderEl = document.getElementById("smartsort-loader");
    if (loaderEl) loaderEl.remove();
    isFetchingSmartSort = false;
  }
}

/**
 * Renders the Smart Sort modal content
 */
function renderSmartSortModal(smartSortData) {
  const modalEl = document.getElementById("exampleModalToggle");
  if (!modalEl || !smartSortData) return;

  // Update title and description if elements exist
  const titleEl = modalEl.querySelector(".popup-header .text-dark");
  if (titleEl && smartSortData.title) {
    titleEl.innerHTML = `<span class="icon-layers-2 me-2"></span> ${escapeHtml(smartSortData.title)}`;
  }

  const descEl = modalEl.querySelector(".modal-body .border-bottom p");
  if (descEl && smartSortData.description) {
    descEl.textContent = smartSortData.description;
  }

  // Update Category List
  const categoryListEl = modalEl.querySelector(".category-list");
  if (categoryListEl) {
    categoryListEl.innerHTML = "";

    // Add default category
    if (smartSortData.defaultCategory) {
      categoryListEl.appendChild(
        createCategoryItem(smartSortData.defaultCategory),
      );
    }

    // Add user categories
    if (
      smartSortData.userCategories &&
      smartSortData.userCategories.length > 0
    ) {
      smartSortData.userCategories.forEach((cat) => {
        categoryListEl.appendChild(createCategoryItem(cat));
      });
    }
  }

  // Handle "Build your own" button visibility
  const buildBtn = modalEl.querySelector(".modal-footer .btn-primary");
  if (buildBtn) {
    if (
      smartSortData.availableActions &&
      smartSortData.availableActions.buildYourOwn
    ) {
      buildBtn.classList.remove("d-none");
    } else {
      buildBtn.classList.add("d-none");
    }
  }
}

/**
 * Helper to create a category radio item
 */
function createCategoryItem(category) {
  const label = document.createElement("label");
  label.className = "category-item";

  // Map ID to icon if needed? The API doesn't provide icons, but the UI had them in sidebar.
  // In the modal it seems they are just text.

  const isChecked = category.selected ? "checked" : "";

  label.innerHTML = `
        <span class="fw-medium">${escapeHtml(category.label)}</span>
        <input type="checkbox" value="${category.id}" ${isChecked} />
    `;

  return label;
}

/**
 * Renders the Build Your Own modal content (from smart sort response)
 */
function renderSmartSortBuildYourOwnModal(buildData) {
  const modalEl = document.getElementById("exampleModalToggle2");
  if (!modalEl || !buildData) return;

  // Update Title
  const titleEl = modalEl.querySelector(".popup-header .text-dark");
  if (titleEl && buildData.title) {
    titleEl.textContent = buildData.title;
  }

  // Update Description
  const descEl = document.getElementById("buildour-own-helper-text");
  if (descEl && buildData.description) {
    descEl.textContent = buildData.description;
  }

  // Update Form Fields
  const form = buildData.form;
  if (form) {
    // Name Field
    if (form.name) {
      const nameLabel = modalEl.querySelector('label[for="inputName"]');
      if (nameLabel) nameLabel.textContent = form.name.label;

      const nameInput = document.getElementById("inputName");
      if (nameInput) {
        nameInput.placeholder = form.name.placeholder || "";
        nameInput.value = form.name.value || "";
        if (form.name.maxLength) nameInput.maxLength = form.name.maxLength;
      }
    }

    // Query Field (matches Definition in UI)
    if (form.query) {
      const queryLabel = modalEl.querySelector('label[for="inputDefination"]');
      if (queryLabel) queryLabel.textContent = form.query.label;

      const queryInput = document.getElementById("inputDefination");
      if (queryInput) {
        queryInput.placeholder = form.query.placeholder || "";
        queryInput.value = form.query.value || "";
      }

      // Update Examples
      if (form.query.examples) {
        const examplesContainer = document.getElementById(
          "buildour-own-examples",
        );
        if (examplesContainer) {
          examplesContainer.innerHTML = "";
          form.query.examples.forEach((ex, index) => {
            const p = document.createElement("p");
            p.className = "fs-13";
            p.textContent = `${index + 1}. ${ex}`;
            examplesContainer.appendChild(p);
          });
        }
      }
    }
  }

  // Update Buttons in footer
  const footer = modalEl.querySelector(".modal-footer");
  if (footer && buildData.buttons) {
    footer.innerHTML = "";
    buildData.buttons.forEach((btn) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `btn btn-${btn.type === "primary" ? "primary" : "secondary"} rounded-5`;
      button.textContent = btn.label;

      if (btn.action === "cancel") {
        button.setAttribute("data-bs-dismiss", "modal");
      } else if (btn.action === "createSmartSort") {
        button.id = "create-smart-sort-btn";
        button.addEventListener("click", handleCreateSmartSort);
      }

      footer.appendChild(button);
    });
  }
}

/**
 * Handles the creation of a new smart sort category
 */
async function handleCreateSmartSort() {
  const nameInput = document.getElementById("inputName");
  const queryInput = document.getElementById("inputDefination");
  const btn = document.getElementById("create-smart-sort-btn");

  if (!nameInput || !queryInput) return;

  const name = nameInput.value.trim();
  const query = queryInput.value.trim();

  if (!name || !query) {
    showAppToast("Please fill in both name and query.", "warning");
    return;
  }

  try {
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';

    const userEmail = getUserEmail();
    const url = `${API_ENDPOINTS.smartSort}?email=${encodeURIComponent(userEmail)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: name,
        query: query,
        color: "purple", // Using purple as per curl example
      }),
    });

    const data = await response.json();

    if (data.success) {
      const modalEl = document.getElementById("exampleModalToggle2");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      showAppToast(
        data.message ||
          data.error ||
          "Smart sort category created successfully!",
        "success",
      );
      // Refresh counts to show new categories if any
      fetchBadgeCounts();
    } else {
      showAppToast(
        data.error || data.message || "Failed to create category",
        "error",
      );
    }
  } catch (error) {
    console.error("Error creating smart sort:", error);
    showAppToast("An error occurred while creating smart sort.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create";
  }
}

/**
 * Sets up the New Auto Label modal listener to fetch custom labels on show
 */
function setupNewAutoLabelModal() {
  const modalEl = document.getElementById("newautolabel");
  if (!modalEl) return;

  modalEl.addEventListener("show.bs.modal", function () {
    fetchCustomAutoLabels();
  });
}

/**
 * Fetches custom auto labels from the API
 */
let isFetchingCustomAutoLabels = false;
async function fetchCustomAutoLabels() {
  if (isFetchingCustomAutoLabels) return;
  isFetchingCustomAutoLabels = true;

  const listEl = document.getElementById("new-autolabel-list");
  const loaderEl = document.getElementById("new-autolabel-loader");

  if (!listEl || !loaderEl) {
    isFetchingCustomAutoLabels = false;
    return;
  }

  // Reset state but keep loader
  const existingLabels = listEl.querySelectorAll(".col-6");
  existingLabels.forEach((el) => el.remove());
  loaderEl.classList.remove("d-none");

  try {
    const userEmail = getUserEmail();
    const url = `${API_ENDPOINTS.customAutoLabels}?email=${encodeURIComponent(userEmail)}`;

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch custom labels");

    const data = await response.json();

    if (data.success && data.ui2_newAutoLabelSelector) {
      renderCustomAutoLabels(data.ui2_newAutoLabelSelector.labels);
    } else {
      console.error("Failed to load custom labels:", data.message);
    }
  } catch (error) {
    console.error("Error fetching custom auto labels:", error);
  } finally {
    if (loaderEl) loaderEl.classList.add("d-none");
    isFetchingCustomAutoLabels = false;
  }
}

/**
 * Renders custom auto labels in the New Auto Label modal
 */
function renderCustomAutoLabels(labels) {
  const listEl = document.getElementById("new-autolabel-list");
  if (!listEl) return;

  // Available color classes from styles.css
  const colors = [
    "label-blue",
    "label-gray",
    "label-green",
    "label-lightblue",
    "label-purple",
    "label-darkpurple",
    "label-yellow",
    "label-red",
  ];

  labels.forEach((label, index) => {
    const colorClass = colors[index % colors.length];

    const col = document.createElement("div");
    col.className = "col-6 col-md-4 col-lg-3";
    col.innerHTML = `
            <div class="label-box ${colorClass}" data-label-id="${label.id}" style="cursor: pointer;">
                ${escapeHtml(label.name)}
            </div>
        `;

    // Add click listener for selection logic if needed
    col.querySelector(".label-box").addEventListener("click", function () {
      // Remove active state from all
      listEl.querySelectorAll(".label-box").forEach((el) => {
        el.classList.remove("border", "border-primary", "border-2");
      });
      // Add active state to this one
      this.classList.add("border", "border-primary", "border-2");
      this.setAttribute("data-selected", "true");
    });

    listEl.appendChild(col);
  });
}

/**
 * Sets up the reminder modal listener
 */
function setupReminderModal() {
  const modalEl = document.getElementById("staticBackdrop");
  if (!modalEl) return;

  modalEl.addEventListener("show.bs.modal", function (e) {
    const trigger = e.relatedTarget;
    if (trigger) {
      const emailId =
        trigger.getAttribute("data-email-id") ||
        trigger.closest("[data-email-id]")?.getAttribute("data-email-id");
      if (emailId) {
        window.currentReminderEmailId = emailId;
        console.log("🎯 Modal trigger provided ID:", emailId);
      }
    }

    // Proactive fallback for sidebar clicks
    if (!window.currentReminderEmailId) {
      window.currentReminderEmailId = getTargetEmailId();
    }

    fetchReminderConfig();
  });

  // Global fix for stuck backdrops or open-close immediate issues
  modalEl.addEventListener("hidden.bs.modal", function () {
    // Reset state for next open
    window.currentReminderEmailId = null;

    // Ensure backdrop is gone if no other modal is open
    if (document.querySelectorAll(".modal.show").length === 0) {
      document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
  });

  // Also for DTP modal
  const dtpModalEl = document.getElementById("dateTimeModal");
  if (dtpModalEl) {
    dtpModalEl.addEventListener("hidden.bs.modal", function () {
      if (document.querySelectorAll(".modal.show").length === 0) {
        document
          .querySelectorAll(".modal-backdrop")
          .forEach((el) => el.remove());
        document.body.classList.remove("modal-open");
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      }
    });
  }
}

/**
 * Fetches reminders configuration
 */
let isFetchingReminderConfig = false;
async function fetchReminderConfig() {
  if (isFetchingReminderConfig) return;
  isFetchingReminderConfig = true;

  const emailId = getTargetEmailId();
  const accountEmail = getAccountEmail();

  try {
    const url = new URL(API_ENDPOINTS.remindersConfig);
    if (emailId) url.searchParams.append("email_id", emailId);
    if (accountEmail) url.searchParams.append("account_email", accountEmail);

    const response = await fetch(url.toString(), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch reminders config");

    const data = await response.json();
    if (data.success && data.config) {
      // Search for email_id in root or main_modal
      const emailId = data.config.email_id || data.config.main_modal?.email_id;
      if (emailId) {
        console.log("🎯 Configuration provided email_id:", emailId);
        window.currentReminderEmailId = emailId;
      }
      renderReminderModal(data.config.main_modal);
      renderDateTimePickerModal(data.config.datetime_picker_modal);
    }
  } catch (error) {
    console.error("Error fetching reminder config:", error);
  } finally {
    isFetchingReminderConfig = false;
  }
}

/**
 * Renders the main reminder modal content
 */
function renderReminderModal(config) {
  if (!config) return;

  // Title
  const titleEl = document.querySelector(
    "#staticBackdrop .popup-header .text-dark",
  );
  if (titleEl && config.title) {
    titleEl.innerHTML = `<span class="icon-calendar-days"></span> ${config.title}`;
  }

  // Fields (From, Label, Subject)
  const fieldsContainer = document.getElementById("reminder-fields-container");
  if (fieldsContainer && config.fields) {
    fieldsContainer.innerHTML = "";
    const fieldKeys = Object.keys(config.fields);
    fieldKeys.forEach((key, index) => {
      const field = config.fields[key];
      const div = document.createElement("div");

      // Styling based on position
      if (index === 0) {
        div.className = "border-bottom pb-3";
      } else if (index === fieldKeys.length - 1) {
        div.className = "py-3";
      } else {
        div.className = "border-bottom py-3";
      }

      div.innerHTML = `
        <div class="d-flex align-items-center">
          <span class="fs-13 text-dark fw-medium me-2" style="white-space: nowrap;">${field.label} :</span> 
          <input type="${field.type || "text"}" class="form-control reminder-field-input form-control-sm border-0 shadow-none p-0 text-gray fs-13 bg-transparent" 
                 data-key="${key}"
                 value="${field.value || ""}"
                 placeholder="${field.placeholder || ""}" 
                 ${field.required ? "required" : ""}>
        </div>
      `;
      fieldsContainer.appendChild(div);
    });
  }

  // Options (Radio Buttons)
  const optionsContainer = document.getElementById(
    "reminder-options-container",
  );
  if (optionsContainer && config.options && config.options.items) {
    optionsContainer.innerHTML = "";
    config.options.items.forEach((item) => {
      const div = document.createElement("div");
      div.className =
        "form-check border rounded-3 px-3 py-2 justify-content-between d-flex align-items-center mb-3";
      if (item.opens === "datetime_picker") div.classList.add("pick-datetime");

      const labelText = item.description
        ? `${item.label} (${item.description})`
        : item.label;

      div.innerHTML = `
        <label class="form-check-label fs-13 text-black fw-medium" for="radio-${item.id}">
          ${labelText}
        </label>
        <div class="">
          <input class="form-check-input m-0" type="radio" name="${config.options.key || "reminder_time"}" 
            id="radio-${item.id}" value="${item.value}" ${item.selected ? "checked" : ""} 
            data-opens="${item.opens || ""}">
        </div>
      `;

      div.addEventListener("click", function (e) {
        if (e.target.tagName === "INPUT") return;
        const radio = div.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });

      optionsContainer.appendChild(div);
    });
  }

  // Footer Actions
  const footer = document.getElementById("reminder-modal-footer");
  if (footer && config.actions) {
    footer.innerHTML = "";

    // Primary Button
    if (config.actions.primary) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn btn-primary rounded-5`;
      btn.textContent = config.actions.primary.label;

      btn.addEventListener("click", async function () {
        const selectedRadio = optionsContainer.querySelector(
          'input[type="radio"]:checked',
        );
        const reminderTime = selectedRadio ? selectedRadio.value : "";
        const noteInput =
          fieldsContainer.querySelector('input[data-key="Subject"]') ||
          fieldsContainer.querySelector('input[data-key="Label"]') ||
          fieldsContainer.querySelector(".reminder-field-input");
        const reminderNote = noteInput ? noteInput.value : "";

        if (
          selectedRadio &&
          selectedRadio.getAttribute("data-opens") === "datetime_picker"
        ) {
          // Immediate API call for custom option, hide alert to keep flow smooth
          const result = await handleSetReminder(
            reminderTime,
            reminderNote,
            false,
          );

          if (result && (result.success || result.status === "success")) {
            const currentModalEl = document.getElementById("staticBackdrop");
            const currentModal =
              bootstrap.Modal.getOrCreateInstance(currentModalEl);

            currentModalEl.addEventListener(
              "hidden.bs.modal",
              function () {
                const dtpModalEl = document.getElementById("dateTimeModal");
                if (dtpModalEl) {
                  const dtpModal =
                    bootstrap.Modal.getOrCreateInstance(dtpModalEl);
                  dtpModal.show();
                }
              },
              { once: true },
            );

            currentModal.hide();
          }
        } else {
          // Live API Call for other options
          await handleSetReminder(reminderTime, reminderNote);
        }
      });
      footer.appendChild(btn);
    }

    // Secondary Buttons
    if (config.actions.secondary) {
      config.actions.secondary.forEach((sec) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `btn btn-secondary rounded-5`;
        btn.textContent = sec.label;
        btn.setAttribute("data-bs-dismiss", "modal");
        footer.appendChild(btn);
      });
    }
  }
}

/**
 * Renders the Date & Time Picker modal content
 */
function renderDateTimePickerModal(config) {
  if (!config) return;

  // Title
  const titleEl = document.querySelector(
    "#dateTimeModal .popup-header .text-dark",
  );
  if (titleEl && config.title) {
    titleEl.innerHTML = `<span class="icon-calendar-days"></span> ${config.title}`;
  }

  // Fields (Labels and Placeholders)
  const dateLabel = document.querySelector(
    "#dateTimeModal label[for='dtp-date']",
  );
  const dateInput = document.getElementById("dtp-date");
  if (config.fields.selectedDate) {
    if (dateLabel) dateLabel.textContent = config.fields.selectedDate.label;
    if (dateInput)
      dateInput.placeholder = config.fields.selectedDate.placeholder;
  }

  const timeLabel = document.querySelector(
    "#dateTimeModal label[for='dtp-time']",
  );
  const timeSelect = document.getElementById("dtp-time");
  if (config.fields.selectedTime) {
    if (timeLabel) timeLabel.textContent = config.fields.selectedTime.label;
    if (timeSelect && config.fields.selectedTime.options) {
      timeSelect.innerHTML = "";
      config.fields.selectedTime.options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        timeSelect.appendChild(option);
      });
    }
  }

  // Footer Actions
  const footer = document.querySelector("#dateTimeModal .modal-footer");
  if (footer && config.actions) {
    footer.innerHTML = "";
    if (config.actions.primary) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn btn-primary rounded-5`;
      btn.id = "dtp-confirm";
      btn.textContent = config.actions.primary.label;
      footer.appendChild(btn);
    }
    if (config.actions.secondary) {
      config.actions.secondary.forEach((sec) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `btn btn-secondary rounded-5`;
        btn.textContent = sec.label;
        btn.setAttribute("data-bs-dismiss", "modal");
        footer.appendChild(btn);
      });
    }
  }

  // Confirm Actions
  const confirmBtn = document.getElementById("dtp-confirm");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", function () {
      const dateInput = document.getElementById("dtp-date");
      const timeSelect = document.getElementById("dtp-time");

      let selectedDateStr = "";
      if (dateInput && dateInput.value) {
        const [y, m, d] = dateInput.value.split("-");
        selectedDateStr = `${d}/${m}/${y}`;
      }

      const selectedTimeStr = timeSelect
        ? timeSelect.options[timeSelect.selectedIndex]?.textContent ||
          timeSelect.value
        : "";

      // For note, we'll try to grab from the main reminder modal's field if it's still there
      const mainFields = document.getElementById("reminder-fields-container");
      const noteInput = mainFields
        ? mainFields.querySelector('input[data-key="Subject"]') ||
          mainFields.querySelector('input[data-key="Label"]') ||
          mainFields.querySelector(".reminder-field-input")
        : null;
      const reminderNote = noteInput ? noteInput.value : "";

      handleConfirmDateTime(selectedDateStr, selectedTimeStr, reminderNote);
    });
  }

  // Re-initialize calendar logic from main.js
  if (typeof window.initDateTimePicker === "function") {
    window.initDateTimePicker();
  }
}

/**
 * Sets up the template modal listeners
 */
function setupTemplateModal() {
  const modalEl = document.getElementById("template");
  if (!modalEl || modalEl.dataset.templateInit) return;
  modalEl.dataset.templateInit = "true";

  modalEl.addEventListener("show.bs.modal", function () {
    fetchTemplatesConfig();
  });
}

let isFetchingTemplatesConfig = false;
async function fetchTemplatesConfig() {
  if (isFetchingTemplatesConfig) return;
  isFetchingTemplatesConfig = true;

  try {
    // Fetch configuration, templates list, and variables list in parallel
    const [configRes, listRes, varsRes] = await Promise.all([
      fetch(API_ENDPOINTS.templatesConfig, { headers: getAuthHeaders() }),
      fetch(API_ENDPOINTS.templatesList, { headers: getAuthHeaders() }),
      fetch(API_ENDPOINTS.templatesVariables, { headers: getAuthHeaders() }),
    ]);

    const [configData, listData, varsData] = await Promise.all([
      configRes.ok ? configRes.json() : null,
      listRes.ok ? listRes.json() : null,
      varsRes.ok ? varsRes.json() : null,
    ]);

    if (configData && configData.success) {
      // Merge fetched templates and variables into the main config if available
      const mainConfig = configData.createTemplateModal;

      if (listData && listData.success) {
        mainConfig.savedTemplates.items =
          listData.data || listData.templates || [];
      }
      if (varsData && varsData.success) {
        mainConfig.variables.list = varsData.data || varsData.variables || [];
      }

      renderTemplateModal(mainConfig);
      renderVariableModal(configData.createVariableModal);
    }
  } catch (error) {
    console.error("Error fetching templates data:", error);
  } finally {
    isFetchingTemplatesConfig = false;
  }
}

/**
 * Renders the create template modal contents
 */
function renderTemplateModal(config) {
  if (!config) return;

  const modalEl = document.getElementById("template");
  if (!modalEl) return;

  // Title
  const titleEl = modalEl.querySelector(".popup-header .text-dark");
  if (titleEl && config.title) {
    titleEl.innerHTML = `<span class="icon-layout-template me-2"></span> ${config.title}`;
  }

  // Email Subject Field
  if (config.fields.emailSubject) {
    const f = config.fields.emailSubject;
    const input = document.getElementById("exampleInputEmail1");
    if (input) {
      input.placeholder = f.placeholder || "";
      input.value = f.value || "";
      input.required = f.required || false;
      const label = input.closest(".mb-3")?.querySelector(".form-label");
      if (label) label.textContent = f.label;
    }
  }

  // Shortcut Field
  if (config.fields.shortcut) {
    const f = config.fields.shortcut;
    const input = document.getElementById("exampleInputshortcut");
    if (input) {
      input.placeholder = f.placeholder || "";
      input.value = f.value || "";
      input.required = f.required || false;
      const label = input.closest(".mb-3")?.querySelector(".form-label");
      if (label) label.textContent = f.label;
    }
  }

  // Template Body (Rich Text)
  if (config.fields.templateBody) {
    const f = config.fields.templateBody;
    const rteContainer = modalEl.querySelector(".rte-container");
    if (rteContainer) {
      const label = rteContainer.closest(".mb-3")?.querySelector(".form-label");
      if (label) label.textContent = f.label;
      const editor = rteContainer.querySelector(".rte-editor");
      if (editor) {
        editor.setAttribute("data-placeholder", f.placeholder || "");
        // Only set content if it's empty in config - usually it will be for 'create'
        if (f.value) {
          editor.innerHTML = f.value;
        }
      }
    }
  }

  // Variables
  if (config.variables) {
    const v = config.variables;
    const label = modalEl.querySelector('label[for="examplevariable"]');
    if (label) label.textContent = v.label;

    const listContainer = modalEl.querySelector(
      ".d-flex.flex-wrap.column-gap-2.row-gap-2",
    );
    if (listContainer) {
      // Find the "Create new variable" button first to preserve its attributes
      const createBtn = listContainer.querySelector(".create-btn");
      listContainer.innerHTML = "";

      if (v.list) {
        v.list.forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn btn-blue d-flex align-items-center column-gap-2";
          btn.innerHTML = `<span class="icon-plus d-flex align-items-center"></span> ${item.label}`;
          btn.addEventListener("click", function (e) {
            e.preventDefault();
            insertIntoRTE(`{{${item.key}}}`);
          });
          listContainer.appendChild(btn);
        });
      }

      if (createBtn) {
        const action = v.actions?.find((a) => a.action === "create_variable");
        if (action) {
          createBtn.innerHTML = `<span class="icon-plus d-flex align-items-center"></span> ${action.label}`;
        }
        listContainer.appendChild(createBtn);
      }
    }
  }

  // Saved Templates
  if (config.savedTemplates) {
    const s = config.savedTemplates;
    const label = modalEl.querySelector('label[for="exampletemplate"]');
    if (label) label.textContent = s.label;

    const listContainer = modalEl.querySelector(
      ".d-flex.flex-column.row-gap-3",
    );
    if (listContainer) {
      listContainer.innerHTML = "";
      if (s.items && s.items.length > 0) {
        s.items.forEach((item) => {
          const a = document.createElement("a");
          a.href = "#";
          a.innerHTML = `
            <div class="template-view d-flex flex-wrap  justify-content-between align-items-center">
              <p class="mb-0 fw-medium">${item.name || item.label || ""}</p>
              <div class="d-flex align-items-center column-gap-2">
                <span class="icon-edit-pencil"></span>
                <span class="icon-delete"></span>
              </div>
            </div>
          `;
          listContainer.appendChild(a);
        });
      }
    }
  }

  // Actions/Buttons
  if (config.actions) {
    const primary = config.actions.primary;
    const secondary =
      config.actions.secondary &&
      config.actions.secondary.find((a) => a.action === "ai_improve");

    const footerPrimary = modalEl.querySelector(".modal-footer .btn-primary");
    if (footerPrimary && primary) footerPrimary.textContent = primary.label;

    const formPrimary = modalEl.querySelector("form .btn-primary");
    if (formPrimary && primary) formPrimary.textContent = primary.label;

    const aiBtn = modalEl.querySelector(".btn-secondary.rounded-5");
    if (aiBtn && secondary) {
      aiBtn.innerHTML = `<span class="icon-ai"></span> ${secondary.label}`;
    }
  }
}

/**
 * Renders the create variable modal contents
 */
function renderVariableModal(config) {
  if (!config) return;

  const modalEl = document.getElementById("create-variable");
  if (!modalEl) return;

  // Title
  const titleEl = modalEl.querySelector(".popup-header div");
  if (titleEl && config.title) {
    titleEl.textContent = config.title;
  }

  // Fields
  if (config.fields.variableName) {
    const f = config.fields.variableName;
    const inputField = modalEl.querySelector("input");
    if (inputField) {
      inputField.placeholder = f.placeholder || "";
      inputField.value = f.value || "";
      inputField.required = f.required || false;
      const label = inputField.closest(".mb-3")?.querySelector(".form-label");
      if (label) label.textContent = f.label;
    }
  }

  // Buttons
  if (config.actions) {
    const primary = config.actions.primary;
    const secondary =
      config.actions.secondary &&
      config.actions.secondary.find((a) => a.action === "close_modal");

    const footerBtnPrimary = modalEl.querySelector(
      ".modal-footer .btn-primary",
    );
    if (footerBtnPrimary && primary)
      footerBtnPrimary.textContent = primary.label;

    const footerBtnSecondary = modalEl.querySelector(
      ".modal-footer .btn-secondary",
    );
    if (footerBtnSecondary && secondary)
      footerBtnSecondary.textContent = secondary.label;
  }
}

/**
 * Helper to insert text at the current cursor position in the template RTE
 */
function insertIntoRTE(text) {
  const editor = document.querySelector("#template .rte-editor");
  if (!editor) return;

  editor.focus();
  const selection = window.getSelection();

  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    // Check if the selection is inside the editor
    if (editor.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);

      // Move cursor to after the inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);

      editor.dispatchEvent(new Event("input"));
      return;
    }
  }

  // Fallback: append at the end if editor is empty or not focused
  editor.innerHTML += text;
  editor.dispatchEvent(new Event("input"));
}

/**
 * Setup Email Details Dropdown toggle
 */
function setupEmailDetailsToggle() {
  const toggle = document.getElementById("detailsToggle");
  const dropdown = document.getElementById("detailsDropdown");

  if (toggle && dropdown) {
    // Toggle on click
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdown.classList.toggle("d-none");
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
        dropdown.classList.add("d-none");
      }
    });

    // Prevent clicks inside dropdown from closing it
    dropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }
}

function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sets up the Settings modal listener
 */
function setupSettingsModal() {
  const modalEl = document.getElementById("setting");
  if (!modalEl) return;

  modalEl.addEventListener("show.bs.modal", function () {
    fetchSettingsData();
  });
}

/**
 * Fetches settings data from the API
 */
let isFetchingSettingsData = false;
async function fetchSettingsData(tabKey = null) {
  if (isFetchingSettingsData) return;
  isFetchingSettingsData = true;

  // If tabKey is provided, use its endpoint, otherwise use default
  const config = tabKey
    ? SETTINGS_TAB_CONFIG[tabKey]
    : SETTINGS_TAB_CONFIG.edit_profile;
  const url = config ? config.endpoint : API_ENDPOINTS.settings;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch settings");

    const data = await response.json();

    if (data.success) {
      // Update Main Modal Title
      const modalTitleEl = document.getElementById("settingLabel");
      if (modalTitleEl && data.title) {
        modalTitleEl.textContent = data.title;
      }

      renderSettingsSidebar(data.sidebar);

      // Branch rendering based on active item in sidebar
      const activeItem = data.sidebar.sections
        .flatMap((s) => s.items)
        .find((i) => i.active);

      if (activeItem && SETTINGS_TAB_CONFIG[activeItem.key]) {
        SETTINGS_TAB_CONFIG[activeItem.key].render(data.content);
      } else {
        // Fallback to the one we fetched
        if (config) config.render(data.content);
      }
    }
  } catch (error) {
    console.error("Error fetching settings:", error);
    showAppToast("Error loading settings", "error");
  } finally {
    isFetchingSettingsData = false;
  }
}

/**
 * Renders the settings sidebar dynamically
 */
function renderSettingsSidebar(sidebar) {
  const sidebarContainer = document.getElementById("v-pills-tab");
  if (!sidebarContainer || !sidebar || !sidebar.sections) return;

  sidebarContainer.innerHTML = "";

  // Helper to map keys to static target IDs in modals.html
  const keyToTarget = {
    edit_profile: "#v-pills-profile",
    signature: "#v-pills-signature",
    add_sub_user: "#v-pills-subuser",
    automatic_replies: "#v-pills-automaticreply",
  };

  // Helper to map icon keys to CSS classes
  const keyToIcon = {
    user: "icon-account",
    pen: "icon-signature",
    user_plus: "icon-add-user",
    reply: "icon-chat",
  };

  sidebar.sections.forEach((section) => {
    const heading = document.createElement("div");
    heading.className = "menu-heading";
    heading.innerHTML = `<span class="menu-label fw-medium">${escapeHtml(section.label)}</span>`;
    sidebarContainer.appendChild(heading);

    section.items.forEach((item) => {
      const button = document.createElement("button");
      button.className = `nav-link ${item.active ? "active" : ""}`;
      button.id = `v-pills-${item.key}-tab`;
      button.type = "button";
      button.setAttribute("data-bs-toggle", "pill");
      button.setAttribute(
        "data-bs-target",
        keyToTarget[item.key] || `#v-pills-${item.key}`,
      );
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", item.active ? "true" : "false");

      const iconClass = keyToIcon[item.icon] || `icon-${item.icon}`;
      button.innerHTML = `<span class="${iconClass}"></span> ${escapeHtml(item.label)}`;

      // Fetch tab content on click
      button.addEventListener("click", () => {
        if (SETTINGS_TAB_CONFIG[item.key]) {
          fetchSettingsData(item.key);
        } else {
          console.log(`Dynamic switching to ${item.key} not yet configured`);
        }
      });

      sidebarContainer.appendChild(button);
    });
  });
}

/**
 * Renders the Edit Profile tab content
 */
function renderSettingsEditProfile(content) {
  if (!content) return;

  const profilePane = document.getElementById("v-pills-profile");
  if (!profilePane) return;

  profilePane.innerHTML = "";
  const container = document.createElement("div");

  // Title & Description
  const title = document.createElement("p");
  title.className = "fw-semibold mb-0";
  title.textContent = content.title || "Edit Profile";
  container.appendChild(title);

  const desc = document.createElement("small");
  desc.className = "fs-13";
  desc.textContent = content.description || "";
  container.appendChild(desc);

  // Form
  const form = document.createElement("form");
  form.className = "row g-3 pt-3";

  const fields = content.fields;
  if (fields) {
    // 1. Account Selection (Dropdown)
    if (fields.account) {
      const field = fields.account;
      const col = document.createElement("div");
      col.className = "col-12";
      const label = document.createElement("label");
      label.className = "form-label";
      label.textContent = field.label;
      col.appendChild(label);

      const select = document.createElement("select");
      select.className = "form-select";
      if (field.options) {
        field.options.forEach((opt) => {
          const o = document.createElement("option");
          o.value = typeof opt === "string" ? opt : opt.value;
          o.textContent = typeof opt === "string" ? opt : opt.label;
          if (o.value === field.value) o.selected = true;
          select.appendChild(o);
        });
      }
      col.appendChild(select);
      form.appendChild(col);
    }

    // 2. Profile Photo (Image Upload)
    if (fields.profilePhoto) {
      const field = fields.profilePhoto;
      const col = document.createElement("div");
      col.className = "col-12";

      const photoWrapper = document.createElement("div");
      photoWrapper.className = "profile-photo-field";

      const img = document.createElement("img");
      img.className = "avatar";
      img.src = field.url || "images/avatar/avatar2.webp";
      img.alt = "Profile photo";
      photoWrapper.appendChild(img);

      const contentDiv = document.createElement("div");
      contentDiv.className =
        "d-flex justify-content-between align-items-center w-100";

      const leftSide = document.createElement("div");
      leftSide.className = "d-flex flex-column";

      const label = document.createElement("label");
      label.className = "form-label";
      label.textContent = field.label;
      leftSide.appendChild(label);

      const uploadBtn = document.createElement("button");
      uploadBtn.type = "button";
      uploadBtn.className = "upload-btn";
      const uploadAction = field.actions?.find(
        (a) => a.action === "upload_profile_photo",
      );
      uploadBtn.textContent = uploadAction?.label || "Upload Photo";
      uploadBtn.addEventListener("click", () =>
        document.getElementById("profilePhotoInputDynamic").click(),
      );
      leftSide.appendChild(uploadBtn);

      const fileInput = document.createElement("input");
      fileInput.id = "profilePhotoInputDynamic";
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.hidden = true;
      leftSide.appendChild(fileInput);

      contentDiv.appendChild(leftSide);

      const removeAction = field.actions?.find(
        (a) => a.action === "remove_profile_photo",
      );
      if (removeAction) {
        const removeBtn = document.createElement("a");
        removeBtn.href = "javascript:void(0);";
        removeBtn.className = "text-body"; // Using text-body for consistent look
        removeBtn.title = removeAction.label || "Remove";
        removeBtn.innerHTML = `<span class="icon-${removeAction.icon || "delete"}"></span>`;
        contentDiv.appendChild(removeBtn);
      }

      photoWrapper.appendChild(contentDiv);
      col.appendChild(photoWrapper);
      form.appendChild(col);
    }

    // 3. Name & Location (Text)
    ["name", "location"].forEach((key) => {
      if (fields[key]) {
        const field = fields[key];
        const col = document.createElement("div");
        col.className = "col-12";
        const label = document.createElement("label");
        label.className = "form-label";
        label.textContent = field.label;
        col.appendChild(label);

        const input = document.createElement("input");
        input.type = "text";
        input.className = "form-control";
        input.placeholder = field.placeholder || "";
        input.value = field.value || "";
        col.appendChild(input);
        form.appendChild(col);
      }
    });

    // 4. Bio (Textarea)
    if (fields.bio) {
      const field = fields.bio;
      const col = document.createElement("div");
      col.className = "col-12";
      const label = document.createElement("label");
      label.className = "form-label";
      label.textContent = field.label;
      col.appendChild(label);

      const area = document.createElement("textarea");
      area.className = "form-control";
      area.placeholder = field.placeholder || "";
      area.value = field.value || "";
      if (field.maxLength) area.maxLength = field.maxLength;
      col.appendChild(area);
      form.appendChild(col);
    }

    // 5. Default Text Style (Rich Text)
    if (fields.defaultTextStyle) {
      const rteCol = renderSettingsRichText(
        "defaultTextStyle",
        fields.defaultTextStyle,
      );
      form.appendChild(rteCol);
    }
  }

  container.appendChild(form);
  profilePane.appendChild(container);

  // Footer Actions
  if (content.actions) {
    const footer = document.createElement("div");
    footer.className = "modal-footer border-0 justify-content-start px-0 pb-0";

    if (content.actions.primary) {
      const btn = document.createElement("button");
      btn.type = "submit";
      btn.className = `btn btn-${content.actions.primary.style || "primary"}`;
      btn.textContent = content.actions.primary.label;
      footer.appendChild(btn);
    }

    if (content.actions.secondary) {
      const secondaryActions = Array.isArray(content.actions.secondary)
        ? content.actions.secondary
        : [content.actions.secondary];

      secondaryActions.forEach((act) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `btn btn-${act.style === "outline" ? "secondary" : act.style || "secondary"} rounded-5`;
        btn.textContent = act.label;
        if (act.action === "reset_changes") {
          btn.setAttribute("data-bs-dismiss", "modal");
        }
        footer.appendChild(btn);
      });
    }

    profilePane.appendChild(footer);
  }
}

/**
 * Renders the Add Sub User tab content dynamically
 */
function renderSettingsAddSubUser(content) {
  if (!content) return;

  const pane = document.getElementById("v-pills-subuser");
  if (!pane) return;

  pane.innerHTML = "";

  const container = document.createElement("div");

  // Title & Description
  const title = document.createElement("p");
  title.className = "fw-semibold mb-0";
  title.textContent = content.title || "Add sub user";
  container.appendChild(title);

  const desc = document.createElement("small");
  desc.className = "fs-13";
  desc.textContent = content.description || "";
  container.appendChild(desc);

  // Form
  const form = document.createElement("form");
  form.className = "row g-3 pt-3";

  if (content.fields) {
    // Define field order: Name, Username, Password, Confirm Password
    const fieldKeys = ["name", "username", "password", "confirmPassword"];

    fieldKeys.forEach((key) => {
      const fieldData = content.fields[key];
      if (!fieldData) return;

      const fieldCol = createSettingsFormField(key, fieldData);
      form.appendChild(fieldCol);
    });
  }

  container.appendChild(form);
  pane.appendChild(container);

  // Footer Actions
  if (content.actions) {
    const footer = document.createElement("div");
    footer.className = "modal-footer border-0 justify-content-start px-0 pb-0";

    if (content.actions.primary) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn btn-${content.actions.primary.style || "primary"}`;
      btn.textContent = content.actions.primary.label;

      btn.addEventListener("click", async () => {
        const name = container.querySelector("#input-name")?.value.trim();
        const username = container
          .querySelector("#input-username")
          ?.value.trim();
        const password = container.querySelector("#input-password")?.value;
        const confirmPassword = container.querySelector(
          "#input-confirmPassword",
        )?.value;

        // Validation
        if (!name || !username || !password || !confirmPassword) {
          showAppToast("All fields are required", "error");
          return;
        }

        if (password !== confirmPassword) {
          showAppToast("password not match", "error");
          return;
        }

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Creating...";

        try {
          const response = await fetch(API_ENDPOINTS.createSubUser, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              name,
              username,
              password,
              confirmPassword,
            }),
          });

          const result = await response.json();
          if (result.success) {
            showAppToast(
              result.message || "Sub-user created successfully",
              "success",
            );
            // Optionally clear form or close modal
            form.reset();
            const modalEl = document.getElementById("settingModal");
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
          } else {
            showAppToast(
              result.message || result.error || "Failed to create sub-user",
              "error",
            );
          }
        } catch (error) {
          console.error("Error creating sub-user:", error);
          showAppToast("Error creating sub-user", "error");
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });

      footer.appendChild(btn);
    }

    if (content.actions.secondary) {
      const secondaryActions = Array.isArray(content.actions.secondary)
        ? content.actions.secondary
        : [content.actions.secondary];

      secondaryActions.forEach((act) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `btn btn-${act.style === "outline" ? "secondary" : act.style || "secondary"} rounded-5`;
        btn.textContent = act.label;
        if (act.action === "reset_form") {
          btn.setAttribute("data-bs-dismiss", "modal");
        }
        footer.appendChild(btn);
      });
    }

    pane.appendChild(footer);
  }
}

/**
 * Helper to build common settings form fields
 */
function createSettingsFormField(key, field) {
  const col = document.createElement("div");
  col.className = "col-12";

  const label = document.createElement("label");
  label.className = "form-label";
  label.textContent = field.label;
  label.setAttribute("for", `input-${key}`);
  col.appendChild(label);

  const inputWrapper = document.createElement("div");
  inputWrapper.className = "position-relative";

  const input = document.createElement("input");
  input.className = "form-control";
  input.id = `input-${key}`;
  input.placeholder = field.placeholder || "";
  input.type = field.type || "text";
  if (field.required) input.required = true;
  if (field.value) input.value = field.value;

  inputWrapper.appendChild(input);

  if (field.type === "password" && field.visibilityToggle) {
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className =
      "btn border-0 position-absolute end-0 top-50 translate-middle-y";
    toggleBtn.innerHTML = '<i class="fi fi-rr-eye d-flex"></i>';
    toggleBtn.style.zIndex = "5";

    toggleBtn.addEventListener("click", () => {
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      toggleBtn.innerHTML = isPassword
        ? '<i class="fi fi-rr-eye-crossed d-flex"></i>'
        : '<i class="fi fi-rr-eye d-flex"></i>';
    });

    inputWrapper.appendChild(toggleBtn);
    input.style.paddingRight = "40px";
  }

  col.appendChild(inputWrapper);
  return col;
}

/**
 * Renders the Signature tab content dynamically
 */
function renderSettingsSignature(content) {
  if (!content) return;

  const pane = document.getElementById("v-pills-signature");
  if (!pane) return;

  pane.innerHTML = "";

  const container = document.createElement("div");

  // Header Area: Title & Header Actions
  const headerWrapper = document.createElement("div");
  headerWrapper.className =
    "d-flex justify-content-between align-items-center mb-3";

  const title = document.createElement("p");
  title.className = "fw-semibold mb-0";
  title.textContent = content.title || "Signature";
  headerWrapper.appendChild(title);

  const headerActionsContainer = document.createElement("div");
  headerActionsContainer.className = "d-flex align-items-center column-gap-3";

  if (content.headerActions) {
    content.headerActions.forEach((act) => {
      if (act.type === "button") {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "btn btn-secondary rounded-5 d-flex align-items-center column-gap-2";
        const icon = document.createElement("span");
        icon.className = `icon-${act.icon}`;
        btn.appendChild(icon);
        const label = document.createTextNode(` ${act.label}`);
        btn.appendChild(label);

        if (act.action === "create_signature") {
          btn.setAttribute("data-bs-toggle", "modal");
          btn.setAttribute("data-bs-target", "#newSignatureModal");
        }

        headerActionsContainer.appendChild(btn);
      } else if (act.type === "icon_button") {
        const link = document.createElement("a");
        link.href = "javascript:void(0);";
        link.className = "text-body";
        const icon = document.createElement("span");
        // Mapping common icons
        let iconClass = `icon-${act.icon}`;
        if (act.icon === "copy") iconClass = "icon-share-2"; // Fallback mapping
        if (act.icon === "delete") iconClass = "icon-delete";

        icon.className = iconClass;
        link.appendChild(icon);
        headerActionsContainer.appendChild(link);
      }
    });
  }
  headerWrapper.appendChild(headerActionsContainer);
  container.appendChild(headerWrapper);

  // Form Body
  const form = document.createElement("form");
  form.className = "row g-3";

  if (content.fields) {
    // 1. Signature Selector (Dropdown)
    if (content.fields.signatureSelector) {
      const field = content.fields.signatureSelector;
      const col = document.createElement("div");
      col.className = "col-12";
      const label = document.createElement("label");
      label.className = "form-label";
      label.textContent = field.label;
      col.appendChild(label);

      const select = document.createElement("select");
      select.className = "form-select";
      select.id = "signature-selector-dropdown";

      // Initial loading state for dropdown
      const loadingOpt = document.createElement("option");
      loadingOpt.textContent = "Loading signatures...";
      select.appendChild(loadingOpt);

      col.appendChild(select);
      form.appendChild(col);

      // Fetch signatures from the specialized endpoint
      fetch(API_ENDPOINTS.signaturesList, {
        headers: getAuthHeaders(),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.signatures) {
            select.innerHTML = "";
            data.signatures.forEach((sig) => {
              const o = document.createElement("option");
              o.value = sig.id;
              o.textContent = sig.name;
              if (String(field.value) === String(sig.id)) o.selected = true;
              // Attach content to dataset for easy retrieval
              o.dataset.content = sig.content || "";
              select.appendChild(o);
            });

            // Trigger content update when selection changes
            select.addEventListener("change", () => {
              const selectedOpt = select.options[select.selectedIndex];
              if (selectedOpt && selectedOpt.dataset.content) {
                setRTEContent(
                  "rte-container-signatureBody",
                  selectedOpt.dataset.content,
                );
              }
            });
          } else {
            loadingOpt.textContent = "Failed to load signatures";
          }
        })
        .catch((err) => {
          console.error("Error fetching signatures list:", err);
          loadingOpt.textContent = "Error loading signatures";
        });
    }

    // 2. Signature Body (Rich Text)
    if (content.fields.signatureBody) {
      const fieldCol = renderSettingsRichText(
        "signatureBody",
        content.fields.signatureBody,
      );
      form.appendChild(fieldCol);
    }

    // 3. Include AI Checkbox
    if (content.fields.includeAI) {
      const field = content.fields.includeAI;
      const col = document.createElement("div");
      col.className = "col-12";
      const checkDiv = document.createElement("div");
      checkDiv.className = "form-check";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "form-check-input";
      input.id = "check-include-ai";
      if (field.value) input.checked = true;

      const label = document.createElement("label");
      label.className = "form-check-label";
      label.textContent = field.label;
      label.setAttribute("for", "check-include-ai");

      checkDiv.appendChild(input);
      checkDiv.appendChild(label);
      col.appendChild(checkDiv);
      form.appendChild(col);
    }
  }

  container.appendChild(form);
  pane.appendChild(container);

  // Footer Actions
  if (content.actions) {
    const footer = document.createElement("div");
    footer.className = "modal-footer border-0 justify-content-start px-0 pb-0";

    if (content.actions.primary) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn btn-${content.actions.primary.style || "primary"} m-0`;
      btn.textContent = content.actions.primary.label;

      btn.addEventListener("click", async () => {
        const select = container.querySelector("#signature-selector-dropdown");
        const signatureId = select?.value;

        if (!signatureId) {
          showAppToast("Please select a signature to save", "error");
          return;
        }

        const signatureContent = getRTEContent("rte-container-signatureBody");

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Saving...";

        try {
          const response = await fetch(
            `${API_ENDPOINTS.updateSignature}/${signatureId}`,
            {
              method: "PUT",
              headers: getAuthHeaders(),
              body: JSON.stringify({
                content: signatureContent,
              }),
            },
          );

          const result = await response.json();
          if (result.success) {
            showAppToast(
              result.message || "Signature updated successfully",
              "success",
            );
            // Close modal
            const modalEl = document.getElementById("settingModal");
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
          } else {
            showAppToast(
              result.message || result.error || "Failed to update signature",
              "error",
            );
          }
        } catch (error) {
          console.error("Error updating signature:", error);
          showAppToast("Error updating signature", "error");
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });

      footer.appendChild(btn);
    }

    pane.appendChild(footer);
  }
}

/**
 * Renders the Automatic Replies tab content dynamically
 */
function renderSettingsAutomaticReplies(content) {
  if (!content) return;

  const pane = document.getElementById("v-pills-automaticreply");
  if (!pane) return;

  pane.innerHTML = "";

  const container = document.createElement("div");

  // Title & Description
  const title = document.createElement("p");
  title.className = "fw-semibold mb-0";
  title.textContent = content.title || "Automatic replies";
  container.appendChild(title);

  const desc = document.createElement("small");
  desc.className = "fs-13";
  desc.textContent = content.description || "";
  container.appendChild(desc);

  // Form
  const form = document.createElement("form");
  form.className = "row g-3 pt-3";

  // Render Toggles first
  const toggleControls = {};
  if (content.toggles) {
    Object.keys(content.toggles).forEach((key) => {
      const toggleData = content.toggles[key];
      const col = document.createElement("div");
      col.className =
        "col-12 d-flex align-items-center justify-content-between";

      const label = document.createElement("label");
      label.className = "form-check-label";
      label.textContent = toggleData.label;
      label.setAttribute("for", `toggle-${key}`);
      col.appendChild(label);

      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "form-check-input";
      input.id = `toggle-${key}`;
      input.checked = toggleData.checked;
      col.appendChild(input);

      form.appendChild(col);
      toggleControls[key] = input;
    });
  }

  // Render Fields
  const fieldControls = {};
  if (content.fields) {
    const fieldOrder = ["startTime", "endTime", "autoReplyMessage"];
    fieldOrder.forEach((key) => {
      const fieldData = content.fields[key];
      if (!fieldData) return;

      let col;
      if (fieldData.type === "date_input") {
        col = document.createElement("div");
        col.className = "col-md-6";
        const label = document.createElement("label");
        label.className = "form-label";
        label.textContent = fieldData.label;
        col.appendChild(label);

        const input = document.createElement("input");
        input.type = "date";
        input.className = "form-control";
        input.value = fieldData.value || "";
        col.appendChild(input);
        fieldControls[key] = { el: col, input: input };
      } else if (fieldData.type === "rich_text") {
        col = renderSettingsRichText(key, fieldData);
        fieldControls[key] = {
          el: col,
          wrapper: col.querySelector(".rte-container"),
        };
      }

      if (col) form.appendChild(col);
    });
  }

  // Dependency Logic
  const updateDependencies = () => {
    if (content.toggles) {
      Object.keys(content.toggles).forEach((key) => {
        const toggleData = content.toggles[key];
        const toggleInput = toggleControls[key];

        if (toggleData.dependsOn && toggleControls[toggleData.dependsOn]) {
          const parent = toggleControls[toggleData.dependsOn];
          toggleInput.disabled = !parent.checked;
          toggleInput.closest(".col-12").style.opacity = parent.checked
            ? "1"
            : "0.5";
        }
      });
    }

    if (content.fields) {
      Object.keys(content.fields).forEach((key) => {
        const fieldData = content.fields[key];
        if (fieldData.enabledWhen && toggleControls[fieldData.enabledWhen]) {
          const toggle = toggleControls[fieldData.enabledWhen];
          const control = fieldControls[key];
          if (control) {
            const isEnabled = toggle.checked && !toggle.disabled;
            if (control.input) control.input.disabled = !isEnabled;
            control.el.style.opacity = isEnabled ? "1" : "0.5";
            if (control.wrapper) {
              // For RTE, toggle contenteditable if possible
              const editor = control.wrapper.querySelector(".rte-editor");
              if (editor) editor.contentEditable = isEnabled;
            }
          }
        }
      });
    }
  };

  // Attach Listeners
  Object.values(toggleControls).forEach((input) => {
    input.addEventListener("change", updateDependencies);
  });

  container.appendChild(form);
  pane.appendChild(container);

  // Footer Actions
  if (content.actions) {
    const footer = document.createElement("div");
    footer.className = "modal-footer border-0 justify-content-start px-0 pb-0";

    if (content.actions.primary) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn btn-${content.actions.primary.style || "primary"}`;
      btn.textContent = content.actions.primary.label;

      btn.addEventListener("click", async () => {
        // Collect data
        const payload = {
          enableAutoReply: toggleControls.enableAutoReply?.checked || false,
          limitByTime: toggleControls.limitByTime?.checked || false,
          startTime: fieldControls.startTime?.input?.value || null,
          endTime: fieldControls.endTime?.input?.value || null,
          autoReplyMessage: getRTEContent("rte-container-autoReplyMessage"),
        };

        // Basic validation: if auto reply is enabled, message shouldn't be empty
        const strippedMessage = payload.autoReplyMessage
          .replace(/<[^>]*>/g, "")
          .trim();
        if (payload.enableAutoReply && !strippedMessage) {
          showAppToast("Auto-reply message cannot be empty", "error");
          return;
        }

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Saving...";

        try {
          const response = await fetch(API_ENDPOINTS.saveAutoReplies, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
          });

          const result = await response.json();
          if (result.success) {
            showAppToast(
              result.message || "Settings saved successfully",
              "success",
            );
            const modalEl = document.getElementById("settingModal");
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
          } else {
            showAppToast(
              result.message || result.error || "Failed to save settings",
              "error",
            );
          }
        } catch (error) {
          console.error("Error saving auto-replies:", error);
          showAppToast("Error saving settings", "error");
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });

      footer.appendChild(btn);
    }

    if (content.actions.secondary) {
      const secondaryActions = Array.isArray(content.actions.secondary)
        ? content.actions.secondary
        : [content.actions.secondary];

      secondaryActions.forEach((act) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `btn btn-${act.style === "outline" ? "secondary" : act.style || "secondary"} rounded-5`;
        btn.textContent = act.label;
        if (act.action === "reset_auto_reply" || act.action === "reset_form") {
          btn.setAttribute("data-bs-dismiss", "modal");
        }
        footer.appendChild(btn);
      });
    }

    pane.appendChild(footer);
  }

  // Initial update
  updateDependencies();
}

/**
 * Reusable helper to render a Rich Text Editor field
 */
function renderSettingsRichText(key, fieldData) {
  const col = document.createElement("div");
  col.className = "col-12";

  const label = document.createElement("label");
  label.className = "form-label mb-2 d-block";
  label.textContent = fieldData.label;
  col.appendChild(label);

  const mount = document.createElement("div");
  mount.className = "rte-mount";
  mount.id = `rte-container-${key}`;
  mount.setAttribute(
    "data-placeholder",
    fieldData.placeholder || "Enter your message here....",
  );
  mount.setAttribute("data-target", `input-${key}`);

  col.appendChild(mount);

  // Initialize RTE using the shared logic in rte-editor.js
  if (typeof initRTE === "function") {
    // Wait for DOM or use direct init if possible.
    // Since we are adding it to the DOM now:
    setTimeout(() => {
      initRTE(col);
      // Set initial value
      if (fieldData.value) {
        setRTEContent(`rte-container-${key}`, fieldData.value);
      }
    }, 0);
  }

  return col;
}

function initAskAIPopup() {
  document.addEventListener(
    "click",
    (e) => {
      // Ask AI
      const askAiTrigger = e.target.closest(".ask-ai");
      if (askAiTrigger) {
        const panel = document.querySelector(".mail-askaipopup");
        // If panel doesn't have 'show', it's about to be opened
        if (panel && !panel.classList.contains("show")) {
          console.log("Ask AI trigger clicked, loading dynamic content...");
          setTimeout(() => initAskAIPanel(), 150);
        }
      }

      // Team
      const teamTrigger = e.target.closest(".add-team");
      if (teamTrigger) {
        const panel = document.querySelector(".mail-teampopup");
        if (panel && !panel.classList.contains("show")) {
          console.log("Team trigger clicked, loading dynamic content...");
          setTimeout(() => initTeamPanel(), 150);
        }
      }

      // Open Email
      const openTrigger = e.target.closest(".open-email");
      if (openTrigger) {
        const panel = document.querySelector(".mail-openpopup");
        if (panel && !panel.classList.contains("show")) {
          console.log("Open trigger clicked, loading dynamic content...");
          setTimeout(() => initOpenedEmailPanel(), 150);
        }
      }

      // Unopen
      const unopenTrigger = e.target.closest(".unopen-email");
      if (unopenTrigger) {
        const panel = document.querySelector(".mail-unopenpopup");
        if (panel && !panel.classList.contains("show")) {
          console.log("Unopen trigger clicked, loading dynamic content...");
          setTimeout(() => initUnopenEmailPanel(), 150);
        }
      }

      // Assign Email
      const assignTrigger = e.target.closest(".assign-email");
      if (assignTrigger) {
        const panel = document.querySelector(".mail-assignpopup");
        if (panel && !panel.classList.contains("show")) {
          console.log("Assign trigger clicked, loading dynamic content...");
          setTimeout(() => initAssignEmailPanel(), 150);
        }
      }

      // Connect
      const connectTrigger = e.target.closest(".connect");
      if (connectTrigger) {
        const panel = document.querySelector(".mail-connectpopup");
        if (panel && !panel.classList.contains("show")) {
          console.log("Connect trigger clicked, loading dynamic content...");
          setTimeout(() => initConnectPanel(), 150);
        }
      }
    },
    true, // Capture phase to catch the state before main.js toggles it
  );
}

// Immediate execution
initAskAIPopup();

/**
 * Team Dynamic Rendering & Logic
 */
async function initTeamPanel() {
  const desktopTarget = document.getElementById("content-team-desktop");
  const mobileTarget = document.getElementById("content-team-mobile");

  if (!desktopTarget && !mobileTarget) return;

  if (desktopTarget) desktopTarget.innerHTML = APP_SPINNER_HTML;
  if (mobileTarget) mobileTarget.innerHTML = APP_SPINNER_HTML;

  try {
    const response = await fetch(API_ENDPOINTS.teamConfig, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success || data.tabs) {
      renderTeamPanel(data);
    } else {
      const errorMsg = `<div class="p-3 text-danger">Failed to load Team config.</div>`;
      if (desktopTarget) desktopTarget.innerHTML = errorMsg;
      if (mobileTarget) mobileTarget.innerHTML = errorMsg;
    }
  } catch (err) {
    console.error("Error loading Team Panel:", err);
    const errorMsg = `<div class="p-3 text-danger text-center mt-5">Error connecting to Team service.</div>`;
    if (desktopTarget) desktopTarget.innerHTML = errorMsg;
    if (mobileTarget) mobileTarget.innerHTML = errorMsg;
  }
}

function renderTeamPanel(data) {
  const desktopTarget = document.getElementById("content-team-desktop");
  const mobileTarget = document.getElementById("content-team-mobile");

  if (!desktopTarget && !mobileTarget) return;

  // Render to desktop if exists
  if (desktopTarget) {
    renderTeamToElement(desktopTarget, data);
  }

  // Render to mobile if exists
  if (mobileTarget) {
    renderTeamToElement(mobileTarget, data);
  }
}

function renderTeamToElement(target, data) {
  target.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "mail-body w-100 h-100 d-flex flex-column";

  // Header
  const header = document.createElement("div");
  header.className = "popup-header";
  header.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center column-gap-2 text-dark">
                <span class="icon-contact"></span> ${data.title || "Add to Team"}
            </div>
            <div class="d-flex align-items-center column-gap-3">
                <a href="javascript:void(0);" class="btn-modal-minimize"><span class="icon-minus"></span></a>
                <a href="javascript:void(0);" class="btn-fullwidth-toggle"><span class="icon-maximize-2"></span></a>
                <a href="javascript:void(0);" class="close"><span class="icon-x"></span></a>
            </div>
        </div>
    `;
  wrapper.appendChild(header);

  // Body
  const body = document.createElement("div");
  body.className = "popup-body h-100 flex-grow-1";

  const outerRow = document.createElement("div");
  outerRow.className = "row h-100";

  const outerCol = document.createElement("div");
  outerCol.className = "col-12 h-100";

  if (data.tabs) {
    const tabContainer = document.createElement("div");
    tabContainer.className =
      "card card-body overflow-hidden team-wrapper p-3 h-100";

    const teamNav = document.createElement("div");
    teamNav.className = "team-nav";

    const targetIdPrefix = target.id || "default";

    // Nav Tabs
    const navUl = document.createElement("ul");
    navUl.className = "nav nav-tabs column-gap-2 nav-pills mb-3";
    navUl.id = `pills-tab-team-${targetIdPrefix}`;
    navUl.role = "tablist";

    // Tab Content Wrapper
    const tabContent = document.createElement("div");
    tabContent.className = "tab-content";
    tabContent.id = `pills-tabContent-team-${targetIdPrefix}`;

    data.tabs.items.forEach((tab, index) => {
      const isActive = tab.key === data.tabs.active;

      // Create Tab Link
      const navLi = document.createElement("li");
      navLi.className = "nav-item";
      navLi.role = "presentation";

      const navBtn = document.createElement("button");
      navBtn.className = `nav-link ${isActive ? "active" : ""}`;
      navBtn.id = `pills-${tab.key}-tab-${targetIdPrefix}`;
      navBtn.setAttribute("data-bs-toggle", "pill");
      navBtn.setAttribute(
        "data-bs-target",
        `#pills-${tab.key}-${targetIdPrefix}`,
      );
      navBtn.type = "button";
      navBtn.role = "tab";
      navBtn.textContent = tab.label;

      navLi.appendChild(navBtn);
      navUl.appendChild(navLi);

      // Create Tab Pane
      const pane = document.createElement("div");
      pane.className = `tab-pane fade ${isActive ? "show active" : ""}`;
      pane.id = `pills-${tab.key}-${targetIdPrefix}`;
      pane.role = "tabpanel";

      const contentDiv = document.createElement("div");
      contentDiv.className = "mt-3";

      if (tab.content.description) {
        const desc = document.createElement("p");
        desc.textContent = tab.content.description;
        contentDiv.appendChild(desc);
      }

      if (tab.content.note) {
        const note = document.createElement("p");
        note.textContent = tab.content.note;
        contentDiv.appendChild(note);
      }

      const form = document.createElement("div");
      form.className = "g-3";

      const fields = tab.content.fields;
      const fieldEntries = Object.entries(fields || {});

      fieldEntries.forEach(([fieldKey, fieldData]) => {
        const fieldWrapper = document.createElement("div");
        fieldWrapper.className = "mb-3";

        if (fieldData.type === "textarea") {
          const textarea = document.createElement("textarea");
          textarea.className = "form-control";
          textarea.rows = 5;
          textarea.placeholder = fieldData.placeholder || "";
          textarea.id = `invite-${fieldKey}`;
          textarea.value = fieldData.value || "";
          fieldWrapper.appendChild(textarea);
        }
        form.appendChild(fieldWrapper);
      });

      // Actions
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "column-gap-2 d-flex";

      const primaryAction = tab.content.actions?.primary;
      const secondaryAction = tab.content.actions?.secondary;

      if (primaryAction) {
        const pBtn = document.createElement("button");
        pBtn.className = `btn btn-${primaryAction.variant || primaryAction.style || "primary"}`;
        pBtn.textContent = primaryAction.label;
        pBtn.addEventListener("click", async () => {
          const fieldKey = Object.keys(fields)[0];
          const textarea = form.querySelector(`#invite-${fieldKey}`);
          const inputValue = textarea?.value.trim();

          if (!inputValue && primaryAction.action !== "copy_join_link") {
            showAppToast("Please enter an email or name", "error");
            return;
          }

          pBtn.disabled = true;
          const originalText = pBtn.textContent;
          pBtn.textContent = "Processing...";

          try {
            const isSales =
              tab.key === "talk_to_sales" ||
              primaryAction.action === "send_to_sales";
            const endpoint = isSales
              ? API_ENDPOINTS.talkToSales
              : API_ENDPOINTS.teamInvite;

            const payload = {};
            // Use the actual field key from the API config (contactInput or inviteInput)
            payload[fieldKey] = inputValue;

            const res = await fetch(endpoint, {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (result.success) {
              showAppToast(
                result.message ||
                  (isSales ? "Request sent to sales!" : "Invitation sent!"),
                "success",
              );
              if (textarea) textarea.value = "";
            } else {
              showAppToast(
                result.error || result.message || "Failed to process",
                "error",
              );
            }
          } catch (err) {
            console.error("Action error:", err);
            showAppToast("Error processing request", "error");
          } finally {
            pBtn.disabled = false;
            pBtn.textContent = originalText;
          }
        });
        actionsDiv.appendChild(pBtn);
      }

      if (secondaryAction) {
        const sBtn = document.createElement("button");
        sBtn.className = `btn btn-${secondaryAction.variant || secondaryAction.style || "secondary"} rounded-5`;
        sBtn.textContent = secondaryAction.label;
        sBtn.addEventListener("click", async () => {
          sBtn.disabled = true;
          try {
            const res = await fetch(API_ENDPOINTS.teamInvite, {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify({ action: "copy_join_link" }),
            });
            const result = await res.json();
            if (result.success) {
              if (result.join_link) {
                await navigator.clipboard.writeText(result.join_link);
              }
              showAppToast(
                result.message || "Join link copied to clipboard!",
                "success",
              );
            } else {
              showAppToast(result.error || "Failed to copy link", "error");
            }
          } catch (err) {
            showAppToast("Error copying link", "error");
          } finally {
            sBtn.disabled = false;
          }
        });
        actionsDiv.appendChild(sBtn);
      }

      form.appendChild(actionsDiv);
      contentDiv.appendChild(form);
      pane.appendChild(contentDiv);
      tabContent.appendChild(pane);
    });

    teamNav.appendChild(navUl);
    teamNav.appendChild(tabContent);
    tabContainer.appendChild(teamNav);
    outerCol.appendChild(tabContainer);
    outerRow.appendChild(outerCol);
    body.appendChild(outerRow);
  }

  wrapper.appendChild(body);
  target.appendChild(wrapper);

  // Close events
  const closeBtn = wrapper.querySelector(".close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const popup = target.closest(".mail-teampopup");
      if (popup) {
        popup.classList.remove("show");
        document.querySelector(".mail-wrapper")?.classList.remove("popup-open");
        document
          .querySelector(".mail-wrapper")
          ?.setAttribute("style", "width: 100%");
      }
    });
  }
}

async function initAskAIPanel() {
  const desktopTarget = document.getElementById("content-ask-ai-desktop");
  const mobileTarget = document.getElementById("content-ask-ai-mobile");

  if (!desktopTarget && !mobileTarget) return;

  if (desktopTarget) desktopTarget.innerHTML = APP_SPINNER_HTML;
  if (mobileTarget) mobileTarget.innerHTML = APP_SPINNER_HTML;

  try {
    const response = await fetch(API_ENDPOINTS.askAI, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success || data.fields || data.sections) {
      renderAskAI(data);
    } else {
      const errorMsg = `<div class="p-3 text-danger">Failed to load AI config.</div>`;
      if (desktopTarget) desktopTarget.innerHTML = errorMsg;
      if (mobileTarget) mobileTarget.innerHTML = errorMsg;
    }
  } catch (err) {
    console.error("Error loading Ask AI:", err);
    const errorMsg = `<div class="p-3 text-danger text-center mt-5">Error connecting to AI service.</div>`;
    if (desktopTarget) desktopTarget.innerHTML = errorMsg;
    if (mobileTarget) mobileTarget.innerHTML = errorMsg;
  }
}

function renderAskAI(data) {
  const desktopTarget = document.getElementById("content-ask-ai-desktop");
  const mobileTarget = document.getElementById("content-ask-ai-mobile");

  if (!desktopTarget && !mobileTarget) return;

  if (desktopTarget) renderAskAIToElement(desktopTarget, data);
  if (mobileTarget) renderAskAIToElement(mobileTarget, data);
}

function renderAskAIToElement(target, data) {
  target.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "mail-body w-100 h-100 d-flex flex-column";

  // Header
  const header = document.createElement("div");
  header.className = "popup-header";
  header.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center column-gap-2 text-dark">
                <span class="icon-brain"></span> ${data.title || "Ask AI"}
            </div>
            <div class="d-flex align-items-center column-gap-3">
                <a href="javascript:void(0);" class="btn-modal-minimize"><span class="icon-minus"></span></a>
                <a href="javascript:void(0);" class="btn-fullwidth-toggle"><span class="icon-maximize-2"></span></a>
                <a href="javascript:void(0);" class="close"><span class="icon-x"></span></a>
            </div>
        </div>
    `;
  wrapper.appendChild(header);

  // Body
  const body = document.createElement("div");
  body.className = "popup-body h-100 flex-grow-1";

  const chatWrapper = document.createElement("div");
  chatWrapper.className = "chat-wrapper d-flex flex-column h-100";

  // Message List Section
  const messageListSection = data.sections?.find(
    (s) => s.type === "message_list",
  );
  const msgList = document.createElement("div");
  msgList.className = "chat-messages p-3 flex-grow-1 overflow-auto";
  msgList.style.maxHeight = "calc(100vh - 200px)";

  if (messageListSection?.emptyState) {
    msgList.innerHTML = `<div class="text-center text-muted mt-5 px-4"><p class="fs-13">${messageListSection.emptyState}</p></div>`;
  }

  chatWrapper.appendChild(msgList);

  // Input Area Section
  const fields = data.fields;
  if (fields?.message) {
    const inputArea = document.createElement("div");
    inputArea.className = "chat-input p-3 border-top bg-white";

    const inputGroup = document.createElement("div");
    inputGroup.className = "d-flex align-items-center gap-2";

    const textarea = document.createElement("textarea");
    textarea.className = "form-control border-0 bg-light p-2 fs-13";
    textarea.rows = 1;
    textarea.placeholder =
      fields.message.placeholder || "Type your message here";
    textarea.style.resize = "none";
    textarea.style.minHeight = "40px";
    inputGroup.appendChild(textarea);

    const primaryAction = data.actions?.primary;
    if (primaryAction) {
      const sendBtn = document.createElement("button");
      sendBtn.className = `btn btn-${primaryAction.style || "primary"} rounded-circle p-2 d-flex align-items-center justify-content-center`;
      sendBtn.style.width = "40px";
      sendBtn.style.height = "40px";

      if (primaryAction.icon) {
        sendBtn.innerHTML = `<span class="icon-${primaryAction.icon}"></span>`;
      } else {
        sendBtn.textContent = primaryAction.label;
      }
      sendBtn.title = primaryAction.label;

      // Send Message Event
      const sendMessage = async () => {
        const message = textarea.value.trim();
        if (!message) return;

        // Add user message to UI
        const userMsgDiv = document.createElement("div");
        userMsgDiv.className = "chat-message mb-3 text-end";
        userMsgDiv.innerHTML = `
                    <p class="mb-1 fw-medium text-primary fs-13">You</p>
                    <p class="mb-0 fs-13">${message}</p>
                `;
        // Clear empty state if visible
        if (msgList.querySelector(".text-muted")) {
          msgList.innerHTML = "";
        }
        msgList.appendChild(userMsgDiv);
        textarea.value = "";
        msgList.scrollTop = msgList.scrollHeight;

        // Auto-scroll logic
        msgList.scrollTop = msgList.scrollHeight;

        // POST call
        sendBtn.disabled = true;
        try {
          const res = await fetch(API_ENDPOINTS.askAI, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ message }),
          });
          const result = await res.json();
          if (result.success) {
            // Optional: If AI returns a response immediately, show it.
            if (result.reply) {
              const aiMsgDiv = document.createElement("div");
              aiMsgDiv.className = "chat-message mb-3";
              aiMsgDiv.innerHTML = `
                    <p class="mb-1 fw-medium text-dark fs-13">AI Assistant</p>
                    <p class="mb-0 fs-13">${result.reply}</p>
                `;
              msgList.appendChild(aiMsgDiv);
              msgList.scrollTop = msgList.scrollHeight;
            }
          } else {
            showAppToast(
              result.error || result.message || "Failed to send message",
              "error",
            );
          }
        } catch (err) {
          console.error("Error sending message:", err);
          showAppToast("Error sending message", "error");
        } finally {
          sendBtn.disabled = false;
        }
      };

      sendBtn.addEventListener("click", sendMessage);
      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      inputGroup.appendChild(sendBtn);
    }

    inputArea.appendChild(inputGroup);
    chatWrapper.appendChild(inputArea);
  }

  body.appendChild(chatWrapper);
  wrapper.appendChild(body);
  target.appendChild(wrapper);

  // Re-attach close events (logic from main.js)
  const closeBtn = wrapper.querySelector(".close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Find the parent and trigger closing logic if any.
      // GmailSidePanel logic already handles hiding when .close is clicked,
      // but since we replaced the innerHTML, we might need to re-bind or rely on event delegation.
      // For now, let's trigger a click on a hidden static close if needed, or manually hide.
      const popup = target.closest(".mail-askaipopup");
      if (popup) {
        popup.classList.remove("show");
        document.querySelector(".mail-wrapper")?.classList.remove("popup-open");
        document
          .querySelector(".mail-wrapper")
          ?.setAttribute("style", "width: 100%");
      }
    });
  }
}
/**
 * Assign Email Dynamic Rendering & Logic
 */
async function initAssignEmailPanel() {
  const desktopTarget = document.getElementById("content-assign-email-desktop");
  const mobileTarget = document.getElementById("content-assign-email-mobile");

  if (!desktopTarget && !mobileTarget) return;

  if (desktopTarget) desktopTarget.innerHTML = APP_SPINNER_HTML;
  if (mobileTarget) mobileTarget.innerHTML = APP_SPINNER_HTML;

  try {
    // Ideally email_id should be dynamic from current selection,
    // using provided example ID for now.
    const emailId = "19c0be8c64efe2d6";
    const response = await fetch(
      `${API_ENDPOINTS.assignEmail}?email_id=${emailId}`,
      {
        headers: getAuthHeaders(),
      },
    );
    const data = await response.json();
    if (data.context) {
      renderAssignEmailPanel(data);
    } else {
      const errorMsg = `<div class="p-3 text-danger">Failed to load Assign config.</div>`;
      if (desktopTarget) desktopTarget.innerHTML = errorMsg;
      if (mobileTarget) mobileTarget.innerHTML = errorMsg;
    }
  } catch (err) {
    console.error("Error loading Assign Panel:", err);
    const errorMsg = `<div class="p-3 text-danger text-center mt-5">Error connecting to Assign service.</div>`;
    if (desktopTarget) desktopTarget.innerHTML = errorMsg;
    if (mobileTarget) mobileTarget.innerHTML = errorMsg;
  }
}

function renderAssignEmailPanel(data) {
  const desktopTarget = document.getElementById("content-assign-email-desktop");
  const mobileTarget = document.getElementById("content-assign-email-mobile");

  if (desktopTarget) {
    renderAssignEmailToElement(desktopTarget, data);
  }
  if (mobileTarget) {
    renderAssignEmailToElement(mobileTarget, data);
  }
}

function renderAssignEmailToElement(target, data) {
  target.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "mail-body w-100 h-100 d-flex flex-column";

  // Header
  const header = document.createElement("div");
  header.className = "popup-header";
  header.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center column-gap-2 text-dark">
                <span class="icon-team"></span> ${data.title || "Assign Email"}
            </div>
            <div class="d-flex align-items-center column-gap-3">
                <a href="javascript:void(0);" class="btn-modal-minimize"><span class="icon-minus"></span></a>
                <a href="javascript:void(0);" class="btn-fullwidth-toggle"><span class="icon-maximize-2"></span></a>
                <a href="javascript:void(0);" class="close"><span class="icon-x"></span></a>
            </div>
        </div>
    `;
  wrapper.appendChild(header);

  // Body
  const body = document.createElement("div");
  body.className = "popup-body h-100 flex-grow-1 overflow-auto scroll";

  const outerCol = document.createElement("div");
  outerCol.className = "col-12 p-3";

  // Currently Assigned
  const assignedInfo = document.createElement("div");
  assignedInfo.className = "mb-4";
  assignedInfo.innerHTML = `
        <p class="text-assign mb-3 fw-medium fs-14"> 
            ${data.context.currentlyAssignedTo.label} 
            <span class="text-primary"> ${data.context.currentlyAssignedTo.name} </span> 
        </p>
        <div class="p-3 border rounded-3 bg-white mb-3">
            <div class="d-flex align-items-center column-gap-2">
                <div class="avatar rounded-circle flex-shrink-0" style="width: 40px; height: 40px;">
                    <img src="${data.context.user.avatar || "images/avatar/avatar1.webp"}" class="w-100 h-100 rounded-circle" alt="">
                </div>
                <div class="chat-avatar-info overflow-hidden">
                    <h6 class="mb-0 fs-14 text-truncate">${data.context.user.name}</h6>
                    <span class="fs-12 text-secondary text-truncate d-block">${data.context.user.email}</span>
                </div>
            </div>
            <button class="btn btn-${data.actions.quickAssign.variant || "primary"} w-100 mt-2 btn-sm">
                ${data.actions.quickAssign.label}
            </button>
        </div>
    `;
  outerCol.appendChild(assignedInfo);

  // Search
  const searchDiv = document.createElement("div");
  searchDiv.className = "mb-4";
  searchDiv.innerHTML = `
        <div class="d-flex align-items-center rounded-2 position-relative w-100">
            <i class="fi fi-rr-search search-icon d-flex align-items-center" style="position: absolute; left: 15px;"></i>
            <input type="text" class="form-control ps-5 panel-search" placeholder="${data.search.placeholder || "Search people..."}">
        </div>
    `;
  outerCol.appendChild(searchDiv);

  // Team Members List
  const teamTitle = document.createElement("p");
  teamTitle.className = "text-dark mb-2 fs-14 fw-medium";
  teamTitle.textContent = "Team Members";
  outerCol.appendChild(teamTitle);

  const teamListContainer = document.createElement("div");
  teamListContainer.className = "row row-gap-3 mb-4";

  function populateTeam(filterText = "") {
    teamListContainer.innerHTML = "";
    const members = data.teamMembers.items || [];
    const query = filterText.toLowerCase();

    members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.email.toLowerCase().includes(query),
      )
      .forEach((member) => {
        const col = document.createElement("div");
        col.className = "col-12";
        col.innerHTML = `
                <div class="border p-3 rounded-3 bg-white">
                    <div class="d-flex align-items-center column-gap-2 mb-2">
                        <div class="avatar rounded-circle flex-shrink-0" style="width: 32px; height: 32px;">
                            <img src="${member.avatar || "images/avatar/avatar1.webp"}" class="w-100 h-100 rounded-circle" alt="">
                        </div>
                        <div class="chat-avatar-info overflow-hidden">
                            <h6 class="mb-0 fs-14 text-truncate">${member.name}</h6>
                            <span class="fs-12 text-secondary text-truncate d-block">${member.email}</span>
                        </div>
                    </div>
                    <button class="btn btn-secondary btn-sm w-100">Assign</button>
                </div>
            `;
        teamListContainer.appendChild(col);
      });

    if (teamListContainer.innerHTML === "") {
      teamListContainer.innerHTML = `<div class="col-12 text-center py-3 text-secondary">No members found</div>`;
    }
  }

  populateTeam();

  const searchInput = searchDiv.querySelector(".panel-search");
  searchInput.addEventListener("input", (e) => populateTeam(e.target.value));

  outerCol.appendChild(teamListContainer);

  // Assigned History
  if (data.assignedEmails) {
    const historySection = document.createElement("div");
    historySection.className = "assigned-history";
    historySection.innerHTML = `<p class="text-dark mb-3 fs-14 fw-medium border-top pt-3">${data.assignedEmails.title}</p>`;

    const historyList = document.createElement("div");
    historyList.className = "d-flex flex-column row-gap-3";

    const items = data.assignedEmails.items || [];
    items.forEach((group) => {
      const dateGroup = document.createElement("div");
      dateGroup.innerHTML = `<p class="mb-2 label fs-12 fw-medium">Date: ${group.date}</p>`;

      group.emails.forEach((email) => {
        const box = document.createElement("div");
        box.className =
          "boxopen p-3 d-flex flex-column row-gap-2 position-relative rounded-3 border bg-white";
        box.innerHTML = `
                <a href="javascript:void(0);" class="bel-pos position-absolute end-0 top-0 p-2"><span class="icon-bell-ring"></span></a>
                <p class="mb-0 fs-13 fw-medium">From: <span class="text-secondary fw-normal">${email.from}</span></p>
                <p class="mb-0 fs-13 fw-medium">Label: <span class="text-secondary fw-normal">${email.label}</span></p>
                <p class="mb-0 fs-13 fw-medium">Subject: <span class="text-secondary fw-normal">${email.subject}</span></p>
            `;
        dateGroup.appendChild(box);
      });
      historyList.appendChild(dateGroup);
    });

    if (items.length === 0) {
      historyList.innerHTML = `<div class="text-center py-3 text-secondary fs-13">No assigned emails yet.</div>`;
    }

    historySection.appendChild(historyList);
    outerCol.appendChild(historySection);
  }

  body.appendChild(outerCol);
  wrapper.appendChild(body);
  target.appendChild(wrapper);
}
/**
 * Unopened Emails Dynamic Rendering & Logic
 */
async function initUnopenEmailPanel() {
  const desktopTarget = document.getElementById("content-unopen-email-desktop");
  const mobileTarget = document.getElementById("content-unopen-email-mobile");

  if (!desktopTarget && !mobileTarget) return;

  if (desktopTarget) desktopTarget.innerHTML = APP_SPINNER_HTML;
  if (mobileTarget) mobileTarget.innerHTML = APP_SPINNER_HTML;

  try {
    const userEmail = "arunloganathan01@gmail.com"; // Should ideally be dynamic
    const response = await fetch(
      `${API_ENDPOINTS.unopenedEmails}?email=${userEmail}`,
      {
        headers: getAuthHeaders(),
      },
    );
    const data = await response.json();
    if (data.unopenedEmails) {
      renderUnopenEmailPanel(data);
    } else {
      const errorMsg = `<div class="p-3 text-danger">Failed to load unopened emails.</div>`;
      if (desktopTarget) desktopTarget.innerHTML = errorMsg;
      if (mobileTarget) mobileTarget.innerHTML = errorMsg;
    }
  } catch (err) {
    console.error("Error loading Unopened Emails:", err);
    const errorMsg = `<div class="p-3 text-danger text-center mt-5">Error connecting to Email service.</div>`;
    if (desktopTarget) desktopTarget.innerHTML = errorMsg;
    if (mobileTarget) mobileTarget.innerHTML = errorMsg;
  }
}

function renderUnopenEmailPanel(data) {
  const desktopTarget = document.getElementById("content-unopen-email-desktop");
  const mobileTarget = document.getElementById("content-unopen-email-mobile");

  if (desktopTarget) {
    renderUnopenEmailToElement(desktopTarget, data);
  }
  if (mobileTarget) {
    renderUnopenEmailToElement(mobileTarget, data);
  }
}

function renderUnopenEmailToElement(target, data) {
  target.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "mail-body w-100 h-100 d-flex flex-column";

  // Header
  const header = document.createElement("div");
  header.className = "popup-header";
  header.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center column-gap-2 text-dark">
                <span class="icon-package"></span> Unopened Emails
            </div>
            <div class="d-flex align-items-center column-gap-3">
                <a href="javascript:void(0);" class="btn-modal-minimize"><span class="icon-minus"></span></a>
                <a href="javascript:void(0);" class="btn-fullwidth-toggle"><span class="icon-maximize-2"></span></a>
                <a href="javascript:void(0);" class="close"><span class="icon-x"></span></a>
            </div>
        </div>
    `;
  wrapper.appendChild(header);

  // Body
  const body = document.createElement("div");
  body.className = "popup-body h-100 flex-grow-1";

  const outerRow = document.createElement("div");
  outerRow.className = "row h-100";

  const outerCol = document.createElement("div");
  outerCol.className = "col-12 h-100";

  // Search
  const searchDiv = document.createElement("div");
  searchDiv.className = "d-flex p-3 align-items-center justify-content-between";
  searchDiv.innerHTML = `
        <div class="d-flex align-items-center rounded-2 position-relative w-100">
            <i class="fi fi-rr-search search-icon d-flex align-items-center" style="position: absolute; left: 15px;"></i>
            <input type="text" class="form-control ps-5 panel-search" placeholder="Search mail">
        </div>
    `;
  outerCol.appendChild(searchDiv);

  // List Container
  const listContainer = document.createElement("div");
  listContainer.className =
    "px-3 pb-3 open-box d-flex flex-column row-gap-3 scroll h-100 overflow-auto";
  listContainer.style.maxHeight = "calc(100vh - 200px)";

  function populateList(filterText = "") {
    listContainer.innerHTML = "";
    const items = data.unopenedEmails.items || [];
    const query = filterText.toLowerCase();

    items.forEach((group) => {
      // Filter emails in this group
      const filteredEmails = group.emails.filter((email) => {
        return (
          email.from.toLowerCase().includes(query) ||
          email.subject.toLowerCase().includes(query) ||
          email.label.toLowerCase().includes(query)
        );
      });

      if (filteredEmails.length === 0) return;

      const dateGroup = document.createElement("div");
      dateGroup.innerHTML = `<p class="mb-1 label fw-medium fs-13">Date: ${group.date}</p>`;

      const emailListDiv = document.createElement("div");
      emailListDiv.className = "d-flex flex-column row-gap-3";

      filteredEmails.forEach((email) => {
        const emailBox = document.createElement("div");
        emailBox.className =
          "boxopen p-3 d-flex flex-column row-gap-2 position-relative rounded-3 border bg-white cursor-pointer";
        emailBox.innerHTML = `
                    <a href="javascript:void(0);" class="bel-pos position-absolute end-0 top-0 p-2"><span class="icon-bell-ring"></span></a>
                    <p class="mb-0 fs-13 fw-medium">From: <span class="text-secondary fw-normal">${email.from}</span></p>
                    <p class="mb-0 fs-13 fw-medium">Label: <span class="text-secondary fw-normal">${email.label}</span></p>
                    <p class="mb-0 fs-13 fw-medium">Subject: <span class="text-secondary fw-normal">${email.subject}</span></p>
                `;
        emailListDiv.appendChild(emailBox);
      });

      dateGroup.appendChild(emailListDiv);
      listContainer.appendChild(dateGroup);
    });

    if (listContainer.innerHTML === "") {
      listContainer.innerHTML = `<div class="text-center p-5 text-gray">No unopened emails found.</div>`;
    }
  }

  populateList();

  // Search input event
  const searchInput = searchDiv.querySelector(".panel-search");
  searchInput.addEventListener("input", (e) => {
    populateList(e.target.value);
  });

  outerCol.appendChild(listContainer);
  outerRow.appendChild(outerCol);
  body.appendChild(outerRow);
  wrapper.appendChild(body);
  target.appendChild(wrapper);
}

/**
 * Opened Emails Dynamic Rendering & Logic
 */
async function initOpenedEmailPanel() {
  const desktopTarget = document.getElementById("content-open-email-desktop");
  const mobileTarget = document.getElementById("content-open-email-mobile");

  if (!desktopTarget && !mobileTarget) return;

  if (desktopTarget) desktopTarget.innerHTML = APP_SPINNER_HTML;
  if (mobileTarget) mobileTarget.innerHTML = APP_SPINNER_HTML;

  try {
    const userEmail = "arunloganathan01@gmail.com";
    const response = await fetch(
      `${API_ENDPOINTS.openedEmails}?email=${userEmail}`,
      {
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFydW5sb2dhbmF0aGFuMDFAZ21haWwuY29tIiwiZXhwIjoxNzcxNDA5NjI3LCJpYXQiOjE3NzA4MDQ4Mjd9.VMeP1pC17oFFRoiBGPOGo3-DeY84FG_pBEIQVxhjVY",
          "Content-Type": "application/json",
        },
      },
    );
    const data = await response.json();
    if (data.openedEmails) {
      renderOpenedEmailPanel(data);
    } else {
      const errorMsg = `<div class="p-3 text-danger">Failed to load opened emails.</div>`;
      if (desktopTarget) desktopTarget.innerHTML = errorMsg;
      if (mobileTarget) mobileTarget.innerHTML = errorMsg;
    }
  } catch (err) {
    console.error("Error loading Opened Emails:", err);
    const errorMsg = `<div class="p-3 text-danger text-center mt-5">Error connecting to Email service.</div>`;
    if (desktopTarget) desktopTarget.innerHTML = errorMsg;
    if (mobileTarget) mobileTarget.innerHTML = errorMsg;
  }
}

function renderOpenedEmailPanel(data) {
  const desktopTarget = document.getElementById("content-open-email-desktop");
  const mobileTarget = document.getElementById("content-open-email-mobile");

  if (desktopTarget) {
    renderOpenedEmailToElement(desktopTarget, data);
  }
  if (mobileTarget) {
    renderOpenedEmailToElement(mobileTarget, data);
  }
}

function renderOpenedEmailToElement(target, data) {
  target.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "mail-body w-100 h-100 d-flex flex-column";

  // Header
  const header = document.createElement("div");
  header.className = "popup-header";
  header.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center column-gap-2 text-dark">
                <span class="icon-package-open"></span> Opened Emails
            </div>
            <div class="d-flex align-items-center column-gap-3">
                <a href="javascript:void(0);" class="btn-modal-minimize"><span class="icon-minus"></span></a>
                <a href="javascript:void(0);" class="btn-fullwidth-toggle"><span class="icon-maximize-2"></span></a>
                <a href="javascript:void(0);" class="close"><span class="icon-x"></span></a>
            </div>
        </div>
    `;
  wrapper.appendChild(header);

  // Body
  const body = document.createElement("div");
  body.className = "popup-body h-100 flex-grow-1";

  const outerRow = document.createElement("div");
  outerRow.className = "row h-100";

  const outerCol = document.createElement("div");
  outerCol.className = "col-12 h-100";

  // Search
  const searchDiv = document.createElement("div");
  searchDiv.className = "d-flex p-3 align-items-center justify-content-between";
  searchDiv.innerHTML = `
        <div class="d-flex align-items-center rounded-2 position-relative w-100">
            <i class="fi fi-rr-search search-icon d-flex align-items-center" style="position: absolute; left: 15px;"></i>
            <input type="text" class="form-control ps-5 panel-search" placeholder="Search mail">
        </div>
    `;
  outerCol.appendChild(searchDiv);

  // List Container
  const listContainer = document.createElement("div");
  listContainer.className =
    "px-3 pb-3 open-box d-flex flex-column row-gap-3 scroll h-100 overflow-auto";
  listContainer.style.maxHeight = "calc(100vh - 200px)";

  function populateList(filterText = "") {
    listContainer.innerHTML = "";
    const items = data.openedEmails.items || [];
    const query = filterText.toLowerCase();

    items.forEach((group) => {
      // Filter emails in this group
      const filteredEmails = group.emails.filter((email) => {
        return (
          email.from.toLowerCase().includes(query) ||
          email.subject.toLowerCase().includes(query) ||
          email.label.toLowerCase().includes(query)
        );
      });

      if (filteredEmails.length === 0) return;

      const dateGroup = document.createElement("div");
      dateGroup.innerHTML = `<p class="mb-1 label fw-medium fs-13">Date: ${group.date}</p>`;

      const emailListDiv = document.createElement("div");
      emailListDiv.className = "d-flex flex-column row-gap-3";

      filteredEmails.forEach((email) => {
        const emailBox = document.createElement("div");
        emailBox.className =
          "boxopen p-3 d-flex flex-column row-gap-2 position-relative rounded-3 border bg-white cursor-pointer";
        emailBox.innerHTML = `
                    <a href="javascript:void(0);" class="bel-pos position-absolute end-0 top-0 p-2"><span class="icon-bell-ring"></span></a>
                    <p class="mb-0 fs-13 fw-medium">From: <span class="text-secondary fw-normal">${email.from}</span></p>
                    <p class="mb-0 fs-13 fw-medium">Label: <span class="text-secondary fw-normal">${email.label}</span></p>
                    <p class="mb-0 fs-13 fw-medium">Subject: <span class="text-secondary fw-normal">${email.subject}</span></p>
                `;
        emailListDiv.appendChild(emailBox);
      });

      dateGroup.appendChild(emailListDiv);
      listContainer.appendChild(dateGroup);
    });

    if (listContainer.innerHTML === "") {
      listContainer.innerHTML = `<div class="text-center p-5 text-gray">No opened emails found.</div>`;
    }
  }

  populateList();

  // Search input event
  const searchInput = searchDiv.querySelector(".panel-search");
  searchInput.addEventListener("input", (e) => {
    populateList(e.target.value);
  });

  outerCol.appendChild(listContainer);
  outerRow.appendChild(outerCol);
  body.appendChild(outerRow);
  wrapper.appendChild(body);
  target.appendChild(wrapper);
}

/**
 * Connect Panel Dynamic Rendering & Logic
 */
async function initConnectPanel() {
  const desktopTarget = document.getElementById("content-connect-desktop");
  const mobileTarget = document.getElementById("content-connect-mobile");

  if (!desktopTarget && !mobileTarget) return;

  if (desktopTarget) desktopTarget.innerHTML = APP_SPINNER_HTML;
  if (mobileTarget) mobileTarget.innerHTML = APP_SPINNER_HTML;

  try {
    const response = await fetch(API_ENDPOINTS.connect, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.people) {
      renderConnectPanel(data);
    } else {
      const errorMsg = `<div class="p-3 text-danger">Failed to load Connect data.</div>`;
      if (desktopTarget) desktopTarget.innerHTML = errorMsg;
      if (mobileTarget) mobileTarget.innerHTML = errorMsg;
    }
  } catch (err) {
    console.error("Error loading Connect Panel:", err);
    const errorMsg = `<div class="p-3 text-danger text-center mt-5">Error connecting to Connect service.</div>`;
    if (desktopTarget) desktopTarget.innerHTML = errorMsg;
    if (mobileTarget) mobileTarget.innerHTML = errorMsg;
  }
}

function renderConnectPanel(data) {
  const desktopTarget = document.getElementById("content-connect-desktop");
  const mobileTarget = document.getElementById("content-connect-mobile");

  if (desktopTarget) {
    renderConnectToElement(desktopTarget, data);
  }
  if (mobileTarget) {
    renderConnectToElement(mobileTarget, data);
  }
}

function renderConnectToElement(target, data) {
  target.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "mail-body w-100 h-100 d-flex flex-column";

  // Header
  const header = document.createElement("div");
  header.className = "popup-header";
  header.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center column-gap-2 text-dark">
                <span class="icon-share-2"></span> ${data.title || "Connect"}
            </div>
            <div class="d-flex align-items-center column-gap-3">
                <a href="javascript:void(0);" class="btn-modal-minimize"><span class="icon-minus"></span></a>
                <a href="javascript:void(0);" class="btn-fullwidth-toggle"><span class="icon-maximize-2"></span></a>
                <a href="javascript:void(0);" class="close"><span class="icon-x"></span></a>
            </div>
        </div>
    `;
  wrapper.appendChild(header);

  // Body
  const body = document.createElement("div");
  body.className = "popup-body h-100 flex-grow-1 overflow-auto scroll";

  const outerCol = document.createElement("div");
  outerCol.className = "col-12 p-3";

  // Search
  const searchDiv = document.createElement("div");
  searchDiv.className = "mb-4";
  searchDiv.innerHTML = `
        <div class="d-flex align-items-center rounded-2 position-relative w-100">
            <i class="fi fi-rr-search search-icon d-flex align-items-center" style="position: absolute; left: 15px;"></i>
            <input type="text" class="form-control ps-5 panel-search" placeholder="${data.search.placeholder || "Search people..."}">
        </div>
    `;
  outerCol.appendChild(searchDiv);

  // People List
  const peopleListContainer = document.createElement("div");
  peopleListContainer.className = "d-flex flex-column row-gap-2";

  function populatePeople(filterText = "") {
    peopleListContainer.innerHTML = "";
    const items = data.people.items || [];
    const query = filterText.toLowerCase();

    items
      .filter((person) => person.name.toLowerCase().includes(query))
      .forEach((person) => {
        const personLink = document.createElement("a");
        personLink.href = "javascript:void(0);";
        personLink.className =
          "chat-nav-item d-flex align-items-center column-gap-2 p-2 rounded-3 hover-bg-light text-decoration-none";

        const unreadBadge =
          person.unreadCount > 0
            ? `<span class="badge rounded-pill bg-danger fs-10 ms-auto">${person.unreadCount}</span>`
            : "";

        personLink.innerHTML = `
                <div class="avatar rounded-circle flex-shrink-0 position-relative" style="width: 40px; height: 40px;">
                    <img src="${person.avatar}" class="w-100 h-100 rounded-circle" alt="${person.name}">
                    <span class="position-absolute bottom-0 end-0 rounded-circle border border-white" 
                          style="width: 12px; height: 12px; background-color: ${person.status === "online" ? "#28a745" : "#6c757d"};">
                    </span>
                </div>
                <div class="chat-avatar-info overflow-hidden flex-grow-1">
                    <h6 class="mb-0 fs-14 text-dark text-truncate">${person.name}</h6>
                    <span class="fs-12 text-secondary text-capitalize">${person.status}</span>
                </div>
                ${unreadBadge}
            `;
        peopleListContainer.appendChild(personLink);
      });

    if (peopleListContainer.innerHTML === "") {
      peopleListContainer.innerHTML = `<div class="text-center py-5 text-secondary">No one found.</div>`;
    }
  }

  populatePeople();

  const searchInput = searchDiv.querySelector(".panel-search");
  searchInput.addEventListener("input", (e) => populatePeople(e.target.value));

  outerCol.appendChild(peopleListContainer);
  body.appendChild(outerCol);
  wrapper.appendChild(body);
  target.appendChild(wrapper);
}

/**
 * Sets up the New Signature modal logic
 */
function setupNewSignatureModal() {
  // Character counter
  $(document).on("input", "#newSignatureName", function () {
    const length = $(this).val().length;
    $("#signatureNameCount").text(`${length}/320`);
  });

  // Create button handler
  $(document).on("click", "#createSignatureBtn", async function () {
    const name = $("#newSignatureName").val().trim();
    const content = $("#newSignatureContent").val().trim();

    if (!name || !content) {
      showAppToast("Both signature name and content are required", "error");
      return;
    }

    const btn = $(this);
    const originalText = btn.text();
    btn.prop("disabled", true).text("Creating...");

    try {
      const response = await fetch(API_ENDPOINTS.signaturesList, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, content }),
      });

      const result = await response.json();

      if (result.success || response.ok) {
        showAppToast(
          result.message || "Signature created successfully",
          "success",
        );

        // Close modal
        const modalEl = document.getElementById("newSignatureModal");
        if (modalEl) {
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        }

        // Reset form
        $("#newSignatureName").val("");
        $("#newSignatureContent").val("");
        $("#signatureNameCount").text("0/320");

        // Refresh signatures list if settings modal is open to the signature tab
        // if (typeof fetchSettingsData === "function") {
        //   fetchSettingsData("signature");
        // }
      } else {
        showAppToast(
          result.error || result.message || "Failed to create signature",
          "error",
        );
      }
    } catch (error) {
      console.error("Error creating signature:", error);
      showAppToast("Error creating signature. Please try again.", "error");
    } finally {
      btn.prop("disabled", false).text(originalText);
    }
  });
}
