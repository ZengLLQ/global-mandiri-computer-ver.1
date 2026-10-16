"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Command, X, ShoppingBag, User } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useTranslation } from "@/stores/language-store";
import { LanguageToggle } from "./language-toggle";
import catalogProducts from "@/lib/catalog_seed.json";
import { formatRupiah } from "@/lib/utils";

interface HeaderProps {
  currentCategory?: string;
}

export function Header({ currentCategory }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof catalogProducts>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const totalItems = useCartStore((state) => state.totalItems());
  const [isMac, setIsMac] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent));
    }
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard shortcut (Cmd+K / Ctrl+K or '/') to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [searchOpen]);

  // Live search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = catalogProducts.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchBrand = p.brand.toLowerCase().includes(q);
      const matchCpu = p.cpu ? p.cpu.toLowerCase().includes(q) : false;
      const matchGpu = p.gpu ? p.gpu.toLowerCase().includes(q) : false;
      const matchCategory = p.category ? p.category.toLowerCase().includes(q) : false;
      return matchName || matchBrand || matchCpu || matchGpu || matchCategory;
    });
    setSearchResults(matches.slice(0, 8));
  }, [searchQuery]);

  const navLinks = [
    { label: t.nav.catalog, href: "/katalog" },
    { label: t.nav.blog, href: "/blog" },
    { label: t.nav.contact, href: "/kontak" },
  ];

  return (
    <>
      {/* Main Frosted Glass Navbar */}
      <header
        className={`sticky top-0 z-30 transition-all duration-300 ${
          isScrolled
            ? "bg-[var(--bg-canvas)]/90 backdrop-blur-md border-b border-[var(--border-hairline)] shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
            : "bg-[var(--bg-canvas)] border-b border-transparent"
        }`}
      >
        <div className="w-full px-6 md:px-10 lg:px-12 h-16 flex items-center justify-between gap-6">
          {/* Left: Brand Wordmark (Paling Kiri) + Navigation Links */}
          <div className="flex items-center gap-8 lg:gap-10">
            <Link
              href="/"
              className="flex items-center group py-1 shrink-0"
            >
              <span className="text-2xl font-black tracking-[-0.05em] uppercase leading-none transition-transform group-hover:scale-105 duration-200">
                GMC
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-8 text-[0.75rem] font-semibold tracking-[0.08em] uppercase">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative py-1 group transition-colors ${
                      isActive ? "text-[var(--text-primary)] font-black" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="navActiveIndicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--text-primary)]"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Tools: Language Toggle, Search Trigger, Akun, Keranjang, Mobile Toggle */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            {/* Language Switcher Pill */}
            <LanguageToggle />

            {/* Ultra-Modern Interactive Search Button */}
            <motion.button
              whileHover={{ scale: 1.025, y: -0.5 }}
              whileTap={{ scale: 0.97, y: 0.5 }}
              onClick={() => setSearchOpen(true)}
              className="group relative flex items-center gap-2 pl-3.5 pr-2.5 py-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-card)]/80 hover:bg-[var(--bg-canvas)] hover:border-[var(--text-primary)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-200 cursor-pointer shadow-sm hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
              title={t.nav.searchHelper}
            >
              <div className="relative flex items-center justify-center">
                <Search className="w-3.5 h-3.5 stroke-[1.8] text-[var(--text-primary)] transition-transform duration-200 group-hover:scale-110" />
              </div>
              <span className="hidden sm:inline text-micro-label font-bold uppercase tracking-[0.12em] text-[var(--text-primary)]">
                {t.nav.searchUnit}
              </span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[9px] font-mono font-medium text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:border-[var(--text-primary)]/40 transition-colors shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
                {isMac ? (
                  <>
                    <Command className="w-2.5 h-2.5" />
                    <span>K</span>
                  </>
                ) : (
                  "Ctrl K"
                )}
              </kbd>
            </motion.button>

            {/* Customer Order Tracking */}
            <Link
              href="/lacak"
              className="hidden sm:flex items-center gap-1.5 text-[0.75rem] font-semibold tracking-[0.08em] uppercase text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors group"
            >
              <User className="w-3.5 h-3.5 stroke-[1.8] opacity-70 group-hover:opacity-100 transition-opacity" />
              <span>{t.footer.trackOrderLink}</span>
            </Link>

            {/* Dynamic Cart Button with Animated Counter Badge */}
            <Link
              href="/keranjang"
              className="relative flex items-center gap-1.5 text-[0.75rem] font-black tracking-[0.08em] uppercase text-[var(--text-primary)] hover:opacity-80 transition-opacity group"
            >
              <ShoppingBag className="w-3.5 h-3.5 stroke-[1.8]" />
              <span>{t.nav.cart}</span>
              {mounted && (
                <motion.span
                  key={totalItems}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${
                    totalItems > 0
                      ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)] font-bold"
                      : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-hairline)] font-normal"
                  }`}
                >
                  ({totalItems})
                </motion.span>
              )}
            </Link>

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 cursor-pointer focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <motion.span
                animate={mobileMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                className="w-5 h-[2px] bg-[var(--text-primary)] block transition-transform"
              />
              <motion.span
                animate={mobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                className="w-5 h-[2px] bg-[var(--text-primary)] block transition-opacity"
              />
              <motion.span
                animate={mobileMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                className="w-5 h-[2px] bg-[var(--text-primary)] block transition-transform"
              />
            </button>
          </div>
        </div>
      </header>

      {/* Modern Slide-Down Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden fixed top-16 left-0 right-0 z-30 bg-[var(--bg-canvas)] border-b border-[var(--border-hairline)] shadow-xl overflow-hidden"
          >
            <div className="px-6 py-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hairline)]">
                <span className="text-micro-label font-bold text-[var(--text-muted)]">BAHASA / LANGUAGE</span>
                <LanguageToggle />
              </div>

              <nav className="flex flex-col space-y-4 text-sm font-bold uppercase tracking-wider">
                <Link
                  href="/katalog"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 border-b border-[var(--border-hairline)] flex justify-between items-center"
                >
                  <span>{t.nav.catalog}</span>
                  <span className="text-micro-label text-[var(--text-muted)]">600+ UNIT &rarr;</span>
                </Link>
                <Link
                  href="/blog"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 border-b border-[var(--border-hairline)] flex justify-between items-center"
                >
                  <span>{t.nav.blog}</span>
                  <span className="text-micro-label text-[var(--text-muted)]">&rarr;</span>
                </Link>
                <Link
                  href="/kontak"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 border-b border-[var(--border-hairline)] flex justify-between items-center"
                >
                  <span>{t.nav.contact}</span>
                  <span className="text-micro-label text-[var(--text-muted)]">ITC MEGA GROSIR &rarr;</span>
                </Link>
                <Link
                  href="/lacak"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 flex justify-between items-center text-[var(--text-muted)]"
                >
                  <span>{t.footer.trackOrderLink}</span>
                  <span className="text-micro-label text-[var(--text-muted)]">&rarr;</span>
                </Link>
              </nav>

              <div className="pt-2 border-t border-[var(--border-hairline)] space-y-3 text-xs text-[var(--text-muted)]">
                <p className="font-semibold text-[var(--text-primary)]">GLOBAL MANDIRI COMPUTER</p>
                <p>{t.nav.storeAddress}</p>
                <a
                  href="https://wa.me/628113225678"
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full py-3 bg-[var(--text-primary)] text-white text-center font-bold tracking-widest uppercase hover:bg-black hover:text-white rounded-full transition-colors"
                >
                  {t.nav.consultWhatsApp} &rarr;
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Spotlight / Instant Search Command Modal */}
      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-2xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] shadow-[0_30px_80px_rgba(0,0,0,0.22)] z-10 overflow-hidden rounded-2xl"
            >
              {/* Search Bar Input */}
              <div className="flex items-center px-5 py-4 border-b border-[var(--border-hairline)] bg-[var(--bg-card)]/75 backdrop-blur-md">
                <Search className="w-5 h-5 text-[var(--text-muted)] mr-3.5 shrink-0 stroke-[1.8]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.nav.searchPlaceholder}
                  className="w-full bg-transparent border-none outline-none text-sm font-semibold uppercase tracking-wider placeholder:normal-case placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mr-2 grid h-5 w-5 place-items-center rounded-full bg-[var(--border-hairline)] hover:bg-black hover:text-white text-[var(--text-muted)] transition-colors cursor-pointer shrink-0"
                    title="Hapus pencarian"
                  >
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                )}
                <button
                  onClick={() => setSearchOpen(false)}
                  className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2.5 py-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--text-primary)] transition-all cursor-pointer shadow-sm"
                >
                  ESC
                </button>
              </div>

              {/* Instant Search Results */}
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-[var(--border-hairline)]">
                {searchQuery.trim() === "" ? (
                  <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                    <p className="font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-2">
                      PENCARIAN INSTAN KATALOG GMC
                    </p>
                    <p>Temukan langsung dari 620+ unit laptop, PC Desktop, Printer, Projector, dan Starlink.</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {["Asus ROG", "Lenovo ThinkPad", "Epson L3210", "Starlink Mini", "BenQ Projector", "Core i5"].map((hint) => (
                        <button
                          key={hint}
                          onClick={() => setSearchQuery(hint)}
                          className="px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-hairline)] text-micro-label font-bold uppercase hover:border-[var(--text-primary)] rounded-full transition-all shadow-sm"
                        >
                          {hint}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                    <p className="font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-1">
                      TIDAK ADA HASIL UNTUK &ldquo;{searchQuery}&rdquo;
                    </p>
                    <p>Coba gunakan kata kunci lain seperti merk (Lenovo, Asus, Acer) atau tipe prosesor.</p>
                  </div>
                ) : (
                  <div>
                    <div className="px-4 py-2 bg-[var(--bg-card)]/50 text-micro-label text-[var(--text-muted)] font-bold uppercase tracking-wider flex justify-between">
                      <span>DITEMUKAN {searchResults.length} UNIT</span>
                      <span>KLIK UNTUK LIHAT SPESIFIKASI</span>
                    </div>
                    {searchResults.map((p) => {
                      const minPrice = p.min_price_idr;
                      return (
                        <Link
                          key={p.slug}
                          href={`/katalog/${p.slug}`}
                          onClick={() => setSearchOpen(false)}
                          className="p-4 flex items-center justify-between hover:bg-[var(--bg-card)] transition-colors group block"
                        >
                          <div className="pr-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 border border-[var(--border-hairline)] bg-[var(--bg-canvas)] rounded-md">
                                {p.brand}
                              </span>
                              <span className="text-micro-label text-[var(--text-muted)] font-semibold uppercase">
                                {p.category}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold uppercase tracking-tight text-[var(--text-primary)] line-clamp-1 group-hover:underline">
                              {p.name}
                            </h4>
                            <p className="text-micro-label text-[var(--text-muted)] mt-1 font-mono">
                              {p.ram_gb ? `${p.ram_gb}GB` : ""} {p.storage ? `• ${p.storage}` : ""} {p.cpu ? `• ${p.cpu}` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black tabular-nums block">
                              {formatRupiah(minPrice)}
                            </span>
                            <span className="text-[10px] font-semibold text-[var(--text-primary)] group-hover:text-black group-hover:translate-x-1 inline-block transition-transform">
                              LIHAT &rarr;
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Direct Catalog Link */}
              {searchQuery.trim() !== "" && (
                <div className="p-3 bg-[var(--bg-card)] border-t border-[var(--border-hairline)] text-center">
                  <Link
                    href={`/katalog?q=${encodeURIComponent(searchQuery)}`}
                    onClick={() => setSearchOpen(false)}
                    className="text-xs font-bold uppercase tracking-wider hover:underline text-[var(--text-primary)]"
                  >
                    LIHAT SEMUA HASIL DI KATALOG LENGKAP &rarr;
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
