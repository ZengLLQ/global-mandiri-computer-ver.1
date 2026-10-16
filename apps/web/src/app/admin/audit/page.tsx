"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  Code,
  X,
  FileText,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface AuditLogItem {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  before_json?: Record<string, any> | null;
  after_json?: Record<string, any> | null;
  created_at: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  // Selected Log for JSON Diff Viewer
  const [inspectTarget, setInspectTarget] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (entityFilter !== "all") params.set("entity_type", entityFilter);

      const res = await apiClient(`/api/v1/admin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase font-mono flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-neutral-800" /> Log Audit & Jejak Aktivitas
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            Log mutasi data bersifat append-only dan immutable • Mencatat waktu, aktor, IP, dan payload sebelum & sesudah
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3 py-1.5 border border-[var(--border-hairline)] bg-white font-mono text-xs uppercase hover:border-black flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Muat Ulang
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[var(--border-hairline)] p-4 space-y-3 font-mono text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Action Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">
              Filter Aksi
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-[var(--border-hairline)] cursor-pointer"
            >
              <option value="all">Semua Jenis Aksi</option>
              <option value="login">Login & Sesi</option>
              <option value="product">Produk & Stok</option>
              <option value="order">Pesanan & Pembayaran</option>
              <option value="customer">Pelanggan & Catatan</option>
              <option value="review">Moderasi Ulasan</option>
              <option value="import">Impor Katalog Excel</option>
              <option value="settings">Pengaturan Toko</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">
              Tipe Entitas
            </label>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-[var(--border-hairline)] cursor-pointer"
            >
              <option value="all">Semua Entitas</option>
              <option value="order">Order (Pesanan)</option>
              <option value="product">Product (Katalog)</option>
              <option value="customer">Customer (Pelanggan)</option>
              <option value="review">Review (Ulasan)</option>
              <option value="brand">Brand</option>
              <option value="category">Category</option>
              <option value="settings">Settings (Pengaturan)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setActionFilter("all");
                setEntityFilter("all");
                setPage(1);
              }}
              className="w-full py-2 border border-[var(--border-hairline)] bg-neutral-50 hover:bg-neutral-100 uppercase cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-[var(--border-hairline)] overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center font-mono text-xs text-[var(--text-muted)] space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-black" />
            <p>Memuat rekam jejak audit...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-[var(--text-muted)] space-y-2">
            <Activity className="w-8 h-8 mx-auto text-neutral-300" />
            <p>Tidak ada entri log audit yang sesuai filter.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono text-[10px] uppercase font-bold text-[var(--text-muted)]">
                <th className="p-3">Waktu (WIB)</th>
                <th className="p-3">Pelaksana</th>
                <th className="p-3">Aksi & Entitas</th>
                <th className="p-3">Target ID</th>
                <th className="p-3">IP Address</th>
                <th className="p-3 text-right">Detail Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="p-3 text-[var(--text-muted)] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("id-ID", {
                      timeZone: "Asia/Jakarta",
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}{" "}
                    WIB
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-[var(--text-primary)] block">
                      {log.user_email || "System Engine"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 bg-neutral-100 border border-neutral-300 font-bold uppercase text-[9px]">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        on {log.entity_type}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-[11px] text-[var(--text-muted)]">
                    {log.entity_id ? log.entity_id.slice(0, 16) : "-"}
                  </td>
                  <td className="p-3 text-[11px] text-[var(--text-muted)]">
                    {log.ip_address || "127.0.0.1"}
                  </td>
                  <td className="p-3 text-right">
                    {(log.before_json || log.after_json) ? (
                      <button
                        onClick={() => setInspectTarget(log)}
                        className="px-2 py-1 border border-[var(--border-hairline)] bg-white text-[10px] uppercase font-bold hover:border-black cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <Code className="w-3 h-3" /> Periksa Diff
                      </button>
                    ) : (
                      <span className="text-[11px] text-neutral-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && logs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-[var(--text-muted)]">
          <div>
            Menampilkan halaman <span className="font-bold text-black">{page}</span> dari{" "}
            <span className="font-bold text-black">{totalPages}</span> ({total} total log aktivitas)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border border-[var(--border-hairline)] bg-white disabled:opacity-40 cursor-pointer hover:border-black"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border border-[var(--border-hairline)] bg-white disabled:opacity-40 cursor-pointer hover:border-black"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* JSON Diff Inspector Modal */}
      {inspectTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--border-hairline)] max-w-2xl w-full shadow-2xl p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <div>
                <span className="font-bold uppercase block text-sm">
                  Inspeksi Payload Mutasi: {inspectTarget.action}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  Entitas: {inspectTarget.entity_type} ({inspectTarget.entity_id || "-"}) • Aktor:{" "}
                  {inspectTarget.user_email || "System"}
                </span>
              </div>
              <button
                onClick={() => setInspectTarget(null)}
                className="text-[var(--text-muted)] hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-red-800 block mb-1">
                  Sebelumnya (Before)
                </span>
                <pre className="p-3 border border-[var(--border-hairline)] bg-neutral-50 text-[11px] overflow-auto max-h-64 leading-relaxed whitespace-pre-wrap">
                  {inspectTarget.before_json
                    ? JSON.stringify(inspectTarget.before_json, null, 2)
                    : "(Tidak ada data sebelum)"}
                </pre>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-1">
                  Sesudahnya (After)
                </span>
                <pre className="p-3 border border-[var(--border-hairline)] bg-neutral-50 text-[11px] overflow-auto max-h-64 leading-relaxed whitespace-pre-wrap">
                  {inspectTarget.after_json
                    ? JSON.stringify(inspectTarget.after_json, null, 2)
                    : "(Tidak ada data sesudah)"}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--border-hairline)]">
              <button
                onClick={() => setInspectTarget(null)}
                className="px-4 py-1.5 bg-black text-white uppercase font-bold hover:bg-neutral-800 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
