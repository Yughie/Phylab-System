// Utility functions for admin page

/**
 * Shared helper for backend API calls.
 * Builds the correct URL for both local dev and production,
 * includes auth headers, and provides consistent error logging.
 *
 * @param {string} path  - API path, e.g. '/api/inventory/5/'
 * @param {object} opts  - { method, body (object), extraHeaders }
 * @returns {Promise<{ok: boolean, status: number|null, data: any, error: string|null}>}
 */
async function backendFetch(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  const bodyObj = opts.body || null;
  const extraHeaders = opts.extraHeaders || {};

  // Build candidate URLs: production API first, then relative
  const urls = [];
  if (window.PHYLAB_API && typeof window.PHYLAB_API === "function") {
    urls.push(window.PHYLAB_API(path));
  } else if (window.PHYLAB_API_BASE) {
    const p = path.startsWith("/") ? path : "/" + path;
    urls.push(window.PHYLAB_API_BASE + p);
  }
  // Always add relative as a fallback (works when served from same origin in dev)
  urls.push(path);

  // Prepare headers
  const headers = Object.assign(
    { "Content-Type": "application/json" },
    extraHeaders,
  );
  const token = sessionStorage.getItem("auth_token");
  if (token) {
    headers["Authorization"] = "Token " + token;
  }

  console.log(`backendFetch [${method}] attempting URLs:`, urls);

  for (const url of urls) {
    try {
      const fetchOpts = {
        method,
        headers,
        mode: "cors",
      };
      if (bodyObj && method !== "GET") {
        fetchOpts.body = JSON.stringify(bodyObj);
      }

      const resp = await fetch(url, fetchOpts);
      console.log(`backendFetch [${method}] ${url} -> ${resp.status}`);

      if (resp.ok) {
        let data = null;
        try {
          data = await resp.json();
        } catch (_) {}
        return { ok: true, status: resp.status, data, error: null };
      } else {
        const errText = await resp.text().catch(() => "");
        console.warn(
          `backendFetch [${method}] ${url} failed:`,
          resp.status,
          errText,
        );
      }
    } catch (e) {
      console.error(
        `backendFetch [${method}] ${url} network error:`,
        e.message,
      );
    }
  }
  return { ok: false, status: null, data: null, error: "All URLs failed" };
}

// Escape HTML to prevent XSS
function escapeHtml(s) {
  if (s === undefined || s === null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Escape for JavaScript strings
function escapeJs(s) {
  if (s === undefined || s === null) return "";
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// Sanitize email address
function sanitizeEmail(raw) {
  if (!raw || typeof raw !== "string") return "";
  const s = raw.trim();
  const m = s.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return m ? m[0] : "";
}

// Generate a short loan ID
function generateLoanId() {
  return "L" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Get remark type label
function getRemarkTypeLabel(type) {
  const labels = {
    damaged: "Damaged",
    "missing-parts": "Missing Parts",
    "late-return": "Late Return",
    "wrong-item": "Wrong Item",
    other: "Other",
  };
  return labels[type] || type;
}

// Shared function to fetch reviews from backend API
// Accepts an optional `payload`. If provided, a POST is attempted; otherwise GET.
async function fetchReviewsFromBackend(payload = null) {
  const candidates = [];
  if (window.PHYLAB_API && typeof window.PHYLAB_API === "function") {
    try {
      candidates.push(window.PHYLAB_API("/api/reviews/"));
    } catch (e) {}
  }
  if (window.PHYLAB_API_BASE) {
    candidates.push(
      (window.PHYLAB_API_BASE || "http://127.0.0.1:8000") + "/api/reviews/",
    );
  }
  candidates.push("http://127.0.0.1:8000/api/reviews/");
  candidates.push("/api/reviews/");

  for (const url of candidates) {
    try {
      const token = sessionStorage.getItem("auth_token");
      const options = {
        method: payload ? "POST" : "GET",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
      };
      if (payload) options.body = JSON.stringify(payload);
      if (token) options.headers.Authorization = "Token " + token;
      else options.credentials = "include";

      const res = await fetch(url, options);
      if (res && res.ok) return await res.json();
    } catch (e) {
      continue;
    }
  }
  return null;
}

// Resolve a potentially public request identifier (e.g. 'LYOQNPL') to numeric DB id.
// Looks in localStorage cache first, then queries backend list as a fallback.
async function resolveRequestNumericId(identifier) {
  if (!identifier && identifier !== 0) return identifier;
  const asStr = String(identifier || "");
  if (/^\d+$/.test(asStr)) return asStr; // already numeric

  // try local cache
  try {
    const queue = JSON.parse(localStorage.getItem("phyLab_RequestQueue")) || [];
    const found = queue.find(
      (r) =>
        String(r.requestId) === asStr ||
        String(r.request_id) === asStr ||
        String(r.requestId || "") === asStr,
    );
    if (found && found.id) return String(found.id);
  } catch (e) {}

  // fallback: fetch list from backend and search (try API helper/base/localhost/relative)
  const candidates = [];
  if (window.PHYLAB_API && typeof window.PHYLAB_API === "function") {
    try {
      candidates.push(window.PHYLAB_API("/api/borrow-requests/"));
    } catch (e) {}
  }
  if (window.PHYLAB_API_BASE) {
    candidates.push(
      (window.PHYLAB_API_BASE || "http://127.0.0.1:8000") +
        "/api/borrow-requests/",
    );
  }
  candidates.push("http://127.0.0.1:8000/api/borrow-requests/");
  candidates.push("/api/borrow-requests/");

  for (const u of candidates) {
    try {
      const resp = await fetch(u, { mode: "cors" });
      if (!resp || !resp.ok) continue;
      const data = await resp.json();
      if (Array.isArray(data)) {
        const found = data.find(
          (r) =>
            String(r.request_id) === asStr || String(r.requestId) === asStr,
        );
        if (found && found.id) return String(found.id);
      }
    } catch (e) {
      continue;
    }
  }

  // nothing found; return original identifier so callers may still try
  return identifier;
}

// Compute how many units of an item are currently borrowed (active loans)
function computeActiveLoansForItem(itemKey) {
  if (!itemKey) return 0;
  const queue = JSON.parse(localStorage.getItem("phyLab_RequestQueue")) || [];
  let sum = 0;
  const norm = (s) => (s || "").toString().trim().toLowerCase();

  queue.forEach((req) => {
    if (
      req.status &&
      req.status.toLowerCase() === "borrowed" &&
      Array.isArray(req.items)
    ) {
      req.items.forEach((item) => {
        const ik = item.itemKey || item.name;
        if (norm(ik) === norm(itemKey)) {
          sum += parseInt(item.quantity) || 0;
        }
      });
    }
  });
  return sum;
}
