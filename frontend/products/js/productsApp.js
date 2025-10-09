/**
 * Products App - Main application component that coordinates all other components
 */
class ProductsApp {
    constructor() {
        this.data = {
            products: [],
            items: [],
        };
        this.components = {};
        this.init();
    }

    async init() {
        console.log('Product management page loaded');

        this.initializeComponents();
        this.setupGlobalEventHandlers();
        await this.loadData();
    }

    initializeComponents() {
        this.components.dataService = dataService;
        this.components.modalManager = modalManager;
        this.components.uiManager = uiManager;
        this.components.tableRenderer = new TableRenderer();
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
        window.formHandler = this.components.formHandler;
    }

    setupGlobalEventHandlers() {
        const refreshButton = document.querySelector('button[onclick="loadData()"]');
        if (refreshButton) {
            refreshButton.removeAttribute('onclick');
            refreshButton.addEventListener('click', () => this.loadData());
        }

        const addProductButton = document.querySelector('button[onclick="showProductModal()"]');
        if (addProductButton) {
            addProductButton.removeAttribute('onclick');
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
            console.log('DEBUG: Starting to load data...');
            const [products, items] = await Promise.all([
                this.components.dataService.loadProducts().then(products => {
                    console.log('DEBUG: Products loaded in app:', products);
                    return products;
                }),
                this.components.dataService.loadItems().then(items => {
                    console.log('DEBUG: Items loaded in app:', items);
                    return items;
                }),
            ]);
            this.data.products = products;
            this.data.items = items;

            console.log('DEBUG: Data assigned to app state:', this.data);
            this.renderAll();
            this.updateCounts();
            this.updateSelects();

        } catch (error) {
            console.error('DEBUG: Error loading data:', error);
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

    updateSelects() {
        this.components.uiManager.updateItemSelect(this.data.items);
    }

    async refreshData() {
        await this.loadData();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.productsApp = new ProductsApp();
});
