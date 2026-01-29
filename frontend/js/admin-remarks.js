// Admin remark system and item details editing

let currentRemarkRequestId = null;
let currentRemarkItemId = null;
let currentRemarkItemName = null;

function openRemarkModal(requestId, itemId, itemName) {
  currentRemarkRequestId = requestId;
  currentRemarkItemId = itemId || null;
  currentRemarkItemName = itemName || "";

  document.getElementById("remarkItemName").textContent = currentRemarkItemName;

  // Check if there's an existing remark for this item (fallback to request-level key)
  const remarks = JSON.parse(localStorage.getItem("phyLab_Remarks")) || {};
  const key = currentRemarkItemId
    ? `item_${currentRemarkItemId}`
    : `req_${requestId}`;
  const existingRemark = remarks[key];

  if (existingRemark) {
    document.getElementById("remarkType").value = existingRemark.type || "";
    document.getElementById("remarkText").value = existingRemark.text || "";
  } else {
    document.getElementById("remarkType").value = "";
    document.getElementById("remarkText").value = "";
  }

  document.getElementById("remarkModal").classList.add("show");
}

function closeRemarkModal() {
  document.getElementById("remarkModal").classList.remove("show");
  currentRemarkRequestId = null;
  currentRemarkItemName = null;
}

async function saveRemark() {
  const remarkType = document.getElementById("remarkType").value;
  const remarkText = document.getElementById("remarkText").value.trim();

  if (!remarkType && !remarkText) {
    showNotification(
      "Please provide at least a remark type or description.",
      "warning",
    );
    return;
  }

  // Save to localStorage (fallback)
  const remarks = JSON.parse(localStorage.getItem("phyLab_Remarks")) || {};
  const key = currentRemarkItemId
    ? `item_${currentRemarkItemId}`
    : `req_${currentRemarkRequestId}`;
  const remarkObj = {
    type: remarkType,
    text: remarkText,
    itemName: currentRemarkItemName,
    createdAt: new Date().toISOString(),
    createdBy: "Admin",
  };
  remarks[key] = remarkObj;
  localStorage.setItem("phyLab_Remarks", JSON.stringify(remarks));

  // Attempt to persist remark to backend per-item when possible
  let backendSucceeded = false;
  if (currentRemarkItemId && currentRemarkRequestId) {
    const nowIso = new Date().toISOString();
    const payload = {
      items: [
        {
          id: currentRemarkItemId,
          admin_remark: remarkText,
          remark_type: remarkType,
          remark_created_at: nowIso,
        },
      ],
    };
    // Resolve numeric DB id for the request (uses admin-utils.resolveRequestNumericId)
    let resolvedReqId = currentRemarkRequestId;
    try {
      if (typeof resolveRequestNumericId === "function") {
        resolvedReqId = await resolveRequestNumericId(currentRemarkRequestId);
      }
    } catch (e) {
      console.warn("resolveRequestNumericId failed", e);
    }

    const urls = [
      (window.PHYLAB_API && typeof window.PHYLAB_API === 'function')
        ? window.PHYLAB_API(`/api/borrow-requests/${resolvedReqId}/update_item_statuses/`)
        : `/api/borrow-requests/${resolvedReqId}/update_item_statuses/`,
      `/api/borrow-requests/${resolvedReqId}/update_item_statuses/`,
    ];

    for (const u of urls) {
      try {
        const r = await fetch(u, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          mode: "cors",
        });
        if (r && r.ok) {
          backendSucceeded = true;
          break;
        } else {
          try {
            const txt = await r.text();
            console.warn("Remark PATCH failed:", r.status, txt);
          } catch (e) {}
        }
      } catch (e) {
        console.warn("Remark PATCH error", e);
        continue;
      }
    }
  }

  closeRemarkModal();
  if (backendSucceeded) {
    showNotification("Remark saved to server successfully!", "success");
  } else {
    showNotification("Remark saved locally (server unreachable).", "warning");
  }

  // Reload the loans view to show the remark badge
  if (typeof loadReturnWindow === "function") loadReturnWindow();
}

// Item Edit Modal handlers
function openItemEditModal(itemKey, itemId) {
  const modal = document.getElementById("itemEditModal");
  const nameEl = document.getElementById("editItemName");
  const typeEl = document.getElementById("editItemType");
  const useEl = document.getElementById("editItemUse");
  const cabinetEl = document.getElementById("editItemCabinet");
  const descEl = document.getElementById("editItemDescription");

  if (!modal) return;

  // First try to get saved details from localStorage
  const saved = JSON.parse(
    localStorage.getItem("item_details_" + itemKey) || "{}",
  );

  // Also get the card element to fetch original data attributes as fallback
  const stockInput = document.querySelector(
    '.stock-input[data-item="' + itemKey + '"]',
  );
  const card = stockInput ? stockInput.closest(".inventory-card") : null;

  // Get card's data attributes as fallback values
  const cardType = card ? card.getAttribute("data-type") || "" : "";
  const cardUse = card ? card.getAttribute("data-use") || "" : "";
  const cardCabinet = card ? card.getAttribute("data-cabinet") || "" : "";
  const cardDesc = card ? card.getAttribute("data-description") || "" : "";
  const cardName = card
    ? card.querySelector(".item-name")?.textContent?.trim() || itemKey
    : itemKey;

  // Populate modal: prefer saved values, fallback to card data attributes
  nameEl.textContent = saved.name || cardName || itemKey;
  typeEl.value = saved.type || cardType;
  useEl.value = saved.use || cardUse;
  cabinetEl.value = saved.cabinet || cardCabinet;
  descEl.value = saved.description || cardDesc;

  modal.dataset.editingItem = itemKey;
  if (itemId) modal.dataset.editingItemId = itemId;
  modal.classList.add("show");
}

function closeItemEditModal() {
  const modal = document.getElementById("itemEditModal");
  if (!modal) return;
  modal.classList.remove("show");
  delete modal.dataset.editingItem;
  delete modal.dataset.editingItemId;
}

async function saveItemDetails() {
  const modal = document.getElementById("itemEditModal");
  if (!modal) return;
  const itemKey = modal.dataset.editingItem;
  const itemId = modal.dataset.editingItemId;
  if (!itemKey) {
    if (typeof showNotification === "function")
      showNotification("No item selected to save.", "error");
    return;
  }

  const name = document.getElementById("editItemName").textContent || itemKey;
  const type = document.getElementById("editItemType").value.trim();
  const use = document.getElementById("editItemUse").value.trim();
  const cabinet = document.getElementById("editItemCabinet").value.trim();
  const description = document
    .getElementById("editItemDescription")
    .value.trim();

  const payload = {
    name,
    type,
    use,
    cabinet,
    description,
    updatedAt: new Date().toISOString(),
  };

  // Try to persist to backend if we have an item id
  let backendSucceeded = false;
  if (itemId) {
    const urls = [
      `/api/inventory/${itemId}/`,
      (window.PHYLAB_API && typeof window.PHYLAB_API === 'function')
        ? window.PHYLAB_API(`/api/inventory/${itemId}/`)
        : `/api/inventory/${itemId}/`,
    ];

    for (let u of urls) {
      try {
        const r = await fetch(u, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          mode: "cors",
        });
        if (r.ok) {
          backendSucceeded = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
  }

  // Persist to localStorage
  localStorage.setItem("item_details_" + itemKey, JSON.stringify(payload));

  // Update the card's data attributes with new values
  const card = document
    .querySelector('.stock-input[data-item="' + itemKey + '"]')
    ?.closest(".inventory-card");
  if (card) {
    card.setAttribute("data-type", type);
    card.setAttribute("data-use", use);
    card.setAttribute("data-cabinet", cabinet);
    card.setAttribute("data-description", description);
  }

  closeItemEditModal();
  if (backendSucceeded) {
    if (typeof showNotification === "function")
      showNotification("Item details saved to server.", "approved");
  } else {
    if (typeof showNotification === "function")
      showNotification("Item details saved locally (offline mode).", "warning");
  }

  // Refresh card display for this item
  const input = document.querySelector(
    '.stock-input[data-item="' + itemKey + '"]',
  );
  if (input && typeof updateStockDisplay === "function")
    updateStockDisplay(input);

  if (typeof saveInventoryToLocalStorage === "function")
    saveInventoryToLocalStorage();
}
