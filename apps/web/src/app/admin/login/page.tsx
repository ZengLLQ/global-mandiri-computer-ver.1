"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Mail, KeyRound, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("admin@gmc.co.id");
  const [password, setPassword] = useState("admin123");
  const [totpCode, setTotpCode] = useState("");
  const [is2FaStep, setIs2FaStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lockoutSecs, setLockoutSecs] = useState<number | null>(null);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSecs === null || lockoutSecs <= 0) return;
    const interval = setInterval(() => {
      setLockoutSecs((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSecs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          totp_code: is2FaStep ? totpCode : undefined,
        }),
      });

      if (res.require_2fa && !is2FaStep) {
        setIs2FaStep(true);
        setLoading(false);
        return;
      }

      if (res.success) {
        router.push("/admin");
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
        if (err.message.includes("detik")) {
          const match = err.message.match(/(\d+)\s*detik/);
          if (match) {
            setLockoutSecs(parseInt(match[1], 10));
          }
        }
      } else {
        setErrorMsg("Koneksi ke backend server gagal. Pastikan API aktif di port 8080.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center p-4 selection:bg-[#111111] selection:text-white">
      <div className="w-full max-w-md border border-[var(--border-hairline)] bg-white p-8 md:p-10 shadow-xs relative">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between pb-6 border-b border-[var(--border-hairline)] mb-8">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm tracking-wider font-extrabold uppercase">
              GMC • ADMIN
            </span>
            <span className="text-[10px] bg-[var(--bg-card)] px-1.5 py-0.5 font-mono text-[var(--text-muted)] border border-[var(--border-hairline)] uppercase">
              v1.0
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)]">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span className="uppercase tracking-widest text-[10px]">Argon2id + TOTP</span>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[var(--text-primary)]">
            {is2FaStep ? "Verifikasi 2FA" : "Masuk Sistem"}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
            {is2FaStep
              ? "Masukkan kode 6-digit dari aplikasi Google Authenticator / 1Password atau gunakan kode pemulihan."
              : "Portal otorisasi internal gerai resmi Global Mandiri Computer ITC Mega Grosir Surabaya."}
          </p>
        </div>

        {/* Error / Lockout Alert */}
        {errorMsg && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold uppercase tracking-wider text-[11px]">Autentikasi Gagal</p>
              <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
              {lockoutSecs !== null && (
                <p className="mt-1.5 font-mono font-bold text-rose-700">
                  Waktu tunggu: {lockoutSecs} detik
                </p>
              )}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!is2FaStep ? (
            <>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Email Otorisasi
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || lockoutSecs !== null}
                    placeholder="nama@gmc.co.id"
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-3.5 py-2.5 pl-9 text-xs font-mono text-[var(--text-primary)] placeholder:text-neutral-400 focus:outline-hidden focus:border-[var(--text-primary)] transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || lockoutSecs !== null}
                    placeholder="••••••••••••"
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-3.5 py-2.5 pl-9 text-xs font-mono text-[var(--text-primary)] placeholder:text-neutral-400 focus:outline-hidden focus:border-[var(--text-primary)] transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Kode Autentikator 6-Digit / Kode Pemulihan
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={12}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  disabled={loading}
                  placeholder="123456 atau 1234-5678"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-3.5 py-2.5 pl-9 text-sm font-mono tracking-widest text-[var(--text-primary)] placeholder:text-neutral-400 focus:outline-hidden focus:border-[var(--text-primary)] transition-colors"
                />
              </div>
              <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1.5">
                Buka aplikasi Google Authenticator, Microsoft Authenticator, atau 1Password di perangkat Anda.
              </p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || lockoutSecs !== null}
              className="w-full bg-[#111111] hover:bg-black text-white text-xs font-mono uppercase tracking-wider py-3 px-4 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Memproses Otorisasi...</span>
              ) : is2FaStep ? (
                <>
                  <span>Verifikasi 2FA & Lanjutkan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Masuk Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {is2FaStep && (
              <button
                type="button"
                onClick={() => setIs2FaStep(false)}
                className="w-full mt-2 text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 text-center transition-colors cursor-pointer"
              >
                ← Kembali ke email & password
              </button>
            )}
          </div>
        </form>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-[var(--border-hairline)] text-[10px] text-[var(--text-muted)] flex items-center justify-between font-mono">
          <span>Surabaya, Jawa Timur (WIB)</span>
          <span>EST. 2008</span>
        </div>
      </div>
    </div>
  );
}
