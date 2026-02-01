// ===== CART/BORROW COMPONENT =====

import {
  syncStockDisplay,
  showPopup,
  generateShortId,
  getSessionUser,
} from "./user-utils.js";
import { closeMobileNav } from "./user-navigation.js";
import { loadUserRequests } from "./user-requests.js";

let cartItems = [];

/**
 * Add item to cart
 */
export function addToCart(item) {
  const existing = cartItems.find((i) => i.itemKey === item.itemKey);
  if (existing) {
    existing.quantity += 1;
  } else {
    cartItems.push({
      itemKey: item.itemKey,
      name: item.name,
      image: item.image,
      quantity: 1,
    });
  }
  updateVisualCart();
}

/**
 * Update visual cart display
 */
function updateVisualCart() {
  const container = document.getElementById("selectedItemsContainer");
  if (!container) return;

  container.innerHTML = "";

  if (cartItems.length === 0) {
    container.innerHTML =
      "<p style='text-align:center; padding:10px; color:#666;'>No items selected.</p>";
    updateBorrowButtonCount();
    return;
  }

  cartItems.forEach((item, index) => {
    const itemHTML = `
      <div class="selected-item-row" style="display: flex; align-items: center; justify-content: space-between; background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #eee;">
        <div style="display: flex; align-items: center;">
          <img src="${item.image}" style="width: 50px; height: 50px; border-radius: 4px; margin-right: 15px; object-fit: cover;">
          <div>
            <div style="font-weight: 600; color: var(--color-primary);">${item.name}</div>
            <div style="font-size: 0.85rem; color: #666;">Qty: ${item.quantity}</div>
          </div>
        </div>
        <button type="button" class="remove-item-btn" data-index="${index}" style="background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 18px; font-weight: bold;">&times;</button>
      </div>`;
    container.insertAdjacentHTML("beforeend", itemHTML);
  });

  updateBorrowButtonCount();
}

/**
 * Update borrow button count badge
 */
function updateBorrowButtonCount() {
  const borrowCountEl = document.getElementById("borrow-count");
  if (!borrowCountEl) return;

  const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0);
  borrowCountEl.innerText = totalQty;
  borrowCountEl.style.opacity = totalQty === 0 ? "0.6" : "1";
}

/**
 * Toggle borrow modal
 */
export function toggleModal(show) {
  const borrowModal = document.getElementById("borrowModal");
  const borrowToggleButton = document.getElementById("borrowToggleButton");
  // If we're about to show the borrow modal, ensure history modal is closed
  try {
    if (show) {
      const historyModal = document.getElementById("historyModal");
      const detail = document.getElementById("historyDetailPane");
      if (historyModal && historyModal.classList.contains("show")) {
        historyModal.classList.remove("show");
        historyModal.style.display = "none";
        historyModal.setAttribute("aria-hidden", "true");
      }
      if (detail) detail.style.display = "none";
    }
  } catch (e) {
    // ignore
  }

  if (show) {
    borrowModal.classList.add("show");
    borrowModal.style.display = "flex";
    // keep the borrow toggle button visible while modal is open

    // Close mobile nav
    closeMobileNav();

    // Prefill user info
    try {
      const sessionUser = getSessionUser();
      const nameEl = document.getElementById("user-fullname");
      const idEl = document.getElementById("user-id");
      if (nameEl) {
        nameEl.value =
          sessionUser.fullname || sessionUser.name || nameEl.value || "";
      }
      if (idEl) {
        idEl.value = sessionUser.idNumber || sessionUser.id || idEl.value || "";
      }
    } catch (e) {
      console.warn("Error prefilling user info:", e);
    }
  } else {
    borrowModal.classList.remove("show");
    borrowModal.style.display = "none";
    // leave borrow toggle button display unchanged
  }
}

/**
 * Handle borrow form submission
 */
async function handleBorrowFormSubmit(e) {
  e.preventDefault();

  const teacherName = document.getElementById("teacher-name").value;
  const purpose = document.getElementById("purpose-text").value;
  const borrowDate = document.getElementById("borrow-date").value;
  const returnDate = document.getElementById("return-date").value;
  const inputName = document.getElementById("user-fullname").value;
  const inputID = document.getElementById("user-id").value;

  const sessionUser = getSessionUser();

  const requestData = {
    request_id: generateShortId(),
    student_name: sessionUser.fullname || inputName,
    student_id: sessionUser.idNumber || inputID,
    email: sessionUser.email || "no-email@univ.edu",
    teacher_name: teacherName,
    purpose: purpose,
    borrow_date: borrowDate,
    return_date: returnDate,
    items: cartItems.map((item) => ({
      item_name: item.name,
      item_key: item.itemKey || null,
      quantity: item.quantity,
      item_image: item.image || null,
    })),
    status: "pending",
  };

  try {
    const url =
      window.PHYLAB_API && typeof window.PHYLAB_API === "function"
        ? window.PHYLAB_API("/api/borrow-requests/")
        : "/api/borrow-requests/";
    let success = false;
    const token = sessionStorage.getItem("auth_token");
    try {
      const options = {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      };
      if (token) options.headers.Authorization = "Token " + token;
      else options.credentials = "include";

      const resp = await fetch(url, options);
      if (resp && resp.ok) success = true;
    } catch (err) {
      console.warn(`Failed to submit to ${url}:`, err);
    }

    if (!success) {
      console.warn("Backend unavailable, saving to localStorage");
      const allRequests =
        JSON.parse(localStorage.getItem("phyLab_RequestQueue")) || [];
      allRequests.push({
        id: requestData.request_id,
        studentName: requestData.student_name,
        studentID: requestData.student_id,
        email: requestData.email,
        teacherName: requestData.teacher_name,
        purpose: requestData.purpose,
        borrowDate: requestData.borrow_date,
        returnDate: requestData.return_date,
        items: requestData.items,
        status: "pending",
        timestamp: new Date().toLocaleString(),
      });
      localStorage.setItem("phyLab_RequestQueue", JSON.stringify(allRequests));
    }

    const itemsCopy = JSON.parse(JSON.stringify(cartItems || []));
    showPopup("Request Submitted Successfully!", {
      items: itemsCopy,
      logoSrc: "Phylab.png",
      onClose: () => {},
    });

    document.getElementById("borrowForm").reset();
    cartItems = [];
    updateVisualCart();
    toggleModal(false);

    // Refresh user's request list
    if (typeof loadUserRequests === "function") loadUserRequests();
  } catch (err) {
    console.error("Error submitting borrow request:", err);
    showPopup("Error submitting request. Please try again.");
  }
}

/**
 * Handle remove item from cart
 */
function handleRemoveFromCart(index) {
  const itemToRemove = cartItems[index];
  const itemKey = itemToRemove.itemKey;

  let currentStock = parseInt(localStorage.getItem("stock_" + itemKey)) || 0;
  currentStock += 1;
  localStorage.setItem("stock_" + itemKey, currentStock);
  syncStockDisplay();

  if (itemToRemove.quantity > 1) {
    itemToRemove.quantity -= 1;
  } else {
    cartItems.splice(index, 1);
  }

  updateVisualCart();
  updateBorrowButtonCount();
}

/**
 * Initialize cart/borrow component
 */
export function initCart() {
  const borrowToggleButton = document.getElementById("borrowToggleButton");
  const borrowForm = document.getElementById("borrowForm");
  const selectedItemsContainer = document.getElementById(
    "selectedItemsContainer",
  );

  // Borrow toggle button
  if (borrowToggleButton) {
    borrowToggleButton.addEventListener("click", () => {
      const borrowModal = document.getElementById("borrowModal");
      const isOpen = borrowModal && borrowModal.classList.contains("show");
      toggleModal(!isOpen);
    });
  }

  // Form submission
  if (borrowForm) {
    borrowForm.addEventListener("submit", handleBorrowFormSubmit);
  }

  // Remove item from cart
  if (selectedItemsContainer) {
    selectedItemsContainer.addEventListener("click", (event) => {
      if (event.target.classList.contains("remove-item-btn")) {
        const index = event.target.getAttribute("data-index");
        handleRemoveFromCart(parseInt(index));
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      try {
        toggleModal(false);
      } catch (err) {}
    }
  });

  // Initialize display
  syncStockDisplay();
  updateVisualCart();
}

// Make toggleModal available globally for onclick handlers
window.toggleModal = toggleModal;
