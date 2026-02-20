class PopupManager {
    constructor(element, options = {}) {
        this.popup = element;
        this.options = Object.assign({
            minimizeBtn: '.minimize',
            maximizeBtn: '.maximize',
            closeBtn: '.close',
            header: '.popup-header',
            onClose: null,
            onOpen: null
        }, options);

        this.isMinimized = false;
        this.isMaximized = false;

        this.init();
    }

    init() {
        if (!this.popup) return;

        // Find controls
        this.minimizeBtn = this.popup.querySelector(this.options.minimizeBtn);
        this.maximizeBtn = this.popup.querySelector(this.options.maximizeBtn);
        this.closeBtn = this.popup.querySelector(this.options.closeBtn);
        this.header = this.popup.querySelector(this.options.header);

        // Bind events
        if (this.minimizeBtn) {
            this.minimizeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMinimize();
            });
        }

        if (this.maximizeBtn) {
            this.maximizeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMaximize();
            });
        }

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.close();
            });
        }

        // Optional: Click on header to restore if minimized
        if (this.header) {
            this.header.addEventListener('click', (e) => {
                // Determine if the click target is a button or inside a button
                const isButton = e.target.closest('a, button');
                
                // If it's minimized and (we clicked empty space OR the header itself), toggle minimize.
                // We typically want to allow maximizing/closing even when minimized, so we don't block those.
                // But we want clicking the *bar* to restore.
                if (this.isMinimized && !isButton) {
                    this.toggleMinimize();
                }
            });
        }
    }

    open() {
        this.popup.style.display = 'flex';
        // Reset states if needed, or keep previous state? Gmail keeps state.
        // Let's ensure it's visible.
        if (typeof this.options.onOpen === 'function') {
            this.options.onOpen(this);
        }
    }

    close() {
        this.popup.style.display = 'none';
        this.isMinimized = false;
        this.isMaximized = false;
        this.popup.classList.remove('minimized', 'fullscreen-modal');
        
        // Remove backdrop if it exists
        this.removeBackdrop();
        
        if (typeof this.options.onClose === 'function') {
            this.options.onClose(this);
        }
    }

    toggleMinimize() {
        if (this.isMaximized) {
            this.toggleMaximize();
            return;
        }

        this.isMinimized = !this.isMinimized;
        
        if (this.isMinimized) {
            this.popup.classList.add('minimized');
        } else {
            this.popup.classList.remove('minimized');
        }
    }

    toggleMaximize() {
        this.isMaximized = !this.isMaximized;
        this.isMinimized = false; // Un-minimize if maximizing
        this.popup.classList.remove('minimized');

        if (this.isMaximized) {
            // Enter centered modal mode (Gmail style)
            this.popup.classList.add('fullscreen-modal');
            
            // Create and show backdrop
            this.createBackdrop();
            
            // Update icon to show restore/minimize icon
            if (this.maximizeBtn) {
                const icon = this.maximizeBtn.querySelector('span');
                if (icon) {
                    // Store original class for restoration
                    if (!icon.dataset.originalClass) {
                        icon.dataset.originalClass = icon.className;
                    }
                    // Change to restore icon
                    icon.className = 'icon-maximize-2';
                }
            }
        } else {
            // Exit centered modal mode, return to normal popup
            this.popup.classList.remove('fullscreen-modal');
            
            // Remove backdrop
            this.removeBackdrop();
            
            // Restore original maximize icon
            if (this.maximizeBtn) {
                const icon = this.maximizeBtn.querySelector('span');
                if (icon && icon.dataset.originalClass) {
                    icon.className = icon.dataset.originalClass;
                }
            }
        }
    }

    createBackdrop() {
        // Check if backdrop already exists
        if (!this.backdrop) {
            this.backdrop = document.createElement('div');
            this.backdrop.className = 'compose-modal-backdrop';
            
            // Close modal when clicking backdrop
            this.backdrop.addEventListener('click', () => {
                this.toggleMaximize();
            });
            
            document.body.appendChild(this.backdrop);
        }
        
        // Show backdrop with animation
        setTimeout(() => {
            this.backdrop.classList.add('show');
        }, 10);
    }

    removeBackdrop() {
        if (this.backdrop) {
            this.backdrop.classList.remove('show');
            
            // Remove from DOM after animation
            setTimeout(() => {
                if (this.backdrop && this.backdrop.parentNode) {
                    this.backdrop.parentNode.removeChild(this.backdrop);
                    this.backdrop = null;
                }
            }, 200);
        }
    }
}
