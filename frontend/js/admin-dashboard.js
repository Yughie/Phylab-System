// Dashboard statistics and overview

// Dashboard Stats
async function loadDashboardStats() {
  // Fetch all borrow requests from backend for stats
  let allRequests = [];
  try {
    const urls = [
      "/api/borrow-requests/",
      "http://127.0.0.1:8000/api/borrow-requests/",
    ];

    let response = null;
    for (const url of urls) {
      try {
        response = await fetch(url, { mode: "cors" });
        if (response.ok) break;
      } catch (e) {
        continue;
      }
    }

    if (response && response.ok) {
      allRequests = await response.json();
      console.log("Fetched all requests for stats:", allRequests);
    }
  } catch (error) {
    console.error("Error fetching requests for stats:", error);
  }

  // Fallback to localStorage if backend unavailable
  if (allRequests.length === 0) {
    const queue = JSON.parse(localStorage.getItem("phyLab_RequestQueue")) || [];
    allRequests = queue;
  }

  // Fetch reviews from backend instead of localStorage
  let reviews = await fetchReviewsFromBackend();
  if (!reviews || reviews.length === 0) {
    // Fallback to localStorage only if backend unavailable
    reviews = JSON.parse(localStorage.getItem("phyLab_UserReviews")) || [];
  }

  const pending = allRequests.filter((r) => r.status === "pending").length;
  const loans = allRequests.filter((r) => r.status === "borrowed").length;
  const equipment = document.querySelectorAll(".inventory-card").length;

  document.getElementById("statPending").textContent = pending;
  document.getElementById("statLoans").textContent = loans;
  document.getElementById("statEquipment").textContent = equipment;
  document.getElementById("statReviews").textContent = reviews.length;

  // Update nav badges
  document.getElementById("pendingCount").textContent = pending;
  document.getElementById("loansCount").textContent = loans;
  // Reviews nav badge
  const reviewsCountEl = document.getElementById("reviewsCount");
  if (reviewsCountEl) reviewsCountEl.textContent = reviews.length;
}

// Dashboard Borrowers List
async function loadDashboardBorrowers() {
  const container = document.getElementById("dashboardBorrowersList");

  // Try to fetch from backend API
  let allRequests = [];
  try {
    const urls = [
      "/api/borrow-requests/",
      "http://127.0.0.1:8000/api/borrow-requests/",
    ];

    let response = null;
    for (const url of urls) {
      try {
        response = await fetch(url, { mode: "cors" });
        if (response.ok) break;
      } catch (e) {
        continue;
      }
    }

    if (response && response.ok) {
      const data = await response.json();
      // Normalize backend response
      allRequests = data.map((req) => ({
        studentName: req.student_name,
        studentID: req.student_id,
        borrowDate: req.borrow_date,
        status: req.status,
        items: req.items.map((item) => ({ name: item.item_name })),
      }));
    }
  } catch (error) {
    console.error("Error fetching requests for dashboard:", error);
  }

  // Fallback to localStorage if backend unavailable
  if (allRequests.length === 0) {
    const queue = JSON.parse(localStorage.getItem("phyLab_RequestQueue")) || [];
    allRequests = queue;
  }

  const recentRequests = allRequests.slice(-5).reverse();

  if (recentRequests.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No recent borrowing activity</div>';
    return;
  }

  container.innerHTML = `
      <table class="borrowers-table">
          <thead>
              <tr>
                  <th>Name</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Date</th>
              </tr>
          </thead>
          <tbody>
              ${recentRequests
                .map(
                  (req) => `
                  <tr>
                      <td><strong>${req.studentName || "N/A"}</strong></td>
                      <td>${req.items ? req.items.map((i) => i.name).join(", ") : "N/A"}</td>
                      <td><span class="status-badge status-${req.status}">${req.status}</span></td>
                      <td>${req.borrowDate || "N/A"}</td>
                  </tr>
              `,
                )
                .join("")}
          </tbody>
      </table>
  `;
}

// Live Chart
let myLiveChart = null;
function initLiveChart() {
  const history = JSON.parse(localStorage.getItem("phyLab_History")) || [];
  const counts = {};

  history.forEach((req) => {
    if (req.items && req.items.length > 0) {
      const itemName = req.items[0].name || "Unknown";
      counts[itemName] = (counts[itemName] || 0) + 1;
    }
  });

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const labels = sorted.map((i) => i[0]);
  const data = sorted.map((i) => i[1]);

  const ctx = document.getElementById("liveChart");
  if (!ctx) return;

  if (myLiveChart) myLiveChart.destroy();

  const primaryColor = (
    getComputedStyle(document.documentElement).getPropertyValue(
      "--color-primary",
    ) || "#1565C0"
  ).trim();
  myLiveChart = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Times Borrowed",
          data: data,
          backgroundColor: primaryColor,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

function resetGraphData() {
  showConfirm(
    "Reset Graph Data",
    "This will clear the borrowing history. Continue?",
    function () {
      localStorage.removeItem("phyLab_History");
      initLiveChart();
      showNotification("History cleared.", "success");
    },
  );
}
