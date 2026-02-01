// Active loans and returns management

async function loadReturnWindow() {
  const container = document.getElementById("loansContainer");
  if (!container) return;

  container.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';

  // Try to fetch from backend API
  let activeLoans = [];
  let lastErrorBody = null;
  try {
    // Build candidate URLs using configured API base so production/local resolve reliably
    const urls = [
      window.PHYLAB_API && typeof window.PHYLAB_API === "function"
        ? window.PHYLAB_API("/api/borrow-requests/?status=borrowed")
        : "/api/borrow-requests/?status=borrowed",
      "/api/borrow-requests/?status=borrowed",
      // fallback to custom action if present
      window.PHYLAB_API && typeof window.PHYLAB_API === "function"
        ? window.PHYLAB_API("/api/borrow-requests/currently_borrowed/")
        : "/api/borrow-requests/currently_borrowed/",
      "/api/borrow-requests/currently_borrowed/",
    ];

    let response = null;
    // Prepare auth-aware fetch options
    const token = sessionStorage.getItem("auth_token");
    for (const url of urls) {
      try {
        const options = { method: "GET", mode: "cors" };
        if (token) options.headers = { Authorization: "Token " + token };
        else options.credentials = "include";

        response = await fetch(url, options);
        if (response.ok) break;
        // capture non-ok response body for debugging
        try {
          lastErrorBody = await response.text();
        } catch (e) {
          lastErrorBody = "<unreadable response body>";
        }
      } catch (e) {
        lastErrorBody = String(e);
        continue;
      }
    }

    if (response && response.ok) {
      const data = await response.json();
      console.log("Fetched currently borrowed from backend:", data);

      // Normalize backend response to match frontend format
      activeLoans = (data || []).map((req) => ({
        id: req.id,
        requestId: req.request_id || req.requestId || req.id,
        studentName: req.student_name || req.studentName || req.full_name || "",
        studentId: req.student_id || req.studentId || "",
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
        adminRemark: req.admin_remark,
        remarkType: req.remark_type,
        items: (req.items || []).map((item) => ({
          id: item.id,
          name: item.item_name || item.name || "",
          itemKey: item.item_key || item.itemKey || "",
          quantity: item.quantity || 1,
          image: item.item_image || item.image || "",
          status: item.status,
          description: item.description || item.item_description || "",
          admin_remark: item.admin_remark,
          remark_type: item.remark_type,
          remark_created_at: item.remark_created_at,
        })),
      }));
    }
  } catch (error) {
    console.error("Error fetching borrowed items from backend:", error);
  }

  // Fallback to localStorage if backend fetch failed
  if (activeLoans.length === 0) {
    const queue = JSON.parse(localStorage.getItem("phyLab_RequestQueue")) || [];
    activeLoans = queue.filter(
      (req) => req.status && req.status.toLowerCase() === "borrowed",
    );
  }

  container.innerHTML = "";

  if (activeLoans.length === 0) {
    // If there was a backend response error, show it for debugging
    const fetchDebug =
      typeof lastErrorBody !== "undefined" && lastErrorBody
        ? `<pre class="fetch-debug">${escapeHtml(String(lastErrorBody)).slice(0, 2000)}</pre>`
        : "";
    container.innerHTML = `<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg><p>No active loans</p>${fetchDebug}</div>`;
    return;
  }

  // Get remarks from localStorage
  const remarks = JSON.parse(localStorage.getItem("phyLab_Remarks")) || {};

  activeLoans.forEach((request) => {
    const reqKey = `req_${request.requestId || request.id}`;
    const storedReqRemark = remarks[reqKey];
    const hasRemark = storedReqRemark || request.adminRemark;
    const remarkBadgeHTML = hasRemark
      ? `
          <div class="remark-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              ${getRemarkTypeLabel(hasRemark.type || hasRemark.remarkType) || "Has Remark"}
          </div>`
      : "";

    // Filter out items that are already returned
    const activeItems = request.items.filter(
      (item) => item.status !== "returned",
    );

    activeItems.forEach((item) => {
      const itemKey = `item_${item.id}`;
      const storedItemRemark = remarks[itemKey];
      const itemHasRemark =
        storedItemRemark || item.admin_remark || request.adminRemark;
      const itemRemarkBadge = itemHasRemark
        ? `<div class="remark-badge">${getRemarkTypeLabel(storedItemRemark?.type || item.remark_type || request.remarkType) || "Has Remark"}</div>`
        : "";
      const remarkTimestamp =
        storedItemRemark?.createdAt || item.remark_created_at || null;
      const remarkTimestampHtml = remarkTimestamp
        ? `<div class="remark-ts">${formatRemarkTimestamp(remarkTimestamp)}</div>`
        : "";

      const itemHTML = `
          <div class="loan-card" data-item-id="${item.id}">
            <img class="loan-card-img" src="${item.image || item.item_image || "default.png"}" alt="${item.name || item.item_name}">
            <div class="loan-card-info">
              <h3 class="loan-item-name">${item.name || item.item_name}</h3>
              <div class="loan-qty">Qty: ${item.quantity}</div>
              <div class="loan-borrower">
                <span class="borrower-avatar-small">${(request.studentName || "U").charAt(0).toUpperCase()}</span>
                <span>${request.studentName || "N/A"}</span>
              </div>
              <div class="loan-contact">
                <div class="loan-email">${request.email || "N/A"}</div>
                <div class="loan-phone">${request.studentPhone || ""}</div>
                <div class="loan-dept">${request.studentDepartment || ""}</div>
                <div class="loan-teacher">Teacher: ${request.teacherName || "N/A"}${request.teacherEmail ? " (" + request.teacherEmail + ")" : ""}</div>
              </div>
              <div class="loan-due-date">Due: ${request.returnDate || "N/A"}</div>
                      ${itemRemarkBadge}
                      ${remarkTimestampHtml}
            </div>
            <div class="loan-card-actions">
              <button class="return-btn" data-request-id="${request.id}" data-item-id="${item.id}">Mark Returned</button>
              <button class="remark-btn" onclick="openRemarkModal('${request.id}', '${item.id}', '${(item.name || item.item_name).replace(/'/g, "\'")}')">${itemHasRemark ? "Edit" : "Remark"}</button>
              <button class="details-btn" onclick="openBorrowingDetails('${request.id}')">Details</button>
            </div>
          </div>`;
      container.insertAdjacentHTML("beforeend", itemHTML);
    });
  });
}

function formatRemarkTimestamp(val) {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString();
  } catch (e) {
    return String(val);
  }
}

async function completeReturn(requestId, itemId) {
  showConfirm(
    "Confirm Return",
    "Are you sure? This will mark the item as returned and restore it to stock.",
    async function () {
      console.log("completeReturn: marking item as returned", {
        requestId,
        itemId,
      });

      // Try to mark returned in backend first
      let backendSuccess = false;
      let backendResponse = null;

      try {
        // Resolve numeric DB id if requestId might be a public request code
        let resolvedReqId = requestId;
        try {
          if (typeof resolveRequestNumericId === "function") {
            resolvedReqId = await resolveRequestNumericId(requestId);
          }
        } catch (e) {
          console.warn("resolveRequestNumericId failed", e);
        }

        console.log("completeReturn: using resolvedReqId:", resolvedReqId);

        // Use update_item_statuses endpoint to mark specific item as returned
        const urls = [
          window.PHYLAB_API && typeof window.PHYLAB_API === "function"
            ? window.PHYLAB_API(
                `/api/borrow-requests/${resolvedReqId}/update_item_statuses/`,
              )
            : `/api/borrow-requests/${resolvedReqId}/update_item_statuses/`,
          `/api/borrow-requests/${resolvedReqId}/update_item_statuses/`,
        ];

        const payload = { items: [{ id: itemId, status: "returned" }] };
        console.log("completeReturn: sending payload:", payload);

        let response = null;
        const token = sessionStorage.getItem("auth_token");
        for (const url of urls) {
          try {
            console.log("completeReturn: trying PATCH to", url);
            const options = {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              mode: "cors",
            };
            if (token) options.headers.Authorization = "Token " + token;
            else options.credentials = "include";

            response = await fetch(url, options);
            console.log("completeReturn: response status:", response.status);

            if (response.ok) {
              backendSuccess = true;
              try {
                backendResponse = await response.json();
                console.log(
                  "completeReturn: backend response:",
                  backendResponse,
                );
              } catch (e) {
                console.warn(
                  "completeReturn: could not parse response JSON",
                  e,
                );
              }
              break;
            } else {
              const txt = await response.text().catch(() => "<no-body>");
              console.warn(
                "completeReturn: PATCH failed",
                url,
                response.status,
                txt,
              );
            }
          } catch (e) {
            console.warn("completeReturn: fetch error for", url, e);
            continue;
          }
        }

        if (!backendSuccess) {
          console.error("completeReturn: all backend attempts failed");
        }
      } catch (error) {
        console.error(
          "completeReturn: error marking return in backend:",
          error,
        );
      }

      // Also update localStorage for backwards compatibility
      let queue = JSON.parse(localStorage.getItem("phyLab_RequestQueue")) || [];
      let history = JSON.parse(localStorage.getItem("phyLab_History")) || [];

      const itemIndex = queue.findIndex(
        (req) => String(req.id) === String(requestId),
      );

      if (itemIndex !== -1) {
        let itemToArchive = queue[itemIndex];

        if (itemToArchive.items && itemToArchive.items.length > 0) {
          const itemData = itemToArchive.items[0];
          const stockKey = "stock_" + (itemData.itemKey || itemData.name);

          const qtyToReturn = parseInt(itemData.quantity) || 1;

          let currentStock = parseInt(localStorage.getItem(stockKey)) || 0;
          localStorage.setItem(stockKey, currentStock + qtyToReturn);
          console.log(
            "completeReturn: restored stock for",
            stockKey,
            "new total:",
            currentStock + qtyToReturn,
          );
        }

        itemToArchive.actualReturnDate = new Date().toLocaleString();
        itemToArchive.status = "returned";

        history.push(itemToArchive);
        queue.splice(itemIndex, 1);

        localStorage.setItem("phyLab_History", JSON.stringify(history));
        localStorage.setItem("phyLab_RequestQueue", JSON.stringify(queue));
        console.log("completeReturn: updated localStorage, moved to history");
      } else if (backendSuccess && backendResponse) {
        console.log(
          "completeReturn: no local queue entry, creating from backend response",
        );
        // Backend succeeded but we have no local queue entry. Create a minimal
        // archive entry from the backend response (if available) so the
        // dashboard history / frequent-items chart can include this return.
        try {
          const orig =
            backendResponse.original_request || backendResponse || null;
          const archiveEntry = {
            id: (orig && (orig.id || orig.request_id)) || requestId,
            request_id:
              (orig && (orig.request_id || orig.requestId)) || requestId,
            studentName:
              (orig && (orig.student_name || orig.studentName)) || "",
            student_id: (orig && (orig.student_id || orig.studentId)) || "",
            email: (orig && orig.email) || "",
            teacher_name: (orig && orig.teacher_name) || "",
            borrow_date: (orig && orig.borrow_date) || "",
            return_date: (orig && orig.return_date) || "",
            status: "returned",
            actualReturnDate: new Date().toLocaleString(),
            items: [],
          };

          if (orig && Array.isArray(orig.items)) {
            const returnedItem = orig.items.find(
              (it) => String(it.id) === String(itemId),
            );
            if (returnedItem) {
              const itemObj = {
                id: returnedItem.id,
                name: returnedItem.item_name || returnedItem.name || "",
                itemKey: returnedItem.item_key || returnedItem.itemKey || "",
                quantity: returnedItem.quantity || 1,
                item_image: returnedItem.item_image || returnedItem.image || "",
                status: returnedItem.status || "returned",
              };
              archiveEntry.items.push(itemObj);

              // restore stock in localStorage
              const stockKey = "stock_" + (itemObj.itemKey || itemObj.name);
              const qtyToReturn = parseInt(itemObj.quantity) || 1;
              let currentStock = parseInt(localStorage.getItem(stockKey)) || 0;
              localStorage.setItem(stockKey, currentStock + qtyToReturn);
              console.log(
                "completeReturn: restored stock from backend data for",
                stockKey,
              );
            }
          }

          history.push(archiveEntry);
          localStorage.setItem("phyLab_History", JSON.stringify(history));
          console.log(
            "completeReturn: created archive entry from backend data",
          );
        } catch (e) {
          console.warn(
            "completeReturn: failed to archive returned item from backend payload",
            e,
          );
        }
      }

      if (backendSuccess) {
        showNotification(
          "Item returned successfully! Now visible in History page.",
          "success",
        );
      } else {
        showNotification(
          "Item marked as returned locally. Backend update failed.",
          "warning",
        );
      }

      // Reload the active loans page to remove the returned item
      console.log("completeReturn: reloading active loans display");
      loadReturnWindow();
      if (typeof loadStockFromMemory === "function") loadStockFromMemory();
      if (typeof loadDashboardStats === "function") loadDashboardStats();
      if (typeof initLiveChart === "function") initLiveChart();

      console.log("completeReturn: complete!");
    },
  );
}

async function openBorrowingDetails(requestId) {
  // Try to fetch from backend API first
  let request = null;

  try {
    const urls = [
      window.PHYLAB_API && typeof window.PHYLAB_API === "function"
        ? window.PHYLAB_API(`/api/borrow-requests/${requestId}/`)
        : `/api/borrow-requests/${requestId}/`,
      `/api/borrow-requests/${requestId}/`,
    ];

    let response = null;
    const token = sessionStorage.getItem("auth_token");
    for (const url of urls) {
      try {
        const options = { method: "GET", mode: "cors" };
        if (token) options.headers = { Authorization: "Token " + token };
        else options.credentials = "include";

        response = await fetch(url, options);
        if (response.ok) break;
      } catch (e) {
        continue;
      }
    }

    if (response && response.ok) {
      const data = await response.json();
      // Normalize backend response — map common server field names to frontend view model
      request = {
        id: data.id,
        requestId: data.request_id || data.requestId || data.id,
        studentName:
          data.student_name ||
          data.studentName ||
          data.full_name ||
          data.fullname ||
          "",
        studentID: data.student_id || data.studentId || data.id_number || "",
        email: data.email || data.student_email || "",
        studentPhone:
          data.student_phone ||
          data.phone ||
          data.contact ||
          data.student_phone_number ||
          "",
        studentDepartment: data.department || data.student_department || "",
        teacherName: data.teacher_name || data.teacherName || "",
        teacherEmail: data.teacher_email || data.teacher_email_address || "",
        teacherPhone: data.teacher_phone || data.teacher_phone_number || "",
        purpose: data.purpose || data.reason || "",
        borrowDate: data.borrow_date || data.borrowDate || "",
        returnDate: data.return_date || data.returnDate || "",
        status: data.status || "",
        adminRemark: data.admin_remark
          ? {
              type: data.remark_type || data.admin_remark_type || "",
              text: data.admin_remark,
              createdAt:
                data.remark_created_at || data.admin_remark_created_at || null,
            }
          : null,
        items: (data.items || []).map((item) => ({
          id: item.id,
          name: item.item_name || item.name || "",
          itemKey: item.item_key || item.itemKey || "",
          quantity: item.quantity || 1,
          image: item.item_image || item.image || "",
          description:
            item.description || item.item_description || item.item_desc || "",
          status: item.status || "pending",
          admin_remark: item.admin_remark || item.remark || "",
          remark_type: item.remark_type || null,
          remark_created_at: item.remark_created_at || null,
        })),
      };
    }
  } catch (error) {
    console.error("Error fetching request details from backend:", error);
  }

  // Fallback to localStorage if backend fetch failed
  if (!request) {
    const allRequests =
      JSON.parse(localStorage.getItem("phyLab_RequestQueue")) || [];
    const history = JSON.parse(localStorage.getItem("phyLab_History")) || [];
    request = [...allRequests, ...history].find(
      (r) => String(r.id) === String(requestId),
    );
  }

  if (!request) {
    showNotification("Details not found.", "error");
    return;
  }

  const item =
    request.items && request.items.length > 0 ? request.items[0] : {};

  document.getElementById("det-item-name").innerText = item.name || "N/A";
  document.getElementById("det-item-img").src = item.image || "default.png";
  document.getElementById("det-description").innerText =
    item.description || "Physics Lab Equipment";
  document.getElementById("det-inv-id").innerText =
    request.id || request.requestId || "N/A";
  const headerReqEl = document.getElementById("det-request-id-header");
  if (headerReqEl)
    headerReqEl.innerText = request.requestId || request.id || "—";
  document.getElementById("det-condition").innerText = "Good";

  document.getElementById("det-borrower-name").innerText =
    request.studentName || "N/A";
  document.getElementById("det-borrower-id").innerText =
    "ID: " +
    (request.studentID || request.studentId || request.student_id || "N/A");
  document.getElementById("det-email").innerText = request.email || "N/A";
  const requestIdEl = document.getElementById("det-request-id");
  if (requestIdEl)
    requestIdEl.innerText = request.requestId || request.id || "N/A";

  document.getElementById("det-teacher").innerText =
    request.teacherName || "N/A";

  document.getElementById("det-borrow-date").innerText =
    request.borrowDate || "N/A";
  document.getElementById("det-return-date").innerText =
    request.returnDate || "N/A";
  document.getElementById("det-purpose").innerText =
    request.purpose || "No purpose stated.";

  const statusEl = document.getElementById("det-status");
  const currentStatus = (request.status || "borrowed").toString().toLowerCase();
  statusEl.innerText = currentStatus.toUpperCase();
  statusEl.className = `status-tag status-${currentStatus}`;

  // Show admin remark if exists
  const remarks = JSON.parse(localStorage.getItem("phyLab_Remarks")) || {};
  const remark = remarks[requestId] || request.adminRemark;
  const remarkSection = document.getElementById("det-remark-section");

  if (remark && (remark.type || remark.text)) {
    remarkSection.style.display = "block";
    document.getElementById("det-remark-type").textContent =
      getRemarkTypeLabel(remark.type) || "";
    document.getElementById("det-remark-text").textContent =
      remark.text || "No description provided.";

    const remarkDate = remark.createdAt
      ? new Date(remark.createdAt).toLocaleString()
      : "";
    document.getElementById("det-remark-meta").textContent = remarkDate
      ? `Added: ${remarkDate}`
      : "";
  } else {
    remarkSection.style.display = "none";
  }

  document.getElementById("Borrowing-Details-window").style.display = "flex";
}

// Expose to global scope so it can be called from admin-history.js
window.openBorrowingDetails = openBorrowingDetails;

// Send reminder email handler
function initSendReminderHandler() {
  const btn = document.getElementById("sendReminderBtn");
  if (!btn) return;

  btn.onclick = function () {
    const borrowerEmail = document.getElementById("det-email").innerText;

    if (borrowerEmail === "---" || !borrowerEmail.includes("@")) {
      showNotification("No valid email address found.", "error");
      return;
    }

    this.innerText = "Sending...";
    this.disabled = true;

    const itemName = document.getElementById("det-item-name").innerText;
    const borrowerName = document.getElementById("det-borrower-name").innerText;
    const returnDate = document.getElementById("det-return-date").innerText;

    const templateParams = {
      subject: `Reminder: Return ${itemName}`,
      to_email: borrowerEmail,
      to_name: borrowerName,
      student_name: borrowerName,
      status: "",
      item_details: "",
      item_name: itemName,
      return_date: returnDate,
      message_html: `<p>Hi ${borrowerName},</p>
        <p>This is a friendly reminder to return <strong>${itemName}</strong> by <strong>${returnDate}</strong>.</p>
        <p>Please contact us if you need an extension.</p>
        <p>Thanks,<br/>PhyLab Team</p>`,
      logo_url: `${window.location.origin}/Phylab.png`,
      company_url: window.location.origin,
      company_email: "support@" + window.location.hostname,
    };

    safeSendEmail(EMAILJS_SERVICE_ID, EMAILJS_SHARED_TEMPLATE, templateParams)
      .then(() => {
        this.innerText = "Send Reminder";
        this.disabled = false;
        showNotification("Reminder sent successfully!", "success");
      })
      .catch((err) => {
        console.error("EmailJS send error", err);
        this.innerText = "Send Reminder";
        this.disabled = false;
        showNotification("Failed to send reminder.", "error");
      });
  };
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", initSendReminderHandler);

// Event delegation for return buttons to ensure handler works even if
// inline onclick handlers fail (e.g. non-global function scope).
document.addEventListener("click", function (e) {
  const btn = e.target.closest && e.target.closest(".return-btn");
  if (!btn) return;
  const requestId = btn.getAttribute("data-request-id");
  const itemId = btn.getAttribute("data-item-id");
  if (requestId && itemId) {
    completeReturn(requestId, itemId);
  }
});
