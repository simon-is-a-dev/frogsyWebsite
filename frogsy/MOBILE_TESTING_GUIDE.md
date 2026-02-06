# Mobile Notification Testing Guide

## 📱 **iPhone Testing Steps**

### **1. Install as PWA (Required)**
```
1. Open Safari on iPhone
2. Go to your Frogsy app URL
3. Tap Share button (square with arrow)
4. Scroll down and tap "Add to Home Screen"
5. Tap "Add" to install
6. OPEN FROM HOME SCREEN (not Safari!)
```

### **2. Enable iOS Notifications**
```
Settings → Notifications → Safari/Frogsy
✅ Allow Notifications
✅ Lock Screen
✅ Notification Center  
✅ Banners
✅ Sounds
```

### **3. Test on iPhone**
```
1. Open Frogsy from Home Screen
2. Go to Settings page
3. Click "Enable Reminders"
4. Allow browser permission
5. Click "🧪 Test Now"
6. Check both:
   - iPhone Notification Center
   - Safari Settings (if still in browser)
```

---

## 🤖 **Android Testing Steps**

### **1. Install as PWA**
```
1. Open Chrome on Android
2. Go to your Frogsy app URL
3. Tap 3-dots menu → "Add to Home screen"
4. Tap "Add" to install
5. OPEN FROM HOME SCREEN (not Chrome!)
```

### **2. Enable Android Notifications**
```
Settings → Apps & Notifications → Frogsy/Chrome
✅ Allow Notifications
✅ Show on Lock Screen
✅ Make Sound
✅ Vibrate
```

### **3. Test on Android**
```
1. Open Frogsy from Home Screen
2. Go to Settings page  
3. Click "Enable Reminders"
4. Allow browser permission
5. Click "🧪 Test Now"
6. Check Android notification shade
```

---

## 🔧 **Platform-Specific Debugging**

### **iPhone Debugging**
```
1. Connect iPhone to Mac
2. Safari → Develop → [iPhone] → [Your Site]
3. Check Console for SW registration
4. Look for errors like:
   - "Service worker registration failed"
   - "Notification permission denied"
   - "Push subscription failed"
```

### **Android Debugging**
```
1. Open Chrome on Android
2. Go to chrome://inspect
3. Find your site under "Inspectable Pages"
4. Click "inspect" to open DevTools
5. Check Console tab for errors
6. Look for:
   - Service Worker status
   - Permission states
   - Push subscription details
```

---

## 📋 **Testing Checklist**

### **Both Platforms:**
- [ ] Install as PWA (not browser bookmark)
- [ ] Enable notifications in OS settings
- [ ] Allow browser permission
- [ ] Test "🧪 Test Now" button
- [ ] Check notification appears
- [ ] Test clicking notification opens app
- [ ] Set custom times and save
- [ ] Verify times persist after refresh

### **iPhone Specific:**
- [ ] Test in Safari browser (should fail)
- [ ] Test from Home Screen (should work)
- [ ] Check Focus Mode settings
- [ ] Verify Background App Refresh

### **Android Specific:**
- [ ] Test in Chrome browser
- [ ] Test from Home Screen
- [ ] Check battery optimization settings
- [ ] Verify Chrome notifications enabled

---

## 🚨 **Common Issues & Fixes**

### **iPhone Issues:**
- **"Service worker failed"** → Install as PWA
- **No notification appears** → Check iOS Settings
- **Permission denied** → Reinstall PWA
- **Background not working** → iOS limitation, use app daily

### **Android Issues:**
- **"Push subscription failed"** → Check Chrome settings
- **No notification** → Check Android notification settings
- **Service worker not active** → Clear Chrome cache
- **Background killed** → Disable battery optimization

---

## 🧪 **Manual Console Tests**

### **Test Direct Notification:**
```javascript
// Paste in browser console
new Notification("Mobile Test", {
  body: "Testing mobile notifications",
  icon: '/favicon.png',
  tag: 'mobile-test'
});
```

### **Test Service Worker:**
```javascript
// Test SW notification
navigator.serviceWorker.ready.then(reg => {
  reg.showNotification("SW Mobile Test", {
    body: "Service worker test",
    icon: '/favicon.png'
  });
});
```

### **Check Subscription:**
```javascript
// Check push subscription
navigator.serviceWorker.ready.then(reg => {
  return reg.pushManager.getSubscription();
}).then(sub => {
  console.log("Subscription:", sub);
});
```

---

## 📊 **Expected Results**

### **iPhone:**
- ✅ Works when installed as PWA
- ✅ Limited background processing
- ✅ Notifications appear in iOS Notification Center
- ❌ Limited in regular Safari

### **Android:**
- ✅ Works in both Chrome and PWA
- ✅ Full background processing
- ✅ Rich notifications with actions
- ✅ Better reliability overall

---

## 🎯 **Success Criteria**

Both platforms should:
1. **Enable notifications** successfully
2. **Receive test notifications** immediately
3. **Open app** when notification clicked
4. **Save custom times** persistently
5. **Show status indicators** correctly

**Test both platforms and report any errors you see in the console!**
