"use client";

import { useState, useEffect } from "react";
import { useAdminStore } from "@/stores/admin-store";

interface MarqueeProps {
  phrases?: string[];
  className?: string;
}

const DEFAULT_PHRASES = [
  "100% GARANSI RESMI DISTRIBUTOR",
  "600+ UNIT TERSEDIA LENGKAP",
  "KONSULTASI BEBAS VIA WHATSAPP",
  "GERAI RESMI ITC MEGA GROSIR B5 NO. 7",
  "PACKING KAYU & ASURANSI PENUH",
  "READY STOCK LAPTOP • PC • PRINTER • PROJECTOR • STARLINK",
];

function Group({ phrases, hidden = false }: { phrases: string[]; hidden?: boolean }) {
  return (
    <div
      aria-hidden={hidden || undefined}
      className="marquee-group flex shrink-0 animate-marquee items-center select-none"
    >
      {[0, 1].map((r) =>
        phrases.map((p, i) => (
          <span key={`${r}-${i}`} className="flex items-center whitespace-nowrap">
            <span className="px-6 text-sm md:text-base font-black uppercase tracking-[0.12em]">
              {p}
            </span>
            <span className="text-sm md:text-base font-black opacity-40">•</span>
          </span>
        ))
      )}
    </div>
  );
}

export function Marquee({
  phrases,
  className = "bg-[var(--bg-card)] text-[var(--text-primary)] border-y border-[var(--border-hairline)] py-3",
}: MarqueeProps) {
  const storeAnnouncements = useAdminStore((s) => s.settings.marqueeAnnouncements);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activePhrases =
    phrases ||
    (mounted && storeAnnouncements && storeAnnouncements.length > 0
      ? storeAnnouncements
      : DEFAULT_PHRASES);

  return (
    <div
      role="marquee"
      className={`marquee-track relative z-10 overflow-hidden ${className}`}
    >
      <div className="flex w-max">
        <Group phrases={activePhrases} />
        <Group phrases={activePhrases} hidden />
      </div>
    </div>
  );
}
