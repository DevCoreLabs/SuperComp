/**
 * Forward Message Popup Functionality
 */

class ForwardPopup {
  constructor() {
    this.popup = document.querySelector(".forward-popup");
    this.openBtn = document.querySelector("#forward-email-btn"); // Primary trigger

    if (!this.popup) return;

    this.init();
  }

  init() {
    // Elements
    this.toInput = this.popup.querySelector(".forward-to-input");
    this.ccBtn = this.popup.querySelector(".forward-cc-toggle");
    this.bccBtn = this.popup.querySelector(".forward-bcc-toggle");
    this.ccField = this.popup.querySelector(".forward-cc-field");
    this.bccField = this.popup.querySelector(".forward-bcc-field");
    this.ccInput = this.popup.querySelector(".forward-cc-input");
    this.bccInput = this.popup.querySelector(".forward-bcc-input");
    
    this.editor = this.popup.querySelector(".forward-editor");
    this.closeBtn = this.popup.querySelector(".compose-trash-btn"); // START: Fixed selector
    this.sendBtn = this.popup.querySelector(".btn-send");
    
    // Dropdown Type Elements
    this.typeDropdownItems = this.popup.querySelectorAll(".forward-type-dropdown .dropdown-item");
    this.typeIcon = this.popup.querySelector(".forward-type-dropdown button i:first-child");

    // Event Listeners
    if (this.openBtn) {
      this.openBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.open();
      });
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.close());
    }

    // CC Toggle Logic
    if (this.ccBtn) {
      this.ccBtn.addEventListener("click", () => {
        if (this.ccField) {
            this.ccField.classList.remove("d-none");
            this.ccField.classList.add("d-flex"); // Ensure flex display
            this.ccBtn.style.display = "none";
            if(this.ccInput) this.ccInput.focus();
        }
      });
    }

    // BCC Toggle Logic
    if (this.bccBtn) {
      this.bccBtn.addEventListener("click", () => {
        if (this.bccField) {
            this.bccField.classList.remove("d-none");
            this.bccField.classList.add("d-flex"); // Ensure flex display
            this.bccBtn.style.display = "none";
            if(this.bccInput) this.bccInput.focus();
        }
      });
    }
    
    // Type Dropdown Logic
    if (this.typeDropdownItems) {
        // Correctly locate the button inside the dropdown wrapper
        const dropdownToggle = this.popup.querySelector('.forward-type-dropdown button[data-bs-toggle="dropdown"]');
        
        if (dropdownToggle) {
             // We'll rely on Bootstrap's native behaviour first, but add a fallback listener if it's not triggering
             // especially since the popup is initially hidden.
             dropdownToggle.addEventListener('click', (e) => {
                 // Don't preventDefault immediately if we want Bootstrap to handle it, 
                 // but typically Bootstrap handles click.
                 // If we preventDefault, we stop Bootstrap. 
                 // But if Bootstrap ISN'T working, we need to do it manually.
                 
                 // Let's check if the menu is showing content.
                 const dropdownMenu = dropdownToggle.nextElementSibling;
                 
                 // If the menu is NOT showing, maybe Bootstrap failed.
                 // We will use setTimeout to let Bootstrap try first.
                 setTimeout(() => {
                     if (dropdownMenu && !dropdownMenu.classList.contains('show')) {
                         // Bootstrap didn't open it. Let's force it.
                         if (window.bootstrap && window.bootstrap.Dropdown) {
                             const bsDropdown = bootstrap.Dropdown.getOrCreateInstance(dropdownToggle);
                             bsDropdown.show();
                         } else {
                             dropdownMenu.classList.add('show');
                             dropdownMenu.style.display = 'block'; // Ensure visibility
                         }
                     }
                 }, 50);
             });
        }
        
        // Also handle clicking outside to close if manual toggle was used
        document.addEventListener('click', (e) => {
             const dropdownMenu = this.popup.querySelector('.forward-type-dropdown .dropdown-menu');
             const dropdownToggle = this.popup.querySelector('.forward-type-dropdown button[data-bs-toggle="dropdown"]');
             if (dropdownMenu && dropdownMenu.classList.contains('show')) {
                 if (!dropdownMenu.contains(e.target) && !dropdownToggle.contains(e.target)) {
                     dropdownMenu.classList.remove('show');
                     dropdownMenu.style.display = '';
                 }
             }
        });

        this.typeDropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const type = item.getAttribute('data-type');
                
                // Close dropdown after selection
                const dropdownMenu = item.closest('.dropdown-menu');
                if(dropdownMenu) {
                    dropdownMenu.classList.remove('show');
                    dropdownMenu.style.display = '';
                }

                if (type === 'reply') {
                    if (this.typeIcon) this.typeIcon.className = 'fi fi-rr-undo fs-5 d-flex';
                    // Clear editor content for reply
                    // if (this.editor) this.editor.innerHTML = '<br>'; 
                    // Hide forwarded block
                    const forwardedBlock = this.popup.querySelector(".forwarded-block");
                    if (forwardedBlock) forwardedBlock.style.display = 'none';

                    // Hide CC/BCC triggers and fields
                    if (this.ccBtn) this.ccBtn.style.display = 'none';
                    if (this.bccBtn) this.bccBtn.style.display = 'none';
                    if (this.ccField) {
                        this.ccField.classList.add('d-none');
                        this.ccField.classList.remove('d-flex');
                    }
                    if (this.bccField) {
                        this.bccField.classList.add('d-none');
                        this.bccField.classList.remove('d-flex');
                    }
                    
                } else if (type === 'forward') {
                    if (this.typeIcon) this.typeIcon.className = 'icon-right-send-arrow fs-5';
                    // Restore forwarded content 
                    this.populateForwardedBlock();
                    const forwardedBlock = this.popup.querySelector(".forwarded-block");
                    if (forwardedBlock) forwardedBlock.style.display = 'block';

                    // Show CC/BCC triggers
                    if (this.ccBtn) this.ccBtn.style.display = ''; // Restore default
                    if (this.bccBtn) this.bccBtn.style.display = ''; // Restore default
                }
            });
        });
    }

    if (this.sendBtn) {
      this.sendBtn.addEventListener("click", () => {
        showAppToast("Message sent!");
        this.close();
      });
    }

    // Formatting buttons logic
    const formattingBtns = this.popup.querySelectorAll(
      "button[data-command]"
    );
    formattingBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const command = btn.getAttribute("data-command");
        const value = btn.getAttribute("data-value") || null;
        this.editor.focus();
        document.execCommand(command, false, value);
      });
    });

    // Formatting toolbar toggle logic is now handled in read-email.html to avoid conflicts
    // and maintain consistency with the reply editor.
  }

  open() {
    this.popup.classList.add("show");
    const bottomBar = document.querySelector(".mail-read-bottom-bar");
    if (bottomBar) bottomBar.style.display = "none";

    // Reset CC/BCC
    if (this.ccField) {
        this.ccField.classList.add("d-none");
        this.ccField.classList.remove("d-flex");
    }
    if (this.bccField) {
        this.bccField.classList.add("d-none");
        this.bccField.classList.remove("d-flex");
    }
    if (this.ccBtn) this.ccBtn.style.display = "";
    if (this.bccBtn) this.bccBtn.style.display = "";

    // Reset to Forward State
    if (this.typeIcon) this.typeIcon.className = 'icon-right-send-arrow fs-5';
    const forwardedBlock = this.popup.querySelector(".forwarded-block");
    if (forwardedBlock) forwardedBlock.style.display = 'block';

    // Scroll to the popup with offset using jQuery if available for smooth animation
    if (window.jQuery) {
      $("html, body").animate(
        {
          scrollTop: $(this.popup).offset().top - 100,
        },
        500,
      );
    } else {
      this.popup.scrollIntoView({ behavior: "smooth" });
    }

    this.populateForwardedBlock();
    this.editor.focus();
    // Move cursor to top (above forwarded block)
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(this.editor, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  close() {
    this.popup.classList.remove("show");
    const bottomBar = document.querySelector(".mail-read-bottom-bar");
    if (bottomBar) bottomBar.style.display = "flex";
  }

  populateForwardedBlock() {
    const forwardedBlock = this.popup.querySelector(".forwarded-block");
    if (!forwardedBlock) return;

    const now = new Date();
    const dateStr = now.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Mock data for forwarded message
    const senderName = "SuperComp AI";
    const senderEmail = "support@supercomp.ai";
    const subject = "Re: Project Update";
    const receiver = "User <user@example.com>";

    forwardedBlock.innerHTML = `
    ---------- Forwarded message ----------
    From: <b>${senderName}</b> <${senderEmail}>
    Date: ${dateStr}
    Subject: ${subject}
    To: ${receiver}
    `.trim();
  }
}

// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  window.forwardPopup = new ForwardPopup();
});
