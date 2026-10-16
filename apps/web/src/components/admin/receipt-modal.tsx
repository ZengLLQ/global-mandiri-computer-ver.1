"use client";

import { useState } from "react";
import { X, Printer, Check, Copy } from "lucide-react";
import { AdminOrder } from "@/stores/admin-store";

export type PaperSize = "a4" | "a5" | "thermal-80" | "thermal-58" | "shipping-label";

interface ReceiptModalProps {
  order: AdminOrder;
  onClose: () => void;
}

export function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  const [paperSize, setPaperSize] = useState<PaperSize>("a4");

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      {/* Dynamic Print CSS injected for specific paper size */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: ${paperSize === "thermal-58" ? "4mm" : paperSize === "thermal-80" ? "6mm" : "15mm"} !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: ${
              paperSize === "a4"
                ? "A4 portrait"
                : paperSize === "a5"
                ? "A5 landscape"
                : paperSize === "thermal-80"
                ? "80mm auto"
                : paperSize === "thermal-58"
                ? "58mm auto"
                : "100mm 150mm"
            };
            margin: 0;
          }
        }
      `}</style>

      <div className="bg-[var(--bg-canvas)] border border-[var(--border-hairline)] w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Toolbar */}
        <div className="p-4 md:px-6 border-b border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-card)]">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-xs">CETAK NOTA RESMI</span>
            <span className="text-xs text-[var(--text-muted)]">• NO. {order.orderNumber}</span>
          </div>

          {/* Paper Size Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[var(--bg-canvas)] p-1 border border-[var(--border-hairline)] rounded-xl">
            <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 font-bold">KERTAS:</span>
            {[
              { id: "a4", label: "A4 Formal" },
              { id: "a5", label: "A5 Nota" },
              { id: "thermal-80", label: "Thermal 80mm" },
              { id: "thermal-58", label: "Thermal 58mm" },
              { id: "shipping-label", label: "Label Resi" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPaperSize(p.id as PaperSize)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                  paperSize === p.id
                    ? "bg-[var(--text-primary)] text-white shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="editorial-btn py-2 px-5 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>CETAK (CTRL+P)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 border border-[var(--border-hairline)] rounded-xl hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-neutral-200/50 flex justify-center items-start">
          <div
            id="printable-receipt"
            className={`bg-white text-black font-sans shadow-xl transition-all duration-300 border border-neutral-300 ${
              paperSize === "a4"
                ? "w-[210mm] min-h-[297mm] p-10 text-xs"
                : paperSize === "a5"
                ? "w-[210mm] min-h-[148mm] p-8 text-xs"
                : paperSize === "thermal-80"
                ? "w-[80mm] min-h-[140mm] p-4 text-[11px] font-mono"
                : paperSize === "thermal-58"
                ? "w-[58mm] min-h-[120mm] p-2.5 text-[9px] font-mono"
                : "w-[100mm] min-h-[150mm] p-6 text-xs" // shipping-label
            }`}
          >
            {/* 1. THERMAL POS 80MM / 58MM TEMPLATE */}
            {(paperSize === "thermal-80" || paperSize === "thermal-58") && (
              <div className="space-y-3 leading-tight">
                {/* Store Header */}
                <div className="text-center space-y-1 pb-2 border-b border-dashed border-black">
                  <h1 className="font-black text-sm tracking-tight uppercase">GLOBAL MANDIRI COMPUTER</h1>
                  <p className="text-[10px]">ITC MEGA GROSIR LT. B5 NO. 7</p>
                  <p className="text-[9px]">JL. GEMBONG 20-30, SURABAYA</p>
                  <p className="text-[9px]">WA: 0811-3225-678</p>
                  <p className="text-[8px] tracking-widest mt-1">EST. 2008 • GARANSI RESMI</p>
                </div>

                {/* Metadata */}
                <div className="space-y-0.5 text-[10px] pb-2 border-b border-dashed border-black">
                  <div className="flex justify-between">
                    <span>NO. STRUK:</span>
                    <span className="font-bold">{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TANGGAL:</span>
                    <span>{formattedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PEMBELI:</span>
                    <span className="font-bold truncate max-w-[120px]">{order.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>KASIR:</span>
                    <span>ADMIN GMC</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2 py-1 border-b border-dashed border-black">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <p className="font-bold uppercase text-[10px]">{item.productName}</p>
                      {item.specs && <p className="text-[8px] text-neutral-600 truncate">{item.specs}</p>}
                      <div className="flex justify-between text-[10px]">
                        <span>{item.quantity} x Rp {item.priceIdr.toLocaleString("id-ID")}</span>
                        <span className="font-bold">Rp {(item.quantity * item.priceIdr).toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-1 text-[10px] pb-2 border-b border-dashed border-black">
                  <div className="flex justify-between font-bold text-xs pt-1">
                    <span>TOTAL:</span>
                    <span>Rp {order.totalAmountIdr.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span>METODE BAYAR:</span>
                    <span>TRANSFER BCA</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span>STATUS:</span>
                    <span className="font-bold uppercase">{order.status === "paid" ? "LUNAS (PAID)" : order.status}</span>
                  </div>
                </div>

                {/* Barcode Footer */}
                <div className="pt-2 text-center space-y-1.5">
                  <div className="flex justify-center items-end gap-[1.5px] h-6 mx-auto">
                    {[3, 1, 4, 1, 2, 4, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 4, 1, 3, 4, 2, 1, 3, 4].map((w, i) => (
                      <span key={i} className="bg-black inline-block h-full" style={{ width: `${w}px` }} />
                    ))}
                  </div>
                  <p className="font-mono text-[9px] tracking-widest">{order.orderNumber}</p>
                  <p className="text-[8px] pt-1">BARANG RESMI BERGARANSI</p>
                  <p className="text-[8px]">TERIMA KASIH ATAS KUNJUNGAN ANDA</p>
                </div>
              </div>
            )}

            {/* 2. A4 / A5 FORMAL INVOICE & NOTA TEMPLATE */}
            {(paperSize === "a4" || paperSize === "a5") && (
              <div className="space-y-6 flex flex-col justify-between h-full">
                {/* Header */}
                <div className="flex justify-between items-start pb-6 border-b-2 border-black">
                  <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight uppercase">GLOBAL MANDIRI COMPUTER</h1>
                    <p className="text-xs font-semibold text-neutral-800">PUSAT KOMPUTASI, LAPTOP &amp; PERIFERAL RESMI</p>
                    <p className="text-[11px] text-neutral-600 leading-relaxed">
                      ITC Mega Grosir Lantai B5 No. 7, Jl. Gembong No. 20–30, Kapasan, Surabaya 60141<br />
                      WhatsApp: +62 811-3225-678 • Email: blessingteknologi@gmail.com
                    </p>
                    <span className="inline-block text-[9px] font-mono uppercase bg-neutral-100 px-2 py-0.5 border border-neutral-300 font-bold mt-1">
                      EST. 2008 • SURABAYA, JAWA TIMUR
                    </span>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-xl font-black tracking-widest uppercase border border-black px-3 py-1 inline-block">
                      {paperSize === "a4" ? "FAKTUR PENJUALAN" : "NOTA TOKO"}
                    </span>
                    <p className="font-mono font-bold text-sm text-neutral-900 mt-2">NO: {order.orderNumber}</p>
                    <p className="text-xs text-neutral-600">Tgl: {formattedDate}</p>
                  </div>
                </div>

                {/* Customer & Shipping Details */}
                <div className="grid grid-cols-2 gap-8 text-xs bg-neutral-50 p-4 border border-neutral-200 rounded-lg">
                  <div>
                    <span className="font-bold text-[10px] text-neutral-500 uppercase tracking-wider block mb-1">
                      INFORMASI PELANGGAN
                    </span>
                    <p className="font-bold text-sm text-neutral-900">{order.fullName}</p>
                    <p className="font-mono text-neutral-700 mt-0.5">WA: {order.phone}</p>
                    {order.email && <p className="text-neutral-600">{order.email}</p>}
                  </div>

                  <div>
                    <span className="font-bold text-[10px] text-neutral-500 uppercase tracking-wider block mb-1">
                      TUJUAN &amp; METODE PENYERAHAN
                    </span>
                    <p className="font-semibold text-neutral-900">
                      {order.shippingMethod === "pickup" ? "AMBIL DI GERAI TOKO (ITC B5 NO. 7)" : "PENGIRIMAN EKSPEDISI / KURIR"}
                    </p>
                    <p className="text-neutral-700 leading-relaxed mt-0.5">{order.address}</p>
                    {order.notes && (
                      <p className="text-[11px] italic text-neutral-600 mt-1">
                        Catatan: "{order.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="flex-1">
                  <table className="w-full text-left border-collapse border border-neutral-300">
                    <thead>
                      <tr className="bg-neutral-100 text-[10px] font-black uppercase tracking-wider border-b border-neutral-300">
                        <th className="p-2.5 border-r border-neutral-300 w-10 text-center">NO</th>
                        <th className="p-2.5 border-r border-neutral-300">DESKRIPSI UNIT &amp; SPESIFIKASI</th>
                        <th className="p-2.5 border-r border-neutral-300 w-16 text-center">QTY</th>
                        <th className="p-2.5 border-r border-neutral-300 w-32 text-right">HARGA SATUAN</th>
                        <th className="p-2.5 w-32 text-right">SUBTOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 text-xs">
                      {order.items.map((item, idx) => (
                        <tr key={idx} className="align-top">
                          <td className="p-2.5 border-r border-neutral-300 text-center font-mono">{idx + 1}</td>
                          <td className="p-2.5 border-r border-neutral-300 space-y-1">
                            <p className="font-bold uppercase text-neutral-900">{item.productName}</p>
                            {item.specs && (
                              <p className="text-[10px] text-neutral-600 font-mono leading-tight">{item.specs}</p>
                            )}
                            {item.variantSku && (
                              <span className="text-[9px] font-mono text-neutral-500 bg-neutral-100 px-1 py-0.5 rounded border border-neutral-200">
                                SKU: {item.variantSku}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 border-r border-neutral-300 text-center font-bold">{item.quantity}</td>
                          <td className="p-2.5 border-r border-neutral-300 text-right font-mono">
                            Rp {item.priceIdr.toLocaleString("id-ID")}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            Rp {(item.quantity * item.priceIdr).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-black bg-neutral-50 font-bold">
                        <td colSpan={3} className="p-3 border-r border-neutral-300 text-right text-xs">
                          TOTAL PEMBAYARAN:
                        </td>
                        <td colSpan={2} className="p-3 text-right font-mono text-base text-neutral-950 font-black">
                          Rp {order.totalAmountIdr.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Payment Info & Signatures */}
                <div className="grid grid-cols-12 gap-6 pt-4 border-t border-neutral-300 items-end">
                  <div className="col-span-7 space-y-2 text-[11px] text-neutral-700">
                    <p className="font-bold uppercase text-xs text-neutral-900">REKENING PEMBAYARAN RESMI:</p>
                    <div className="p-3 border border-neutral-300 bg-neutral-50 rounded space-y-0.5">
                      <p className="font-bold">BANK CENTRAL ASIA (BCA)</p>
                      <p className="font-mono text-xs font-black">No. Rek: 1301510191</p>
                      <p>Atas Nama: LILY ALI</p>
                    </div>
                    <p className="text-[10px] text-neutral-500 italic">
                      * Garansi resmi berlaku sesuai ketentuan distributor Indonesia. Harap simpan faktur ini untuk klaim garansi dan servis.
                    </p>
                  </div>

                  <div className="col-span-5 grid grid-cols-2 gap-4 text-center text-xs">
                    <div className="space-y-12">
                      <p className="font-bold text-[10px] text-neutral-500 uppercase">TANDA TERIMA</p>
                      <div className="border-b border-black w-3/4 mx-auto" />
                      <p className="text-[10px] text-neutral-600">( {order.fullName} )</p>
                    </div>

                    <div className="space-y-12">
                      <p className="font-bold text-[10px] text-neutral-500 uppercase">HORMAT KAMI</p>
                      <div className="border-b border-black w-3/4 mx-auto" />
                      <p className="text-[10px] font-bold text-neutral-900">GLOBAL MANDIRI COMPUTER</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. SHIPPING LABEL (100X150MM) TEMPLATE */}
            {paperSize === "shipping-label" && (
              <div className="space-y-4 border-2 border-black p-4 h-full flex flex-col justify-between">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-3">
                  <div>
                    <h1 className="font-black text-sm uppercase">GLOBAL MANDIRI COMPUTER</h1>
                    <p className="text-[10px]">ITC MEGA GROSIR SURABAYA</p>
                    <p className="text-[9px]">WA: 0811-3225-678</p>
                  </div>
                  <div className="text-right">
                    <span className="border-2 border-black px-2 py-0.5 font-black text-xs uppercase block">
                      LABEL PENGIRIMAN
                    </span>
                    <span className="font-mono font-bold text-[10px] block mt-1">{order.orderNumber}</span>
                  </div>
                </div>

                {/* Recipient Box */}
                <div className="border-2 border-black p-3 space-y-1 bg-neutral-50">
                  <span className="text-[9px] font-black uppercase tracking-wider text-neutral-600 block">
                    PENERIMA:
                  </span>
                  <p className="font-black text-sm text-neutral-900 uppercase">{order.fullName}</p>
                  <p className="font-mono font-bold text-xs">{order.phone}</p>
                  <p className="text-[11px] leading-snug pt-1 border-t border-neutral-300 font-medium">
                    {order.address}
                  </p>
                </div>

                {/* Package Highlights */}
                <div className="border border-black p-2.5 space-y-1 text-[10px]">
                  <span className="font-bold text-[9px] text-neutral-600 uppercase block">ISI PAKET:</span>
                  {order.items.map((item, idx) => (
                    <p key={idx} className="font-bold truncate">
                      • {item.quantity}x {item.productName}
                    </p>
                  ))}
                  {order.notes && <p className="italic text-[9px] text-neutral-700">Instruksi: {order.notes}</p>}
                </div>

                {/* Badges */}
                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-black">
                  <div className="border border-black p-1.5 bg-neutral-100 uppercase">
                    🛡️ PACKING KAYU AMAN
                  </div>
                  <div className="border border-black p-1.5 bg-neutral-100 uppercase">
                    ✨ ASURANSI ELEKTRONIK
                  </div>
                </div>

                {/* Barcode Footer */}
                <div className="text-center pt-2 border-t border-black">
                  <div className="flex justify-center items-end gap-[1.5px] h-8 mx-auto">
                    {[3, 1, 4, 1, 2, 4, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 4, 1, 3, 4, 2, 1, 3, 4].map((w, i) => (
                      <span key={i} className="bg-black inline-block h-full" style={{ width: `${w}px` }} />
                    ))}
                  </div>
                  <p className="font-mono font-bold text-xs tracking-widest mt-1">{order.orderNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
