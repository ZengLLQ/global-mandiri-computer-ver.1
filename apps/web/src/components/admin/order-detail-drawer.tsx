"use client";

import { useState, useEffect } from "react";
import {
  X,
  Printer,
  MessageCircle,
  Clock,
  CheckCircle,
  Truck,
  Package,
  AlertCircle,
  FileText,
  User,
  MapPin,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Save,
} from "lucide-react";
import { formatPriceIdr } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { ReceiptModal } from "@/components/admin/receipt-modal";
import { AdminOrder } from "@/stores/admin-store";

interface OrderDetailDrawerProps {
  orderId: string;
  onClose: () => void;
  onRefresh: () => void;
  onVerifyPayment: (orderDetail: any) => void;
}

export function OrderDetailDrawer({
  orderId,
  onClose,
  onRefresh,
  onVerifyPayment,
}: OrderDetailDrawerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notes editing state
  const [deliveryNote, setDeliveryNote] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState(false);

  // Status updating state
  const [targetStatus, setTargetStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showStatusPrompt, setShowStatusPrompt] = useState(false);

  // Receipt Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);

  const fetchOrderDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient(`/api/v1/admin/orders/${orderId}`);
      if (!res.ok) {
        throw new Error("Gagal memuat detail pesanan.");
      }
      const json = await res.json();
      setData(json);
      setDeliveryNote(json.order.admin_delivery_note || "");
      setInternalNotes(json.order.internal_notes || "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetail();
    }
  }, [orderId]);

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    setNotesSuccess(false);
    try {
      const res = await apiClient(`/api/v1/admin/orders/${orderId}/notes`, {
        method: "PATCH",
        body: JSON.stringify({
          admin_delivery_note: deliveryNote.trim() || null,
          internal_notes: internalNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan catatan.");
      setNotesSuccess(true);
      setTimeout(() => setNotesSuccess(false), 3000);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan catatan.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await apiClient(`/api/v1/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          note: statusNote.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Gagal mengubah status pesanan");
      }

      setShowStatusPrompt(false);
      setStatusNote("");
      await fetchOrderDetail();
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengubah status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
        <div className="bg-[var(--bg-canvas)] w-full max-w-2xl h-full p-6 flex flex-col justify-center items-center gap-3">
          <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs text-[var(--text-muted)]">Memuat rincian pesanan...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
        <div className="bg-[var(--bg-canvas)] w-full max-w-2xl h-full p-6 flex flex-col justify-center items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-sm font-bold text-red-600">{error || "Data pesanan tidak ditemukan."}</p>
          <button
            onClick={onClose}
            className="editorial-btn px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const { order, items, payment, status_history, whatsapp_links } = data;

  // Convert for ReceiptModal
  const printableOrder: AdminOrder = {
    orderNumber: order.order_number,
    fullName: order.customer_name,
    phone: order.customer_phone,
    address: order.shipping_address,
    shippingMethod: order.source === "in_store" ? "pickup" : "delivery",
    totalAmountIdr: order.total_amount_idr,
    status: order.status,
    notes: order.customer_note,
    createdAt: order.created_at,
    items: items.map((i: any) => ({
      productName: i.product_name,
      variantSku: i.variant_sku,
      quantity: i.quantity,
      priceIdr: i.price_idr,
      specs: i.specs_snapshot,
    })),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_payment":
        return <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-amber-100 text-amber-800 rounded-lg">MENUNGGU PEMBAYARAN</span>;
      case "proof_uploaded":
        return <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-blue-100 text-blue-800 rounded-lg">BUKTI DIUNGGAH</span>;
      case "paid":
        return <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded-lg">LUNAS (PAID)</span>;
      case "packed":
        return <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-indigo-100 text-indigo-800 rounded-lg">DIKEMAS</span>;
      case "ready_pickup":
        return <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-purple-100 text-purple-800 rounded-lg">SIAP DIAMBIL</span>;
      case "shipped":
        return <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-cyan-100 text-cyan-800 rounded-lg">DIKIRIM</span>;
      case "done":
        return <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-neutral-200 text-neutral-800 rounded-lg">SELESAI</span>;
      case "cancelled":
        return <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-red-100 text-red-800 rounded-lg">DIBATALKAN</span>;
      default:
        return <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-neutral-100 text-neutral-700 rounded-lg">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      {/* Printable Receipt Modal */}
      {showPrintModal && (
        <ReceiptModal order={printableOrder} onClose={() => setShowPrintModal(false)} />
      )}

      <div className="bg-[var(--bg-canvas)] border-l border-[var(--border-hairline)] w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 md:px-6 border-b border-[var(--border-hairline)] flex items-center justify-between bg-[var(--bg-card)]">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black tracking-wider text-[var(--text-primary)]">
                  {order.order_number}
                </span>
                {getStatusBadge(order.status)}
              </div>
              <span className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5 block">
                {new Date(order.created_at).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                WIB • Sumber: <span className="uppercase font-bold">{order.source}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrintModal(true)}
              className="p-2 border border-[var(--border-hairline)] rounded-xl hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold"
              title="Cetak Nota Resmi"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">CETAK</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 border border-[var(--border-hairline)] rounded-xl hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Workflow Action Bar */}
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
                ALUR STATUS PESANAN
              </span>
              {order.status === "proof_uploaded" && (
                <button
                  type="button"
                  onClick={() => onVerifyPayment(data)}
                  className="editorial-btn px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer animate-pulse"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>PERIKSA BUKTI TRANSFER</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {order.status === "pending_payment" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetStatus("proof_uploaded");
                      setShowStatusPrompt(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold border border-blue-400 bg-blue-50 text-blue-900 rounded-xl cursor-pointer"
                  >
                    Tandai Bukti Diterima
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetStatus("cancelled");
                      setShowStatusPrompt(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold border border-red-300 text-red-700 rounded-xl cursor-pointer"
                  >
                    Batalkan Pesanan
                  </button>
                </>
              )}

              {order.status === "paid" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetStatus("packed");
                      setShowStatusPrompt(true);
                    }}
                    className="editorial-btn px-4 py-1.5 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>TANDAI SELESAI PACKING</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetStatus("cancelled");
                      setShowStatusPrompt(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold border border-red-300 text-red-700 rounded-xl cursor-pointer"
                  >
                    Batalkan
                  </button>
                </>
              )}

              {order.status === "packed" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetStatus("ready_pickup");
                      setShowStatusPrompt(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold border border-purple-400 bg-purple-50 text-purple-900 rounded-xl cursor-pointer"
                  >
                    Siap Diambil di Gerai
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetStatus("shipped");
                      setShowStatusPrompt(true);
                    }}
                    className="editorial-btn px-4 py-1.5 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>KIRIM VIA KURIR / EKSPEDISI</span>
                  </button>
                </>
              )}

              {(order.status === "ready_pickup" || order.status === "shipped") && (
                <button
                  type="button"
                  onClick={() => {
                    setTargetStatus("done");
                    setShowStatusPrompt(true);
                  }}
                  className="editorial-btn px-4 py-1.5 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>SELESAIKAN PESANAN (DONE)</span>
                </button>
              )}
            </div>

            {/* Prompt note modal for transition */}
            {showStatusPrompt && (
              <div className="p-3 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl border border-[var(--border-hairline)] space-y-2 mt-2">
                <span className="text-[11px] font-bold block">
                  Ubah status ke: <strong className="uppercase font-mono">{targetStatus}</strong>
                </span>
                <input
                  type="text"
                  placeholder="Catatan status opsional (misal: Unit diserahkan ke kurir J&T resi...)"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStatusPrompt(false)}
                    className="px-3 py-1 text-xs text-[var(--text-muted)] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleUpdateStatus(targetStatus)}
                    className="editorial-btn px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {isUpdatingStatus ? "Menyimpan..." : "Konfirmasi Perubahan"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Customer & WhatsApp Action Toolbar */}
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
                INFORMASI PELANGGAN & AKSI WHATSAPP
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                  <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="font-mono">{order.customer_phone}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-start gap-1.5 text-[var(--text-secondary)]">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--text-muted)]" />
                  <span>{order.shipping_address}</span>
                </div>
                {order.customer_note && (
                  <p className="text-[11px] text-[var(--text-muted)] italic pl-5">
                    Catatan pembeli: &quot;{order.customer_note}&quot;
                  </p>
                )}
              </div>
            </div>

            {/* WhatsApp Quick Buttons with Indonesian Templates */}
            <div className="pt-2 border-t border-[var(--border-hairline)]">
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block mb-2">
                HUBUNGI PEMBELI VIA WHATSAPP (TEMPLAT RESMI):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {whatsapp_links.reminder && order.status === "pending_payment" && (
                  <a
                    href={whatsapp_links.reminder}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-[11px] font-bold border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Kirim Pengingat Pembayaran</span>
                  </a>
                )}
                {whatsapp_links.paid && (
                  <a
                    href={whatsapp_links.paid}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-[11px] font-bold border border-[var(--border-hairline)] hover:bg-[var(--bg-canvas)] rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Konfirmasi Pembayaran Diterima</span>
                  </a>
                )}
                {whatsapp_links.ready_pickup && (
                  <a
                    href={whatsapp_links.ready_pickup}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-[11px] font-bold border border-[var(--border-hairline)] hover:bg-[var(--bg-canvas)] rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Unit Siap Diambil di ITC</span>
                  </a>
                )}
                {whatsapp_links.shipped && (
                  <a
                    href={whatsapp_links.shipped}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-[11px] font-bold border border-[var(--border-hairline)] hover:bg-[var(--bg-canvas)] rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Kirim Info Pengiriman</span>
                  </a>
                )}
                {whatsapp_links.ask_confirm && (
                  <a
                    href={whatsapp_links.ask_confirm}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-[11px] font-bold border border-[var(--border-hairline)] hover:bg-[var(--bg-canvas)] rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Tanya Konfirmasi</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Ordered Products Table */}
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl space-y-3">
            <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              DAFTAR PRODUK DALAM PESANAN ({items.length} ITEM)
            </span>

            <div className="divide-y divide-[var(--border-hairline)]">
              {items.map((item: any, idx: number) => (
                <div key={item.id || idx} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-[var(--text-primary)]">{item.product_name}</p>
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[var(--text-muted)]">
                      <span>SKU: {item.variant_sku}</span>
                      <span>•</span>
                      <span>Warna: {item.color_name}</span>
                      <span>•</span>
                      <span>Qty: {item.quantity}</span>
                    </div>
                    {item.specs_snapshot && (
                      <p className="text-[11px] text-[var(--text-muted)] font-mono leading-relaxed line-clamp-2">
                        {item.specs_snapshot}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold block">
                      {formatPriceIdr(item.subtotal_idr)}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                      @{formatPriceIdr(item.price_idr)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal Calculation Lines */}
            <div className="pt-3 border-t border-[var(--border-hairline)] space-y-1.5 text-xs">
              {order.gift_wrapping && (
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Kemasan Kado Spesial GMC</span>
                  <span className="font-mono">{formatPriceIdr(order.gift_wrapping_price_idr || 25000)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-[var(--text-primary)] pt-1 border-t border-[var(--border-hairline)]">
                <span>TOTAL AKHIR</span>
                <span className="font-mono text-base font-black">
                  {formatPriceIdr(order.total_amount_idr)}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Note & Staff Internal Notes Editor */}
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
                CATATAN INTERNAL & PENGIRIMAN
              </span>
              {notesSuccess && (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Catatan tersimpan
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-[var(--text-muted)] block mb-1">
                  Catatan Pengiriman (Tercetak di Resi & Dikirim ke WA Pembeli):
                </label>
                <input
                  type="text"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Contoh: Diantar kurir toko GMC Surabaya jam 14.00, packing kayu asuransi..."
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--text-muted)] block mb-1">
                  Catatan Internal Staff (Hanya terlihat oleh Owner, Admin & Staff):
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Contoh: Pembeli minta bonus mousepad dan instalasi Office original..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isSavingNotes}
                  onClick={handleSaveNotes}
                  className="editorial-btn px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingNotes ? "Menyimpan..." : "Simpan Catatan"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Status History Timeline */}
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl space-y-3">
            <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              RIWAYAT PERJALANAN STATUS
            </span>

            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border-hairline)]">
              {status_history.map((h: any, idx: number) => (
                <div key={h.id || idx} className="relative text-xs space-y-0.5">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[var(--text-primary)] border-2 border-white dark:border-black" />
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold uppercase text-[11px]">
                      {h.to_status}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {new Date(h.created_at).toLocaleString("id-ID", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}{" "}
                      WIB
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Oleh: <strong>{h.actor_name || "Sistem"}</strong> ({h.actor_role || "system"})
                  </p>
                  {h.note && (
                    <p className="text-[11px] text-[var(--text-muted)] italic">
                      &quot;{h.note}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
