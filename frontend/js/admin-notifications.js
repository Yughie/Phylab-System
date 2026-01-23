// Notification and modal system for admin page

// Show notification popup (replaces alert)
function showNotification(message, type = "success") {
  const popup = document.getElementById("notificationPopup");
  const msgEl = document.getElementById("notificationMessage");
  const iconEl = document.getElementById("notificationIcon");

  msgEl.textContent = message;
  popup.className = "notification-popup notification-" + type + " show";

  // Set icon based on type
  if (type === "error" || type === "rejected") {
    iconEl.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    iconEl.style.background = "rgba(239, 68, 68, 0.1)";
    popup.className = "notification-popup notification-rejected show";
  } else if (type === "warning") {
    iconEl.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    iconEl.style.background = "rgba(245, 158, 11, 0.1)";
    popup.className = "notification-popup notification-warning show";
  } else if (type === "approved") {
    iconEl.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    iconEl.style.background = "rgba(16, 185, 129, 0.1)";
    popup.className = "notification-popup notification-approved show";
  } else {
    iconEl.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    iconEl.style.background = "rgba(16, 185, 129, 0.1)";
    popup.className = "notification-popup notification-success show";
  }
}

function hideNotification() {
  document.getElementById("notificationPopup").classList.remove("show");
}

// Confirmation modal system
let confirmCallback = null;

function showConfirm(title, message, onConfirm) {
  const modal = document.getElementById("confirmModal");
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmMessage").textContent = message;
  confirmCallback = onConfirm;
  modal.classList.add("show");
}

function hideConfirmModal() {
  document.getElementById("confirmModal").classList.remove("show");
  confirmCallback = null;
}

function executeConfirmCallback() {
  document.getElementById("confirmModal").classList.remove("show");
  if (typeof confirmCallback === "function") {
    confirmCallback();
  }
  confirmCallback = null;
}
