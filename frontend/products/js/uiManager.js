/**
 * UI Manager - Handles UI updates, notifications, and visual feedback
 */
const uiManager = {
    updateCounts(products) {
        const productCount = document.getElementById('productCount');
        if (productCount) {
            productCount.textContent = products.length;
        }
    },

    showLoadingState(show = true) {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        if (show) {
            grid.innerHTML = `
                <div class="col-span-full flex items-center justify-center py-12">
                    <div class="text-center">
                        <svg class="animate-spin h-8 w-8 mx-auto text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p class="mt-2 text-sm text-muted-foreground">Loading products...</p>
                    </div>
                </div>
            `;
        }
    },

    updateItemSelect(items) {
        const select = document.getElementById('productItems');
        if (!select) return;

        // Clear existing options
        select.innerHTML = '';

        // Add item options
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.item_id;
            option.textContent = item.item_name;
            if (item.status !== 'active') {
                option.textContent += ' (inactive)';
            }
            select.appendChild(option);
        });
    },

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 transition-all duration-300 transform translate-x-full`;

        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            info: 'bg-blue-500 text-white',
        };

        notification.className += ` ${colors[type]}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    },
};
