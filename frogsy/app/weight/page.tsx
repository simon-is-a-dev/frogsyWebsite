"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";
import dynamic from "next/dynamic";

// Dynamically import the chart with SSR disabled — prevents hydration crashes on mobile
const WeightChart = dynamic(() => import("../components/WeightChart"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#555",
        fontFamily: "Courier New, monospace",
        fontSize: "0.75rem",
        border: "4px solid #2d3d2d",
        background: "rgba(0,0,0,0.02)",
      }}
    >
      Loading chart...
    </div>
  ),
});

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

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      .order("target_date", { ascending: true });

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
          },
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
      fetchEntries(userId);
      setTimeout(() => setSuccess(null), 3000);
    }

    setIsLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this entry?")) return;

    const { error } = await supabase
      .from("weight_entries")
      .delete()
      .eq("id", id);
    if (error) {
      alert("Failed to delete entry.");
    } else {
      setEntries(entries.filter((entry) => entry.id !== id));
    }
  };

  // Prepare chart data — convert stored kg to display unit
  const chartData = useMemo(() => {
    return entries.map((entry) => {
      const displayWeight =
        unit === "lbs"
          ? Number((entry.weight * 2.20462).toFixed(1))
          : Number(entry.weight.toFixed(1));

      return {
        date: new Date(entry.target_date).toLocaleDateString([], {
          month: "short",
          day: "numeric",
        }),
        weight: displayWeight,
      };
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
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h2>Weight Tracker</h2>
          <button
            onClick={() => router.push("/main")}
            className="btn-secondary"
            style={{ fontSize: "0.6rem", padding: "5px 10px" }}
          >
            Back
          </button>
        </div>

        {error && <div className="error-message mb-md">{error}</div>}
        {success && <div className="success-message mb-md">{success}</div>}

        {/* Unit Toggle */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              border: "4px solid #2d3d2d",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setUnit("kg")}
              style={{
                padding: "4px 14px",
                border: "none",
                background:
                  unit === "kg" ? "var(--color-primary)" : "transparent",
                color: unit === "kg" ? "white" : "#333",
                cursor: "pointer",
                fontFamily: "Courier New, monospace",
                fontSize: "0.8rem",
                fontWeight: unit === "kg" ? "bold" : "normal",
              }}
            >
              kg
            </button>
            <button
              onClick={() => setUnit("lbs")}
              style={{
                padding: "4px 14px",
                border: "none",
                background:
                  unit === "lbs" ? "var(--color-primary)" : "transparent",
                color: unit === "lbs" ? "white" : "#333",
                cursor: "pointer",
                fontFamily: "Courier New, monospace",
                fontSize: "0.8rem",
                fontWeight: unit === "lbs" ? "bold" : "normal",
              }}
            >
              lbs
            </button>
          </div>
        </div>

        {/* Input Form */}
        <div
          className="mb-lg"
          style={{
            background: "rgba(0,0,0,0.03)",
            border: "4px solid #2d3d2d",
            padding: "1rem",
          }}
        >
          <form onSubmit={handleAddWeight}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: 'var(--text-sm)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Date
                </label>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: 'var(--text-sm)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Weight ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder={`e.g. ${unit === 'kg' ? '75' : '165'}`}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: 'var(--text-sm)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Notes (optional)
              </label>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                style={{ resize: "vertical" }}
                placeholder="How are you feeling?"
                rows={2}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !weightInput}
              className="btn-primary"
              style={{ width: "100%" }}
            >
              {isLoading ? "Saving..." : "Log Weight"}
            </button>
          </form>
        </div>

        {/* Chart — dynamically loaded, no SSR */}
        {entries.length > 0 && (
          <div className="mb-lg" style={{ marginTop: "2rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>Progress Chart</h3>
            <WeightChart data={chartData} unit={unit} />
          </div>
        )}

        {/* History List */}
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>History</h3>
          {entries.length === 0 ? (
            <p className="text-muted">No entries yet. Start logging above!</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[...entries].reverse().map((entry) => {
                const displayWeight =
                  unit === "lbs"
                    ? Number((entry.weight * 2.20462).toFixed(1))
                    : Number(entry.weight.toFixed(1));

                return (
                  <li
                    key={entry.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 0",
                      borderBottom: "1px solid #ccc",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "0.8rem" }}>
                        {displayWeight} {unit}
                      </div>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          color: "#555",
                          marginTop: "2px",
                        }}
                      >
                        {new Date(entry.target_date).toLocaleDateString(
                          undefined,
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </div>
                      {entry.notes && (
                        <div
                          style={{
                            fontSize: "0.65rem",
                            color: "#666",
                            fontStyle: "italic",
                            marginTop: "2px",
                          }}
                        >
                          &ldquo;{entry.notes}&rdquo;
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDelete(entry.id, e)}
                      style={{
                        color: "#991b1b",
                        background: "#fee2e2",
                        border: "2px solid #f87171",
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: "0.6rem",
                        fontFamily: "Courier New, monospace",
                        textTransform: "uppercase",
                      }}
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
    <Suspense
      fallback={
        <div className="container">
          <div className="card">Loading...</div>
        </div>
      }
    >
      <WeightTrackerContent />
    </Suspense>
  );
}
