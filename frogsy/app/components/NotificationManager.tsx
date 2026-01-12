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
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

    // Check if notifications are supported
    const notificationsSupported = typeof window !== "undefined" && "Notification" in window;
    const wakeLockSupported = typeof window !== "undefined" && "wakeLock" in navigator;

    useEffect(() => {
        if (!notificationsSupported) return;

        // Check current permission
        setPermission(Notification.permission);

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
            { hour: 8, minute: 0 },  // 8:00 AM
            { hour: 19, minute: 0 }  // 7:00 PM
        ];

        times.forEach(({ hour, minute }) => {
            const scheduledTime = new Date();
            scheduledTime.setHours(hour, minute, 0, 0);

            // If the time has passed today, schedule for tomorrow
            if (scheduledTime <= now) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
            }

            const timeUntilNotification = scheduledTime.getTime() - now.getTime();

            const timeout = setTimeout(() => {
                sendNotification();
                // Reschedule for next day
                scheduleNotifications();
            }, timeUntilNotification);

            timeoutRefs.current.push(timeout);
        });

        // Update next notification time display
        updateNextNotificationTime();
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

    const sendNotification = () => {
        if (Notification.permission === "granted") {
            const notification = new Notification("Time to Rate Your Pain! 🐸", {
                body: "Don't forget to log your pain level for today.",
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                tag: "pain-reminder",
                requireInteraction: true
            });

            notification.onclick = () => {
                window.focus();
                window.location.href = "/main";
                notification.close();
            };
        }
    };

    const enableNotifications = async () => {
        if (!notificationsSupported) {
            alert("Notifications are not supported in this browser.");
            return;
        }

        if (Notification.permission === "granted") {
            setNotificationsEnabled(true);
            localStorage.setItem("notificationsEnabled", "true");
            await requestWakeLock();
            scheduleNotifications();
        } else if (Notification.permission !== "denied") {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === "granted") {
                setNotificationsEnabled(true);
                localStorage.setItem("notificationsEnabled", "true");
                await requestWakeLock();
                scheduleNotifications();
            }
        } else {
            alert("Notifications are blocked. Please enable them in your browser settings.");
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
        </div>
    );
}
