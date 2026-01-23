// ===== REVIEW MODAL COMPONENT =====

import {
  showPopup,
  hideSubmittingIndicator,
  showSubmittingIndicator,
  getSessionUser,
} from "./user-utils.js";

/**
 * Open review modal
 */
export function openReviewModal() {
  const profileModal = document.getElementById("profile-modal");
  const reviewModal = document.getElementById("review-modal");
  if (profileModal) profileModal.style.display = "none";
  if (reviewModal) reviewModal.style.display = "flex";
}

/**
 * Close review modal
 */
export function closeReviewModal() {
  const profileModal = document.getElementById("profile-modal");
  const reviewModal = document.getElementById("review-modal");
  if (reviewModal) reviewModal.style.display = "none";
  if (profileModal) profileModal.style.display = "flex";
}

/**
 * Compress image client-side
 */
function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) return resolve(null);

    try {
      const img = new Image();
      img.onload = () => {
        let w = img.width,
          h = img.height;
        const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else resolve(null);
          },
          file.type === "image/png" ? "image/png" : "image/jpeg",
          quality,
        );
      };

      img.onerror = (e) => {
        console.warn("compressImage: img.onerror", e);
        resolve(null);
      };

      try {
        img.src = URL.createObjectURL(file);
      } catch (e) {
        const reader = new FileReader();
        reader.onload = () => {
          img.src = reader.result;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn("compressImage error", err);
      resolve(null);
    }
  });
}

/**
 * Submit review to backend
 */
async function postReviewFormData(form) {
  const urls = ["/api/reviews/", "http://127.0.0.1:8000/api/reviews/"];
  for (let u of urls) {
    try {
      console.log("postReviewFormData: POST", u, form.get("item_name"));
      const resp = await fetch(u, {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      console.log("postReviewFormData: response", u, resp && resp.status);
      if (resp && resp.ok) return true;
    } catch (e) {
      console.warn("postReviewFormData failed for", u, e);
    }
  }
  return false;
}

/**
 * Handle review form submission
 */
async function submitReview(e) {
  // Prevent any default form behavior
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const nameInput = document.getElementById("review-item-name");
  const commentInput = document.getElementById("review-comment");
  const imageInput = document.getElementById("review-image");

  if (!nameInput || !commentInput) {
    console.warn("Review form inputs not found");
    return false;
  }

  const itemName = nameInput.value.trim();
  const comment = commentInput.value.trim();
  const imageFile = imageInput && imageInput.files && imageInput.files[0];
  const userData = getSessionUser();

  if (!itemName) {
    showPopup("Please enter the item name.");
    return false;
  }

  // Disable submit button immediately
  const submitBtn = document.getElementById("submit-review-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.6";
  }

  // Show loading indicator
  showSubmittingIndicator();

  try {
    const form = new FormData();
    form.append("item_name", itemName);
    form.append("comment", comment);
    form.append("submitted_by_name", userData.fullname || "");
    form.append("submitted_by_email", userData.email || "");

    // Handle image compression if file is attached
    if (imageFile) {
      try {
        const compressed = await compressImage(imageFile, 800, 800, 0.7);
        if (compressed) {
          form.append(
            "image",
            compressed,
            imageFile.name || "review_" + Date.now() + ".jpg",
          );
        } else {
          form.append(
            "image",
            imageFile,
            imageFile.name || "review_" + Date.now() + ".jpg",
          );
        }
      } catch (e) {
        console.warn("image compress failed, sending original", e);
        form.append(
          "image",
          imageFile,
          imageFile.name || "review_" + Date.now() + ".jpg",
        );
      }
    }

    // Submit to backend
    const success = await postReviewFormData(form);

    if (success) {
      const title = "Feedback submitted";
      const message = itemName + (comment ? ": " + comment : "");

      // Show success popup
      showPopup(message, {
        title: title,
        onClose: () => {
          // Clear form inputs
          if (nameInput) nameInput.value = "";
          if (commentInput) commentInput.value = "";
          if (imageInput) imageInput.value = "";
          closeReviewModal();
        },
      });
    } else {
      showPopup("Failed to submit review to server. Please try again.");
    }
  } catch (err) {
    console.error("submitReview error:", err);
    showPopup("Error submitting review. Please try again later.");
  } finally {
    // Always cleanup
    hideSubmittingIndicator();
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = "1";
    }
  }

  return false;
}

/**
 * Initialize review modal component
 */
export function initReviewModal() {
  const openBtn = document.getElementById("open-review-btn");
  const cancelBtn = document.getElementById("cancel-review-btn");
  const submitBtn = document.getElementById("submit-review-btn");

  if (openBtn) {
    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openReviewModal();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeReviewModal();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async (e) => {
      // Immediately prevent any default behavior
      e.preventDefault();
      e.stopPropagation();

      try {
        await submitReview(e);
      } catch (err) {
        console.error("submitReview error", err);
        hideSubmittingIndicator();
        showPopup("Error submitting review. Please try again.");
      }

      // Always return false to prevent any form submission
      return false;
    });
  }

  // Prevent unexpected form submissions
  document.addEventListener(
    "submit",
    (e) => {
      try {
        if (!e.target || e.target.id !== "borrowForm") {
          e.preventDefault();
          e.stopPropagation();
        }
      } catch (err) {
        console.error("error in submit blocker", err);
      }
    },
    true,
  );

  // Prevent Enter key from submitting in review inputs and file input issues
  const reviewImage = document.getElementById("review-image");
  if (reviewImage) {
    // Prevent file input from triggering any form submission
    reviewImage.addEventListener("change", (e) => {
      e.stopPropagation();
      try {
        console.log("Review image selected:", e.target.files);
      } catch (err) {}
    });

    ["review-item-name", "review-comment", "review-image"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      // Prevent Enter key from submitting
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" && id !== "review-comment") {
          ev.preventDefault();
          ev.stopPropagation();
        }
      });

      // Prevent any form submission from these inputs
      el.addEventListener("submit", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      });
    });
  }
}

// Make functions available globally for onclick handlers
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
