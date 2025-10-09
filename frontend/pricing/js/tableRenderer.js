/**
 * Table Renderer - Handles all rendering operations for tables and matrices
 */
class TableRenderer {
  constructor() {
    this.data = {
      providers: [],
      items: [],
      offers: [],
      providerItems: [],
    };
  }

  // Data setters
  setData(data) {
    this.data = { ...this.data, ...data };
  }

  updateProviders(providers) {
    this.data.providers = providers;
  }

  updateItems(items) {
    this.data.items = items;
  }

  updateOffers(offers) {
    this.data.offers = offers;
  }

  updateProviderItems(providerItems) {
    this.data.providerItems = providerItems;
  }

  // Provider table rendering
  renderProviders() {
    const tbody = document.getElementById("providersTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (this.data.providers.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="text-center py-4 text-muted-foreground">No providers found</td></tr>';
      return;
    }

    this.data.providers.forEach((provider) => {
      const row = this.createProviderRow(provider);
      tbody.appendChild(row);
    });
  }

  createProviderRow(provider) {
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
                <div class="flex items-center space-x-1">
                    <button onclick="window.formHandler.populateProviderForm(${provider.provider_id})" class="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors" title="Edit Provider">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    </button>
                    <button onclick="window.formHandler.deleteProvider(${provider.provider_id}, this)" class="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors" title="Delete Provider">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                </div>
            </td>
        `;
    return row;
  }

  // Item table rendering
  renderItems() {
    const tbody = document.getElementById("itemsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (this.data.items.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="text-center py-4 text-muted-foreground">No items found</td></tr>';
      return;
    }

    this.data.items.forEach((item) => {
      const row = this.createItemRow(item);
      tbody.appendChild(row);
    });
  }

  createItemRow(item) {
    const providerCount = this.data.providerItems.filter(
      (pi) => pi.item_id === item.item_id,
    ).length;
    const offerCount = this.data.offers.filter(
      (o) => o.item_id === item.item_id,
    ).length;

    const row = document.createElement("tr");
    row.className = "hover:bg-secondary/50";
    row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">${item.item_name}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <span class="text-xs text-white bg-[#023047] px-2 py-1 rounded-full mr-2">${providerCount} providers</span>
                <span class="text-xs text-white bg-[#7f4f24] px-2 py-1 rounded-full">${offerCount} offers</span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <div class="flex items-center space-x-1">
                    <button onclick="window.formHandler.populateItemForm(${item.item_id})" class="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors" title="Edit Item">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    </button>
                    <button onclick="window.formHandler.deleteItem(${item.item_id}, this)" class="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors" title="Delete Item">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                </div>
            </td>
        `;
    return row;
  }

  // Offers table rendering
  renderOffers() {
    const tbody = document.getElementById("offersTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (this.data.offers.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="text-center py-4 text-muted-foreground">No offers found</td></tr>';
      return;
    }

    // Show only recent offers (first 5) in the compact view
    const recentOffers = this.data.offers.slice(0, 5);

    recentOffers.forEach((offer) => {
      const row = this.createOfferRow(offer);
      tbody.appendChild(row);
    });
  }

  renderAllOffers() {
    const tbody = document.getElementById("allOffersTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (this.data.offers.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center py-4 text-muted-foreground">No offers found</td></tr>';
      return;
    }

    this.data.offers.forEach((offer) => {
      const row = this.createAllOfferRow(offer);
      tbody.appendChild(row);
    });
  }

  createOfferRow(offer) {
    const row = document.createElement("tr");
    row.className = "hover:bg-secondary/50";
    row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">${offer.item_name || "Unknown Item"}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">$${offer.price_per_unit.toFixed(2)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <div class="flex items-center space-x-1">
                    <button onclick="window.formHandler.populateOfferForm(${offer.offer_id})" class="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors" title="Edit Offer">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    </button>
                    <button onclick="window.formHandler.deleteOffer(${offer.offer_id}, this)" class="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors" title="Delete Offer">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                </div>
            </td>
        `;
    return row;
  }

  createAllOfferRow(offer) {
    const row = document.createElement("tr");
    row.className = "hover:bg-secondary/50";
    row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm">${offer.offer_id}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">${offer.item_name || "Unknown Item"}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">${offer.provider_name || "Unknown Provider"}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">&ge; ${offer.unit_range}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">$${offer.price_per_unit.toFixed(2)}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full ${
                  offer.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }">
                    ${offer.status}
                </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <div class="flex items-center space-x-1">
                    <button onclick="window.formHandler.populateOfferForm(${offer.offer_id})" class="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors" title="Edit Offer">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    </button>
                    <button onclick="window.formHandler.deleteOffer(${offer.offer_id}, this)" class="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors" title="Delete Offer">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                </div>
            </td>
        `;
    return row;
  }

  // Relationship matrix rendering
  renderRelationshipMatrix() {
    const matrix = document.getElementById("relationshipMatrix");
    if (!matrix) return;

    if (this.data.providers.length === 0 || this.data.items.length === 0) {
      matrix.innerHTML =
        '<p class="text-center text-muted-foreground py-8">No data available for relationship matrix</p>';
      return;
    }

    const html = this.createRelationshipMatrixHTML();
    matrix.innerHTML = html;
  }

  createRelationshipMatrixHTML() {
    let html =
      '<div class="overflow-x-auto"><table class="w-full border-collapse text-sm"><thead><tr><th class="border border-border px-2 py-1 bg-secondary font-medium">Item \ Provider</th>';

    // Add provider headers
    this.data.providers.forEach((provider) => {
      html += `<th class="border border-border px-2 py-1 bg-secondary text-center font-medium" title="${provider.company_name || ""}">${provider.company_name}</th>`;
    });
    html += "</tr></thead><tbody>";

    // Add item rows
    this.data.items.forEach((item) => {
      html += `<tr><td class="border border-border px-2 py-1 bg-secondary font-medium whitespace-nowrap">${item.item_name}</td>`;

      this.data.providers.forEach((provider) => {
        const offers = this.data.offers.filter(
          (o) =>
            o.provider_id === provider.provider_id &&
            o.item_id === item.item_id,
        );

        html += `<td class="border border-border px-2 py-1 text-center align-top">`;
        if (offers.length > 0) {
          html += '<ul class="list-none p-0 m-0">';
          offers.forEach((offer) => {
            const inactiveClass =
              offer.status === "inactive" ? "text-gray-400 line-through" : "";
            html += `<li class="text-xs whitespace-nowrap p-1 hover:bg-gray-100 rounded cursor-pointer ${inactiveClass}" onclick="window.formHandler.populateOfferForm(${offer.offer_id})">&ge;${offer.unit_range} - $${offer.price_per_unit.toFixed(2)}</li>`;
          });
          html += "</ul>";
        } else {
          html += "&nbsp;";
        }
        html += `</td>`;
      });

      html += "</tr>";
    });

    html += "</tbody></table></div>";
    return html;
  }

  // Modal relationship matrix rendering
  renderRelationshipMatrixModal() {
    const headerRow = document.getElementById("relationshipHeaderRow");
    const tbody = document.getElementById("relationshipTableBody");

    if (!headerRow || !tbody) return;

    // Clear existing content
    headerRow.innerHTML =
      '<th class="border border-border px-4 py-2 text-left text-sm font-medium">Item \ Provider</th>';
    tbody.innerHTML = "";

    // Add provider headers
    this.data.providers.forEach((provider) => {
      const th = document.createElement("th");
      th.className =
        "border border-border px-4 py-2 text-center text-sm font-medium";
      th.textContent = provider.company_name;
      th.title = provider.company_name || "";
      headerRow.appendChild(th);
    });

    // Add item rows
    this.data.items.forEach((item) => {
      const tr = document.createElement("tr");
      const itemCell = document.createElement("td");
      itemCell.className = "border border-border px-4 py-2 font-medium";
      itemCell.textContent = item.item_name;
      tr.appendChild(itemCell);

      this.data.providers.forEach((provider) => {
        const hasRelationship = this.data.providerItems.some(
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
                        class="relationship-checkbox h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded">
                `;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  // Utility method to render all tables
  renderAll() {
    this.renderProviders();
    this.renderItems();
    this.renderOffers();
    this.renderAllOffers();
    this.renderRelationshipMatrix();
  }
}

// The TableRenderer will be instantiated in the main app
// const tableRenderer = new TableRenderer();
