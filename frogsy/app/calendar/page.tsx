"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

interface PainEntry {
  pain_date: string;
  pain_level: number;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<PainEntry[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  // Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        // Redirect to login if not authenticated
        router.push('/');
      }
    };
    getUser();
  }, [router]);

  // Fetch pain entries for the visible month
  useEffect(() => {
    if (!userId) return;

    const fetchEntries = async () => {
      const start = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(
        2,
        "0"
      )}-01`;
      const end = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(
        2,
        "0"
      )}-${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()}`;

      const { data, error } = await supabase
        .from("pain_entries")
        .select("pain_date, pain_level")
        .eq("user_id", userId)
        .gte("pain_date", start)
        .lte("pain_date", end)
        .order("pain_date", { ascending: true });

      if (error) {
        // Silent fail - just don't show entries
      } else {
        setEntries(data as PainEntry[]);
      }
    };

    fetchEntries();
  }, [currentDate, userId]);

  const prevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const printMonth = () => window.print();

  const getPainForDay = (day: number) => {
    const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    const entry = entries.find(e => e.pain_date === dayStr);
    return entry ? entry.pain_level : null;
  };

  const generateCalendarDays = () => {
    const days: (number | null)[] = [];
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const startOffset = firstDayOfMonth.getDay();
    for (let i = 0; i < startOffset; i++) days.push(null);

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) days.push(i);

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
            return (
              <div
                key={idx}
                className={`calendar-day ${!day ? 'empty' : ''}`}
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
          <button onClick={() => router.push("/main")} className="btn-secondary">
          Back
          </button>
          <button onClick={prevMonth} className="btn-secondary">
          Prev
          </button>
          <button onClick={nextMonth} className="btn-secondary">
          Next
          </button>
          <button onClick={printMonth} className="btn-secondary">
          Print
          </button>
        </div>
      </div>
    </div>
  );
}
