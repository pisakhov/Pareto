/**
 * Contracts App - Main application component that coordinates all other components
 */
class ContractsApp {
    constructor() {
        this.data = {
            providers: [],
            items: [],
            offers: [],
            providerItems: [],
            processes: []
        };
        this.components = {};
        this.init();
    }

    async init() {

        // Initialize components
        this.initializeComponents();

        // Setup global event handlers
        this.setupGlobalEventHandlers();

        // Setup error handler
        this.setupErrorHandler();

        // Load initial data
        await this.loadData();

        // Setup modal relationships
        this.setupModalRelationships();
    }

    setupModalRelationships() {
        // Setup any relationships between modals and data
        // This is a placeholder for future modal relationship logic
        if (this.components.modalManager) {
            // Any additional modal setup can go here
        }
    }

    setupErrorHandler() {
        window.addEventListener('apiError', (event) => {
            if (this.components.uiManager) {
                this.components.uiManager.showNotification(event.detail, "error");
            }
        });
    }

    initializeComponents() {
        // Initialize all components
        this.components.dataService = dataService;
        this.components.modalManager = modalManager;
        this.components.uiManager = uiManager;
        this.components.tableRenderer = new TableRenderer();
        this.components.formHandler = new FormHandler(
            this.components.dataService,
            this.components.modalManager,
            this.components.uiManager
        );

        // Make components globally accessible for onclick handlers
        window.contractsApp = this;
        window.dataService = this.components.dataService;
        window.modalManager = this.components.modalManager;
        window.uiManager = this.components.uiManager;
        window.tableRenderer = this.components.tableRenderer;
        window.formHandler = this.components.formHandler;
    }

    setupGlobalEventHandlers() {
        // Setup refresh button
        const refreshButton = document.querySelector('button[onclick="loadData()"]');
        if (refreshButton) {
            refreshButton.removeAttribute('onclick');
            refreshButton.addEventListener('click', () => this.loadData());
        }

        // Setup action buttons
        this.setupActionButtons();
    }

    setupActionButtons() {
        // Provider button
        const providerButton = document.querySelector('button[onclick="showProviderModal()"]');
        if (providerButton) {
            providerButton.removeAttribute('onclick');
            providerButton.addEventListener('click', () => this.components.modalManager.showProviderModal());
        }

        // Item button
        const itemButton = document.querySelector('button[onclick="showItemModal()"]');
        if (itemButton) {
            itemButton.removeAttribute('onclick');
            itemButton.addEventListener('click', () => this.components.modalManager.showItemModal());
        }
    }

    // Data loading
    async loadData() {
        await Promise.all([
            this.loadProviders(),
            this.loadItems(),
            this.loadProviderItems(),
            this.loadOffers(),
            this.loadProcesses()
        ]);

        this.updateCounts();
        await this.renderAll();
    }

    async loadProviders() {
        this.data.providers = await this.components.dataService.loadProviders();
        this.components.tableRenderer.updateProviders(this.data.providers);
    }

    async loadItems() {
        this.data.items = await this.components.dataService.loadItems();
        this.components.tableRenderer.updateItems(this.data.items);
    }

    async loadOffers() {
        this.data.offers = await this.components.dataService.loadOffers();
        this.components.tableRenderer.updateOffers(this.data.offers);
    }

    async loadProviderItems() {
        this.data.providerItems = await this.components.dataService.loadProviderItems();
        this.components.tableRenderer.updateProviderItems(this.data.providerItems);
    }

    async loadProcesses() {
        this.data.processes = await this.components.dataService.loadProcesses();
    }


    updateCounts() {
        this.components.uiManager.updateCounts(
            this.data.providers,
            this.data.items
        );
    }

    async renderAll() {
        this.components.tableRenderer.setData(this.data);
        await this.components.tableRenderer.renderAll();
    }

    // Data update methods (called by form handler after successful operations)
    async refreshData() {
        await this.loadData();
    }

    // Getters for data
    getProviders() {
        return this.data.providers;
    }

    getItems() {
        return this.data.items;
    }

    getOffers() {
        return this.data.offers;
    }

    getProviderItems() {
        return this.data.providerItems;
    }

    getProcesses() {
        return this.data.processes;
    }

    getComponent(name) {
        return this.components[name];
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.contractsApp = new ContractsApp();
});