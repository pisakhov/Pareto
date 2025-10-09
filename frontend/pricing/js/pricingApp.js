/**
 * Pricing App - Main application component that coordinates all other components
 */
class PricingApp {
    constructor() {
        this.data = {
            providers: [],
            items: [],
            offers: [],
            providerItems: []
        };
        this.components = {};
        this.init();
    }

    async init() {
        console.log('Pricing management page loaded');

        // Initialize components
        this.initializeComponents();

        // Setup global event handlers
        this.setupGlobalEventHandlers();

        // Load initial data
        await this.loadData();

        // Setup modal relationships
        this.setupModalRelationships();
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
        window.pricingApp = this;
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

        // Setup relationship modal rendering
        this.setupRelationshipModal();
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

        // Offer button
        const offerButton = document.querySelector('button[onclick="showOfferModal()"]');
        if (offerButton) {
            offerButton.removeAttribute('onclick');
            offerButton.addEventListener('click', () => this.showOfferModal());
        }

        // Relationship button
        const relationshipButton = document.querySelector('button[onclick="showRelationshipModal()"]');
        if (relationshipButton) {
            relationshipButton.removeAttribute('onclick');
            relationshipButton.addEventListener('click', () => this.showRelationshipModal());
        }

        // Relationship modal save button
        const saveRelationshipsButton = document.querySelector('button[onclick="saveRelationships()"]');
        if (saveRelationshipsButton) {
            saveRelationshipsButton.removeAttribute('onclick');
            saveRelationshipsButton.addEventListener('click', () => this.components.formHandler.saveRelationships());
        }
    }

    setupRelationshipModal() {
        const relationshipButton = document.querySelector('button[onclick="showRelationshipModal()"]');
        if (relationshipButton) {
            relationshipButton.addEventListener('click', () => {
                this.components.tableRenderer.renderRelationshipMatrixModal();
                this.components.modalManager.showRelationshipModal();
            });
        }
    }

    setupModalRelationships() {
        // Setup provider select change handler to update selects
        const providerSelect = document.getElementById('providerSelect');
        if (providerSelect) {
            providerSelect.addEventListener('change', () => {
                this.updateSelects();
            });
        }

        // Setup item select change handler to update selects
        const itemSelect = document.getElementById('itemSelect');
        if (itemSelect) {
            itemSelect.addEventListener('change', () => {
                this.updateSelects();
            });
        }
    }

    // Data loading
    async loadData() {
        try {
            await Promise.all([
                this.loadProviders(),
                this.loadItems(),
                this.loadProviderItems(),
                this.loadOffers()
            ]);

            this.updateSelects();
            this.updateCounts();
            this.renderAll();
        } catch (error) {
            console.error('Error loading data:', error);
            // Only show notification for critical errors, not for network issues
            if (error.message && !error.message.includes('Failed to fetch')) {
                this.components.uiManager.showNotification('Error loading data: ' + error.message, 'error');
            }
        }
    }

    async loadProviders() {
        try {
            this.data.providers = await this.components.dataService.loadProviders();
            this.components.tableRenderer.updateProviders(this.data.providers);
        } catch (error) {
            console.error('Error loading providers:', error);
            throw error;
        }
    }

    async loadItems() {
        try {
            this.data.items = await this.components.dataService.loadItems();
            this.components.tableRenderer.updateItems(this.data.items);
        } catch (error) {
            console.error('Error loading items:', error);
            throw error;
        }
    }

    async loadOffers() {
        try {
            this.data.offers = await this.components.dataService.loadOffers();
            this.components.tableRenderer.updateOffers(this.data.offers);
        } catch (error) {
            console.error('Error loading offers:', error);
            throw error;
        }
    }

    async loadProviderItems() {
        try {
            this.data.providerItems = await this.components.dataService.loadProviderItems();
            this.components.tableRenderer.updateProviderItems(this.data.providerItems);
        } catch (error) {
            console.error('Error loading provider-item relationships:', error);
            throw error;
        }
    }

    // UI updates
    updateSelects() {
        this.components.uiManager.updateProviderSelect(this.data.providers);
        this.components.uiManager.updateItemSelect(this.data.items);
    }

    updateCounts() {
        this.components.uiManager.updateCounts(
            this.data.providers,
            this.data.items,
            this.data.offers
        );
    }

    renderAll() {
        this.components.tableRenderer.setData(this.data);
        this.components.tableRenderer.renderAll();
    }

    // Modal operations
    showOfferModal() {
        this.updateSelects();
        this.components.modalManager.showOfferModal();
    }

    showRelationshipModal() {
        this.components.tableRenderer.renderRelationshipMatrixModal();
        this.components.modalManager.showRelationshipModal();
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

    // Component access
    getComponent(name) {
        return this.components[name];
    }

    // Cleanup method
    destroy() {
        // Remove global references
        delete window.pricingApp;
        delete window.dataService;
        delete window.modalManager;
        delete window.uiManager;
        delete window.tableRenderer;
        delete window.formHandler;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.pricingApp = new PricingApp();
});