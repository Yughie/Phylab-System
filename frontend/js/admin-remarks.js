// Admin remark system and item details editing

let currentRemarkRequestId = null;
let currentRemarkItemId = null;
let currentRemarkItemName = null;

async function fetchExistingRemark(requestId, itemId) {
  if (!itemId || !requestId || typeof backendFetch !== "function") {
    return null;
  }

  try {
    // Resolve numeric DB id for the request
    let resolvedReqId = requestId;
    if (typeof resolveRequestNumericId === "function") {
      resolvedReqId = await resolveRequestNumericId(requestId);
    }

    // Fetch the full request data to get item remarks
    const result = await backendFetch(`/api/borrow-requests/${resolvedReqId}/`);
    if (!result.ok || !result.data) {
      return null;
    }

    const request = result.data;
    // Find the specific item in the request
    const item = request.items?.find((i) => String(i.id) === String(itemId));

    if (item && (item.admin_remark || item.remark_type)) {
      return {
        type: item.remark_type || "",
        text: item.admin_remark || "",
        createdAt: item.remark_created_at || null,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching existing remark:", error);
    return null;
  }
}

function openRemarkModal(requestId, itemId, itemName) {
  currentRemarkRequestId = requestId;
  currentRemarkItemId = itemId || null;
  currentRemarkItemName = itemName || "";

  document.getElementById("remarkItemName").textContent = currentRemarkItemName;

  // Fetch existing remark from backend
  fetchExistingRemark(requestId, itemId)
    .then((backendRemark) => {
      if (backendRemark) {
        // Use backend data
        document.getElementById("remarkType").value = backendRemark.type || "";
        document.getElementById("remarkText").value = backendRemark.text || "";
      } else {
        // No existing remark
        document.getElementById("remarkType").value = "";
        document.getElementById("remarkText").value = "";
      }
    })
    .catch((error) => {
      console.warn("Failed to fetch existing remark from backend:", error);
      // Clear fields on error
      document.getElementById("remarkType").value = "";
      document.getElementById("remarkText").value = "";
    });

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

  // Save to backend only
  let backendSucceeded = false;
  console.log(
    "[saveRemark] currentRemarkItemId:",
    currentRemarkItemId,
    "currentRemarkRequestId:",
    currentRemarkRequestId,
    "backendFetch available:",
    typeof backendFetch === "function",
  );

  if (
    currentRemarkItemId &&
    currentRemarkItemId !== "undefined" &&
    currentRemarkRequestId &&
    currentRemarkRequestId !== "undefined"
  ) {
    const nowIso = new Date().toISOString();
    // Ensure item id is a number for the backend
    const numericItemId = parseInt(currentRemarkItemId, 10);
    const remarkPayload = {
      items: [
        {
          id: isNaN(numericItemId) ? currentRemarkItemId : numericItemId,
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

    console.log(
      "[saveRemark] resolvedReqId:",
      resolvedReqId,
      "payload:",
      JSON.stringify(remarkPayload),
    );

    if (typeof backendFetch === "function") {
      const result = await backendFetch(
        `/api/borrow-requests/${resolvedReqId}/update_item_statuses/`,
        { method: "PATCH", body: remarkPayload },
      );
      // Check both HTTP success AND that items were actually updated
      if (result.ok && result.data && result.data.updated_count > 0) {
        backendSucceeded = true;
      } else if (result.ok && result.data && result.data.updated_count === 0) {
        console.warn(
          "[saveRemark] Backend returned 200 but updated_count=0. Item ID may not belong to this request.",
          "skipped_ids:",
          result.data.skipped_ids,
        );
      }
      console.log("[saveRemark] backendFetch result:", result);
    } else {
      console.error(
        "[saveRemark] backendFetch is NOT available — admin-utils.js may not be loaded",
      );
    }
  } else {
    console.warn(
      "[saveRemark] Skipping backend save — itemId or requestId missing/undefined.",
      "itemId:",
      currentRemarkItemId,
      "requestId:",
      currentRemarkRequestId,
    );
  }

  closeRemarkModal();
  if (backendSucceeded) {
    showNotification("Remark saved to server successfully!", "success");
  } else {
    showNotification("Failed to save remark to server.", "error");
    return; // Don't reload if save failed
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
    const result = await backendFetch(`/api/inventory/${itemId}/`, {
      method: "PATCH",
      body: payload,
    });
    backendSucceeded = result.ok;
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
