"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Users,
  AlertCircle,
  Clock,
  Package,
  MessageSquare,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatPriceIdr } from "@/lib/utils";
import { DashboardCharts } from "@/components/admin/dashboard-charts";

interface DashboardData {
  kpis: {
    revenue_idr: number;
    order_count: number;
    average_order_value_idr: number;
    new_customers_count: number;
    period: string;
  };
  needs_attention: {
    pending_proof_verification: number;
    expiring_unpaid_orders: number;
    unpacked_paid_orders: number;
    pending_reviews: number;
    zero_price_products: number;
    low_stock_products: number;
    unread_notifications: number;
  };
  revenue_chart: Array<{ date: string; revenue_idr: number; orders_count: number }>;
  status_breakdown: Array<{ status: string; label: string; count: number }>;
  top_products: Array<{
    product_name: string;
    brand: string;
    total_sold: number;
    total_revenue_idr: number;
  }>;
  sales_by_brand: Array<{ name: string; revenue_idr: number; percentage: number }>;
  recent_orders: Array<{
    id: string;
    order_number: string;
    customer_name: string;
    customer_phone: string;
    total_amount_idr: number;
    status: string;
    created_at: string;
  }>;
  recent_activity: Array<{
    id: string;
    action: string;
    entity_type: string;
    user_email: string | null;
    created_at: string;
  }>;
}

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending_payment: { label: "Menunggu Bayar", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  proof_uploaded: { label: "Bukti Diunggah", bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  paid: { label: "Sudah Bayar", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  packed: { label: "Siap / Dikemas", bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  done: { label: "Selesai", bg: "bg-neutral-100", text: "text-neutral-900", border: "border-neutral-300" },
  cancelled: { label: "Dibatalkan", bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
};

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "all">("30d");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDashboard = async (selectedPeriod: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch<DashboardData>(
        `/api/v1/admin/dashboard/overview?period=${selectedPeriod}`
      );
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memuat ringkasan dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(period);
  }, [period]);

  const kpis = data?.kpis;
  const attention = data?.needs_attention;

  return (
    <div className="space-y-8 font-sans">
      {/* ---------------- TOP PAGE HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-bold block mb-1">
            Pusat Kendali Gerai • ITC Mega Grosir Surabaya
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-neutral-900">
            Ringkasan Operasional
          </h1>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-white border border-[var(--border-hairline)] p-1 font-mono text-xs shadow-2xs">
          {[
            { id: "today", label: "Hari Ini" },
            { id: "7d", label: "7 Hari" },
            { id: "30d", label: "30 Hari" },
            { id: "all", label: "Semua" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`px-3 py-1 font-bold transition-all cursor-pointer ${
                period === p.id
                  ? "bg-[#111111] text-white"
                  : "text-neutral-600 hover:text-black hover:bg-neutral-100"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => fetchDashboard(period)}
            title="Muat Ulang Data"
            className="p-1.5 text-neutral-500 hover:text-black cursor-pointer ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {/* ---------------- 1. KPI CARDS ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pendapatan */}
        <div className="bg-white border border-[var(--border-hairline)] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[var(--text-muted)] tracking-wider mb-2">
            <span>Total Pendapatan</span>
            <CreditCard className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl font-black tracking-tight text-neutral-900 tnum">
            {formatPriceIdr(kpis?.revenue_idr || 0)}
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-2">
            Hanya pesanan PAID, PACKED & DONE
          </div>
        </div>

        {/* Jumlah Pesanan */}
        <div className="bg-white border border-[var(--border-hairline)] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[var(--text-muted)] tracking-wider mb-2">
            <span>Total Pesanan Masuk</span>
            <ShoppingBag className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl font-black tracking-tight text-neutral-900 tnum">
            {kpis?.order_count || 0}
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-2">
            Dalam rentang periode terpilih
          </div>
        </div>

        {/* Nilai Rata-rata Pesanan (AOV) */}
        <div className="bg-white border border-[var(--border-hairline)] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[var(--text-muted)] tracking-wider mb-2">
            <span>Rata-Rata Pesanan (AOV)</span>
            <TrendingUp className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl font-black tracking-tight text-neutral-900 tnum">
            {formatPriceIdr(kpis?.average_order_value_idr || 0)}
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-2">
            Per transaksi berhasil diverifikasi
          </div>
        </div>

        {/* Pelanggan Baru */}
        <div className="bg-white border border-[var(--border-hairline)] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[var(--text-muted)] tracking-wider mb-2">
            <span>Pelanggan Baru</span>
            <Users className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl font-black tracking-tight text-neutral-900 tnum">
            {kpis?.new_customers_count || 0}
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-2">
            Akun terdaftar dalam periode ini
          </div>
        </div>
      </div>

      {/* ---------------- 2. NEEDS ATTENTION PANEL (The most important block) ---------------- */}
      <div className="border border-[var(--border-hairline)] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hairline)] mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-pulse" />
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-neutral-900">
              Antrean Tindakan Diperlukan (Needs Attention)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            Klik untuk langsung membuka daftar terfilter
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
          {/* 1. Menunggu Verifikasi Bukti */}
          <Link
            href="/admin/orders?status=proof_uploaded"
            className="p-3.5 border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 transition-colors flex items-center justify-between group"
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-900 block">
                Verifikasi Bukti Transfer
              </span>
              <span className="text-[11px] text-blue-700 mt-0.5 block">
                Pelanggan telah unggah bukti BCA
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-lg text-blue-900 tnum">
                {attention?.pending_proof_verification || 0}
              </span>
              <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* 2. Belum Bayar Menjelang Kadaluarsa */}
          <Link
            href="/admin/orders?status=pending_payment"
            className="p-3.5 border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 transition-colors flex items-center justify-between group"
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-900 block">
                Pesanan Mendekati Expired
              </span>
              <span className="text-[11px] text-amber-700 mt-0.5 block">
                Menunggu bayar &gt; 12 jam (kirim WA)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-lg text-amber-900 tnum">
                {attention?.expiring_unpaid_orders || 0}
              </span>
              <ArrowRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* 3. Sudah Bayar Belum Dikemas */}
          <Link
            href="/admin/orders?status=paid"
            className="p-3.5 border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 transition-colors flex items-center justify-between group"
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-900 block">
                Sudah Bayar • Perlu Dikemas
              </span>
              <span className="text-[11px] text-purple-700 mt-0.5 block">
                Siapkan unit &amp; cetak nota resmi
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-lg text-purple-900 tnum">
                {attention?.unpacked_paid_orders || 0}
              </span>
              <ArrowRight className="w-4 h-4 text-purple-600 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* 4. Ulasan Perlu Moderasi */}
          <Link
            href="/admin/reviews?status=pending"
            className="p-3.5 border border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:bg-neutral-100 transition-colors flex items-center justify-between group"
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-800 block">
                Ulasan Menunggu Moderasi
              </span>
              <span className="text-[11px] text-neutral-500 mt-0.5 block">
                Setujui atau tolak testimoni pembeli
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-lg text-neutral-900 tnum">
                {attention?.pending_reviews || 0}
              </span>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* 5. Produk Tanya Harga (Rp 0) */}
          <Link
            href="/admin/products?price_zero=true"
            className="p-3.5 border border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:bg-neutral-100 transition-colors flex items-center justify-between group"
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-800 block">
                Produk Tanya Harga (Rp 0)
              </span>
              <span className="text-[11px] text-neutral-500 mt-0.5 block">
                Perlu input harga pasar Surabaya
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-lg text-neutral-900 tnum">
                {attention?.zero_price_products || 0}
              </span>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* 6. Peringatan Stok Menipis */}
          <Link
            href="/admin/products?low_stock=true"
            className="p-3.5 border border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:bg-neutral-100 transition-colors flex items-center justify-between group"
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-800 block">
                Peringatan Stok Menipis
              </span>
              <span className="text-[11px] text-neutral-500 mt-0.5 block">
                Kuantitas &le; batas ambang (2 unit)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-lg text-neutral-900 tnum">
                {attention?.low_stock_products || 0}
              </span>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* ---------------- 3. RECHARTS VISUAL ANALYTICS ---------------- */}
      {data && (
        <DashboardCharts
          revenueChart={data.revenue_chart}
          statusBreakdown={data.status_breakdown}
          salesByBrand={data.sales_by_brand}
        />
      )}

      {/* ---------------- 4. DUA KOLOM BAWAH: PESANAN TERBARU & AUDIT LOG ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Tabel 5 Pesanan Terbaru (2 cols) */}
        <div className="lg:col-span-2 border border-[var(--border-hairline)] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hairline)] mb-4 font-mono text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-900">
              Pesanan Masuk Terbaru
            </span>
            <Link
              href="/admin/orders"
              className="text-[10px] uppercase font-bold text-neutral-500 hover:text-black flex items-center gap-1"
            >
              <span>Semua Pesanan</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[var(--border-hairline)] text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="py-2.5 px-3">No. Pesanan</th>
                  <th className="py-2.5 px-3">Pelanggan</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Total (IDR)</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data?.recent_orders && data.recent_orders.length > 0 ? (
                  data.recent_orders.map((order) => {
                    const badge = STATUS_BADGES[order.status] || {
                      label: order.status,
                      bg: "bg-neutral-100",
                      text: "text-neutral-800",
                      border: "border-neutral-300",
                    };
                    return (
                      <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="py-3 px-3 font-bold text-neutral-900">
                          {order.order_number}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-neutral-800">{order.customer_name}</p>
                          <p className="text-[10px] text-neutral-400">{order.customer_phone}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold border uppercase ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-neutral-900 tnum">
                          {formatPriceIdr(order.total_amount_idr)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/admin/orders?order=${order.order_number}`}
                            className="bg-neutral-100 hover:bg-[#111111] hover:text-white border border-neutral-300 px-2.5 py-1 text-[10px] font-bold uppercase transition-colors"
                          >
                            Buka
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-neutral-400">
                      Belum ada pesanan dalam database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kolom Kanan: Umpan Aktivitas Audit Log Terbaru (1 col) */}
        <div className="border border-[var(--border-hairline)] bg-white p-5 shadow-xs flex flex-col justify-between font-mono text-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hairline)] mb-4">
              <span className="font-bold uppercase tracking-wider text-neutral-900">
                Aktivitas Audit Log
              </span>
              <Link
                href="/admin/audit"
                className="text-[10px] uppercase font-bold text-neutral-500 hover:text-black flex items-center gap-1"
              >
                <span>Log Penuh</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {data?.recent_activity && data.recent_activity.length > 0 ? (
                data.recent_activity.slice(0, 7).map((log) => {
                  return (
                    <div key={log.id} className="pb-2.5 border-b border-neutral-100 last:border-none">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-neutral-900 uppercase">
                          {log.action}
                        </span>
                        <span className="text-neutral-400">
                          {new Date(log.created_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          WIB
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-0.5 truncate">
                        Oleh: {log.user_email || "Sistem"} • Entitas: {log.entity_type}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-neutral-400 text-xs">
                  Belum ada log mutasi tercatat.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-hairline)] text-[10px] text-neutral-400">
            Log bersifat append-only (tidak dapat dimanipulasi atau dihapus).
          </div>
        </div>
      </div>
    </div>
  );
}
