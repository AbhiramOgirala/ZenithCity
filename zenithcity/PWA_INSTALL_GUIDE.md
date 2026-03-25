# PWA Install Guide - ZenithCity

## Why Install Option Not Showing?

The PWA install prompt may not appear due to several reasons:

### 1. **Browser Requirements**
- **Chrome/Edge:** Install prompt shows after user engagement
- **Safari iOS:** Use "Add to Home Screen" from share menu
- **Firefox:** Limited PWA support

### 2. **PWA Criteria Not Met**
- ✅ HTTPS required (your site: https://zenith-city.vercel.app)
- ✅ Valid manifest.json
- ✅ Service worker registered
- ⚠️ User engagement required (visit site multiple times)

### 3. **Mobile-Specific Issues**

#### iOS Safari:
1. Open https://zenith-city.vercel.app in Safari
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** to confirm

#### Android Chrome:
1. Visit the site multiple times over several days
2. Look for **"Install"** button in address bar
3. Or use Chrome menu → **"Add to Home Screen"**

### 4. **Manual Installation Steps**

#### For iOS (Safari):
```
1. Open Safari → https://zenith-city.vercel.app
2. Tap Share button (bottom center)
3. Tap "Add to Home Screen"
4. Customize name if needed
5. Tap "Add"
```

#### For Android (Chrome):
```
1. Open Chrome → https://zenith-city.vercel.app
2. Tap menu (3 dots) → "Add to Home Screen"
3. Or look for install banner at bottom
4. Tap "Install" or "Add"
```

#### For Desktop (Chrome/Edge):
```
1. Visit https://zenith-city.vercel.app
2. Look for install icon in address bar
3. Or use menu → "Install ZenithCity..."
4. Click "Install"
```

## Troubleshooting

### Install Prompt Not Showing?

1. **Clear Browser Data:**
   - Clear cache and cookies
   - Reload the page

2. **Check Requirements:**
   - Visit site multiple times
   - Interact with the app (click around)
   - Wait 24-48 hours between visits

3. **Browser Console Check:**
   ```javascript
   // Open DevTools → Console and run:
   navigator.serviceWorker.getRegistrations().then(console.log);
   ```

4. **Force Install (Desktop):**
   - Chrome: `chrome://flags/#bypass-app-banner-engagement-checks`
   - Enable flag and restart browser

### PWA Features After Install

✅ **Works Offline** - Basic functionality cached  
✅ **Home Screen Icon** - Quick access  
✅ **Fullscreen Mode** - No browser UI  
✅ **Push Notifications** - Workout reminders  
✅ **Background Sync** - Data sync when online  

## Developer Tools

### Test PWA Locally:
```bash
# Start development server
npm run mobile:dev

# Access from mobile:
http://YOUR_IP:5173
```

### Generate PWA Icons:
```bash
# Create icon generator
node generate-pwa-icons.cjs

# Open public/generate-icons.html in browser
# Save each canvas as PNG with correct filename
```

### PWA Audit:
1. Open DevTools → Lighthouse
2. Run PWA audit
3. Fix any issues reported

## Current PWA Status

- ✅ **Manifest:** Valid with proper icons
- ✅ **Service Worker:** Registered and caching
- ✅ **HTTPS:** Deployed on Vercel
- ✅ **Responsive:** Mobile-optimized design
- ⚠️ **Icons:** Using SVG (PNG recommended)

## Next Steps

1. **Generate PNG Icons:** Use the icon generator
2. **Update Manifest:** Add PNG icon references
3. **Test Installation:** Try on different devices
4. **User Education:** Guide users on manual installation

## Support

If install option still doesn't appear:
- Try different browsers
- Wait for user engagement criteria
- Use manual installation steps above
- Check browser PWA support