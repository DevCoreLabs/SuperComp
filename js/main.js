const initAppToggler = () => {
  const appTogglers = document.querySelectorAll(".app-toggler");
  const appMenubars = document.getElementById("appMenubar"); // single element

  if (!appMenubars || appTogglers.length === 0) return;

  appTogglers.forEach((toggler) => {
    toggler.addEventListener("click", () => {
      toggler.classList.toggle("active");

      if (window.innerWidth >= 1191) {
        // Toggle the value between 'full' and 'mini'
        const currentValue =
          document.documentElement.getAttribute("data-app-sidebar");
        document.documentElement.setAttribute(
          "data-app-sidebar",
          currentValue === "full" ? "mini" : "full",
        );
      } else {
        // For <1191, toggle 'open' on the single menubar
        appMenubars.classList.toggle("open");
      }
    });
  });

  // Hover logic for mini sidebar
  appMenubars.addEventListener("mouseenter", () => {
    if (document.documentElement.getAttribute("data-app-sidebar") === "mini") {
      document.documentElement.setAttribute("data-app-sidebar", "mini-hover");
    }
  });

  appMenubars.addEventListener("mouseleave", () => {
    if (
      document.documentElement.getAttribute("data-app-sidebar") === "mini-hover"
    ) {
      document.documentElement.setAttribute("data-app-sidebar", "mini");
    }
  });
};

const initSearchDropdown = () => {
  const searchInput = document.getElementById("searchInput");
  const searchDropdown = document.getElementById("searchDropdown");
  const dropdownContent = searchDropdown
    ? searchDropdown.querySelector(".search-dropdown-content")
    : null;
  const searchForm = searchInput ? searchInput.closest("form") : null;

  if (!searchInput || !searchDropdown || !dropdownContent) return;

  let searchItems = [];

  // JSON load - reusing existing structure
  $.getJSON("assets/ajax/search.json", function (data) {
    searchItems = data.listItems;
  }).fail(function () {
    // Silently fail if search.json doesn't exist
    // This prevents 404 errors in the console
  });

  // Mock recent searches
  let recentSearches = [
    { name: "Booking confirmed", url: "index.html", type: "history" },
    { name: "ThmeHive", url: "chat.html", type: "history" },
    { name: "PixelMarket", url: "calendar.html", type: "history" },
    { name: "TemplateGalaxy", url: "chart/apexchart.html", type: "history" },
  ];

  const icons = {
    history: "fi fi-rr-time-past", // Clock icon
    search: "fi fi-rr-search",
    link: "fi fi-rr-link",
  };

  const renderRow = (item, isHistory = false) => {
    const iconClass = isHistory ? icons.history : item.icon || icons.search;
    // If it's a history item, we show the X button.
    // We stop propagation on the X so it doesn't trigger the row click.
    const closeBtn = isHistory
      ? `<div class="icon-end show-on-hover" role="button" title="Remove from history" onclick="event.preventDefault(); event.stopPropagation(); removeRecent('${item.name}')">×</div>`
      : "";

    return `
            <a href="${item.url || "#"}" class="search-row">
                <div class="icon-start">
                    <i class="${iconClass}"></i>
                </div>
                <div class="text-content">
                    ${item.name}
                </div>
                ${closeBtn}
            </a>
        `;
  };

  // Exposed globally to handle inline onclick
  window.removeRecent = (name) => {
    recentSearches = recentSearches.filter((item) => item.name !== name);
    renderDropdown(""); // re-render
  };

  const renderDropdown = (query) => {
    dropdownContent.innerHTML = "";

    if (!query) {
      // Show recent searches
      if (recentSearches.length > 0) {
        // Optional header for recent
        // dropdownContent.innerHTML += `<div class="section-header">Recent searches</div>`;
        recentSearches.forEach((item) => {
          dropdownContent.innerHTML += renderRow(item, true);
        });
      } else {
        dropdownContent.innerHTML = `<div class="p-3 text-muted text-center fs-13">No recent searches</div>`;
      }
    } else {
      // Filter searchItems
      const matched = searchItems.filter(
        (item) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          (item.url && item.url.toLowerCase().includes(query.toLowerCase())),
      );

      if (matched.length > 0) {
        matched.forEach((item) => {
          dropdownContent.innerHTML += renderRow(item, false);
        });
      } else {
        dropdownContent.innerHTML = `
                    <div class="text-center py-4">
                        <div class="text-muted">No results found for "${query}"</div>
                    </div>
                 `;
      }
    }
  };

  const showDropdown = () => {
    searchDropdown.classList.add("show");
    if (searchForm) searchForm.classList.add("search-active");
    renderDropdown(searchInput.value);
  };

  const hideDropdown = () => {
    searchDropdown.classList.remove("show");
    if (searchForm) searchForm.classList.remove("search-active");
  };

  // Event Listeners
  searchInput.addEventListener("focus", showDropdown);

  searchInput.addEventListener("input", (e) => {
    renderDropdown(e.target.value);
  });

  // Handle click outside
  document.addEventListener("click", (e) => {
    if (!searchForm.contains(e.target) && !searchDropdown.contains(e.target)) {
      hideDropdown();
    }
  });

  // Optional: Close on Esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideDropdown();
  });
};

const currentYear = () => {
  const elements = document.querySelectorAll(".currentYear");
  const currentYear = new Date().getFullYear();

  elements.forEach((element) => {
    element.textContent = currentYear;
  });
};

const setElementHeight = () => {
  const footer = document.querySelector(".footer-wrapper");
  if (footer) {
    const footerHeight = footer ? footer.offsetHeight : 0;
    document.documentElement.style.setProperty(
      "--footer-height",
      `${footerHeight}px`,
    );
  }

  const chatBox = document.querySelector(".chat-wrapper");
  if (chatBox) {
    const chatHeight = chatBox.offsetHeight;
    document.documentElement.style.setProperty(
      "--chat-height",
      `${chatHeight}px`,
    );
  }
};

const initSelectPicker = () => {
  document.querySelectorAll(".select-status").forEach((dropdown) => {
    const toggleButton = dropdown.querySelector(".dropdown-toggle");
    const items = dropdown.querySelectorAll(".dropdown-item");

    const updateButtonClassAndText = (text, selectedClass) => {
      // Remove btn-* except btn-sm, btn-lg
      toggleButton.classList.forEach((cls) => {
        if (/^btn-/.test(cls) && !["btn-sm", "btn-lg"].includes(cls)) {
          toggleButton.classList.remove(cls);
        }
      });

      if (selectedClass) {
        toggleButton.classList.add(...selectedClass.split(" "));
      }

      toggleButton.textContent = text;
    };

    // Handle default selection on page load
    const selectedItem = dropdown.querySelector(
      '.dropdown-item[data-selected="true"]',
    );
    if (selectedItem) {
      const defaultText = selectedItem.textContent.trim();
      const defaultClass = selectedItem.getAttribute("data-class");
      updateButtonClassAndText(defaultText, defaultClass);
    }

    // Handle selection on click
    items.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        items.forEach((i) => i.removeAttribute("data-selected"));
        item.setAttribute("data-selected", "true");

        const selectedText = item.textContent.trim();
        const selectedClass = item.getAttribute("data-class");
        updateButtonClassAndText(selectedText, selectedClass);
      });
    });
  });
};

function initSectionCheckboxSync() {
  document.querySelectorAll(".data-row-checkbox").forEach(function (section) {
    const masterCheckbox = section.querySelector("[data-row-checkbox]");
    const checkboxes = section.querySelectorAll("[data-checkbox]");

    if (!masterCheckbox || checkboxes.length === 0) return;

    masterCheckbox.addEventListener("change", function () {
      const checked = this.checked;
      checkboxes.forEach(function (cb) {
        cb.checked = checked;
      });
    });

    checkboxes.forEach(function (cb) {
      cb.addEventListener("change", function () {
        const allChecked = Array.from(checkboxes).every((c) => c.checked);
        masterCheckbox.checked = allChecked;
      });
    });
  });
}

function initTooltips() {
  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]',
  );
  const tooltipList = [...tooltipTriggerList].map(
    (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl),
  );
}

function initPopover() {
  const popoverTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="popover"]'),
  );
  const popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl);
  });
}

function initSidebarMenu() {
  jQuery(".app-navbar .menubar > li.menu-arrow > a")
    .next(".menu-inner")
    .slideUp();
  jQuery(".app-navbar .menu-inner > li > a").next(".menu-inner").slideUp();

  jQuery(
    ".app-navbar .menubar > li.menu-arrow > a, .app-navbar .menu-inner > li > a",
  )
    .unbind()
    .on("click", function (e) {
      if (jQuery(this).hasClass("open")) {
        jQuery(this).removeClass("open");
        jQuery(this).parent("li").children(".menu-inner").slideUp();
      } else {
        if (!window.event.ctrlKey) {
          jQuery(this).addClass("open");
        }
        if (jQuery(this).parent("li").children(".menu-inner").length > 0) {
          e.preventDefault();
          jQuery(this).next(".menu-inner").slideDown();
          jQuery(this)
            .parent("li")
            .siblings("li")
            .find("a:first")
            .removeClass("open");
          jQuery(this)
            .parent("li")
            .siblings("li")
            .children(".menu-inner")
            .slideUp();
        } else {
          jQuery(this).next(".menu-inner").slideUp();
        }
      }
    });

  for (
    var nk = window.location,
      o = $(".app-navbar .menubar a")
        .filter(function () {
          return this.href == nk;
        })
        .addClass("active")
        .parent()
        .addClass("active")
        .parent()
        .show()
        .siblings("a")
        .addClass("active open")
        .parent()
        .parent()
        .show()
        .siblings("a")
        .addClass("open");
    ;
  ) {
    if (!o.is("li")) {
      break;
    }
    o = o.parent().slideDown().parent("li").children("a").addClass("active");
  }
}

function initCheckable() {
  document.querySelectorAll(".checkable-wrapper").forEach(function (wrapper) {
    const checkAll = wrapper.querySelector(".checkable-check-all");
    const checkboxes = wrapper.querySelectorAll(".checkable-check-input");

    // Initialize checked state on load
    checkboxes.forEach(function (checkbox) {
      const item = checkbox.closest(".checkable-item");
      if (checkbox.checked && item) {
        item.classList.add("is-checked");
      }
    });

    // Handle "Select All"
    if (checkAll) {
      checkAll.addEventListener("change", function () {
        const isChecked = this.checked;
        checkboxes.forEach(function (checkbox) {
          checkbox.checked = isChecked;
          const item = checkbox.closest(".checkable-item");
          if (item) {
            item.classList.toggle("is-checked", isChecked);
          }
        });
      });
    }

    // Handle individual checkbox toggle
    wrapper.addEventListener("change", function (e) {
      if (e.target.matches(".checkable-check-input")) {
        const item = e.target.closest(".checkable-item");
        if (item) {
          item.classList.toggle("is-checked", e.target.checked);
        }

        // Update "Select All" state
        const allChecked =
          wrapper.querySelectorAll(".checkable-check-input:not(:checked)")
            .length === 0;
        if (checkAll) {
          checkAll.checked = allChecked;
        }
      }
    });
  });
}

function initEmailSidebarToggle() {
  const toggler = document.querySelector(".mail-sidebar-toggler");
  const sidebar = document.querySelector(".mail-sidebar");
  const overlay = document.querySelector(".sidebar-mobile-overlay");

  if (toggler && sidebar && overlay) {
    toggler.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("show", sidebar.classList.contains("open"));
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("show");
    });
  }
}

function initChatSidebarToggle() {
  const toggler = document.querySelector(".chat-sidebar-toggler");
  const sidebar = document.querySelector(".chat-sidebar");
  const overlay = document.querySelector(".sidebar-mobile-overlay");
  const btnClose = document.querySelector(".btn-close");

  if (toggler && sidebar && overlay) {
    toggler.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("show", sidebar.classList.contains("open"));
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("show");
    });

    btnClose.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("show");
    });
  }
}

function initBookmarks() {
  document.addEventListener("click", (e) => {
    const bookmark = e.target.closest(".mail-item-bookmark");
    if (bookmark) {
      bookmark.classList.toggle("active");
    }
  });
}

function initSidebarPanel() {
  document.addEventListener("click", function (e) {
    const toggler = e.target.closest(".sidebar-panel-toggler");
    if (toggler) {
      const panel = document.querySelector(".app-sidebar-panel");
      if (panel) {
        panel.classList.toggle("show");
      }
    }

    const closeBtn = e.target.closest(".sidebar-close");
    if (closeBtn) {
      document.querySelectorAll(".app-sidebar-panel").forEach((panel) => {
        panel.classList.remove("show");
      });
    }
  });
}

function initGmailSidePanel() {
  const mailWrapper = document.querySelector(".mail-wrapper");
  const popups = {
    assign: document.querySelector(".mail-assignpopup"),
    connect: document.querySelector(".mail-connectpopup"),
    team: document.querySelector(".mail-teampopup"),
    open: document.querySelector(".mail-openpopup"),
    unopen: document.querySelector(".mail-unopenpopup"),
    askai: document.querySelector(".mail-askaipopup"),
  };
  const triggers = {
    assign: document.querySelectorAll(".assign-email"),
    connect: document.querySelectorAll(".connect"),
    team: document.querySelectorAll(".add-team"),
    open: document.querySelectorAll(".open-email"),
    unopen: document.querySelectorAll(".unopen-email"),
    askai: document.querySelectorAll(".ask-ai"),
  };

  if (!mailWrapper) return;

  // Add smooth transition for width changes
  mailWrapper.style.transition = "width 0.3s ease";
  // Set default width
  mailWrapper.style.width = "100%";

  // Close all popups
  function closeAllPopups() {
    Object.values(popups).forEach((popup) => {
      if (popup) {
        popup.classList.remove("show");
        popup.classList.remove("mail-popup-fullwidth");
        popup.style.width = "";
      }
    });
    mailWrapper.classList.remove("popup-open");
    mailWrapper.classList.remove("mail-wrapper-hidden");
    mailWrapper.style.width = "100%";
  }

  // Open specific popup (toggle behavior like Gmail)
  function togglePopup(type) {
    // Don't open popups on mobile/tablet (768px or below)
    if (window.innerWidth <= 768) {
      return;
    }

    const isCurrentlyOpen =
      popups[type] && popups[type].classList.contains("show");
    closeAllPopups();
    if (!isCurrentlyOpen && popups[type]) {
      popups[type].classList.add("show");
      // Desktop width logic
      if (window.innerWidth > 1480) {
        popups[type].style.width = "25%";
        mailWrapper.classList.add("popup-open");
        mailWrapper.style.width = "75%";
      } else {
        popups[type].style.width = "100%";
      }
    }
  }

  // Attach click events to triggers
  Object.keys(triggers).forEach((key) => {
    triggers[key].forEach((trigger) => {
      trigger.addEventListener("click", function (e) {
        // If it's a mobile view and from the menubar, let Bootstrap handle the tab
        // But we still want to close the menubar
        const isMobile = window.innerWidth <= 1480;

        if (isMobile) {
          // Close the app-menubar after selection on mobile
          const appMenubar = document.getElementById("appMenubar");
          if (appMenubar && appMenubar.classList.contains("open")) {
            appMenubar.classList.remove("open");
            document
              .querySelectorAll(".app-toggler")
              .forEach((t) => t.classList.remove("active"));
          }

          // If it has tab attributes, let Bootstrap handle it, don't open popup
          if (this.hasAttribute("data-bs-toggle")) {
            closeAllPopups(); // Ensure popups are gone if we were on desktop and resized
            return;
          }
        }

        e.preventDefault();
        e.stopPropagation();
        togglePopup(key);
      });
    });
  });

  // Attach close button events
  Object.values(popups).forEach((popup) => {
    if (popup) {
      const closeBtn = popup.querySelector(".close");
      if (closeBtn) {
        closeBtn.addEventListener("click", function (e) {
          e.preventDefault();
          closeAllPopups();
        });
      }
    }
  });

  // Handle resize to fix layout state
  window.addEventListener("resize", () => {
    // Close all popups on mobile/tablet view (768px or below)
    if (window.innerWidth <= 768) {
      closeAllPopups();
    } else if (window.innerWidth <= 1480) {
      // If we were in desktop mode with a popup open, cleanup the wrapper width
      if (!mailWrapper.classList.contains("popup-open")) {
        mailWrapper.style.width = "100%";
      }
    }
  });
}

// Keep old function names for backward compatibility but make them empty
function initConnectPopup() {}
function initTeamPopup() {}
function initOpenEmailPopup() {}
function initAskAIPopup() {}
function initUnopenEmailPopup() {}

function initChatNavigation() {
  // Event delegation for chat items and back buttons
  document.addEventListener("click", function (e) {
    const navItem = e.target.closest(".chat-nav-item");
    const backBtn = e.target.closest(".chat-back-btn");

    if (navItem) {
      const wrapper = navItem.closest(".chat-wrapper");
      if (wrapper) {
        const sidebar = wrapper.querySelector(".chat-sidebar");
        const body = wrapper.querySelector(".chat-body");
        if (sidebar && body) {
          e.preventDefault();
          sidebar.classList.add("chat-hidden");
          body.classList.add("chat-visible");

          // Smoothly scroll to bottom if it's a new chat open
          const chatMessages = body.querySelector(".chat-messages");
          if (chatMessages) {
            setTimeout(() => {
              const simpleBar = SimpleBar.instances.get(chatMessages);
              if (simpleBar) {
                simpleBar.getScrollElement().scrollTop =
                  simpleBar.getScrollElement().scrollHeight;
              } else {
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            }, 100);
          }
        }
      }
    } else if (backBtn) {
      const wrapper = backBtn.closest(".chat-wrapper");
      if (wrapper) {
        const sidebar = wrapper.querySelector(".chat-sidebar");
        const body = wrapper.querySelector(".chat-body");
        if (sidebar && body) {
          e.preventDefault();
          sidebar.classList.remove("chat-hidden");
          body.classList.remove("chat-visible");
        }
      }
    }
  });
}

// Define global hideChat for compatibility with inline onclick handlers
window.hideChat = function () {
  const activeBody = document.querySelector(".chat-body.chat-visible");
  if (activeBody) {
    const wrapper = activeBody.closest(".chat-wrapper");
    if (wrapper) {
      const sidebar = wrapper.querySelector(".chat-sidebar");
      const body = wrapper.querySelector(".chat-body");
      if (sidebar && body) {
        sidebar.classList.remove("chat-hidden");
        body.classList.remove("chat-visible");
      }
    }
  }
};

window.initDateTimePicker = function () {
  const modalEl = document.getElementById("dateTimeModal");
  const monthLabel = document.getElementById("dtp-month-label");
  const daysContainer = document.getElementById("dtp-days");
  const timeSelect = document.getElementById("dtp-time");
  const dateInput = document.getElementById("dtp-date");
  const confirmBtn = document.getElementById("dtp-confirm");

  if (!modalEl || !monthLabel || !daysContainer) return;

  // Reminder modal elements (optional, for syncing back)
  const pickRow = document.querySelector(".pick-datetime");
  const pickLabel = pickRow ? pickRow.querySelector(".form-check-label") : null;

  if (pickLabel && !pickLabel.dataset.base) {
    pickLabel.dataset.base = pickLabel.textContent.trim();
  }

  let viewDate = new Date();
  let selectedDate = new Date();

  const formatMonthYear = (date) =>
    date.toLocaleString("en-US", { month: "long", year: "numeric" });

  const formatDate = (date) =>
    date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const updateLabel = () => {
    if (!pickLabel || !timeSelect) return;
    const selectedTimeText =
      timeSelect.options[timeSelect.selectedIndex]?.textContent ||
      timeSelect.value;
    pickLabel.textContent = `${pickLabel.dataset.base} (${formatDate(selectedDate)} @ ${selectedTimeText})`;
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    monthLabel.textContent = formatMonthYear(viewDate);
    daysContainer.innerHTML = "";

    for (let i = 0; i < firstDay; i++) {
      const filler = document.createElement("span");
      filler.className = "dtp-day text-muted";
      daysContainer.appendChild(filler);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dtp-day";
      btn.textContent = day;
      if (
        selectedDate.getFullYear() === year &&
        selectedDate.getMonth() === month &&
        selectedDate.getDate() === day
      ) {
        btn.classList.add("active");
      }

      btn.addEventListener("click", () => {
        selectedDate = new Date(year, month, day);
        renderCalendar();
        if (dateInput) {
          const y = selectedDate.getFullYear();
          const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
          const d = String(selectedDate.getDate()).padStart(2, "0");
          dateInput.value = `${y}-${m}-${d}`;
        }

        // Sync with compose schedule if exists
        const composeDateInput = document.getElementById(
          "compose-schedule-date",
        );
        if (composeDateInput && timeSelect) {
          const y = selectedDate.getFullYear();
          const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
          const d = String(selectedDate.getDate()).padStart(2, "0");
          const time = timeSelect.value;
          const formatted = `${y}-${m}-${d}T${time}`;
          composeDateInput.value = formatted;
        }
      });
      daysContainer.appendChild(btn);
    }
  };

  // Nav buttons delegation
  if (!modalEl.dataset.dtpInitialized) {
    modalEl.addEventListener("click", (e) => {
      const navBtn = e.target.closest(".dtp-nav");
      if (navBtn) {
        const direction = navBtn.dataset.direction === "next" ? 1 : -1;
        viewDate.setMonth(viewDate.getMonth() + direction);
        renderCalendar();
      }
    });

    if (dateInput) {
      dateInput.addEventListener("change", (e) => {
        if (e.target.value) {
          const [y, m, d] = e.target.value.split("-");
          selectedDate = new Date(Number(y), Number(m) - 1, Number(d));
          viewDate = new Date(selectedDate);
          renderCalendar();
          updateLabel();
        }
      });
    }
    modalEl.dataset.dtpInitialized = "true";
  }

  // Confirm button handler
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      updateLabel();
      bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    };
  }

  renderCalendar();
};

function initInboxTabs() {
  const subTabs = document.querySelectorAll("#inbox-sub-tabs .nav-link");
  const mailList = document.getElementById("inbox-mail-list");
  const inboxSidebarLink = document.querySelector(
    '.mail-nav-item[data-bs-target="#inbox-tab"]',
  );

  if (!subTabs.length || !mailList) return;

  // Capture initial content for Primary tab before any filtering
  let initialInboxContent = "";
  const simpleBarElement = SimpleBar.instances.get(mailList);
  if (simpleBarElement) {
    initialInboxContent = simpleBarElement.getContentElement().innerHTML;
  } else {
    initialInboxContent = mailList.innerHTML;
  }

  // Mock data for different tabs
  const tabContentData = {
    primary: initialInboxContent,
    operations: `
            <li class="mail-list-item checkable-item">
                <div class="form-check my-0 me-2">
                    <input class="form-check-input checkable-check-input" type="checkbox" id="check-o1">
                </div>
                <a class="mail-item-bookmark" href="javascript:void();"><i class="fi fi-rr-star me-2 me-sm-3"></i></a>
                <a href="read-email.html" class="mail-item-content ms-2 ms-sm-0 me-2">
                    <div class="mail-item-username"><span class="alert-green">LCL</span><span class="me-2">LogiMove</span></div>
                    <span class="mail-item-subject">Trucking Update #4521</span>
                    <span class="mail-item-text text-body"> The shipment for client 'GlobalTrade' is currently in transit.</span>
                </a>
                <div class="mail-item-meta ms-auto"><small class="mail-item-time text-nowrap">Assigned to: Ravi</small></div>
                <div class="mail-item-meta ms-auto"><small class="mail-item-time">10:15 AM</small></div>
            </li>`,
    accounts: `
            <li class="mail-list-item checkable-item">
                <div class="form-check my-0 me-2">
                    <input class="form-check-input checkable-check-input" type="checkbox" id="check-a1">
                </div>
                <a class="mail-item-bookmark" href="javascript:void();"><i class="fi fi-rr-star me-2 me-sm-3"></i></a>
                <a href="read-email.html" class="mail-item-content ms-2 ms-sm-0 me-2">
                    <div class="mail-item-username"><span class="alert-orange">Invoice</span><span class="me-2">Finance Team</span></div>
                    <span class="mail-item-subject">Pending Invoice for June</span>
                    <span class="mail-item-text text-body"> Please review and approve the attached invoice for June logistics services.</span>
                </a>
                <div class="mail-item-meta ms-auto"><small class="mail-item-time text-nowrap">Assigned to: Sunita</small></div>
                <div class="mail-item-meta ms-auto"><small class="mail-item-time">昨天</small></div>
            </li>`,
    documentation: `
            <li class="mail-list-item checkable-item">
                <div class="form-check my-0 me-2">
                    <input class="form-check-input checkable-check-input" type="checkbox" id="check-d1">
                </div>
                <a class="mail-item-bookmark" href="javascript:void();"><i class="fi fi-rr-star me-2 me-sm-3"></i></a>
                <a href="read-email.html" class="mail-item-content ms-2 ms-sm-0 me-2">
                    <div class="mail-item-username"><span class="alert-blue">Doc</span><span class="me-2">LegalDept</span></div>
                    <span class="mail-item-subject">Updated Service Agreement</span>
                    <span class="mail-item-text text-body"> The new service agreement for 2024 is ready for digital signature.</span>
                </a>
                <div class="mail-item-meta ms-auto"><small class="mail-item-time text-nowrap">Assigned to: Myself</small></div>
                <div class="mail-item-meta ms-auto"><small class="mail-item-time">Jul 18</small></div>
            </li>`,
    updates: `
            <li class="mail-list-item checkable-item mail-unread">
                <div class="form-check my-0 me-2">
                    <input class="form-check-input checkable-check-input" type="checkbox" id="check-u1">
                </div>
                <a class="mail-item-bookmark" href="javascript:void();"><i class="fi fi-rr-star me-2 me-sm-3"></i></a>
                <a href="read-email.html" class="mail-item-content ms-2 ms-sm-0 me-2">
                    <div class="mail-item-username"><span class="alert-green">System</span><span class="me-2">SuperComp.AI</span></div>
                    <span class="mail-item-subject">New Feature: AI Summaries</span>
                    <span class="mail-item-text text-body"> We've added AI-powered email summaries to your inbox. Try it now!</span>
                </a>
                <div class="mail-item-meta ms-auto"><small class="mail-item-time text-nowrap">Assigned to: System</small></div>
                <div class="mail-item-meta ms-auto"><small class="mail-item-time">09:00 AM</small></div>
            </li>`,
    others: `
            <li class="mail-list-item checkable-item">
                <div class="form-check my-0 me-2">
                    <input class="form-check-input checkable-check-input" type="checkbox" id="check-x1">
                </div>
                <a class="mail-item-bookmark" href="javascript:void();"><i class="fi fi-rr-star me-2 me-sm-3"></i></a>
                <a href="read-email.html" class="mail-item-content ms-2 ms-sm-0 me-2">
                    <div class="mail-item-username"><span class="alert-gray">Misc</span><span class="me-2">Community</span></div>
                    <span class="mail-item-subject">Weekly Logistics Newsletter</span>
                    <span class="mail-item-text text-body"> Join our webinar on the future of AI in logistics next Tuesday.</span>
                </a>
                <div class="mail-item-meta ms-auto"><small class="mail-item-time text-nowrap">Assigned to: Myself</small></div>
                <div class="mail-item-meta ms-auto"><small class="mail-item-time">Jul 15</small></div>
            </li>`,
  };

  function loadTabContent(tabId) {
    // Update active class on sub-tabs
    subTabs.forEach((tab) => {
      if (tab.getAttribute("data-inbox-tab") === tabId) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    // Update content if exists in mock data
    if (tabContentData[tabId]) {
      // Using a simple transition effect
      mailList.style.opacity = "0.5";
      setTimeout(() => {
        const simpleBarElement = SimpleBar.instances.get(mailList);
        if (simpleBarElement) {
          simpleBarElement.getContentElement().innerHTML =
            tabContentData[tabId];
        } else {
          mailList.innerHTML = tabContentData[tabId];
        }
        mailList.style.opacity = "1";

        // Re-initialize checkable and bookmarks since the DOM changed
        initCheckable();
        initBookmarks();
      }, 150);
    }
  }

  // Tab click event listeners
  subTabs.forEach((tab) => {
    tab.addEventListener("click", function (e) {
      e.preventDefault();
      const tabId = this.getAttribute("data-inbox-tab");
      loadTabContent(tabId);
    });
  });

  // Reset to primary when "Inbox" sidebar menu is clicked
  if (inboxSidebarLink) {
    inboxSidebarLink.addEventListener("click", function () {
      // Ensure Primary tab is active
      const primaryTabLink = document.querySelector(
        '#inbox-sub-tabs .nav-link[data-inbox-tab="primary"]',
      );
      if (primaryTabLink) {
        primaryTabLink.click();
      } else {
        // Fallback if link not found
        loadTabContent("primary");
      }
    });
  }
}

window.initMainFeatures = () => {
  Waves.init();
  initAppToggler();
  initSearchDropdown();
  currentYear();
  initSectionCheckboxSync();
  initSelectPicker();
  initTooltips();
  initPopover();
  initCheckable();
  initSidebarMenu();
  initEmailSidebarToggle();
  initChatSidebarToggle();
  initBookmarks();
  // ThemeSwitcher();
  initSidebarPanel();
  initGmailSidePanel();
  initChatNavigation();
  initDateTimePicker();
  initDropdownToggle();
  initInboxTabs();
  initModalFullWidthToggle();
  initMailPopupFullWidthToggle();
  initMailNavTabs();
  initReplyButtons();
  initInlineReplyComposer();
  initComposePopup();
};

document.addEventListener("DOMContentLoaded", () => {
  // Only auto-init if layout manager isn't present
  // If layout.js is used, it will call initMainFeatures() after loading components.
  if (!document.getElementById("appMenubar") || !window.loadComponent) {
    window.initMainFeatures();
  }
});

$(document).ready(function () {
  $(".dataTable").each(function () {
    const dtInstance = $(this).DataTable();
    dtInstance.on("draw.dt", function () {
      initSelectPicker();
      initSectionCheckboxSync();
    });
  });
});

function initDropdownToggle() {
  const icon = document.getElementById("openIcon");
  const dropdown = document.getElementById("openDropdown");

  if (!icon || !dropdown) return;

  icon.addEventListener("click", function (e) {
    e.preventDefault();

    icon.classList.toggle("active");
    dropdown.style.display =
      dropdown.style.display === "block" ? "none" : "block";
  });

  // Click inside dropdown to close (similar to Gmail behavior)
  dropdown.addEventListener("click", function (e) {
    if (e.target.tagName === "A" || e.target.closest("a")) {
      dropdown.style.display = "none";
      icon.classList.remove("active");
    }
  });

  // Click outside to close
  document.addEventListener("click", function (e) {
    if (!icon.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = "none";
      icon.classList.remove("active");
    }
  });
}

// Reusable Full-Width Toggle Logic for Mail Popups
function initMailPopupFullWidthToggle() {
  document.addEventListener("click", function (e) {
    const fullWidthBtn = e.target.closest(".btn-fullwidth-toggle");
    const minimizeBtn = e.target.closest(".btn-modal-minimize");
    const mailWrapper = document.querySelector(".mail-wrapper");

    if (fullWidthBtn) {
      const popup = fullWidthBtn.closest(
        ".mail-teampopup, .mail-openpopup, .mail-unopenpopup, .mail-assignpopup, .mail-connectpopup, .mail-askaipopup",
      );
      if (popup) {
        e.preventDefault();
        if (popup.classList.contains("mail-popup-fullwidth")) {
          // Restore to normal width (25%)
          popup.classList.remove("mail-popup-fullwidth");
          if (mailWrapper) {
            mailWrapper.classList.remove("mail-wrapper-hidden");
            mailWrapper.classList.add("popup-open");
          }
        } else {
          // Go full width (100%)
          popup.classList.add("mail-popup-fullwidth");
          if (mailWrapper) {
            mailWrapper.classList.add("mail-wrapper-hidden");
            mailWrapper.classList.remove("popup-open");
          }
        }
      }
    }

    if (minimizeBtn) {
      const popup = minimizeBtn.closest(
        ".mail-teampopup, .mail-openpopup, .mail-unopenpopup, .mail-assignpopup, .mail-connectpopup, .mail-askaipopup",
      );
      if (popup) {
        e.preventDefault();
        // If it's in fullwidth mode, restore it to 25% width
        if (popup.classList.contains("mail-popup-fullwidth")) {
          popup.classList.remove("mail-popup-fullwidth");
          if (mailWrapper) {
            mailWrapper.classList.remove("mail-wrapper-hidden");
            mailWrapper.classList.add("popup-open");
          }
        } else {
          // If NOT in fullwidth, close the popup
          const closeBtn = popup.querySelector(".close");
          if (closeBtn) {
            closeBtn.click();
          } else {
            // Fallback: manually hide it if no close btn
            popup.classList.remove("show");
            if (mailWrapper) {
              mailWrapper.classList.remove("popup-open");
              mailWrapper.style.width = "100%";
            }
          }
        }
      }
    }
  });
}

function initModalFullWidthToggle() {
  document.addEventListener("click", function (e) {
    const toggleBtn = e.target.closest(".btn-fullwidth-toggle");
    const minimizeBtn = e.target.closest(".btn-modal-minimize");

    if (toggleBtn) {
      e.preventDefault();
      const modal = toggleBtn.closest(".modal");
      if (modal) {
        modal.classList.toggle("modal-fullwidth");
        toggleBtn.classList.toggle("active");
      }
    } else if (minimizeBtn) {
      const modal = minimizeBtn.closest(".modal");
      if (modal) {
        e.preventDefault();
        if (modal.classList.contains("modal-fullwidth")) {
          // Restore from fullwidth if currently active
          modal.classList.remove("modal-fullwidth");

          // Also update the state of the toggle button if it exists
          const fullwidthBtn = modal.querySelector(".btn-fullwidth-toggle");
          if (fullwidthBtn) {
            fullwidthBtn.classList.remove("active");
          }
        } else {
          // If NOT in fullwidth, close the modal (same as close button)
          const bsModal =
            bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal);
          if (bsModal) {
            bsModal.hide();
          }
        }
      }
    }
  });
}

function initMailNavTabs() {
  // ⚠️ DO NOT ENABLE THIS FUNCTION ⚠️
  // This old function tries to load separate HTML files (sent.html, draft.html, etc.)
  // which don't exist and causes 404 errors.
  //
  // The new API-based system in new.js handles all tab switching dynamically
  // by fetching emails from the API and rendering them in the existing inbox.html page.
  //
  // If you need to modify tab behavior, edit the code in new.js instead.

  return; // Early return to prevent any code execution

  /* DISABLED CODE - DO NOT UNCOMMENT
  const navItems = document.querySelectorAll(".mail-nav-item[data-tab]");

  navItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      const tab = this.getAttribute("data-tab");
      const url = `${tab}.html`;

      // Remove active from all nav items
      navItems.forEach((i) => i.classList.remove("active"));

      // Add active to clicked item
      this.classList.add("active");

      // Fetch and replace main content
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then((html) => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const newMain = doc.querySelector("main");
          if (newMain) {
            const currentMain = document.querySelector("main");
            currentMain.innerHTML = newMain.innerHTML;
            // Re-initialize any dynamic elements if needed
            // For example, re-run init functions for the new content
            initCheckable();
            initBookmarks();
            initGmailSidePanel();
            // Add other init functions as necessary
          } else {
            console.error("Main element not found in fetched HTML");
          }
        })
        .catch((error) => {
          console.error("Error loading tab content:", error);
          // Optionally show user-friendly error message
        });
    });
  });
  END OF DISABLED CODE */
}

function initReplyButtons() {
  const replyBtns = document.querySelectorAll(
    ".mail-read-bottom-bar .reply-btn",
  );
  if (!replyBtns.length) return;

  replyBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const replyType = btn.getAttribute("data-type");

      // Extract email details from the page
      const senderEmail =
        document.querySelector(".mail-user + .text-1xs")?.textContent?.trim() ||
        "";
      const toEmails =
        document
          .querySelector(".text-1xs + .d-flex .me-3")
          ?.textContent?.trim() || "";
      const ccEmails =
        document
          .querySelector(".text-1xs + .d-flex .me-1:last-child")
          ?.textContent?.trim() || "";
      const subject =
        document.querySelector(".mail-title")?.textContent?.trim() || "";
      const body = document.querySelector(".mail-read-body")?.innerHTML || "";

      let replyData = {};

      if (replyType === "Reply") {
        replyData = {
          to: senderEmail,
          cc: "",
          subject: subject ? `Re: ${subject}` : "",
          body: `<br><br><blockquote>${body}</blockquote>`,
        };
      } else if (replyType === "Reply All") {
        replyData = {
          to: senderEmail,
          cc: `${toEmails} ${ccEmails}`.trim(),
          subject: subject ? `Re: ${subject}` : "",
          body: `<br><br><blockquote>${body}</blockquote>`,
        };
      } else if (replyType === "Forward") {
        replyData = {
          to: "",
          cc: "",
          subject: subject ? `Fwd: ${subject}` : "",
          body: `<br><br><blockquote>${body}</blockquote>`,
        };
      }

      // Show inline reply composer with pre-filled data
      showInlineReplyComposer(replyData, replyType);
    });
  });
}

function showInlineReplyComposer(replyData, replyType) {
  const composer = document.querySelector(".inline-reply-composer");
  if (!composer) return;

  // Update reply type buttons
  const replyTypeBtns = composer.querySelectorAll(".reply-type-btn");
  replyTypeBtns.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-type") === replyType) {
      btn.classList.add("active");
    }
  });

  // Populate form fields
  const toInput = composer.querySelector("#reply-to");
  const ccInput = composer.querySelector("#reply-cc");
  const subjectInput = composer.querySelector("#reply-subject");
  const messageDiv = composer.querySelector(".reply-message");

  if (toInput) toInput.value = replyData.to;
  if (ccInput) ccInput.value = replyData.cc;
  if (subjectInput) subjectInput.value = replyData.subject;
  if (messageDiv) {
    messageDiv.innerHTML = replyData.body;
    // Set placeholder if empty
    if (!messageDiv.innerHTML.trim()) {
      messageDiv.setAttribute("data-placeholder", "Compose your reply...");
    }
  }

  // Show the composer
  composer.classList.remove("d-none");

  // Scroll to composer
  composer.scrollIntoView({ behavior: "smooth", block: "nearest" });

  // Focus on message
  if (messageDiv) {
    messageDiv.focus();
    // Place cursor at beginning
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(messageDiv, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function initInlineReplyComposer() {
  const composer = document.querySelector(".inline-reply-composer");
  if (!composer) return;

  // Reply type buttons
  const replyTypeBtns = composer.querySelectorAll(".reply-type-btn");
  replyTypeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const replyType = btn.getAttribute("data-type");

      // Update active state
      replyTypeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Update form based on reply type
      updateReplyForm(replyType);
    });
  });

  // Minimize button
  const minimizeBtn = composer.querySelector(".reply-minimize");
  if (minimizeBtn) {
    minimizeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      composer.classList.add("d-none");
    });
  }

  // Close button
  const closeBtn = composer.querySelector(".reply-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      composer.classList.add("d-none");
    });
  }

  // Send button
  const sendBtn = composer.querySelector(".reply-send-btn");
  if (sendBtn) {
    sendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Handle send logic here
      console.log("Sending reply...");
      // For now, just hide the composer
      composer.classList.add("d-none");
    });
  }

  // Formatting toggle
  const formattingToggle = composer.querySelector(".reply-formatting-toggle");
  const formattingToolbar = composer.querySelector(".formatting-toolbar");
  if (formattingToggle && formattingToolbar) {
    formattingToggle.addEventListener("click", (e) => {
      e.preventDefault();
      formattingToolbar.classList.toggle("d-none");
    });
  }

  // Formatting buttons
  const formattingBtns = composer.querySelectorAll(
    ".formatting-toolbar .rte-btn, .formatting-toolbar select",
  );
  formattingBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const command = btn.getAttribute("data-command");
      const value = btn.getAttribute("data-value") || btn.value;
      document.execCommand(command, false, value);
    });
  });

  // Message input placeholder handling
  const messageDiv = composer.querySelector(".reply-message");
  if (messageDiv) {
    messageDiv.addEventListener("input", () => {
      if (messageDiv.innerHTML.trim()) {
        messageDiv.removeAttribute("data-placeholder");
      } else {
        messageDiv.setAttribute("data-placeholder", "Compose your reply...");
      }
    });
  }
}

function updateReplyForm(replyType) {
  const composer = document.querySelector(".inline-reply-composer");
  if (!composer) return;

  // Extract email details from the page
  const senderEmail =
    document.querySelector(".mail-user + .text-1xs")?.textContent?.trim() || "";
  const toEmails =
    document.querySelector(".text-1xs + .d-flex .me-3")?.textContent?.trim() ||
    "";
  const ccEmails =
    document
      .querySelector(".text-1xs + .d-flex .me-1:last-child")
      ?.textContent?.trim() || "";
  const subject =
    document.querySelector(".mail-title")?.textContent?.trim() || "";
  const body = document.querySelector(".mail-read-body")?.innerHTML || "";

  const toInput = composer.querySelector("#reply-to");
  const ccInput = composer.querySelector("#reply-cc");
  const subjectInput = composer.querySelector("#reply-subject");
  const messageDiv = composer.querySelector(".reply-message");

  if (replyType === "Reply") {
    if (toInput) toInput.value = senderEmail;
    if (ccInput) ccInput.value = "";
    if (subjectInput) subjectInput.value = subject ? `Re: ${subject}` : "";
    if (messageDiv)
      messageDiv.innerHTML = `<br><br><blockquote>${body}</blockquote>`;
  } else if (replyType === "Reply All") {
    if (toInput) toInput.value = senderEmail;
    if (ccInput) ccInput.value = `${toEmails} ${ccEmails}`.trim();
    if (subjectInput) subjectInput.value = subject ? `Re: ${subject}` : "";
    if (messageDiv)
      messageDiv.innerHTML = `<br><br><blockquote>${body}</blockquote>`;
  } else if (replyType === "Forward") {
    if (toInput) toInput.value = "";
    if (ccInput) ccInput.value = "";
    if (subjectInput) subjectInput.value = subject ? `Fwd: ${subject}` : "";
    if (messageDiv)
      messageDiv.innerHTML = `<br><br><blockquote>${body}</blockquote>`;
  }
}

// Ensure background scroll is locked when Bootstrap modals are opened
$(document).on("show.bs.modal", ".modal", function () {
  $("body").addClass("modal-open");
});

$(document).on("hidden.bs.modal", ".modal", function () {
  const modalElement = this;

  // Add delay to ensure Bootstrap completes modal disposal
  setTimeout(function () {
    // CRITICAL: If the modal was reopened during this delay, DO NOT dispose it.
    if ($(modalElement).hasClass("show")) {
      console.log("🛑 Global Cleanup: Modal reopened, skipping disposal.");
      return;
    }

    // Only remove class if no other modals are still open
    if ($(".modal.show").length === 0) {
      $("body").removeClass("modal-open");
      // Force remove backdrop and reset styles to prevent stuck overlays
      $(".modal-backdrop").remove();
      $("body").css("padding-right", "");
      $("body").css("overflow", "");
    }

    // Dispose the modal instance to ensure clean state for reopening
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
      modalInstance.dispose();
    }

    // Reset modal attributes to initial state
    modalElement.classList.remove("show");
    modalElement.style.display = "";
    modalElement.setAttribute("aria-hidden", "true");
    modalElement.removeAttribute("aria-modal");
    modalElement.removeAttribute("role");
  }, 200);
});
