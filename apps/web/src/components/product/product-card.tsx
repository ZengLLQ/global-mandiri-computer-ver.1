"use client";

import Link from "next/link";
import { OutlineWordmark } from "@/components/ui/outline-wordmark";
import { Card3D } from "@/components/ui/card-3d";
import { useTranslation } from "@/stores/language-store";

export interface ProductCardProps {
  slug: string;
  name: string;
  brand: string;
  segment: string;
  priceIdr: number;
  cpu?: string | null;
  ramGb?: number | null;
  ramType?: string | null;
  storage?: string | null;
  storageType?: string | null;
  gpu?: string | null;
  screenSize?: string | null;
  screenPanel?: string | null;
  os?: string | null;
  warranty?: string | null;
  bundledItems?: string | null;
  variantsCount?: number;
  status?: "ready" | "pre_order" | "out_of_stock" | "discontinued";
  stockCount?: number;
  poEstimatedDays?: string;
}

export function ProductCard({
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

  const formattedPrice = priceIdr > 0
    ? `Rp ${priceIdr.toLocaleString("id-ID")}`
    : t.catalog.inquirePrice;

  // Clean storage text (e.g. "512GB" -> "512", "GB")
  const storageValue = storage ? storage.replace(/(GB|TB)/i, "") : "512";
  const storageUnit = storage ? (storage.toUpperCase().includes("TB") ? "TB" : "GB") : "GB";

  // Clean screen size text
  const screenValue = screenSize ? screenSize.replace(/["”']/g, "") : "14.0";

  return (
    <Card3D
      tiltIntensity={6}
      glareEffect={true}
      className="editorial-card group block p-0 bg-[var(--bg-card)] border border-[var(--border-hairline)] hover:border-[var(--text-primary)] transition-all duration-300 rounded-2xl overflow-hidden shadow-sm hover:shadow-md"
    >
      <Link
        href={`/katalog/${slug}`}
        className="flex flex-col justify-between text-center min-h-[490px] p-7 md:p-8 w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Layer 1: Title, Price & Byline (Z-Depth 25px) */}
        <div
          className="w-full transition-transform duration-300"
          style={{ transform: "translateZ(25px)" }}
        >
          {/* Inventory Status Pill */}
          {status === "pre_order" ? (
            <div className="mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black text-white text-[0.5625rem] font-black uppercase tracking-widest shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                PRE-ORDER &bull; {poEstimatedDays || "3–5 HARI"}
              </span>
            </div>
          ) : status === "out_of_stock" || (stockCount !== undefined && stockCount <= 0) ? (
            <div className="mb-2.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-neutral-200 text-neutral-600 border border-neutral-300 text-[0.5625rem] font-bold uppercase tracking-wider">
                STOK HABIS
              </span>
            </div>
          ) : stockCount !== undefined && stockCount <= 3 ? (
            <div className="mb-2.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-900 border border-neutral-400 text-[0.5625rem] font-black uppercase tracking-wider">
                SISA {stockCount} UNIT
              </span>
            </div>
          ) : null}

          <p className="text-[0.625rem] font-bold text-[var(--text-muted)] tracking-[0.14em] uppercase mb-2">
            {brand} &bull; {segment.toUpperCase()}
          </p>
          <h3 className="text-card-title mb-2.5 group-hover:underline decoration-1 underline-offset-4 line-clamp-2 leading-snug">
            {name}
          </h3>
          <p className="text-price text-lg font-black tracking-tight text-[var(--text-primary)]">
            {formattedPrice}
          </p>
        </div>

        {/* Layer 2: SPEC-FOCUSED 3D HERO PLATE (Z-Depth 40px) */}
        <div
          className="my-6 w-full flex flex-col items-center transition-transform duration-300"
          style={{ transform: "translateZ(40px)" }}
        >
          {/* Subtle Brand Outline Wordmark floating behind (Z-Depth 10px) */}
          <div
            className="mb-3 transition-transform duration-300"
            style={{ transform: "translateZ(12px)" }}
          >
            <OutlineWordmark text={brand} className="text-4xl md:text-5xl tracking-tighter opacity-80" />
          </div>

          {/* Spec Plate: Adaptive for Computers vs Hardware/Peripherals */}
          {ramGb ? (
            /* Computer Spec Plate (RAM / Storage / Screen / GPU) */
            <div className="w-full max-w-[340px] bg-[var(--bg-canvas)] border border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)] shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-[var(--border-hairline)]">
                {/* RAM */}
                <div className="p-3 text-center">
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xl md:text-2xl font-black tabular-nums tracking-tight">
                      {ramGb}
                    </span>
                    <span className="text-[0.625rem] font-bold uppercase text-[var(--text-muted)]">
                      GB
                    </span>
                  </div>
                  <span className="block text-[0.5625rem] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                    {ramType || "MEMORY"}
                  </span>
                </div>

                {/* Storage */}
                <div className="p-3 text-center">
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xl md:text-2xl font-black tabular-nums tracking-tight">
                      {storageValue}
                    </span>
                    <span className="text-[0.625rem] font-bold uppercase text-[var(--text-muted)]">
                      {storageUnit}
                    </span>
                  </div>
                  <span className="block text-[0.5625rem] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                    {storageType || "SSD NVME"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-[var(--border-hairline)]">
                {/* Display */}
                <div className="p-3 text-center">
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xl md:text-2xl font-black tabular-nums tracking-tight">
                      {screenValue}
                    </span>
                    <span className="text-[0.625rem] font-bold uppercase text-[var(--text-muted)]">
                      &quot;
                    </span>
                  </div>
                  <span className="block text-[0.5625rem] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5 truncate px-1">
                    {screenPanel || "DISPLAY"}
                  </span>
                </div>

                {/* GPU / Graphics */}
                <div className="p-3 text-center flex flex-col justify-center">
                  <span className="block text-xs font-black tracking-tight truncate px-1 uppercase">
                    {gpu || "INTEGRATED"}
                  </span>
                  <span className="block text-[0.5625rem] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                    {t.catalog.graphics}
                  </span>
                </div>
              </div>

              {/* Processor Banner */}
              {cpu && (
                <div className="py-2 px-3 bg-[var(--bg-card)] text-center">
                  <span className="text-[0.625rem] font-black uppercase text-[var(--text-primary)] block truncate tracking-wide">
                    {cpu}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Hardware / Peripherals Spec Plate (Printer, Projector, Starlink) */
            <div className="w-full max-w-[340px] bg-[var(--bg-canvas)] border border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)] shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-xl overflow-hidden">
              <div className="p-3.5 text-center bg-[var(--bg-card)]/40">
                <span className="text-xs font-black uppercase tracking-tight block text-[var(--text-primary)] line-clamp-1">
                  {storage || screenPanel || (t.locale === "en" ? "OFFICIAL DEVICE" : "PERANGKAT RESMI")}
                </span>
                <span className="text-[0.5625rem] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5 block truncate px-2">
                  {t.locale === "en" ? "KEY FEATURES" : "FITUR UTAMA"} &bull; {screenSize || (t.locale === "en" ? "SPECIFICATIONS" : "SPESIFIKASI")}
                </span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[var(--border-hairline)]">
                <div className="p-3 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-tight block truncate text-[var(--text-primary)]">
                    {screenPanel || (t.locale === "en" ? "STANDARD" : "STANDAR")}
                  </span>
                  <span className="text-[0.5625rem] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5 block">
                    {t.catalog.technology}
                  </span>
                </div>
                <div className="p-3 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-tight block truncate text-[var(--text-primary)]">
                    {cpu || "ORIGINAL"}
                  </span>
                  <span className="text-[0.5625rem] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5 block">
                    {t.catalog.connectivity}
                  </span>
                </div>
              </div>
              {gpu && (
                <div className="py-2 px-3 bg-[var(--bg-card)] text-center">
                  <span className="text-[0.625rem] font-black uppercase text-[var(--text-primary)] block truncate tracking-wide">
                    {gpu}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Micro Spec Indicators */}
          <div className="mt-3 flex items-center justify-center gap-3 text-[0.5625rem] font-semibold text-[var(--text-muted)] tracking-wider uppercase">
            {variantsCount > 1 && (
              <span>&bull; {variantsCount} {t.catalog.colorOptions}</span>
            )}
            {bundledItems && (
              <span>&bull; INCL. OFFICE / TAS</span>
            )}
          </div>
        </div>

        {/* Layer 3: Bottom Action & Warranty (Z-Depth 25px) */}
        <div
          className="w-full pt-4 border-t border-[var(--border-hairline)] flex items-center justify-between text-micro-label transition-transform duration-300"
          style={{ transform: "translateZ(25px)" }}
        >
          <span className="text-[var(--text-muted)] text-[0.625rem]">
            {warranty || t.catalog.officialWarranty}
          </span>
          <span className="editorial-link text-[0.6875rem] font-bold text-[var(--text-primary)] group-hover:text-black transition-colors">
            {t.catalog.detailSpecs} &rarr;
          </span>
        </div>
      </Link>
    </Card3D>
  );
}
