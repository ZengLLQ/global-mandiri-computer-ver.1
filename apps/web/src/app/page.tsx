"use client";

import Link from "next/link";
import { Laptop, Monitor, Cpu, Printer, Projector, Satellite } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/ui/reveal";
import { Marquee } from "@/components/ui/marquee";
import { useState, useEffect, useMemo } from "react";
import catalogProducts from "@/lib/catalog_seed.json";
import { useInventoryStore } from "@/stores/inventory-store";
import { useTranslation } from "@/stores/language-store";

export default function HomePage() {
  const { t, language } = useTranslation();
  const { overrides, customProducts, deletedProductIds, getAllEffectiveProducts } = useInventoryStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const allProducts = useMemo(() => {
    if (!mounted) return catalogProducts;
    return getAllEffectiveProducts();
  }, [mounted, overrides, customProducts, deletedProductIds, getAllEffectiveProducts]);

  const categories = [
    { name: t.home.categories.laptop, count: "494 MODEL", href: "/katalog?kategori=laptop", icon: Laptop },
    { name: t.home.categories.aio, count: "61 MODEL", href: "/katalog?kategori=all-in-one", icon: Monitor },
    { name: t.home.categories.desktop, count: "11 MODEL", href: "/katalog?kategori=pc-desktop", icon: Cpu },
    { name: t.home.categories.printer, count: "21 MODEL", href: "/katalog?kategori=printer", icon: Printer },
    { name: t.home.categories.projector, count: "19 MODEL", href: "/katalog?kategori=projector", icon: Projector },
    { name: t.home.categories.starlink, count: "7 UNIT", href: "/katalog?kategori=starlink", icon: Satellite },
  ];

  const featuredBrands = [
    "ASUS", "LENOVO", "APPLE", "ACER", "HP", "EPSON", "BENQ", "CANON", "BROTHER", "INFOCUS", "VIEWSONIC", "OPTOMA", "STARLINK"
  ];

  // Pick diverse featured products showcasing Laptop, AIO, Printer, and Starlink with real-time inventory
  const featuredProducts = useMemo(() => {
    const customFeatured = allProducts.filter((p) => p.is_featured);
    if (customFeatured.length >= 4) {
      return customFeatured.slice(0, 4);
    }
    return [
      allProducts.find((p) => p.category?.toUpperCase() === "LAPTOP" && p.brand === "ASUS") || allProducts[0],
      allProducts.find((p) => p.category?.toUpperCase() === "ALL-IN-ONE") || allProducts[1],
      allProducts.find((p) => p.category?.toUpperCase() === "PRINTER" && p.brand === "EPSON") || allProducts[2],
      allProducts.find((p) => p.category?.toUpperCase() === "STARLINK") || allProducts[3],
    ].filter(Boolean);
  }, [allProducts]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Modern Unified Header */}
      <Header />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative py-20 md:py-28 px-6 md:px-10 lg:px-12 border-b border-[var(--border-hairline)] overflow-hidden bg-[var(--bg-canvas)]">
          {/* Subtle Architectural Dot Grid Background */}
          <div className="absolute inset-0 pointer-events-none select-none opacity-[0.25]">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="hero-dot-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.1" fill="currentColor" />
                </pattern>
                <linearGradient id="hero-vignette" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.85" />
                  <stop offset="60%" stopColor="white" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="white" stopOpacity="0.1" />
                </linearGradient>
                <mask id="hero-pattern-mask">
                  <rect width="100%" height="100%" fill="url(#hero-vignette)" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="url(#hero-dot-pattern)" mask="url(#hero-pattern-mask)" />
            </svg>
          </div>

          <div className="relative z-10 w-full">
            <Reveal y={20}>
              <div className="flex items-center gap-2.5 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-[var(--text-primary)]" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--text-primary)]" />
                </span>
                <p className="text-tech-tag">
                  {t.home.tagline}
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1} y={32}>
              <h1 className="text-display-xl mb-6">
                GLOBAL MANDIRI <span className="text-light-accent">COMPUTER</span>
              </h1>
            </Reveal>

            {/* Pill badges with EST. 2008 */}
            <Reveal delay={0.15} y={16}>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-8 text-micro-label">
                <span className="px-3 py-1 border border-[var(--border-hairline)] rounded-full bg-[var(--bg-card)] font-mono font-bold text-[var(--text-primary)] shadow-2xs">
                  EST. 2008
                </span>
                <span className="px-3 py-1 border border-[var(--border-hairline)] rounded-full bg-[var(--bg-card)] font-medium text-[var(--text-primary)] shadow-2xs">
                  SURABAYA CENTRAL
                </span>
                <span className="px-3 py-1 border border-[var(--border-hairline)] rounded-full bg-[var(--bg-card)] font-medium text-[var(--text-primary)] shadow-2xs">
                  {language === "en" ? "100% OFFICIAL WARRANTY" : "100% GARANSI RESMI"}
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.2} y={16}>
              <div className="flex items-center justify-end pt-12 md:pt-16 lg:pt-20">
                <Link
                  href="/katalog"
                  className="editorial-link text-xs tracking-[0.14em] font-bold group inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>{t.home.exploreCatalog}</span>
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* INFINITE SMOOTH MARQUEE TICKER (Matching Portfolio Reference) */}
        <Marquee />

        {/* CATEGORY TILES (Architectural 3x2 Grid Table, Full Bleed Edge-to-Edge) */}
        <section className="w-full border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={idx}
                  href={cat.href}
                  className={`group p-8 md:p-12 lg:p-14 transition-colors duration-300 bg-[var(--bg-canvas)] hover:bg-[var(--bg-card)] flex flex-col justify-between min-h-[190px] md:min-h-[220px] lg:min-h-[240px] border-[var(--border-hairline)] ${
                    idx < 5 ? "border-b" : ""
                  } ${
                    idx === 4 ? "md:border-b-0" : ""
                  } ${
                    idx % 2 === 0 ? "md:border-r" : "md:border-r-0"
                  } ${
                    idx < 3 ? "lg:border-b" : "lg:border-b-0"
                  } ${
                    idx % 3 !== 2 ? "lg:border-r" : "lg:border-r-0"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <span className="text-tech-tag font-bold">0{idx + 1}</span>
                      <Icon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] stroke-[1.8] transition-colors" />
                    </div>
                    <span className="text-tech-tag font-bold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                      {cat.count}
                    </span>
                  </div>
                  <div className="mt-8 flex items-baseline justify-between">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight transition-transform duration-300 group-hover:translate-x-2">
                      {cat.name}
                    </h2>
                    <span className="text-base font-light text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-all duration-300 group-hover:rotate-45">
                      &rarr;
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* BRAND REEL */}
        <section className="py-8 px-6 md:px-10 lg:px-12 border-b border-[var(--border-hairline)] bg-[var(--bg-card)]/50">
          <Reveal y={16}>
            <div className="w-full flex flex-wrap items-center justify-center gap-3 md:gap-4 text-center">
              <span className="text-tech-tag tracking-[0.14em] mr-1 md:mr-2 shrink-0">
                {t.home.officialBrands}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-2.5">
                {featuredBrands.map((brand, i) => (
                  <Link
                    key={i}
                    href={`/katalog?brand=${brand.toLowerCase()}`}
                    className="px-3.5 py-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-xs md:text-sm font-bold uppercase tracking-tight hover:border-black hover:bg-black hover:text-white transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
                  >
                    {brand}
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* PRODUK PILIHAN SECTION (2-Col Desktop Product Grid focused directly on technical specs) */}
        <section className="py-20 px-6 md:px-10 lg:px-12 border-b border-[var(--border-hairline)]">
          <div className="w-full">
            <Reveal y={20}>
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-[var(--border-hairline)] gap-4">
                <div>
                  <p className="text-tech-tag mb-2">{t.home.featuredTag}</p>
                  <h2 className="text-display-l">{t.home.featuredTitle} <span className="text-slant-display">{t.home.featuredTitleSlant}</span></h2>
                </div>
                <Link href="/katalog" className="editorial-link group inline-flex items-center gap-1.5">
                  <span>{t.home.exploreAll}</span>
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
                </Link>
              </div>
            </Reveal>

            {/* 2-Column Grid replicating the screenshot with spec-focused cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {featuredProducts.map((p, pIdx) => (
                <Reveal key={p.id} delay={pIdx * 0.08} y={30}>
                  <ProductCard
                    slug={p.slug}
                    name={p.name}
                    brand={p.brand}
                    segment={p.segment}
                    priceIdr={p.min_price_idr}
                    cpu={p.cpu}
                    ramGb={p.ram_gb}
                    ramType={p.ram_type}
                    storage={p.storage}
                    storageType={p.storage_type}
                    gpu={p.gpu}
                    screenSize={p.screen_size}
                    screenPanel={p.screen_panel}
                    os={p.os}
                    warranty={p.warranty}
                    bundledItems={p.bundled_items}
                    variantsCount={p.variants?.length || 1}
                    status={p.status}
                    stockCount={p.stockCount}
                    poEstimatedDays={p.poEstimatedDays}
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 3 EDITORIAL PILLARS / JAMINAN TOKO (Spacious, Minimalist, Rounded 2xl Cards) */}
        <section className="py-12 md:py-16 px-6 md:px-10 lg:px-12 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <Reveal delay={0} y={24} className="h-full">
              <div className="p-8 md:p-12 flex flex-col justify-between bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl group hover:bg-[var(--bg-card-hover)] transition-all duration-300 hover:-translate-y-1 min-h-[240px] h-full shadow-sm hover:shadow-md">
                <div className="flex justify-between items-start">
                  <span className="text-tech-tag block text-[var(--text-muted)]">{t.home.pillar1Tag}</span>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] transition-all duration-300 group-hover:rotate-45 group-hover:border-black group-hover:bg-black group-hover:text-white text-xs shadow-sm">
                    &rarr;
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight leading-[1.05] mt-8">
                  {t.home.pillar1Title} <span className="text-slant-display">{t.home.pillar1TitleSlant}</span> {t.home.pillar1Suffix}
                </h3>
              </div>
            </Reveal>

            <Reveal delay={0.08} y={24} className="h-full">
              <div className="p-8 md:p-12 flex flex-col justify-between bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl group hover:bg-[var(--bg-card-hover)] transition-all duration-300 hover:-translate-y-1 min-h-[240px] h-full shadow-sm hover:shadow-md">
                <div className="flex justify-between items-start">
                  <span className="text-tech-tag block text-[var(--text-muted)]">{t.home.pillar2Tag}</span>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] transition-all duration-300 group-hover:rotate-45 group-hover:border-black group-hover:bg-black group-hover:text-white text-xs shadow-sm">
                    &rarr;
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight leading-[1.05] mt-8">
                  {t.home.pillar2Title} <span className="text-slant-display">{t.home.pillar2TitleSlant}</span> {t.home.pillar2Suffix}
                </h3>
              </div>
            </Reveal>

            <Reveal delay={0.16} y={24} className="h-full">
              <div className="p-8 md:p-12 flex flex-col justify-between bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl group hover:bg-[var(--bg-card-hover)] transition-all duration-300 hover:-translate-y-1 min-h-[240px] h-full shadow-sm hover:shadow-md">
                <div className="flex justify-between items-start">
                  <span className="text-tech-tag block text-[var(--text-muted)]">{t.home.pillar3Tag}</span>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] transition-all duration-300 group-hover:rotate-45 group-hover:border-black group-hover:bg-black group-hover:text-white text-xs shadow-sm">
                    &rarr;
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight leading-[1.05] mt-8">
                  {t.home.pillar3Title} <span className="text-slant-display">{t.home.pillar3TitleSlant}</span>
                </h3>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* Unified Elevated Footer Component */}
      <Footer />
    </div>
  );
}
