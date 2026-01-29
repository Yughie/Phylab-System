// Simple backend inventory fetch helper
// This file provides `getInventory()` which returns the latest cached inventory array
// and `refreshInventoryFromBackend()` to fetch from the backend `/api/inventory/`.
// To avoid client-side persistence, `saveInventory` and `saveInventoryToLocalStorage`
// are intentionally no-ops here so the app uses server data as the source of truth.

(function () {
  // in-memory cache
  let _inventoryCache = [];

  async function refreshInventoryFromBackend() {
    try {
      const tried = [];
      // try relative first (works when served from same origin)
      let resp = await fetch("/api/inventory/").catch(() => null);
      tried.push(window.location.origin + "/api/inventory/");

      // If relative returned a 404 or failed, try an explicit backend origin fallback
      if (!resp || !resp.ok) {
        const fallback =
          (window.PHYLAB_API_BASE || "http://127.0.0.1:8000") +
          "/api/inventory/";
        tried.push(fallback);
        try {
          resp = await fetch(fallback);
        } catch (e) {
          resp = null;
        }
      }

      if (!resp || !resp.ok) {
        const status = resp ? resp.status : "network-failure";
        console.error(
          "Failed to fetch inventory from backend",
          status,
          "tried URLs:",
          tried,
        );
        return _inventoryCache;
      }

      const data = await resp.json();

      // Map backend fields into frontend-friendly shape
      _inventoryCache = (data || []).map((item) => ({
        id: item.id || item.pk || null,
        itemKey: item.item_key || item.itemKey || String(item.id || ""),
        name: item.name || "",
        category: item.category || "",
        stock: item.stock != null ? item.stock : 0,
        image: item.image || item.image_url || "",
        cabinet: item.cabinet || "",
        description: item.description || "",
        type: item.type || "",
        use: item.use || "",
      }));

      // notify UI hooks if present
      if (typeof renderInventoryGrid === "function") renderInventoryGrid();
      if (typeof loadDashboardStats === "function") loadDashboardStats();
      if (typeof loadCabinetFromMemory === "function") loadCabinetFromMemory();

      console.log(
        "Inventory loaded from backend:",
        _inventoryCache.length,
        "items",
      );
      return _inventoryCache;
    } catch (e) {
      console.error("Error fetching inventory from backend", e);
      return _inventoryCache;
    }
  }

  // synchronous accessor used by existing frontend code
  function getInventory() {
    return _inventoryCache.slice();
  }

  // Disable client-side save helpers so inventory is authoritative from backend
  function saveInventory() {
    console.warn("saveInventory() disabled: inventory is fetched from backend");
  }

  function saveInventoryToLocalStorage() {
    console.warn(
      "saveInventoryToLocalStorage() disabled: inventory is fetched from backend",
    );
  }

  // Expose to global scope for existing code integration
  window.getInventory = getInventory;
  window.refreshInventoryFromBackend = refreshInventoryFromBackend;
  window.saveInventory = saveInventory;
  window.saveInventoryToLocalStorage = saveInventoryToLocalStorage;

  // Fetch on load and populate cache (fire-and-forget)
  window.addEventListener("DOMContentLoaded", () => {
    refreshInventoryFromBackend().catch((err) => console.error(err));
  });
})();
