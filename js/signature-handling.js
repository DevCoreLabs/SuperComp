$(document).ready(function () {
  // Toggle dropdown
  $(document).on("click", ".btn-signature", function (e) {
    e.stopPropagation();
    e.preventDefault();
    const $wrapper = $(this).closest(".position-relative");
    const $menu = $wrapper.find(".signature-dropdown-menu");

    // Close other signature menus
    $(".signature-dropdown-menu").not($menu).addClass("d-none");

    $menu.toggleClass("d-none");
  });

  // Close on click outside
  $(document).on("click", function () {
    $(".signature-dropdown-menu").addClass("d-none");
  });

  $(document).on("click", ".signature-dropdown-menu", function (e) {
    e.stopPropagation();
  });

  // Handle selection
  $(document).on("click", ".sig-item", function () {
    const sig = $(this).data("sig");
    const $menu = $(this).closest(".signature-dropdown-menu");

    // Update checkmarks
    $menu.find(".sig-check").addClass("opacity-0");
    $(this).find(".sig-check").removeClass("opacity-0");

    // Find editor
    const $popup = $(this).closest(
      ".compose-popup, .gmail-reply-wrapper, .forward-popup",
    );
    let $editor;

    if ($popup.hasClass("compose-popup")) {
      $editor = $popup.find(".compose-message");
    } else if ($popup.hasClass("gmail-reply-wrapper")) {
      $editor = $popup.find("#gmail-reply-body");
    } else if ($popup.hasClass("forward-popup")) {
      $editor = $popup.find(".forward-body, .forward-editor").first();
    }

    if ($editor && $editor.length) {
      updateSignature($editor, sig);
    }

    $menu.addClass("d-none");
  });

  function updateSignature($editor, sigType) {
    // Remove existing signature
    $editor.find(".supercomp-signature").remove();

    let sigHtml = "";
    if (sigType === "Arun") {
      sigHtml =
        '<div class="supercomp-signature" dir="ltr"><br>--<br>Arun</div>';
    } else if (sigType === "Arun CEO") {
      sigHtml =
        '<div class="supercomp-signature" dir="ltr"><br>--<br><strong>Arun</strong><br><em>CEO, SuperComp.AI</em><br>P: +91 98765 43210</div>';
    }

    if (sigHtml) {
      $editor.append(sigHtml);
    }
  }

  $(document).on("click", ".manage-signatures", function () {
    console.log("Open signature settings...");
  });
});
