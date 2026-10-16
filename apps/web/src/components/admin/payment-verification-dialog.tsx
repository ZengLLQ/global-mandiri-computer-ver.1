"use client";

import { useState } from "react";
import { X, Check, AlertTriangle, ZoomIn, Download, ExternalLink, ShieldAlert } from "lucide-react";
import { formatPriceIdr } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface PaymentVerificationDialogProps {
  orderId: string;
  orderNumber: string;
  customerName: string;
  expectedAmountIdr: number;
  paymentMethod: string;
  proofUploadedAt?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function PaymentVerificationDialog({
  orderId,
  orderNumber,
  customerName,
  expectedAmountIdr,
  paymentMethod,
  proofUploadedAt,
  onSuccess,
  onClose,
}: PaymentVerificationDialogProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isZoomed, setIsZoomed] = useState(false);

  const proofUrl = `/api/v1/admin/orders/${orderId}/proof-file`;

  const REJECT_PRESETS = [
    "Nominal transfer tidak sesuai dengan total pesanan",
    "Bukti transfer buram atau tidak terbaca",
    "Bukan ditujukan ke Rekening BCA Resmi GMC (1301510191 a.n LILY ALI)",
    "Tanggal transaksi transfer tidak sesuai / kedaluwarsa",
    "Nomor referensi mutasi tidak terdaftar di mutasi BCA",
  ];

  const handleApprove = async () => {
    setIsApproving(true);
    setErrorMsg("");
    try {
      const res = await apiClient(`/api/v1/admin/orders/${orderId}/verify-payment`, {
        method: "POST",
        body: JSON.stringify({
          action: "approve",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Gagal menyetujui pembayaran");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat menyetujui pembayaran.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    const reason = rejectionReason.trim() || selectedPreset;
    if (!reason) {
      setErrorMsg("Pilih atau isi alasan penolakan bukti transfer terlebih dahulu.");
      return;
    }

    setIsRejecting(true);
    setErrorMsg("");
    try {
      const res = await apiClient(`/api/v1/admin/orders/${orderId}/verify-payment`, {
        method: "POST",
        body: JSON.stringify({
          action: "reject",
          rejection_reason: reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Gagal menolak bukti pembayaran");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat menolak bukti pembayaran.");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="bg-[var(--bg-canvas)] border border-[var(--border-hairline)] w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 md:px-6 border-b border-[var(--border-hairline)] flex items-center justify-between bg-[var(--bg-card)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                VERIFIKASI BUKTI PEMBAYARAN
              </span>
              <span className="text-xs px-2 py-0.5 rounded-sm bg-neutral-200 dark:bg-neutral-800 font-mono font-bold">
                {orderNumber}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Pelanggan: <strong className="text-[var(--text-primary)]">{customerName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 border border-[var(--border-hairline)] rounded-xl hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount Triage Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl">
            <div>
              <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">TOTAL TAGIHAN</span>
              <span className="font-mono font-black text-lg md:text-xl text-[var(--text-primary)] tracking-tight">
                {formatPriceIdr(expectedAmountIdr)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">REKENING TUJUAN</span>
              <span className="font-mono text-xs font-bold block text-[var(--text-primary)]">BCA 1301510191</span>
              <span className="text-[11px] text-[var(--text-muted)]">a.n LILY ALI</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">METODE / WAKTU</span>
              <span className="text-xs font-bold block text-[var(--text-primary)] uppercase">{paymentMethod}</span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {proofUploadedAt ? new Date(proofUploadedAt).toLocaleString("id-ID") : "Baru saja"}
              </span>
            </div>
          </div>

          {/* Proof Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[var(--text-muted)] uppercase">
                LAMPIRAN BUKTI TRANSFER DARI PELANGGAN:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="px-2.5 py-1 text-[11px] font-mono border border-[var(--border-hairline)] rounded-lg hover:bg-[var(--bg-card)] flex items-center gap-1 cursor-pointer"
                >
                  <ZoomIn className="w-3 h-3" />
                  <span>{isZoomed ? "Perkecil" : "Perbesar"}</span>
                </button>
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 text-[11px] font-mono border border-[var(--border-hairline)] rounded-lg hover:bg-[var(--bg-card)] flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Buka Tab Baru</span>
                </a>
              </div>
            </div>

            <div
              className={`relative bg-neutral-100 dark:bg-neutral-900 border border-[var(--border-hairline)] rounded-2xl overflow-hidden flex items-center justify-center p-2 min-h-[340px] transition-all duration-200 ${
                isZoomed ? "max-h-[700px]" : "max-h-[420px]"
              }`}
            >
              <img
                src={proofUrl}
                alt={`Bukti transfer ${orderNumber}`}
                className={`w-full object-contain rounded-xl max-h-full transition-transform ${
                  isZoomed ? "scale-125 cursor-zoom-out" : "cursor-zoom-in"
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
              />
            </div>
          </div>

          {/* Rejection Form Drawer */}
          {showRejectForm && (
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>PILIH ALASAN PENOLAKAN BUKTI TRANSFER:</span>
              </div>

              <div className="space-y-1.5">
                {REJECT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset);
                      setRejectionReason(preset);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs border transition-colors cursor-pointer ${
                      selectedPreset === preset
                        ? "bg-amber-100 dark:bg-amber-900/40 border-amber-400 font-bold text-amber-950 dark:text-amber-100"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-[var(--text-secondary)] hover:bg-neutral-50"
                    }`}
                  >
                    • {preset}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--text-muted)] block mb-1">
                  Atau tulis alasan khusus untuk pelanggan:
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Contoh: Nama pengirim tidak tertera, mohon kirimkan ulang struk resmi m-BCA..."
                  rows={2}
                  className="w-full text-xs p-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] focus:outline-hidden focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isRejecting}
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isRejecting ? "Memproses Penolakan..." : "KONFIRMASI TOLAK BUKTI"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 md:px-6 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-card)]">
          <div className="flex items-center gap-2">
            {!showRejectForm && (
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                className="px-4 py-2.5 border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>TOLAK BUKTI...</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-[var(--border-hairline)] rounded-xl text-xs font-bold hover:bg-[var(--bg-canvas)] cursor-pointer"
            >
              TUTUP
            </button>
            <button
              type="button"
              disabled={isApproving}
              onClick={handleApprove}
              className="editorial-btn px-6 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isApproving ? "MENYETUJUI..." : "SETUJUI (STATUS -> PAID)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
