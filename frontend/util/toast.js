/**
 * Toast - Beautiful shadcn-inspired notifications
 * Following UAT philosophy: minimal, self-documenting code
 */

const Toast = (() => {
  const TOAST_LIMIT = 1;
  const TOAST_REMOVE_DELAY = 3000;

  /**
   * Create toast element with shadcn-inspired design
   */
  const createToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `
      group pointer-events-auto relative flex w-full items-center justify-between space-x-4
      overflow-hidden rounded-xl border p-4 pr-8 shadow-lg transition-all
      duration-300 ease-in-out
      translate-y-full
      ${getToastStyles(type)}
    `;

    toast.innerHTML = `
      <div class="flex items-start gap-3">
        ${getIcon(type)}
        <div class="grid gap-1">
          <p class="text-sm font-medium leading-none tracking-tight">
            ${message}
          </p>
        </div>
      </div>
      <button class="absolute right-2 top-2 rounded-md p-1 opacity-0
                     transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none
                     focus:ring-2 group-hover:opacity-100 text-slate-400 hover:text-slate-600
                     dark:text-slate-500 dark:hover:text-slate-300"
              aria-label="Close"
              onclick="this.parentElement.remove()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    `;

    return toast;
  };

  /**
   * Get toast styles based on type
   */
  const getToastStyles = (type) => {
    const styles = {
      success: 'border-l-4 border-l-green-500 bg-green-50 text-green-900 dark:bg-green-900 dark:text-green-50',
      error: 'border-l-4 border-l-red-500 bg-red-50 text-red-900 dark:bg-red-900 dark:text-red-50',
      warning: 'border-l-4 border-l-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-50',
      info: 'border-l-4 border-l-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-900 dark:text-blue-50',
    };
    return styles[type] || styles.info;
  };

  /**
   * Get icon for toast type
   */
  const getIcon = (type) => {
    const icons = {
      success: `<div class="mt-0.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
             class="text-green-600 dark:text-green-400">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>`,
      error: `<div class="mt-0.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
             class="text-red-600 dark:text-red-400">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>`,
      warning: `<div class="mt-0.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
             class="text-yellow-600 dark:text-yellow-400">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <path d="M12 9v4"/>
          <path d="M12 17h.01"/>
        </svg>
      </div>`,
      info: `<div class="mt-0.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
             class="text-blue-600 dark:text-blue-400">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
      </div>`,
    };
    return icons[type] || icons.info;
  };

  /**
   * Show toast notification
   */
  const show = (message, type = 'info') => {
    // Remove existing toasts
    document.querySelectorAll('.toast-container .translate-y-full').forEach(t => t.remove());

    // Create and append new toast
    const container = ensureContainer();
    const toast = createToast(message, type);
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-full');
    });

    // Auto remove
    setTimeout(() => {
      toast.classList.add('translate-y-full');
      setTimeout(() => toast.remove(), 300);
    }, TOAST_REMOVE_DELAY);
  };

  /**
   * Ensure toast container exists
   */
  const ensureContainer = () => {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = `
        toast-container fixed bottom-4 left-4 z-[100] flex flex-col gap-2
        p-4 w-full max-w-sm pointer-events-none
      `;
      document.body.appendChild(container);
    }
    return container;
  };

  return { show };
})();

// Export for use in other modules
window.Toast = Toast;
