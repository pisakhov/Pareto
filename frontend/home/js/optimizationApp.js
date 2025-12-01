/**
 * Optimization App - Orchestrates the simulation dashboards
 */
class OptimizationApp {
    constructor() {
        this.activeTab = null;
        this.simulators = {
            allocation: null,
            forecast: null
        };
        this.init();
    }

    init() {
        this.setupTabs();
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => {
            const params = new URLSearchParams(window.location.search);
            const view = params.get('view') || 'allocation';
            this.switchTab(view, false);
        });

        // Set initial tab from URL or default
        const params = new URLSearchParams(window.location.search);
        const initialTab = params.get('view') === 'forecast' ? 'forecast' : 'allocation';
        this.switchTab(initialTab, false);
    }

    setupTabs() {
        const tabs = document.querySelectorAll('[data-tab]');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.tab;
                this.switchTab(target, true);
            });
        });
    }

    switchTab(tabName, updateHistory = true) {
        if (this.activeTab === tabName) return;
        this.activeTab = tabName;
        
        // Update URL
        if (updateHistory) {
            const url = new URL(window.location);
            url.searchParams.set('view', tabName);
            window.history.pushState({}, '', url);
        }

        // Update UI Tabs
        document.querySelectorAll('[data-tab]').forEach(t => {
            if (t.dataset.tab === tabName) {
                t.classList.add('border-slate-800', 'text-slate-900');
                t.classList.remove('border-transparent', 'text-slate-500', 'hover:text-slate-700', 'hover:border-slate-300');
            } else {
                t.classList.remove('border-slate-800', 'text-slate-900');
                t.classList.add('border-transparent', 'text-slate-500', 'hover:text-slate-700', 'hover:border-slate-300');
            }
        });

        // Toggle Content
        const allocContainer = document.getElementById('simulationAllocationContainer');
        const forecastContainer = document.getElementById('simulationForecastContainer');

        if (allocContainer) allocContainer.classList.toggle('hidden', tabName !== 'allocation');
        if (forecastContainer) forecastContainer.classList.toggle('hidden', tabName !== 'forecast');

        this.loadActiveSimulator();
    }

    async loadActiveSimulator() {
        if (this.activeTab === 'allocation') {
            if (!this.simulators.allocation) {
                this.simulators.allocation = new SimulationAllocation('simulationAllocationContainer');
            }
            // Re-init to refresh data
            await this.simulators.allocation.init();
        } else if (this.activeTab === 'forecast') {
            if (!this.simulators.forecast) {
                this.simulators.forecast = new SimulationLookupStrategyForecast('simulationForecastContainer');
            }
            await this.simulators.forecast.init();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.optimizationApp = new OptimizationApp();
});