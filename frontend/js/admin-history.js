// Admin: Request History page
console.log("admin-history.js loaded");

async function fetchHistoryFromBackend() {
  // Try a few possible backend endpoints (local first, then same-origin)
  const urls = [
    (window.PHYLAB_API && typeof window.PHYLAB_API === 'function')
      ? window.PHYLAB_API('/api/borrow-requests/history/')
      : '/api/borrow-requests/history/',
    "/api/borrow-requests/history/",
    (window.PHYLAB_API && typeof window.PHYLAB_API === 'function')
      ? window.PHYLAB_API('/api/borrow-requests/?status=returned')
      : '/api/borrow-requests/?status=returned',
    "/api/borrow-requests/?status=returned",
  ];

  console.log("fetchHistoryFromBackend: will try", urls.length, "URLs");

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      console.log(`admin-history: fetching (${i + 1}/${urls.length})`, url);
      const controller = new AbortController();
      const timeoutMs = 8000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let resp;
      try {
        resp = await fetch(url, { mode: "cors", signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!resp) {
        console.warn("admin-history: no response for", url);
        continue;
      }

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "<unreadable>");
        console.warn(
          `admin-history: ${url} returned status ${resp.status}`,
          txt.substring(0, 200),
        );
        continue;
      }

      // Try to parse JSON
      let data = null;
      try {
        data = await resp.json();
      } catch (err) {
        const txt = await resp.text().catch(() => "<unreadable>");
        console.warn(
          `admin-history: ${url} returned non-JSON body:`,
          txt.substring(0, 200),
        );
        continue;
      }

      // Accept either top-level array or { results: [] } patterns
      if (Array.isArray(data)) {
        console.log(
          `admin-history: success from ${url} — ${data.length} records`,
        );
        return data;
      }
      if (data && Array.isArray(data.results)) {
        console.log(
          `admin-history: success (results) from ${url} — ${data.results.length} records`,
        );
        return data.results;
      }

      console.warn("admin-history: backend returned non-array JSON", data);
    } catch (err) {
      if (err && err.name === "AbortError") {
        console.error(`admin-history: fetch timeout for ${url}`);
      } else {
        console.error(
          `admin-history: fetch error for ${url}:`,
          err && err.message ? err.message : err,
        );
      }
      continue;
    }
  }

  console.error("admin-history: all fetch attempts failed or returned no data");
  return null;
}

function normalizeBackendRecord(r) {
  return {
    id: r.id || r.request_id || r.requestId || "",
    studentName: r.student_name || r.studentName || r.full_name || "",
    email: r.email || r.student_email || "",
    borrowDate: r.borrow_date || r.borrowDate || "",
    returnDate: r.return_date || r.returnDate || "",
    status: r.status || "returned",
    items: r.items || [],
    admin_remark: r.admin_remark || r.adminRemark || "",
    timestamp: r.created_at || r.timestamp || null,
  };
}

function escapeHtml(s) {
  if (s === undefined || s === null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderHistoryList(records, containerEl) {
  console.log(
    "renderHistoryList called with",
    records ? records.length : "null",
    "records",
  );
  const container =
    containerEl || document.getElementById("adminHistoryContainer");
  if (!container) {
    console.error("renderHistoryList: adminHistoryContainer not found!");
    return;
  }
  container.innerHTML = "";

  if (!records || records.length === 0) {
    console.warn("renderHistoryList: No records to display");
    container.innerHTML =
      '<div class="empty-state"><p>No history found</p></div>';
    return;
  }

  console.log(
    "renderHistoryList: Building HTML for",
    records.length,
    "cards...",
  );
  records.forEach((rec, index) => {
    const id = rec.id || "N/A";
    const borrower = escapeHtml(rec.studentName || rec.email || "Unknown");
    const dates = `Borrow: ${escapeHtml(rec.borrowDate || "N/A")} • Return: ${escapeHtml(
      rec.returnDate || "N/A",
    )}`;
    const items = Array.isArray(rec.items) ? rec.items.length : 0;

    const html = `
      <div class="history-card">
        <div class="history-card-main">
          <div class="history-id">${escapeHtml(id)}</div>
          <div class="history-borrower">${borrower}</div>
          <div class="history-dates">${dates}</div>
        </div>
        <div class="history-card-actions">
          <div class="history-items">Items: ${items}</div>
          <button class="btn btn-small details-btn" data-req-id="${escapeHtml(id)}">Details</button>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", html);
    console.log(
      `  Card ${index + 1}/${records.length} added: ID=${id}, Borrower=${rec.studentName}`,
    );
  });

  console.log(
    "renderHistoryList: All cards added to DOM, attaching event handlers...",
  );
  // attach handlers
  container.querySelectorAll(".details-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const rid = btn.getAttribute("data-req-id");
      try {
        if (typeof openBorrowingDetails === "function") {
          openBorrowingDetails(rid);
        } else if (typeof window.openBorrowingDetails === "function") {
          window.openBorrowingDetails(rid);
        } else {
          alert("Details not available.");
        }
      } catch (err) {
        console.warn("openBorrowingDetails failed", err);
      }
    });
  });
  console.log(
    "renderHistoryList: Event handlers attached, rendering complete!",
  );
}

// Render a flattened list of returned items (one card per item)
function renderReturnedItems(records, containerEl) {
  console.log(
    "renderReturnedItems called with",
    records ? records.length : "null",
    "records",
  );
  const container =
    containerEl || document.getElementById("adminHistoryContainer");
  if (!container) {
    console.error("renderReturnedItems: adminHistoryContainer not found!");
    return;
  }
  container.innerHTML = "";

  // Build flattened items array with parent request metadata
  const items = [];
  (records || []).forEach((rec) => {
    const parent = {
      requestId: rec.id || rec.request_id || rec.requestId || "",
      studentName: rec.studentName || rec.student_name || rec.email || "",
      returnDate: rec.returnDate || rec.return_date || "",
    };
    if (Array.isArray(rec.items)) {
      rec.items.forEach((it) => {
        items.push(Object.assign({ parentRequest: parent }, it));
      });
    }
  });

  if (items.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><p>No returned items found</p></div>';
    return;
  }

  items.forEach((it, idx) => {
    const id = it.id || "N/A";
    const name = escapeHtml(
      it.item_name || it.name || it.itemName || "Unknown",
    );
    const req = it.parentRequest || {};
    const borrower = escapeHtml(req.studentName || req.email || "Unknown");
    const dates = `Return: ${escapeHtml(req.returnDate || it.remark_created_at || "N/A")}`;
    const img = it.item_image || it.image || "";

    const html = `
      <div class="history-card item-card">
        <div class="history-card-main">
          <div class="history-id">${escapeHtml(id)}</div>
          <div class="history-borrower">${name}</div>
          <div class="history-dates">${dates}</div>
        </div>
        <div class="history-card-actions">
          <div class="history-items">Request: ${escapeHtml(req.requestId || req.request_id || "-")}</div>
          <div class="history-borrower">Borrower: ${borrower}</div>
          <button class="btn btn-small details-btn" data-req-id="${escapeHtml(req.requestId || req.request_id || "")}">Details</button>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", html);
  });

  // attach handlers
  container.querySelectorAll(".details-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const rid = btn.getAttribute("data-req-id");
      try {
        if (typeof openBorrowingDetails === "function") {
          openBorrowingDetails(rid);
        } else if (typeof window.openBorrowingDetails === "function") {
          window.openBorrowingDetails(rid);
        } else {
          alert("Details not available.");
        }
      } catch (err) {
        console.warn("openBorrowingDetails failed", err);
      }
    });
  });
  console.log("renderReturnedItems: rendered", items.length, "item cards");
}

async function loadAdminHistory() {
  console.log("loadAdminHistory called");
  const container = document.getElementById("adminHistoryContainer");
  if (!container) {
    console.error("adminHistoryContainer not found in DOM");
    return;
  }
  console.log("adminHistoryContainer found, showing loading state");
  container.innerHTML =
    '<div style="padding:20px; color:#666">Loading history...</div>';

  // Try backend
  let backend = null;
  let fetchError = null;
  try {
    console.log("Starting backend fetch...");
    backend = await fetchHistoryFromBackend();
    console.log("Backend fetch completed, result:", backend);
  } catch (e) {
    console.error("Backend fetch threw exception:", e);
    fetchError = e;
    backend = null;
  }

  if (backend && backend.length > 0) {
    console.log(
      "admin-history: Backend returned data! Normalizing",
      backend.length,
      "records...",
    );
    const normalized = backend.map(normalizeBackendRecord);
    console.log("admin-history: Normalized records:", normalized);
    console.log("admin-history: Calling renderHistoryList...");
    try {
      // Provide a small toggle UI to switch between request-level and item-level views
      const container = document.getElementById("adminHistoryContainer");
      const normalizedSorted = normalized.sort(
        (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
      );
      if (container) {
        container.innerHTML = `
          <div class="history-controls" style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
            <div class="history-toggle" role="tablist" aria-label="History view">
              <button id="historyViewRequests" class="btn btn-small fixed-width" aria-pressed="false">Requests</button>
              <button id="historyViewItems" class="btn btn-small fixed-width" aria-pressed="false">Returned Items</button>
            </div>
            <div class="history-search" style="flex:1;min-width:220px;">
              <input id="historySearchInput" type="search" placeholder="Search student, email, or request id" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-surface);" />
            </div>
            <div class="history-filter" style="display:flex;gap:8px;align-items:center">
              <select id="historyDateRange" style="padding:8px 10px;border-radius:8px;border:1px solid var(--border-color);background:white;">
                <option value="all">All dates</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </div>
          </div>
          <div id="historyViewContent"></div>
        `;

        const viewContent = document.getElementById("historyViewContent");
        const reqBtn = document.getElementById("historyViewRequests");
        const itemsBtn = document.getElementById("historyViewItems");
        const searchInput = document.getElementById("historySearchInput");
        const dateRange = document.getElementById("historyDateRange");

        let currentView = "items"; // 'items' or 'requests'

        function setActiveButton(view) {
          currentView = view;
          if (view === "requests") {
            reqBtn.classList.add("active");
            reqBtn.setAttribute("aria-pressed", "true");
            itemsBtn.classList.remove("active");
            itemsBtn.setAttribute("aria-pressed", "false");
          } else {
            itemsBtn.classList.add("active");
            itemsBtn.setAttribute("aria-pressed", "true");
            reqBtn.classList.remove("active");
            reqBtn.setAttribute("aria-pressed", "false");
          }
        }

        function applyFiltersAndRender() {
          const q = (searchInput.value || "").trim().toLowerCase();
          const days = dateRange.value;
          const now = new Date();

          const filtered = normalizedSorted.filter((rec) => {
            // date filter
            if (days !== "all") {
              const d = rec.timestamp ? new Date(rec.timestamp) : null;
              if (!d) return false;
              const diffDays = (now - d) / (1000 * 60 * 60 * 24);
              if (diffDays > Number(days)) return false;
            }
            if (!q) return true;
            // search fields
            const hay =
              `${rec.studentName || ""} ${rec.email || ""} ${rec.id || ""}`.toLowerCase();
            return hay.indexOf(q) !== -1;
          });

          // render according to current view
          viewContent.innerHTML = "";
          try {
            if (currentView === "requests")
              renderHistoryList(filtered, viewContent);
            else renderReturnedItems(filtered, viewContent);
          } catch (err) {
            console.error("applyFiltersAndRender error", err);
            viewContent.innerHTML =
              '<div class="empty-state"><p>Unable to render view</p></div>';
          }
        }

        reqBtn.addEventListener("click", () => {
          setActiveButton("requests");
          applyFiltersAndRender();
        });

        itemsBtn.addEventListener("click", () => {
          setActiveButton("items");
          applyFiltersAndRender();
        });

        searchInput.addEventListener("input", () => applyFiltersAndRender());
        dateRange.addEventListener("change", () => applyFiltersAndRender());

        // default to items view
        setActiveButton("items");
        applyFiltersAndRender();
      } else {
        // fallback to original behavior
        renderHistoryList(normalizedSorted);
      }
      console.log("admin-history: Render complete");
    } catch (renderErr) {
      console.error("admin-history: renderHistoryList threw:", renderErr);
      // Defensive fallback: show raw JSON and error so user can see backend data
      const debugContainer = document.getElementById("adminHistoryContainer");
      if (debugContainer) {
        debugContainer.innerHTML = `
          <div style="padding:16px;background:#fff;border-radius:8px;">
            <h3 style="margin-top:0;color:#b91c1c">Rendering Error</h3>
            <pre style="white-space:pre-wrap;max-height:320px;overflow:auto;background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;">${escapeHtml(
              String(
                renderErr && renderErr.stack ? renderErr.stack : renderErr,
              ),
            )}</pre>
            <h4 style="margin:8px 0 4px 0;color:#0f172a">Raw backend payload</h4>
            <pre style="white-space:pre-wrap;max-height:360px;overflow:auto;background:#111827;color:#e6eef8;padding:12px;border-radius:6px;">${escapeHtml(
              JSON.stringify(backend, null, 2),
            )}</pre>
            <div style="margin-top:12px;color:#475569">If you see valid JSON above but no cards, there may be a rendering bug. Please share the output or open the browser console for errors.</div>
          </div>
        `;
      }
    }
    return;
  }

  // Show diagnostic panel to help user identify the issue
  console.error("Admin history: backend fetch returned null or empty array");
  console.error(
    "This means EITHER: (1) backend is unreachable, (2) all endpoints returned empty arrays, (3) fetch failed",
  );

  container.innerHTML = `
    <div style="max-width: 800px; margin: 40px auto; padding: 24px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <h3 style="margin: 0 0 16px 0; color: #dc2626;">⚠️ No History Records Found</h3>
      <p style="margin: 0 0 16px 0; color: #64748b;">The backend returned no data. This could be because:</p>
      <ol style="margin: 0 0 20px 0; padding-left: 24px; color: #475569; line-height: 1.6;">
        <li><strong>No returned requests:</strong> The database has no BorrowRequest records with status='returned'</li>
        <li><strong>Backend not running:</strong> Django server is not started</li>
        <li><strong>Connection issue:</strong> CORS or network problem</li>
      </ol>
      
      <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 16px; border-radius: 4px;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #1e293b;">Quick Fix:</h4>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569;">1. Make sure Django is running: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 3px;">python manage.py runserver</code></p>
        <p style="margin: 0; font-size: 13px; color: #475569;">2. Go to <strong>Active Loans</strong> page and mark at least one item as "Returned"</p>
      </div>
      
      <button 
        onclick="testBackendConnection()" 
        style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;"
      >
        🔍 Test Backend Connection
      </button>
      
      <button 
        onclick="loadAdminHistory()" 
        style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-left: 8px;"
      >
        🔄 Retry
      </button>
      
      <div id="diagnosticResult" style="margin-top: 16px; display: none;"></div>
    </div>
  `;
}

// Expose globally so the admin router can call it
window.loadAdminHistory = loadAdminHistory;
console.log(
  "admin-history: loadAdminHistory exposed as window.loadAdminHistory",
);

// Add diagnostic test function
async function testBackendConnection() {
  const resultDiv = document.getElementById("diagnosticResult");
  if (!resultDiv) return;

  resultDiv.style.display = "block";
  resultDiv.innerHTML =
    '<div style="padding: 12px; background: #f1f5f9; border-radius: 6px;">🔄 Testing backend connection...</div>';

  let results = [];

  // Test 1: Check if backend is reachable
  const testUrls = [
    (window.PHYLAB_API && typeof window.PHYLAB_API === 'function')
      ? window.PHYLAB_API('/api/borrow-requests/history/')
      : '/api/borrow-requests/history/',
    "/api/borrow-requests/history/",
  ];

  for (const url of testUrls) {
    try {
      const resp = await fetch(url, { mode: "cors" });
      if (resp.ok) {
        const data = await resp.json();
        results.push(
          `✅ <strong>${url}</strong><br>Status: ${resp.status} OK<br>Records: ${Array.isArray(data) ? data.length : "N/A"}`,
        );

        if (Array.isArray(data) && data.length === 0) {
          results.push(
            `⚠️ Backend is working but database has <strong>0 returned requests</strong><br><em>Solution: Go to Active Loans → Mark an item as Returned</em>`,
          );
        }
      } else {
        results.push(
          `❌ <strong>${url}</strong><br>Status: ${resp.status}<br>Error: ${await resp.text().catch(() => "Unable to read")}`,
        );
      }
    } catch (e) {
      results.push(
        `❌ <strong>${url}</strong><br>Error: ${e.message}<br><em>Backend may not be running. Start with: python manage.py runserver</em>`,
      );
    }
  }

  resultDiv.innerHTML = `
    <div style="padding: 16px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
      <h4 style="margin: 0 0 12px 0; font-size: 14px;">Diagnostic Results:</h4>
      ${results.map((r) => `<div style="margin-bottom: 12px; padding: 12px; background: white; border-radius: 4px; font-size: 13px;">${r}</div>`).join("")}
    </div>
  `;
}

window.testBackendConnection = testBackendConnection;

// Auto-run if the history container is present on DOMContentLoaded and active
document.addEventListener("DOMContentLoaded", () => {
  const cont = document.getElementById("adminHistoryContainer");
  if (
    cont &&
    document.querySelector('.page-section[data-page="history"].active')
  ) {
    loadAdminHistory();
  }
});
