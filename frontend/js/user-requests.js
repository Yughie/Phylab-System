// ===== REQUEST HISTORY COMPONENT =====

import { getSessionUser } from "./user-utils.js";

function parseTime(val) {
  if (!val && val !== 0) return 0;
  if (typeof val === "number") return val;
  const asNum = Number(val);
  if (!isNaN(asNum)) return asNum;
  const dt = Date.parse(val);
  return isNaN(dt) ? 0 : dt;
}

function formatTimestamp(val) {
  if (!val && val !== 0) return "";
  let ms = null;
  if (typeof val === "number") ms = val;
  else if (typeof val === "string") {
    const asNum = Number(val);
    if (!isNaN(asNum)) ms = asNum;
    else {
      const dt = Date.parse(val);
      if (!isNaN(dt)) ms = dt;
    }
  } else if (val instanceof Date) ms = val.getTime();
  if (!ms) return "";

  try {
    const d = new Date(ms);
    const now = Date.now();
    const diff = Math.floor((now - d.getTime()) / 1000); // seconds
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleString();
  } catch (e) {
    return String(val);
  }
}

function formatDateOnly(val) {
  if (!val) return "N/A";
  let ms = null;
  if (typeof val === "number") ms = val;
  else if (typeof val === "string") {
    const asNum = Number(val);
    if (!isNaN(asNum)) ms = asNum;
    else {
      const dt = Date.parse(val);
      if (!isNaN(dt)) ms = dt;
    }
  } else if (val instanceof Date) ms = val.getTime();
  if (!ms) return String(val);
  try {
    return new Date(ms).toLocaleDateString();
  } catch (e) {
    return String(val);
  }
}

// In-memory index of requests for quick lookup when opening modal
const requestsById = new Map();

// Create modal markup and styles (idempotent)
function ensureRequestModal() {
  if (document.getElementById("requestDetailModalOverlay")) return;
  const style = document.createElement("style");
  style.textContent = `
  .request-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.48);display:flex;align-items:center;justify-content:center;z-index:1200}
  .request-modal{background:var(--bg-surface);max-width:880px;width:94%;border-radius:14px;padding:22px;box-shadow:var(--shadow-lg);font-family:var(--font-family);color:var(--color-text)}
  .request-modal-header{position:relative;text-align:center;margin-bottom:8px}
  .request-modal-close{position:absolute;right:12px;top:8px;background:transparent;border:0;font-size:20px;cursor:pointer;color:var(--color-text-light)}
  .phylab-logo{font-weight:900;color:var(--color-primary);font-size:28px;letter-spacing:0.4px}
  .request-modal-body{max-height:66vh;overflow:auto;padding-top:6px}
  .request-top-row{display:flex;gap:18px;align-items:flex-start;margin-bottom:10px}
  .request-meta-left{min-width:240px;flex:0 0 280px}
  .request-meta-grid{flex:1;display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
  .request-meta-grid .meta-row{font-size:13px;color:var(--color-text-light);word-break:break-word}
  .request-meta-row{font-size:13px;color:var(--color-text-light);margin:4px 0}
  .request-items-list{margin:8px 0;padding-left:0;list-style:none}
  .request-item-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px dashed rgba(0,0,0,0.03)}
  .request-item-thumb{width:72px;height:54px;object-fit:cover;border-radius:8px;border:1px solid var(--border-color);flex:0 0 72px}
  .request-item-details{flex:1;display:flex;flex-direction:column;gap:6px}
  .request-item-details .item-name{font-weight:600;color:var(--color-text)}
  .request-item-details .item-qty{font-size:13px;color:var(--color-text-light)}
  @media (max-width:720px){
    .request-meta-grid{grid-template-columns:1fr}
    .request-meta-left{flex-basis:100%}
    .request-top-row{flex-direction:column}
    .phylab-logo{font-size:22px}
  }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "requestDetailModalOverlay";
  overlay.className = "request-modal-overlay";
  overlay.style.display = "none";

  overlay.innerHTML = `
    <div class="request-modal" role="dialog" aria-modal="true">
      <div class="request-modal-header">
        <button class="request-modal-close" id="requestModalClose">✕</button>
        <div class="phylab-logo">PhyLab</div>
      </div>
      <div class="request-modal-body" id="requestModalBody">
        <div class="request-top-row">
          <div class="request-meta-left">
            <div class="request-meta-row"><strong id="requestModalTitle">Request details</strong></div>
            <div class="request-meta-row"><span id="requestModalId"></span></div>
            <div class="request-meta-row"><span id="requestModalUser"></span></div>
            <div class="request-meta-row"><span id="requestModalTimestamp"></span></div>
            <div class="request-meta-row"><span id="requestModalStatus"></span></div>
          </div>
          <div id="requestModalSummary" class="request-meta-grid"></div>
        </div>
        <hr />
        <div><strong>Items</strong></div>
        <ul class="request-items-list" id="requestModalItems"></ul>
        <div style="margin-top:8px;" id="requestModalNotes"></div>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  // Close handlers
  const close = () => hideRequestModal();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.getElementById("requestModalClose").addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideRequestModal();
  });
}

function showRequestModal(req) {
  // Ensure injected styles exist (idempotent)
  ensureRequestModal();

  // If history modal exists on the page, render details into its top pane
  const historyModal = document.getElementById("historyModal");
  const detailPane = document.getElementById("historyDetailPane");
  if (historyModal && detailPane) {
    // Build professional detail layout
    const statusClass = (req.status || "pending").toLowerCase();
    const items = req.items || [];
    const makeMeta = (label, val) =>
      `<div class=\"meta-item\"><strong>${label}:</strong> ${val || "N/A"}</div>`;

    let html = `
      <div class="hd-top">
        <div class="hd-left">
          <div class="hd-title">Request ${req.id || ""}</div>
          <div class="hd-sub">${req.studentName || req.email || "You"} • ${formatTimestamp(req.timestamp) || ""}</div>
          <div class="hd-meta">
            ${makeMeta("Teacher", req.teacher_name)}
            ${makeMeta("Purpose", req.purpose)}
            ${makeMeta("Email", req.email)}
            ${makeMeta("Borrow", formatDateOnly(req.borrowDate || req.borrow_date))}
            ${makeMeta("Return", formatDateOnly(req.returnDate || req.return_date))}
            ${makeMeta("Admin remark", req.admin_remark)}
          </div>
        </div>
        <div class="hd-right">
          <div class="request-status ${statusClass}">${(req.status || "").toUpperCase()}</div>
        </div>
      </div>
      <div class="hd-items">
        ${items
          .map(
            (it) => `
              <div class="hd-item">
                <img src="${(it.item_image || it.image || it.image_url || "").replace(/"/g, "") || ""}" alt="" onerror="this.style.visibility='hidden'" />
                <div>
                  <div style="font-weight:700">${it.name || it.item_name || "Item"}</div>
                  <div style="color:#64748b; font-size:13px">Qty: ${it.quantity || 1}</div>
                </div>
              </div>`,
          )
          .join("")}
      </div>
      <div class="hd-notes">${req.notes || req.comment || ""}</div>
      <div class="hd-actions" style="margin-top:12px">
        <button type="button" class="detail-close-btn detail-close-action">Close details</button>
      </div>
    `;

    detailPane.innerHTML = html;
    detailPane.style.display = "block";
    // wire close button
    const closeBtn = detailPane.querySelector(".detail-close-action");
    if (closeBtn)
      closeBtn.addEventListener("click", () => {
        detailPane.style.display = "none";
        const historyBtn = document.getElementById("historyToggleButton");
        if (historyBtn) historyBtn.focus();
      });
    // show modal and scroll top of body
    historyModal.classList.add("show");
    historyModal.setAttribute("aria-hidden", "false");
    const body = document.getElementById("myRequestsContainer");
    if (body) body.scrollTop = 0;
    return;
  }

  // Fallback: populate the standalone detail overlay
  const overlay = document.getElementById("requestDetailModalOverlay");
  if (!overlay) return;
  document.getElementById("requestModalTitle").textContent =
    `Request ${req.id || ""}`;
  document.getElementById("requestModalId").textContent =
    `ID: ${req.id || "(unknown)"}`;
  document.getElementById("requestModalUser").textContent =
    `User: ${req.studentName || req.email || "You"}`;
  document.getElementById("requestModalTimestamp").textContent =
    `Created: ${formatTimestamp(req.timestamp) || ""}`;
  document.getElementById("requestModalStatus").textContent =
    `Status: ${(req.status || "").toUpperCase()}`;
  const itemsNode = document.getElementById("requestModalItems");
  itemsNode.innerHTML = "";
  // Images: prepare collector (no bottom image grid used)
  const collected = new Set();
  const collectedUrls = [];
  function normalizeUrl(u) {
    if (!u || typeof u !== "string") return null;
    // if it's already absolute, return as-is
    if (/^https?:\/\//i.test(u)) return u;
    // if it starts with // keep protocol-relative
    if (/^\/\//.test(u)) return window.location.protocol + u;
    // if it starts with /, prefix origin
    if (u.startsWith("/")) return window.location.origin + u;
    // otherwise return as-is (may be relative)
    return u;
  }
  function pushUrl(u) {
    const nu = normalizeUrl(u);
    if (!nu) return;
    if (collected.has(nu)) return;
    collected.add(nu);
    collectedUrls.push(nu);
  }

  // For each item render a row with thumbnail (if available) and details
  (req.items || []).forEach((it, index) => {
    // If we rendered into history modal detail pane, items were already added above and we returned earlier.
    const li = document.createElement("li");
    li.className = "request-item-row";

    const thumb = document.createElement("img");
    thumb.className = "request-item-thumb";
    // discover candidate image for this item
    const itemImg =
      it.item_image ||
      it.image ||
      it.image_url ||
      it.photo ||
      (it.attachments && it.attachments[0] && it.attachments[0].url) ||
      null;
    if (itemImg) {
      const n = normalizeUrl(itemImg);
      if (n) thumb.src = n;
      thumb.alt = it.name || it.item_name || `item-${index}`;
      thumb.addEventListener("click", () =>
        window.open(normalizeUrl(itemImg) || itemImg, "_blank"),
      );
      // also collect for the global images grid
      try {
        pushUrl(itemImg);
      } catch (e) {
        /* ignore */
      }
    } else {
      // invisible placeholder to keep alignment
      thumb.style.visibility = "hidden";
    }

    const details = document.createElement("div");
    details.className = "request-item-details";
    const name = document.createElement("div");
    name.className = "item-name";
    name.textContent = it.name || it.item_name || "Item";
    const qty = document.createElement("div");
    qty.className = "item-qty";
    qty.textContent = `Quantity: ${it.quantity || 1}`;
    if (it.note || it.description) {
      const note = document.createElement("div");
      note.className = "item-note";
      note.style.fontSize = "13px";
      note.style.color = "var(--color-text-light)";
      note.textContent = it.note || it.description;
      details.appendChild(name);
      details.appendChild(qty);
      details.appendChild(note);
    } else {
      details.appendChild(name);
      details.appendChild(qty);
    }

    li.appendChild(thumb);
    li.appendChild(details);
    itemsNode.appendChild(li);
  });
  const notes = document.getElementById("requestModalNotes");
  notes.textContent = req.notes || req.comment || "";
  // common container fields
  const maybeArrays = [
    req.images,
    req.attachments,
    req.photos,
    req.image_urls,
    req.imageUrls,
  ];
  maybeArrays.forEach((arr) => {
    if (Array.isArray(arr))
      arr.forEach((a) => {
        if (typeof a === "string") pushUrl(a);
        else if (a && a.url) pushUrl(a.url);
      });
  });
  // items may contain images
  (req.items || []).forEach((it) => {
    if (it.item_image) pushUrl(it.item_image);
    if (it.image) pushUrl(it.image);
    if (it.image_url) pushUrl(it.image_url);
    if (it.photo) pushUrl(it.photo);
  });
  // single url fields
  ["image", "image_url", "photo", "attachment"].forEach((k) => {
    if (req[k]) pushUrl(req[k]);
  });
  // Do not append the global images grid (we render per-item images inline)
  // Move extra details to the header/meta area so they appear at the top
  const metaSummary = document.getElementById("requestModalSummary");
  if (metaSummary) {
    metaSummary.innerHTML = "";
    const makeRow = (label, value) => {
      const row = document.createElement("div");
      const lbl = document.createElement("strong");
      lbl.textContent = label + ": ";
      const val = document.createElement("span");
      val.textContent = value || "N/A";
      row.appendChild(lbl);
      row.appendChild(val);
      return row;
    };
    metaSummary.appendChild(makeRow("Teacher", req.teacher_name));
    metaSummary.appendChild(makeRow("Purpose", req.purpose));
    metaSummary.appendChild(makeRow("Email", req.email));
    metaSummary.appendChild(
      makeRow("Borrow", formatDateOnly(req.borrowDate || req.borrow_date)),
    );
    metaSummary.appendChild(
      makeRow("Return", formatDateOnly(req.returnDate || req.return_date)),
    );
    metaSummary.appendChild(makeRow("Admin remark", req.admin_remark));
    metaSummary.appendChild(makeRow("Remark type", req.remark_type));
  }
  overlay.style.display = "flex";
}

function hideRequestModal() {
  const overlay = document.getElementById("requestDetailModalOverlay");
  if (overlay) overlay.style.display = "none";
}

// Expose for debugging
window.showRequestModal = showRequestModal;
window.hideRequestModal = hideRequestModal;
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
    const baseUrl =
      window.PHYLAB_API && typeof window.PHYLAB_API === "function"
        ? window.PHYLAB_API(
            `/api/borrow-requests/?student_id=${encodeURIComponent(userId)}`,
          )
        : `/api/borrow-requests/?student_id=${encodeURIComponent(userId)}`;

    const urls = [
      baseUrl,
      `/api/borrow-requests/?student_id=${encodeURIComponent(userId)}`,
    ];

    const token = sessionStorage.getItem("auth_token");
    for (let url of urls) {
      try {
        console.debug("loadUserRequests: fetching", url);
        const options = { method: "GET", mode: "cors" };
        if (token) options.headers = { Authorization: "Token " + token };
        else options.credentials = "include";
        const resp = await fetch(url, options);
        console.debug("loadUserRequests: response", url, resp && resp.status);
        if (resp && resp.ok) {
          const data = await resp.json();
          console.debug("loadUserRequests: response data", url, data);
          if (Array.isArray(data)) {
            userRequests = data.map((r) => ({
              id: r.request_id || r.id || "",
              studentName: r.student_name || r.studentName || "",
              email: r.email || r.email_address || "",
              items: r.items || [],
              borrowDate: r.borrow_date || r.borrowDate || "",
              returnDate: r.return_date || r.returnDate || "",
              status: r.status || "pending",
              timestamp: r.created_at || r.timestamp || "",
              teacher_name: r.teacher_name || r.teacherName || "",
              purpose: r.purpose || "",
              admin_remark: r.admin_remark || r.adminRemark || "",
              remark_type: r.remark_type || r.remarkType || "",
            }));
            console.info(
              "loadUserRequests: loaded",
              userRequests.length,
              "requests from",
              url,
            );
            break;
          } else {
            console.warn(
              "loadUserRequests: backend returned non-array for",
              url,
            );
          }
        } else {
          console.warn(
            "loadUserRequests: fetch not ok for",
            url,
            resp && resp.status,
          );
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

    // Normalize possible camelCase keys from localStorage into expected snake_case
    userRequests = userRequests.map((r) => ({
      ...r,
      teacher_name: r.teacher_name || r.teacherName || r.teacherName || "",
      purpose: r.purpose || r.purpose || "",
      admin_remark: r.admin_remark || r.adminRemark || "",
      remark_type: r.remark_type || r.remarkType || "",
    }));
  }

  if (userRequests.length === 0) {
    container.innerHTML =
      '<div style="padding:20px; color:#666;">You have no requests yet.</div>';
    return;
  }

  userRequests.forEach((req, idx) => {
    const card = document.createElement("div");
    card.className = "request-card";
    const rid = req.id || `local-${idx}`;
    requestsById.set(rid, req);
    card.dataset.reqId = rid;
    card.style.cursor = "pointer";
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
            <div class="request-timestamp">${formatTimestamp(req.timestamp) || ""}</div>
          </div>
          <span class="request-status ${status}">${status.toUpperCase()}</span>
        </div>`;

    card.innerHTML = `
      <div class="request-info">
        <div class="request-top">
          <div class="request-user">${req.studentName || req.email || "You"}</div>
          <div class="request-dates">Borrow: ${formatDateOnly(req.borrowDate) || "N/A"} • Return: ${formatDateOnly(req.returnDate) || "N/A"}</div>
        </div>
        <div class="request-items">${itemsHtml}</div>
      </div>
      ${metaHtml}
    `;
    card.addEventListener("click", () => {
      showRequestModal(Object.assign({}, req, { id: rid }));
    });
    container.appendChild(card);
  });

  // Expose the loaded requests and index for debugging in the browser console
  try {
    window._userRequests = userRequests;
    // convert Map to plain object for easier console inspection
    const mapObj = {};
    for (const [k, v] of requestsById.entries()) mapObj[k] = v;
    window._requestsById = mapObj;
  } catch (e) {
    /* ignore read-only environments */
  }
}

/**
 * Initialize request history component
 */
export function initRequestHistory() {
  loadUserRequests();
}

// Expose for debugging in browser console
window.loadUserRequests = loadUserRequests;
