"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

interface PainEntry {
  pain_date: string;
  pain_level: number;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<PainEntry[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const formatDate = (year: number, month: number, day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        router.push('/login');
      }
    };
    getUser();
  }, [router]);

  // Fetch pain entries
  useEffect(() => {
    if (!userId) return;

    const fetchEntries = async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      // Calculate last day of month
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

      const { data, error } = await supabase
        .from("pain_entries")
        .select("pain_date, pain_level")
        .eq("user_id", userId)
        .gte("pain_date", start)
        .lte("pain_date", end)
        .order("pain_date", { ascending: true });

      if (!error && data) {
        setEntries(data as PainEntry[]);
      }
    };

    fetchEntries();
  }, [currentDate, userId]);

  useEffect(() => {
    setError(null);
  }, [currentDate]);

  const prevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getPainForDay = (day: number) => {
    const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    const entry = entries.find(e => e.pain_date === dayStr);
    return entry ? entry.pain_level : null;
  };

  const isFutureDay = (day: number) => {
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    dayDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dayDate > today;
  };

  const handleDayClick = (day: number | null) => {
    if (!day) return;
    if (isFutureDay(day)) {
      setError("You can only log pain for today or past dates.");
      return;
    }

    const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
    setError(null);
    // Navigate back to main with the selected date so logging happens there
    router.push(`/main?date=${dateStr}`);
  };

  const generateCalendarDays = () => {
    const days: (number | null)[] = [];
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const startOffset = firstDayOfMonth.getDay();
    for (let i = 0; i < startOffset; i++) days.push(null);

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) days.push(i);
    
    // Fill remaining grid cells
    while (days.length % 7 !== 0) days.push(null);

    return days;
  };

  const calendarDays = generateCalendarDays();

  if (!userId) {
    return (
      <div className="container">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="calendar-header">
          <h2 className="calendar-title">
            {currentDate.toLocaleString("default", { month: "long" })} {currentDate.getFullYear()}
          </h2>
        </div>

        <div className="calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="calendar-day-header">
              {d}
            </div>
          ))}

          {calendarDays.map((day, idx) => {
            const painLevel = day ? getPainForDay(day) : null;
            const future = day ? isFutureDay(day) : false;
            return (
              <div
                key={idx}
                className={`calendar-day ${!day ? 'empty' : ''} ${future ? 'disabled' : ''}`}
                role={day ? "button" : undefined}
                tabIndex={day ? 0 : undefined}
                onClick={() => (day && !future ? handleDayClick(day) : undefined)}
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
                    {painLevel !== null && (
                      <div className={`calendar-pain-level pain-level-${painLevel}`}>
                        {painLevel}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="calendar-nav mt-lg">
          
          <button onClick={prevMonth} className="btn-secondary">
          Prev
          </button>
          <button onClick={nextMonth} className="btn-secondary">
          Next
          </button>

          <button onClick={() => router.push("/main")} className="btn-secondary">
          Back
          </button>
          <button onClick={() => window.print()} className="btn-secondary">
          Print
          </button>
        </div>
      </div>
    </div>
  );
}