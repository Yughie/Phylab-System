// Dashboard statistics and overview

// Dashboard Stats
async function loadDashboardStats() {
  // Fetch all borrow requests from backend for stats
  let allRequests = [];
  try {
    const urls = [
      window.PHYLAB_API && typeof window.PHYLAB_API === "function"
        ? window.PHYLAB_API("/api/borrow-requests/")
        : "/api/borrow-requests/",
      "/api/borrow-requests/",
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

  // Count requests that have at least one pending item (match Borrow Requests page)
  const pending = allRequests.filter((r) => {
    try {
      const items = Array.isArray(r.items) ? r.items : [];
      return (
        items.filter((i) => !i.status || i.status === "pending").length > 0
      );
    } catch (e) {
      return false;
    }
  }).length;

  // Count requests that have at least one borrowed item (match Active Loans page)
  const loans = allRequests.filter((r) => {
    try {
      const items = Array.isArray(r.items) ? r.items : [];
      return items.filter((i) => i.status === "borrowed").length > 0;
    } catch (e) {
      return false;
    }
  }).length;
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
      window.PHYLAB_API && typeof window.PHYLAB_API === "function"
        ? window.PHYLAB_API("/api/borrow-requests/")
        : "/api/borrow-requests/",
      "/api/borrow-requests/",
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
      // Normalize backend response (include contact/teacher fields)
      allRequests = data.map((req) => ({
        studentName: req.student_name || req.studentName || req.full_name || "",
        studentID: req.student_id || req.studentId || req.id_number || "",
        email: req.email || req.student_email || "",
        studentPhone: req.student_phone || req.phone || "",
        studentDepartment: req.department || "",
        teacherName: req.teacher_name || req.teacherName || "",
        teacherEmail: req.teacher_email || "",
        borrowDate: req.borrow_date || req.borrowDate || "",
        status: req.status || "",
        items: (req.items || []).map((item) => ({
          name: item.item_name || item.name,
        })),
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
                              <td>
                                <strong>${req.studentName || "N/A"}</strong>
                                <div class="small-muted">${req.email || ""} ${req.studentPhone ? "• " + req.studentPhone : ""}</div>
                              </td>
                              <td>${req.items ? req.items.map((i) => i.name).join(", ") : "N/A"}</td>
                              <td>
                                <div>${req.teacherName || "N/A"}</div>
                                <div class="small-muted">${req.teacherEmail || ""}</div>
                              </td>
                              <td><span class="status-badge status-${req.status}">${req.status}</span><div class="small-muted">${req.borrowDate || "N/A"}</div></td>
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
async function initLiveChart() {
  // Fetch history from backend (requests with status='returned')
  let history = [];
  try {
    const urls = [
      "http://127.0.0.1:8000/api/borrow-requests/history/",
      "http://localhost:8000/api/borrow-requests/history/",
      "/api/borrow-requests/history/",
      window.PHYLAB_API && typeof window.PHYLAB_API === "function"
        ? window.PHYLAB_API("/api/borrow-requests/history/")
        : "/api/borrow-requests/history/",
    ];
    let response = null;
    for (const url of urls) {
      try {
        response = await fetch(url, { mode: "cors" });
        if (response && response.ok) break;
      } catch (e) {
        continue;
      }
    }
    if (response && response.ok) {
      history = await response.json();
    }
  } catch (e) {
    console.warn("initLiveChart: failed to fetch history from backend", e);
  }
  console.debug("initLiveChart: history entries from backend:", history);
  const counts = {};

  history.forEach((req) => {
    if (req.items && req.items.length > 0) {
      const first = req.items[0];
      const itemName = (
        first.item_name ||
        first.name ||
        first.itemName ||
        "Unknown"
      ).toString();
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
