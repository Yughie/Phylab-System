// ===== PROFILE MODAL COMPONENT =====

import { getSessionUser } from "./user-utils.js";

/**
 * Toggle profile modal
 */
export function toggleProfile(show) {
  const modal = document.getElementById("profile-modal");
  if (!modal) return;

  if (show) {
    const userData = getSessionUser();
    if (userData) {
      const fullnameEl = document.getElementById("display-fullname");
      const idEl = document.getElementById("display-id");
      const emailEl = document.getElementById("display-email");
      const roleEl = document.getElementById("display-role");

      if (fullnameEl) fullnameEl.innerText = userData.fullname || "N/A";
      if (idEl)
        idEl.innerText = userData.idNumber || userData.id_number || "N/A";
      if (emailEl) emailEl.innerText = userData.email || "N/A";
      if (roleEl) {
        // Check is_student field to determine role
        const role = userData.is_student === false ? "Teacher" : "Student";
        roleEl.innerText = role;
      }
    }
    modal.style.display = "flex";
  } else {
    modal.style.display = "none";
  }
}

/**
 * Handle logout
 */
export function handleLogout() {
  sessionStorage.removeItem("current_user");
  window.location.href = "index.html";
}

/**
 * Initialize profile modal component
 */
export function initProfileModal() {
  const profileModal = document.getElementById("profile-modal");
  const borrowModal = document.getElementById("borrowModal");
  const reviewModal = document.getElementById("review-modal");

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === profileModal) toggleProfile(false);
    if (
      event.target === borrowModal &&
      typeof window.toggleModal === "function"
    ) {
      window.toggleModal(false);
    }
    if (
      event.target === reviewModal &&
      typeof window.closeReviewModal === "function"
    ) {
      window.closeReviewModal();
    }
  });
}

// Make functions available globally for onclick handlers
window.toggleProfile = toggleProfile;
window.handleLogout = handleLogout;
