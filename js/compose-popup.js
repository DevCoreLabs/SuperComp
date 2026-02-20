// Compose Popup Functionality using PopupManager
function initComposePopup() {
    // Select ALL compose buttons (e.g. sidebar, mobile, etc.)
    const composeBtns = document.querySelectorAll('.compose-btn');
    const composePopupElement = document.querySelector('.compose-popup');

    if (composePopupElement) {
        const popupManager = new PopupManager(composePopupElement, {
            minimizeBtn: '.compose-minimize',
            maximizeBtn: '.compose-maximize',
            closeBtn: '.compose-close',
            header: '.popup-header',
            onClose: (manager) => {
                const form = manager.popup.querySelector('form');
                if (form) form.reset();
            }
        });

        // Attach event listener to ALL compose buttons
        if (composeBtns.length > 0) {
            composeBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    popupManager.open();
                });
            }); 
        }

        // Cc/Bcc Toggle Logic (Specific to Compose Popup)
        // Independent Toggles: Clicking button shows field and hides the button (Gmail style)
        const ccBtn = composePopupElement.querySelector('.cc-btn');
        const bccBtn = composePopupElement.querySelector('.bcc-btn');
        const ccInput = composePopupElement.querySelector('.cc-input-group');
        const bccInput = composePopupElement.querySelector('.bcc-input-group');

        const toggleField = (btn, field) => {
            if (field) {
                field.classList.remove('d-none');
                if (btn) btn.style.display = 'none'; // Hide button when active
            }
        };

        if (ccBtn) {
            ccBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleField(ccBtn, ccInput);
            });
        }

        if (bccBtn) {
            bccBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleField(bccBtn, bccInput);
            });
        }

        // Form Submission (Specific to Compose Popup)
        const composeForm = composePopupElement.querySelector('.compose-form');
        if (composeForm) {
            composeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                alert('Email sent successfully!');
                popupManager.close();
            });
        }
        
        // Specific Discard Button if exists
        const discardBtn = composePopupElement.querySelector('.compose-trash-btn'); 
        if(discardBtn){
            discardBtn.addEventListener('click', () => {
                popupManager.close();
            });
        }

        // --- NEW: Formatting Toolbar Toggle ---
        const formattingBtn = composePopupElement.querySelector('[title="Text formatting"], [data-bs-title="Text formatting"]');
        const formattingToolbar = composePopupElement.querySelector('.formatting-toolbar');
        const composeMessage = composePopupElement.querySelector('.compose-message');
        
        if (formattingBtn && formattingToolbar) {
            formattingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const isShow = formattingToolbar.classList.toggle('show');
                formattingBtn.classList.toggle('active', isShow);
            });
        }

        // --- NEW: Gmail-style Formatting Logic ---
        const executeCommand = (command, value = null) => {
            if (composeMessage) composeMessage.focus();
            document.execCommand(command, false, value);
            updateActiveStates();
        };

        const updateActiveStates = () => {
            if (!formattingToolbar) return;
            const formattingButtons = formattingToolbar.querySelectorAll('button[data-command]');
            formattingButtons.forEach(btn => {
                const command = btn.getAttribute('data-command');
                const value = btn.getAttribute('data-value');
                
                try {
                    let isActive = false;
                    if (command === 'formatBlock') {
                        isActive = document.queryCommandValue(command).toUpperCase() === (value || '').toUpperCase();
                    } else if (['fontName', 'fontSize', 'foreColor', 'hiliteColor'].includes(command)) {
                        isActive = false; 
                    } else {
                        isActive = document.queryCommandState(command);
                    }
                    btn.classList.toggle('active', isActive);
                } catch (e) {}
            });

            // Update selects
            formattingToolbar.querySelectorAll('select[data-command]').forEach(select => {
                const command = select.getAttribute('data-command');
                if (command === 'alignment') {
                    const alignments = ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'];
                    const activeAlign = alignments.find(align => document.queryCommandState(align));
                    if (activeAlign) select.value = activeAlign;
                } else {
                    try {
                        const value = document.queryCommandValue(command);
                        if (value) {
                            // Normalize value for matching (e.g. font names might have quotes)
                            const normalizedValue = value.replace(/['"]/g, '');
                            // Find option that matches or is similar
                            const option = Array.from(select.options).find(opt => 
                                opt.value.toLowerCase() === normalizedValue.toLowerCase() || 
                                opt.text.toLowerCase() === normalizedValue.toLowerCase()
                            );
                            if (option) select.value = option.value;
                        }
                    } catch (e) {}
                }
            });

            // Update color indicators
            try {
                const foreColor = document.queryCommandValue('foreColor');
                const textColorIndicator = formattingToolbar.querySelector('#text-color-indicator');
                if (textColorIndicator && foreColor) textColorIndicator.style.background = foreColor;

                const backColor = document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor');
                const bgColorIndicator = formattingToolbar.querySelector('#bg-color-indicator');
                if (bgColorIndicator && backColor) bgColorIndicator.style.background = backColor;
            } catch (e) {}
        };


        // --- NEW: Persistent Active States for ALL Toolbar Buttons ---
        const allToolbarBtns = composePopupElement.querySelectorAll('.compose-toolbar .btn-icon, .formatting-toolbar button[data-command]');
        allToolbarBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // If it's a color picker btn, ignore here (handled by input change)
                if (btn.classList.contains('color-picker-btn')) return;

                // If it's a formatting button with a command, let updateActiveStates handle it
                if (btn.hasAttribute('data-command')) {
                    const command = btn.getAttribute('data-command');
                    const value = btn.getAttribute('data-value');
                    executeCommand(command, value);
                    return; 
                }
                
                // For other buttons (Link, Attach, etc.), toggle active state
                if (btn !== formattingBtn) { // Formatting toggle is handled separately
                    btn.classList.toggle('active');
                }
            });
        });

        // Handle Selects in Formatting Toolbar
        formattingToolbar.querySelectorAll('select[data-command]').forEach(select => {
            select.addEventListener('change', () => {
                const command = select.getAttribute('data-command');
                const value = select.value;
                if (command === 'alignment') {
                    executeCommand(value);
                } else {
                    executeCommand(command, value);
                }
            });
        });

        // Handle Color Inputs
        formattingToolbar.querySelectorAll('input[type="color"]').forEach(input => {
            input.addEventListener('input', () => {
                const command = input.getAttribute('data-command');
                const value = input.value;
                executeCommand(command, value);
            });
            input.addEventListener('click', (e) => e.stopPropagation());
        });

        // --- NEW: Schedule Send Logic ---
        const sendDropdownToggle = composePopupElement.querySelector('#compose-send-dropdown-toggle');
        const sendDropdownMenu = composePopupElement.querySelector('#compose-send-dropdown-menu');
        const openScheduleModalBtn = composePopupElement.querySelector('.open-schedule-modal');
        const scheduleSendModal = document.querySelector('#scheduleSendModal');
        const dateTimeModal = document.querySelector('#dateTimeModal');

        if (sendDropdownToggle && sendDropdownMenu) {
            sendDropdownToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                sendDropdownMenu.classList.toggle('d-none');
                sendDropdownMenu.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!sendDropdownToggle.contains(e.target) && !sendDropdownMenu.contains(e.target)) {
                    sendDropdownMenu.classList.add('d-none');
                    sendDropdownMenu.classList.remove('show');
                }
            });
        }

        if (openScheduleModalBtn) {
            openScheduleModalBtn.addEventListener('click', () => {
                sendDropdownMenu.classList.add('d-none');
                sendDropdownMenu.classList.remove('show');
                if (window.bootstrap && window.bootstrap.Modal) {
                    bootstrap.Modal.getOrCreateInstance(scheduleSendModal).show();
                } else if (window.jQuery && $(scheduleSendModal).modal) {
                    $(scheduleSendModal).modal('show');
                } else {
                    scheduleSendModal.classList.add('show');
                    scheduleSendModal.style.display = 'block';
                }
            });
        }







        // Selection change listener to keep toolbar in sync
        document.addEventListener('selectionchange', () => {
            const activeEl = document.activeElement;
            if (activeEl === composeMessage || composeMessage.contains(activeEl)) {
                updateActiveStates();
            }
        });



    // Expose a way to open the popup with data (e.g. for drafts)
    window.openComposeWithDraft = (draftData) => {
        if (!composePopupElement) return;

        // Open the popup
        if (typeof popupManager !== 'undefined' && popupManager) {
            popupManager.open();
        } else {
             // Fallback if popupManager instance isn't available in this scope directly, 
             // but usually it is captured in the closure. 
             // If initComposePopup is called, popupManager is created.
             // We need to store popupManager instance to access it here if we move this function out.
             // However, since we are inside initComposePopup, we can access popupManager.
             // Wait, window.openComposeWithDraft is being defined INSIDE initComposePopup.
             // So it closes over popupManager. That works.
             popupManager.open();
        }

        // Populate fields
        const toInput = composePopupElement.querySelector('input[placeholder="To"]');
        const ccInput = composePopupElement.querySelector('input[placeholder="Cc"]');
        const bccInput = composePopupElement.querySelector('input[placeholder="Bcc"]');
        const subjectInput = composePopupElement.querySelector('input[placeholder="Subject"]');
        const messageBody = composePopupElement.querySelector('.compose-message');
        
        // Reset form first
        const form = composePopupElement.querySelector('form');
        if (form) form.reset();
        if (messageBody) messageBody.innerHTML = '';
        
        // Hide Cc/Bcc initially
        const ccGroup = composePopupElement.querySelector('.cc-input-group');
        const bccGroup = composePopupElement.querySelector('.bcc-input-group');
        const ccBtn = composePopupElement.querySelector('.cc-btn');
        const bccBtn = composePopupElement.querySelector('.bcc-btn');
        
        if (ccGroup) ccGroup.classList.add('d-none');
        if (bccGroup) bccGroup.classList.add('d-none');
        if (ccBtn) ccBtn.style.display = '';
        if (bccBtn) bccBtn.style.display = '';

        if (draftData) {
            // To
            if (toInput && draftData.to) {
                // If draftData.to is array of objects {name, email}
                if (Array.isArray(draftData.to)) {
                    toInput.value = draftData.to.map(t => t.email).join(', ');
                } else {
                    toInput.value = draftData.to; // Assume string
                }
            }

            // Cc
            if (ccInput && draftData.cc && draftData.cc.length > 0) {
                 if (ccGroup) ccGroup.classList.remove('d-none');
                 if (ccBtn) ccBtn.style.display = 'none';
                 
                 if (Array.isArray(draftData.cc)) {
                    ccInput.value = draftData.cc.map(c => c.email).join(', ');
                } else {
                    ccInput.value = draftData.cc;
                }
            }

            // Bcc
            if (bccInput && draftData.bcc && draftData.bcc.length > 0) {
                 if (bccGroup) bccGroup.classList.remove('d-none');
                 if (bccBtn) bccBtn.style.display = 'none';

                 if (Array.isArray(draftData.bcc)) {
                    bccInput.value = draftData.bcc.map(b => b.email).join(', ');
                } else {
                    bccInput.value = draftData.bcc;
                }
            }

            // Subject
            if (subjectInput && draftData.subject) {
                subjectInput.value = draftData.subject;
            }

            // Body
            if (messageBody && (draftData.body || draftData.body_html || draftData.snippet)) {
                messageBody.innerHTML = draftData.body_html || draftData.body || draftData.snippet || '';
            }
            
            // Attachments (TODO: Handle attachments visually if needed)
        }
    };
    }
}

