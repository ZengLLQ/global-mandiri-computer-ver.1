"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useTranslation } from "@/stores/language-store";

export default function ContactPage() {
  const { t, language } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Modern Unified Header */}
      <Header />

      {/* Tiny Breadcrumb */}
      <div className="px-6 md:px-10 lg:px-12 pt-6">
        <div className="w-full text-micro-label text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text-primary)]">
            {language === "en" ? "HOME" : "BERANDA"}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-primary)]">{t.contact.breadcrumb}</span>
        </div>
      </div>

      <main className="flex-1 w-full px-6 md:px-10 lg:px-12 py-12">
        <div className="mb-12 pb-4 border-b border-[var(--border-hairline)]">
          <p className="text-tech-tag mb-2">{t.contact.tag}</p>
          <h1 className="text-display-xl">
            {t.contact.title} <span className="text-slant-display">{t.contact.titleSlant}</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Info Details (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)] rounded-2xl shadow-sm space-y-4">
              <span className="text-micro-label text-[var(--text-muted)] block tracking-[0.2em]">
                {t.contact.storeAddressTitle}
              </span>
              <h2 className="text-xl font-bold uppercase tracking-tight">GLOBAL MANDIRI COMPUTER</h2>
              <div className="text-sm space-y-1.5 text-[var(--text-muted)] leading-relaxed">
                <p className="font-semibold text-base text-[var(--text-primary)] tracking-tight">
                  {t.contact.storeAddressDetail}
                </p>
                <p>{t.contact.storeCity}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 border border-[var(--border-hairline)] bg-[var(--bg-card)] rounded-2xl shadow-sm">
                <span className="text-micro-label text-[var(--text-muted)] block mb-2">
                  {t.contact.hoursTitle}
                </span>
                <p className="text-sm font-bold uppercase">{t.contact.hoursDays}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{t.contact.hoursTime}</p>
                <p className="text-[0.6875rem] text-[var(--text-muted)] mt-2">{t.contact.hoursClosed}</p>
              </div>

              <div className="p-6 border border-[var(--border-hairline)] bg-[var(--bg-card)] rounded-2xl shadow-sm">
                <span className="text-micro-label text-[var(--text-muted)] block mb-2">
                  {t.contact.salesTitle}
                </span>
                <p className="text-sm font-bold font-mono">+62 811-3225-678</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">wa.me/628113225678</p>
                <a
                  href="https://wa.me/628113225678"
                  target="_blank"
                  rel="noreferrer"
                  className="editorial-link text-[var(--text-primary)] hover:text-black font-bold text-xs block mt-3"
                >
                  {t.contact.chatWa}
                </a>
              </div>
            </div>

            <div className="p-6 border border-[var(--border-hairline)] bg-[var(--bg-card)] rounded-2xl shadow-sm">
              <span className="text-micro-label text-[var(--text-muted)] block mb-1">
                {t.contact.emailTitle}
              </span>
              <p className="text-sm font-mono font-bold">BLESSINGTEKNOLOGI@GMAIL.COM</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {t.contact.emailDesc}
              </p>
            </div>
          </div>

          {/* Form Message (6 cols) */}
          <div className="lg:col-span-6 p-8 md:p-10 border border-[var(--border-hairline)] bg-[var(--bg-card)]/40 rounded-2xl shadow-sm space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] pb-3 border-b border-[var(--border-hairline)]">
              {t.contact.formTitle}
            </h2>

            <form action="#" className="space-y-4">
              <div>
                <label className="text-micro-label text-[var(--text-muted)] block mb-1">
                  {t.contact.nameLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.contact.namePlaceholder}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-4 py-3 text-xs uppercase rounded-xl focus:outline-none focus:border-[var(--text-primary)] transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="text-micro-label text-[var(--text-muted)] block mb-1">
                  {t.contact.phoneLabel}
                </label>
                <input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-4 py-3 text-xs uppercase font-mono rounded-xl focus:outline-none focus:border-[var(--text-primary)] transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="text-micro-label text-[var(--text-muted)] block mb-1">
                  {t.contact.subjectLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.contact.subjectPlaceholder}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-4 py-3 text-xs uppercase rounded-xl focus:outline-none focus:border-[var(--text-primary)] transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="text-micro-label text-[var(--text-muted)] block mb-1">
                  {t.contact.messageLabel}
                </label>
                <textarea
                  rows={4}
                  placeholder={t.contact.messagePlaceholder}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-4 py-3 text-xs uppercase rounded-xl focus:outline-none focus:border-[var(--text-primary)] transition-all shadow-sm"
                />
              </div>

              <button type="submit" className="w-full editorial-btn py-4 text-xs font-bold rounded-full shadow-md">
                {t.contact.sendButton}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Unified Elevated Footer Component */}
      <Footer />
    </div>
  );
}
