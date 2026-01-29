// Page navigation system for admin dashboard

// Page Navigation System
function showPage(pageName) {
  // Update nav items
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.page === pageName);
  });

  // Update page sections
  document.querySelectorAll(".page-section").forEach((section) => {
    section.classList.toggle("active", section.dataset.page === pageName);
  });

  // Load page-specific content
  if (pageName === "dashboard") {
    loadDashboardStats();
    loadDashboardBorrowers();
    initLiveChart();
  } else if (pageName === "approvals") {
    loadBorrowRequests();
  } else if (pageName === "loans") {
    loadReturnWindow();
  } else if (pageName === "reviews") {
    displayUserReviews();
  } else if (pageName === "history") {
    // Ensure history view loads from backend when selected
    if (typeof loadAdminHistory === "function") {
      try {
        loadAdminHistory();
      } catch (e) {
        console.error("loadAdminHistory threw:", e);
      }
    }
  }
}

// Initialize navigation handlers
function initNavigation() {
  // Sidebar navigation click handlers
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.onclick = () => showPage(item.dataset.page);
  });

  // Mobile menu toggle
  const mobileToggle = document.getElementById("mobileMenuToggle");
  const sidebar = document.querySelector(".admin-sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (mobileToggle && sidebar && overlay) {
    mobileToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
      overlay.classList.toggle("active");
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
    });

    document.querySelectorAll(".sidebar-nav .nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
      });
    });
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", initNavigation);
