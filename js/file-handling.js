/**
 * Gmail-style File and Image Upload Handler
 */
$(document).ready(function() {
    // 1. ATTACH FILE BUTTON CLICK
    $(document).on('click', '[title="Attach file"], [data-bs-title="Attach file"]', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Find the specific editor container this button belongs to
        const $container = $(this).closest('.compose-popup, .gmail-reply-wrapper, .forward-popup');
        $('#gmail-attach-file-input').data('target-container', $container).click();
    });

    // 2. INSERT IMAGE BUTTON CLICK
    $(document).on('click', '[title="Insert image"], [data-bs-title="Insert image"]', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const $container = $(this).closest('.compose-popup, .gmail-reply-wrapper, .forward-popup');
        $('#gmail-insert-image-input').data('target-container', $container).click();
    });

    // 3. HANDLE ATTACH FILE SELECTION
    $(document).on('change', '#gmail-attach-file-input', function(e) {
        const files = e.target.files;
        const $container = $(this).data('target-container');
        
        if (files.length > 0 && $container) {
            const $listWrapper = $container.find('.attachment-list-wrapper');
            const $list = $container.find('.attachment-list');
            
            $listWrapper.removeClass('d-none');
            
            Array.from(files).forEach(file => {
                const chip = `
                    <div class="attachment-chip">
                        <span class="filename" title="${file.name}">${file.name}</span>
                        <span class="remove-attachment">&times;</span>
                    </div>
                `;
                $list.append(chip);
            });
            
            // Scroll to bottom if it's the compose popup
            if ($container.hasClass('compose-popup')) {
                const body = $container.find('.compose-popup-body')[0];
                body.scrollTop = body.scrollHeight;
            } else if ($container.hasClass('forward-popup')) {
                const body = $container.find('.forward-body')[0];
                body.scrollTop = body.scrollHeight;
            }
            
            $(this).val('');
        }
    });

    // 4. HANDLE INSERT IMAGE SELECTION
    $(document).on('change', '#gmail-insert-image-input', function(e) {
        const files = e.target.files;
        const $container = $(this).data('target-container');
        
        if (files.length > 0 && $container) {
            const $editor = $container.find('[contenteditable="true"]').first();
            
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const imgHtml = `<img src="${event.target.result}" style="max-width: 100%; height: auto; margin: 5px 0;" alt="${file.name}">`;
                    
                    // Focus and insert at cursor
                    $editor.focus();
                    document.execCommand('insertHTML', false, imgHtml);
                    
                    // Auto-scroll to show new image
                    if ($container.hasClass('compose-popup')) {
                        const body = $container.find('.compose-popup-body')[0];
                        body.scrollTop = body.scrollHeight;
                    }
                };
                reader.readAsDataURL(file);
            });
            
            $(this).val('');
        }
    });

    // 5. REMOVE ATTACHMENT
    $(document).on('click', '.remove-attachment', function() {
        const $list = $(this).closest('.attachment-list');
        const $wrapper = $(this).closest('.attachment-list-wrapper');
        
        $(this).closest('.attachment-chip').remove();
        
        if ($list.children().length === 0) {
            $wrapper.addClass('d-none');
        }
    });

    // 6. DIRECT OPEN GOOGLE DRIVE
    $(document).on('click', '[title="Insert from Drive"], [data-bs-title="Insert from Drive"]', function(e) {
        e.preventDefault();
        // Simply open Google Drive directly as requested
        window.open('https://drive.google.com', '_blank');
    });
});
