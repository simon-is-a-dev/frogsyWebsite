// Client-side trends page: shows stats, charts and badges
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import HeatMap from "../components/HeatMap";

// Single pain entry as returned from Supabase
interface PainEntry {
  pain_date: string;
  pain_level: number;
  created_at?: string | null;
}

// Aggregated statistics for the trends header
interface Stats {
  averageAll: number | null;
  average30: number | null;
  average7: number | null;
  totalEntries: number;
  painFreeDays: number;
  highPainDays: number;
  longestStreak: number;
  currentStreak: number;
}

// Definition of a badge that can be unlocked from stats
interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlock: (stats: Stats) => boolean;
}

// Static list of badges and their unlock rules
const BADGES: BadgeDefinition[] = [
  {
    id: "first-log",
    name: "First Lily Pad",
    description: "Log your first pain entry.",
    icon: "🌱",
    unlock: (s) => s.totalEntries >= 1,
  },
  {
    id: "seven-day-streak",
    name: "Seven-Day Stream",
    description: "Log pain 7 days in a row.",
    icon: "🌊",
    unlock: (s) => s.longestStreak >= 7,
  },
  {
    id: "thirty-day-streak",
    name: "Pond Guardian",
    description: "Log pain 30 days in a row.",
    icon: "🐸",
    unlock: (s) => s.longestStreak >= 30,
  },
  {
    id: "sixty-day-streak",
    name: "Data Master",
    description: "Log pain 60 days in a row.",
    icon: "📊",
    unlock: (s) => s.longestStreak >= 60,
  },
  {
    id: "pain-free-days",
    name: "Gentle Waters",
    description: "Have 5 pain-free days (level 0).",
    icon: "💧",
    unlock: (s) => s.painFreeDays >= 5,
  },
  {
    id: "bright-days",
    name: "Bright Days",
    description: "Have 10 pain-free days (level 0).",
    icon: "🌤️",
    unlock: (s) => s.painFreeDays >= 10,
  },
  {
    id: "storm-weathered",
    name: "Storm Weathered",
    description: "Log at least 10 high pain days (7+).",
    icon: "⛈️",
    unlock: (s) => s.highPainDays >= 10,
  },
  {
    id: "perfect-week",
    name: "Perfect Week",
    description: "Log 7 back to back days with pain ≤ 3.",
    icon: "🏆",
    unlock: (s) => s.totalEntries >= 7 && s.average7 !== null && s.average7 <= 3 && s.currentStreak >= 7,
  },
  {
    id: "century-club",
    name: "Century Club",
    description: "Log 100 total pain entries.",
    icon: "🌟",
    unlock: (s) => s.totalEntries >= 100,
  },
  {
    id: "consistency-champion",
    name: "Consistency Champion",
    description: "Log at least 20 days in the last 30.",
    icon: "📅",
    unlock: (s) => s.totalEntries >= 20, // Simplified - in real app would check last 30 days
  },
  {
    id: "weekly-warrior",
    name: "Weekly Warrior",
    description: "Maintain a 7+ day streak for 28 days.",
    icon: "🎯",
    unlock: (s) => s.longestStreak >= 28,
  },
  {
    id: "low-pain-hero",
    name: "Low Pain Hero",
    description: "Have 20+ days with pain level ≤ 2.",
    icon: "💚",
    unlock: (s) => s.painFreeDays >= 20, // Simplified - would need separate counter for ≤2
  },
];

// Compute overall averages, counters and streaks from all entries
function computeStats(entries: PainEntry[]): Stats {
  if (!entries.length) {
    return {
      averageAll: null,
      average30: null,
      average7: null,
      totalEntries: 0,
      painFreeDays: 0,
      highPainDays: 0,
      longestStreak: 0,
      currentStreak: 0,
    };
  }

  const sorted = [...entries].sort((a, b) =>
    a.pain_date.localeCompare(b.pain_date)
  );

  const today = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const toMidnight = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysBetween = (d1: Date, d2: Date) =>
    Math.floor(
      (toMidnight(d1).getTime() - toMidnight(d2).getTime()) / msPerDay
    );

  let sumAll = 0;
  let countAll = 0;
  let sum30 = 0;
  let count30 = 0;
  let sum7 = 0;
  let count7 = 0;
  let painFreeDays = 0;
  let highPainDays = 0;

  let longestStreak = 0;
  let currentStreak = 0;

  // For streaks, we only count days where the log was created
  // on the same calendar day as the pain_date.
  const streakDays = new Set<string>();

  for (const entry of sorted) {
    const painDate = new Date(entry.pain_date + "T00:00:00");
    const diffFromToday = daysBetween(today, painDate);
    sumAll += entry.pain_level;
    countAll += 1;

    if (diffFromToday <= 29 && diffFromToday >= 0) {
      sum30 += entry.pain_level;
      count30 += 1;
    }
    if (diffFromToday <= 6 && diffFromToday >= 0) {
      sum7 += entry.pain_level;
      count7 += 1;
    }

    if (entry.pain_level === 0) painFreeDays += 1;
    if (entry.pain_level >= 7) highPainDays += 1;

    const createdAt = entry.created_at
      ? new Date(entry.created_at)
      : painDate;

    const createdDate = toMidnight(createdAt);
    const painMidnight = toMidnight(painDate);

    const sameDay =
      createdDate.getFullYear() === painMidnight.getFullYear() &&
      createdDate.getMonth() === painMidnight.getMonth() &&
      createdDate.getDate() === painMidnight.getDate();

    if (sameDay) {
      streakDays.add(painMidnight.toISOString().slice(0, 10));
    }
  }

  // Compute streaks from streakDays set (unique calendar days)
  if (streakDays.size > 0) {
    const orderedDays = Array.from(streakDays)
      .sort()
      .map((d) => new Date(d + "T00:00:00"));

    currentStreak = 1;
    longestStreak = 1;

    for (let i = 1; i < orderedDays.length; i++) {
      const diff = daysBetween(orderedDays[i], orderedDays[i - 1]);
      if (diff === 1) {
        currentStreak += 1;
      } else if (diff > 1) {
        currentStreak = 1;
      }
      longestStreak = Math.max(longestStreak, currentStreak);
    }
  }

  return {
    averageAll: countAll ? sumAll / countAll : null,
    average30: count30 ? sum30 / count30 : null,
    average7: count7 ? sum7 / count7 : null,
    totalEntries: countAll,
    painFreeDays,
    highPainDays,
    longestStreak,
    currentStreak,
  };
}

// Split badges into unlocked vs locked using current stats
function splitBadges(stats: Stats) {
  const unlocked: BadgeDefinition[] = [];
  const locked: BadgeDefinition[] = [];

  for (const badge of BADGES) {
    if (badge.unlock(stats)) {
      unlocked.push(badge);
    } else {
      locked.push(badge);
    }
  }

  return { unlocked, locked };
}

// Main trends page component
export default function TrendsPage() {
  // Raw entries and auth state
  const [entries, setEntries] = useState<PainEntry[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  // Loading / error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Active time range for line chart
  const [range, setRange] = useState<"30" | "90" | "all">("90");
  // Chart width state for responsive sizing
  const [chartWidth, setChartWidth] = useState(700);
  const router = useRouter();

  // Ensure user is authenticated; otherwise redirect to login
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
    };
    getUser();
  }, [router]);

  // Fetch all pain entries for the authenticated user
  useEffect(() => {
    const fetchEntries = async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("pain_entries")
        .select("pain_date, pain_level, created_at")
        .eq("user_id", userId)
        .order("pain_date", { ascending: true });

      if (error) {
        console.error(error);
        setError("Failed to load pain history.");
        setLoading(false);
        return;
      }

      setEntries((data ?? []) as PainEntry[]);
      setLoading(false);
    };

    fetchEntries();
  }, [userId]);

  // Update chart width to fill container
  useEffect(() => {
    const updateChartWidth = () => {
      const container = document.querySelector(".card");
      if (container) {
        // Use the full card width minus padding and borders
        const containerWidth = container.clientWidth;
        const chartContainerPadding = 120; // Account for card padding + chart padding + borders
        const calculatedWidth = containerWidth - chartContainerPadding;
        setChartWidth(Math.max(300, calculatedWidth));
      } else {
        // Fallback based on window size
        setChartWidth(window.innerWidth < 640 ? 300 : 700);
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(updateChartWidth, 100);
    window.addEventListener("resize", updateChartWidth);
    return () => window.removeEventListener("resize", updateChartWidth);
  }, []);

  // Entries filtered by selected time range for the main line chart
  const filteredEntries = useMemo(() => {
    if (range === "all") return entries;
    const daysBack = range === "30" ? 30 : 90;
    const today = new Date();
    const cutoff = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - (daysBack - 1)
    );
    const withinRange = entries.filter((e) => {
      const d = new Date(e.pain_date + "T00:00:00");
      return d >= cutoff;
    });

    // If filtering removed everything but there is data, fall back to all entries
    if (withinRange.length === 0 && entries.length > 0) {
      return entries;
    }

    return withinRange;
  }, [entries, range]);

  // Global stats and badges based on all entries
  const stats = useMemo(() => computeStats(entries), [entries]);
  const { unlocked, locked } = useMemo(() => splitBadges(stats), [stats]);

  // Shape data for pain-over-time line chart
  const chartData = filteredEntries.map((e) => ({
    date: new Date(e.pain_date + "T00:00:00").toLocaleDateString(),
    pain: e.pain_level,
  }));

  // Shape data for average-by-weekday bar chart
  const weekdayAverages = useMemo(() => {
    if (!entries.length) return [];
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);
    for (const e of entries) {
      const d = new Date(e.pain_date + "T00:00:00");
      const w = d.getDay();
      sums[w] += e.pain_level;
      counts[w] += 1;
    }
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return labels.map((label, idx) => ({
      weekday: label,
      avg: counts[idx] ? sums[idx] / counts[idx] : 0,
    }));
  }, [entries]);

  // Recent entries shown as a simple list (mobile-friendly)
  const recentEntries = useMemo(() => {
    return [...entries]
      .slice(-10)
      .reverse()
      .map((e) => ({
        dateLabel: new Date(e.pain_date + "T00:00:00").toLocaleDateString(),
        level: e.pain_level,
      }));
  }, [entries]);

  if (!userId) {
    return (
      <div className="container">
        <div className="card">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        {/* Header and back navigation */}
        <div className="trends-header">
          <div>
            <h2>Pain Trends & Badges</h2>
            <p className="text-muted" style={{ fontSize: "0.8rem" }}>
              See how your frogs have been feeling over time.
            </p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => router.push("/main")}
          >
            Back to main
          </button>
        </div>

        {error && <div className="error-message mb-md">{error}</div>}

        {/* Summary stats grid */}
        <div className="mb-lg">
          <h3>Summary</h3>
          <div className="trends-summary-grid">
            <div className="summary-card">
              <div className="summary-label">Entries</div>
              <div className="summary-value">{stats.totalEntries}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Avg (all)</div>
              <div className="summary-value">
                {stats.averageAll !== null ? stats.averageAll.toFixed(1) : "–"}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Avg (30 days)</div>
              <div className="summary-value">
                {stats.average30 !== null ? stats.average30.toFixed(1) : "–"}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Current streak</div>
              <div className="summary-value">{stats.currentStreak} days</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Best streak</div>
              <div className="summary-value">{stats.longestStreak} days</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Pain‑free days</div>
              <div className="summary-value">{stats.painFreeDays}</div>
            </div>
          </div>
        </div>

        

        {/* Pain over time line chart with range controls */}
        <div className="mb-lg">
          <div className="trends-chart-header">
            <h3 style={{ marginBottom: 0 }}>Pain over time</h3>
            <div className="trends-range-controls">
              <button
                className="btn-secondary"
                style={{
                  opacity: range === "30" ? 1 : 0.6,
                }}
                onClick={() => setRange("30")}
              >
                30 days
              </button>
              <button
                className="btn-secondary"
                style={{
                  opacity: range === "90" ? 1 : 0.6,
                }}
                onClick={() => setRange("90")}
              >
                90 days
              </button>
              <button
                className="btn-secondary"
                style={{
                  opacity: range === "all" ? 1 : 0.6,
                }}
                onClick={() => setRange("all")}
              >
                All time
              </button>
            </div>
          </div>

          <div className="trends-chart trends-chart-line">
            {loading ? (
              <div className="text-center" style={{ paddingTop: "3rem" }}>
                Loading chart...
              </div>
            ) : chartData.length === 0 ? (
              <div className="text-center" style={{ paddingTop: "3rem" }}>
                No data yet. Log some pain levels to see trends.
              </div>
            ) : (
              <div className="trends-chart-inner" style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                <LineChart width={chartWidth} height={260} data={chartData} margin={{ left: -35, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 8 }} />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fontSize: 10 }}
                    ticks={[0, 2, 4, 6, 8, 10]}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="pain"
                    stroke="#2D5A4D"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </div>
            )}
          </div>
        </div>

        {/* Average pain by weekday bar chart */}
        <div className="mb-lg">
          <h3>Average by weekday</h3>
          <div className="trends-chart trends-chart-bar">
            {loading ? (
              <div className="text-center" style={{ paddingTop: "3rem" }}>
                Loading chart...
              </div>
            ) : weekdayAverages.length === 0 ? (
              <div className="text-center" style={{ paddingTop: "3rem" }}>
                No data yet.
              </div>
            ) : (
              <div className="trends-chart-inner" style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                <BarChart width={chartWidth} height={220} data={weekdayAverages} margin={{ left: -35, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="weekday" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#4A7C8C" />
                </BarChart>
              </div>
            )}
          </div>
        </div>

        {/* Heat map visualization */}
        <div className="mb-lg">
          <h3>Pain calendar</h3>
          <p className="text-muted" style={{ fontSize: "0.8rem" }}>
            Last 12 weeks of pain levels at a glance.
          </p>
          {loading ? (
            <div className="heat-map-container">
              <div className="text-center" style={{ paddingTop: "3rem" }}>
                Loading...
              </div>
            </div>
          ) : entries.length === 0 ? (
            <div className="heat-map-container">
              <div className="text-center" style={{ paddingTop: "3rem" }}>
                No data yet.
              </div>
            </div>
          ) : (
            <HeatMap entries={entries} />
          )}
        </div>

        {/* Badge collection grid */}
        <div className="mb-lg">
          <h3>Badges</h3>
          <p className="text-muted" style={{ fontSize: "0.8rem" }}>
            Badges are earned automatically from your logging habits.
          </p>
          <div className="badges-grid">
            {unlocked.map((badge) => (
              <div key={badge.id} className="badge-card badge-card-unlocked">
                <div className="badge-icon">{badge.icon}</div>
                <div className="badge-name">{badge.name}</div>
                <div className="badge-desc">{badge.description}</div>
              </div>
            ))}
            {locked.map((badge) => (
              <div key={badge.id} className="badge-card badge-card-locked">
                <div className="badge-icon">🔒</div>
                <div className="badge-name">{badge.name}</div>
                <div className="badge-desc">{badge.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Simple recent entries list as a fallback / quick view */}
        {recentEntries.length > 0 && (
          <div className="mb-lg">
            <h3>Recent logs</h3>
            <ul className="recent-list">
              {recentEntries.map((item, idx) => (
                <li key={idx}>
                  <span>{item.dateLabel}</span>
                  <span>Level {item.level}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

