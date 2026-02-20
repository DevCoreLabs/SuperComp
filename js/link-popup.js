/**
 * Gmail-Style Link Input Popup Handler
 */
$(document).ready(function() {
    let linkActiveRange = null;
    let currentEditor = null;

    // Handle Link button click
    $(document).on('click', '[title="Insert link"], [data-bs-title="Insert link"], [data-command="createLink"]', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const btn = $(this);
        // Find the closest editor container
        const $wrapper = btn.closest('.compose-popup, .gmail-reply-wrapper, .forward-popup, .rte-container');
        const editor = $wrapper.find('[contenteditable="true"]')[0];
        
        if (!editor) return;
        currentEditor = editor;

        // Save current selection
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            linkActiveRange = sel.getRangeAt(0).cloneRange();
        }

        // Pre-fill text
        const selectedText = sel.toString();
        $('#gmail-link-text').val(selectedText);
        $('#gmail-link-url').val('');

        // Show popup
        const popup = $('#gmail-link-popup');
        popup.show();

        // Position popup near the button
        const rect = btn[0].getBoundingClientRect();
        let top = rect.top - popup.outerHeight() - 10;
        let left = rect.left;

        // Ensure it doesn't go off screen
        if (top < 10) top = rect.bottom + 10;
        if (left + popup.outerWidth() > window.innerWidth) left = window.innerWidth - popup.outerWidth() - 20;

        popup.css({
            top: top + 'px',
            left: left + 'px'
        });

        // Focus URL input if text is already present, otherwise focus text
        setTimeout(() => {
            if (selectedText) {
                $('#gmail-link-url').focus();
            } else {
                $('#gmail-link-text').focus();
            }
        }, 100);
    });

    // Handle Apply button click
    $(document).on('click', '#gmail-link-apply', function() {
        const text = $('#gmail-link-text').val().trim();
        let url = $('#gmail-link-url').val().trim();

        if (!url) {
            $('#gmail-link-popup').hide();
            return;
        }

        // Ensure protocol
        if (url && !/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
            url = 'https://' + url;
        }

        if (currentEditor) {
            currentEditor.focus();
            const sel = window.getSelection();
            
            if (linkActiveRange) {
                sel.removeAllRanges();
                sel.addRange(linkActiveRange);
            }

            if (text) {
                // If we have specific text, insert it as HTML
                const linkHtml = `<a href="${url}" target="_blank">${text}</a>`;
                document.execCommand('insertHTML', false, linkHtml);
            } else {
                // Otherwise just create link on existing selection
                document.execCommand('createLink', false, url);
                // Try to set target="_blank"
                const anchor = sel.anchorNode.parentElement;
                if (anchor && anchor.tagName === 'A') {
                    anchor.target = '_blank';
                }
            }
        }

        $('#gmail-link-popup').hide();
    });

    // Close on click outside
    $(document).on('mousedown', function(e) {
        if (!$(e.target).closest('#gmail-link-popup, [title="Insert link"], [data-bs-title="Insert link"]').length) {
            $('#gmail-link-popup').hide();
        }
    });

    // Close on Escape or Enter
    $(document).on('keydown', '#gmail-link-popup input', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $('#gmail-link-apply').click();
        }
        if (e.key === 'Escape') {
            $('#gmail-link-popup').hide();
        }
    });
});
