# Quick Start

## 1. Start Both Servers
```bash
cd zenithcity
npm run dev
```

## 2. Open Browser
Go to: `http://localhost:5173`

## 3. Create Account
- Username: 3-100 alphanumeric (e.g., `warrior123`)
- Email: Valid format (e.g., `test@example.com`)
- Password: 8+ chars, uppercase, number (e.g., `Test1234`)

## 4. Done!
You should now see your dashboard with no 401 errors.

## What Was Fixed
- ✅ No more 401 errors on page load
- ✅ Proper authentication checks
- ✅ THREE.js color issue fixed
- ✅ WebSocket proxy configured
- ✅ React Router warnings removed

## Troubleshooting
If you see 401 errors:
1. Clear browser localStorage (F12 → Application → Clear Storage)
2. Make sure backend is running on port 3001
3. Refresh the page

## Backend Not Running?
Use `npm run dev` (not `npm start`)
