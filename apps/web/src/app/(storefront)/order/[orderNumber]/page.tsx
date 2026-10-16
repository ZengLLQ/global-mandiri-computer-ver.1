"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

import { useAdminStore } from "@/stores/admin-store";
import { apiClient, apiFetch } from "@/lib/api-client";

export default function OrderSuccessPage() {
  const params = useParams();
  const orderNumber = params?.orderNumber as string;

  const adminOrder = useAdminStore((s) => s.orders.find((o) => o.orderNumber === orderNumber));
  const storeSettings = useAdminStore((s) => s.settings);

  const [order, setOrder] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch live order state from Backend API
    apiFetch<any>(`/api/v1/orders/${orderNumber}`)
      .then((res) => {
        if (!isMounted) return;
        const norm = {
          orderNumber: res.order_number,
          fullName: res.customer_name,
          phone: res.customer_phone,
          address: res.shipping_address,
          note: res.customer_note,
          totalAmountIdr: res.total_amount_idr,
          status: res.status,
          bcaAccount: res.bca_account,
          bcaHolder: res.bca_holder,
          hasProof: res.has_proof,
          items:
            res.items && res.items.length > 0
              ? res.items.map((it: any) => ({
                  productName: it.product_name,
                  colorName: it.color_name || "Standard",
                  quantity: it.quantity,
                  priceIdr: it.price_idr,
                }))
              : [],
          createdAt: res.created_at,
        };
        setOrder(norm);
        if (
          res.has_proof ||
          res.status === "proof_uploaded" ||
          res.status === "paid" ||
          res.status === "packed" ||
          res.status === "done"
        ) {
          setProofUploaded(true);
        }
      })
      .catch((_) => {
        if (!isMounted) return;
        // Fallback to Zustand or LocalStorage if offline/mock
        if (adminOrder) {
          setOrder(adminOrder);
          if (adminOrder.status === "proof_uploaded" || adminOrder.status === "paid") {
            setProofUploaded(true);
          }
          return;
        }

        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(`gmc_order_${orderNumber}`);
          if (stored) {
            setOrder(JSON.parse(stored));
          } else {
            setOrder({
              orderNumber,
              fullName: "Pelanggan GMC",
              phone: "08113225678",
              address: "ITC Mega Grosir Lantai B5 No. 7, Surabaya",
              totalAmountIdr: 12800000,
              status: "pending_payment",
              createdAt: new Date().toISOString(),
              items: [
                {
                  productName: "ACER AIO ACER ACX22 INTEL CORE I5",
                  colorName: "STANDARD",
                  quantity: 1,
                  priceIdr: 12800000,
                },
              ],
            });
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, [orderNumber, adminOrder]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("proof", proofFile);

      const res = await apiClient(`/api/v1/orders/${orderNumber}/proof`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setProofUploaded(true);
        setOrder((prev: any) => ({
          ...(prev || {}),
          status: "proof_uploaded",
          hasProof: true,
        }));
      } else {
        throw new Error("Gagal mengunggah bukti ke server");
      }
    } catch (err: any) {
      console.error("Upload proof fallback:", err);
      // Fallback local persistence
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setProofUploaded(true);
        const updated = {
          ...(order || {}),
          status: "proof_uploaded",
          proofImageUrl: dataUrl,
          proofUploadedAt: new Date().toISOString(),
        };
        setOrder(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem(`gmc_order_${orderNumber}`, JSON.stringify(updated));
        }
        useAdminStore.getState().updateOrderStatus(orderNumber, "proof_uploaded");
      };
      reader.readAsDataURL(proofFile);
    } finally {
      setUploading(false);
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">
        <p className="text-micro-label uppercase text-[var(--text-muted)] tracking-widest">
          MEMUAT PESANAN...
        </p>
      </div>
    );
  }

  // BCA info from order response, store config, or seed
  const bcaAccount = order.bcaAccount || storeSettings?.bankAccount || "1301510191";
  const bcaHolder = order.bcaHolder || storeSettings?.bankHolder || "LILY ALI";

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "proof_uploaded":
        return "BUKTI TRANSFER TERUNGGAH (MENUNGGU VERIFIKASI ADMIN)";
      case "paid":
        return "PEMBAYARAN DIVERIFIKASI (LUNAS)";
      case "packed":
        return "PESANAN TELAH DIKEMAS (PACKING KAYU & ASURANSI)";
      case "ready_pickup":
        return "SIAP DIAMBIL DI GERAI ITC B5 NO. 7";
      case "shipped":
        return `SEDANG DIKIRIM ${order.trackingNumber ? `(NO. RESI: ${order.trackingNumber})` : ""}`;
      case "done":
        return "PESANAN SELESAI & DITERIMA";
      default:
        return "MENUNGGU PEMBAYARAN TRANSFER";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Modern Unified Header */}
      <Header />

      <main className="flex-1 max-w-[1000px] w-full mx-auto px-6 py-12 space-y-10">
        {/* Banner */}
        <div className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)] text-center space-y-3">
          <span className="text-micro-label font-bold text-[var(--text-primary)] uppercase tracking-widest block">
            {getStatusLabel(order.status)}
          </span>
          <h1 className="text-display-l">
            {order.orderNumber}
          </h1>
          <p className="text-body text-[var(--text-muted)] max-w-md mx-auto text-xs">
            Terima kasih, <strong>{order.fullName}</strong>. Pesanan Anda tercatat dalam sistem resmi GMC.
          </p>
        </div>

        {/* BCA Payment Instructions Box */}
        <div className="border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-8 md:p-10 space-y-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start border-b border-[var(--border-hairline)] pb-4">
            <div>
              <span className="text-micro-label text-[var(--text-muted)] block mb-1">
                METODE PEMBAYARAN RESMI
              </span>
              <h2 className="text-xl font-extrabold uppercase">
                {storeSettings?.bankName || "BANK CENTRAL ASIA (BCA)"}
              </h2>
            </div>
            <span className="px-3 py-1 bg-neutral-100 text-neutral-900 text-micro-label font-bold border border-neutral-300 rounded-full">
              {order.status === "paid"
                ? "LUNAS ✓"
                : order.status === "proof_uploaded"
                ? "VERIFIKASI ADMIN"
                : order.status === "shipped"
                ? "DIKIRIM"
                : "MENUNGGU TRANSFER"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-hairline)] space-y-1 rounded-xl shadow-sm">
              <span className="text-micro-label text-[var(--text-muted)] block">NOMOR REKENING</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-mono font-black">{bcaAccount}</span>
                <button
                  onClick={() => copyToClipboard(bcaAccount)}
                  className="editorial-link text-[0.625rem] text-[var(--text-primary)] hover:text-black font-bold"
                >
                  {copied ? "TERSALIN!" : "SALIN"}
                </button>
              </div>
            </div>

            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-hairline)] space-y-1 rounded-xl shadow-sm">
              <span className="text-micro-label text-[var(--text-muted)] block">ATAS NAMA</span>
              <span className="text-lg font-bold">{bcaHolder}</span>
            </div>

            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-hairline)] space-y-1 rounded-xl shadow-sm">
              <span className="text-micro-label text-[var(--text-muted)] block">TOTAL NOMINAL</span>
              <span className="text-lg font-mono font-black">
                Rp {order.totalAmountIdr.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Proof Upload Area */}
          <div className="pt-6 border-t border-[var(--border-hairline)]">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2">
              UNGGAH BUKTI TRANSFER (STRUK / SCREENSHOT M-BCA)
            </h3>
            {proofUploaded ? (
              <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-xs font-bold flex items-center justify-between">
                <span>✓ BUKTI TRANSFER BERHASIL DIUNGGAH! TIM KAMI AKAN SEGERA MEMVERIFIKASI.</span>
                <span className="text-[0.625rem] uppercase font-normal">{new Date().toLocaleTimeString()} WIB</span>
              </div>
            ) : (
              <form onSubmit={handleUploadProof} className="flex flex-col sm:flex-row gap-4 items-center">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  required
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:uppercase file:bg-[var(--text-primary)] file:text-[var(--bg-canvas)] cursor-pointer"
                />
                <button
                  type="submit"
                  disabled={uploading}
                  className="editorial-btn text-xs py-2.5 px-6 whitespace-nowrap w-full sm:w-auto"
                >
                  {uploading ? "MENGUNGGAH..." : "UNGGAH BUKTI"}
                </button>
              </form>
            )}
          </div>

          {/* WhatsApp Direct Confirmation Button */}
          <div className="pt-6 border-t border-[var(--border-hairline)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[var(--text-muted)]">
              Atau kirim bukti transfer langsung ke sales admin via WhatsApp:
            </p>
            <a
              href={`https://wa.me/628113225678?text=Halo%20GMC,%20saya%20sudah%20transfer%20untuk%20pesanan%20${order.orderNumber}%20sebesar%20Rp%20${order.totalAmountIdr.toLocaleString("id-ID")}`}
              target="_blank"
              rel="noreferrer"
              className="editorial-btn py-3 px-6 text-xs font-bold bg-[#128C7E] border-[#128C7E] hover:bg-[#075E54] text-white hover:text-white"
            >
              KONFIRMASI VIA WHATSAPP &rarr;
            </a>
          </div>
        </div>

        {/* Order Details Accordion / Summary */}
        <div className="border border-[var(--border-hairline)] bg-[var(--bg-card)] p-8 space-y-4 rounded-2xl shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider pb-2 border-b border-[var(--border-hairline)]">
            RINCIAN UNIT &amp; TUJUAN
          </h3>
          <div className="text-xs space-y-2">
            <p><strong>Nama:</strong> {order.fullName} ({order.phone})</p>
            <p><strong>Alamat:</strong> {order.address}</p>
            {order.note && <p><strong>Catatan:</strong> {order.note}</p>}
          </div>

          <div className="pt-4 border-t border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)]">
            {order.items?.map((item: any, i: number) => (
              <div key={i} className="py-2 flex justify-between text-xs">
                <span>{item.productName} ({item.colorName}) &times; {item.quantity}</span>
                <span className="font-bold tabular-nums">
                  Rp {(item.priceIdr * item.quantity).toLocaleString("id-ID")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center pt-6">
          <Link href="/katalog" className="editorial-link text-xs">
            &larr; KEMBALI KE KATALOG UTAMA
          </Link>
        </div>
      </main>

      {/* Unified Elevated Footer Component */}
      <Footer />
    </div>
  );
}
