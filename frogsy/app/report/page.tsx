"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

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

export default function ReportPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<PainEntry[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Callback ref for chart sizing — updates when element mounts/unmounts
  const [chartWidth, setChartWidth] = useState(0);
  const [chartHeight, setChartHeight] = useState(200);
  const roRef = useRef<ResizeObserver | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null); // tracks the actual DOM el

  const chartWrapRef = useCallback((el: HTMLDivElement | null) => {
    if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
    elRef.current = el;
    if (!el) return;
    const update = () => {
      setChartWidth(el.clientWidth || 0);
      setChartHeight(el.clientHeight || 200);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    roRef.current = ro;
  }, []);

  // Before printing: set chart to A4 usable width so SVG renders correctly.
  useEffect(() => {
    const PRINT_WIDTH = 672;
    const PRINT_HEIGHT = 260;
    const onBefore = () => {
      setChartWidth(PRINT_WIDTH);
      setChartHeight(PRINT_HEIGHT);
    };
    const onAfter = () => {
      const el = elRef.current;
      if (el) {
        setChartWidth(el.clientWidth || 0);
        setChartHeight(el.clientHeight || 200);
      }
    };
    window.addEventListener('beforeprint', onBefore);
    window.addEventListener('afterprint', onAfter);
    return () => {
      window.removeEventListener('beforeprint', onBefore);
      window.removeEventListener('afterprint', onAfter);
    };
  }, []);

  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
    };
    getUser();
  }, [router]);

  useEffect(() => {
    if (!userId || !startDate || !endDate) return;
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch pain entries
      const { data: painData } = await supabase
        .from("pain_entries")
        .select("pain_date, pain_level, notes")
        .eq("user_id", userId)
        .gte("pain_date", startDate)
        .lte("pain_date", endDate)
        .order("pain_date", { ascending: true });
      if (painData) setEntries(painData as PainEntry[]);

      // Fetch ALL medications (active and archived) to show history correctly
      const { data: medData } = await supabase
        .from("medications")
        .select("id, name, dosage, created_at, archived_at")
        .eq("user_id", userId)
        .order("name");
      if (medData) setMedications(medData as Medication[]);
      
      setLoading(false);
    };
    fetchData();
  }, [userId, startDate, endDate]);

  const stats = useMemo(() => {
    const total = entries.length;
    if (total === 0) return { avg: "—", painFree: 0, highPain: 0, days: 0 };
    const sum = entries.reduce((acc, curr) => acc + curr.pain_level, 0);
    return {
      avg: (sum / total).toFixed(1),
      painFree: entries.filter(e => e.pain_level === 0).length,
      highPain: entries.filter(e => e.pain_level >= 7).length,
      days: total
    };
  }, [entries]);

  const chartData = useMemo(() =>
    entries.map(e => ({
      date: new Date(e.pain_date + "T12:00:00").getDate(),
      pain: e.pain_level,
      fullDate: e.pain_date,
    })), [entries]);

  const calendarGrid = useMemo(() => {
    if (!startDate) return [];
    const start = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [startDate, endDate]);

  const setPreset = (type: 'thisMonth' | 'lastMonth' | 'last30' | 'last3m' | 'last6m' | 'allYear') => {
    const now = new Date();
    let start: Date, end: Date;
    if (type === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === 'lastMonth') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (type === 'last30') {
      end = now;
      start = new Date(); start.setDate(now.getDate() - 30);
    } else if (type === 'last3m') {
      end = now;
      start = new Date(); start.setMonth(now.getMonth() - 3);
    } else if (type === 'last6m') {
      end = now;
      start = new Date(); start.setMonth(now.getMonth() - 6);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    }
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const getPainForDate = (date: Date) => {
    const str = date.toISOString().split("T")[0];
    return entries.find(e => e.pain_date === str)?.pain_level;
  };

  // Dynamic X-axis interval based on data length
  const xInterval = chartData.length > 90 ? 14
    : chartData.length > 60 ? 9
    : chartData.length > 30 ? 4
    : chartData.length > 14 ? 2 : 0;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
  };

  return (
    <div className="rp-page">

      {/* ─── SCREEN CONTROLS (hidden on print) ─── */}
      <div className="rp-controls screen-only">
        <div className="rp-controls-header">
          <h1 className="rp-title">Generate Report</h1>
          <button className="btn-secondary rp-back-btn" onClick={() => router.push('/calendar')}>
            ← Calendar
          </button>
        </div>

        <div className="rp-presets">
          {([
            ['thisMonth', 'This Month'],
            ['lastMonth', 'Last Month'],
            ['last30',    'Last 30d'],
            ['last3m',    'Last 3M'],
            ['last6m',    'Last 6M'],
            ['allYear',   'Full Year'],
          ] as const).map(([type, label]) => (
            <button key={type} className="btn-secondary rp-preset-btn" onClick={() => setPreset(type)}>
              {label}
            </button>
          ))}
        </div>

        <div className="rp-date-row">
          <div className="rp-date-field">
            <label>From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rp-date-input" />
          </div>
          <div className="rp-date-field">
            <label>To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rp-date-input" />
          </div>
          <button className="btn-primary rp-print-btn" onClick={() => window.print()}>
            🖨️ Print
          </button>
        </div>
      </div>

      {/* ─── PRINTABLE REPORT ─── */}
      <div className="rp-report" id="printable-area">

        {/* Report heading */}
        <div className="rp-report-header">
          <h2 className="rp-report-title">Frogsy Pain Report</h2>
          <p className="rp-report-dates">
            {startDate && endDate
              ? `${formatDate(startDate)} — ${formatDate(endDate)}`
              : ''}
          </p>
        </div>

        {loading ? (
          <div className="rp-loading">Generating report…</div>
        ) : (
          <>
            {/* ── STATS ── */}
            <div className="rp-stats-row">
              <div className="rp-stat">
                <div className="rp-stat-label">Average Pain</div>
                <div className="rp-stat-value">{stats.avg}</div>
              </div>
              <div className="rp-stat">
                <div className="rp-stat-label">Pain-Free Days</div>
                <div className="rp-stat-value">{stats.painFree}</div>
              </div>
              <div className="rp-stat">
                <div className="rp-stat-label">Entries Logged</div>
                <div className="rp-stat-value">{stats.days}</div>
              </div>
            </div>

            {/* ── VISUALS: Chart + Calendar ── */}
            <div className="rp-visuals">

              {/* Chart card */}
              <div className="rp-card rp-chart-card">
                <h3 className="rp-card-title">Pain Trends</h3>
                {chartData.length === 0 ? (
                  <div className="rp-empty">No data for this period</div>
                ) : (
                  <div className="rp-chart-wrap" ref={chartWrapRef}>
                    {chartWidth > 0 && (
                      <LineChart
                        data={chartData}
                        width={chartWidth}
                        height={chartHeight}
                        margin={{ top: 4, right: 8, bottom: 4, left: -10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e8e0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 9, fontFamily: 'inherit' }}
                          interval={xInterval}
                        />
                        <YAxis
                          domain={[0, 10]}
                          tick={{ fontSize: 9, fontFamily: 'inherit' }}
                          width={28}
                          ticks={[0, 2, 4, 6, 8, 10]}
                        />
                        <Tooltip
                          contentStyle={{ fontSize: '0.7rem', padding: '4px 8px', fontFamily: 'inherit' }}
                          formatter={(val) => [`${val}`, 'Pain']}
                          labelFormatter={(d) => `Day ${d}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="pain"
                          stroke="#2d5a4d"
                          strokeWidth={2}
                          dot={chartData.length > 60 ? false : { r: 2, fill: '#2d5a4d' }}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    )}
                  </div>
                )}
              </div>

              {/* Calendar card */}
              <div className="rp-card rp-calendar-card">
                <h3 className="rp-card-title">Calendar Overview</h3>
                <div className="rp-cal-grid">
                  {calendarGrid.map((date, i) => {
                    const pain = getPainForDate(date);
                    return (
                      <div key={i} className={`rp-cal-day ${pain === undefined ? 'rp-cal-empty' : ''}`}>
                        {pain !== undefined && (
                          <div className={`calendar-pain-level pain-level-${pain}`}>
                            {pain}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── DETAILED LOGS ── */}
            <div className="rp-logs">
              <div className="rp-card">
                <h3 className="rp-card-title">Detailed Log</h3>
                {entries.length === 0 ? (
                  <p className="rp-empty">No entries found.</p>
                ) : (
                  <div className="rp-log-list">
                    {/* Meds banner removed as requested */}
                    
                    {entries.map((entry, idx) => {
                      // Filter meds active on this day (hide if archived *before* end of day)
                      const entryDate = new Date(entry.pain_date);
                      const nextDay = new Date(entryDate);
                      nextDay.setDate(nextDay.getDate() + 1);

                      const activeMeds = medications.filter(m => {
                         // Must be created before end of this day
                         const created = m.created_at ? new Date(m.created_at) : new Date(0);
                         if (created >= nextDay) return false;
                         
                         // Must NOT be archived before end of this day
                         if (m.archived_at) {
                           const archived = new Date(m.archived_at);
                           if (archived < nextDay) return false;
                         }
                         return true;
                      });

                      return (
                        <div key={idx} className="rp-log-row" style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '80px 40px 1fr', 
                          gap: '12px', 
                          alignItems: 'start',
                          padding: '8px 0',
                          borderBottom: '1px solid #eee'
                        }}>
                          <span className="rp-log-date" style={{ fontSize: '0.9rem', color: '#555' }}>
                            {formatDate(entry.pain_date)}
                          </span>
                          
                          <span
                            className={`rp-log-badge pain-level-${entry.pain_level}`}
                            style={{ 
                              color: entry.pain_level >= 8 ? 'white' : 'black',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              fontWeight: 'bold',
                              fontSize: '1rem'
                            }}
                          >
                            {entry.pain_level}
                          </span>

                          <div className="rp-log-content">
                            {/* Meds Row */}
                            {activeMeds.length > 0 && (
                              <div className="rp-log-meds" style={{ fontSize: '0.85rem', color: '#555', marginBottom: '4px', fontWeight: 500 }}>
                                💊 {activeMeds.map(m => m.name + (m.dosage ? ` (${m.dosage})` : '')).join(', ')}
                              </div>
                            )}

                            {/* Notes Row */}
                            <div className="rp-log-text" style={{ fontSize: '0.95rem', color: '#333' }}>
                                {entry.notes ? (
                                  entry.notes 
                                ) : (
                                  !activeMeds.length && <span style={{ color: '#aaa', fontStyle: 'italic', fontSize: '0.85rem' }}>No notes or meds</span>
                                )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
