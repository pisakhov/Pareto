// Pricing Management JavaScript
document.addEventListener("DOMContentLoaded", function () {

  initializePricingPage();
  loadData();
});

let providers = [];
let items = [];
let providerItems = []; // Provider-Item relationships
let offers = [];
let editingProviderId = null;
let editingItemId = null;
let editingOfferId = null;

function initializePricingPage() {
  // Add subtle fade-in animation to main content
  const mainContent = document.querySelector("main");
  if (mainContent) {
    mainContent.style.opacity = "0";
    mainContent.style.transition = "opacity 0.6s ease-in";

    setTimeout(() => {
      mainContent.style.opacity = "1";
    }, 100);
  }

  // Setup form handlers
  setupProviderForm();
  setupItemForm();
  setupOfferForm();

  // Setup modal close handlers
  setupModalHandlers();
}

function setupProviderForm() {
  const form = document.getElementById("providerForm");
  if (form) {
    form.addEventListener("submit", handleProviderSubmit);
  }
}

function setupItemForm() {
  const form = document.getElementById("itemForm");
  if (form) {
    form.addEventListener("submit", handleItemSubmit);
  }
}

function setupOfferForm() {
  const form = document.getElementById("offerForm");
  if (form) {
    form.addEventListener("submit", handleOfferSubmit);

    // Setup provider select change handler
    const providerSelect = document.getElementById("providerSelect");
    if (providerSelect) {
      providerSelect.addEventListener("change", handleProviderSelectChange);
    }

    // Setup item select change handler
    const itemSelect = document.getElementById("itemSelect");
    if (itemSelect) {
      itemSelect.addEventListener("change", handleItemSelectChange);
    }
  }
}

function setupModalHandlers() {
  // Close modals when clicking outside
  document.addEventListener("click", function (event) {
    if (event.target.id === "providerModal") {
      closeProviderModal();
    }
    if (event.target.id === "itemModal") {
      closeItemModal();
    }
    if (event.target.id === "offerModal") {
      closeOfferModal();
    }
    if (event.target.id === "relationshipModal") {
      closeRelationshipModal();
    }
  });

  // Close modals with Escape key
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeProviderModal();
      closeItemModal();
      closeOfferModal();
      closeRelationshipModal();
    }
  });
}

function handleProviderSelectChange(event) {
  const select = event.target;
  if (select.value === "new") {
    // Show provider modal for creating new provider
    closeOfferModal();
    showProviderModal(() => {
      // After creating provider, reopen offer modal
      setTimeout(() => {
        showOfferModal();
      }, 100);
    });
  }
}

function handleItemSelectChange(event) {
  const select = event.target;
  if (select.value === "new") {
    // Show item modal for creating new item
    closeOfferModal();
    showItemModal(() => {
      // After creating item, reopen offer modal
      setTimeout(() => {
        showOfferModal();
      }, 100);
    });
  }
}

async function loadData() {
  try {
    await Promise.all([
      loadProviders(),
      loadItems(),
      loadProviderItems(),
      loadOffers(),
    ]);
    updateProviderSelect();
    updateItemSelect();
    updateCounts();
  } catch (error) {
    console.error("Error loading data:", error);
    // Only show notification for critical errors, not for network issues
    if (error.message && !error.message.includes("Failed to fetch")) {
      showNotification("Error loading data: " + error.message, "error");
    }
  }
}

async function loadProviders() {
  try {
    const response = await fetch("/api/providers");
    if (!response.ok) throw new Error("Failed to load providers");

    providers = await response.json();
    renderProviders();
  } catch (error) {
    console.error("Error loading providers:", error);
    throw error;
  }
}

async function loadOffers() {
  try {
    const response = await fetch("/api/offers");
    if (!response.ok) throw new Error("Failed to load offers");

    offers = await response.json();
    renderOffers();
    renderAllOffers();
  } catch (error) {
    console.error("Error loading offers:", error);
    throw error;
  }
}

async function loadItems() {
  try {
    const response = await fetch("/api/items");
    if (!response.ok) throw new Error("Failed to load items");

    items = await response.json();
    renderItems();
  } catch (error) {
    console.error("Error loading items:", error);
    throw error;
  }
}

async function loadProviderItems() {
  try {
    const response = await fetch("/api/provider-items");
    if (!response.ok)
      throw new Error("Failed to load provider-item relationships");

    providerItems = await response.json();
    renderRelationshipMatrix();
  } catch (error) {
    console.error("Error loading provider-item relationships:", error);
    throw error;
  }
}

function renderProviders() {
  const tbody = document.getElementById("providersTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (providers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="text-center py-4 text-muted-foreground">No providers found</td></tr>';
    return;
  }

  providers.forEach((provider) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-secondary/50";
    row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">${provider.company_name}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full ${
                  provider.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }">
                    ${provider.status}
                </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <button onclick="editProvider(${provider.provider_id})"
                        class="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                <button onclick="deleteProvider(${provider.provider_id}, this)"
                        class="text-red-600 hover:text-red-800">Delete</button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function renderOffers() {
  const tbody = document.getElementById("offersTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (offers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="text-center py-4 text-muted-foreground">No offers found</td></tr>';
    return;
  }

  // Show only recent offers (first 5) in the compact view
  const recentOffers = offers.slice(0, 5);

  recentOffers.forEach((offer) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-secondary/50";
    row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">${offer.item_name || "Unknown Item"}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">$${offer.price_per_unit.toFixed(2)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <button onclick="editOffer(${offer.offer_id})"
                        class="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                <button onclick="deleteOffer(${offer.offer_id}, this)"
                        class="text-red-600 hover:text-red-800">Delete</button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function renderAllOffers() {
  const tbody = document.getElementById("allOffersTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (offers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center py-4 text-muted-foreground">No offers found</td></tr>';
    return;
  }

  offers.forEach((offer) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-secondary/50";
    row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm">${offer.offer_id}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">${offer.item_name || "Unknown Item"}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">${offer.provider_name || "Unknown Provider"}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">&ge; ${offer.tier_number}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">$${offer.price_per_unit.toFixed(2)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <button onclick="editOffer(${offer.offer_id})"
                        class="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                <button onclick="deleteOffer(${offer.offer_id}, this)"
                        class="text-red-600 hover:text-red-800">Delete</button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function renderItems() {
  const tbody = document.getElementById("itemsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (items.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="text-center py-4 text-muted-foreground">No items found</td></tr>';
    return;
  }

  items.forEach((item) => {
    const providerCount = providerItems.filter(
      (pi) => pi.item_id === item.item_id,
    ).length;
    const offerCount = offers.filter((o) => o.item_id === item.item_id).length;

    const row = document.createElement("tr");
    row.className = "hover:bg-secondary/50";
    row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">${item.item_name}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-2">${providerCount} providers</span>
                <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">${offerCount} offers</span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <button onclick="editItem(${item.item_id})"
                        class="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                <button onclick="deleteItem(${item.item_id}, this)"
                        class="text-red-600 hover:text-red-800">Delete</button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function renderRelationshipMatrix() {
  const matrix = document.getElementById("relationshipMatrix");
  if (!matrix) return;

  if (providers.length === 0 || items.length === 0) {
    matrix.innerHTML =
      '<p class="text-center text-muted-foreground py-8">No data available for relationship matrix</p>';
    return;
  }

  let html =
    '<table class="w-full border-collapse text-sm"><thead><tr><th class="border border-border px-2 py-1 bg-secondary font-medium">Provider \\ Item</th>';

  // Add item headers
  items.forEach((item) => {
    html += `<th class="border border-border px-2 py-1 bg-secondary text-center font-medium" title="${item.description || ""}">${item.item_name}</th>`;
  });
  html += "</tr></thead><tbody>";

  // Add provider rows (only active providers)
  providers.filter(provider => provider.status?.toLowerCase() === "active").forEach((provider) => {
    html += `<tr><td class="border border-border px-2 py-1 bg-secondary font-medium whitespace-nowrap">${provider.company_name}</td>`;

    items.forEach((item) => {
      const hasRelationship = providerItems.some(
        (pi) =>
          pi.provider_id === provider.provider_id &&
          pi.item_id === item.item_id,
      );
      const offerCount = offers.filter(
        (o) =>
          o.provider_id === provider.provider_id && o.item_id === item.item_id,
      ).length;

      html += `<td class="border border-border px-2 py-1 text-center">
                <input type="checkbox"
                    data-provider-id="${provider.provider_id}"
                    data-item-id="${item.item_id}"
                    ${hasRelationship ? "checked" : ""}
                    class="relationship-checkbox">
                ${offerCount > 0 ? `<span class="text-xs text-green-600 ml-1">(${offerCount})</span>` : ""}
            </td>`;
    });

    html += "</tr>";
  });

  html += "</tbody></table>";
  matrix.innerHTML = html;
}

function updateProviderSelect() {
  const select = document.getElementById("providerSelect");
  if (!select) return;

  // Save current value
  const currentValue = select.value;

  // Clear existing options (except the "new" option)
  while (select.options.length > 2) {
    select.remove(1);
  }

  // Add provider options
  providers.forEach((provider) => {
    const option = document.createElement("option");
    option.value = provider.provider_id;
    option.textContent = provider.company_name;
    if (provider.status !== "active") {
      option.textContent += " (inactive)";
    }
    select.appendChild(option);
  });

  // Restore previous value if it still exists
  if (currentValue && currentValue !== "new") {
    select.value = currentValue;
  }
}

function updateItemSelect() {
  const select = document.getElementById("itemSelect");
  if (!select) return;

  // Save current value
  const currentValue = select.value;

  // Clear existing options (except the "new" option)
  while (select.options.length > 2) {
    select.remove(1);
  }

  // Add item options
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.item_id;
    option.textContent = item.item_name;
    if (item.status !== "active") {
      option.textContent += " (inactive)";
    }
    select.appendChild(option);
  });

  // Restore previous value if it still exists
  if (currentValue && currentValue !== "new") {
    select.value = currentValue;
  }
}

function updateCounts() {
  const providerCount = document.getElementById("providerCount");
  const itemCount = document.getElementById("itemCount");
  const offerCount = document.getElementById("offerCount");

  if (providerCount) providerCount.textContent = providers.length;
  if (itemCount) itemCount.textContent = items.length;
  if (offerCount) offerCount.textContent = offers.length;
}

function showProviderModal(callback = null) {
  const modal = document.getElementById("providerModal");
  const form = document.getElementById("providerForm");
  const title = document.getElementById("providerModalTitle");

  if (!modal || !form) return;

  // Reset form
  form.reset();
  editingProviderId = null;
  title.textContent = "Add Provider";

  // Show modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Focus on first input
  setTimeout(() => {
    document.getElementById("companyName")?.focus();
  }, 100);

  // Set callback for after modal closes
  if (callback) {
    window.providerModalCallback = callback;
  }
}

function closeProviderModal() {
  const modal = document.getElementById("providerModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }

  // Execute callback if exists
  if (window.providerModalCallback) {
    window.providerModalCallback();
    window.providerModalCallback = null;
  }
}

function showOfferModal() {
  const modal = document.getElementById("offerModal");
  const form = document.getElementById("offerForm");
  const title = document.getElementById("offerModalTitle");

  if (!modal || !form) return;

  // Reset form
  form.reset();
  editingOfferId = null;
  title.textContent = "Add Offer";

  // Update provider select
  updateProviderSelect();

  // Show modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Focus on first input
  setTimeout(() => {
    document.getElementById("providerSelect")?.focus();
  }, 100);
}

function closeOfferModal() {
  const modal = document.getElementById("offerModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function showItemModal(callback = null) {
  const modal = document.getElementById("itemModal");
  const form = document.getElementById("itemForm");
  const title = document.getElementById("itemModalTitle");

  if (!modal || !form) return;

  // Reset form
  form.reset();
  editingItemId = null;
  const titleTextSpan = title.querySelector('span[id$="TitleText"]');
  if (titleTextSpan) {
    titleTextSpan.textContent = "Add Item";
  } else {
    title.textContent = "Add Item";
  }

  // Show modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Focus on first input
  setTimeout(() => {
    document.getElementById("itemName")?.focus();
  }, 100);

  // Set callback for after modal closes
  if (callback) {
    window.itemModalCallback = callback;
  }
}

function closeItemModal() {
  const modal = document.getElementById("itemModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }

  // Execute callback if exists
  if (window.itemModalCallback) {
    window.itemModalCallback();
    window.itemModalCallback = null;
  }
}

function showRelationshipModal() {
  const modal = document.getElementById("relationshipModal");
  if (!modal) return;

  // Render the relationship matrix inside the modal
  renderRelationshipMatrixModal();

  // Show modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeRelationshipModal() {
  const modal = document.getElementById("relationshipModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function renderRelationshipMatrixModal() {
  const headerRow = document.getElementById("relationshipHeaderRow");
  const tbody = document.getElementById("relationshipTableBody");

  if (!headerRow || !tbody) return;

  // Clear existing content
  headerRow.innerHTML = "";
  tbody.innerHTML = "";

  // Add item headers
  items.forEach((item) => {
    const th = document.createElement("th");
    th.className =
      "border border-border px-4 py-2 text-center text-sm font-medium";
    th.textContent = item.item_name;
    th.title = item.description || "";
    headerRow.appendChild(th);
  });

  // Add provider rows
  providers.forEach((provider) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="border border-border px-4 py-2 font-medium">${provider.company_name}</td>`;

    items.forEach((item) => {
      const hasRelationship = providerItems.some(
        (pi) =>
          pi.provider_id === provider.provider_id &&
          pi.item_id === item.item_id,
      );

      const td = document.createElement("td");
      td.className = "border border-border px-4 py-2 text-center";
      td.innerHTML = `
                <input type="checkbox"
                    data-provider-id="${provider.provider_id}"
                    data-item-id="${item.item_id}"
                    ${hasRelationship ? "checked" : ""}
                    class="relationship-checkbox">
            `;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

async function handleItemSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const data = {
    item_name: formData.get("item_name"),
    description: formData.get("description") || "",
    status: formData.get("status"),
  };

  try {
    let response;
    if (editingItemId) {
      // Update existing item
      response = await fetch(`/api/items/${editingItemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } else {
      // Create new item
      response = await fetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to save item");
    }

    closeItemModal();
    await loadData();
    showNotification(
      editingItemId ? "Item updated successfully" : "Item created successfully",
      "success",
    );
  } catch (error) {
    console.error("Error saving item:", error);
    showNotification(error.message, "error");
  }
}

async function handleProviderSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const data = {
    company_name: formData.get("company_name"),
    details: formData.get("details") || "",
    status: formData.get("status"),
  };

  try {
    let response;
    if (editingProviderId) {
      // Update existing provider
      response = await fetch(`/api/providers/${editingProviderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } else {
      // Create new provider
      response = await fetch("/api/providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to save provider");
    }

    closeProviderModal();
    await loadData();
    showNotification(
      editingProviderId
        ? "Provider updated successfully"
        : "Provider created successfully",
      "success",
    );
  } catch (error) {
    console.error("Error saving provider:", error);
    showNotification(error.message, "error");
  }
}

async function handleOfferSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const data = {
    item_id: parseInt(formData.get("item_id")),
    provider_id: parseInt(formData.get("provider_id")),
    tier_number: parseInt(formData.get("tier_number")),
    price_per_unit: parseFloat(formData.get("price_per_unit")),
    status: formData.get("status"),
  };

  try {
    let response;
    if (editingOfferId) {
      // Update existing offer
      response = await fetch(`/api/offers/${editingOfferId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } else {
      // Create new offer
      response = await fetch("/api/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to save offer");
    }

    closeOfferModal();
    await loadData();
    showNotification(
      editingOfferId
        ? "Offer updated successfully"
        : "Offer created successfully",
      "success",
    );
  } catch (error) {
    console.error("Error saving offer:", error);
    showNotification(error.message, "error");
  }
}

async function editProvider(providerId) {
  try {
    const response = await fetch(`/api/providers/${providerId}`);
    if (!response.ok) throw new Error("Failed to load provider");

    const provider = await response.json();

    // Populate form
    document.getElementById("providerId").value = provider.provider_id;
    document.getElementById("companyName").value = provider.company_name;
    document.getElementById("details").value = provider.details;
    document.getElementById("providerStatus").value = provider.status;

    // Update modal title
    const titleElement = document.getElementById("providerModalTitle");
    const textSpan = titleElement.querySelector('span[id$="TitleText"]');
    if (textSpan) {
      textSpan.textContent = "Edit Provider";
    } else {
      titleElement.textContent = "Edit Provider";
    }

    editingProviderId = providerId;

    // Show modal
    showProviderModal();
  } catch (error) {
    console.error("Error loading provider:", error);
    showNotification("Failed to load provider", "error");
  }
}

async function editOffer(offerId) {
  try {
    const response = await fetch(`/api/offers/${offerId}`);
    if (!response.ok) throw new Error("Failed to load offer");

    const offer = await response.json();

    // Populate form
    document.getElementById("offerId").value = offer.offer_id;
    document.getElementById("itemSelect").value = offer.item_id;
    document.getElementById("providerSelect").value = offer.provider_id;
    document.getElementById("unitRange").value = offer.tier_number;
    document.getElementById("pricePerUnit").value = offer.price_per_unit;
    document.getElementById("offerStatus").value = offer.status;

    // Update modal title
    document.getElementById("offerModalTitle").textContent = "Edit Offer";

    editingOfferId = offerId;

    // Update selects and show modal
    updateItemSelect();
    updateProviderSelect();
    const modal = document.getElementById("offerModal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  } catch (error) {
    console.error("Error loading offer:", error);
    showNotification("Failed to load offer", "error");
  }
}

async function deleteProvider(providerId, button) {
  if (
    !confirm(
      "Are you sure you want to delete this provider? This will also delete all associated offers.",
    )
  ) {
    return;
  }

  // Show loading state
  const deleteButton = button;
  const originalText = deleteButton.textContent;
  deleteButton.textContent = "Deleting...";
  deleteButton.disabled = true;

  try {
    const response = await fetch(`/api/providers/${providerId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to delete provider");
    }

    // Show success notification immediately
    showNotification("Provider deleted successfully", "success");

    // Remove provider from local data immediately to avoid race conditions
    providers = providers.filter((p) => p.provider_id !== providerId);
    renderProviders();
    updateProviderSelect();
    updateCounts();

    // Reload data in background silently
    loadData().catch((loadError) => {
      console.warn("Data reload failed after delete:", loadError);
      // Silently fall back to local data if reload fails
    });
  } catch (error) {
    console.error("Error deleting provider:", error);
    showNotification("Failed to delete provider: " + error.message, "error");
  } finally {
    // Restore button state
    deleteButton.textContent = originalText;
    deleteButton.disabled = false;
  }
}

async function deleteOffer(offerId, button) {
  if (!confirm("Are you sure you want to delete this offer?")) {
    return;
  }

  // Show loading state
  const deleteButton = button;
  const originalText = deleteButton.textContent;
  deleteButton.textContent = "Deleting...";
  deleteButton.disabled = true;

  try {
    const response = await fetch(`/api/offers/${offerId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to delete offer");
    }

    // Show success notification immediately
    showNotification("Offer deleted successfully", "success");

    // Remove offer from local data immediately to avoid race conditions
    offers = offers.filter((o) => o.offer_id !== offerId);
    renderOffers();
    renderAllOffers();
    updateCounts();

    // Reload data in background silently
    loadData().catch((loadError) => {
      console.warn("Data reload failed after delete:", loadError);
      // Silently fall back to local data if reload fails
    });
  } catch (error) {
    console.error("Error deleting offer:", error);
    showNotification("Failed to delete offer: " + error.message, "error");
  } finally {
    // Restore button state
    deleteButton.textContent = originalText;
    deleteButton.disabled = false;
  }
}

function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 transition-all duration-300 transform translate-x-full`;

  // Set color based on type
  const colors = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    warning: "bg-yellow-500 text-white",
    info: "bg-blue-500 text-white",
  };

  notification.className += " " + colors[type];
  notification.textContent = message;

  document.body.appendChild(notification);

  // Show notification
  setTimeout(() => {
    notification.classList.remove("translate-x-full");
  }, 100);

  // Hide notification after 3 seconds
  setTimeout(() => {
    notification.classList.add("translate-x-full");
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Item CRUD functions
async function editItem(itemId) {
  try {
    const response = await fetch(`/api/items/${itemId}`);
    if (!response.ok) throw new Error("Failed to load item");

    const item = await response.json();

    // Populate form
    document.getElementById("itemId").value = item.item_id;
    document.getElementById("itemName").value = item.item_name;
    document.getElementById("itemDescription").value = item.description;
    document.getElementById("itemStatus").value = item.status;

    // Update modal title
    const itemTitleElement = document.getElementById("itemModalTitle");
    const itemTextSpan = itemTitleElement.querySelector('span[id$="TitleText"]');
    if (itemTextSpan) {
      itemTextSpan.textContent = "Edit Item";
    } else {
      itemTitleElement.textContent = "Edit Item";
    }

    editingItemId = itemId;

    // Show modal
    showItemModal();
  } catch (error) {
    console.error("Error loading item:", error);
    showNotification("Failed to load item", "error");
  }
}

async function deleteItem(itemId, button) {
  if (
    !confirm(
      "Are you sure you want to delete this item? This will also delete all associated offers and relationships.",
    )
  ) {
    return;
  }

  // Show loading state
  const deleteButton = button;
  const originalText = deleteButton.textContent;
  deleteButton.textContent = "Deleting...";
  deleteButton.disabled = true;

  try {
    const response = await fetch(`/api/items/${itemId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to delete item");
    }

    // Show success notification immediately
    showNotification("Item deleted successfully", "success");

    // Remove item from local data immediately to avoid race conditions
    items = items.filter((i) => i.item_id !== itemId);
    offers = offers.filter((o) => o.item_id !== itemId);
    providerItems = providerItems.filter((pi) => pi.item_id !== itemId);
    renderItems();
    renderOffers();
    renderAllOffers();
    renderRelationshipMatrix();
    updateItemSelect();
    updateCounts();

    // Reload data in background silently
    loadData().catch((loadError) => {
      console.warn("Data reload failed after delete:", loadError);
      // Silently fall back to local data if reload fails
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    showNotification("Failed to delete item: " + error.message, "error");
  } finally {
    // Restore button state
    deleteButton.textContent = originalText;
    deleteButton.disabled = false;
  }
}

// Relationship management functions
async function saveRelationships() {
  const checkboxes = document.querySelectorAll(".relationship-checkbox");
  const relationships = [];

  checkboxes.forEach((checkbox) => {
    const providerId = parseInt(checkbox.dataset.providerId);
    const itemId = parseInt(checkbox.dataset.itemId);

    if (checkbox.checked) {
      relationships.push({ provider_id: providerId, item_id: itemId });
    }
  });

  try {
    const response = await fetch("/api/provider-items/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ relationships }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to save relationships");
    }

    closeRelationshipModal();
    await loadData();
    showNotification("Relationships saved successfully", "success");
  } catch (error) {
    console.error("Error saving relationships:", error);
    showNotification(error.message, "error");
  }
}
