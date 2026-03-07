"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface ChartDataPoint {
  date: string;
  weight: number;
}

interface WeightChartProps {
  data: ChartDataPoint[];
  unit: string;
}

export default function WeightChart({ data, unit }: WeightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);

  useLayoutEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.getBoundingClientRect().width;
        if (w > 0) setWidth(w);
      }
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <LineChart
        width={width}
        height={260}
        data={data}
        margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
      >
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#2d5a4d"
          strokeWidth={2}
          dot={{ r: 4, fill: "#2d5a4d" }}
          activeDot={{ r: 7 }}
        />
        <CartesianGrid stroke="#aaa" strokeDasharray="4 4" opacity={0.5} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 8, fontFamily: "'Press Start 2P', monospace" }}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 8, fontFamily: "'Press Start 2P', monospace" }}
          width={38}
        />
        <Tooltip
          contentStyle={{
            border: "3px solid #2d3d2d",
            borderRadius: 0,
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "var(--text-xs)",
            background: "#f5faf5",
          }}
          formatter={(val) => [`${val} ${unit}`, "Weight"]}
        />
      </LineChart>
    </div>
  );
}
