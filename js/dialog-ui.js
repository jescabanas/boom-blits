let dialogRoot;
let dialogTitle;
let dialogMessage;
let dialogInput;
let dialogCancel;
let dialogConfirm;
let resolveDialog;

function ensureDialog() {
    if (dialogRoot) return;

    const style = document.createElement("style");
    style.textContent = `
        .system-dialog-backdrop{position:fixed;z-index:10000;inset:0;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.42)}.system-dialog-card{width:min(400px,100%);padding:25px;border:1px solid #7dd3fc;border-radius:14px;background:#fff;box-shadow:0 22px 55px rgba(15,23,42,.24)}.system-dialog-card h2{margin:0;color:#111827;font:700 19px "Segoe UI",Arial,sans-serif}.system-dialog-card p{margin:9px 0 0;color:#111827;font:400 13px/1.55 "Segoe UI",Arial,sans-serif}.system-dialog-card input{width:100%;height:41px;margin-top:15px;padding:0 11px;border:1px solid #7dd3fc;border-radius:8px;color:#111827;font:12px "Segoe UI",Arial,sans-serif}.system-dialog-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}.system-dialog-actions button{min-height:38px;padding:0 15px;border-radius:8px;font:700 12px "Segoe UI",Arial,sans-serif;cursor:pointer}.system-dialog-cancel{border:1px solid #7dd3fc;background:#fff;color:#111827}.system-dialog-confirm{border:1px solid #7dd3fc;background:#7dd3fc;color:#111827}.system-toast{position:fixed;z-index:10001;right:18px;bottom:18px;max-width:min(360px,calc(100vw - 36px));padding:13px 16px;border:1px solid #7dd3fc;border-radius:10px;background:#fff;color:#111827;box-shadow:0 14px 30px rgba(15,23,42,.18);font:600 12px/1.45 "Segoe UI",Arial,sans-serif;animation:systemToastIn .2s ease-out both}@keyframes systemToastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    `;
    document.head.appendChild(style);

    const visibilityStyle = document.createElement("style");
    visibilityStyle.textContent =
        ".system-dialog-backdrop[hidden] { display: none !important; }";
    document.head.appendChild(visibilityStyle);

    dialogRoot = document.createElement("div");
    dialogRoot.className = "system-dialog-backdrop";
    dialogRoot.hidden = true;
    dialogRoot.innerHTML = `<div class="system-dialog-card" role="dialog" aria-modal="true"><h2></h2><p></p><input type="text" hidden><div class="system-dialog-actions"><button type="button" class="system-dialog-cancel">Cancel</button><button type="button" class="system-dialog-confirm">OK</button></div></div>`;
    document.body.appendChild(dialogRoot);
    dialogTitle = dialogRoot.querySelector("h2");
    dialogMessage = dialogRoot.querySelector("p");
    dialogInput = dialogRoot.querySelector("input");
    dialogCancel = dialogRoot.querySelector(".system-dialog-cancel");
    dialogConfirm = dialogRoot.querySelector(".system-dialog-confirm");
    const close = (value) => { dialogRoot.hidden = true; const resolver = resolveDialog; resolveDialog = null; resolver?.(value); };
    dialogCancel.addEventListener("click", () => close(null));
    dialogConfirm.addEventListener("click", () => close(dialogInput.hidden ? true : dialogInput.value));
    dialogRoot.addEventListener("click", (event) => { if (event.target === dialogRoot) close(null); });
}

export function confirmAction(title, message, confirmLabel = "Confirm") {
    ensureDialog();
    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogInput.hidden = true;
    dialogCancel.hidden = false;
    dialogConfirm.textContent = confirmLabel;
    dialogRoot.hidden = false;
    dialogConfirm.focus();
    return new Promise((resolve) => { resolveDialog = (value) => resolve(Boolean(value)); });
}

export function requestText(title, message, placeholder = "Enter a reason") {
    ensureDialog();
    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogInput.hidden = false;
    dialogInput.value = "";
    dialogInput.placeholder = placeholder;
    dialogCancel.hidden = false;
    dialogConfirm.textContent = "Continue";
    dialogRoot.hidden = false;
    dialogInput.focus();
    return new Promise((resolve) => { resolveDialog = resolve; });
}

export function showSystemToast(message) {
    const toast = document.createElement("div");
    toast.className = "system-toast";
    toast.textContent = String(message || "");
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3600);
}

window.alert = (message) => showSystemToast(message);
