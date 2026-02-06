# Debugging Supabase API Key Issues

## 🔍 **Step 1: Check Your Browser Console**

1. Open your app
2. Open browser dev tools (F12)
3. Look for the debug logs:
```
🔍 Supabase Debug:
URL: https://yqtufvmtgeayfsnrofjc.supabase.co
Anon Key exists: true/false
Anon Key starts with eyJ: true/false
```

## 🚨 **What the Debug Output Means:**

### **If you see:**
```
Anon Key exists: false
```
→ Your .env file isn't being loaded

### **If you see:**
```
Anon Key starts with eyJ: false
```
→ You still have the wrong key format

### **If you see:**
```
Anon Key starts with eyJ: true
```
→ Key format is correct, issue is elsewhere

## 🛠️ **Fixes Based on Debug Output:**

### **Case 1: "Anon Key exists: false"**
1. **Restart your dev server**: `npm run dev`
2. **Check .env file name**: Must be exactly `.env` (not .env.local)
3. **Check .env location**: Must be in project root
4. **No spaces around =**: `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`

### **Case 2: "Anon Key starts with eyJ: false"**
1. **Go to Supabase Dashboard** → Settings → API
2. **Copy the full anon key** (it's very long)
3. **Replace your current key** completely
4. **Make sure no extra spaces or quotes**

### **Case 3: Both true but still error**
1. **Check Supabase project status** (is it paused?)
2. **Verify URL is correct**
3. **Check if you need to enable RLS on tables**

## 🧪 **Quick Test:**

Try this in browser console:
```javascript
fetch('https://yqtufvmtgeayfsnrofjc.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'YOUR_ACTUAL_ANON_KEY_HERE',
    'Authorization': 'Bearer YOUR_ACTUAL_ANON_KEY_HERE'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

## 📋 **Checklist:**

- [ ] Restarted dev server after .env changes?
- [ ] .env file in correct location?
- [ ] Key starts with `eyJ` and is 200+ chars?
- [ ] No quotes around the key?
- [ ] No trailing spaces?
- [ ] Supabase project is active?

**Run the debug version and tell me what you see in the console!**
