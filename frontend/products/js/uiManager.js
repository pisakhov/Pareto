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
};
