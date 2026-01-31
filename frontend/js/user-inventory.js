// ===== INVENTORY COMPONENT =====

import { syncStockDisplay } from "./user-utils.js";
import { addToCart } from "./user-cart.js";

let activeCategory = "all";

/**
 * Load inventory from admin data and render cards
 */
export function loadInventoryFromAdmin() {
  const container = document.getElementById("inventoryContainer");
  if (!container) return;

  // Uses getInventory() from inventory_data.js
  const adminInventory =
    typeof getInventory === "function" ? getInventory() : [];

  if (adminInventory.length === 0) {
    container.innerHTML = `
      <div class="loading-inventory" style="grid-column: 1/-1;">
        <div class="loading-spinner"></div>
        <p>No inventory available or loading...</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  adminInventory.forEach((item) => {
    const stockValue =
      localStorage.getItem(`stock_${item.itemKey}`) || item.stock || "0";
    const details =
      JSON.parse(localStorage.getItem(`item_details_${item.itemKey}`)) || {};
    const isOutOfStock = parseInt(stockValue) <= 0;

    const card = document.createElement("div");
    card.className = "inventory-section-card";
    card.setAttribute("data-category", item.category || "equipment");
    card.setAttribute("data-item", item.itemKey);

    // Create a placeholder SVG as data URI
    const placeholderSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23f0f0f0' width='200' height='200'/%3E%3Ctext x='50%25' y='45%25' fill='%23999' font-family='sans-serif' font-size='14' text-anchor='middle'%3ENo Image%3C/text%3E%3Ctext x='50%25' y='55%25' fill='%23999' font-family='sans-serif' font-size='12' text-anchor='middle'%3EAvailable%3C/text%3E%3C/svg%3E`;

    const imageSrc =
      item.image && item.image.trim() ? item.image : placeholderSvg;

    let cabinetDisplay = details.cabinet || item.cabinet || "N/A";
    if (
      typeof cabinetDisplay === "string" &&
      cabinetDisplay.toLowerCase().startsWith("cabinet ")
    ) {
      cabinetDisplay = cabinetDisplay;
    }

    const descText =
      details.description ||
      item.description ||
      "Physics laboratory equipment.";
    const shortDesc =
      descText.length > 80 ? descText.substring(0, 77) + "..." : descText;

    card.innerHTML = `
      <button class="details-info-btn" title="View details" type="button">
        <span>ⓘ</span>
      </button>
      <img class="inventory-image" src="${imageSrc}" alt="${item.name}" onerror="this.onerror=null; this.src='${placeholderSvg}';">
      <div class="inventory-item-text">
        <span class="inventory-item-name">${item.name}</span>
        <p class="inventory-item-description">${shortDesc}</p>
        <div class="inventory-item-cabinet">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect><path d="M8 8h8"/></svg>
          ${cabinetDisplay}
        </div>
        <div class="inventory-item-footer">
          <span class="stock-info">Stock: <span class="stock-display" data-item="${item.itemKey}">${stockValue}</span></span>
          <button class="inventory-button-borrow" data-item="${item.itemKey}" type="button" ${isOutOfStock ? "disabled" : ""}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2v6h6V2M19 2v6h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h2V2h2v6h10V2h2M3 10v10h18V10H3z"/></svg>
            ${isOutOfStock ? "Out of Stock" : "Borrow"}
          </button>
        </div>
      </div>
    `;

    // Store item data for details popup
    card.dataset.itemImage = imageSrc;
    card.dataset.itemDescription =
      details.description ||
      item.description ||
      "Physics laboratory equipment.";
    card.dataset.itemType = details.type || item.type || "General";
    card.dataset.itemUse = details.use || item.use || "Laboratory experiments";
    card.dataset.itemCabinet = cabinetDisplay;

    if (isOutOfStock) {
      card.style.opacity = "0.7";
    }

    container.appendChild(card);
  });

  attachCardListeners();
  filterCards();
}

/**
 * Attach event listeners to inventory cards
 */
function attachCardListeners() {
  document.querySelectorAll(".inventory-section-card").forEach((card) => {
    // Details button
    const detailsBtn = card.querySelector(".details-info-btn");
    if (detailsBtn) {
      detailsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const itemName =
          card.querySelector(".inventory-item-name")?.textContent || "Item";
        const itemImage = card.dataset.itemImage;
        const itemDesc = card.dataset.itemDescription;
        const itemType = card.dataset.itemType;
        const itemUse = card.dataset.itemUse;
        const itemCabinet = card.dataset.itemCabinet;

        showItemDetailsPopup({
          name: itemName,
          image: itemImage,
          description: itemDesc,
          type: itemType,
          use: itemUse,
          cabinet: itemCabinet,
        });
      });
    }

    // Borrow button
    const borrowBtn = card.querySelector(".inventory-button-borrow");
    if (borrowBtn) {
      borrowBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (borrowBtn.disabled) return;

        const itemKey = borrowBtn.getAttribute("data-item");
        const itemName =
          card.querySelector(".inventory-item-name")?.textContent || "Item";
        const itemImage = card.querySelector(".inventory-image")?.src || "";
        const stockEl = card.querySelector(".stock-display");
        let currentStock = stockEl ? parseInt(stockEl.innerText) : 0;

        if (currentStock <= 0) {
          alert("This item is out of stock.");
          return;
        }

        // Update stock
        currentStock -= 1;
        localStorage.setItem(`stock_${itemKey}`, currentStock);
        if (stockEl) stockEl.innerText = currentStock;
        syncStockDisplay();

        // Add to cart
        addToCart({ itemKey, name: itemName, image: itemImage });

        // Animate
        const imgEl = card.querySelector(".inventory-image");
        if (typeof animateAddToBorrow === "function") {
          animateAddToBorrow(itemImage, imgEl);
        }
      });
    }
  });
}

/**
 * Show item details popup
 */
function showItemDetailsPopup(item) {
  const overlay = document.createElement("div");
  overlay.className = "center-popup-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const box = document.createElement("div");
  box.className = "center-popup item-details-popup";
  box.style.maxWidth = "500px";

  box.innerHTML = `
    <button class="close-details-btn" type="button" aria-label="Close">&times;</button>
    <img src="${item.image}" alt="${item.name}" style="width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">
    <h3 class="center-popup-title">${item.name}</h3>
    <div style="text-align: left; margin: 15px 0;">
      <p style="margin-bottom: 10px;"><strong>Description:</strong> ${item.description}</p>
      <p style="margin-bottom: 10px;"><strong>Type:</strong> ${item.type}</p>
      <p style="margin-bottom: 10px;"><strong>Use:</strong> ${item.use}</p>
      <p style="margin-bottom: 10px;"><strong>Cabinet:</strong> ${item.cabinet}</p>
    </div>
    <button class="center-popup-ok" type="button">Close</button>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const closeBtn = box.querySelector(".close-details-btn");
  const okBtn = box.querySelector(".center-popup-ok");

  const closeHandler = () => {
    try {
      document.body.removeChild(overlay);
    } catch (e) {}
  };

  if (closeBtn) closeBtn.addEventListener("click", closeHandler);
  if (okBtn) {
    okBtn.addEventListener("click", closeHandler);
    okBtn.focus();
  }
}

/**
 * Filter cards by search and category
 */
export function filterCards() {
  const searchInput = document.getElementById("userInventorySearch");
  const q = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const cards = document.querySelectorAll(".inventory-section-card");

  cards.forEach((card) => {
    const name = (
      card.querySelector(".inventory-item-name")?.textContent || ""
    ).toLowerCase();
    const key = (card.dataset.item || "").toLowerCase();
    const cat = (card.dataset.category || "").toLowerCase();
    const matchCategory = activeCategory === "all" || cat === activeCategory;
    const matchQuery = !q || name.includes(q) || key.includes(q);
    card.style.display = matchCategory && matchQuery ? "" : "none";
  });
}

/**
 * Initialize inventory component
 */
export function initInventory() {
  const searchInput = document.getElementById("userInventorySearch");
  const filterButtons = document.querySelectorAll(".filter-btn");

  // Filter button handlers
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.dataset.filter || "all";
      filterCards();
    });
  });

  // Search input handler
  if (searchInput) {
    let debounceTimer = null;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(filterCards, 200);
    });
  }

  // Listen for storage changes
  window.addEventListener("storage", (e) => {
    if (
      e.key === "phyLab_AdminInventory" ||
      (e.key && e.key.startsWith("stock_"))
    ) {
      loadInventoryFromAdmin();
    }
  });

  // Load inventory
  loadInventory();
}

/**
 * Load inventory with backend sync
 */
async function loadInventory() {
  if (typeof refreshInventoryFromBackend === "function") {
    try {
      await refreshInventoryFromBackend();
    } catch (e) {
      console.warn("refreshInventoryFromBackend failed", e);
    }
  }
  loadInventoryFromAdmin();
}
