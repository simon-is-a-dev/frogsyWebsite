"use client";

import { useState, useEffect, useRef } from "react";

interface NotificationManagerProps {
    userId: string | null;
}

export default function NotificationManager({ userId }: NotificationManagerProps) {
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [wakeLockEnabled, setWakeLockEnabled] = useState(false);
    const [nextNotification, setNextNotification] = useState<string>("");
    const [swStatus, setSwStatus] = useState<string>("Checking...");
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

    // Check if notifications are supported
    const notificationsSupported = typeof window !== "undefined" && "Notification" in window;
    const wakeLockSupported = typeof window !== "undefined" && "wakeLock" in navigator;

    useEffect(() => {
        if (!notificationsSupported) return;

        // Check current permission
        setPermission(Notification.permission);

        // Check SW status
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg) {
                    setSwStatus(`Registered (${reg.active ? 'Active' : 'Installed'})`);
                } else {
                    setSwStatus("Not Registered");
                }
            });
        } else {
            setSwStatus("Not Supported");
        }

        // Load saved preference
        const saved = localStorage.getItem("notificationsEnabled");
        if (saved === "true" && Notification.permission === "granted") {
            setNotificationsEnabled(true);
        }
    }, [notificationsSupported]);

    useEffect(() => {
        if (notificationsEnabled && userId) {
            scheduleNotifications();
        } else {
            clearScheduledNotifications();
        }

        return () => clearScheduledNotifications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notificationsEnabled, userId]);

    const requestWakeLock = async () => {
        if (!wakeLockSupported) {
            console.log("Wake Lock API not supported");
            return;
        }

        try {
            wakeLockRef.current = await navigator.wakeLock.request("screen");
            setWakeLockEnabled(true);
            console.log("Wake Lock acquired");

            wakeLockRef.current.addEventListener("release", () => {
                console.log("Wake Lock released");
                setWakeLockEnabled(false);
            });
        } catch (err) {
            console.error("Wake Lock request failed:", err);
        }
    };

    const releaseWakeLock = async () => {
        if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
            setWakeLockEnabled(false);
        }
    };

    const clearScheduledNotifications = () => {
        timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
        timeoutRefs.current = [];
    };

    const scheduleNotifications = () => {
        clearScheduledNotifications();

        const now = new Date();
        const times = [
            { hour: 8, minute: 0, id: '8am' },
            { hour: 19, minute: 0, id: '7pm' }
        ];

        times.forEach(({ hour, minute, id }) => {
            const scheduledTime = new Date();
            scheduledTime.setHours(hour, minute, 0, 0);

            if (scheduledTime <= now) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
            }

            const timeUntilNotification = scheduledTime.getTime() - now.getTime();
            
            console.log(`Scheduling ${id} notification in ${Math.round(timeUntilNotification / 1000 / 60)} minutes (${scheduledTime.toLocaleTimeString()})`);

            const timeout = setTimeout(() => {
                const nowInside = new Date();
                // Double check if we already sent one for this slot today
                const lastSentKey = `lastSent_${id}_${nowInside.toDateString()}`;
                if (!localStorage.getItem(lastSentKey)) {
                    sendNotification();
                    localStorage.setItem(lastSentKey, "true");
                }
                scheduleNotifications();
            }, timeUntilNotification);

            timeoutRefs.current.push(timeout);
        });

        // Add a "safety" check every 5 minutes to catch missed ones if tab was throttled
        const safetyTimeout = setTimeout(() => {
            checkMissedNotifications();
            scheduleNotifications();
        }, 5 * 60 * 1000);
        timeoutRefs.current.push(safetyTimeout);

        updateNextNotificationTime();
    };

    const checkMissedNotifications = () => {
        if (!notificationsEnabled) return;
        
        const now = new Date();
        const times = [
            { hour: 8, minute: 0, id: '8am' },
            { hour: 19, minute: 0, id: '7pm' }
        ];

        times.forEach(({ hour, minute, id }) => {
            const lastSentKey = `lastSent_${id}_${now.toDateString()}`;
            const alreadySent = localStorage.getItem(lastSentKey);

            if (!alreadySent) {
                const targetTime = new Date();
                targetTime.setHours(hour, minute, 0, 0);

                // If we are past the target time but it's still today, send it now
                if (now > targetTime) {
                    console.log(`Missed ${id} notification detected. Sending now.`);
                    sendNotification();
                    localStorage.setItem(lastSentKey, "true");
                }
            }
        });
    };

    const updateNextNotificationTime = () => {
        const now = new Date();
        const times = [
            { hour: 8, minute: 0 },
            { hour: 19, minute: 0 }
        ];

        const scheduledTimes: Date[] = [];

        times.forEach(({ hour, minute }) => {
            const scheduledTime = new Date();
            scheduledTime.setHours(hour, minute, 0, 0);

            if (scheduledTime <= now) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
            }

            scheduledTimes.push(scheduledTime);
        });

        const nextTime = scheduledTimes.sort((a, b) => a.getTime() - b.getTime())[0];

        if (nextTime) {
            const dateStr = nextTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = nextTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            setNextNotification(`${dateStr}, ${timeStr}`);
        }
    };

    const sendNotification = async () => {
        console.log("Notification: Attempting to send...");
        
        if (Notification.permission !== "granted") {
            console.warn("Notification: Permission not granted", Notification.permission);
            alert(`Notification permission is: ${Notification.permission}. Please grant permission first.`);
            return;
        }

        if (!('serviceWorker' in navigator)) {
            console.log("Notification: Service Worker NOT in navigator, using fallback");
            new Notification("Frogsy Test 🐸", { body: "Basic notification fallback" });
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            console.log("Notification: Service Worker ready", registration);
            
            // Simplified options for maximum compatibility
            const options = {
                body: "This is a test notification from Frogsy.",
                icon: "/favicon.png",
                tag: "pain-reminder",
                // Removing vibration/interaction for base test
            };

            await registration.showNotification("Frogsy Test 🐸", options);
            console.log("Notification: showNotification called successfully");
            
            // Helpful hint for Windows users
            if (navigator.userAgent.includes("Windows")) {
                console.log("Windows users: If you don't see the notification, check 'Focus Assist' or 'Do Not Disturb' in your Windows settings.");
            }
        } catch (err) {
            console.error("Notification: Service Worker notification failed:", err);
            new Notification("Frogsy Test 🐸", { body: "Fallback after SW error" });
        }
    };

    const unregisterServiceWorker = async () => {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
            }
            alert("Service Workers unregistered. Please refresh the page.");
            window.location.reload();
        }
    };

    const enableNotifications = async () => {
        if (!notificationsSupported) {
            alert("Notifications are not supported in this browser.");
            return;
        }

        // Check for secure context (HTTPS or localhost)
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            alert("Notifications require a secure connection (HTTPS). Testing on localhost should work, but for production, HTTPS is required.");
        }

        if (Notification.permission === "granted") {
            setNotificationsEnabled(true);
            localStorage.setItem("notificationsEnabled", "true");
            await requestWakeLock();
            scheduleNotifications();
        } else if (Notification.permission !== "denied") {
            try {
                const result = await Notification.requestPermission();
                setPermission(result);

                if (result === "granted") {
                    setNotificationsEnabled(true);
                    localStorage.setItem("notificationsEnabled", "true");
                    await requestWakeLock();
                    scheduleNotifications();
                } else {
                    alert("Notification permission was denied. You can enable them in your browser settings.");
                }
            } catch (err) {
                console.error("Error requesting notification permission:", err);
                alert("Failed to request notification permission. Make sure you are using a secure connection (HTTPS or localhost).");
            }
        } else {
            alert("Notifications are blocked in your browser settings. Please enable them to receive reminders.");
        }
    };

    const disableNotifications = async () => {
        setNotificationsEnabled(false);
        localStorage.setItem("notificationsEnabled", "false");
        clearScheduledNotifications();
        await releaseWakeLock();
    };

    const testNotification = () => {
        sendNotification();
    };

    if (!notificationsSupported) {
        return (
            <div className="card" style={{ marginTop: "1rem" }}>
                <p className="text-muted">Notifications are not supported in this browser.</p>
            </div>
        );
    }

    return (
        <div className="card" style={{ marginTop: "1rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>Daily Reminders 🔔</h3>

            <p className="text-muted" style={{ marginBottom: "1rem" }}>
                Get reminded to log your pain at 8:00 AM and 7:00 PM every day.
            </p>

            <div style={{ marginBottom: "1rem" }}>
                <p>
                    <strong>Status:</strong>{" "}
                    {notificationsEnabled ? (
                        <span style={{ color: "var(--color-success)" }}>✓ Enabled</span>
                    ) : (
                        <span style={{ color: "var(--color-muted)" }}>Disabled</span>
                    )}
                </p>

                {wakeLockSupported && (
                    <p>
                        <strong>Keep Screen Active:</strong>{" "}
                        {wakeLockEnabled ? (
                            <span style={{ color: "var(--color-success)" }}>✓ Active</span>
                        ) : (
                            <span style={{ color: "var(--color-muted)" }}>Inactive</span>
                        )}
                    </p>
                )}

                {notificationsEnabled && nextNotification && (
                    <p className="text-muted" style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
                        Next reminder: {nextNotification}
                    </p>
                )}
            </div>

            {!wakeLockSupported && (
                <div style={{
                    padding: "0.75rem",
                    backgroundColor: "rgba(255, 193, 7, 0.1)",
                    borderRadius: "8px",
                    marginBottom: "1rem",
                    fontSize: "0.9rem"
                }}>
                    ⚠️ Wake Lock not supported. Keep this tab open for reliable notifications.
                </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {!notificationsEnabled ? (
                    <button onClick={enableNotifications} className="btn-primary">
                        Enable Reminders
                    </button>
                ) : (
                    <>
                        <button onClick={disableNotifications} className="btn-secondary">
                            Disable Reminders
                        </button>
                        <button onClick={testNotification} className="btn-secondary">
                            Test Notification
                        </button>
                    </>
                )}
            </div>

            {permission === "denied" && (
                <p style={{
                    marginTop: "1rem",
                    color: "var(--color-error)",
                    fontSize: "0.9rem"
                }}>
                    Notifications are blocked. Please enable them in your browser settings.
                </p>
            )}

            <div style={{ 
                marginTop: "1.5rem", 
                padding: "0.75rem", 
                border: "1px dashed #ccc", 
                borderRadius: "8px",
                fontSize: "0.8rem"
            }}>
                <h4 style={{ marginBottom: "0.5rem" }}>Diagnostic Info</h4>
                <p><strong>Device Time:</strong> {new Date().toLocaleTimeString()}</p>
                <p><strong>Permission:</strong> {permission}</p>
                <p><strong>SW Status:</strong> {swStatus}</p>
                <p><strong>Secure Context:</strong> {typeof window !== 'undefined' && window.isSecureContext ? 'Yes' : 'No'}</p>
                <button 
                    onClick={unregisterServiceWorker}
                    style={{ 
                        marginTop: "0.5rem", 
                        padding: "2px 8px", 
                        fontSize: "0.7rem",
                        backgroundColor: "#f0f0f0",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        cursor: "pointer"
                    }}
                >
                    Reset Service Worker
                </button>
            </div>
        </div>
    );
}
