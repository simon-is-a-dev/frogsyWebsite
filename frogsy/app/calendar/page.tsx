"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";
import MedicationManager from "../components/MedicationManager";

interface PainEntry {
  pain_date: string;
  pain_level: number;
  notes: string | null;
}

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  created_at?: string;
  archived_at?: string | null;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<PainEntry[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isManagingMeds, setIsManagingMeds] = useState(false);
  const [medsExpanded, setMedsExpanded] = useState(false);
  const router = useRouter();

  const refreshMeds = async () => {
    if (!userId) return;
    const { data: medData } = await supabase
      .from("medications")
      .select("id, name, dosage, created_at, archived_at")
      .eq("user_id", userId)
      .order("name");
    if (medData) setMedications(medData as Medication[]);
  };

  const formatDate = (year: number, month: number, day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // Auth check
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        router.push("/login");
      }
    };
    getUser();
  }, [router]);

  // Fetch pain entries for the current month + medications list (once)
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

      const { data: painData, error: painError } = await supabase
        .from("pain_entries")
        .select("pain_date, pain_level, notes")
        .eq("user_id", userId)
        .gte("pain_date", start)
        .lte("pain_date", end)
        .order("pain_date", { ascending: true });

      if (!painError && painData) setEntries(painData as PainEntry[]);

      if (medications.length === 0) {
        const { data: medData } = await supabase
          .from("medications")
          .select("id, name, dosage, created_at, archived_at")
          .eq("user_id", userId)
          .order("name");
        if (medData) setMedications(medData as Medication[]);
      }
    };

    fetchData();
  }, [currentDate, userId]);

  useEffect(() => { setError(null); }, [currentDate]);

  const prevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getPainForDay = (day: number) => {
    const dayStr = formatDate(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
    return entries.find((e) => e.pain_date === dayStr) ?? null;
  };

  const isFutureDay = (day: number) => {
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    dayDate.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return dayDate > today;
  };

  const handleDayClick = (day: number | null) => {
    if (!day) return;
    if (isFutureDay(day)) {
      setError("You can only log pain for today or past dates.");
      return;
    }
    setError(null);
    const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
    setSelectedDay(dateStr);
    // Auto-expand meds section only if <= 3 meds
    const activeMedCount = medications.filter((med) => {
      if (med.created_at && new Date(med.created_at) > new Date(new Date(dateStr).getTime() + 86400000)) return false;
      if (med.archived_at) {
        const archiveDate = new Date(med.archived_at);
        const endOfDay = new Date(dateStr);
        endOfDay.setDate(endOfDay.getDate() + 1);
        if (archiveDate < endOfDay) return false;
      }
      return true;
    }).length;
    setMedsExpanded(activeMedCount <= 3);
  };

  const generateCalendarDays = () => {
    const days: (number | null)[] = [];
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  };

  const calendarDays = generateCalendarDays();

  // Filter meds relevant to the selected day
  const selectedDateMeds = selectedDay
    ? medications.filter((med) => {
        const dayDate = new Date(selectedDay);
        if (med.created_at && new Date(med.created_at) > new Date(dayDate.getTime() + 86400000)) return false;
        if (med.archived_at) {
          const archiveDate = new Date(med.archived_at);
          const endOfDay = new Date(dayDate);
          endOfDay.setDate(endOfDay.getDate() + 1);
          if (archiveDate < endOfDay) return false;
        }
        return true;
      })
    : [];

  const selectedEntry = selectedDay
    ? entries.find((e) => e.pain_date === selectedDay) ?? null
    : null;

  if (!userId) {
    return <div className="container"><div className="text-center">Loading...</div></div>;
  }

  return (
    <div className="container">
      <div className="screen-only">
        <div className="card">
          <div className="calendar-header">
            <h2 className="calendar-title">
              {currentDate.toLocaleString("default", { month: "long" })} {currentDate.getFullYear()}
            </h2>
          </div>

          <div className="calendar-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}

            {calendarDays.map((day, idx) => {
              const entry = day ? getPainForDay(day) : null;
              const future = day ? isFutureDay(day) : false;
              return (
                <div
                  key={idx}
                  className={`calendar-day ${!day ? "empty" : ""} ${future ? "disabled" : ""}`}
                  role={day ? "button" : undefined}
                  tabIndex={day ? 0 : undefined}
                  onClick={() => day && !future ? handleDayClick(day) : undefined}
                  onKeyDown={(e) => {
                    if (day && !future && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      handleDayClick(day);
                    }
                  }}
                  aria-disabled={future}
                >
                  {day && (
                    <>
                      <div className="calendar-day-number">{day}</div>
                      <div className="calendar-day-content">
                        {entry !== null && (
                          <div className={`calendar-pain-level pain-level-${entry.pain_level}`}>
                            {entry.pain_level}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <p className="text-muted" style={{ color: "var(--color-error)", marginTop: "0.5rem" }}>
              {error}
            </p>
          )}

          <div className="calendar-nav mt-lg">
            <button onClick={prevMonth} className="btn-secondary">Prev</button>
            <button onClick={nextMonth} className="btn-secondary">Next</button>
            <button onClick={() => router.push("/main")} className="btn-secondary">Back</button>
            <button onClick={() => router.push("/report")} className="btn-secondary">Print Report</button>
          </div>

          {/* Day Detail Modal */}
          {selectedDay && (
            <div
              className="modal-backdrop"
              role="presentation"
              onClick={() => { setSelectedDay(null); setIsManagingMeds(false); }}
            >
              <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="day-details-title"
                onClick={(e) => e.stopPropagation()}
                style={isManagingMeds ? { padding: "1rem" } : undefined}
              >
                {isManagingMeds ? (
                  <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1rem",
                        flexShrink: 0,
                      }}
                    >
                      <h3>Manage Medications</h3>
                      <button
                        className="btn-primary"
                        onClick={() => { setIsManagingMeds(false); refreshMeds(); }}
                        style={{ padding: "6px 12px", fontSize: "0.9rem" }}
                      >
                        Done
                      </button>
                    </div>
                    <div style={{ flex: 1, overflowY: "auto" }}>
                      <MedicationManager userId={userId} />
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 id="day-details-title">
                      {new Date(selectedDay + "T12:00:00").toLocaleDateString("default", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </h3>

                    {/* Pain level */}
                    <div className="mb-md">
                      <h4>Pain Level</h4>
                      {selectedEntry ? (
                        <>
                          <span
                            className={`calendar-pain-level pain-level-${selectedEntry.pain_level}`}
                            style={{ display: "inline-block", marginRight: "8px" }}
                          >
                            {selectedEntry.pain_level}
                          </span>
                          {selectedEntry.notes && (
                            <div style={{ marginTop: "8px", fontSize: "0.9rem", fontStyle: "italic" }}>
                              &ldquo;{selectedEntry.notes}&rdquo;
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-muted">No pain logged for this day.</p>
                      )}
                    </div>

                    {/* ── Medications Accordion ── */}
                    <div className="med-accordion mb-md">
                      <button
                        className="med-accordion__toggle"
                        onClick={() => setMedsExpanded((v) => !v)}
                        aria-expanded={medsExpanded}
                      >
                        <span>
                          <span style={{ marginRight: "6px" }}>💊</span>
                          Medications
                          <span className="med-accordion__count">
                            {selectedDateMeds.length}
                          </span>
                        </span>
                        <span
                          className="med-accordion__chevron"
                          style={{
                            transform: medsExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          }}
                        >
                          ▼
                        </span>
                      </button>

                      {medsExpanded && (
                        <div className="med-accordion__body">
                          {selectedDateMeds.length > 0 ? (
                            <div className="med-chips">
                              {selectedDateMeds.map((med) => (
                                <span key={med.id} className="med-chip">
                                  <span className="med-chip__name">{med.name}</span>
                                  {med.dosage && (
                                    <span className="med-chip__dosage">{med.dosage}</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p
                              className="text-muted"
                              style={{ fontSize: "0.85rem", textAlign: "center", padding: "12px 0" }}
                            >
                              No active medications for this day.
                            </p>
                          )}

                          <button
                            onClick={() => setIsManagingMeds(true)}
                            style={{
                              display: "block",
                              marginTop: "10px",
                              background: "none",
                              border: "none",
                              color: "var(--color-primary)",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              fontWeight: "bold",
                              textTransform: "uppercase",
                              padding: 0,
                            }}
                          >
                            Manage →
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="calendar-log-actions mt-lg">
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          const d = selectedDay;
                          setSelectedDay(null);
                          router.push(`/main?date=${d}`);
                        }}
                      >
                        Edit in Main
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => setSelectedDay(null)}
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}