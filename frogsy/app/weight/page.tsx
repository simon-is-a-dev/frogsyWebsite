"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface WeightEntry {
  id: string;
  target_date: string;
  weight: number;
  notes: string | null;
}

function WeightTrackerContent() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [weightInput, setWeightInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");

  const router = useRouter();

  const todayLocal = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
  }, []);

  const [dateInput, setDateInput] = useState<string>(todayLocal);
  
  // Custom responsive chart sizing
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setChartWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(chartContainerRef.current);
    
    // Initial fallback
    if (chartContainerRef.current.clientWidth > 0) {
      setChartWidth(chartContainerRef.current.clientWidth);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchEntries(user.id);
        setCheckingAuth(false);
      } else {
        router.push("/login");
      }
    };
    getUser();
  }, [router]);

  const fetchEntries = async (uid: string) => {
    const { data, error } = await supabase
      .from("weight_entries")
      .select("*")
      .eq("user_id", uid)
      .order("target_date", { ascending: true }); // Ascending for chart

    if (error) {
      console.error("Error fetching weight entries:", error);
    } else {
      setEntries(data || []);
    }
  };

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    let weightNum = parseFloat(weightInput);
    if (isNaN(weightNum) || weightNum <= 0) {
      setError("Please enter a valid weight.");
      return;
    }

    // Convert to kg for consistent storage if input is in lbs
    if (unit === "lbs") {
      weightNum = weightNum / 2.20462;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const { error: upsertError } = await supabase
      .from("weight_entries")
      .upsert(
        [
          {
            user_id: userId,
            target_date: dateInput,
            weight: weightNum,
            notes: notesInput.trim() === "" ? null : notesInput.trim(),
          }
        ],
        { onConflict: "user_id,target_date" }
      );

    if (upsertError) {
      console.error(upsertError);
      setError("Failed to save weight. Please try again.");
    } else {
      setSuccess("Weight logged successfully!");
      setWeightInput("");
      setNotesInput("");
      fetchEntries(userId); // Refresh data
      setTimeout(() => setSuccess(null), 3000);
    }

    setIsLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this entry?")) return;

    const { error } = await supabase.from("weight_entries").delete().eq("id", id);
    if (error) {
      alert("Failed to delete entry.");
    } else {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    return entries.map(entry => {
      // Convert to requested unit for display
      const displayWeight = unit === "lbs" ? Number((entry.weight * 2.20462).toFixed(1)) : Number(entry.weight.toFixed(1));
      
      return {
        date: new Date(entry.target_date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        weight: displayWeight,
        fullDate: entry.target_date,
        notes: entry.notes
      }
    });
  }, [entries, unit]);

  if (checkingAuth) {
    return (
      <div className="container">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Weight Tracker</h2>
          <button
            onClick={() => router.push("/main")}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '5px 15px' }}
          >
            Back
          </button>
        </div>

        {error && <div className="error-message mb-md">{error}</div>}
        {success && <div className="success-message mb-md">{success}</div>}

        {/* Input Form */}
        <div className="mb-lg p-md" style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <div className="unit-toggle" style={{ display: 'flex', background: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
              <button 
                onClick={() => setUnit("kg")}
                style={{ 
                  padding: '4px 12px', 
                  border: 'none', 
                  background: unit === "kg" ? 'var(--color-primary)' : 'transparent',
                  color: unit === "kg" ? 'white' : '#666',
                  cursor: 'pointer',
                  fontWeight: unit === "kg" ? 'bold' : 'normal',
                  fontSize: '0.8rem'
                }}
              >
                kg
              </button>
              <button 
                onClick={() => setUnit("lbs")}
                style={{ 
                  padding: '4px 12px', 
                  border: 'none', 
                  background: unit === "lbs" ? 'var(--color-primary)' : 'transparent',
                  color: unit === "lbs" ? 'white' : '#666',
                  cursor: 'pointer',
                  fontWeight: unit === "lbs" ? 'bold' : 'normal',
                  fontSize: '0.8rem'
                }}
              >
                lbs
              </button>
            </div>
          </div>
          
          <form onSubmit={handleAddWeight}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Date</label>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  required
                />
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Weight ({unit})</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  placeholder="e.g. 150.5"
                  required
                />
              </div>
            </div>
            
            <div className="mb-md">
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Notes (optional)</label>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="form-control"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
                placeholder="How are you feeling?"
                rows={2}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !weightInput}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              {isLoading ? 'Saving...' : 'Log Weight'}
            </button>
          </form>
        </div>

        {/* Chart Section */}
        {entries.length > 0 && (
          <div className="mb-lg" style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Progress Chart</h3>
            <div 
              ref={chartContainerRef}
              style={{ width: '100%', height: 300, position: 'relative', overflowX: 'hidden' }}
            >
              {chartWidth > 0 && (
                <LineChart width={chartWidth} height={300} data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <Line type="monotone" dataKey="weight" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                  <CartesianGrid stroke="#ccc" strokeDasharray="5 5" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 100 }}
                    labelStyle={{ fontWeight: 'bold', color: '#333' }}
                  />
                </LineChart>
              )}
            </div>
          </div>
        )}

        {/* History List */}
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>History</h3>
          {entries.length === 0 ? (
            <p className="text-muted">No entries yet. Start logging above!</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {/* Reverse to show newest first in list */}
              {[...entries].reverse().map(entry => {
                const displayWeight = unit === "lbs" ? Number((entry.weight * 2.20462).toFixed(1)) : Number(entry.weight.toFixed(1));
                
                return (
                <li key={entry.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '12px 0', 
                  borderBottom: '1px solid #eee' 
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{displayWeight} {unit}</div>
                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {new Date(entry.target_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    {entry.notes && (
                      <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px', fontStyle: 'italic' }}>
                        "{entry.notes}"
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={(e) => handleDelete(entry.id, e)}
                    className="btn-danger"
                    style={{ 
                      color: '#991b1b', 
                      background: '#fee2e2',
                      border: '1px solid #f87171', 
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}
                    title="Delete Entry"
                  >
                    Delete
                  </button>
                </li>
                );
              })}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}

export default function WeightTrackerPage() {
  return (
    <Suspense fallback={<div className="container"><div className="card">Loading...</div></div>}>
      <WeightTrackerContent />
    </Suspense>
  );
}
