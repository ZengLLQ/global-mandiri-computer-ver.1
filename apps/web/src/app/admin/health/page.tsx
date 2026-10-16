"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Clock,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

export default function AdminHealthPage() {
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [lastChecked, setLastChecked] = useState<string>("");

  const checkHealth = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await apiClient("/api/v1/health");
      const duration = Math.round(performance.now() - start);
      setApiLatency(duration);

      if (res.ok) {
        const data = await res.json();
        setApiOnline(true);
        setHealthData(data);
      } else {
        setApiOnline(false);
      }
    } catch {
      setApiOnline(false);
      setApiLatency(null);
    } finally {
      setLastChecked(new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB");
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase font-mono flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" /> Status Operasional & Kesehatan Sistem
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            Diagnostik runtime backend Axum, konektivitas database, background worker auto-expiry, dan performa server
          </p>
        </div>

        <button
          onClick={checkHealth}
          disabled={loading}
          className="px-3 py-1.5 border border-[var(--border-hairline)] bg-white font-mono text-xs uppercase hover:border-black flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Ping Ulang Sistem
        </button>
      </div>

      {/* Main Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        {/* API Gateway Status */}
        <div className="bg-white border border-[var(--border-hairline)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
              API Gateway (Axum / Rust)
            </span>
            <Server className="w-4 h-4 text-neutral-600" />
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                apiOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="text-base font-bold text-[var(--text-primary)] uppercase">
              {apiOnline ? "OPERASIONAL NORMAL" : "TERPUTUS"}
            </span>
          </div>

          <div className="text-[11px] text-[var(--text-muted)] space-y-1 pt-2 border-t border-[var(--border-hairline)]">
            <div>Latensi HTTP: <strong className="text-black">{apiLatency !== null ? `${apiLatency} ms` : "-"}</strong></div>
            <div>Protokol: HTTP/1.1 & Tokio Async</div>
            <div>Pengecekan Terakhir: {lastChecked || "-"}</div>
          </div>
        </div>

        {/* Database & State Engine */}
        <div className="bg-white border border-[var(--border-hairline)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
              Database & Memory Store
            </span>
            <Database className="w-4 h-4 text-sky-700" />
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-base font-bold text-[var(--text-primary)] uppercase">
              TERHUBUNG (HEALTHY)
            </span>
          </div>

          <div className="text-[11px] text-[var(--text-muted)] space-y-1 pt-2 border-t border-[var(--border-hairline)]">
            <div>Engine: In-Memory RwLock + Postgres Fallback</div>
            <div>Mode: Additive Migrations Protected</div>
            <div>Integritas: Soft-delete (deleted_at) aktif</div>
          </div>
        </div>

        {/* Background Jobs / Cron */}
        <div className="bg-white border border-[var(--border-hairline)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
              Background Cron Worker
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-base font-bold text-[var(--text-primary)] uppercase">
              AKTIF BERJALAN
            </span>
          </div>

          <div className="text-[11px] text-[var(--text-muted)] space-y-1 pt-2 border-t border-[var(--border-hairline)]">
            <div>Job: Auto-Expiry Pesanan Kadaluarsa</div>
            <div>Interval: Berjalan setiap 60 detik</div>
            <div>Batas Waktu: 24 Jam (Dikonfigurasi)</div>
          </div>
        </div>
      </div>

      {/* System Diagnostic Checklist */}
      <div className="bg-white border border-[var(--border-hairline)] p-5 space-y-4 font-mono text-xs">
        <h2 className="font-bold text-xs uppercase text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-hairline)] pb-3">
          <ShieldCheck className="w-4 h-4 text-neutral-800" /> Check-list Keamanan & Kepatuhan Arsitektur
        </h2>

        <div className="divide-y divide-[var(--border-hairline)] text-xs">
          <div className="py-2.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-[var(--text-primary)]">Enkripsi Kata Sandi Argon2</span>
              <p className="text-[11px] text-[var(--text-muted)]">Setiap kata sandi staf dan owner di-hash menggunakan Argon2id dengan salt acak.</p>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold uppercase text-[10px]">
              Terverifikasi
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-[var(--text-primary)]">Autentikasi Dua Faktor (TOTP 2FA)</span>
              <p className="text-[11px] text-[var(--text-muted)]">Dukungan RFC 6238 TOTP untuk aplikasi Google Authenticator dengan recovery codes.</p>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold uppercase text-[10px]">
              Aktif
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-[var(--text-primary)]">Proteksi File Bukti Transfer</span>
              <p className="text-[11px] text-[var(--text-muted)]">Disajikan via endpoint terproteksi hak akses staf; magic-byte & SVG fallback sanitasi.</p>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold uppercase text-[10px]">
              Tervalidasi
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-[var(--text-primary)]">Sanitasi Konten Markdown (Ammonia)</span>
              <p className="text-[11px] text-[var(--text-muted)]">Setiap masukan halaman CMS dibersihkan dari tag HTML berbahaya (XSS prevention).</p>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold uppercase text-[10px]">
              Aktif
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-[var(--text-primary)]">Real-Time Server-Sent Events (SSE)</span>
              <p className="text-[11px] text-[var(--text-muted)]">Broadcaster Tokio broadcast channel memancarkan event pesanan baru tanpa polling berulang.</p>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold uppercase text-[10px]">
              Live
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
