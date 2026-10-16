"use client";

import { useState } from "react";
import Link from "next/link";
import { OutlineWordmark } from "@/components/ui/outline-wordmark";

export default function StyleguidePage() {
  const [cv11Enabled, setCv11Enabled] = useState(false);

  const toggleCv11 = () => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("font-cv11");
      setCv11Enabled(!cv11Enabled);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Editorial Header */}
      <header className="border-b border-[var(--border-hairline)] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-black uppercase tracking-[-0.04em]">
          GMC
        </Link>
        <span className="text-micro-label text-[var(--text-muted)]">
          STYLEGUIDE &bull; SWISS EDITORIAL DESIGN SYSTEM
        </span>
        <button
          onClick={toggleCv11}
          className="editorial-btn text-[0.6875rem] py-1.5 px-3"
        >
          TOGGLE CV11 (SINGLE-STOREY A): {cv11Enabled ? "ON" : "OFF"}
        </button>
      </header>

      <main className="w-full px-6 md:px-10 lg:px-12 py-16 space-y-24">
        {/* Intro */}
        <section>
          <span className="text-micro-label text-[var(--text-muted)] block mb-2">FOUNDATION</span>
          <h1 className="text-display-l mb-4">TYPOGRAPHY & PALETTE</h1>
          <p className="text-body text-[var(--text-muted)]">
            Sistem tipografi editorial foto-bebas berorientasi Swiss. Menggunakan Inter Variable Font secara eksklusif dengan optical sizing otomatis (Inter Display pada judul besar, Inter Text pada body), OpenType features tabular numbers & slashed zero, serta rasio kontras tinggi tanpa elemen visual fotografi.
          </p>
        </section>

        {/* 9 Typography Tokens */}
        <section className="space-y-12">
          <div className="border-b border-[var(--border-hairline)] pb-4 flex justify-between items-end">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em]">9 CORE TYPOGRAPHY TOKENS</h2>
            <span className="text-micro-label text-[var(--text-muted)]">INTER ONLY (VARIABLE)</span>
          </div>

          {/* 1. Display XL */}
          <div className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)]">
            <span className="text-micro-label text-[var(--text-muted)] block mb-4">
              01 &bull; DISPLAY XL (Weight 900, Line-height 0.90, Tracking -0.045em)
            </span>
            <div className="text-display-xl">
              GLOBAL MANDIRI
            </div>
          </div>

          {/* 2. Display L */}
          <div className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)]">
            <span className="text-micro-label text-[var(--text-muted)] block mb-4">
              02 &bull; DISPLAY L (Weight 800, Tracking -0.035em)
            </span>
            <div className="text-display-l">
              KATALOG KOMPUTER 2026
            </div>
          </div>

          {/* 3. Spec Figure */}
          <div className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)]">
            <span className="text-micro-label text-[var(--text-muted)] block mb-4">
              03 &bull; SPEC FIGURE (Weight 800, Tabular Numbers, Slashed Zero)
            </span>
            <div className="flex items-baseline gap-12">
              <div>
                <span className="text-spec-figure">16</span>
                <span className="text-micro-label font-medium ml-2">GB RAM</span>
              </div>
              <div>
                <span className="text-spec-figure">512</span>
                <span className="text-micro-label font-medium ml-2">GB SSD</span>
              </div>
              <div>
                <span className="text-spec-figure">14.0</span>
                <span className="text-micro-label font-medium ml-2">INCH OLED</span>
              </div>
            </div>
          </div>

          {/* 4. Outline Wordmark */}
          <div className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)]">
            <span className="text-micro-label text-[var(--text-muted)] block mb-4">
              04 &bull; OUTLINE WORDMARK (-webkit-text-stroke: 1.5px, Solid on Hover)
            </span>
            <div className="group inline-block p-4">
              <OutlineWordmark text="ASUS" className="text-7xl md:text-8xl" />
              <p className="text-micro-label text-[var(--text-muted)] mt-2">
                HOVER UNTUK MELIHAT SOLID FILL TRANSITION
              </p>
            </div>
          </div>

          {/* 5. H3 / Card Title */}
          <div className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)]">
            <span className="text-micro-label text-[var(--text-muted)] block mb-4">
              05 &bull; CARD TITLE (Weight 700, Uppercase, Tracking -0.02em)
            </span>
            <div className="text-card-title">
              ASUS ROG ZEPHYRUS G16 GU605MI-OLEDR936G
            </div>
          </div>

          {/* 6. Body Copy */}
          <div className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)]">
            <span className="text-micro-label text-[var(--text-muted)] block mb-4">
              06 &bull; BODY TEXT (Weight 400, 15px, Leading 1.55)
            </span>
            <p className="text-body">
              Laptop ultraportabel berperforma tinggi ditenagai prosesor Intel Core Ultra 9 185H dengan akselerator AI terintegrasi NPU. Layar ROG Nebula OLED 2.5K 240Hz menyajikan visual luar biasa untuk pekerjaan kreator dan gaming berat. Bergaransi resmi 2 tahun Asus Indonesia.
            </p>
          </div>

          {/* 7. Micro-Label */}
          <div className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)]">
            <span className="text-micro-label text-[var(--text-muted)] block mb-4">
              07 &bull; MICRO-LABEL (Weight 600, Uppercase, Tracking +0.08em)
            </span>
            <div className="flex gap-6 items-center">
              <span className="text-micro-label">BERANDA / KATALOG / ASUS</span>
              <span className="text-micro-label text-[var(--text-primary)] font-bold">&bull; GARANSI RESMI 2 TAHUN</span>
              <span className="text-micro-label text-[var(--text-muted)]">TERAKHIR DIPERBARUI: OKTOBER 2026</span>
            </div>
          </div>

          {/* 8. Price */}
          <div className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)]">
            <span className="text-micro-label text-[var(--text-muted)] block mb-4">
              08 &bull; PRICE (Weight 700, Tabular Numbers, Slashed Zero)
            </span>
            <div className="flex gap-8 items-baseline">
              <span className="text-price text-2xl">
                <span className="currency font-normal text-base">Rp</span> 34.999.000
              </span>
              <span className="text-price text-xl text-[var(--text-muted)]">
                TANYA HARGA
              </span>
            </div>
          </div>

          {/* 9. Light Accent */}
          <div className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)]">
            <span className="text-micro-label text-[var(--text-muted)] block mb-4">
              09 &bull; LIGHT ACCENT (Weight 200 Contrast Pair)
            </span>
            <div className="text-display-l">
              GLOBAL MANDIRI <span className="text-light-accent">COMPUTER</span>
            </div>
          </div>
        </section>

        {/* Product Card Anatomy (Replicating catalog screenshot without photo) */}
        <section className="space-y-6">
          <div className="border-b border-[var(--border-hairline)] pb-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em]">
              PRODUCT CARD ANATOMY (PHOTO-FREE SWISS EDITORIAL)
            </h2>
            <p className="text-body text-[var(--text-muted)] text-xs mt-1">
              Menggantikan foto produk dengan Outlined Brand Wordmark dan 3 mikro-spek kunci di posisi tengah-bawah.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="editorial-card group flex flex-col items-center justify-between text-center min-h-[460px]">
              {/* Top: Model & Price */}
              <div className="w-full">
                <h3 className="text-card-title mb-2 group-hover:underline decoration-1 underline-offset-4">
                  ASUS VIVOBOOK GO 14 E1404FA
                </h3>
                <p className="text-price mb-4">Rp 6.499.000</p>
                <p className="text-micro-label text-[var(--text-muted)] tracking-[0.1em]">
                  BY ASUS &bull; MAINSTREAM AMD RYZEN 3
                </p>
              </div>

              {/* Center: Outline Wordmark replaces teapot photo */}
              <div className="my-8 flex flex-col items-center justify-center">
                <OutlineWordmark text="ASUS" className="text-7xl tracking-tighter" />
                <p className="text-micro-label text-[var(--text-primary)] font-semibold tracking-[0.12em] mt-6">
                  8 GB / 512 GB / RYZEN 3 7320U
                </p>
              </div>

              {/* Bottom: Action */}
              <div className="w-full pt-4 border-t border-[var(--border-hairline)]">
                <span className="editorial-link text-[0.6875rem]">
                  DETAIL PRODUK & STOK TOKO
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Color Palette Tokens */}
        <section className="space-y-6">
          <div className="border-b border-[var(--border-hairline)] pb-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em]">RESTRAINED PALETTE TOKENS</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono">
            <div className="p-4 border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
              <div className="h-12 border border-[var(--border-hairline)] mb-2" />
              <p className="font-bold">--bg-canvas</p>
              <p className="text-[var(--text-muted)]">#FBFBF9</p>
            </div>
            <div className="p-4 border border-[var(--border-hairline)] bg-[var(--bg-card)]">
              <div className="h-12 border border-[var(--border-hairline)] mb-2 bg-[var(--bg-card)]" />
              <p className="font-bold">--bg-card</p>
              <p className="text-[var(--text-muted)]">#F2F1ED</p>
            </div>
            <div className="p-4 border border-[var(--border-hairline)] bg-[var(--bg-footer)]">
              <div className="h-12 border border-[var(--border-hairline)] mb-2 bg-[var(--bg-footer)]" />
              <p className="font-bold">--bg-footer</p>
              <p className="text-[var(--text-muted)]">#E8E4DC</p>
            </div>
            <div className="p-4 border border-[var(--border-hairline)]">
              <div className="h-12 mb-2 bg-[var(--text-primary)]" />
              <p className="font-bold">--text-primary</p>
              <p className="text-[var(--text-muted)]">#111111</p>
            </div>
            <div className="p-4 border border-[var(--border-hairline)]">
              <div className="h-12 mb-2 bg-[var(--color-accent)]" />
              <p className="font-bold">--color-accent</p>
              <p className="text-[var(--text-muted)]">#111111 (Monochrome)</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
