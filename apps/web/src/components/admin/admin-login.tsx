"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, KeyRound } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

export function AdminLogin() {
  const { login, lockoutUntil } = useAuthStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutSec, setLockoutSec] = useState<number>(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutSec(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutSec(remaining);
      if (remaining === 0) {
        setErrorMessage(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage("Mohon lengkapi ID Pengguna dan Kata Sandi.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    // Cryptographic authentication execution
    const res = await login(username, password);

    setSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Top Security Bar */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 border-b border-[var(--border-hairline)] text-micro-label text-[var(--text-muted)] tracking-widest">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono font-bold uppercase">GMC CRYPTO-PORTAL // V2.8</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 font-mono text-[10px]">
          <span>AES-256 / SHA-256 SALTED HASH</span>
          <span>&bull;</span>
          <span>SURABAYA HQ</span>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-md mx-auto my-auto py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="border border-[var(--border-hairline)] bg-[var(--bg-card)] rounded-2xl p-8 sm:p-10 shadow-lg relative overflow-hidden"
        >
          {/* Subtle Hairline Header Accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--text-primary)] to-transparent" />

          {/* Logo & Headline */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] flex items-center justify-center shadow-xs">
              <Shield className="w-6 h-6 stroke-[1.8] text-[var(--text-primary)]" />
            </div>
            <span className="text-micro-label font-bold text-[var(--text-muted)] tracking-[0.2em] block mb-1">
              PANEL KENDALI ADMINISTRATOR
            </span>
            <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--text-primary)]">
              GLOBAL MANDIRI <span className="font-light italic">COMPUTER</span>
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Sistem autentikasi terenkripsi &mdash; Akses khusus manajemen toko &amp; gudang inventaris.
            </p>
          </div>

          {/* Alert Message */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="mb-6 p-4 rounded-xl bg-neutral-900 text-white text-xs border border-neutral-700 flex items-start gap-3"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">{errorMessage}</p>
                  {lockoutSec > 0 && (
                    <p className="font-mono text-[10px] text-neutral-300 mt-1">
                      Sistem terkunci: {lockoutSec} detik tersisa.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-micro-label font-bold text-[var(--text-muted)] block mb-1.5 uppercase">
                ID Administrator
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  required
                  disabled={lockoutSec > 0}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] pl-10 pr-4 py-3 rounded-xl text-xs font-mono font-bold tracking-wider uppercase text-[var(--text-primary)] placeholder:text-neutral-400 focus:outline-none focus:border-[var(--text-primary)] transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-micro-label font-bold text-[var(--text-muted)] block mb-1.5 uppercase">
                Kata Sandi Master
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={lockoutSec > 0}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] pl-10 pr-11 py-3 rounded-xl text-xs font-mono font-bold tracking-wider text-[var(--text-primary)] placeholder:text-neutral-400 focus:outline-none focus:border-[var(--text-primary)] transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || lockoutSec > 0}
              className="w-full mt-2 py-3.5 px-6 rounded-full bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-400 text-xs font-black uppercase tracking-[0.14em] flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>MEMVERIFIKASI HASH...</span>
                </>
              ) : lockoutSec > 0 ? (
                <span>TERKUNCI ({lockoutSec}s)</span>
              ) : (
                <>
                  <span>MASUK KE PANEL TERENKRIPSI</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Secure Hint Box for Owner */}
          <div className="mt-8 pt-6 border-t border-[var(--border-hairline)] text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[10px] font-mono text-[var(--text-muted)]">
              <KeyRound className="w-3 h-3 text-[var(--text-primary)]" />
              <span>Akses Awal: ID <strong>admin</strong> &bull; Sandi <strong>admin2008</strong></span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-2">
              (Kata sandi dapat diganti sewaktu-waktu pada tab Pengaturan Toko)
            </p>
          </div>
        </motion.div>

        {/* Back Link to Public Store */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-micro-label text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-bold inline-flex items-center gap-1.5"
          >
            &larr; KEMBALI KE BERANDA TOKO
          </Link>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="w-full max-w-5xl mx-auto text-center py-4 text-micro-label text-[var(--text-muted)] font-mono">
        &copy; {new Date().getFullYear()} GLOBAL MANDIRI COMPUTER &bull; ITC MEGA GROSIR B5 NO. 7 SURABAYA &bull; ALL RIGHTS RESERVED
      </div>
    </div>
  );
}
