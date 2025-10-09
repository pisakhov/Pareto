/**
 * Selector Manager - Manages product and item dropdown population and filtering
 */
class SelectorManager {
  constructor(dataService) {
    this.dataService = dataService;
    this.productSelect = document.getElementById('productSelect');
    this.itemSelect = document.getElementById('itemSelect');
    this.selectedProductId = null;
    this.selectedItemId = null;
    this.changeCallbacks = [];
    
    this.initialize();
  }

  initialize() {
    this.loadProducts();
    this.attachEventListeners();
  }

  attachEventListeners() {
    this.productSelect.addEventListener('change', (e) => {
      this.selectedProductId = e.target.value;
      this.onProductChange();
    });

    this.itemSelect.addEventListener('change', (e) => {
      this.selectedItemId = e.target.value;
      this.onItemChange();
    });
  }

  async loadProducts() {
    try {
      const products = await this.dataService.getProducts();
      this.productSelect.innerHTML = '<option value="">-- Select a Product --</option>';
      
      products.forEach(product => {
        if (product.status === 'active') {
          const option = document.createElement('option');
          option.value = product.product_id;
          option.textContent = product.name;
          this.productSelect.appendChild(option);
        }
      });
    } catch (error) {
      console.error('Failed to load products:', error);
      alert('Failed to load products. Please refresh the page.');
    }
  }

  async onProductChange() {
    if (!this.selectedProductId) {
      this.itemSelect.disabled = true;
      this.itemSelect.innerHTML = '<option value="">-- Select an Item --</option>';
      this.selectedItemId = null;
      this.notifyChange();
      return;
    }

    try {
      const items = await this.dataService.getItemsByProduct(this.selectedProductId);
      this.itemSelect.innerHTML = '<option value="">-- Select an Item --</option>';
      
      items.forEach(item => {
        if (item.status === 'active') {
          const option = document.createElement('option');
          option.value = item.item_id;
          option.textContent = item.item_name;
          this.itemSelect.appendChild(option);
        }
      });

      this.itemSelect.disabled = false;
      this.selectedItemId = null;
      this.notifyChange();
    } catch (error) {
      console.error('Failed to load items:', error);
      alert('Failed to load items for this product.');
      this.itemSelect.disabled = true;
    }
  }

  onItemChange() {
    this.notifyChange();
  }

  getSelection() {
    return {
      productId: this.selectedProductId,
      itemId: this.selectedItemId,
      product: this.selectedProductId ? this.dataService.getProduct(this.selectedProductId) : null,
      item: this.selectedItemId ? this.dataService.getItem(this.selectedItemId) : null
    };
  }

  onChange(callback) {
    this.changeCallbacks.push(callback);
  }

  notifyChange() {
    const selection = this.getSelection();
    this.changeCallbacks.forEach(callback => callback(selection));
  }

  isSelectionComplete() {
    return !!(this.selectedProductId && this.selectedItemId);
  }
}
