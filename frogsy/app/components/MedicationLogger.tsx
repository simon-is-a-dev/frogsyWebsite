"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

interface Medication {
  id: string;
  name: string;
  dosage: string;
}

export default function MedicationLogger({ userId }: { userId: string | null }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<Set<string>>(new Set()); // Track IDs logged in this session

  useEffect(() => {
    if (userId) {
      fetchMedications();
      // Reset recent logs on day change? For now, just per session.
    }
  }, [userId]);

  const fetchMedications = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("medications")
      .select("id, name, dosage")
      .eq("user_id", userId)
      .order("name");

    setMedications(data || []);
    setLoading(false);
  };

  const handleLogMedication = async (med: Medication) => {
    if (!userId) return;
    setLoggingId(med.id);
    
    // Optimistic UI update or wait for server? Let's wait for server but show spinner.
    const { error } = await supabase
      .from("medication_logs")
      .insert([
        {
          user_id: userId,
          medication_id: med.id,
          taken_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error("Error logging medication:", error);
      alert("Failed to log medication. Please try again.");
    } else {
      setSuccessMsg(`Logged ${med.name}`);
      setRecentLogs(prev => new Set(prev).add(med.id));
      setTimeout(() => setSuccessMsg(null), 3000);
    }
    setLoggingId(null);
  };

  if (loading) return null; // Don't show anything while loading to avoid layout shift, or show skeleton

  if (medications.length === 0) {
    return (
      <div className="medication-logger-empty">
        <p className="text-muted text-center" style={{ fontSize: '0.9rem' }}>
          No medications set up. <a href="/settings" style={{ textDecoration: 'underline' }}>Configure in Settings</a>
        </p>
      </div>
    );
  }

  return (
    <div className="medication-logger mt-lg pt-md" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
      <h3 className="mb-sm">Quick Meds</h3>
      
      {successMsg && (
        <div className="success-message mb-sm" style={{ padding: '8px', fontSize: '0.9rem' }}>
          {successMsg}
        </div>
      )}

      <div className="medication-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {medications.map(med => {
            const isJustLogged = recentLogs.has(med.id);
            return (
            <button
                key={med.id}
                onClick={() => handleLogMedication(med)}
                disabled={loggingId === med.id}
                className={`btn-secondary ${isJustLogged ? 'btn-success' : ''}`}
                style={{ 
                flex: '1 0 calc(50% - 5px)', // 2 columns
                textAlign: 'left',
                padding: '10px',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isJustLogged ? 'rgba(76, 175, 80, 0.1)' : undefined,
                borderColor: isJustLogged ? 'var(--color-success)' : undefined,
                }}
            >
                <div>
                <span style={{ fontWeight: 'bold', display: 'block' }}>{med.name}</span>
                {med.dosage && <span className="text-muted" style={{ fontSize: '0.8rem' }}>{med.dosage}</span>}
                </div>
                {loggingId === med.id ? (
                <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: '#333', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                ) : (
                <span style={{ fontSize: '1.2rem' }}>💊</span>
                )}
            </button>
            )
        })}
      </div>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
