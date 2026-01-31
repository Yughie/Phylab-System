// Global API base helper for PhyLab frontend
// Defines `window.PHYLAB_API_BASE` and `window.PHYLAB_API()` helper.
(function () {
  const PROD = "https://phylab-inventory-backend.onrender.com";
  // Allow an explicit override (set before this script) via `window.__PHYLAB_API_BASE__`
  const override = window.__PHYLAB_API_BASE__ || null;
  let base = PROD;
  if (override) base = override;
  else {
    const locationObj = window.location || {};
    const origin = locationObj.hostname || "";
    const protocol = locationObj.protocol || "";
    // If loaded from the filesystem (file://) or hostname empty, assume local dev
    if (protocol === "file:" || origin === "") {
      base = "http://127.0.0.1:8000";
    } else if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      // Keep explicit local API URL to avoid accidentally using PROD
      base = "http://127.0.0.1:8000";
    }
  }

  window.PHYLAB_API_BASE = base;

  // Helper to build absolute backend URLs. Accepts paths like '/api/x' or 'api/x'.
  window.PHYLAB_API = function (path) {
    if (!path) return window.PHYLAB_API_BASE;
    const p = path.startsWith("/") ? path : "/" + path;
    return window.PHYLAB_API_BASE + p;
  };
})();
