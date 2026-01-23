// ===== REQUEST HISTORY COMPONENT =====

import { getSessionUser } from "./user-utils.js";

/**
 * Load and display user's request history
 */
export async function loadUserRequests() {
  const container = document.getElementById("myRequestsContainer");
  if (!container) return;

  container.innerHTML = "";
  const sessionUser = getSessionUser();
  const userEmail = sessionUser.email || "";
  const userId = sessionUser.idNumber || sessionUser.id || "";

  let userRequests = [];

  // Try to fetch from backend first
  try {
    const urls = [
      `http://127.0.0.1:8000/api/borrow-requests/?student_id=${encodeURIComponent(userId)}`,
      `/api/borrow-requests/?student_id=${encodeURIComponent(userId)}`,
    ];

    for (let url of urls) {
      try {
        const resp = await fetch(url, { method: "GET", mode: "cors" });
        if (resp && resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data)) {
            userRequests = data.map((r) => ({
              id: r.request_id || r.id || "",
              studentName: r.student_name || "",
              email: r.email || "",
              items: r.items || [],
              borrowDate: r.borrow_date || "",
              returnDate: r.return_date || "",
              status: r.status || "pending",
              timestamp: r.created_at || r.timestamp || "",
            }));
            break;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch from", url, err);
      }
    }
  } catch (err) {
    console.warn("Error fetching borrow requests from backend:", err);
  }

  // Fallback to localStorage if backend unavailable
  if (userRequests.length === 0) {
    const queue = JSON.parse(localStorage.getItem("phyLab_RequestQueue")) || [];
    const history = JSON.parse(localStorage.getItem("phyLab_History")) || [];

    function parseTime(val) {
      if (!val && val !== 0) return 0;
      if (typeof val === "number") return val;
      const asNum = Number(val);
      if (!isNaN(asNum)) return asNum;
      const dt = Date.parse(val);
      return isNaN(dt) ? 0 : dt;
    }

    const all = queue
      .concat(history)
      .sort((a, b) => parseTime(b.timestamp) - parseTime(a.timestamp));

    userRequests = all.filter((r) => {
      if (!r) return false;
      if (userEmail && r.email && r.email === userEmail) return true;
      if (userId && r.studentID && String(r.studentID) === String(userId))
        return true;
      if (
        sessionUser.fullname &&
        r.studentName &&
        r.studentName === sessionUser.fullname
      )
        return true;
      return false;
    });
  }

  if (userRequests.length === 0) {
    container.innerHTML =
      '<div style="padding:20px; color:#666;">You have no requests yet.</div>';
    return;
  }

  userRequests.forEach((req) => {
    const card = document.createElement("div");
    card.className = "request-card";
    const status = (req.status || "pending").toLowerCase();

    const items = req.items || [];
    const visible = items
      .slice(0, 3)
      .map((it) => `${it.name || it.item_name} × ${it.quantity}`);
    const moreCount = Math.max(0, items.length - visible.length);
    const itemsHtml =
      visible.join(", ") +
      (moreCount ? ` <span class="more-items">+${moreCount} more</span>` : "");

    const metaHtml = `
      <div class="request-meta">
        <div class="request-meta-left">
          <div class="request-id">${req.id || ""}</div>
          <div class="request-timestamp">${req.timestamp || ""}</div>
        </div>
        <span class="request-status ${status}">${status.toUpperCase()}</span>
      </div>`;

    card.innerHTML = `
      <div class="request-info">
        <div class="request-top">
          <div class="request-user">${req.studentName || req.email || "You"}</div>
          <div class="request-dates">Borrow: ${req.borrowDate || "N/A"} • Return: ${req.returnDate || "N/A"}</div>
        </div>
        <div class="request-items">${itemsHtml}</div>
      </div>
      ${metaHtml}
    `;
    container.appendChild(card);
  });
}

/**
 * Initialize request history component
 */
export function initRequestHistory() {
  loadUserRequests();
}
