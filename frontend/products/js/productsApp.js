/**
 * Products App - Main application component that coordinates all other components
 */
class ProductsApp {
    constructor() {
        this.data = {
            products: [],
            items: [],
            pricing: {},
        };
        this.components = {};
        this.init();
    }

    async init() {

        this.initializeComponents();
        this.setupGlobalEventHandlers();
        await this.loadData();
    }

    initializeComponents() {
        this.components.dataService = dataService;
        this.components.modalManager = modalManager;
        this.components.uiManager = uiManager;
        this.components.tableRenderer = new TableRenderer();
        this.components.forecastManager = new ForecastManager();
        this.components.formHandler = new FormHandler(
            this.components.dataService,
            this.components.modalManager,
            this.components.uiManager
        );

        window.productsApp = this;
        window.dataService = this.components.dataService;
        window.modalManager = this.components.modalManager;
        window.uiManager = this.components.uiManager;
        window.tableRenderer = this.components.tableRenderer;
        window.forecastManager = this.components.forecastManager;
        window.formHandler = this.components.formHandler;
    }

    setupGlobalEventHandlers() {
        const refreshButton = document.getElementById('refreshButton');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.loadData());
        }

        const addProductButton = document.getElementById('addProductButton');
        if (addProductButton) {
            addProductButton.addEventListener('click', () => this.components.modalManager.showProductModal());
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleFilter());
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => this.handleFilter());
        }

        this.components.modalManager.setupModalHandlers();
        this.components.formHandler.setupForms();
        this.components.forecastManager.setupEventHandlers();
    }

    handleFilter() {
        const searchTerm = document.getElementById('searchInput')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        this.components.tableRenderer.filterProducts(searchTerm, statusFilter);
        this.updateFilteredCount();
    }

    updateFilteredCount() {
        const filteredCount = this.components.tableRenderer.filteredProducts.length;
        const totalCount = this.components.tableRenderer.products.length;
        const countElement = document.getElementById('productCount');
        if (countElement) {
            countElement.textContent = filteredCount === totalCount 
                ? totalCount 
                : `${filteredCount} of ${totalCount}`;
        }
    }

    async loadData() {
        try {
            const [products, items, providers, pricing] = await Promise.all([
                this.components.dataService.loadProducts().then(products => {
                    return products;
                }),
                this.components.dataService.loadItems().then(items => {
                    return items;
                }),
                this.components.dataService.loadProviders().then(providers => {
                    return providers;
                }),
                this.components.dataService.loadProductsPricing(),
            ]);
            this.data.products = products;
            this.data.items = items;
            this.data.providers = providers;
            this.data.pricing = pricing;

            this.renderAll();
            this.updateCounts();
            this.initializeItemManager();

        } catch (error) {
            this.components.uiManager.showNotification('Error loading data: ' + error.message, 'error');
        }
    }

    renderAll() {
        this.components.tableRenderer.setData(this.data);
        this.components.tableRenderer.renderAll();
    }

    updateCounts() {
        this.components.uiManager.updateCounts(this.data.products);
    }

    initializeItemManager() {
        if (window.itemManager) {
            window.itemManager.setItems(this.data.items);
            window.itemManager.setProviders(this.data.providers);
        }
    }

    async refreshData() {
        await this.loadData();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.productsApp = new ProductsApp();
});
