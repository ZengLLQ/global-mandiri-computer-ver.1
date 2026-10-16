"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderQuery, setOrderQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderQuery.trim()) {
      router.push(`/order/${orderQuery.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Modern Unified Header */}
      <Header />

      {/* Breadcrumb */}
      <div className="px-6 md:px-10 lg:px-12 pt-6">
        <div className="w-full text-micro-label text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text-primary)]">BERANDA</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-primary)]">LACAK PESANAN</span>
        </div>
      </div>

      <main className="flex-1 max-w-[800px] w-full mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-tech-tag mb-2">SISTEM PELACAKAN STATUS</p>
          <h1 className="text-display-l mb-4">
            LACAK <span className="text-slant-display">PESANAN.</span>
          </h1>
          <p className="text-body text-[var(--text-muted)] text-xs max-w-md mx-auto">
            Masukkan Nomor Pesanan GMC yang tercantum pada nota/halaman konfirmasi (format: GMC-YYYYMMDD-XXXX).
          </p>
        </div>

        <form onSubmit={handleSearch} className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)] rounded-2xl shadow-sm space-y-4">
          <div>
            <label className="text-micro-label text-[var(--text-muted)] block mb-1">
              NOMOR PESANAN RESMI
            </label>
            <input
              type="text"
              required
              placeholder="CONTOH: GMC-20261009-1234"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-4 py-3 text-xs uppercase font-mono font-bold rounded-xl focus:outline-none focus:border-[var(--text-primary)] transition-all shadow-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full editorial-btn py-4 text-xs font-bold rounded-full shadow-md"
          >
            PERIKSA STATUS PESANAN &rarr;
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-[var(--text-muted)]">
          Butuh bantuan pengecekan manual? Hubungi tim support WhatsApp kami di{" "}
          <a href="https://wa.me/628113225678" target="_blank" rel="noreferrer" className="underline font-bold text-[var(--text-primary)]">
            +62 811-3225-678
          </a>.
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--bg-footer)] border-t border-[var(--border-hairline)] py-12 px-6 text-center text-xs text-[var(--text-muted)]">
        &copy; {new Date().getFullYear()} GLOBAL MANDIRI COMPUTER (GMC)
      </footer>
    </div>
  );
}
