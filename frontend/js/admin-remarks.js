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

// ================== Add New Item Functions ==================

function openAddItemModal() {
  const modal = document.getElementById("addItemModal");
  if (!modal) return;

  // Clear all form fields
  document.getElementById("addItemName").value = "";
  document.getElementById("addItemKey").value = "";
  document.getElementById("addItemCategory").value = "";
  document.getElementById("addItemStock").value = "0";
  document.getElementById("addItemCabinet").value = "";
  document.getElementById("addItemType").value = "";
  document.getElementById("addItemUse").value = "";
  document.getElementById("addItemDescription").value = "";
  document.getElementById("addItemImage").value = "";
  document.getElementById("addItemImagePreview").innerHTML = "";

  // No visible item_key field: item_key will be auto-generated on save if empty
  const nameInput = document.getElementById("addItemName");

  // Image preview
  const imageInput = document.getElementById("addItemImage");
  const imagePreview = document.getElementById("addItemImagePreview");
  imageInput.onchange = function () {
    imagePreview.innerHTML = "";
    if (imageInput.files && imageInput.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.style.maxWidth = "150px";
        img.style.maxHeight = "150px";
        img.style.borderRadius = "8px";
        imagePreview.appendChild(img);
      };
      reader.readAsDataURL(imageInput.files[0]);
    }
  };

  modal.classList.add("show");
}

function closeAddItemModal() {
  const modal = document.getElementById("addItemModal");
  if (!modal) return;
  modal.classList.remove("show");
}

async function saveNewItem() {
  const name = document.getElementById("addItemName").value.trim();
  let itemKey = document.getElementById("addItemKey").value.trim();
  const category = document.getElementById("addItemCategory").value;
  const stock = parseInt(document.getElementById("addItemStock").value) || 0;
  const cabinet = document.getElementById("addItemCabinet").value.trim();
  const type = document.getElementById("addItemType").value.trim();
  const use = document.getElementById("addItemUse").value.trim();
  const description = document
    .getElementById("addItemDescription")
    .value.trim();
  const imageInput = document.getElementById("addItemImage");

  // Validation
  if (!name) {
    if (typeof showNotification === "function")
      showNotification("Item name is required.", "error");
    return;
  }

  // Auto-generate item_key if not provided
  if (!itemKey) {
    itemKey = name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  // Prepare form data (for file upload support)
  const formData = new FormData();
  formData.append("name", name);
  formData.append("item_key", itemKey);
  formData.append("category", category);
  formData.append("stock", stock);
  formData.append("cabinet", cabinet);
  formData.append("type", type);
  formData.append("use", use);
  formData.append("description", description);

  if (imageInput.files && imageInput.files[0]) {
    formData.append("image", imageInput.files[0]);
  }

  // Send to backend
  try {
    const urls = [];
    if (window.PHYLAB_API && typeof window.PHYLAB_API === "function") {
      urls.push(window.PHYLAB_API("/api/inventory/"));
    } else if (window.PHYLAB_API_BASE) {
      urls.push(window.PHYLAB_API_BASE + "/api/inventory/");
    }
    urls.push("/api/inventory/");

    const headers = {};
    const token = sessionStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = "Token " + token;
    }

    let success = false;
    let responseData = null;

    for (const url of urls) {
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: headers,
          body: formData,
          mode: "cors",
        });

        if (resp.ok) {
          responseData = await resp.json();
          success = true;
          break;
        } else {
          const errText = await resp.text();
          console.warn("Add item failed:", resp.status, errText);
          // Check for duplicate key error
          if (resp.status === 400 && errText.includes("item_key")) {
            if (typeof showNotification === "function")
              showNotification(
                "Item key already exists. Please use a different name or key.",
                "error",
              );
            return;
          }
        }
      } catch (e) {
        console.error("Add item network error:", e);
      }
    }

    if (success) {
      closeAddItemModal();
      if (typeof showNotification === "function")
        showNotification("Item added successfully!", "approved");

      // Refresh the inventory grid
      if (typeof refreshInventoryFromBackend === "function") {
        await refreshInventoryFromBackend();
      }
      if (typeof renderInventoryGrid === "function") {
        renderInventoryGrid();
      }
    } else {
      if (typeof showNotification === "function")
        showNotification("Failed to add item. Please try again.", "error");
    }
  } catch (e) {
    console.error("Error adding item:", e);
    if (typeof showNotification === "function")
      showNotification("Error adding item: " + e.message, "error");
  }
}

// ================== Delete Item Functions ==================

function confirmDeleteItem(itemId, itemName) {
  if (!itemId) {
    if (typeof showNotification === "function")
      showNotification("Cannot delete: Item ID not found.", "error");
    return;
  }

  if (typeof showConfirm === "function") {
    showConfirm(
      "Delete Item",
      `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      function () {
        deleteItem(itemId, itemName);
      },
    );
  } else if (
    confirm(
      `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
    )
  ) {
    deleteItem(itemId, itemName);
  }
}

async function deleteItem(itemId, itemName) {
  try {
    const urls = [];
    if (window.PHYLAB_API && typeof window.PHYLAB_API === "function") {
      urls.push(window.PHYLAB_API(`/api/inventory/${itemId}/`));
    } else if (window.PHYLAB_API_BASE) {
      urls.push(window.PHYLAB_API_BASE + `/api/inventory/${itemId}/`);
    }
    urls.push(`/api/inventory/${itemId}/`);

    const headers = {
      "Content-Type": "application/json",
    };
    const token = sessionStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = "Token " + token;
    }

    let success = false;

    for (const url of urls) {
      try {
        const resp = await fetch(url, {
          method: "DELETE",
          headers: headers,
          mode: "cors",
        });

        if (resp.ok || resp.status === 204) {
          success = true;
          break;
        } else {
          console.warn("Delete item failed:", resp.status);
        }
      } catch (e) {
        console.error("Delete item network error:", e);
      }
    }

    if (success) {
      if (typeof showNotification === "function")
        showNotification(`"${itemName}" deleted successfully.`, "approved");

      // Remove the card from DOM immediately
      const card = document.querySelector(
        `.inventory-card[data-id="${itemId}"]`,
      );
      if (card) {
        card.remove();
      }

      // Refresh the inventory grid from backend
      if (typeof refreshInventoryFromBackend === "function") {
        await refreshInventoryFromBackend();
      }
      if (typeof renderInventoryGrid === "function") {
        renderInventoryGrid();
      }
    } else {
      if (typeof showNotification === "function")
        showNotification("Failed to delete item. Please try again.", "error");
    }
  } catch (e) {
    console.error("Error deleting item:", e);
    if (typeof showNotification === "function")
      showNotification("Error deleting item: " + e.message, "error");
  }
}
