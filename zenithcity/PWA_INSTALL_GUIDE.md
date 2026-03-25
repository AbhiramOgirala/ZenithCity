# PWA Install Guide - ZenithCity

## 🚀 Quick Test

Visit: **https://zenith-city.vercel.app/test-pwa.html**

This test page will help diagnose PWA installation issues.

## Why Install Button Not Showing?

### 1. **Browser Engagement Requirements**
- Chrome requires multiple visits over several days
- User must interact with the site (scroll, click, etc.)
- Minimum 2 visits with 5+ minutes between them

### 2. **Platform-Specific Behavior**

#### iOS Safari (No automatic install prompt):
1. Open https://zenith-city.vercel.app in Safari
2. Tap the **Share** button (⬆️ at bottom)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** to confirm

#### Android Chrome:
1. Visit the site multiple times over several days
2. Look for **install banner** at bottom of screen
3. Or tap **address bar install icon**
4. Or use menu → **"Add to Home Screen"**

#### Desktop Chrome/Edge:
1. Look for **install icon** in address bar
2. Or use menu → **"Install ZenithCity..."**
3. Click **"Install"**

### 3. **Current PWA Status**

✅ **HTTPS:** Deployed on Vercel  
✅ **Manifest:** Valid with proper configuration  
✅ **Service Worker:** Registered and caching  
✅ **Icons:** SVG icons configured  
✅ **Install Banner:** Shows on mobile after 2 seconds  
⚠️ **Engagement:** Requires multiple visits for Chrome  

## 🔧 Troubleshooting Steps

### Step 1: Check PWA Requirements
Visit: https://zenith-city.vercel.app/test-pwa.html

### Step 2: Clear Browser Data
1. Clear cache and cookies
2. Reload the page
3. Visit multiple times

### Step 3: Force Install (Testing)
**Chrome Desktop:**
1. Go to `chrome://flags/#bypass-app-banner-engagement-checks`
2. Enable the flag
3. Restart Chrome
4. Visit the site

### Step 4: Manual Installation
If automatic prompt doesn't appear, use manual installation:

**iOS:** Share → Add to Home Screen  
**Android:** Menu → Add to Home Screen  
**Desktop:** Address bar install icon  

## 📱 Mobile Installation Guide

### For iOS Users:
```
1. Open Safari
2. Go to https://zenith-city.vercel.app
3. Tap Share button (bottom center)
4. Scroll down → "Add to Home Screen"
5. Tap "Add"
```

### For Android Users:
```
1. Open Chrome
2. Go to https://zenith-city.vercel.app
3. Look for install banner at bottom
4. Or tap menu → "Add to Home Screen"
5. Tap "Install" or "Add"
```

## 🎯 Expected Behavior

### After Multiple Visits:
- Install banner appears at bottom of screen
- Chrome shows install icon in address bar
- PWA meets all installation criteria

### After Installation:
✅ **Home Screen Icon** - Quick access  
✅ **Fullscreen Mode** - No browser UI  
✅ **Offline Support** - Basic functionality cached  
✅ **Push Notifications** - Workout reminders  
✅ **App-like Experience** - Native feel  

## 🔍 Developer Testing

### Local Testing:
```bash
# Start with mobile access
npm run mobile:dev

# Access from mobile:
http://YOUR_IP:5173/test-pwa.html
```

### PWA Audit:
1. Open DevTools → Lighthouse
2. Run PWA audit
3. Check for any issues

### Console Debugging:
```javascript
// Check service worker
navigator.serviceWorker.getRegistrations().then(console.log);

// Check install prompt
console.log('Install prompt available:', !!window.deferredPrompt);

// Check if PWA
console.log('Is PWA:', window.matchMedia('(display-mode: standalone)').matches);
```

## ⚡ Immediate Solutions

### If Install Button Still Not Showing:

1. **Use Manual Installation** (works immediately)
2. **Visit site 3-5 times** over 2-3 days
3. **Interact with the app** (scroll, click around)
4. **Try different browsers** (Chrome, Edge, Safari)
5. **Use the test page** to diagnose issues

### Force Install Banner (Testing):
The app now shows an install banner after 2 seconds on mobile devices, regardless of Chrome's engagement requirements.

## 📞 Support

**Test Page:** https://zenith-city.vercel.app/test-pwa.html  
**Main App:** https://zenith-city.vercel.app  

If issues persist:
- Try manual installation steps
- Check browser PWA support
- Use different device/browser
- Wait for engagement criteria (2-3 days)