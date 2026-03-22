"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface HistoryPoint {
  date: string;
  price: number;
  time: number;
}

interface PriceChartProps {
  data: HistoryPoint[];
  currentPrice: number | null;
}

export default function PriceChart({ data, currentPrice }: PriceChartProps) {
  const chartData = data.length > 0 ? data : [];
  const minPrice = chartData.length
    ? Math.min(...chartData.map((d) => d.price)) * 0.995
    : 70;
  const maxPrice = chartData.length
    ? Math.max(...chartData.map((d) => d.price)) * 1.005
    : 120;

  return (
    <div className="w-full min-h-[240px]" style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={240}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3fb950" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3fb950" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" opacity={0.5} />
          <XAxis
            dataKey="date"
            stroke="#8b949e"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => {
              const d = new Date(v);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            stroke="#8b949e"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#161b22",
              border: "1px solid #30363d",
              borderRadius: "6px",
            }}
            labelStyle={{ color: "#c9d1d9" }}
            formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, "WTI"]}
            labelFormatter={(label) => label}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#3fb950"
            strokeWidth={2}
            fill="url(#priceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
