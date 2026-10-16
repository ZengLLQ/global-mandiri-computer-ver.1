"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useCartStore } from "@/stores/cart-store";
import { useTranslation } from "@/stores/language-store";
import { useAdminStore } from "@/stores/admin-store";
import { apiFetch } from "@/lib/api-client";

export default function CheckoutPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { items, totalPriceIdr, clearCart } = useCartStore();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const total = totalPriceIdr();

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      setErrorMsg(
        t.locale === "en"
          ? "Please fill in Name, WhatsApp Number, and Delivery Address."
          : "Mohon lengkapi Nama, Nomor WhatsApp, dan Alamat Pengiriman."
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      // 1. Send order directly to backend Axum API
      const payload = {
        customer_name: fullName.trim(),
        customer_phone: phone.trim(),
        shipping_address: address.trim(),
        customer_note: note.trim() || null,
        items: items.map((it) => ({
          product_name: it.productName,
          product_slug: it.productSlug || it.productName.toLowerCase().replace(/\s+/g, "-"),
          variant_sku: it.variantSku || "STD-01",
          color_name: it.colorName || "Standard",
          specs_highlight: it.specsHighlight || "",
          quantity: it.quantity,
          price_idr: it.priceIdr,
        })),
      };

      const res = await apiFetch<any>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const orderNumber = res.order_number;

      // 2. Cache in localStorage for user offline view / tracking history
      const orderData = {
        orderNumber,
        fullName,
        phone,
        address,
        note,
        items,
        totalAmountIdr: total,
        createdAt: res.created_at || new Date().toISOString(),
        status: "pending_payment" as const,
        bcaAccount: res.bca_account,
        bcaHolder: res.bca_holder,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem(`gmc_order_${orderNumber}`, JSON.stringify(orderData));
        const existingList = JSON.parse(localStorage.getItem("gmc_user_orders") || "[]");
        existingList.unshift(orderNumber);
        localStorage.setItem("gmc_user_orders", JSON.stringify(existingList));

        // Sync into Admin Store for backward compatibility
        useAdminStore.getState().addOrder({
          orderNumber,
          fullName,
          phone,
          address,
          shippingMethod: "delivery",
          totalAmountIdr: total,
          status: "pending_payment",
          notes: note,
          createdAt: new Date().toISOString(),
          items: items.map((it) => ({
            productName: it.productName,
            variantSku: it.variantSku,
            quantity: it.quantity,
            priceIdr: it.priceIdr,
            specs: it.specsHighlight,
          })),
        });
      }

      clearCart();
      router.push(`/order/${orderNumber}`);
    } catch (err: any) {
      console.error("Gagal membuat pesanan:", err);
      setErrorMsg(
        err.message ||
          (t.locale === "en"
            ? "Failed to create order. Please verify connection to server."
            : "Gagal membuat pesanan. Pastikan server backend terhubung.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Modern Unified Header */}
      <Header />

      {/* Breadcrumb */}
      <div className="px-6 md:px-10 lg:px-12 pt-6">
        <div className="w-full text-micro-label text-[var(--text-muted)]">
          <Link href="/keranjang" className="hover:text-[var(--text-primary)]">{t.checkout.breadcrumbCart}</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-primary)]">{t.checkout.breadcrumbCheckout}</span>
        </div>
      </div>

      <main className="flex-1 w-full px-6 md:px-10 lg:px-12 py-10">
        <div className="mb-10 pb-4 border-b border-[var(--border-hairline)]">
          <p className="text-micro-label text-[var(--text-muted)] tracking-widest mb-2">{t.checkout.breadcrumbCheckout}</p>
          <h1 className="text-display-l">{t.locale === "en" ? "CHECKOUT & SHIPPING" : "CHECKOUT & PENGIRIMAN"}</h1>
        </div>

        {items.length === 0 ? (
          <div className="py-20 text-center border border-[var(--border-hairline)] bg-[var(--bg-card)] max-w-xl mx-auto p-12">
            <p className="text-lg font-bold uppercase mb-4">{t.locale === "en" ? "NO ITEMS TO CHECKOUT" : "TIDAK ADA ITEM UNTUK DIBAYAR"}</p>
            <Link href="/katalog" className="editorial-btn text-xs px-8 py-3">
              {t.locale === "en" ? "RETURN TO CATALOG →" : "KEMBALI KE KATALOG →"}
            </Link>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Form Details (7 cols) */}
            <div className="lg:col-span-7 space-y-8">
              {errorMsg && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase">
                  {errorMsg}
                </div>
              )}

              {/* Section 1: Customer Contact */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-primary)] pb-2 border-b border-[var(--border-hairline)]">
                  {t.checkout.step1Title}
                </h2>
                <div>
                  <label className="text-micro-label text-[var(--text-muted)] block mb-1">
                    {t.checkout.fullName}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t.locale === "en" ? "EXAMPLE: JOHN DOE" : "CONTOH: BUDI SANTOSO"}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-4 py-3 text-xs uppercase focus:outline-none focus:border-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="text-micro-label text-[var(--text-muted)] block mb-1">
                    {t.checkout.whatsapp}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t.locale === "en" ? "EXAMPLE: +62 812 3456 7890" : "CONTOH: 081234567890"}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-4 py-3 text-xs uppercase font-mono focus:outline-none focus:border-[var(--text-primary)]"
                  />
                  <p className="text-[0.625rem] text-[var(--text-muted)] mt-1">
                    {t.checkout.whatsappHelper}
                  </p>
                </div>
              </div>

              {/* Section 2: Address & Notes */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-primary)] pb-2 border-b border-[var(--border-hairline)]">
                  {t.checkout.step2Title}
                </h2>
                <div>
                  <label className="text-micro-label text-[var(--text-muted)] block mb-1">
                    {t.checkout.addressLabel}
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t.checkout.addressPlaceholder}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-4 py-3 text-xs uppercase focus:outline-none focus:border-[var(--text-primary)] leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-micro-label text-[var(--text-muted)] block mb-1">
                    {t.checkout.orderNotes}
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t.checkout.orderNotesPlaceholder}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-4 py-3 text-xs uppercase focus:outline-none focus:border-[var(--text-primary)]"
                  />
                </div>
              </div>

              {/* Section 3: Payment Method Info */}
              <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-hairline)] space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  {t.checkout.step3Title}
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {t.checkout.step3Desc}
                </p>
              </div>
            </div>

            {/* Order Summary Sidebar (5 cols) */}
            <div className="lg:col-span-5 p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)] space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.1em] pb-3 border-b border-[var(--border-hairline)]">
                {t.checkout.orderSummary}
              </h2>

              <div className="divide-y divide-[var(--border-hairline)] max-h-72 overflow-y-auto pr-2">
                {items.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between items-start gap-4 text-xs">
                    <div>
                      <p className="font-bold uppercase tracking-tight">{item.productName}</p>
                      <p className="text-[0.625rem] text-[var(--text-muted)] uppercase mt-0.5">
                        {t.locale === "en" ? "COLOR:" : "WARNA:"} {item.colorName} &bull; QTY: {item.quantity}
                      </p>
                    </div>
                    <span className="font-bold tabular-nums whitespace-nowrap">
                      Rp {(item.priceIdr * item.quantity).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[var(--border-hairline)] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{t.checkout.subtotal}</span>
                  <span className="font-bold tabular-nums">
                    Rp {total.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{t.checkout.shippingFee}</span>
                  <span className="font-semibold text-right">
                    {t.checkout.shippingArranged}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-[var(--border-hairline)] text-sm">
                  <span className="font-bold uppercase">{t.checkout.totalTransfer}</span>
                  <span className="font-black text-xl tabular-nums">
                    Rp {total.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full editorial-btn py-4 text-xs font-bold text-center block cursor-pointer text-white hover:text-white"
              >
                {submitting ? t.checkout.processing : `${t.checkout.submitButton} \u2192`}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Unified Elevated Footer Component */}
      <Footer />
    </div>
  );
}
