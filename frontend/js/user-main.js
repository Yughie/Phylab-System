// ===== MAIN USER PAGE INITIALIZATION =====

import { initHamburgerMenu } from "./user-navigation.js";
import { initInventory } from "./user-inventory.js";
import { initCart } from "./user-cart.js";
import { initRequestHistory } from "./user-requests.js";
import { initProfileModal } from "./user-profile.js";
import { initReviewModal } from "./user-reviews.js";
import {
  syncStockDisplay,
  populateTeacherList,
  animateAddToBorrow,
} from "./user-utils.js";

/**
 * Initialize all user page components
 */
function initUserPage() {
  // Initialize navigation
  initHamburgerMenu();

  // Initialize inventory component
  initInventory();

  // Initialize cart/borrow component
  initCart();

  // Initialize request history
  initRequestHistory();

  // Initialize profile modal
  initProfileModal();

  // Initialize review modal
  initReviewModal();

  // Populate teacher dropdown
  populateTeacherList([
    "Aganan, Abegail G",
    "Agripa, Diana Jean M.",
    "Alcantara, Helen D.",
    "Almodiente, Marie Ann E.",
    "Antiquiera, Marites S.",
    "Balbastro, Anna Loraine C.",
    "Boado, Rosalyn M.",
    "Clet, Lea С.",
    "De Vera, Christelle A.",
    "Dilidili, Laarni Jane M.",
    "Frial, Lenie C.",
    "Hita, Noemi M.",
    "Irene, Liezelle H.",
    "Lagamayo, John Paul B.",
    "Lauigan, Liezl S.",
    "Lejano, Marilou S.",
    "Mola, Mary Joy P.",
    "Mola, Nardo Bernardo C.",
    "Montoya, Ma. Cristina R.",
    "Mullet, Dana Meriz Dane R. Cuesta",
    "Munar, Judy Ann O.",
    "Noay, John Christian Orestes H.",
    "Opalla, Juvy Lyn G.",
    "Ornacho, Dominic E.",
    "Parilla, Kevin O.",
    "Penales, Rommel D.",
    "Ramirez, Ramil L. Ii",
    "Robiso, Limuel B.",
    "Sari, Jayvee T.",
    "Tronco, Juncarl G.",
    "Vergara, Trizia Faye D.",
    "Vibal, Romwel",
    "Pestaño, Karen B.",
  ]);

  // Listen for storage changes (for stock sync across tabs)
  window.addEventListener("storage", (event) => {
    if (event.key && event.key.startsWith("stock_")) {
      syncStockDisplay();
    }
  });
}

// Initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUserPage);
} else {
  initUserPage();
}

// Make animateAddToBorrow available globally for dynamic elements
window.animateAddToBorrow = animateAddToBorrow;
