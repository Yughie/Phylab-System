// Borrow request approval management

async function loadBorrowRequests() {
  const container = document.getElementById("approvalsContainer");
  const selectAllEl = document.getElementById("selectAllChecks");
  if (selectAllEl) selectAllEl.checked = false;

  if (!container) return;
  container.innerHTML = '<div class="loading">Loading requests...</div>';

  // Try to fetch from backend API
  let pendingRequests = [];
  try {
    const urls = [
      "/api/borrow-requests/?status=pending",
      "http://127.0.0.1:8000/api/borrow-requests/?status=pending",
    ];

    let response = null;
    for (const url of urls) {
      try {
        response = await fetch(url, { mode: "cors" });
        if (response.ok) break;
      } catch (e) {
        continue;
      }
    }

    if (response && response.ok) {
      const data = await response.json();
      console.log("Fetched pending requests from backend:", data);

      // Normalize backend response to match frontend format
      pendingRequests = data
        .map((req) => ({
          id: req.id,
          requestId: req.request_id,
          studentName: req.student_name,
          studentID: req.student_id,
          email: req.email,
          teacherName: req.teacher_name,
          purpose: req.purpose,
          borrowDate: req.borrow_date,
          returnDate: req.return_date,
          status: req.status,
          items: req.items.map((item) => ({
            name: item.item_name,
            itemKey: item.item_key,
            quantity: item.quantity,
            image: item.item_image,
          })),
        }))
        .filter((req) => req.items.length > 0);
    }
  } catch (error) {
    console.error("Error fetching pending requests from backend:", error);
  }

  // Fallback to localStorage if backend fetch failed
  if (pendingRequests.length === 0) {
    const queue = JSON.parse(localStorage.getItem("phyLab_RequestQueue")) || [];
    pendingRequests = queue.filter(
      (req) => req.status === "pending" && req.items.length > 0,
    );
  }

  if (pendingRequests.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><path d="M8 15h8M9 9h.01M15 9h.01"></path></svg><p>No pending requests</p></div>';
    return;
  }

  pendingRequests.forEach((request) => {
    let requestBlock = document.createElement("div");
    requestBlock.className = "request-card";

    const itemsHtml = request.items
      .map(
        (item, itemIndex) => `
          <div class="request-item">
            <input type="checkbox" class="single-item-check" name="adminSelection"
                 data-req-id="${request.id}" 
                 data-item-index="${itemIndex}" 
                 data-item-name="${item.name}">
              
              <img src="${item.image || "default.png"}" class="request-item-img" alt="${item.name}">
              
              <div class="request-item-info">
                  <span class="request-item-name">${item.name}</span>
                  <span class="request-item-qty">Requested: ${item.quantity}</span>
              </div>

              <div class="action-qty-group">
                  <label>Qty:</label>
                  <input type="number" id="qty-action-${request.id}-${itemIndex}" 
                         value="${item.quantity}" min="1" max="${item.quantity}" 
                         class="action-qty-input">
              </div>
          </div>`,
      )
      .join("");

    requestBlock.innerHTML = `
        <div class="request-card-header">
          <div class="borrower-info">
            <div class="borrower-avatar">${(request.studentName || "U").charAt(0).toUpperCase()}</div>
            <div>
              <span class="borrower-name">${request.studentName}</span>
              <span class="borrower-id">${request.studentID}</span>
            </div>
          </div>
          <div class="request-header-right">
            <div class="request-dates">
              <span>Borrow: ${request.borrowDate || "N/A"}</span>
              <span>Return: ${request.returnDate || "N/A"}</span>
            </div>
          </div>
        </div>
        <div class="select-all-row">
          <label class="request-select-inline select-all-below">
            <input type="checkbox" class="request-select-all" data-req-id="${request.id}" onchange="toggleRequestSelect(this)"> Select all items
          </label>
        </div>
          <div class="request-items-list">
              ${itemsHtml}
          </div>
          <div class="request-card-footer">
              <span class="request-purpose">${request.purpose || "No purpose stated"}</span>
              <div class="request-actions">
                  <button onclick="processSelectedItems('borrowed')" class="approve-btn">Approve Selected</button>
                  <button onclick="processSelectedItems('rejected')" class="reject-btn">Reject Selected</button>
              </div>
          </div>
      `;

    container.appendChild(requestBlock);
  });
  // setup checkbox sync after DOM added
  setupRequestCheckboxSync();
}

function toggleRequestSelect(master) {
  const reqId =
    master && master.getAttribute ? master.getAttribute("data-req-id") : null;
  if (!reqId) return;
  const boxes = document.querySelectorAll(
    `.single-item-check[data-req-id="${reqId}"]`,
  );
  boxes.forEach((cb) => (cb.checked = !!master.checked));
}

function setupRequestCheckboxSync() {
  // attach change handlers to item checkboxes so master reflects state
  document.querySelectorAll(".single-item-check").forEach((cb) => {
    cb.onchange = function () {
      const reqId = this.getAttribute("data-req-id");
      const master = document.querySelector(
        `.request-select-all[data-req-id="${reqId}"]`,
      );
      if (master) {
        const all = Array.from(
          document.querySelectorAll(
            `.single-item-check[data-req-id="${reqId}"]`,
          ),
        );
        master.checked = all.length > 0 && all.every((x) => x.checked);
      }
    };
  });

  // initialize master checkboxes state
  document.querySelectorAll(".request-select-all").forEach((master) => {
    const reqId = master.getAttribute("data-req-id");
    const all = Array.from(
      document.querySelectorAll(`.single-item-check[data-req-id="${reqId}"]`),
    );
    master.checked = all.length > 0 && all.every((x) => x.checked);
  });
}

// Process selected items with confirmation
function processSelectedItems(newStatus) {
  const selectedBoxes = Array.from(
    document.querySelectorAll(".single-item-check:checked"),
  );
  if (selectedBoxes.length === 0) {
    showNotification("Please select at least one item to process.", "warning");
    return;
  }

  const actionVerb = newStatus === "borrowed" ? "Approve" : "Reject";
  const actionVerbLower = actionVerb.toLowerCase();

  showConfirm(
    `${actionVerb} Items`,
    `Are you sure you want to ${actionVerbLower} ${selectedBoxes.length} item(s)?`,
    function () {
      executeBulkProcess(newStatus, selectedBoxes);
    },
  );
}

async function executeBulkProcess(newStatus, selectedBoxes) {
  // Group actions by request id
  const actionsByRequest = {};
  selectedBoxes.forEach((cb) => {
    const reqId = cb.getAttribute("data-req-id");
    const itemIndex = parseInt(cb.getAttribute("data-item-index"));
    const qtyInput = document.getElementById(
      `qty-action-${reqId}-${itemIndex}`,
    );
    const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value) || 0) : 1;
    if (!actionsByRequest[reqId]) actionsByRequest[reqId] = [];
    actionsByRequest[reqId].push({
      itemIndex,
      qty,
      itemName: cb.getAttribute("data-item-name"),
    });
  });

  // Process each request via backend API
  for (const reqId of Object.keys(actionsByRequest)) {
    const action = newStatus === "borrowed" ? "approve" : "reject";

    try {
      const urls = [
        `/api/borrow-requests/${reqId}/${action}/`,
        `http://127.0.0.1:8000/api/borrow-requests/${reqId}/${action}/`,
      ];

      let response = null;
      for (const url of urls) {
        try {
          response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            mode: "cors",
          });
          if (response.ok) break;
        } catch (e) {
          continue;
        }
      }

      if (response && response.ok) {
        console.log(`Successfully ${action}ed request ${reqId}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing request ${reqId}:`, error);
    }
  }

  // Also update localStorage for backwards compatibility
  let queue = JSON.parse(localStorage.getItem("phyLab_RequestQueue")) || [];

  Object.keys(actionsByRequest).forEach((reqId) => {
    const requestIdx = queue.findIndex((r) => String(r.id) === String(reqId));
    if (requestIdx !== -1) {
      const originalRequest = queue[requestIdx];
      const itemsActions = actionsByRequest[reqId].sort(
        (a, b) => b.itemIndex - a.itemIndex,
      );

      itemsActions.forEach((action) => {
        const selectedItem = originalRequest.items[action.itemIndex];
        if (!selectedItem) return;

        const actionQty = Math.min(action.qty, selectedItem.quantity);
        if (actionQty <= 0) return;

        if (newStatus === "borrowed") {
          const approvedItem = { ...selectedItem, quantity: actionQty };
          const approvedEntry = {
            ...originalRequest,
            id: generateLoanId(),
            items: [approvedItem],
            status: "borrowed",
          };
          queue.push(approvedEntry);
        } else if (newStatus === "rejected") {
          const stockKey =
            "stock_" + (selectedItem.itemKey || selectedItem.name);
          let currentStock = parseInt(localStorage.getItem(stockKey)) || 0;
          localStorage.setItem(stockKey, currentStock + actionQty);
        }

        selectedItem.quantity -= actionQty;
        if (selectedItem.quantity <= 0) {
          originalRequest.items.splice(action.itemIndex, 1);
        }
      });

      if (originalRequest.items.length === 0) {
        queue.splice(requestIdx, 1);
      }
    }
  });

  localStorage.setItem("phyLab_RequestQueue", JSON.stringify(queue));
  loadBorrowRequests();
  if (typeof loadReturnWindow === "function") loadReturnWindow();
  if (typeof loadStockFromMemory === "function") loadStockFromMemory();
  loadDashboardStats();

  const statusText = newStatus === "borrowed" ? "approved" : "rejected";
  const notificationType = newStatus === "borrowed" ? "approved" : "rejected";
  showNotification(
    `Successfully ${statusText} ${selectedBoxes.length} item(s).`,
    notificationType,
  );
}
