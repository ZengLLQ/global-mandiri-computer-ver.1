"use client";

import { useState } from "react";
import { X, Plus, Trash2, Check, ShoppingBag, Store, MessageCircle, AlertCircle } from "lucide-react";
import { formatPriceIdr } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface ManualOrderItem {
  product_name: string;
  variant_sku: string;
  color_name: string;
  specs_snapshot: string;
  quantity: number;
  unit_price_idr: number;
}

interface ManualOrderModalProps {
  onSuccess: (orderId: string) => void;
  onClose: () => void;
}

export function ManualOrderModal({ onSuccess, onClose }: ManualOrderModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("Ambil di Gerai Toko (ITC Mega Grosir Surabaya Lt. B5 No. 7)");
  const [customerNote, setCustomerNote] = useState("");
  const [source, setSource] = useState<"in_store" | "whatsapp" | "website">("in_store");
  const [isPaid, setIsPaid] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bca_transfer">("cash");
  const [giftWrapping, setGiftWrapping] = useState(false);

  const [items, setItems] = useState<ManualOrderItem[]>([
    {
      product_name: "ASUS Vivobook 14 (A1404ZA)",
      variant_sku: "SKU-ASUS-VIVO-14",
      color_name: "Quiet Blue",
      specs_snapshot: "Intel Core i5-1235U / 8GB DDR4 / 512GB SSD / 14\" FHD",
      quantity: 1,
      unit_price_idr: 8900000,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_name: "",
        variant_sku: "SKU-MANUAL",
        color_name: "Standard",
        specs_snapshot: "",
        quantity: 1,
        unit_price_idr: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ManualOrderItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const itemsSubtotal = items.reduce((sum, item) => sum + item.unit_price_idr * item.quantity, 0);
  const giftPrice = giftWrapping ? 25000 : 0;
  const grandTotal = itemsSubtotal + giftPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!customerName.trim()) {
      setErrorMsg("Nama pelanggan wajib diisi.");
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMsg("Nomor WhatsApp / HP pelanggan wajib diisi.");
      return;
    }
    if (items.some((i) => !i.product_name.trim() || i.unit_price_idr <= 0)) {
      setErrorMsg("Semua produk harus memiliki nama dan harga lebih dari Rp 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient("/api/v1/admin/orders/manual", {
        method: "POST",
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          shipping_address: shippingAddress.trim(),
          customer_note: customerNote.trim() || undefined,
          source,
          is_paid: isPaid,
          payment_method: paymentMethod,
          gift_wrapping: giftWrapping,
          items: items.map((i) => ({
            product_name: i.product_name.trim(),
            variant_sku: i.variant_sku.trim() || "SKU-MANUAL",
            color_name: i.color_name.trim() || "Standard",
            specs_snapshot: i.specs_snapshot.trim() || undefined,
            quantity: Number(i.quantity) || 1,
            unit_price_idr: Number(i.unit_price_idr) || 0,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Gagal membuat pesanan manual");
      }

      const json = await res.json();
      onSuccess(json.order.id);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat pesanan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="bg-[var(--bg-canvas)] border border-[var(--border-hairline)] w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 md:px-6 border-b border-[var(--border-hairline)] flex items-center justify-between bg-[var(--bg-card)]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[var(--text-muted)]" />
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                BUAT PESANAN MANUAL (WALK-IN / WHATSAPP)
              </span>
              <p className="text-[11px] text-[var(--text-muted)]">
                Input pesanan langsung untuk pembeli di toko ITC Surabaya atau pemesanan via chat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 border border-[var(--border-hairline)] rounded-xl hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Source Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block">
              SUMBER TRANSAKSI:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSource("in_store");
                  setShippingAddress("Ambil di Gerai Toko (ITC Mega Grosir Surabaya Lt. B5 No. 7)");
                }}
                className={`p-3 border rounded-2xl flex items-center gap-2.5 text-xs font-bold cursor-pointer transition-all ${
                  source === "in_store"
                    ? "bg-[var(--text-primary)] text-white border-[var(--text-primary)] shadow-sm"
                    : "bg-[var(--bg-card)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-neutral-50"
                }`}
              >
                <Store className="w-4 h-4" />
                <div className="text-left">
                  <span>Walk-in Toko ITC</span>
                  <span className="text-[10px] block opacity-80 font-normal">Pelanggan datang langsung</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSource("whatsapp");
                  setShippingAddress("Kirim via Kurir Surabaya / Ekspedisi");
                }}
                className={`p-3 border rounded-2xl flex items-center gap-2.5 text-xs font-bold cursor-pointer transition-all ${
                  source === "whatsapp"
                    ? "bg-[var(--text-primary)] text-white border-[var(--text-primary)] shadow-sm"
                    : "bg-[var(--bg-card)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-neutral-50"
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <div className="text-left">
                  <span>Chat WhatsApp</span>
                  <span className="text-[10px] block opacity-80 font-normal">Pemesanan online manual</span>
                </div>
              </button>
            </div>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                NAMA PELANGGAN *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Hendra Wijaya"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] focus:outline-hidden focus:ring-1 focus:ring-black"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                NO. TELEPON / WHATSAPP *
              </label>
              <input
                type="tel"
                required
                placeholder="Contoh: 081234567890"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] focus:outline-hidden focus:ring-1 focus:ring-black font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                ALAMAT PENGIRIMAN / PENYERAHAN *
              </label>
              <input
                type="text"
                required
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] focus:outline-hidden focus:ring-1 focus:ring-black"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                CATATAN TAMBAHAN (OPSIONAL)
              </label>
              <input
                type="text"
                placeholder="Misal: Sudah termasuk bonus mouse & tas laptop resmi GMC..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] focus:outline-hidden focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          {/* Product Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase">
                DAFTAR PRODUK YANG DIBELI ({items.length}):
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold flex items-center gap-1 text-[var(--text-primary)] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Produk</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl space-y-2 relative"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-mono text-[var(--text-muted)] block">NAMA UNIT LAPTOP / PC</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: ASUS Vivobook 14"
                        value={item.product_name}
                        onChange={(e) => handleItemChange(idx, "product_name", e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-[var(--text-muted)] block">SKU / KODE UNIT</label>
                      <input
                        type="text"
                        placeholder="SKU-..."
                        value={item.variant_sku}
                        onChange={(e) => handleItemChange(idx, "variant_sku", e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-mono text-[var(--text-muted)] block">WARNA</label>
                      <input
                        type="text"
                        placeholder="Misal: Quiet Blue"
                        value={item.color_name}
                        onChange={(e) => handleItemChange(idx, "color_name", e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-[var(--text-muted)] block">JUMLAH (QTY)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", parseInt(e.target.value) || 1)}
                        className="w-full text-xs p-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-[var(--text-muted)] block">HARGA SATUAN (IDR)</label>
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        required
                        value={item.unit_price_idr}
                        onChange={(e) => handleItemChange(idx, "unit_price_idr", parseInt(e.target.value) || 0)}
                        className="w-full text-xs p-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-1 flex items-end justify-between sm:justify-end gap-2">
                      <div className="sm:hidden font-mono text-xs font-bold">
                        Subtotal: {formatPriceIdr(item.unit_price_idr * item.quantity)}
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Spesifikasi ringkas (misal: Core i5-1235U / 8GB / 512GB SSD / 14 FHD)"
                      value={item.specs_snapshot}
                      onChange={(e) => handleItemChange(idx, "specs_snapshot", e.target.value)}
                      className="w-full text-[11px] p-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Options Section */}
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="rounded-sm accent-black w-4 h-4 cursor-pointer"
                />
                <span>Tandai Sudah Lunas Langsung (Status -&gt; PAID)</span>
              </label>
            </div>

            {isPaid && (
              <div className="flex items-center gap-4 text-xs pl-6">
                <span className="font-mono text-[11px] text-[var(--text-muted)]">METODE BAYAR:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="paymethod"
                    checked={paymentMethod === "cash"}
                    onChange={() => setPaymentMethod("cash")}
                    className="accent-black"
                  />
                  <span>Tunai / Kasir Toko ITC</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="paymethod"
                    checked={paymentMethod === "bca_transfer"}
                    onChange={() => setPaymentMethod("bca_transfer")}
                    className="accent-black"
                  />
                  <span>Transfer BCA (1301510191)</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-hairline)]">
              <label className="text-xs font-bold flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={giftWrapping}
                  onChange={(e) => setGiftWrapping(e.target.checked)}
                  className="rounded-sm accent-black w-4 h-4 cursor-pointer"
                />
                <span>Kemasan Kado Spesial GMC (+ Rp 25.000)</span>
              </label>
            </div>

            {/* Total Summary */}
            <div className="pt-2 border-t border-[var(--border-hairline)] flex justify-between items-center text-sm font-bold">
              <span>TOTAL PESANAN:</span>
              <span className="font-mono text-base font-black text-[var(--text-primary)]">
                {formatPriceIdr(grandTotal)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-[var(--border-hairline)] rounded-xl text-xs font-bold hover:bg-[var(--bg-card)] cursor-pointer"
            >
              BATAL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="editorial-btn px-6 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? "MENYIMPAN..." : "SIMPAN PESANAN MANUAL"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
