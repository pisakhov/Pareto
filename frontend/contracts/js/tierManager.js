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

  addTierRow(tierNumber = null, threshold = 0) {
    const container = document.getElementById("contractTiersContainer");
    if (!container) {
      console.warn("contractTiersContainer not found, skipping addTierRow");
      return;
    }

    const actualTierNumber = tierNumber || this.tierCount + 1;
    const rowId = `tier-row-${actualTierNumber}`;

    const row = document.createElement("div");
    row.id = rowId;
    row.className =
      "flex items-center gap-2 p-2 border border-border rounded bg-secondary/20";

    row.innerHTML = `
            <span class="text-sm font-medium w-16">Tier ${actualTierNumber}:</span>
            <span class="text-xs">&lt;</span>
            <input type="number"
                   data-tier="${actualTierNumber}"
                   class="tier-threshold w-32 px-2 py-1 text-sm border border-input rounded"
                   value="${threshold}"
                   min="0"
                   placeholder="0">
            <span class="text-xs text-muted-foreground">units</span>
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

  loadTiers(tierData) {
    this.clearTiers();

    const thresholds = tierData || {};

    if (!thresholds || Object.keys(thresholds).length === 0) {
      this.addTierRow(1, 0);
      return;
    }

    const sortedTiers = Object.entries(thresholds).sort(
      ([a], [b]) => parseInt(a) - parseInt(b),
    );

    sortedTiers.forEach(([tierNum, threshold]) => {
      this.addTierRow(parseInt(tierNum), threshold);
    });
  }

  clearTiers() {
    const container = document.getElementById("contractTiersContainer");
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
}

window.tierManager = new TierManager();
