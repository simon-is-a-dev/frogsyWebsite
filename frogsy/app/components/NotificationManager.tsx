"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient"; // adjust if needed

interface NotificationManagerProps {
  userId: string | null;
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

const VAPID_PUBLIC_KEY = "BElWMgd9Bvohy186HV3Wz2lpmqmGaI0r6wtQ9YRDJTA4-6t1vnvmTvfHpPCyLyDzqNA70m6HD0nuUgkeaSquqac";

export default function NotificationManager({ userId }: NotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [swStatus, setSwStatus] = useState("Checking...");
  const [loading, setLoading] = useState(false);
  const [morningTime, setMorningTime] = useState("08:00");
  const [afternoonTime, setAfternoonTime] = useState("19:00");
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [afternoonEnabled, setAfternoonEnabled] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string>(""); // For save confirmation feedback
  const [deviceInfo, setDeviceInfo] = useState<string>("");

  const notificationsSupported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator;

  useEffect(() => {
    if (!notificationsSupported) return;

    // Detect device and platform
    const detectDevice = () => {
      const userAgent = navigator.userAgent;
      const platform = navigator.platform;
      
      let device = "Unknown";
      if (/iPhone|iPad|iPod/.test(userAgent)) {
        device = "🍎 iPhone/iOS";
      } else if (/Android/.test(userAgent)) {
        device = "🤖 Android";
      } else if (/Mac/.test(platform)) {
        device = "💻 macOS";
      } else if (/Win/.test(platform)) {
        device = "🪟 Windows";
      } else if (/Linux/.test(platform)) {
        device = "🐧 Linux";
      }
      
      setDeviceInfo(device);
    };

    detectDevice();
    setPermission(Notification.permission);

    navigator.serviceWorker.getRegistration().then((reg) => {
      setSwStatus(reg ? "Registered" : "Not registered");
    });

    // Check if user already has a subscription
    checkExistingSubscription();
  }, [notificationsSupported, userId]);

  const checkExistingSubscription = async () => {
    if (!userId) return;
    
    try {
      console.log("🔍 Checking subscription status...");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log("📱 Found browser subscription:", subscription.endpoint);
        
        // Check if subscription exists in database
        const { data, error } = await supabase
          .from("push_subscriptions")
          .select("user_id, created_at")
          .eq("endpoint", subscription.endpoint)
          .eq("user_id", userId)
          .maybeSingle();
        
        if (!error && data) {
          console.log("✅ Subscription valid in database");
          setEnabled(true);
        } else {
          // Subscription exists in browser but not in DB - re-save it
          console.log("⚠️ Subscription not in database, re-saving...");
          await renewSubscription(subscription);
          setEnabled(true);
        }
      } else {
        console.log("❌ No browser subscription found");
        setEnabled(false);
      }

      // Load user preferences
      await loadUserPreferences();
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  // Helper to renew/save subscription to database
  const renewSubscription = async (subscription: PushSubscription) => {
    try {
      const json = subscription.toJSON();
      
      await supabase.from("push_subscriptions").upsert({
        user_id: userId!,
        endpoint: json.endpoint!,
        p256dh: json.keys?.p256dh!,
        auth: json.keys?.auth!,
      }, {
        onConflict: 'endpoint,user_id'
      });
      
      console.log("💾 Subscription renewed in database");
    } catch (error) {
      console.error("Failed to renew subscription:", error);
    }
  };

  const loadUserPreferences = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        setMorningTime(data.morning_time?.substring(0, 5) || "08:00");
        setAfternoonTime(data.afternoon_time?.substring(0, 5) || "19:00");
        setMorningEnabled(data.morning_enabled ?? true);
        setAfternoonEnabled(data.afternoon_enabled ?? true);
      } else if (!data) {
        // Create default preferences for new user
        await saveUserPreferences();
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const saveUserPreferences = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("user_notification_preferences")
        .upsert({
          user_id: userId,
          morning_time: morningTime + ":00",
          afternoon_time: afternoonTime + ":00",
          morning_enabled: morningEnabled,
          afternoon_enabled: afternoonEnabled
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  };

  // Handler for explicit Save button
  const handleSavePreferences = async () => {
    if (!userId) return;
    
    setSaveStatus("Saving...");
    
    try {
      await saveUserPreferences();
      setSaveStatus("✅ Saved!");
      setTimeout(() => setSaveStatus(""), 3000); // Clear after 3 seconds
    } catch (error) {
      console.error("Error saving:", error);
      setSaveStatus("❌ Failed to save");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  const enableNotifications = async () => {
    if (!userId) {
      alert("Please log in to enable notifications.");
      return;
    }

    setLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();

      await supabase.from("push_subscriptions").insert({
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      });

      setEnabled(true);
    } catch (error) {
      console.error("Error enabling notifications:", error);
      alert("Failed to enable notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    if (!userId) {
      alert("Please log in to test notifications.");
      return;
    }

    if (permission !== "granted") {
      alert("Please enable notifications first. Check your browser's permission settings.");
      return;
    }

    try {
      console.log("🧪 Testing notification...");
      console.log(`📱 Device: ${deviceInfo}`);
      
      // Show test notification via service worker (works on all platforms)
      console.log("Testing service worker notification...");
      const registration = await navigator.serviceWorker.ready;
      console.log("Service worker registration:", registration);
      
      // Create a test notification payload
      const testPayload = {
        title: `🐸 Frogsy Test - ${deviceInfo}`,
        body: `If you see this, notifications are working on ${deviceInfo}! 🎉`,
        tag: 'frogsy-test-notification',
        requireInteraction: true,
        icon: '/favicon.png',
        badge: '/favicon.png'
      };

      console.log("Sending test notification:", testPayload);

      // Show the notification through service worker
      await registration.showNotification(testPayload.title, testPayload);

      console.log("✅ Test notification sent successfully!");

      // Success message
      let successMsg = `✅ Test notification sent!\n\nCheck your notification shade/tray.`;
      if (deviceInfo.includes('iPhone')) {
        successMsg += "\n\n🍎 iPhone: Make sure you installed as PWA (Home Screen, not Safari)!";
      } else if (deviceInfo.includes('Android')) {
        successMsg += "\n\n🤖 Android: Check your notification shade and Chrome settings!";
      }
      successMsg += "\n\nIf you don't see it, check browser console for errors.";

      alert(successMsg);
    } catch (error: any) {
      console.error("❌ Error sending test notification:", error);
      
      // Platform-specific error messages
      let errorMsg = `❌ Failed to send test notification: ${error?.message || 'Unknown error'}`;
      if (deviceInfo.includes('iPhone')) {
        errorMsg += "\n\n🍎 iPhone: Did you install as PWA? Safari notifications are limited.";
      } else if (deviceInfo.includes('Android')) {
        errorMsg += "\n\n🤖 Android: Check Chrome notification permissions and battery optimization.";
      }
      errorMsg += "\n\nCheck browser console for more details.";

      alert(errorMsg);
    }
  };

  const disableNotifications = async () => {
    if (!userId) return;

    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Delete from database
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint)
          .eq("user_id", userId);

        // Unsubscribe from push service
        await subscription.unsubscribe();
      }

      setEnabled(false);
    } catch (error) {
      console.error("Error disabling notifications:", error);
      alert("Failed to disable notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!notificationsSupported) {
    return (
      <div className="card">
        <p>Notifications are not supported on this device.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <h3>Daily Reminders 🔔</h3>
        <div className="notification-status-indicator">
          <span style={{ 
            fontSize: 'var(--text-xs)', 
            color: enabled ? 'var(--color-success)' : 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {enabled ? '● ACTIVE' : '○ INACTIVE'}
          </span>
        </div>
      </div>

      {/* PWA Installation Banner for Mobile */}
      {deviceInfo && (deviceInfo.includes('iPhone') || deviceInfo.includes('Android')) && (
        <div style={{ 
          marginBottom: 'var(--space-md)',
          padding: 'var(--space-md)',
          background: 'linear-gradient(135deg, #FFB84D 0%, #FF9A1F 100%)',
          border: '3px solid #CC7A00',
          fontSize: 'var(--text-sm)',
          color: '#2D3D2D',
          lineHeight: '1.6',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
            <span style={{ fontSize: '24px' }}>📲</span>
            <strong style={{ fontSize: 'var(--text-base)' }}>Install as App for Reliable Notifications</strong>
          </div>
          {deviceInfo.includes('iPhone') && (
            <div style={{ fontSize: 'var(--text-xs)' }}>
              <strong>iOS:</strong> Tap Share → Add to Home Screen
              <div style={{ marginTop: 'var(--space-xs)', opacity: 0.9 }}>
                ⚠️ Notifications only work when installed as PWA, not in Safari browser!
              </div>
            </div>
          )}
          {deviceInfo.includes('Android') && (
            <div style={{ fontSize: 'var(--text-xs)' }}>
              <strong>Android:</strong> Tap ⋮ Menu → Install app / Add to Home screen
              <div style={{ marginTop: 'var(--space-xs)', opacity: 0.9 }}>
                ✅ Works in Chrome even when app is closed!
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
        Get gentle reminders to log your pain levels. Choose times that work best for your daily routine.
      </p>

      {/* Status Display */}
      <div className="notification-status-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: 'var(--space-sm)', 
        marginBottom: 'var(--space-lg)' 
      }}>
        <div className="summary-card">
          <div className="summary-label">Permission</div>
          <div className="summary-value" style={{ 
            fontSize: 'var(--text-sm)',
            color: permission === 'granted' ? 'var(--color-success)' : 'var(--color-warning)'
          }}>
            {permission === 'granted' ? '✓ Granted' : '✗ Denied'}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Service Worker</div>
          <div className="summary-value" style={{ 
            fontSize: 'var(--text-sm)',
            color: swStatus === 'Registered' ? 'var(--color-success)' : 'var(--color-warning)'
          }}>
            {swStatus === 'Registered' ? '✓ Ready' : '✗ Setup'}
          </div>
        </div>
      </div>

      {/* Platform-specific tips */}
      {deviceInfo.includes('iPhone') && (
        <div className="notification-help" style={{ 
          marginBottom: 'var(--space-lg)',
          padding: 'var(--space-md)',
          background: 'linear-gradient(135deg, var(--color-warning) 0%, #FFA726 100%)',
          border: '2px solid #F57C00',
          fontSize: 'var(--text-xs)',
          color: '#FFF',
          lineHeight: '1.6'
        }}>
          <strong style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>🍎 iPhone Users:</strong>
          Install as PWA: Safari → Share → "Add to Home Screen" → Open from Home Screen (not Safari!)
        </div>
      )}

      {deviceInfo.includes('Android') && (
        <div className="notification-help" style={{ 
          marginBottom: 'var(--space-lg)',
          padding: 'var(--space-md)',
          background: 'linear-gradient(135deg, var(--color-success) 0%, #66BB6A 100%)',
          border: '2px solid #43A047',
          fontSize: 'var(--text-xs)',
          color: '#FFF',
          lineHeight: '1.6'
        }}>
          <strong style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>🤖 Android Users:</strong>
          Works great in Chrome! Install as PWA: Chrome → 3-dots → "Add to Home screen"
        </div>
      )}

      {/* Time Settings */}
      {enabled && (
        <div className="notification-time-settings" style={{ 
          marginBottom: 'var(--space-lg)',
          padding: 'var(--space-lg)',
          background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 100%)',
          border: '3px solid var(--color-border)',
          boxShadow: 'var(--shadow-pixel-sm)'
        }}>
          <h4 style={{ 
            marginBottom: 'var(--space-md)', 
            fontSize: 'var(--text-lg)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)'
          }}>
            <span>⏰</span>
            Reminder Schedule
          </h4>
          
          <div className="time-input-grid" style={{ 
            display: 'grid', 
            gap: 'var(--space-md)',
            gridTemplateColumns: '1fr'
          }}>
            {/* Morning Reminder */}
            <div className="time-input-group">
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: 'var(--space-sm)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: morningEnabled ? 'pointer' : 'not-allowed'
              }}>
                <input
                  type="checkbox"
                  checked={morningEnabled}
                  onChange={(e) => setMorningEnabled(e.target.checked)}
                  style={{ 
                    marginRight: 'var(--space-sm)',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)'
                }}>
                  <span>🌅</span>
                  Morning Reminder
                </span>
              </label>
              <input
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                disabled={!morningEnabled}
                className={morningEnabled ? '' : 'disabled'}
                style={{ 
                  padding: 'var(--space-md)', 
                  borderRadius: '0', 
                  border: '3px solid var(--color-border)',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-pixel)',
                  background: morningEnabled ? 'var(--color-surface)' : 'var(--color-background)',
                  color: morningEnabled ? 'var(--color-text)' : 'var(--color-text-muted)',
                  cursor: morningEnabled ? 'pointer' : 'not-allowed',
                  width: '100%',
                  boxShadow: morningEnabled ? 'inset 3px 3px 0 rgba(45, 61, 45, 0.1)' : 'none'
                }}
              />
            </div>

            {/* Afternoon Reminder */}
            <div className="time-input-group">
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: 'var(--space-sm)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: afternoonEnabled ? 'pointer' : 'not-allowed'
              }}>
                <input
                  type="checkbox"
                  checked={afternoonEnabled}
                  onChange={(e) => setAfternoonEnabled(e.target.checked)}
                  style={{ 
                    marginRight: 'var(--space-sm)',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)'
                }}>
                  <span>🌆</span>
                  Afternoon Reminder
                </span>
              </label>
              <input
                type="time"
                value={afternoonTime}
                onChange={(e) => setAfternoonTime(e.target.value)}
                disabled={!afternoonEnabled}
                className={afternoonEnabled ? '' : 'disabled'}
                style={{ 
                  padding: 'var(--space-md)', 
                  borderRadius: '0', 
                  border: '3px solid var(--color-border)',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-pixel)',
                  background: afternoonEnabled ? 'var(--color-surface)' : 'var(--color-background)',
                  color: afternoonEnabled ? 'var(--color-text)' : 'var(--color-text-muted)',
                  cursor: afternoonEnabled ? 'pointer' : 'not-allowed',
                  width: '100%',
                  boxShadow: afternoonEnabled ? 'inset 3px 3px 0 rgba(45, 61, 45, 0.1)' : 'none'
                }}
              />
            </div>
          </div>
          
          {/* Save Button */}
          <div style={{ marginTop: 'var(--space-md)' }}>
            <button 
              onClick={handleSavePreferences}
              disabled={!userId}
              className="btn-primary"
              style={{ 
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-sm)',
                fontSize: 'var(--text-sm)',
                padding: 'var(--space-md)'
              }}
            >
              <span>💾</span>
              {saveStatus || 'Save Times'}
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="notification-actions" style={{ 
        display: 'flex', 
        gap: 'var(--space-md)', 
        flexWrap: 'wrap',
        marginTop: 'var(--space-md)'
      }}>
        {loading ? (
          <button disabled className="btn-secondary" style={{ minWidth: '140px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span>⏳</span>
              Processing...
            </span>
          </button>
        ) : !enabled ? (
          <button onClick={enableNotifications} className="btn-primary" style={{ minWidth: '140px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span>🔔</span>
              Enable Reminders
            </span>
          </button>
        ) : (
          <>
            <button 
              onClick={testNotification} 
              className="btn-secondary" 
              style={{ 
                fontSize: 'var(--text-sm)',
                minWidth: '120px'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span>🧪</span>
                Test Now
              </span>
            </button>
            <button 
              onClick={disableNotifications} 
              className="btn-secondary"
              style={{ 
                fontSize: 'var(--text-sm)',
                background: 'linear-gradient(180deg, var(--color-error) 0%, #8A5A5A 100%)',
                minWidth: '140px'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span>🔕</span>
                Disable
              </span>
            </button>
          </>
        )}
      </div>

      {/* Help Text */}
      <div className="notification-help" style={{ 
        marginTop: 'var(--space-lg)',
        padding: 'var(--space-md)',
        background: 'linear-gradient(135deg, var(--color-info) 0%, var(--color-water-dark) 100%)',
        border: '2px solid var(--color-water-dark)',
        fontSize: 'var(--text-xs)',
        color: '#F5FAF5',
        lineHeight: '1.6'
      }}>
        <strong style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>💡 TIP:</strong>
        Notifications work even when the app is closed! Make sure your browser allows notifications from this site.
      </div>
    </div>
  );
}
