// Quick test script to verify backend history endpoint
// Paste this into browser console to test if backend is accessible

async function testHistoryFetch() {
  console.log("=== Testing History Fetch ===");

  const urls = [
    "/api/borrow-requests/history/",
    "http://127.0.0.1:8000/api/borrow-requests/history/",
    "/api/borrow-requests/?status=returned",
    "http://127.0.0.1:8000/api/borrow-requests/?status=returned",
  ];

  for (const url of urls) {
    console.log("\n--- Testing:", url);
    try {
      const resp = await fetch(url, { mode: "cors" });
      console.log("  Status:", resp.status);
      console.log("  OK:", resp.ok);
      console.log("  Content-Type:", resp.headers.get("content-type"));

      if (resp.ok) {
        const data = await resp.json();
        console.log("  Response type:", typeof data);
        console.log("  Is Array:", Array.isArray(data));
        console.log("  Length:", Array.isArray(data) ? data.length : "N/A");
        console.log("  Data:", data);

        if (Array.isArray(data) && data.length > 0) {
          console.log("  ✅ SUCCESS! Found", data.length, "records");
          return;
        } else if (Array.isArray(data) && data.length === 0) {
          console.log("  ⚠️ Empty array - no history records in database");
        }
      } else {
        const text = await resp.text();
        console.log("  Error body:", text);
      }
    } catch (e) {
      console.log("  ❌ Fetch failed:", e.message);
    }
  }

  console.log("\n=== Summary ===");
  console.log("If all URLs failed or returned empty:");
  console.log(
    "1. Check if Django server is running (python manage.py runserver)",
  );
  console.log("2. Check if there are any returned requests in the database");
  console.log(
    "3. Try manually creating a test request and marking it returned",
  );
}

// Run the test
testHistoryFetch();
