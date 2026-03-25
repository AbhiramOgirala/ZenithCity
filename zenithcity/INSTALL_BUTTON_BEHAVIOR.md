# Install Button Behavior

## Overview

The "Install App" button in ZenithCity properly triggers web app installation when clicked.

## Button Location

- **Position**: Fixed at top-right corner
- **Visibility**: Shows on all authenticated pages
- **Auto-hide**: Disappears when app is already installed

## Click Behavior

### Desktop (Chrome/Edge)

When you click the install button:

1. **Captures install prompt** - The app listens for the `beforeinstallprompt` event
2. **Triggers native dialog** - Calls `prompt()` to show browser's install dialog
3. **Waits for user choice** - User can accept or dismiss
4. **Handles result**:
   - ✅ **Accepted**: App installs, button disappears
   - ❌ **Dismissed**: Dialog closes, button remains

### Mobile (Android Chrome)

Same as desktop - clicking triggers the native install prompt.

### iOS (Safari)

iOS doesn't support automatic install prompts, so:

1. **Shows instructions modal** - Step-by-step guide
2. **User follows steps**:
   - Tap Share button
   - Tap "Add to Home Screen"
   - Tap "Add"

## Technical Implementation

```typescript
// Listen for install prompt
useEffect(() => {
  const handler = (e: Event) => {
    e.preventDefault();
    setDeferredPrompt(e as BeforeInstallPromptEvent);
  };
  window.addEventListener('beforeinstallprompt', handler);
  return () => window.removeEventListener('beforeinstallprompt', handler);
}, []);

// Handle button click
const handleClick = async () => {
  if (deferredPrompt) {
    // Trigger native install
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('Install outcome:', outcome);
  } else {
    // Show manual instructions
    setShowModal(true);
  }
};
```

## What Happens After Install

1. **App icon** appears on home screen/desktop
2. **Standalone mode** - Opens without browser UI
3. **Offline support** - Works without internet (via service worker)
4. **Native feel** - Looks and behaves like a native app

## Requirements

- **HTTPS** required (or localhost for testing)
- **Valid manifest.json** with app metadata
- **Service worker** registered and active
- **Supported browser** (Chrome, Edge, Safari)

## Testing

Use the test page to verify behavior:
```
http://localhost:4173/test-pwa-install.html
```

This shows:
- Event logs
- Install prompt status
- Service worker status
- Real-time debugging

## Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Auto prompt | ✅ | ✅ | ❌ | ❌ |
| Manual install | ✅ | ✅ | ✅ | ⚠️ |
| Standalone mode | ✅ | ✅ | ✅ | ❌ |

## Common Issues

### Button doesn't show
- Already installed (check standalone mode)
- Not HTTPS (except localhost)
- Browser doesn't support PWA

### Click does nothing
- Check console for errors
- Verify service worker is active
- Ensure manifest.json loads correctly

### Install prompt doesn't appear
- Browser may have blocked it (user dismissed before)
- Clear site data and try again
- Check PWA installability criteria
