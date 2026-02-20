document.addEventListener("DOMContentLoaded", () => {
  initRTE();
});

/**
 * Returns the common HTML structure for the Rich Text Editor
 * @param {string} targetId - The ID of the hidden textarea to sync with
 * @param {string} placeholder - Placeholder text for the editor
 * @returns {string} HTML string
 */
function getRTEHTML(
  targetId = "rte-hidden-input",
  placeholder = "Enter your message here....",
) {
  return `
        <div class="rte-container" data-target="${targetId}">
            <div class="rte-toolbar">
                <div class="rte-toolbar-group">
                    <select class="rte-select" data-command="fontName">
                        <option value="Arial">Sans Serif</option>
                        <option value="Serif">Serif</option>
                        <option value="Fixedsys">Fixed Width</option>
                        <option value="Wide">Wide</option>
                        <option value="Narrow">Narrow</option>
                        <option value="Comic Sans MS">Comic Sans MS</option>
                        <option value="Garamond">Garamond</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Tahoma">Tahoma</option>
                        <option value="Trebuchet MS">Trebuchet MS</option>
                        <option value="Verdana">Verdana</option>
                    </select>
                </div>
                <div class="rte-toolbar-group">
                    <select class="rte-select" data-command="fontSize">
                        <option value="1">Small</option>
                        <option value="3" selected>Normal</option>
                        <option value="5">Large</option>
                        <option value="7">Huge</option>
                    </select>
                </div>
                <div class="rte-toolbar-group">
                    <button type="button" class="rte-btn" data-command="bold" title="Bold">
                        <span class="icon-bold_line d-flex"></span>
                    </button>
                    <button type="button" class="rte-btn" data-command="italic" title="Italic">
                        <span class="icon-italic_line d-flex"></span>
                    </button>
                    <button type="button" class="rte-btn" data-command="underline" title="Underline">
                        <span class="icon-underline_line d-flex"></span>
                    </button>
                    <button type="button" class="rte-btn" data-command="strikeThrough" title="Strikethrough">
                        <span class="icon-strikethrough_line d-flex"></span>
                    </button>
                </div>
                <div class="rte-toolbar-group">
                    <button type="button" class="rte-btn" data-command="justifyLeft" title="Align Left">
                        <i class="fi fi-rr-align-left d-flex"></i>
                    </button>
                    <button type="button" class="rte-btn" data-command="justifyCenter" title="Align Center">
                        <i class="fi fi-rr-align-center d-flex"></i>
                    </button>
                    <button type="button" class="rte-btn" data-command="justifyRight" title="Align Right">
                        <span class="icon-align_right_line d-flex"></span>
                    </button>
                </div>
                <div class="rte-toolbar-group">
                    <button type="button" class="rte-btn" data-command="insertUnorderedList" title="Bullet List">
                        <span class="icon-list_check_line d-flex"></span>
                    </button>
                    <button type="button" class="rte-btn" data-command="insertOrderedList" title="Numbered List">
                        <span class="icon-list_ordered_line d-flex"></span>
                    </button>
                </div>
              
            </div>
            <div class="rte-editor" contenteditable="true" style="min-height: 100px;" data-placeholder="${placeholder}"></div>
            <textarea id="${targetId}" name="${targetId}" style="display:none;"></textarea>
        </div>
    `;
}

function initRTE(specificContainer = null) {
  // First, populate any mount points
  const mounts = specificContainer
    ? specificContainer.classList.contains("rte-mount")
      ? [specificContainer]
      : specificContainer.querySelectorAll(".rte-mount")
    : document.querySelectorAll(".rte-mount");

  mounts.forEach((mount) => {
    const targetId =
      mount.getAttribute("data-target") ||
      `rte-${Math.random().toString(36).substr(2, 9)}`;
    const placeholder =
      mount.getAttribute("data-placeholder") || "Enter your message here....";
    mount.innerHTML = getRTEHTML(targetId, placeholder);
    // Change class so it's not re-mounted but caught by the next step
    mount.classList.remove("rte-mount");
    mount.classList.add("rte-mounted");
  });

  const editorContainers = specificContainer
    ? specificContainer.classList.contains("rte-container")
      ? [specificContainer]
      : specificContainer.querySelectorAll(".rte-container")
    : document.querySelectorAll(".rte-container");

  editorContainers.forEach((container) => {
    const toolbar = container.querySelector(".rte-toolbar");
    const editor = container.querySelector(".rte-editor");
    const hiddenInputId = container.getAttribute("data-target");
    const hiddenInput = hiddenInputId
      ? document.getElementById(hiddenInputId)
      : null;

    if (!toolbar || !editor) return;

    // Toolbar Button Events
    toolbar.querySelectorAll(".rte-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const command = btn.getAttribute("data-command");
        const value = btn.getAttribute("data-value") || null;

        if (command === "createLink") {
          const url = prompt("Enter the link URL:", "https://");
          if (url) document.execCommand(command, false, url);
        } else if (command === "insertImage") {
          const url = prompt("Enter the image URL:", "https://");
          if (url) document.execCommand(command, false, url);
        } else {
          document.execCommand(command, false, value);
        }

        editor.focus();
        updateToolbarState(toolbar, editor);
      });
    });

    // Toolbar Select Events
    toolbar.querySelectorAll(".rte-select").forEach((select) => {
      select.addEventListener("change", (e) => {
        const command = select.getAttribute("data-command");
        const value = select.value;
        document.execCommand(command, false, value);
        editor.focus();
      });
    });

    // Sync content to hidden input if exists
    editor.addEventListener("input", () => {
      if (hiddenInput) {
        hiddenInput.value = editor.innerHTML;
      }
    });

    // Selection change listener to update toolbar active states
    const selectionHandler = () => {
      if (document.activeElement === editor) {
        updateToolbarState(toolbar, editor);
      }
    };
    document.addEventListener("selectionchange", selectionHandler);

    // Store handler to remove if needed
    container._rteSelectionHandler = selectionHandler;
  });
}

function updateToolbarState(toolbar, editor) {
  const buttons = toolbar.querySelectorAll(".rte-btn[data-command]");
  buttons.forEach((btn) => {
    const command = btn.getAttribute("data-command");
    try {
      if (document.queryCommandState(command)) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    } catch (e) {
      // Some commands don't support queryCommandState
    }
  });

  // Handle alignment buttons specifically if needed
  const alignCommands = ["justifyLeft", "justifyCenter", "justifyRight"];
  alignCommands.forEach((cmd) => {
    const btn = toolbar.querySelector(`.rte-btn[data-command="${cmd}"]`);
    if (btn) {
      if (document.queryCommandState(cmd)) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    }
  });
}

// Helper to set content programmatically
function setRTEContent(containerId, html) {
  const container = document.getElementById(containerId);
  if (container) {
    const editor = container.querySelector(".rte-editor");
    if (editor) {
      editor.innerHTML = html;
      editor.dispatchEvent(new Event("input"));
    }
  }
}

// Helper to get content
function getRTEContent(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    const editor = container.querySelector(".rte-editor");
    return editor ? editor.innerHTML : "";
  }
  return "";
}
