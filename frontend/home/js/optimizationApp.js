/**
 * Optimization App - Orchestrates the simulation dashboards
 */
class OptimizationApp {
    constructor() {
        this.activeTab = 'allocation'; // 'allocation' or 'forecast'
        this.simulators = {
            allocation: null,
            forecast: null
        };
        this.init();
    }

    init() {
        this.setupTabs();
        this.loadActiveSimulator();
    }

    setupTabs() {
        const tabs = document.querySelectorAll('[data-tab]');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.tab;
                this.switchTab(target);
            });
        });
    }

    switchTab(tabName) {
        if (this.activeTab === tabName) return;
        
        // Update UI
        document.querySelectorAll('[data-tab]').forEach(t => {
            if (t.dataset.tab === tabName) {
                t.classList.add('border-slate-800', 'text-slate-900');
                t.classList.remove('border-transparent', 'text-slate-500', 'hover:text-slate-700', 'hover:border-slate-300');
            } else {
                t.classList.remove('border-slate-800', 'text-slate-900');
                t.classList.add('border-transparent', 'text-slate-500', 'hover:text-slate-700', 'hover:border-slate-300');
            }
        });

        document.getElementById('simulationAllocationContainer').classList.toggle('hidden', tabName !== 'allocation');
        document.getElementById('simulationForecastContainer').classList.toggle('hidden', tabName !== 'forecast');

        this.activeTab = tabName;
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