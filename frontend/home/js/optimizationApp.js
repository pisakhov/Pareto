/**
 * Optimization App - Orchestrates the simulation dashboards
 */
class OptimizationApp {
    constructor() {
        this.activeTab = null;
        this.simulators = {
            allocation: null,
            forecast: null,
            pareto_agent: null
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
        const initialTab = params.get('view') === 'forecast' ? 'forecast' : (params.get('view') === 'pareto_agent' ? 'pareto_agent' : 'allocation');
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
            
            // Clean URL: Remove processId when in Pareto Agent view
            if (tabName === 'pareto_agent') {
                url.searchParams.delete('processId');
            }
            
            window.history.pushState({}, '', url);
        }

        // Update UI Tabs
        document.querySelectorAll('[data-tab]').forEach(t => {
            const isActive = t.dataset.tab === tabName;
            const icon = t.querySelector('svg');

            if (isActive) {
                // Active State: White bg, shadow, black text
                t.classList.add('bg-white', 'text-zinc-900', 'shadow-sm');
                t.classList.remove('text-zinc-500', 'hover:text-zinc-900');
                
                if (icon) {
                    icon.classList.remove('text-zinc-400', 'group-hover:text-zinc-900');
                    icon.classList.add('text-zinc-900');
                }
            } else {
                // Inactive State: Transparent bg, gray text
                t.classList.remove('bg-white', 'text-zinc-900', 'shadow-sm');
                t.classList.add('text-zinc-500', 'hover:text-zinc-900');
                
                if (icon) {
                    icon.classList.remove('text-zinc-900');
                    icon.classList.add('text-zinc-400', 'group-hover:text-zinc-900');
                }
            }
        });

        // Toggle Content
        const allocContainer = document.getElementById('simulationAllocationContainer');
        const forecastContainer = document.getElementById('simulationForecastContainer');
        const paretoAgentContainer = document.getElementById('paretoAgentContainer');

        if (allocContainer) allocContainer.classList.toggle('hidden', tabName !== 'allocation');
        if (forecastContainer) forecastContainer.classList.toggle('hidden', tabName !== 'forecast');
        if (paretoAgentContainer) paretoAgentContainer.classList.toggle('hidden', tabName !== 'pareto_agent');

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
        } else if (this.activeTab === 'pareto_agent') {
            if (!this.simulators.pareto_agent) {
                this.simulators.pareto_agent = new ParetoAgent('paretoAgentContainer');
            }
            await this.simulators.pareto_agent.init();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.optimizationApp = new OptimizationApp();
});