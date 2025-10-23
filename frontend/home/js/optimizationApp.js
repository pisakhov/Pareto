/**
 * Optimization App - Main orchestrator for optimization dashboard
 */
class OptimizationApp {
    constructor() {
        this.init();
    }

    async init() {
        console.log('Optimization dashboard loaded');
        await this.loadComparison();
    }

    async loadComparison() {
        const loadingState = document.getElementById('loadingState');
        
        try {
            await window.comparisonView.init();
            window.comparisonView.show();
            
            if (loadingState) {
                loadingState.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error loading comparison:', error);
            this.showNotification('Failed to load optimization data', 'error');
            
            if (loadingState) {
                loadingState.innerHTML = `
                    <div class="text-center py-12">
                        <p class="text-red-600 mb-2">Failed to load data</p>
                        <p class="text-sm text-muted-foreground">${error.message}</p>
                    </div>
                `;
            }
        }
    }


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
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.optimizationApp = new OptimizationApp();
});
