$(document).ready(function() {
    let activeEditorContainer = null;

    // Handle Confidential icon click
    $(document).on('click', '.btn-confidential, [title="Security options"]', function(e) {
        e.preventDefault();
        activeEditorContainer = $(this).closest('.compose-popup, .gmail-reply-wrapper, .forward-popup');
        
        // Populate current settings if exist (not implemented for simple version)
        
        const modal = new bootstrap.Modal(document.getElementById('confidentialModeModal'));
        modal.show();
    });

    // Update date display based on expiration select
    $(document).on('change', '#confidential-expiration', function() {
        const val = $(this).val();
        const date = new Date();
        
        if (val === '1-day') date.setDate(date.getDate() + 1);
        else if (val === '1-week') date.setDate(date.getDate() + 7);
        else if (val === '1-month') date.setMonth(date.getMonth() + 1);
        else if (val === '3-months') date.setMonth(date.getMonth() + 3);
        else if (val === '5-years') date.setFullYear(date.getFullYear() + 5);
        
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        $('#confidential-date-display').text(date.toLocaleDateString('en-US', options));
    });

    // Handle Save button
    $(document).on('click', '#save-confidential-mode', function() {
        if (!activeEditorContainer) return;

        const expirationText = $('#confidential-date-display').text();
        const $bannerWrapper = activeEditorContainer.find('.confidential-banner-wrapper');
        
        // If banner wrapper doesn't exist (like in reply/forward if I haven't added it), create it
        if ($bannerWrapper.length === 0) {
            // Find a good place to insert it. For reply/forward, usually above the content.
            const $content = activeEditorContainer.find('.gmail-reply-body, .forward-editor, .compose-message');
            $('<div class="confidential-banner-wrapper"></div>').insertBefore($content);
        }

        const bannerHtml = `
            <div class="confidential-banner active-blue">
                <div class="confidential-banner-icon">
                    <i class="fi fi-rr-lock"></i>
                </div>
                <div class="confidential-banner-content">
                    <div class="confidential-banner-title">Content expires ${expirationText}</div>
                    <div class="confidential-banner-desc">Recipients won't have the option to forward, copy, print, or download this email.</div>
                </div>
                <div class="confidential-banner-actions">
                    <div class="confidential-banner-edit">Edit</div>
                    <div class="confidential-banner-close">&times;</div>
                </div>
            </div>
        `;

        activeEditorContainer.find('.confidential-banner-wrapper').html(bannerHtml).removeClass('d-none');
        
        // Hide modal
        bootstrap.Modal.getInstance(document.getElementById('confidentialModeModal')).hide();
    });

    // Handle Edit in banner
    $(document).on('click', '.confidential-banner-edit', function() {
        activeEditorContainer = $(this).closest('.compose-popup, .gmail-reply-wrapper, .forward-popup');
        const modal = new bootstrap.Modal(document.getElementById('confidentialModeModal'));
        modal.show();
    });

    // Handle Remove in banner
    $(document).on('click', '.confidential-banner-close', function() {
        $(this).closest('.confidential-banner-wrapper').addClass('d-none').empty();
    });
});
