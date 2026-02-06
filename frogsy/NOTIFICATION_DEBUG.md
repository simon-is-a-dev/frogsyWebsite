# Notification Debugging Checklist

## Quick Tests to Run:

### 1. Browser Permission Check
- Open browser dev tools (F12)
- Go to Application/Storage tab
- Check "Notifications" permission
- Should show "Granted"

### 2. Service Worker Status
- In dev tools, go to Application > Service Workers
- Check if sw.js is "activated and is running"
- Should show "activated" status

### 3. Test Notification Directly
- Open browser console and run:
```javascript
// Test direct notification
new Notification("Test", {
  body: "Direct test notification",
  icon: "/favicon.png",
  tag: "test"
});
```

### 4. Test Service Worker Notification
- In console, run:
```javascript
// Test service worker notification
navigator.serviceWorker.ready.then(reg => {
  reg.showNotification("SW Test", {
    body: "Service worker test",
    icon: "/favicon.png",
    tag: "sw-test"
  });
});
```

### 5. Check Subscription
- In console, run:
```javascript
// Check push subscription
navigator.serviceWorker.ready.then(reg => {
  return reg.pushManager.getSubscription();
}).then(sub => {
  console.log("Subscription:", sub);
});
```

## Common Issues & Fixes:

### Issue: Browser blocks notifications
**Fix**: Click the 🔔 icon in browser address bar and "Allow" notifications

### Issue: Service Worker not registered
**Fix**: Clear browser cache and reload page

### Issue: Focus on wrong window
**Fix**: Make sure browser window is in focus when testing

### Issue: System notifications disabled
**Fix**: Check OS notification settings (Windows Settings > System > Notifications)

## Debug Steps:
1. Open Settings page in Frogsy
2. Open browser dev tools (F12)
3. Click "Enable Reminders" 
4. Check console for any errors
5. Click "🧪 Test Now" button
6. Check both browser notification tray and OS notification center
