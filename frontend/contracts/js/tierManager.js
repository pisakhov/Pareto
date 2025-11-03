/**
 * TierManager - Handles tier threshold UI and logic
 */
class TierManager {
  constructor() {
    this.tierCount = 0;
    this.setupEventListeners();
  }

  setupEventListeners() {
    const addTierBtn = document.getElementById("addTierBtn");
    if (addTierBtn) {
      addTierBtn.addEventListener("click", () => this.addTierRow());
    }
  }

  addTierRow(tierNumber = null, threshold = 0, basePrice = 0) {
    const container = document.getElementById("tierThresholdsContainer");
    if (!container) return;

    const actualTierNumber = tierNumber || this.tierCount + 1;
    const rowId = `tier-row-${actualTierNumber}`;

    const row = document.createElement("div");
    row.id = rowId;
    row.className =
      "flex items-center gap-2 p-2 border border-border rounded bg-secondary/20";

    const applyAllButton = actualTierNumber === 1
      ? `<button type="button" onclick="window.tierManager.applyPriceToAllTiers()" class="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded ml-2">
           Apply All
         </button>`
      : '';

    row.innerHTML = `
            <span class="text-sm font-medium w-16">Tier ${actualTierNumber}:</span>
            <span class="text-xs">&lt;</span>
            <input type="number"
                   data-tier="${actualTierNumber}"
                   class="tier-threshold w-24 px-2 py-1 text-sm border border-input rounded"
                   value="${threshold}"
                   min="0"
                   placeholder="0">
            <span class="text-xs text-muted-foreground">files</span>
            <span class="text-xs ml-2">Base $</span>
            <input type="number"
                   data-tier="${actualTierNumber}"
                   class="tier-base-price w-20 px-2 py-1 text-sm border border-input rounded"
                   value="${basePrice}"
                   min="0"
                   step="0.01"
                   placeholder="0.00">
            ${applyAllButton}
            ${
              actualTierNumber > 1
                ? `<button type="button" onclick="window.tierManager.removeTierRow(${actualTierNumber})" class="text-red-600 hover:text-red-800 ml-auto">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>`
                : '<span class="w-6"></span>'
            }
        `;

    container.appendChild(row);
    this.tierCount = Math.max(this.tierCount, actualTierNumber);
  }

  removeTierRow(tierNumber) {
    const row = document.getElementById(`tier-row-${tierNumber}`);
    if (row) {
      row.remove();
    }
  }

  applyPriceToAllTiers() {
    // Get the first tier's price input
    const firstPriceInput = document.querySelector('.tier-base-price');
    if (!firstPriceInput) return;

    const priceValue = firstPriceInput.value;

    // If no value, don't apply anything
    if (!priceValue || priceValue === '') {
      return;
    }

    // Get all tier price inputs
    const allPriceInputs = document.querySelectorAll('.tier-base-price');

    // Apply the first tier's price to all other tiers
    allPriceInputs.forEach((input, index) => {
      if (index > 0) { // Skip the first input
        input.value = priceValue;
      }
    });
  }

  loadTiers(tierData) {
    this.clearTiers();

    const thresholds = tierData.thresholds || tierData || {};
    const basePrices = tierData.base_prices || {};

    if (!thresholds || Object.keys(thresholds).length === 0) {
      this.addTierRow(1, 0, 0);
      return;
    }

    const sortedTiers = Object.entries(thresholds).sort(
      ([a], [b]) => parseInt(a) - parseInt(b),
    );

    sortedTiers.forEach(([tierNum, threshold]) => {
      const basePrice = basePrices[tierNum] || 0;
      this.addTierRow(parseInt(tierNum), threshold, basePrice);
    });
  }

  clearTiers() {
    const container = document.getElementById("tierThresholdsContainer");
    if (container) {
      container.innerHTML = "";
      this.tierCount = 0;
    }
  }

  getTierThresholds() {
    const thresholds = {};
    const thresholdInputs = document.querySelectorAll(".tier-threshold");

    thresholdInputs.forEach((input) => {
      const tierNumber = input.dataset.tier;
      const value = parseInt(input.value) || 0;
      thresholds[tierNumber] = value;
    });

    return thresholds;
  }

  getTierBasePrices() {
    const basePrices = {};
    const basePriceInputs = document.querySelectorAll(".tier-base-price");

    basePriceInputs.forEach((input) => {
      const tierNumber = input.dataset.tier;
      const value = parseFloat(input.value) || 0;
      if (value > 0) {
        basePrices[tierNumber] = value;
      }
    });

    return basePrices;
  }

  populateTierSelect(providerId) {
    const tierSelect = document.getElementById("tierSelect");
    if (!tierSelect) return;

    tierSelect.innerHTML = '<option value="">Select a tier</option>';

    if (!providerId) {
      tierSelect.disabled = true;
      return;
    }

    const provider = window.contractsApp
      .getProviders()
      .find((p) => p.provider_id === parseInt(providerId));
    if (!provider) {
      tierSelect.disabled = true;
      return;
    }

    fetch(`/api/providers/${providerId}/tier-thresholds`)
      .then((response) => response.json())
      .then((data) => {
        const thresholds = data.thresholds || { "1": 0 };
        const sortedTiers = Object.keys(thresholds)
          .map((t) => parseInt(t))
          .sort((a, b) => a - b);

        sortedTiers.forEach((tierNum) => {
          const threshold = thresholds[tierNum];
          const option = document.createElement("option");
          option.value = tierNum;
          option.textContent = `Tier ${tierNum} (< ${threshold.toLocaleString()} files)`;
          tierSelect.appendChild(option);
        });

        tierSelect.disabled = false;
      })
      .catch((error) => {
        console.error("Error loading tier thresholds:", error);
        tierSelect.disabled = true;
      });
  }
}

window.tierManager = new TierManager();
