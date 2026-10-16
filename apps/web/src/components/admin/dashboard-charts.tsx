"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatPriceIdr } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "#F59E0B", // amber
  proof_uploaded: "#3B82F6",  // blue
  paid: "#10B981",            // green
  packed: "#8B5CF6",          // purple
  done: "#111111",            // black
  cancelled: "#EF4444",       // red
};

interface DashboardChartsProps {
  revenueChart: Array<{ date: string; revenue_idr: number; orders_count: number }>;
  statusBreakdown: Array<{ status: string; label: string; count: number }>;
  salesByBrand: Array<{ name: string; revenue_idr: number; percentage: number }>;
}

export function DashboardCharts({
  revenueChart,
  statusBreakdown,
  salesByBrand,
}: DashboardChartsProps) {
  // Format date for chart X axis (e.g. 10 Okt)
  const formattedRevenueData = revenueChart.map((d) => {
    const parts = d.date.split("-");
    const day = parts[2] || "";
    const month = parts[1] || "";
    return {
      ...d,
      displayDate: `${day}/${month}`,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Revenue & Orders Over Time (2 cols on large screens) */}
      <div className="lg:col-span-2 border border-[var(--border-hairline)] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hairline)] mb-4 font-mono text-xs">
          <div>
            <span className="font-bold uppercase tracking-wider text-neutral-900 block">
              Tren Pendapatan & Pesanan
            </span>
            <span className="text-[10px] text-neutral-500">
              Nilai pesanan berstatus Sudah Bayar / Selesai (IDR)
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold text-neutral-400">
            WIB • Tabular
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#111111" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#111111" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEB" vertical={false} />
              <XAxis
                dataKey="displayDate"
                stroke="#76746E"
                fontSize={10}
                tickLine={false}
                fontFamily="var(--font-sans)"
              />
              <YAxis
                stroke="#76746E"
                fontSize={10}
                tickLine={false}
                tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(0)}Jt`}
                fontFamily="var(--font-sans)"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#111111] text-white p-3 font-mono text-xs shadow-xl border border-neutral-700">
                        <p className="font-bold text-[10px] text-neutral-400 uppercase tracking-widest mb-1">
                          Tanggal: {data.date}
                        </p>
                        <p className="font-bold text-sm tnum">
                          {formatPriceIdr(data.revenue_idr)}
                        </p>
                        <p className="text-[11px] text-neutral-300 mt-1">
                          {data.orders_count} pesanan diproses
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue_idr"
                stroke="#111111"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Orders by Status Breakdown */}
      <div className="border border-[var(--border-hairline)] bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hairline)] mb-4 font-mono text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-900">
              Distribusi Status Pesanan
            </span>
            <span className="text-[10px] text-neutral-500 font-bold uppercase">
              Semua
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {statusBreakdown.map((s) => {
              const color = STATUS_COLORS[s.status] || "#76746E";
              return (
                <div key={s.status} className="flex items-center justify-between py-1 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-neutral-700 text-[11px]">{s.label}</span>
                  </div>
                  <span className="font-bold tnum text-neutral-900 bg-neutral-100 px-2 py-0.5 border border-neutral-200 text-[10px]">
                    {s.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Small brand share note */}
        <div className="mt-6 pt-3 border-t border-[var(--border-hairline)] text-[10px] font-mono text-neutral-500">
          Total pesanan tercatat dalam database GMC Surabaya.
        </div>
      </div>
    </div>
  );
}
