/**
 * Optimization App - Main application orchestrator
 */
class OptimizationApp {
  constructor() {
    this.dataService = apiDataService;
    this.selectorManager = new SelectorManager(this.dataService);
    this.form = new OptimizationForm();
    this.renderer = new ResultsRenderer();
    
    this.currentSelection = null;
    
    this.initialize();
  }

  initialize() {
    this.selectorManager.onChange((selection) => {
      this.currentSelection = selection;
      this.updateFormState();
    });

    this.form.onSubmit((formData) => {
      this.runOptimization(formData);
    });

    this.renderer.showEmpty();
  }

  updateFormState() {
    const isSelectionComplete = this.selectorManager.isSelectionComplete();
    this.form.setEnabled(isSelectionComplete);
    
    if (!isSelectionComplete) {
      this.renderer.showEmpty();
    }
  }

  async runOptimization(formData) {
    if (!this.currentSelection || !this.currentSelection.itemId) {
      alert('Please select both a product and an item.');
      return;
    }

    this.renderer.showLoading();
    this.form.setEnabled(false);

    try {
      const results = await this.dataService.calculateOptimization(
        this.currentSelection.itemId,
        formData.quantity
      );
      
      if (!results || !results.offers || results.offers.length === 0) {
        const message = results?.message || 'No pricing offers found for the selected item and quantity.';
        alert(message);
        this.renderer.showEmpty();
        return;
      }

      // Transform backend response to match renderer expectations
      const transformedOffers = results.offers.map(offer => ({
        ...offer,
        provider: {
          provider_id: offer.provider_id,
          company_name: offer.provider_name
        },
        totalCost: offer.total_cost
      }));

      const bestOffer = transformedOffers.find(o => o.is_optimal);

      const transformedResults = {
        offers: transformedOffers,
        bestOffer: bestOffer,
        summary: {
          bestOffer: bestOffer,
          worstCost: results.summary.worst_total_cost,
          averageCost: results.summary.average_cost,
          totalProviders: results.summary.total_providers,
          maxSavings: results.summary.max_savings
        },
        parameters: formData,
        selection: this.currentSelection
      };

      this.renderer.showResults(transformedResults);
    } catch (error) {
      console.error('Optimization failed:', error);
      alert(`Optimization failed: ${error.message}`);
      this.renderer.showEmpty();
    } finally {
      this.form.setEnabled(true);
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('Pareto Pricing Optimization loaded');
  const app = new OptimizationApp();
});
