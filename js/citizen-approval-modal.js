let modal;
let modalName;
let resolveApproval;

function createModal() {
    if (modal) return;

    const style = document.createElement("style");
    style.textContent = `
        .approval-modal-backdrop { position: fixed; z-index: 9999; inset: 0; display: grid; place-items: center; padding: 18px; background: rgba(15,23,42,.42); animation: approvalModalFade .18s ease-out both; }.approval-modal-backdrop[hidden] { display: none !important; }
        .approval-modal-card { width: min(400px,100%); padding: 25px; border: 1px solid #7dd3fc; border-radius: 14px; background: #ffffff; box-shadow: 0 22px 55px rgba(15,23,42,.24); animation: approvalModalCard .22s ease-out both; }
        .approval-modal-icon { display: grid; width: 42px; height: 42px; margin-bottom: 15px; place-items: center; border-radius: 50%; background: #7dd3fc; color: #111827; font-size: 18px; font-weight: 800; }
        .approval-modal-card h2 { margin: 0; color: #111827; font: 700 20px "Segoe UI",Arial,sans-serif; }.approval-modal-card p { margin: 9px 0 0; color: #111827; font: 400 13px/1.55 "Segoe UI",Arial,sans-serif; }.approval-modal-card p strong { font-weight: 700; }
        .approval-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }.approval-modal-actions button { min-height: 38px; padding: 0 15px; border-radius: 8px; font: 700 12px "Segoe UI",Arial,sans-serif; cursor: pointer; transition: transform .16s ease, background .16s ease; }.approval-modal-cancel { border: 1px solid #7dd3fc; background: #ffffff; color: #111827; }.approval-modal-confirm { border: 1px solid #7dd3fc; background: #7dd3fc; color: #111827; }.approval-modal-actions button:hover { transform: translateY(-1px); background: #ffffff; }
        @keyframes approvalModalFade { from { opacity: 0; } to { opacity: 1; } } @keyframes approvalModalCard { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    `;
    document.head.appendChild(style);

    modal = document.createElement("div");
    modal.className = "approval-modal-backdrop";
    modal.hidden = true;
    modal.innerHTML = `
        <div class="approval-modal-card" role="dialog" aria-modal="true" aria-labelledby="approvalModalTitle">
            <div class="approval-modal-icon">✓</div>
            <h2 id="approvalModalTitle">Approve Citizen</h2>
            <p><strong id="approvalModalName"></strong> will be allowed to log in to the Citizen Dashboard.</p>
            <div class="approval-modal-actions">
                <button type="button" class="approval-modal-cancel">Cancel</button>
                <button type="button" class="approval-modal-confirm">Approve</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modalName = modal.querySelector("#approvalModalName");

    const closeModal = (approved) => {
        modal.hidden = true;
        const resolver = resolveApproval;
        resolveApproval = null;
        resolver?.(approved);
    };

    modal.querySelector(".approval-modal-cancel").addEventListener("click", () => closeModal(false));
    modal.querySelector(".approval-modal-confirm").addEventListener("click", () => closeModal(true));
    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal(false);
    });
}

export function confirmCitizenApproval(fullName) {
    createModal();
    modalName.textContent = fullName || "This citizen";
    modal.hidden = false;
    modal.querySelector(".approval-modal-confirm").focus();
    return new Promise((resolve) => { resolveApproval = resolve; });
}
