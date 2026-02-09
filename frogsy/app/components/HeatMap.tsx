// Heat Map Component - Better designed contribution-style visualization
"use client";

import { useState, useEffect, useRef } from "react";

interface PainEntry {
  pain_date: string;
  pain_level: number;
}

interface HeatMapProps {
  entries: PainEntry[];
  startDate?: string; // Optional: Override start date (YYYY-MM-DD)
  endDate?: string;   // Optional: Override end date (YYYY-MM-DD)
}

interface CellData {
  date: string;
  level: number | null;
  isMonthStart?: boolean;
}

export default function HeatMap({ entries, startDate: propStartDate, endDate: propEndDate }: HeatMapProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);

  // Scroll to show recent data on mobile (if no custom range)
  useEffect(() => {
    if (scrollWrapperRef.current && !propStartDate) {
      // Scroll to the right to show the most recent weeks
      scrollWrapperRef.current.scrollLeft = scrollWrapperRef.current.scrollWidth;
    }
  }, [propStartDate]);

  const generateHeatMapData = () => {
    if (!entries) return [];

    const weeks: CellData[][] = [];
    let start: Date;
    let end: Date;

    try {
      if (propStartDate && propEndDate) {
        // Use provided range
        start = new Date(propStartDate);
        end = new Date(propEndDate);
        
        // Validation
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
           throw new Error("Invalid date");
        }
        
        // Adjust start to beginning of week (Sunday)
        start.setDate(start.getDate() - start.getDay());
        // Adjust end to end of week (Saturday)
        end.setDate(end.getDate() + (6 - end.getDay()));
      } else {
        // Default: Last 12 weeks
        const today = new Date();
        start = new Date(today);
        start.setDate(today.getDate() - (12 * 7 - 1));
        // Adjust start to beginning of week
        start.setDate(start.getDate() - start.getDay());
        
        end = new Date(today);
        end.setDate(end.getDate() + (6 - end.getDay()));
      }
    } catch (e) {
      // Fallback
      console.error("HeatMap date error:", e);
      return [];
    }

    const painMap = new Map<string, number>();
    entries.forEach((entry) => {
      if (entry && entry.pain_date) {
        painMap.set(entry.pain_date, entry.pain_level);
      }
    });

    let current = new Date(start);
    let lastMonth = -1;
    let loopGuard = 0;

    // Generate weeks until we pass the end date
    while (current <= end && loopGuard < 1000) { // Safety break
      loopGuard++;
      const weekData: CellData[] = [];
      
      for (let day = 0; day < 7; day++) {
        const dateStr = current.toISOString().split("T")[0];
        const level = painMap.get(dateStr) ?? null;
        const month = current.getMonth();
        const isMonthStart = month !== lastMonth && day === 0;
        
        if (isMonthStart) {
          lastMonth = month;
        }
        
        weekData.push({ 
          date: dateStr, 
          level,
          isMonthStart 
        });
        
        // Advance one day
        current.setDate(current.getDate() + 1);
      }
      
      weeks.push(weekData);
    }

    return weeks;
  };

  const weeks = generateHeatMapData();

  const getMonthLabels = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const labels: { name: string; weekIndex: number; weeksSpan: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week.find((cell) => cell.date !== "");
      if (firstDayOfWeek && firstDayOfWeek.date) {
        const date = new Date(firstDayOfWeek.date + "T00:00:00");
        const month = date.getMonth();
        
        if (month !== lastMonth) {
          // Calculate how many weeks this month spans from current position
          let weeksInMonth = 1;
          for (let i = weekIndex + 1; i < weeks.length; i++) {
            const nextWeekFirstDay = weeks[i].find((cell) => cell.date !== "");
            if (nextWeekFirstDay && nextWeekFirstDay.date) {
              const nextDate = new Date(nextWeekFirstDay.date + "T00:00:00");
              if (nextDate.getMonth() === month) {
                weeksInMonth++;
              } else {
                break;
              }
            }
          }
          
          labels.push({
            name: monthNames[month],
            weekIndex,
            weeksSpan: weeksInMonth
          });
          lastMonth = month;
        }
      }
    });

    return labels.map((label, idx) => {
      const baseWidth = label.weeksSpan * 24; // 18px cell + 6px gap
      
      return (
        <div
          key={label.weekIndex}
          className="heat-map-month"
          style={{ 
            width: `${baseWidth + (label.weekIndex > 0 && weeks[label.weekIndex][0].isMonthStart ? 16 : 0)}px`,
            marginLeft: idx === 0 ? '0' : '0'
          }}
        >
          {label.name}
        </div>
      );
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="heat-map-container">
      <div className="heat-map-scroll-wrapper" ref={scrollWrapperRef}>
        <div className="heat-map-grid">
          {/* Header with months */}
          <div className="heat-map-header">
            <div className="heat-map-months">
              {getMonthLabels()}
            </div>
          </div>

          {/* Body with cells only - no day labels */}
          <div className="heat-map-body">
            {/* Heat map weeks */}
            <div className="heat-map-weeks">
              {weeks.map((week, weekIdx) => {
                const hasMonthStart = week.some(cell => cell.isMonthStart);
                
                return (
                  <div key={weekIdx} className={`heat-map-week ${hasMonthStart ? 'month-start' : ''}`}>
                    {week.map((cell, dayIdx) => {
                      const cellKey = `${weekIdx}-${dayIdx}`;
                      const cellDate = new Date(cell.date + "T00:00:00");
                      const isFuture = cellDate > today;
                      const isEmpty = cell.level === null;
                      
                      return (
                        <div
                          key={cellKey}
                          className={`heat-map-cell ${isFuture ? 'future' : ''} ${isEmpty && !isFuture ? 'no-data' : ''}`}
                          data-level={!isFuture && !isEmpty ? cell.level : undefined}
                          onMouseEnter={() => !isEmpty && !isFuture && setHoveredCell(cellKey)}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {hoveredCell === cellKey && !isEmpty && !isFuture && (
                            <div className="heat-map-tooltip">
                              {formatDate(cell.date)}: Level {cell.level}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend - outside scroll wrapper so it stays fixed */}
      <div className="heat-map-legend">
        <span className="heat-map-legend-label">Less pain</span>
        <div className="heat-map-legend-scale">
          <div className="heat-map-legend-box" style={{ background: "#E8F0E8", borderColor: "rgba(45, 61, 45, 0.15)" }}></div>
          <div className="heat-map-legend-box" style={{ background: "#7ACA8A" }}></div>
          <div className="heat-map-legend-box" style={{ background: "#BAEA8A" }}></div>
          <div className="heat-map-legend-box" style={{ background: "#DACA7A" }}></div>
          <div className="heat-map-legend-box" style={{ background: "#EAAA6A" }}></div>
          <div className="heat-map-legend-box" style={{ background: "#EA8A6A" }}></div>
        </div>
        <span className="heat-map-legend-label">More</span>
      </div>
    </div>
  );
}
