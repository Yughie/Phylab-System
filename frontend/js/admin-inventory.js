// Inventory management functions

// Ensure inventory loaded
function ensureInventoryLoaded() {
  if (typeof refreshInventoryFromBackend === "function") {
    refreshInventoryFromBackend().catch(() => {});
  }
}

// Render the inventory grid
function renderInventoryGrid() {
  const inventory =
    typeof getInventory === "function"
      ? getInventory()
      : JSON.parse(localStorage.getItem("phyLab_AdminInventory") || "[]");
  const grid = document.querySelector(".inventory-grid");
  if (!grid) return;

  grid.innerHTML = "";

  console.debug(
    "renderInventoryGrid: rendering",
    inventory ? inventory.length : 0,
    "items",
  );

  inventory.forEach((item) => {
    const itemKey =
      item.item_key ||
      item.itemKey ||
      String(item.name).toLowerCase().replace(/\s+/g, "_");
    const imgSrc = item.image || "";
    const name = item.name || "";
    const category = item.category || "";
    const cabinet = item.cabinet || "";
    const type = item.type || "";
    const use = item.use || "";
    const description = item.description || "";
    const stock =
      item.stock !== undefined && item.stock !== null ? item.stock : 0;

    const cardHtml = `
    <div class="inventory-card" data-id="${escapeHtml(item.id || "")}" data-category="${escapeHtml(category)}" data-cabinet="${escapeHtml(cabinet)}" data-type="${escapeHtml(type)}" data-use="${escapeHtml(use)}" data-description="${escapeHtml(description)}">
      <button class="delete-item-btn" onclick="confirmDeleteItem('${escapeJs(item.id || "")}', '${escapeJs(name)}')" title="Delete item">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
      </button>
      <img src="${imgSrc || "default.png"}" alt="${name}" class="inventory-img">
      <div class="inventory-details">
        <h3 class="item-name">${name}</h3>
        <div class="stock-control">
          <input type="number" class="stock-input" data-item="${itemKey}" value="${stock}" min="0" onchange="saveStock(this)">
        </div>
      </div>
      <button class="edit-item-btn" onclick="openItemEditModal('${escapeJs(itemKey)}', '${escapeJs(item.id || "")}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        Edit Details
      </button>
    </div>`;

    grid.insertAdjacentHTML("beforeend", cardHtml);
  });

  // After adding cards, initialize stock displays and cabinet data
  loadCabinetFromMemory();
  loadStockFromMemory();
  // move edit buttons into the footer so they stack above stock info
  try {
    if (typeof moveEditButtonsToFooter === "function") {
      moveEditButtonsToFooter();
    } else {
      setTimeout(() => {
        if (typeof moveEditButtonsToFooter === "function")
          moveEditButtonsToFooter();
      }, 200);
    }
  } catch (e) {}
}

// Save all inventory cards to localStorage
function saveInventoryToLocalStorage() {
  const inventoryArray = [];
  document.querySelectorAll(".inventory-card").forEach((card) => {
    const stockInput = card.querySelector(".stock-input");
    const itemKey = stockInput ? stockInput.getAttribute("data-item") : "";
    const nameEl = card.querySelector(".item-name");
    const imgEl = card.querySelector(".inventory-img");

    let imageSrc = "";
    if (imgEl) {
      imageSrc = imgEl.getAttribute("src") || "";
    }

    const savedDetails = JSON.parse(
      localStorage.getItem("item_details_" + itemKey) || "{}",
    );

    inventoryArray.push({
      id: card.getAttribute("data-id") || "",
      item_key: itemKey,
      itemKey: itemKey,
      name: nameEl ? nameEl.textContent.trim() : "",
      image: imageSrc,
      category: card.getAttribute("data-category") || "",
      cabinet: savedDetails.cabinet || card.getAttribute("data-cabinet") || "",
      type: savedDetails.type || card.getAttribute("data-type") || "",
      use: savedDetails.use || card.getAttribute("data-use") || "",
      description:
        savedDetails.description || card.getAttribute("data-description") || "",
      stock: stockInput ? stockInput.value : "0",
    });
  });
  if (typeof saveInventory === "function") {
    saveInventory(inventoryArray);
  }
}

// Move edit buttons into the card's stock-footer and place them above the stock row
function moveEditButtonsToFooter() {
  document.querySelectorAll(".inventory-card").forEach((card) => {
    const btn = card.querySelector(".edit-item-btn, .edit-details-btn");
    if (!btn) return;

    // Ensure footer exists
    let footer = card.querySelector(".stock-footer");
    if (!footer) {
      footer = document.createElement("div");
      footer.className = "stock-footer";
      card.appendChild(footer);
    }

    // If button already inside footer, ensure ordering
    if (btn.closest(".stock-footer")) {
      // move to top of footer
      footer.insertBefore(btn, footer.firstChild);
    } else {
      // insert button as first child of footer
      footer.insertBefore(btn, footer.firstChild);
    }

    // Reset positioning so CSS within footer applies
    btn.style.position = "";
    btn.style.right = "";
    btn.style.bottom = "";
    btn.style.margin = "";
  });
}

// saveStock is defined inline in PhyLab_admin_page.html to avoid duplication.
// Do NOT define it here — it would override the authoritative inline version.

function loadStockFromMemory() {
  document.querySelectorAll(".stock-input").forEach((input) => {
    const itemName = input.getAttribute("data-item");
    if (itemName) {
      const stockKey = "stock_" + itemName;
      const originalKey = "stock_original_" + itemName;

      const savedCurrent = localStorage.getItem(stockKey);
      const savedOriginal = localStorage.getItem(originalKey);

      if (savedCurrent !== null) {
        input.value = savedCurrent;
      } else {
        const defaultVal = input.value || "0";
        localStorage.setItem(stockKey, defaultVal);
        if (!savedOriginal) {
          localStorage.setItem(originalKey, defaultVal);
        }
      }

      if (savedOriginal === null) {
        localStorage.setItem(originalKey, input.value);
      }

      updateStockDisplay(input);
    }
  });
}

function updateStockDisplay(input) {
  const itemName = input.getAttribute("data-item");
  if (!itemName) return;
  const current = localStorage.getItem("stock_" + itemName) || input.value;
  const original =
    localStorage.getItem("stock_original_" + itemName) ||
    input.defaultValue ||
    input.value;

  const card = input.closest(".inventory-card");

  let footer = card.querySelector(".stock-footer");
  if (!footer) {
    footer = document.createElement("div");
    footer.className = "stock-footer";
    card.appendChild(footer);
  }

  // Preserve edit button before wiping footer contents
  const editBtn = footer.querySelector(".edit-item-btn, .edit-details-btn");
  if (editBtn) editBtn.remove();

  footer.innerHTML = `
  <div class="stock-header">
    <div class="stock-current-btm">Current: <strong>${current}</strong></div>
    <div class="stock-original editable" title="Click to edit original stock (confirmation required)">
      Original: <strong>${original}</strong>
    </div>
  </div>`;

  // Re-insert the preserved edit button at the top of the footer
  if (editBtn) footer.insertBefore(editBtn, footer.firstChild);

  const datasetType =
    card && card.dataset && card.dataset.type ? card.dataset.type : "";
  const datasetUse =
    card && card.dataset && card.dataset.use ? card.dataset.use : "";
  const datasetDesc =
    card && card.dataset && card.dataset.description
      ? card.dataset.description
      : "";
  const detailsKey = "item_details_" + itemName;
  const detailsSaved = JSON.parse(localStorage.getItem(detailsKey) || "{}");
  const itemType = detailsSaved.type || datasetType || "";
  const itemUse = detailsSaved.use || datasetUse || "";
  const itemDesc = detailsSaved.description || datasetDesc || "";

  const detailsEl = card.querySelector(".inventory-details");
  const detailsHtml = `
  <div class="details-row">
    <div class="item-type">Type: ${itemType || "—"}</div>
    <div class="item-use">Use: ${itemUse || "—"}</div>
    <div class="item-desc">${itemDesc ? "Description: " + (itemDesc.length > 100 ? itemDesc.slice(0, 100) + "…" : itemDesc) : "Description: —"}</div>
  </div>`;

  if (detailsEl) {
    const existingDetails = detailsEl.querySelector(".details-row");
    if (existingDetails) existingDetails.remove();
    const stockControl = detailsEl.querySelector(".stock-control");
    if (stockControl) {
      stockControl.insertAdjacentHTML("beforebegin", detailsHtml);
    } else {
      detailsEl.insertAdjacentHTML("beforeend", detailsHtml);
    }
  } else {
    const existingDetailsFooter = footer.querySelector(".details-row");
    if (existingDetailsFooter) existingDetailsFooter.remove();
    footer.insertAdjacentHTML("beforeend", detailsHtml);
  }

  const origEl = footer.querySelector(".stock-original.editable");
  if (origEl) {
    origEl.onclick = function (e) {
      e.stopPropagation();
      enableOriginalEdit(itemName, footer);
    };
  }
}

function enableOriginalEdit(itemName, container) {
  const card = container.closest(".inventory-card");
  const stockInput = card ? card.querySelector(".stock-input") : null;
  if (!stockInput) return;
  const originalKey = "stock_original_" + itemName;
  const origValue = localStorage.getItem(originalKey) || stockInput.value;

  // Preserve edit button before wiping container
  const editBtn = container.querySelector(".edit-item-btn, .edit-details-btn");
  if (editBtn) editBtn.remove();

  container.innerHTML = `
  <div class="original-edit-row">
    <input type="number" class="original-edit-input" value="${origValue}" min="0">
    <button class="primary-btn original-save">Save</button>
    <button class="secondary-btn original-cancel">Cancel</button>
  </div>`;

  // Re-insert the preserved edit button
  if (editBtn) container.insertBefore(editBtn, container.firstChild);

  const inputEl = container.querySelector(".original-edit-input");
  container.querySelector(".original-save").onclick = function () {
    const v = inputEl.value;
    if (v === "" || isNaN(parseInt(v))) {
      showNotification("Invalid value", "error");
      return;
    }
    const newVal = String(parseInt(v));

    // Persist to backend using backendFetch, then update localStorage
    (async function () {
      let backendSucceeded = false;
      const itemId = card ? card.getAttribute("data-id") : null;

      if (typeof backendFetch === "function") {
        let result;
        if (itemId) {
          result = await backendFetch(`/api/inventory/${itemId}/set_stock/`, {
            method: "POST",
            body: { stock: parseInt(newVal) },
          });
        } else {
          result = await backendFetch("/api/inventory/set_stock_by_key/", {
            method: "POST",
            body: { item_key: itemName, stock: parseInt(newVal) },
          });
        }
        backendSucceeded = result.ok;
      } else {
        console.error("backendFetch not available");
      }

      localStorage.setItem(originalKey, newVal);
      if (backendSucceeded) {
        showNotification("Original stock updated on server", "approved");
      } else {
        showNotification(
          "Failed to update on server. Saved locally only.",
          "warning",
        );
      }
      updateStockDisplay(stockInput);
      container.classList.remove("original-editing");
    })();
  };
  container.querySelector(".original-cancel").onclick = function () {
    updateStockDisplay(stockInput);
    showNotification("Edit cancelled", "warning");
    container.classList.remove("original-editing");
  };
}

function loadCabinetFromMemory() {
  document.querySelectorAll(".inventory-card").forEach((card) => {
    const stockInput = card.querySelector(".stock-input");
    if (!stockInput) return;
    const itemName = stockInput.getAttribute("data-item");
    const dataCab =
      card && card.dataset && card.dataset.cabinet ? card.dataset.cabinet : "";
    const savedCab = localStorage.getItem("cabinet_" + itemName) || "";

    if (savedCab && !localStorage.getItem("cabinet_original_" + itemName)) {
      localStorage.setItem("cabinet_original_" + itemName, savedCab);
    }

    if (!savedCab && dataCab) {
      localStorage.setItem("cabinet_" + itemName, dataCab);
      localStorage.setItem("cabinet_original_" + itemName, dataCab);
    }
  });
}

// Category filter handlers
function initCategoryFilters() {
  document.querySelectorAll(".category-button").forEach((button) => {
    button.onclick = () => {
      document
        .querySelectorAll(".category-button")
        .forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const filter = button.getAttribute("data-filter");
      document.querySelectorAll(".inventory-card").forEach((card) => {
        if (filter === "all") {
          card.style.display = "";
        } else {
          const category = card.getAttribute("data-category");
          card.style.display = category === filter ? "" : "none";
        }
      });
    };
  });
}

// Inventory search
function initInventorySearch() {
  const input = document.getElementById("inventorySearch");
  if (!input) return;
  let timer = null;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const query = input.value.toLowerCase();
      document.querySelectorAll(".inventory-card").forEach((card) => {
        const nameEl = card.querySelector(".item-name");
        const name = nameEl ? nameEl.textContent.toLowerCase() : "";
        card.style.display = name.includes(query) ? "" : "none";
      });
    }, 180);
  });

  input.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      const firstVisible = document.querySelector(
        '.inventory-card[style="display: ;"], .inventory-card:not([style])',
      );
      if (firstVisible) firstVisible.scrollIntoView({ behavior: "smooth" });
    }
  });
}

// Export inventory to Excel
async function exportInventoryExcel() {
  try {
    const path = "/api/inventory/export_xlsx/";
    // Build candidate URLs using the global API helper (handles prod vs local)
    const urls = [];
    if (window.PHYLAB_API && typeof window.PHYLAB_API === "function") {
      urls.push(window.PHYLAB_API(path));
    } else if (window.PHYLAB_API_BASE) {
      urls.push(window.PHYLAB_API_BASE + path);
    }
    // Relative path as fallback (works when served from same origin)
    urls.push(path);

    const headers = {};
    const token = sessionStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = "Token " + token;
    }

    let res = null;
    for (let u of urls) {
      try {
        res = await fetch(u, { method: "GET", headers, mode: "cors" });
        if (res && res.ok) break;
      } catch (e) {
        // try next
      }
    }
    if (!res || !res.ok) {
      if (typeof showNotification === "function")
        showNotification("Export failed", "error");
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    if (typeof showNotification === "function")
      showNotification("Export started", "success");
  } catch (e) {
    if (typeof showNotification === "function")
      showNotification("Export failed", "error");
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", function () {
  if (typeof refreshInventoryFromBackend === "function") {
    refreshInventoryFromBackend().catch(() => {});
  }
  renderInventoryGrid();
  loadStockFromMemory();
  loadDashboardStats();
  loadDashboardBorrowers();
  if (typeof initLiveChart === "function") initLiveChart();
  loadCabinetFromMemory();
  initCategoryFilters();
  initInventorySearch();

  const exportBtn = document.getElementById("exportExcelBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportInventoryExcel);

  // Close button handlers
  document.querySelectorAll(".close-btn, .close-details-btn").forEach((btn) => {
    btn.onclick = function () {
      document.getElementById("Borrowing-Details-window").style.display =
        "none";
    };
  });

  document
    .querySelectorAll(".Borrowing-Details-modal .secondary-btn")
    .forEach((btn) => {
      btn.onclick = function () {
        document.getElementById("Borrowing-Details-window").style.display =
          "none";
      };
    });
});
