if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        @keyframes slideInToast { 0% { transform: translateX(-50%) translateY(20px); opacity: 0; } 100% { transform: translateX(-50%) translateY(0); opacity: 1; } }
        @keyframes slideOutToast { 0% { transform: translateX(-50%) translateY(0); opacity: 1; } 100% { transform: translateX(-50%) translateY(20px); opacity: 0; } }
    `;
    document.head.appendChild(style);
}

const Toast = {
    show(message, type = 'info') {
        const toastContainer =
            document.getElementById('toast-container') ||
            (() => {
                const container = document.createElement('div');
                container.id = 'toast-container';
                container.style.cssText =
                    'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);z-index:1000;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
                document.body.appendChild(container);
                return container;
            })();

        const toast = document.createElement('div');
        const bgColor = type === 'error' ? '#e74c3c' : type === 'success' ? '#2ecc71' : '#3498db';
        toast.style.cssText = `background:${bgColor};color:white;padding:12px 20px;border-radius:8px;border:3px solid #000;font-weight:900;box-shadow:0 4px 0 #000;animation:slideInToast 0.3s ease-out;max-width:300px;text-align:center;font-size:0.9rem;`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutToast 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
};
