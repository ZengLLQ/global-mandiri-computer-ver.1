"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useCartStore } from "@/stores/cart-store";
import { useState, useEffect } from "react";
import { useTranslation } from "@/stores/language-store";

export default function CartPage() {
  const { t } = useTranslation();
  const { items, updateQuantity, removeItem, totalPriceIdr, totalItems } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">
        <p className="text-micro-label uppercase tracking-widest text-[var(--text-muted)]">
          {t.locale === "en" ? "LOADING CART..." : "MEMUAT KERANJANG..."}
        </p>
      </div>
    );
  }

  const total = totalPriceIdr();
  const count = totalItems();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Modern Unified Header */}
      <Header />

      {/* Tiny Sub-Header Breadcrumb */}
      <div className="px-6 md:px-10 lg:px-12 pt-6">
        <div className="w-full text-micro-label text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text-primary)]">{t.cart.breadcrumbHome}</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-primary)]">{t.cart.breadcrumbCart}</span>
        </div>
      </div>

      <main className="flex-1 w-full px-6 md:px-10 lg:px-12 py-10">
        <div className="mb-10 pb-4 border-b border-[var(--border-hairline)] flex justify-between items-end">
          <div>
            <p className="text-tech-tag mb-2">{t.cart.tag}</p>
            <h1 className="text-display-l">
              {t.cart.title} <span className="text-slant-display">{t.cart.titleSlant}</span>
            </h1>
          </div>
          <span className="text-micro-label font-bold text-[var(--text-muted)]">
            {t.cart.totalUnits} {count} {t.catalog.unitsCount}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="py-24 text-center border border-[var(--border-hairline)] bg-[var(--bg-card)] max-w-xl mx-auto p-12">
            <p className="text-xl font-bold uppercase tracking-tight mb-3">
              {t.cart.emptyTitle}
            </p>
            <p className="text-body text-[var(--text-muted)] text-sm mb-8">
              {t.cart.emptyDesc}
            </p>
            <Link href="/katalog" className="editorial-btn text-xs px-8 py-3.5">
              {t.cart.browseCatalog} &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Cart Items List (8 cols) */}
            <div className="lg:col-span-8 divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)]">
              {items.map((item) => (
                <div key={item.id} className="py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  {/* Left: Info */}
                  <div className="flex-1 space-y-1">
                    <span className="text-micro-label text-[var(--text-muted)] tracking-wider">
                      {item.brand} &bull; SKU: {item.variantSku}
                    </span>
                    <h3 className="text-base font-bold uppercase tracking-tight">
                      <Link href={`/katalog/${item.productSlug}`} className="hover:underline">
                        {item.productName}
                      </Link>
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] uppercase">
                      {t.locale === "en" ? "COLOR:" : "WARNA:"} <strong className="text-[var(--text-primary)]">{item.colorName}</strong> {item.specsHighlight ? `• ${item.specsHighlight}` : ""}
                    </p>
                    <p className="text-sm font-bold pt-1">
                      {item.priceIdr > 0 ? `Rp ${item.priceIdr.toLocaleString("id-ID")}` : t.catalog.inquirePrice}
                    </p>
                  </div>

                  {/* Middle: Stepper */}
                  <div className="flex items-center border border-[var(--border-hairline)] bg-[var(--bg-card)]">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-3 py-1.5 font-bold hover:opacity-60 cursor-pointer text-sm"
                    >
                      &minus;
                    </button>
                    <span className="px-4 text-xs font-bold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-3 py-1.5 font-bold hover:opacity-60 cursor-pointer text-sm"
                    >
                      +
                    </button>
                  </div>

                  {/* Right: Subtotal & Remove */}
                  <div className="text-right sm:min-w-[140px] space-y-1">
                    <p className="text-base font-extrabold tabular-nums">
                      {item.priceIdr > 0
                        ? `Rp ${(item.priceIdr * item.quantity).toLocaleString("id-ID")}`
                        : t.catalog.inquirePrice}
                    </p>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-micro-label text-[var(--text-muted)] hover:text-red-600 underline cursor-pointer"
                    >
                      {t.cart.remove} &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Summary (4 cols) */}
            <div className="lg:col-span-4 p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)] space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.1em] pb-3 border-b border-[var(--border-hairline)]">
                {t.cart.tag}
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{t.cart.subtotal}</span>
                  <span className="font-bold tabular-nums">
                    Rp {total.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{t.cart.shipping}</span>
                  <span className="font-semibold text-right">
                    {t.cart.shippingCalculated}
                  </span>
                </div>
              </div>

              {/* Note on Shipping & Delivery (per project scope) */}
              <div className="p-4 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[0.6875rem] text-[var(--text-muted)] space-y-1">
                <p className="font-bold text-[var(--text-primary)] uppercase">
                  {t.cart.shippingNoticeTitle}
                </p>
                <p>
                  {t.cart.shippingNotice}
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border-hairline)] flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase">{t.cart.totalPayment}</span>
                <span className="text-2xl font-black tabular-nums">
                  Rp {total.toLocaleString("id-ID")}
                </span>
              </div>

              <Link
                href="/checkout"
                className="w-full editorial-btn py-4 text-xs font-bold text-center block text-white hover:text-white"
              >
                {t.cart.checkoutButton} &rarr;
              </Link>

              <Link
                href="/katalog"
                className="editorial-link text-[0.6875rem] text-center block text-[var(--text-muted)]"
              >
                &larr; {t.cart.continueShopping}
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Unified Elevated Footer Component */}
      <Footer />
    </div>
  );
}
