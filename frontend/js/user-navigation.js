// ===== NAVIGATION COMPONENT =====

/**
 * Initialize hamburger menu for mobile navigation
 */
export function initHamburgerMenu() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const navItems = document.getElementById("navItems");
  if (!hamburgerBtn || !navItems) return;

  hamburgerBtn.addEventListener("click", function () {
    const isOpen = navItems.classList.toggle("open");
    hamburgerBtn.classList.toggle("open", isOpen);
    hamburgerBtn.setAttribute("aria-expanded", isOpen);
  });

  // Close menu when clicking outside
  document.addEventListener("click", function (e) {
    if (!hamburgerBtn.contains(e.target) && !navItems.contains(e.target)) {
      navItems.classList.remove("open");
      hamburgerBtn.classList.remove("open");
      hamburgerBtn.setAttribute("aria-expanded", "false");
    }
  });

  // Close menu when window resizes to desktop
  window.addEventListener("resize", function () {
    if (window.innerWidth > 800) {
      navItems.classList.remove("open");
      hamburgerBtn.classList.remove("open");
      hamburgerBtn.setAttribute("aria-expanded", "false");
    }
  });
}

/**
 * Close mobile navigation menu
 */
export function closeMobileNav() {
  const navItems = document.getElementById("navItems");
  const hamburgerBtn = document.getElementById("hamburgerBtn");

  try {
    if (navItems && navItems.classList.contains("open")) {
      navItems.classList.remove("open");
    }
    if (hamburgerBtn && hamburgerBtn.classList.contains("open")) {
      hamburgerBtn.classList.remove("open");
      hamburgerBtn.setAttribute("aria-expanded", "false");
    }
  } catch (e) {
    console.warn("Error closing mobile nav:", e);
  }
}
