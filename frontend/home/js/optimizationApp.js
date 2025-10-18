/**
 * Optimization App - Main orchestrator for optimization dashboard
 */
class OptimizationApp {
    constructor() {
        this.init();
    }

    async init() {
        console.log('Optimization dashboard loaded');
        console.log('Available globals:', {
            quantityManager: typeof quantityManager,
            tierStatusManager: typeof tierStatusManager,
            allocationVisualizer: typeof allocationVisualizer,
            window_allocationVisualizer: typeof window.allocationVisualizer
        });
        await quantityManager.loadProducts();
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        const calculateBtn = document.getElementById('calculateBtn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculate());
        }
    }

    async calculate() {
        const quantities = quantityManager.getQuantities();
        
        if (Object.keys(quantities).length === 0) {
            this.showNotification('Please set at least one product quantity', 'error');
            return;
        }

        const calculateBtn = document.getElementById('calculateBtn');
        const originalText = calculateBtn.innerHTML;
        calculateBtn.disabled = true;
        calculateBtn.innerHTML = '<span class="animate-pulse">Calculating...</span>';

        try {
            const [costResponse, tierStatusData] = await Promise.all([
                fetch('/api/optimization/cost', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_quantities: quantities })
                }),
                tierStatusManager.fetchTierStatus(quantities)
            ]);

            if (!costResponse.ok) throw new Error('Calculation failed');

            const result = await costResponse.json();
            this.displayResults(result, tierStatusData);
        } catch (error) {
            console.error('Error calculating cost:', error);
            this.showNotification('Failed to calculate cost', 'error');
        } finally {
            calculateBtn.disabled = false;
            calculateBtn.innerHTML = originalText;
        }
    }

    displayResults(result, tierStatusData) {
        document.getElementById('emptyState').classList.add('hidden');
        
        const costSummary = document.getElementById('costSummary');
        costSummary.classList.remove('hidden');
        
        document.getElementById('totalCost').textContent = `$${result.total_cost.toFixed(2)}`;
        
        const totalCreditFiles = result.total_credit_files || Object.values(result.provider_breakdown).reduce((sum, provider) => sum + provider.total_units, 0);
        document.getElementById('totalCreditFiles').textContent = totalCreditFiles;
        document.getElementById('providerCount').textContent = Object.keys(result.provider_breakdown).length;
        
        tierStatusManager.renderTierStatus(tierStatusData);
        
        const allocationView = document.getElementById('allocationView');
        allocationView.classList.remove('hidden');
        
        console.log('About to render allocation, checking:', {
            window_allocationVisualizer: typeof window.allocationVisualizer,
            allocationVisualizer: typeof allocationVisualizer
        });
        
        if (window.allocationVisualizer) {
            window.allocationVisualizer.renderProviderBreakdown(result.provider_breakdown);
        } else {
            console.error('allocationVisualizer not loaded');
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
