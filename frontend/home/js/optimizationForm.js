/**
 * Optimization Form - Handles form validation and submission
 */
class OptimizationForm {
  constructor() {
    this.form = document.getElementById('optimizationForm');
    this.quantityInput = document.getElementById('quantity');
    this.submitBtn = document.getElementById('runOptimizationBtn');
    
    this.quantityError = document.getElementById('quantityError');
    
    this.submitCallbacks = [];
    
    this.initialize();
  }

  initialize() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    this.quantityInput.addEventListener('input', () => this.clearError('quantity'));
  }

  handleSubmit() {
    if (!this.validateForm()) {
      return;
    }

    const formData = this.getFormData();
    this.notifySubmit(formData);
  }

  validateForm() {
    const quantity = parseFloat(this.quantityInput.value);
    if (!quantity || quantity <= 0) {
      this.showError('quantity', 'Quantity is required and must be greater than 0');
      return false;
    }
    return true;
  }

  showError(fieldName, message) {
    const errorElement = document.getElementById(`${fieldName}Error`);
    const inputElement = document.getElementById(fieldName);
    
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
    }
    
    if (inputElement) {
      inputElement.classList.add('border-red-500');
    }
  }

  clearError(fieldName) {
    const errorElement = document.getElementById(`${fieldName}Error`);
    const inputElement = document.getElementById(fieldName);
    
    if (errorElement) {
      errorElement.classList.add('hidden');
    }
    
    if (inputElement) {
      inputElement.classList.remove('border-red-500');
    }
  }

  getFormData() {
    return {
      quantity: parseFloat(this.quantityInput.value)
    };
  }

  onSubmit(callback) {
    this.submitCallbacks.push(callback);
  }

  notifySubmit(formData) {
    this.submitCallbacks.forEach(callback => callback(formData));
  }

  setEnabled(enabled) {
    this.submitBtn.disabled = !enabled;
  }

  reset() {
    this.form.reset();
    this.clearError('quantity');
  }
}
