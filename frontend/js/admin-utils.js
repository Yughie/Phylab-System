// Utility functions for admin page

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
async function fetchReviewsFromBackend() {
  const urls = ["http://127.0.0.1:8000/api/reviews/", "/api/reviews/"];
  for (let u of urls) {
    try {
      const r = await fetch(u, { mode: "cors" });
      if (r.ok) return await r.json();
    } catch (e) {
      continue;
    }
  }
  return null;
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
