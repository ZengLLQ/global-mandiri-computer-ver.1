"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { OutlineWordmark } from "@/components/ui/outline-wordmark";
import { ProductCard } from "@/components/product/product-card";
import { Card3D } from "@/components/ui/card-3d";
import { MotionButton } from "@/components/ui/motion-button";
import { Reveal } from "@/components/ui/reveal";
import { useCartStore } from "@/stores/cart-store";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";
import catalogProducts from "@/lib/catalog_seed.json";
import { resolveProductSpecs } from "@/lib/spec-resolver";
import { useTranslation } from "@/stores/language-store";
import { useInventoryStore } from "@/stores/inventory-store";

export default function ProductDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params?.slug as string;
  const addItem = useCartStore((state) => state.addItem);

  // Real-time Inventory Store integration
  const { overrides, customProducts, getEffectiveProduct } = useInventoryStore();

  // Find product by slug in customProducts or seed catalog
  const baseProduct = useMemo(() => {
    const foundCustom = customProducts.find(
      (p) => p.slug === slug || p.id === slug
    );
    if (foundCustom) return foundCustom;
    return (
      catalogProducts.find((p) => p.slug === slug || p.slug.startsWith(slug)) ||
      catalogProducts[0]
    );
  }, [slug, customProducts]);

  // Apply real-time inventory overrides (price, stock, pre-order status, lead times)
  const product = useMemo(() => {
    return getEffectiveProduct(baseProduct);
  }, [baseProduct, getEffectiveProduct, overrides]);

  // Resolve deep hardware specifications for all categories
  const specs = useMemo(() => resolveProductSpecs(product), [product]);

  // Interactive states
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState<string | null>("specs");
  const [addedToCartToast, setAddedToCartToast] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [copiedSpecs, setCopiedSpecs] = useState(false);

  const productVariants = product.variants && product.variants.length > 0
    ? product.variants
    : [{ sku: product.slug || "GMC-UNIT", color_name: "STANDARD", price_idr: product.min_price_idr }];

  const selectedVariant = productVariants[selectedVariantIdx] || productVariants[0];
  const price = selectedVariant?.price_idr || product.min_price_idr;
  const formattedPrice = price > 0 ? `Rp ${price.toLocaleString("id-ID")}` : t.catalog.inquirePrice;

  // Clean storage
  const storageVal = product.storage ? product.storage.replace(/(GB|TB)/i, "") : "512";
  const storageUnit = product.storage ? (product.storage.toUpperCase().includes("TB") ? "TB" : "GB") : "GB";

  // Clean screen
  const screenVal = product.screen_size ? product.screen_size.replace(/["”']/g, "") : "14.0";

  const toggleAccordion = (id: string) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  const handleAddToCart = () => {
    setIsAdding(true);
    addItem({
      id: `${product.slug}-${selectedVariant.sku}`,
      productSlug: product.slug,
      productName: product.name,
      brand: product.brand,
      variantSku: selectedVariant.sku,
      colorName: selectedVariant.color_name,
      priceIdr: price,
      specsHighlight: `${product.ram_gb || 8}GB / ${product.storage || "512GB"}`,
    }, quantity);

    setAddedToCartToast(true);
    setTimeout(() => setIsAdding(false), 300);
    setTimeout(() => setAddedToCartToast(false), 3500);
  };

  const handleCopySpecs = () => {
    const text = [
      `SPESIFIKASI TEKNIS: ${product.name}`,
      `Brand: ${product.brand} | Kategori: ${product.category} | Segmen: ${product.segment}`,
      `Garansi: ${product.warranty || "Garansi Resmi Distributor Indonesia"}`,
      "",
      ...specs.groups.flatMap((g) => [
        `[${g.title}]`,
        ...g.items.map((it) => `• ${it.label}: ${it.value}`),
        "",
      ]),
    ].join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSpecs(true);
      setTimeout(() => setCopiedSpecs(false), 2500);
    }
  };

  const relatedProducts = catalogProducts
    .filter((p) => p.slug !== product.slug && (p.brand === product.brand || p.category === product.category))
    .slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* 3D Toast Notification */}
      <AnimatePresence>
        {addedToCartToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, rotateX: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            className="fixed top-20 right-6 z-50 bg-[var(--text-primary)] text-[var(--bg-canvas)] px-6 py-4 border border-[var(--text-primary)] shadow-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-4"
          >
            <span>✓ {quantity}x {t.locale === "en" ? "ADDED TO CART" : "DITAMBAHKAN KE KERANJANG"}</span>
            <Link
              href="/keranjang"
              className="underline text-white font-bold hover:opacity-80 transition-opacity"
            >
              {t.locale === "en" ? "VIEW CART →" : "LIHAT KERANJANG →"}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Unified Header */}
      <Header />

      {/* Sub-Header Breadcrumb */}
      <div className="px-6 md:px-10 lg:px-12 pt-6">
        <div className="w-full text-micro-label text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text-primary)]">{t.product.breadcrumbHome}</Link>
          <span className="mx-2">/</span>
          <Link href="/katalog" className="hover:text-[var(--text-primary)]">{t.product.breadcrumbCatalog}</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-primary)] uppercase truncate max-w-xs inline-block align-bottom">
            {product.name}
          </span>
        </div>
      </div>

      <main className="flex-1 w-full px-6 md:px-10 lg:px-12 py-10">
        {/* GIANT MODEL TITLE (DISPLAY XL) with Brand Outline Wordmark behind */}
        <div className="relative mb-10">
          <div className="mb-2">
            <OutlineWordmark text={product.brand} className="text-6xl md:text-8xl tracking-tighter opacity-80" />
          </div>
          <h1
            className={cn(
              "uppercase tracking-tighter text-balance font-black",
              product.name.length > 70
                ? "text-2xl sm:text-3xl md:text-5xl lg:text-5xl leading-[0.95]"
                : product.name.length > 40
                ? "text-3xl sm:text-4xl md:text-6xl lg:text-6xl leading-[0.92]"
                : "text-display-xl"
            )}
          >
            {product.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 mt-4">
            {product.status === "pre_order" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-white text-[0.625rem] font-black uppercase tracking-widest shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                PRE-ORDER &bull; ESTIMASI {product.poEstimatedDays || "3–5 HARI KERJA"}
              </span>
            ) : product.status === "out_of_stock" || (product.stockCount !== undefined && product.stockCount <= 0) ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-200 text-neutral-700 border border-neutral-300 text-[0.625rem] font-bold uppercase tracking-wider">
                STOK HABIS
              </span>
            ) : product.stockCount !== undefined && product.stockCount <= 3 ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-100 text-black border border-neutral-400 text-[0.625rem] font-black uppercase tracking-wider">
                SISA {product.stockCount} UNIT DI TOKO
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-hairline)] text-[var(--text-primary)] text-[0.625rem] font-bold uppercase tracking-wider">
                READY STOCK &bull; {product.stockCount ?? 5} UNIT
              </span>
            )}

            <p className="text-micro-label text-[var(--text-muted)] tracking-[0.14em]">
              SKU: {selectedVariant?.sku || "GMC-UNIT"} &bull; {t.locale === "en" ? "SEGMENT" : "SEGMEN"} {product.segment.toUpperCase()} &bull; {product.category}
            </p>
          </div>
        </div>

        {/* =========================================================================
            SPEC DASHBOARD HERO WITH 3D INTERACTIVE TILT TILES
           ========================================================================= */}
        <section className="py-8 my-6">
          <div className="text-tech-tag mb-4">
            {t.product.overviewTag}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1 */}
            <Card3D tiltIntensity={5} glareEffect={true} className="p-6 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-micro-label text-[var(--text-muted)] block mb-1">{specs.metric1.label}</span>
                <div className="flex items-baseline gap-1.5 my-2 min-h-[3rem] items-center">
                  <span className="text-4xl md:text-5xl font-black tabular-nums tracking-tight">
                    {specs.metric1.value}
                  </span>
                  <span className="text-xs font-bold uppercase text-[var(--text-muted)]">
                    {specs.metric1.unit}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--text-primary)] truncate">
                  {specs.metric1.sub}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                  {specs.metric1.detail}
                </p>
              </div>
            </Card3D>

            {/* Metric 2 */}
            <Card3D tiltIntensity={5} glareEffect={true} className="p-6 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-micro-label text-[var(--text-muted)] block mb-1">{specs.metric2.label}</span>
                <div className="flex items-baseline gap-1.5 my-2 min-h-[3rem] items-center">
                  <span className="text-4xl md:text-5xl font-black tabular-nums tracking-tight">
                    {specs.metric2.value}
                  </span>
                  <span className="text-xs font-bold uppercase text-[var(--text-muted)]">
                    {specs.metric2.unit}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--text-primary)] truncate">
                  {specs.metric2.sub}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                  {specs.metric2.detail}
                </p>
              </div>
            </Card3D>

            {/* Metric 3 */}
            <Card3D tiltIntensity={5} glareEffect={true} className="p-6 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-micro-label text-[var(--text-muted)] block mb-1">{specs.metric3.label}</span>
                <div className="flex items-baseline gap-1.5 my-2 min-h-[3rem] items-center">
                  <span className="text-4xl md:text-5xl font-black tabular-nums tracking-tight">
                    {specs.metric3.value}
                  </span>
                  <span className="text-xs font-bold uppercase text-[var(--text-muted)]">
                    {specs.metric3.unit}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--text-primary)] truncate">
                  {specs.metric3.sub}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                  {specs.metric3.detail}
                </p>
              </div>
            </Card3D>

            {/* Metric 4 */}
            <Card3D tiltIntensity={5} glareEffect={true} className="p-6 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-micro-label text-[var(--text-muted)] block mb-1">{specs.metric4.label}</span>
                <div className="flex items-baseline gap-1.5 my-2 min-h-[3rem] items-center">
                  <span className="text-2xl sm:text-3xl font-black uppercase tracking-tight line-clamp-1">
                    {specs.metric4.value}
                  </span>
                  <span className="text-xs font-bold uppercase text-[var(--text-muted)]">
                    {specs.metric4.unit}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--text-primary)] truncate">
                  {specs.metric4.sub}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                  {specs.metric4.detail}
                </p>
              </div>
            </Card3D>
          </div>
        </section>

        {/* INTERACTION AREA */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 py-10 border-t border-[var(--border-hairline)]">
          {/* Left / Buy Controls (lg: 6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Color Variant Chips with 3D tactile feedback */}
            <div>
              <span className="text-micro-label text-[var(--text-muted)] block mb-3 font-bold">
                {t.product.chooseColor} {selectedVariant?.color_name}
              </span>
              <div className="flex flex-wrap gap-2.5">
                {productVariants.map((v: any, idx: number) => {
                  const isSelected = selectedVariantIdx === idx;
                  return (
                    <motion.button
                      key={v.sku || idx}
                      whileHover={{ y: -1.5, scale: 1.02 }}
                      whileTap={{ y: 1, scale: 0.97 }}
                      onClick={() => setSelectedVariantIdx(idx)}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors rounded-full shadow-sm ${
                        isSelected
                          ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] border border-[var(--text-primary)] shadow-md"
                          : "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--text-primary)]"
                      }`}
                    >
                      {v.color_name || v.color || "STANDARD"}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Stepper & Add to Cart / Pre-Order / Out of Stock action */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              {product.status === "out_of_stock" || (product.stockCount !== undefined && product.stockCount <= 0) ? (
                /* Out of Stock CTA */
                <a
                  href={`https://wa.me/628113225678?text=Halo%20GMC,%20saya%20ingin%20tanya%20restock%20unit:%20${encodeURIComponent(product.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-4 px-8 text-xs font-bold tracking-[0.1em] flex items-center justify-between rounded-full shadow-md bg-neutral-200 text-neutral-800 border border-neutral-300 hover:bg-neutral-300 transition-colors"
                >
                  <span className="font-black uppercase">STOK HABIS &bull; HUBUNGI KAMI UNTUK RESTOCK</span>
                  <span className="border-l border-neutral-400 pl-4 font-mono font-bold">
                    WHATSAPP &rarr;
                  </span>
                </a>
              ) : (
                /* Ready or Pre-Order Interactive Stepper & Button */
                <>
                  <div className="inline-flex items-center justify-between border border-[var(--border-hairline)] bg-[var(--bg-card)] px-4 py-3 min-w-[130px] rounded-full shadow-sm">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="text-base font-bold px-2 cursor-pointer hover:opacity-60"
                      disabled={quantity <= 1}
                    >
                      &minus;
                    </motion.button>
                    <span className="text-sm font-black tabular-nums">{quantity}</span>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setQuantity(quantity + 1)}
                      className="text-base font-bold px-2 cursor-pointer hover:opacity-60"
                    >
                      +
                    </motion.button>
                  </div>

                  <MotionButton
                    onClick={handleAddToCart}
                    className={`flex-1 py-4 px-8 text-xs font-bold tracking-[0.1em] flex items-center justify-between rounded-full shadow-md ${
                      product.status === "pre_order" ? "bg-black text-white hover:bg-neutral-800" : ""
                    }`}
                  >
                    <span>
                      {isAdding
                        ? t.product.adding
                        : product.status === "pre_order"
                        ? "PRE-ORDER UNIT SEKARANG"
                        : t.product.addToCart}
                    </span>
                    <span className="border-l border-[#555] pl-4 font-mono font-bold">
                      {formattedPrice}
                    </span>
                  </MotionButton>
                </>
              )}
            </div>

            {/* Guarantee Line & Links */}
            <div className="pt-4 border-t border-[var(--border-hairline)] space-y-3">
              <p className="text-micro-label text-[var(--text-muted)] tracking-wider">
                &bull; {product.warranty || t.product.officialWarrantyBanner}
              </p>
              <div className="flex flex-wrap items-center gap-6">
                <a
                  href={`https://wa.me/628113225678?text=Halo%20GMC,%20saya%20ingin%20cek%20stok%20toko%20untuk%20unit:%20${encodeURIComponent(product.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="editorial-link text-[var(--text-primary)] hover:text-black font-bold text-xs"
                >
                  {t.locale === "en" ? "CHECK STORE STOCK (WHATSAPP)" : "CEK STOK DI TOKO (WHATSAPP)"} &rarr;
                </a>
                <span className="text-[var(--border-hairline)]">|</span>
                <Link href="/pengiriman-garansi" className="editorial-link text-xs">
                  {t.locale === "en" ? "UNBOXING VIDEO POLICY +" : "KEBIJAKAN VIDEO UNBOXING +"}
                </Link>
              </div>
            </div>
          </div>

          {/* Right / Butter-Smooth Accordions (lg: 6 cols) */}
          <div className="lg:col-span-6 divide-y divide-[var(--border-hairline)] border border-[var(--border-hairline)] bg-[var(--bg-card)]/40 rounded-2xl p-6 shadow-sm">
            {/* Accordion 1: PRODUCT DETAILS */}
            <div className="py-4">
              <button
                onClick={() => toggleAccordion("specs")}
                className="w-full flex items-center justify-between text-left font-bold text-sm uppercase tracking-wider py-2 cursor-pointer"
              >
                <span>{t.product.specSummaryTitle}</span>
                <span className="text-xl font-light">{openAccordion === "specs" ? "—" : "+"}</span>
              </button>

              <AnimatePresence initial={false}>
                {openAccordion === "specs" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 pb-2 text-xs space-y-3 text-[var(--text-primary)]">
                      <table className="w-full border-collapse">
                        <tbody className="divide-y divide-[var(--border-hairline)]">
                          {specs.categoryType === "computer" ? (
                            <>
                              <tr className="py-2">
                                <td className="py-2.5 font-bold uppercase w-1/3 text-[var(--text-muted)]">{t.locale === "en" ? "PROCESSOR" : "PROSESOR"}</td>
                                <td className="py-2.5 font-semibold text-[var(--text-primary)]">
                                  {specs.groups.find((g) => g.id === "cpu")?.items[0]?.value || product.cpu || "Intel / AMD Processor"}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2.5 font-bold uppercase text-[var(--text-muted)]">{t.locale === "en" ? "RAM / MEMORY" : "RAM / MEMORI"}</td>
                                <td className="py-2.5 font-semibold text-[var(--text-primary)]">
                                  {specs.groups.find((g) => g.id === "ram")?.items[0]?.value || `${product.ram_gb || 8} GB RAM`}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2.5 font-bold uppercase text-[var(--text-muted)]">{t.locale === "en" ? "STORAGE" : "PENYIMPANAN"}</td>
                                <td className="py-2.5 font-semibold text-[var(--text-primary)]">
                                  {specs.groups.find((g) => g.id === "storage")?.items[0]?.value || `${product.storage || "512GB"} SSD`}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2.5 font-bold uppercase text-[var(--text-muted)]">{t.locale === "en" ? "GRAPHICS CARD" : "KARTU GRAFIS"}</td>
                                <td className="py-2.5 font-semibold text-[var(--text-primary)]">
                                  {specs.groups.find((g) => g.id === "gpu")?.items[0]?.value || product.gpu || "Integrated Graphics"}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2.5 font-bold uppercase text-[var(--text-muted)]">{t.locale === "en" ? "DISPLAY & PANEL" : "LAYAR & PANEL"}</td>
                                <td className="py-2.5 font-semibold text-[var(--text-primary)]">
                                  {specs.groups.find((g) => g.id === "display")?.items[0]?.value || `${specs.metric3.value} ${specs.metric3.unit}`}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2.5 font-bold uppercase text-[var(--text-muted)]">{t.locale === "en" ? "PHYSICAL I/O PORTS" : "PORT I/O FISIK"}</td>
                                <td className="py-2.5 font-semibold text-[var(--text-primary)]">
                                  {specs.groups.find((g) => g.id === "ports")?.items[0]?.value || "USB 3.2, Type-C, HDMI, Audio Jack"}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2.5 font-bold uppercase text-[var(--text-muted)]">{t.locale === "en" ? "NETWORK / WI-FI" : "JARINGAN / WI-FI"}</td>
                                <td className="py-2.5 font-semibold text-[var(--text-primary)]">
                                  {specs.groups.find((g) => g.id === "wireless")?.items[0]?.value || "Wi-Fi 6 + Bluetooth"}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2.5 font-bold uppercase text-[var(--text-muted)]">{t.locale === "en" ? "OPERATING SYSTEM" : "SISTEM OPERASI"}</td>
                                <td className="py-2.5 font-semibold text-[var(--text-primary)]">
                                  {specs.groups.find((g) => g.id === "system")?.items[0]?.value || product.os || "Windows 11 Home Original"}
                                </td>
                              </tr>
                            </>
                          ) : (
                            <>
                              {specs.groups.flatMap((g) => g.items.slice(0, 1)).slice(0, 7).map((item, idx) => (
                                <tr key={idx} className="py-2">
                                  <td className="py-2.5 font-bold uppercase w-1/3 text-[var(--text-muted)]">
                                    {item.label}
                                  </td>
                                  <td className="py-2.5 font-semibold text-[var(--text-primary)]">
                                    {item.value}
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                          <tr>
                            <td className="py-2.5 font-bold uppercase text-[var(--text-muted)]">{t.catalog.officialWarranty}</td>
                            <td className="py-2.5 font-semibold text-[var(--text-primary)]">
                              {product.warranty || (t.locale === "en" ? "Official Indonesian Distributor Warranty" : "Garansi Resmi Distributor Indonesia")}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 font-bold uppercase text-[var(--text-muted)]">{t.locale === "en" ? "PACKAGE CONTENTS" : "PAKET PEMBELIAN"}</td>
                            <td className="py-2.5 font-semibold text-[var(--text-primary)]">
                              {product.bundled_items || (t.locale === "en" ? "Full Unit, Standard Accessories, Manual, Official Warranty Card" : "Unit Lengkap, Aksesoris Standar, Buku Manual, Kartu Garansi Resmi")}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <a
                        href="#matriks-spesifikasi"
                        className="mt-4 flex items-center justify-between p-3.5 bg-[var(--text-primary)]/5 hover:bg-black text-[var(--text-primary)] hover:text-white border border-[var(--border-hairline)] rounded-xl font-bold text-xs uppercase tracking-wider transition-all group"
                      >
                        <span>{t.product.fullMatrixButton} ({specs.groups.length} {t.product.categoriesCount})</span>
                        <span className="text-base group-hover:translate-y-0.5 transition-transform">&darr;</span>
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion 2: STORE POLICY */}
            <div className="py-4">
              <button
                onClick={() => toggleAccordion("policy")}
                className="w-full flex items-center justify-between text-left font-bold text-sm uppercase tracking-wider py-2 cursor-pointer"
              >
                <span>{t.product.storePolicyTitle}</span>
                <span className="text-xl font-light">{openAccordion === "policy" ? "—" : "+"}</span>
              </button>

              <AnimatePresence initial={false}>
                {openAccordion === "policy" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 pb-2 text-xs space-y-2 text-[var(--text-muted)] leading-relaxed">
                      <p className="font-semibold text-[var(--text-primary)]">
                        {t.product.unboxingWarning}
                      </p>
                      <p>
                        {t.product.unboxingDesc}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion 3: DELIVERY & WARRANTY */}
            <div className="py-4">
              <button
                onClick={() => toggleAccordion("delivery")}
                className="w-full flex items-center justify-between text-left font-bold text-sm uppercase tracking-wider py-2 cursor-pointer"
              >
                <span>{t.locale === "en" ? "DELIVERY & WARRANTY CLAIMS" : "PENGIRIMAN & KLAIM GARANSI"}</span>
                <span className="text-xl font-light">{openAccordion === "delivery" ? "—" : "+"}</span>
              </button>

              <AnimatePresence initial={false}>
                {openAccordion === "delivery" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 pb-2 text-xs space-y-2 text-[var(--text-muted)] leading-relaxed">
                      <p>
                        <strong>{t.locale === "en" ? "Direct Store Pickup:" : "Ambil Sendiri di Toko:"}</strong> {t.locale === "en" ? "Buyers are welcome to pick up directly at ITC Mega Grosir Floor B5 No. 7 for seal and complete accessories inspection with our technicians." : "Pembeli dipersilakan mengambil langsung di gerai fisik ITC Mega Grosir B5 No. 7 untuk pemeriksaan segel dan kelengkapan unit bersama tim teknisi."}
                      </p>
                      <p>
                        <strong>{t.locale === "en" ? "Out-of-Town Delivery:" : "Pengiriman Luar Kota:"}</strong> {t.locale === "en" ? "Coordinated via WhatsApp with wooden packing and full insurance options through partner couriers." : "Dikoordinasikan via WhatsApp dengan opsi packing kayu dan asuransi penuh melalui JNE / J&T Cargo."}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* =========================================================================
            MATRIKS SPESIFIKASI TEKNIS LENGKAP (FULL HARDWARE ARCHITECTURE)
           ========================================================================= */}
        <section id="matriks-spesifikasi" className="py-16 border-t border-[var(--border-hairline)] scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="text-tech-tag mb-2">
                {t.product.matrixTag}
              </div>
              <h2 className="text-display-l uppercase tracking-tighter">
                {t.product.matrixTitle} <span className="text-slant-display">{t.product.matrixTitleSlant}</span>
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 max-w-2xl leading-relaxed">
                {t.product.matrixDesc} <span className="text-[var(--text-primary)] font-semibold">{product.name}</span>.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCopySpecs}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-card)] hover:border-[var(--text-primary)] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
              >
                {copiedSpecs ? (
                  <>
                    <span className="text-[var(--text-primary)] font-bold">✓</span>
                    <span className="text-[var(--text-primary)] font-bold">{t.locale === "en" ? "COPIED TO CLIPBOARD" : "TERSALIN KE CLIPBOARD"}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>{t.locale === "en" ? "COPY SPECIFICATIONS" : "SALIN SPESIFIKASI"}</span>
                  </>
                )}
              </button>

              <a
                href={`https://wa.me/628113225678?text=Halo%20GMC,%20saya%20butuh%20brosur%20/%20konsultasi%20spesifikasi%20untuk:%20${encodeURIComponent(product.name)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-canvas)] hover:opacity-90 text-xs font-bold uppercase tracking-wider transition-opacity cursor-pointer shadow-sm"
              >
                <span>{t.locale === "en" ? "ASK GMC TECHNICIAN →" : "TANYA TEKNISI GMC →"}</span>
              </a>
            </div>
          </div>

          {/* Spec Groups in Clean Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {specs.groups.map((group, gIdx) => (
              <div
                key={group.id}
                className="border border-[var(--border-hairline)] bg-[var(--bg-card)]/40 rounded-2xl p-6 sm:p-7 shadow-sm transition-all hover:border-[var(--text-primary)]/40 flex flex-col justify-between"
              >
                <div>
                  {/* Group Header */}
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[0.625rem] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-mono">
                          {String(gIdx + 1).padStart(2, "0")}
                        </span>
                        <h3 className="font-black text-sm uppercase tracking-wider text-[var(--text-primary)]">
                          {group.title}
                        </h3>
                      </div>
                      <p className="text-[0.6875rem] text-[var(--text-muted)] line-clamp-1">
                        {group.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="divide-y divide-[var(--border-hairline)] pt-2">
                    {group.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 text-xs transition-colors ${
                          item.highlight ? "bg-[var(--text-primary)]/[0.03] -mx-2 px-2 rounded-lg" : ""
                        }`}
                      >
                        <span className="font-bold text-[var(--text-muted)] uppercase sm:w-2/5 shrink-0">
                          {item.label}
                        </span>
                        <span className="font-semibold text-[var(--text-primary)] sm:w-3/5 sm:text-right leading-relaxed break-words">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Official Warranty & Quality Guarantee Banner */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 border border-[var(--border-hairline)] bg-[var(--bg-card)]/30 rounded-2xl">
              <div className="w-8 h-8 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] flex items-center justify-center font-bold text-xs mb-3">
                ✓
              </div>
              <h4 className="font-bold text-xs uppercase tracking-wider mb-1">
                {t.locale === "en" ? "100% OFFICIAL FACTORY SEALED" : "100% UNIT RESMI PABRIKAN"}
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {t.locale === "en" ? "Brand new units sealed by official distributors. Serial Numbers verified directly on principal database." : "Unit baru bersegel distributor resmi. Nomor seri (Serial Number) terverifikasi langsung pada basis data prinsipal merek."}
              </p>
            </div>

            <div className="p-6 border border-[var(--border-hairline)] bg-[var(--bg-card)]/30 rounded-2xl">
              <div className="w-8 h-8 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] flex items-center justify-center font-bold text-xs mb-3">
                🛡
              </div>
              <h4 className="font-bold text-xs uppercase tracking-wider mb-1">
                {t.locale === "en" ? "OFFICIAL INDONESIAN WARRANTY" : "KLAIM GARANSI RESMI INDONESIA"}
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {t.locale === "en" ? "Can be claimed directly at any authorized service center in Indonesia, or dropped off at GMC ITC Mega Grosir B5 No. 7." : "Dapat diklaim langsung di seluruh Service Center resmi terdekat di Indonesia, atau dititipkan melalui gerai GMC ITC Mega Grosir B5 No. 7."}
              </p>
            </div>

            <div className="p-6 border border-[var(--border-hairline)] bg-[var(--bg-card)]/30 rounded-2xl">
              <div className="w-8 h-8 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] flex items-center justify-center font-bold text-xs mb-3">
                ⚡
              </div>
              <h4 className="font-bold text-xs uppercase tracking-wider mb-1">
                {t.locale === "en" ? "TECHNICAL & PROCUREMENT SUPPORT" : "SUPPORT TEKNISI & PENGADAAN"}
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {t.locale === "en" ? "Serving retail as well as corporate and institutional tenders with tax invoices and official documentation support." : "Melayani kebutuhan retail maupun tender/pengadaan korporasi & instansi dengan faktur pajak dan dukungan kelengkapan dokumen resmi."}
              </p>
            </div>
          </div>
        </section>

        {/* REVIEWS SECTION */}
        <section className="py-20 border-t border-[var(--border-hairline)]">
          <Reveal y={20} className="text-center mb-14">
            <h2 className="text-display-l mb-3">{t.product.reviewsTitle} <span className="text-slant-display">{t.product.reviewsTitleSlant}</span></h2>
            <div className="flex items-center justify-center gap-2 text-sm font-bold">
              <span className="tracking-widest">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <span>4.9 (47 {t.locale === "en" ? "REVIEWS" : "ULASAN"})</span>
            </div>
          </Reveal>

          <div className="divide-y divide-[var(--border-hairline)] border border-[var(--border-hairline)] bg-[var(--bg-card)]/30 rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-3">
                <p className="font-bold text-sm uppercase tracking-wider">HENDRA WIJAYA</p>
                <div className="flex items-center gap-2 text-xs my-1">
                  <span>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  <span className="text-[var(--text-muted)]">{t.locale === "en" ? "2 DAYS AGO" : "2 HARI LALU"}</span>
                </div>
                <span className="text-[0.625rem] font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  &bull; {t.product.verifiedPurchase}
                </span>
              </div>
              <div className="md:col-span-6 space-y-2">
                <h4 className="font-bold text-sm uppercase tracking-wide">
                  {t.locale === "en" ? "PRISTINE OFFICIAL UNIT & ACCURATE SPECS" : "UNIT RESMI MULUS & SPESIFIKASI SESUAI"}
                </h4>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {t.locale === "en" ? "Fast response on stock confirmation via WhatsApp. Picked up in person at ITC Mega Grosir B5 No 7, unit was tested with technician before BCA transfer. Warranty registered immediately upon activation." : "Pelayanan sangat cepat, konfirmasi stok via WhatsApp langsung direspons. Datang langsung ke ITC Mega Grosir B5 No 7, unit dicek bareng teknisi sebelum bayar transfer BCA. Garansi resmi langsung terdaftar saat aktivasi."}
                </p>
              </div>
              <div className="md:col-span-3 md:text-right text-xs text-[var(--text-muted)]">
                <span className="block text-[0.625rem] font-bold uppercase tracking-wider mb-2">
                  {t.product.helpfulQuestion}
                </span>
                <div className="flex md:justify-end gap-4 text-xs font-bold">
                  <button className="cursor-pointer hover:text-[var(--text-primary)]">&uarr; 15</button>
                  <button className="cursor-pointer hover:text-[var(--text-primary)]">&darr; 0</button>
                </div>
              </div>
            </div>

            <div className="py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-3">
                <p className="font-bold text-sm uppercase tracking-wider">SITI AISYAH</p>
                <div className="flex items-center gap-2 text-xs my-1">
                  <span>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  <span className="text-[var(--text-muted)]">{t.locale === "en" ? "5 DAYS AGO" : "5 HARI LALU"}</span>
                </div>
                <span className="text-[0.625rem] font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  &bull; {t.product.verifiedPurchase}
                </span>
              </div>
              <div className="md:col-span-6 space-y-2">
                <h4 className="font-bold text-sm uppercase tracking-wide">
                  {t.locale === "en" ? "EXCELLENT PERFORMANCE FOR DESIGN & OFFICE" : "PERFORMA MANTAP UNTUK DESAIN & KANTOR"}
                </h4>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {t.locale === "en" ? "Crisp display, spacious RAM and SSD. Office Home & Student pre-installed permanently. Secure packing delivered safely to Gresik." : "Layar sangat tajam, RAM dan SSD luas banget. Office Home & Student sudah terpasang permanen tinggal login akun Microsoft. Packing aman sampai Gresik."}
                </p>
              </div>
              <div className="md:col-span-3 md:text-right text-xs text-[var(--text-muted)]">
                <span className="block text-[0.625rem] font-bold uppercase tracking-wider mb-2">
                  {t.product.helpfulQuestion}
                </span>
                <div className="flex md:justify-end gap-4 text-xs font-bold">
                  <button className="cursor-pointer hover:text-[var(--text-primary)]">&uarr; 28</button>
                  <button className="cursor-pointer hover:text-[var(--text-primary)]">&darr; 1</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RELATED PRODUCTS */}
        <section className="py-16 border-t border-[var(--border-hairline)]">
          <Reveal y={20}>
            <div className="flex items-end justify-between mb-8 pb-4 border-b border-[var(--border-hairline)]">
              <h2 className="text-display-l">{t.product.relatedTitle} <span className="text-slant-display">{t.product.relatedTitleSlant}</span></h2>
              <Link href="/katalog" className="editorial-link">
                {t.product.viewAll} &rarr;
              </Link>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedProducts.map((p, pIdx) => (
              <Reveal key={p.id} delay={(pIdx % 3) * 0.08} y={24}>
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
                  variantsCount={p.variants.length}
                />
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      {/* Unified Elevated Footer Component */}
      <Footer />

      {/* Product JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            name: product.name,
            sku: selectedVariant?.sku || product.slug,
            brand: {
              "@type": "Brand",
              name: product.brand,
            },
            description: `${product.name} - RAM ${product.ram_gb || 8}GB, Storage ${product.storage || "512GB SSD"}, Layar ${product.screen_size || "14 inch"}, Garansi Resmi Indonesia.`,
            offers: {
              "@type": "Offer",
              url: `https://gmc.id/katalog/${product.slug}`,
              priceCurrency: "IDR",
              price: price,
              itemCondition: "https://schema.org/NewCondition",
              availability: "https://schema.org/InStock",
              seller: {
                "@type": "Organization",
                name: "Global Mandiri Computer",
              },
            },
          }),
        }}
      />
    </div>
  );
}
