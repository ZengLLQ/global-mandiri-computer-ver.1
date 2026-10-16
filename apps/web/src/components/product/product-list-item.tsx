"use client";

import Link from "next/link";
import { ShieldCheck, Gift } from "lucide-react";
import type { ProductCardProps } from "./product-card";
import { useTranslation } from "@/stores/language-store";

export function ProductListItem({
  slug,
  name,
  brand,
  segment,
  priceIdr,
  cpu,
  ramGb,
  ramType,
  storage,
  storageType,
  gpu,
  screenSize,
  screenPanel,
  os,
  warranty,
  bundledItems,
  variantsCount = 1,
  status = "ready",
  stockCount,
  poEstimatedDays,
}: ProductCardProps) {
  const { t } = useTranslation();

  const formattedPrice =
    priceIdr > 0 ? `Rp ${priceIdr.toLocaleString("id-ID")}` : t.catalog.inquirePrice;

  // Clean storage text
  const storageValue = storage ? storage.replace(/(GB|TB)/i, "") : "512";
  const storageUnit = storage
    ? storage.toUpperCase().includes("TB")
      ? "TB"
      : "GB"
    : "GB";

  // Clean screen size text
  const screenValue = screenSize ? screenSize.replace(/["”']/g, "") : "14.0";

  return (
    <div className="group block p-5 md:p-6 bg-[var(--bg-card)] hover:bg-[var(--bg-canvas)] border border-[var(--border-hairline)] hover:border-[var(--text-primary)] transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md">
      <Link
        href={`/katalog/${slug}`}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 w-full text-inherit no-underline"
      >
        {/* Left Section: Brand, Name & Essential Badges */}
        <div className="flex-1 min-w-0 pr-0 lg:pr-4">
          {/* Top Metadata Row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {status === "pre_order" ? (
              <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-black text-white shadow-xs">
                PRE-ORDER &bull; {poEstimatedDays || "3–5 HARI"}
              </span>
            ) : status === "out_of_stock" || (stockCount !== undefined && stockCount <= 0) ? (
              <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-neutral-200 text-neutral-600 border border-neutral-300">
                STOK HABIS
              </span>
            ) : stockCount !== undefined && stockCount <= 3 ? (
              <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-900 border border-neutral-400">
                SISA {stockCount} UNIT
              </span>
            ) : null}

            <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)]">
              {brand}
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)] font-mono">
              {segment}
            </span>
            {variantsCount > 1 && (
              <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/60">
                {variantsCount} {t.catalog.colorOptions}
              </span>
            )}
          </div>

          {/* Product Name */}
          <h3 className="text-base md:text-lg font-black tracking-tight text-[var(--text-primary)] group-hover:underline decoration-1 underline-offset-4 line-clamp-2 leading-snug">
            {name}
          </h3>

          {/* Additional Badges: Warranty, Bundle, OS */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-[var(--text-muted)]">
            {warranty && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3 stroke-[2] text-[var(--text-primary)]" />
                <span>{warranty}</span>
              </span>
            )}
            {bundledItems && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[10px] font-bold">
                <Gift className="w-3 h-3 stroke-[2] text-[var(--text-primary)]" />
                <span>{bundledItems}</span>
              </span>
            )}
            {os && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[10px] font-mono">
                <span>{os}</span>
              </span>
            )}
          </div>
        </div>

        {/* Middle Section: Technical Specifications Grid */}
        <div className="lg:w-[460px] xl:w-[500px] shrink-0">
          {ramGb ? (
            /* Computer Specs Grid */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[var(--bg-canvas)] p-3 rounded-xl border border-[var(--border-hairline)] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              {/* CPU */}
              <div className="p-1 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.locale === "en" ? "PROCESSOR" : "PROSESOR"}
                </span>
                <span
                  className="text-xs font-black uppercase text-[var(--text-primary)] truncate"
                  title={cpu || "Intel / AMD"}
                >
                  {cpu || "-"}
                </span>
              </div>

              {/* RAM */}
              <div className="p-1 flex flex-col justify-center border-l border-[var(--border-hairline)] pl-2.5">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.locale === "en" ? "MEMORY" : "MEMORI"}
                </span>
                <span className="text-xs font-black uppercase text-[var(--text-primary)]">
                  {ramGb}GB{" "}
                  <span className="text-[10px] text-[var(--text-muted)] font-bold">
                    {ramType || "RAM"}
                  </span>
                </span>
              </div>

              {/* STORAGE */}
              <div className="p-1 flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-[var(--border-hairline)] sm:pl-2.5">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  STORAGE
                </span>
                <span className="text-xs font-black uppercase text-[var(--text-primary)] truncate">
                  {storageValue}
                  {storageUnit}{" "}
                  <span className="text-[10px] text-[var(--text-muted)] font-bold">
                    {storageType || "SSD"}
                  </span>
                </span>
              </div>

              {/* DISPLAY / GPU */}
              <div className="p-1 flex flex-col justify-center border-t sm:border-t-0 border-l border-[var(--border-hairline)] pl-2.5">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.locale === "en" ? "DISPLAY / GPU" : "LAYAR / GPU"}
                </span>
                <span
                  className="text-xs font-black uppercase text-[var(--text-primary)] truncate"
                  title={`${screenValue}" ${screenPanel || ""} • ${gpu || ""}`}
                >
                  {screenValue ? `${screenValue}" ` : ""}
                  {gpu || screenPanel || "DISPLAY"}
                </span>
              </div>
            </div>
          ) : (
            /* Peripheral Specs Grid (Printer, Projector, Starlink) */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[var(--bg-canvas)] p-3 rounded-xl border border-[var(--border-hairline)] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <div className="p-1 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.locale === "en" ? "TYPE & FUNCTION" : "TIPE & FUNGSI"}
                </span>
                <span
                  className="text-xs font-black uppercase text-[var(--text-primary)] truncate"
                  title={storage || screenPanel || (t.locale === "en" ? "OFFICIAL DEVICE" : "PERANGKAT RESMI")}
                >
                  {storage || screenPanel || (t.locale === "en" ? "OFFICIAL DEVICE" : "PERANGKAT RESMI")}
                </span>
              </div>

              <div className="p-1 flex flex-col justify-center sm:border-l border-[var(--border-hairline)] sm:pl-2.5">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.locale === "en" ? "KEY FEATURES" : "FITUR UTAMA"}
                </span>
                <span
                  className="text-xs font-black uppercase text-[var(--text-primary)] truncate"
                  title={screenSize || (t.locale === "en" ? "STANDARD SPECS" : "SPESIFIKASI STANDAR")}
                >
                  {screenSize || (t.locale === "en" ? "STANDARD SPECS" : "SPESIFIKASI STANDAR")}
                </span>
              </div>

              <div className="p-1 flex flex-col justify-center sm:border-l border-[var(--border-hairline)] sm:pl-2.5">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.catalog.connectivity}
                </span>
                <span
                  className="text-xs font-black uppercase text-[var(--text-primary)] truncate"
                  title={cpu || "USB / WIRELESS"}
                >
                  {cpu || "USB / WIRELESS"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Price & Action CTA */}
        <div className="flex sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between lg:justify-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-[var(--border-hairline)] lg:pl-6 shrink-0">
          <div className="text-left lg:text-right">
            <span className="block text-[9px] font-mono font-bold uppercase text-[var(--text-muted)] tracking-wider">
              {t.catalog.officialPrice}
            </span>
            <span className="text-xl lg:text-2xl font-black tabular-nums tracking-tight text-[var(--text-primary)]">
              {formattedPrice}
            </span>
          </div>

          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white group-hover:bg-black group-hover:text-white text-xs font-black tracking-wide transition-all duration-200 shadow-sm whitespace-nowrap">
            <span>{t.catalog.detailSpecs}</span>
            <span className="transition-transform duration-200 group-hover:translate-x-1">
              &rarr;
            </span>
          </span>
        </div>
      </Link>
    </div>
  );
}
