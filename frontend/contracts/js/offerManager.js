/**
 * OfferManager - Manages provider offers within Item modal
 */
class OfferManager {
  constructor() {
    this.providerOffers = new Map();
    this.container = document.getElementById('providerOffersContainer');
    this.providerSelect = document.getElementById('providerSelect');
    this.addProviderBtn = document.getElementById('addProviderBtn');
    this.addProviderControl = document.getElementById('addProviderControl');
    this.allProvidersAddedMsg = document.getElementById('allProvidersAddedMsg');
    this.validationMsg = document.getElementById('offerValidationMsg');
    this.allProviders = [];
    this.selectedProcessId = null;

    this.setupEventListeners();
  }

  setProcess(processId) {
    this.selectedProcessId = processId;
  }

  setupEventListeners() {
    if (this.addProviderBtn) {
      this.addProviderBtn.addEventListener('click', () => this.handleAddProvider());
    }
  }

  setProviders(providers) {
    this.allProviders = providers;
    this.updateProviderSelect();
  }

  updateProviderSelect() {
    if (!this.providerSelect) return;

    this.providerSelect.innerHTML = '';

    const addedProviderIds = Array.from(this.providerOffers.keys());
    const availableProviders = this.allProviders.filter(
      p => !addedProviderIds.includes(p.provider_id) && p.status === 'active'
    );

    // Show/hide controls based on availability
    if (availableProviders.length === 0) {
      // Hide the select and button, show the completion message
      if (this.addProviderControl) {
        this.addProviderControl.classList.add('hidden');
      }
      if (this.allProvidersAddedMsg) {
        this.allProvidersAddedMsg.classList.remove('hidden');
      }
    } else {
      // Show the select and button, hide the completion message
      if (this.addProviderControl) {
        this.addProviderControl.classList.remove('hidden');
      }
      if (this.allProvidersAddedMsg) {
        this.allProvidersAddedMsg.classList.add('hidden');
      }

      // Populate the select
      availableProviders.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.provider_id;
        option.textContent = provider.company_name;
        this.providerSelect.appendChild(option);
      });
    }
  }

  async handleAddProvider() {
    const providerId = parseInt(this.providerSelect.value);
    if (!providerId) return;

    await this.addProviderOffer(providerId);
    this.providerSelect.value = '';
  }

  async addProviderOffer(providerId) {
    const provider = this.allProviders.find(p => p.provider_id === providerId);
    if (!provider) return;

    // Load tiers specific to the selected process
    let tierData;
    if (this.selectedProcessId) {
      tierData = await this.loadContractTiersForProcess(this.selectedProcessId, providerId);
    } else {
      // Fallback to old method if no process selected
      tierData = await this.loadProviderTiers(providerId);
    }

    this.providerOffers.set(providerId, {
      provider: provider,
      tiers: tierData.tiers,
      prices: new Map()
    });

    this.render();
    this.updateProviderSelect();

    setTimeout(() => {
      const firstInput = this.container.querySelector(`[data-provider="${providerId}"] input[type="number"]`);
      if (firstInput) firstInput.focus();
    }, 100);
  }

  async loadProviderTiers(providerId) {
    const response = await fetch(`/api/providers/${providerId}/tier-thresholds`);
    const data = await response.json();

    const thresholds = data.thresholds || { '1': 0 };
    const tiers = Object.entries(thresholds)
      .map(([tierNum, threshold]) => ({
        index: parseInt(tierNum),
        threshold: threshold,
        label: `Tier ${tierNum}: < ${threshold.toLocaleString()} files`
      }))
      .sort((a, b) => a.index - b.index);

    return { tiers };
  }

  async loadContractTiersForProcess(processId, providerId) {
    const data = await dataService.getContractTiersByProcessAndProvider(processId, providerId);

    const thresholds = data.tier_thresholds || { '1': 0 };
    const tiers = Object.entries(thresholds)
      .map(([tierNum, threshold]) => ({
        index: parseInt(tierNum),
        threshold: threshold,
        label: `Tier ${tierNum}: < ${threshold.toLocaleString()} units`
      }))
      .sort((a, b) => a.index - b.index);

    return { tiers };
  }

  removeProviderOffer(providerId) {
    this.providerOffers.delete(providerId);
    this.render();
    this.updateProviderSelect();
  }

  render() {
    if (!this.container) return;

    if (this.providerOffers.size === 0) {
      this.container.innerHTML = '<p class="text-sm text-muted-foreground text-center py-4 col-span-full">No providers added yet</p>';
      return;
    }

    this.container.innerHTML = '';

    this.providerOffers.forEach((data, providerId) => {
      const providerBlock = document.createElement('div');
      providerBlock.className = 'border border-border rounded-lg p-4 bg-secondary/10 flex flex-col';
      providerBlock.dataset.provider = providerId;

      const header = document.createElement('div');
      header.className = 'flex items-center justify-between mb-3';
      header.innerHTML = `
        <h4 class="font-medium text-foreground">${data.provider.company_name}</h4>
        <button type="button" class="text-red-600 hover:text-red-800 text-sm" onclick="window.offerManager.removeProviderOffer(${providerId})">
          Remove
        </button>
      `;
      providerBlock.appendChild(header);

      const tiersGrid = document.createElement('div');
      tiersGrid.className = 'space-y-2';

      data.tiers.forEach((tier, tierIdx) => {
        const tierRow = document.createElement('div');
        tierRow.className = 'flex items-center gap-2';

        const currentPrice = data.prices.get(tier.index) || '';

        const isFirstTier = tierIdx === 0;
        const applyAllButton = isFirstTier
          ? `<button type="button" onclick="window.offerManager.applyPriceToAllTiers(${providerId})" class="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded whitespace-nowrap">
               Apply All
             </button>`
          : '';

        tierRow.innerHTML = `
          <label class="text-sm w-40">${tier.label}</label>
          <span class="text-sm">$</span>
          <input type="number"
                 step="0.000001"
                 min="0"
                 value="${currentPrice}"
                 data-provider="${providerId}"
                 data-tier="${tier.index}"
                 class="flex-1 px-2 py-1 text-sm border border-input rounded focus:ring-2 focus:ring-ring"
                 placeholder="0.0000"
                 oninput="window.offerManager.updatePrice(${providerId}, ${tier.index}, this.value)">
          ${applyAllButton}
        `;

        tiersGrid.appendChild(tierRow);
      });

      providerBlock.appendChild(tiersGrid);
      this.container.appendChild(providerBlock);
    });
  }

  updatePrice(providerId, tierIndex, value) {
    const data = this.providerOffers.get(providerId);
    if (!data) return;

    if (value && value !== '') {
      data.prices.set(tierIndex, parseFloat(value));
    } else {
      data.prices.delete(tierIndex);
    }

    this.validateAllTiers();
  }

  applyPriceToAllTiers(providerId) {
    const data = this.providerOffers.get(providerId);
    if (!data) return;

    // Get the first tier's price
    const firstTierPrice = data.prices.get(1);

    if (!firstTierPrice || firstTierPrice <= 0) {
      return;
    }

    // Apply to all other tiers
    data.tiers.forEach(tier => {
      if (tier.index !== 1) { // Skip the first tier
        data.prices.set(tier.index, firstTierPrice);
      }
    });

    // Re-render to update the UI
    this.render();
    this.validateAllTiers();
  }

  validateAllTiers() {
    let allFilled = true;

    for (const [providerId, data] of this.providerOffers) {
      for (const tier of data.tiers) {
        if (!data.prices.has(tier.index) || data.prices.get(tier.index) <= 0) {
          allFilled = false;
          break;
        }
      }
      if (!allFilled) break;
    }

    if (this.validationMsg) {
      if (!allFilled && this.providerOffers.size > 0) {
        this.validationMsg.classList.remove('hidden');
      } else {
        this.validationMsg.classList.add('hidden');
      }
    }

    return allFilled;
  }

  getOfferData() {
    const offers = [];

    this.providerOffers.forEach((data, providerId) => {
      data.prices.forEach((price, tierIndex) => {
        offers.push({
          provider_id: providerId,
          tier_number: tierIndex,
          price_per_unit: price,
          status: 'active'
        });
      });
    });

    return offers;
  }

  async populateExistingOffers(itemId) {
    const response = await fetch(`/api/items/${itemId}/providers`);
    if (!response.ok) return;

    const providers = await response.json();

    for (const provider of providers) {
      const offers = await window.dataService.getOffersFiltered(itemId, provider.provider_id);
      if (!offers) continue;

      // Load tiers based on selected process
      let tierData;
      if (this.selectedProcessId) {
        tierData = await this.loadContractTiersForProcess(this.selectedProcessId, provider.provider_id);
      } else {
        tierData = await this.loadProviderTiers(provider.provider_id);
      }

      const pricesMap = new Map();

      offers.forEach(offer => {
        pricesMap.set(offer.tier_number, offer.price_per_unit);
      });

      this.providerOffers.set(provider.provider_id, {
        provider: provider,
        tiers: tierData.tiers,
        prices: pricesMap
      });
    }

    this.render();
    this.updateProviderSelect();
  }

  reset() {
    this.providerOffers.clear();
    if (this.container) {
      this.container.innerHTML = '<p class="text-sm text-muted-foreground text-center py-4 col-span-full">No providers added yet</p>';
    }
    if (this.validationMsg) {
      this.validationMsg.classList.add('hidden');
    }
    if (this.allProvidersAddedMsg) {
      this.allProvidersAddedMsg.classList.add('hidden');
    }
    if (this.addProviderControl) {
      this.addProviderControl.classList.remove('hidden');
    }
    this.updateProviderSelect();
  }
}

window.offerManager = new OfferManager();
