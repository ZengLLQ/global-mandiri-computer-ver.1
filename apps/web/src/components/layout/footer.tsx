"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "@/stores/language-store";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  return (
    <footer className="bg-[var(--bg-footer)] border-t border-[var(--border-hairline)] text-[var(--text-primary)] py-16 px-6 md:px-10 lg:px-12">
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
        {/* Col 1: CONTACT */}
        <div>
          <h4 className="text-micro-label font-bold mb-4 tracking-[0.2em] text-[var(--text-muted)]">
            {t.footer.contactTitle}
          </h4>
          <div className="space-y-1.5">
            <p className="font-semibold text-sm text-[var(--text-primary)] tracking-tight">
              ITC Mega Grosir Lantai B5 No. 7
            </p>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Jl. Gembong No. 20–30, Kapasan
            </p>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Jawa Timur 60141, Indonesia
            </p>
            <div className="pt-3 space-y-1.5">
              <a
                href="mailto:blessingteknologi@gmail.com"
                className="block font-mono text-[11px] tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors uppercase"
              >
                blessingteknologi@gmail.com
              </a>
              <a
                href="https://wa.me/628113225678"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-sm tracking-tight text-[var(--text-primary)] hover:text-black transition-colors"
              >
                +62 811-3225-678
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
              </a>
            </div>
          </div>
        </div>

        {/* Col 2: INFORMATION */}
        <div>
          <h4 className="text-micro-label font-bold mb-4 tracking-[0.2em] text-[var(--text-muted)]">
            {t.footer.infoTitle}
          </h4>
          <ul className="space-y-2.5 text-xs">
            {[
              { label: t.footer.catalogLink, href: "/katalog" },
              { label: t.footer.shippingWarrantyLink, href: "/pengiriman-garansi" },
              { label: t.footer.trackOrderLink, href: "/lacak" },
              { label: t.footer.termsLink, href: "/syarat-ketentuan" },
            ].map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="group inline-flex items-center gap-1.5 font-medium tracking-wider text-[var(--text-primary)] hover:text-black transition-colors"
                >
                  <span className="editorial-link no-underline group-hover:underline">{item.label}</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: NEWSLETTER */}
        <div>
          <h4 className="text-micro-label font-bold mb-4 tracking-[0.2em] text-[var(--text-muted)]">
            {t.footer.newsletterTitle}
          </h4>
          <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed font-normal">
            {t.footer.newsletterDesc}
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
            <input
              type="email"
              placeholder={t.footer.emailPlaceholder}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-4 py-2.5 text-xs tracking-wider uppercase placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] rounded-full transition-colors shadow-sm"
            />
            <button
              type="submit"
              className="w-full editorial-btn text-xs py-2.5 font-semibold tracking-widest text-white hover:text-white hover:bg-black hover:border-black transition-all"
            >
              {t.footer.subscribeButton}
            </button>
          </form>
        </div>
      </div>

      <div className="w-full mt-16 pt-6 border-t border-[var(--border-hairline)] flex items-center justify-between text-micro-label text-[var(--text-muted)] tracking-wider">
        <p>&copy; {currentYear} GLOBAL MANDIRI COMPUTER</p>
      </div>
    </footer>
  );
}
