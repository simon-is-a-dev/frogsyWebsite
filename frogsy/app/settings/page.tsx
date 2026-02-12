"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";
import NotificationManager from "../components/NotificationManager";


function SettingsPageContent() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email ?? null);
        setCheckingAuth(false);
      } else {
        router.push("/login");
      }
    };
    getUser();
  }, [router]);

  const goBack = () => {
    router.push("/main");
  };

  const handleExportCSV = async () => {
    if (!userId) return;
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from("pain_entries")
        .select("pain_date, pain_level, notes, created_at")
        .eq("user_id", userId)
        .order("pain_date", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        alert("No data to export yet!");
        setExporting(false);
        return;
      }

      // Create CSV content
      const headers = ["Date", "Pain Level", "Notes", "Created At"];
      const csvRows = [headers.join(",")];

      data.forEach(row => {
        const values = [
          row.pain_date,
          row.pain_level,
          // Escape quotes in notes
          `"${(row.notes || "").replace(/"/g, '""')}"`,
          row.created_at
        ];
        csvRows.push(values.join(","));
      });

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `frogsy_data_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId || !userEmail) return;
    if (!deletePassword) {
      setDeleteError("Please enter your password.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // 1. Verify password by re-authenticating
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: deletePassword,
      });

      if (authError) {
        setDeleteError("Incorrect password. Please try again.");
        setIsDeleting(false);
        return;
      }

      // 2. Delete data
      await Promise.all([
        supabase.from("pain_entries").delete().eq("user_id", userId),
        supabase.from("user_notification_preferences").delete().eq("user_id", userId),
        supabase.from("push_subscriptions").delete().eq("user_id", userId),
      ]);

      // 3. Sign out
      await supabase.auth.signOut();

      // 4. Redirect
      router.push("/login");

    } catch (err) {
      console.error("Deletion failed:", err);
      setDeleteError("An unexpected error occurred. Please try again.");
      setIsDeleting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="container">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Settings</h2>
          <button
            onClick={goBack}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '5px 15px' }}
          >
            Back
          </button>
        </div>

        <NotificationManager userId={userId} />

        <div className="mt-lg pt-md" style={{ borderTop: '1px solid rgba(0,0,0,0.1)', marginTop: '2rem' }}>
          <h3>Data & Privacy</h3>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
            Manage your personal data.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>{exporting ? '⏳' : '📥'}</span>
              {exporting ? 'Exporting...' : 'Export Data (CSV)'}
            </button>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="btn-secondary"
              style={{
                color: 'var(--color-error)',
                borderColor: 'rgba(255, 0, 0, 0.2)',
                background: 'rgba(255, 0, 0, 0.05)'
              }}
            >
              Delete Account
            </button>
          </div>
        </div>

        <div className="mt-lg pt-md" style={{ borderTop: '1px solid rgba(0,0,0,0.1)', marginTop: '2rem' }}>
          <h3>Account</h3>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
            You are signed in as <strong>{userEmail}</strong>.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="btn-secondary"
            style={{ color: 'var(--color-error)' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setIsDeleteModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'var(--color-error)' }}>Delete Account?</h3>
            <p style={{ marginBottom: '1rem' }}>
              This will <strong>permanently delete</strong> all your pain logs, settings, and reminders.
              This action cannot be undone.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}
              >
                Confirm your password to continue:
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Password"
                disabled={isDeleting}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '0.5rem'
                }}
              />
              {deleteError && (
                <div style={{ color: 'var(--color-error)', fontSize: '0.8rem' }}>{deleteError}</div>
              )}
            </div>

            <div className="calendar-log-actions">
              <button
                className="btn-secondary"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn-primary" // Using primary style but overriding color for danger
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                style={{
                  background: 'var(--color-error)',
                  borderColor: 'var(--color-error)',
                  color: 'white'
                }}
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="container"><div className="card">Loading...</div></div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
