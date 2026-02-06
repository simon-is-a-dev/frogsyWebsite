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

  const notificationsSupported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator;

  useEffect(() => {
    if (!notificationsSupported) return;

    setPermission(Notification.permission);

    navigator.serviceWorker.getRegistration().then((reg) => {
      setSwStatus(reg ? "Registered" : "Not registered");
    });
  }, [notificationsSupported]);

  const enableNotifications = async () => {
    if (!userId) return;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result !== "granted") return;

    const registration = await navigator.serviceWorker.ready;

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

    const swRegistration = await navigator.serviceWorker.ready;
    const sub = await swRegistration.pushManager.getSubscription();

    if (sub) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", sub.endpoint);

      await sub.unsubscribe();
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
      <h3>Daily Reminders 🔔</h3>

      <p className="text-muted">
        You’ll receive reminders at 08:00 and 19:00, even when the app is closed.
      </p>

      <p>
        <strong>Status:</strong>{" "}
        {enabled ? "✓ Enabled" : "Disabled"}
      </p>

      <p>
        <strong>Permission:</strong> {permission}
      </p>

      <p>
        <strong>Service Worker:</strong> {swStatus}
      </p>

      {!enabled ? (
        <button onClick={enableNotifications} className="btn-primary">
          Enable Reminders
        </button>
      ) : (
        <button onClick={enableNotifications} className="btn-secondary">
          Disable Reminders
        </button>
      )}
    </div>
  );
}
