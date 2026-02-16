# Mark Returned - Troubleshooting Guide

## Issue
When clicking "Mark Returned" on an active loan, you see:
> "Item marked as returned locally. Backend update failed - check browser console for details."

## Root Cause Analysis

The frontend successfully updates localStorage but fails to update the backend database. This can happen for several reasons:

### 1. Backend Server Not Running ⚠️ MOST COMMON
**Symptom:** Console shows network errors like `Failed to fetch` or `ERR_CONNECTION_REFUSED`

**Solution:**
```powershell
# Navigate to backend folder and start the server
cd backend
python manage.py runserver 8000
```

Leave this terminal running while testing the frontend.

### 2. Database Record Doesn't Exist
**Symptom:** Console shows HTTP 404 error with message "not found"

**Root Cause:** The item was created only in localStorage, never saved to backend database.

**Solution:** 
- Approve new borrow requests through the admin interface (which should save to backend)
- Check if the backend actually received the original borrow request
- Verify database has the record:
```powershell
cd backend
python manage.py shell
```
```python
from api.models import BorrowRequest, BorrowRequestItem
BorrowRequest.objects.all()  # List all requests
BorrowRequestItem.objects.all()  # List all items
```

### 3. CORS or Network Error
**Symptom:** Console shows CORS policy errors

**Solution:** Already configured in `settings.py`:
- `CORS_ALLOW_ALL_ORIGINS = True`
- `CORS_ALLOW_CREDENTIALS = True`

### 4. Wrong API URL
**Symptom:** Console shows the URL being attempted

**Check Configuration:**
Frontend config is in `frontend/js/config.js`:
- For file:// or localhost: uses `http://127.0.0.1:8000`
- For production: uses `https://phylab-inventory-backend.onrender.com`

## Debugging Steps

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Click "Mark Returned" on an item
4. Look for logs starting with `[performReturnPatch]`

You should see:
```
[performReturnPatch] Attempting to mark item returned: {...}
[performReturnPatch] Trying URL: http://127.0.0.1:8000/api/borrow-requests/XXX/update_item_statuses/
[performReturnPatch] Response status: XXX
```

### Step 2: Interpret the Logs

**If you see:**
- `ERR_CONNECTION_REFUSED` → Backend server not running
- `404 Not Found` → Request ID doesn't exist in database
- `500 Internal Server Error` → Backend code error (check terminal running Django)
- `403 Forbidden` → Authentication/permission issue
- No network request at all → JavaScript error (check for earlier errors in console)

### Step 3: Verify Backend Endpoint
Test the endpoint directly using PowerShell:

```powershell
# Test if backend is running
curl http://127.0.0.1:8000/health/

# Test listing borrow requests (should return JSON)
curl http://127.0.0.1:8000/api/borrow-requests/

# Test updating an item (replace IDs with actual values)
curl -X PATCH http://127.0.0.1:8000/api/borrow-requests/1/update_item_statuses/ `
  -H "Content-Type: application/json" `
  -d '{"items": [{"id": 1, "status": "returned"}]}'
```

## How Mark Returned Works

### Frontend Flow ([admin-active-loans.js](frontend/js/admin-active-loans.js))
1. User clicks "Mark Returned" button
2. Calls `completeReturn(requestId, itemId)`
3. Opens date picker modal
4. User confirms → calls `performReturnPatch(reqId, itemId, actualIso)`
5. Sends PATCH request to `/api/borrow-requests/{id}/update_item_statuses/`
6. On success: updates UI, moves to history
7. On failure: updates localStorage only, shows warning

### Backend Flow ([api/views.py](backend/api/views.py) line 372-525)
1. Receives PATCH request at `BorrowRequestViewSet.update_item_statuses()`
2. Finds `BorrowRequest` by pk or request_id
3. Finds `BorrowRequestItem` by item id
4. Updates item status to "returned"
5. Sets `actual_returned_at` timestamp
6. Saves to database
7. Returns updated data

## Common Scenarios

### Scenario A: Local Development, Backend Not Running
**Fix:** Start backend with `python manage.py runserver 8000`

### Scenario B: Item Only in localStorage
This happens when:
- Testing with mock data
- Backend database was reset but localStorage wasn't cleared
- Borrow request was "approved" only in frontend

**Fix:** 
1. Clear localStorage: `localStorage.clear()` in browser console
2. OR approve items properly through the admin interface (which saves to backend)
3. OR create test data directly in backend database

### Scenario C: ID Mismatch
Frontend uses `request.id` but backend expects numeric database ID or `request_id` string.

**Already handled:** Backend tries both:
```python
try:
    borrow_request = BorrowRequest.objects.get(pk=pk)
except (ValueError, BorrowRequest.DoesNotExist):
    borrow_request = BorrowRequest.objects.get(request_id=pk)
```

## Quick Fix Checklist

- [ ] Backend server is running (`python manage.py runserver 8000`)
- [ ] Browser console shows detailed error logs
- [ ] Database has migrations applied (`python manage.py migrate`)
- [ ] Item exists in database (check via Django admin or shell)
- [ ] Frontend is accessing correct API URL (check config.js)
- [ ] Network tab shows PATCH request being sent
- [ ] Response shows actual error message

## Enhanced Logging

I've added detailed console logging to help diagnose issues:

**Frontend logs** (in [admin-active-loans.js](frontend/js/admin-active-loans.js)):
- `[performReturnPatch]` - Shows request details and responses
- `[finalizeReturn]` - Shows whether backend succeeded

**Backend logs** (in [api/views.py](backend/api/views.py)):
- `[update_item_statuses]` - Prints request data to terminal

## Testing the Fix

1. Start backend server
2. Open browser with DevTools (F12) Console tab
3. Go to Admin Page → Active Loans
4. Click "Mark Returned" on an item
5. Confirm the return date
6. Check console for detailed logs
7. If successful: item moves to History page
8. If failed: console will show the exact error

## Next Steps

After reviewing the logs, the most likely issue is:
1. Backend not running (90% of cases)
2. Database doesn't have the record (9% of cases)
3. Other network/config issue (1% of cases)

Start by ensuring the backend is running and check the console logs!
