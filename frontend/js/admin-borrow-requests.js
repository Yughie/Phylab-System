// Borrow request approval management

// Try to refresh local phyLab_RequestQueue from backend (used after remote updates)
async function refreshLocalQueueFromBackend() {
  try {
    const urls = [
      window.PHYLAB_API && typeof window.PHYLAB_API === "function"
        ? window.PHYLAB_API("/api/borrow-requests/")
        : "/api/borrow-requests/",
      "/api/borrow-requests/",
    ];

    let response = null;
    for (const url of urls) {
      try {
        response = await fetch(url, { mode: "cors" });
        if (response && response.ok) break;
      } catch (e) {
        continue;
      }
    }

    if (!response || !response.ok) return;
    const data = await response.json();

    const pending = [];
    const borrowed = [];

    (data || []).forEach((req) => {
      const items = (req.items || []).map((item) => ({
        id: item.id,
        name: item.item_name,
        itemKey: item.item_key,
        quantity: item.quantity,
        image: item.item_image,
        status: item.status || "pending",
      }));

      const pendingItems = items.filter(
        (i) => !i.status || i.status === "pending",
      );
      const approvedItems = items.filter(
        (i) => i.status === "approved" || i.status === "borrowed",
      );

      if (pendingItems.length > 0) {
        pending.push({
          id: req.id,
          requestId: req.request_id || req.requestId || req.id,
          studentName:
            req.student_name || req.studentName || req.full_name || "",
          studentID: req.student_id || req.studentId || req.id_number || "",
          email: req.email || req.student_email || "",
          studentPhone: req.student_phone || req.phone || req.contact || "",
          studentDepartment: req.department || req.student_department || "",
          teacherName: req.teacher_name || req.teacherName || "",
          teacherEmail: req.teacher_email || "",
          teacherPhone: req.teacher_phone || "",
          purpose: req.purpose || "",
          borrowDate: req.borrow_date || req.borrowDate || "",
          returnDate: req.return_date || req.returnDate || "",
          status: req.status || "pending",
          items: pendingItems,
        });
      }

      if (approvedItems.length > 0) {
        borrowed.push({
          id: generateLoanId(),
          requestId: req.request_id || req.requestId || req.id,
          studentName:
            req.student_name || req.studentName || req.full_name || "",
          studentID: req.student_id || req.studentId || req.id_number || "",
          email: req.email || req.student_email || "",
          studentPhone: req.student_phone || req.phone || req.contact || "",
          studentDepartment: req.department || req.student_department || "",
          teacherName: req.teacher_name || req.teacherName || "",
          purpose: req.purpose || "",
          borrowDate: req.borrow_date || req.borrowDate || "",
          returnDate: req.return_date || req.returnDate || "",
          status: "borrowed",
          items: approvedItems,
        });
      }
    });

    const normalized = pending.concat(borrowed);
    localStorage.setItem("phyLab_RequestQueue", JSON.stringify(normalized));
  } catch (e) {
    console.warn("refreshLocalQueueFromBackend failed", e);
  }
}

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
      window.PHYLAB_API && typeof window.PHYLAB_API === "function"
        ? window.PHYLAB_API("/api/borrow-requests/?status=pending")
        : "/api/borrow-requests/?status=pending",
      "/api/borrow-requests/?status=pending",
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
          requestId: req.request_id || req.requestId || req.id,
          studentName:
            req.student_name || req.studentName || req.full_name || "",
          studentID: req.student_id || req.studentId || req.id_number || "",
          email: req.email || req.student_email || "",
          studentPhone: req.student_phone || req.phone || req.contact || "",
          studentDepartment: req.department || req.student_department || "",
          teacherName: req.teacher_name || req.teacherName || "",
          teacherEmail: req.teacher_email || "",
          teacherPhone: req.teacher_phone || "",
          purpose: req.purpose || "",
          borrowDate: req.borrow_date || req.borrowDate || "",
          returnDate: req.return_date || req.returnDate || "",
          status: req.status,
          items: (req.items || [])
            .filter((item) => !item.status || item.status === "pending") // Only show pending items
            .map((item) => ({
              id: item.id,
              name: item.item_name || item.name || "",
              itemKey: item.item_key || item.itemKey || "",
              quantity: item.quantity || 1,
              image: item.item_image || item.image || "",
              description: item.description || item.item_description || "",
              status: item.status || "pending",
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

  // Clear the loading placeholder before rendering results
  container.innerHTML = "";

  if (pendingRequests.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><path d="M8 15h8M9 9h.01M15 9h.01"></path></svg><p>No pending requests</p></div>';
    return;
  }

  pendingRequests.forEach((request) => {
    let requestBlock = document.createElement("div");
    requestBlock.className = "request-card";

    // Normalize email fallbacks (support different backend field names)
    const rawEmail =
      request.email || request.student_email || request.contact || "";
    const inferredEmail =
      !rawEmail && request.studentName && request.studentName.includes("@")
        ? request.studentName
        : rawEmail;
    const emailSafe = inferredEmail || "";
    const mailHtml = emailSafe
      ? `<a href=\"mailto:${escapeHtml(emailSafe)}\">${escapeHtml(emailSafe)}</a>`
      : "N/A";

    const itemsHtml = request.items
      .map(
        (item, itemIndex) => `
          <div class="request-item" data-item-id="${item.id || ""}" data-item-status="${item.status || "pending"}">
            <input type="checkbox" class="single-item-check" name="adminSelection"
                 data-req-id="${request.id}" 
                 data-item-id="${item.id || ""}"
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
                <div class="borrower-meta">
                <div class="borrower-email">${mailHtml}</div>
                <div class="borrower-phone">${escapeHtml(request.studentPhone || "")}</div>
                <div class="borrower-dept">${escapeHtml(request.studentDepartment || "")}</div>
              </div>
            </div>
          </div>
          <div class="request-header-right">
            <div class="request-dates">
              <span>Borrow: ${request.borrowDate || "N/A"}</span>
              <span>Return: ${request.returnDate || "N/A"}</span>
            </div>
            <div class="request-teacher">
              <small>Teacher: ${request.teacherName || "N/A"}${request.teacherEmail ? " — " + request.teacherEmail : ""}</small>
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
  // Group actions by request id and collect item IDs
  const actionsByRequest = {};
  const requestsData = {}; // Store request data for emails

  selectedBoxes.forEach((cb) => {
    const reqId = cb.getAttribute("data-req-id");
    const itemIndex = parseInt(cb.getAttribute("data-item-index"));
    const itemId = cb.getAttribute("data-item-id");
    const qtyInput = document.getElementById(
      `qty-action-${reqId}-${itemIndex}`,
    );
    const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value) || 0) : 1;
    if (!actionsByRequest[reqId]) actionsByRequest[reqId] = [];
    actionsByRequest[reqId].push({
      itemId: itemId,
      itemIndex,
      qty,
      itemName: cb.getAttribute("data-item-name"),
      newStatus: newStatus, // Keep the status as-is: "borrowed" when approved, "rejected" when rejected
    });

    // Store request data for email
    if (!requestsData[reqId]) {
      const requestCard = cb.closest(".request-card");
      if (requestCard) {
        const studentName =
          requestCard.querySelector(".borrower-name")?.textContent || "";
        const studentEmail =
          requestCard.querySelector(".borrower-email a")?.textContent ||
          requestCard.querySelector(".borrower-email")?.textContent ||
          "";
        const returnDate =
          requestCard
            .querySelector(".request-dates span:last-child")
            ?.textContent?.replace("Return: ", "") || "N/A";

        requestsData[reqId] = {
          studentName: studentName.trim(),
          email: studentEmail.trim(),
          returnDate: returnDate.trim(),
          items: [],
        };
      }
    }
    if (requestsData[reqId]) {
      requestsData[reqId].items.push({
        name: cb.getAttribute("data-item-name"),
        quantity: qty,
      });
    }
  });

  // Process each request using the new update_item_statuses endpoint
  let anyRemoteSuccess = false;
  for (const reqId of Object.keys(actionsByRequest)) {
    const itemsActions = actionsByRequest[reqId];

    // Build the items array for the PATCH request
    const itemsToUpdate = itemsActions.map((act) => ({
      id: act.itemId,
      status: act.newStatus,
      quantity: act.qty,
    }));

    // Call the update_item_statuses endpoint
    let success = false;
    try {
      // Resolve numeric DB id if reqId may be a public request code
      let resolvedReqId = reqId;
      try {
        if (typeof resolveRequestNumericId === "function") {
          resolvedReqId = await resolveRequestNumericId(reqId);
        }
      } catch (e) {
        console.warn("resolveRequestNumericId failed", e);
      }

      const urls = [];
      if (window.PHYLAB_API && typeof window.PHYLAB_API === "function") {
        try {
          urls.push(
            window.PHYLAB_API(
              `/api/borrow-requests/${resolvedReqId}/update_item_statuses/`,
            ),
          );
        } catch (e) {}
      }
      if (window.PHYLAB_API_BASE) {
        urls.push(
          (window.PHYLAB_API_BASE || "http://127.0.0.1:8000") +
            `/api/borrow-requests/${resolvedReqId}/update_item_statuses/`,
        );
      }
      urls.push(
        `http://127.0.0.1:8000/api/borrow-requests/${resolvedReqId}/update_item_statuses/`,
      );
      urls.push(`/api/borrow-requests/${resolvedReqId}/update_item_statuses/`);

      for (const url of urls) {
        try {
          const response = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: itemsToUpdate }),
            mode: "cors",
          });

          if (response.ok) {
            console.debug(
              `Updated item statuses for request ${reqId}:`,
              itemsToUpdate,
            );
            success = true;
            break;
          } else {
            const txt = await response.text().catch(() => "<no-body>");
            console.warn(`PATCH ${url} failed`, response.status, txt);
          }
        } catch (e) {
          console.warn(`PATCH ${url} error`, e);
          continue;
        }
      }
    } catch (e) {
      console.error("Error updating item statuses:", e);
    }

    if (success) {
      anyRemoteSuccess = true;
    }

    // Fallback to localStorage for backwards compatibility (optional)
    if (!success) {
      let queue = JSON.parse(localStorage.getItem("phyLab_RequestQueue")) || [];
      const requestIdx = queue.findIndex((r) => String(r.id) === String(reqId));
      if (requestIdx !== -1) {
        const originalRequest = queue[requestIdx];
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
      localStorage.setItem("phyLab_RequestQueue", JSON.stringify(queue));
    }
  }

  // If remote updates succeeded, refresh local queue from backend so borrowed loans appear
  if (anyRemoteSuccess) {
    try {
      await refreshLocalQueueFromBackend();
    } catch (e) {
      // ignore
    }
  }

  // Send emails for each request
  console.log("Email data collected:", requestsData);
  console.log("EmailJS available:", typeof safeSendEmail !== "undefined");
  console.log(
    "Service ID:",
    typeof EMAILJS_SERVICE_ID !== "undefined"
      ? EMAILJS_SERVICE_ID
      : "NOT DEFINED",
  );
  console.log(
    "Template ID:",
    typeof EMAILJS_SHARED_TEMPLATE !== "undefined"
      ? EMAILJS_SHARED_TEMPLATE
      : "NOT DEFINED",
  );

  for (const reqId of Object.keys(requestsData)) {
    const reqData = requestsData[reqId];
    console.log(`Processing email for request ${reqId}:`, reqData);

    if (!reqData.email || !reqData.email.includes("@")) {
      console.warn(
        `Skipping email for request ${reqId}: invalid email "${reqData.email}"`,
      );
      continue;
    }

    const itemsList = reqData.items
      .map((item) => `${item.name} (Qty: ${item.quantity})`)
      .join(", ");
    const statusText = newStatus === "borrowed" ? "approved" : "rejected";
    const statusMessage =
      newStatus === "borrowed"
        ? `Your borrow request has been approved! Please collect the items.`
        : `Your borrow request has been rejected. Please contact us for more information.`;

    const templateParams = {
      subject: `Borrow Request ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
      to_email: reqData.email,
      to_name: reqData.studentName,
      student_name: reqData.studentName,
      status: statusText.toUpperCase(),
      item_details: itemsList,
      item_name:
        reqData.items.length === 1
          ? reqData.items[0].name
          : `${reqData.items.length} items`,
      return_date: reqData.returnDate,
      message_html: `<p>Hi ${reqData.studentName},</p>
        <p>${statusMessage}</p>
        <p><strong>Items:</strong> ${itemsList}</p>
        ${newStatus === "borrowed" ? `<p><strong>Return Date:</strong> ${reqData.returnDate}</p>` : ""}
        <p>Thanks,<br/>PhyLab Team</p>`,
      logo_url: `${window.location.origin}/Phylab.png`,
      company_url: window.location.origin,
      company_email: "support@" + window.location.hostname,
    };

    console.log(
      `Attempting to send email to ${reqData.email}:`,
      templateParams,
    );

    if (typeof safeSendEmail === "function") {
      safeSendEmail(EMAILJS_SERVICE_ID, EMAILJS_SHARED_TEMPLATE, templateParams)
        .then(() => {
          console.log(
            `✅ ${statusText} email sent successfully to ${reqData.email}`,
          );
          showNotification(`Email sent to ${reqData.email}`, "success");
        })
        .catch((err) => {
          console.error(
            `❌ Failed to send ${statusText} email to ${reqData.email}:`,
            err,
          );
          showNotification(`Failed to send email: ${err.message}`, "error");
        });
    } else {
      console.error("safeSendEmail function not available");
      showNotification("Email service not available", "error");
    }
  }

  // Reload the UI to reflect changes
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
