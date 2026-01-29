// Review display and management

async function displayUserReviews() {
  const container = document.getElementById("reviewsContainer");
  if (!container) return;
  container.innerHTML = '<div class="loading">Loading reviews...</div>';

  const placeholder =
    '<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><p>No reviews yet</p></div>';

  // Fetch reviews from backend using shared function
  let reviews = await fetchReviewsFromBackend();
  console.log(
    "displayUserReviews: fetched from backend:",
    reviews ? reviews.length : 0,
    "reviews",
  );

  // Fallback to localStorage only if backend unavailable
  if (!reviews || reviews.length === 0) {
    reviews = JSON.parse(localStorage.getItem("phyLab_UserReviews")) || [];
    if (reviews.length > 0) {
      console.log(
        "displayUserReviews: using localStorage fallback:",
        reviews.length,
        "reviews",
      );
    }
  }

  if (!reviews || reviews.length === 0) {
    container.innerHTML = placeholder;
    console.log("displayUserReviews: no reviews found, showing placeholder");
    return;
  }

  console.log("displayUserReviews: rendering", reviews.length, "reviews");
  const revs = reviews.slice().reverse();
  let html = "";
  revs.forEach((rev, i) => {
    const imgUrl = rev.image_url || rev.image || "";
    const displayName = rev.submitted_by_name || "Anonymous";
    const comment = rev.comment || "No comment provided";
    const itemName = rev.item_name || "Unknown Item";
    const createdDate = rev.created_at
      ? new Date(rev.created_at).toLocaleDateString()
      : "";

    html += `
      <div class="review-card">
        <div class="review-card-header">
          <div class="reviewer-info">
            <div class="reviewer-avatar">${displayName.charAt(0).toUpperCase()}</div>
            <div>
              <strong>${displayName}</strong>
              <span class="review-date">${createdDate}</span>
            </div>
          </div>
          <button class="resolve-review-btn" onclick="resolveReview(${rev.id})">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Resolve
          </button>
        </div>
        <div class="review-card-body">
          <h3>${itemName}</h3>
          <p>${comment}</p>
          ${imgUrl ? `<img src="${imgUrl}" alt="Review" class="review-card-img" onclick="openReviewImage('${imgUrl}', '${itemName}')">` : ""}
        </div>
      </div>
    `;
  });

  console.log("displayUserReviews: HTML length:", html.length);
  container.innerHTML = html;
  console.log(
    "displayUserReviews: container populated with",
    container.children.length,
    "review cards",
  );

  container.querySelectorAll(".review-card-img").forEach((img) => {
    img.style.cursor = "pointer";
  });

  console.log("displayUserReviews: complete, showing notification");
  if (typeof showNotification === "function")
    showNotification("Reviews loaded", "success");
}

async function resolveReview(reviewId) {
  showConfirm(
    "Resolve Review",
    "Mark this review as resolved?",
    async function () {
      try {
        const urls = [
          `/api/reviews/${reviewId}/resolve/`,
          `http://127.0.0.1:8000/api/reviews/${reviewId}/resolve/`,
        ];

        let response = null;
        for (const url of urls) {
          try {
            response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              mode: "cors",
            });
            if (response.ok) break;
          } catch (e) {
            continue;
          }
        }

        if (response && response.ok) {
          showNotification("Review resolved successfully!", "success");
          displayUserReviews();
          loadDashboardStats();
        } else {
          throw new Error("Failed to resolve review");
        }
      } catch (error) {
        console.error("Error resolving review:", error);
        showNotification("Failed to resolve review.", "error");
      }
    },
  );
}

// Image lightbox handlers
function openReviewImage(src, alt) {
  const modal = document.getElementById("reviewImageModal");
  const img = document.getElementById("reviewImageView");
  const cap = document.getElementById("reviewImageCaption");
  img.src = src || "";
  img.alt = alt || "";
  cap.textContent = alt || "";
  modal.style.display = "flex";
}

function closeReviewImage() {
  const modal = document.getElementById("reviewImageModal");
  const img = document.getElementById("reviewImageView");
  modal.style.display = "none";
  img.src = "";
}
