"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Lock,
  Unlock,
  ShieldCheck,
  Save,
  MessageCircle,
  Clock,
  Building,
  CreditCard,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface AdminSettingsData {
  store_name: string;
  store_address: string;
  store_phone: string;
  whatsapp_number: string;
  opening_hours: string;
  auto_cancel_hours: number;
  bca_bank_name: string;
  bca_account_number_masked: string;
  bca_account_holder_masked: string;
  bca_branch: string;
  is_bca_revealed: boolean;
  wa_template_reminder: string;
  wa_template_paid: string;
  wa_template_packed: string;
  wa_template_pickup: string;
  wa_template_shipped: string;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [autoCancelHours, setAutoCancelHours] = useState(24);

  // Sensitive Bank State
  const [bcaBankName, setBcaBankName] = useState("");
  const [bcaAccountNumber, setBcaAccountNumber] = useState("");
  const [bcaAccountHolder, setBcaAccountHolder] = useState("");
  const [bcaBranch, setBcaBranch] = useState("");
  const [isBcaRevealed, setIsBcaRevealed] = useState(false);

  // Password Unlock Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // WA Templates State
  const [waReminder, setWaReminder] = useState("");
  const [waPaid, setWaPaid] = useState("");
  const [waPacked, setWaPacked] = useState("");
  const [waPickup, setWaPickup] = useState("");
  const [waShipped, setWaShipped] = useState("");

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchSettings = async (revealSensitive = false) => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (revealSensitive) {
        headers["x-reveal-sensitive"] = "true";
      }

      const res = await apiClient("/api/v1/admin/settings", { headers });
      if (res.ok) {
        const data: AdminSettingsData = await res.json();
        setStoreName(data.store_name);
        setStoreAddress(data.store_address);
        setStorePhone(data.store_phone);
        setWhatsappNumber(data.whatsapp_number);
        setOpeningHours(data.opening_hours);
        setAutoCancelHours(data.auto_cancel_hours);
        setBcaBankName(data.bca_bank_name);
        setBcaAccountNumber(data.bca_account_number_masked);
        setBcaAccountHolder(data.bca_account_holder_masked);
        setBcaBranch(data.bca_branch);
        setIsBcaRevealed(data.is_bca_revealed);
        setWaReminder(data.wa_template_reminder);
        setWaPaid(data.wa_template_paid);
        setWaPacked(data.wa_template_packed);
        setWaPickup(data.wa_template_pickup);
        setWaShipped(data.wa_template_shipped);
      } else {
        showToast("error", "Gagal memuat pengaturan toko");
      }
    } catch {
      showToast("error", "Kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Handle Verify Password to Reveal Bank
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword.trim()) return;

    setIsVerifyingPassword(true);
    try {
      const res = await apiClient("/api/v1/admin/settings/verify-password", {
        method: "POST",
        body: JSON.stringify({ password: unlockPassword.trim() }),
      });
      if (res.ok) {
        setShowPasswordModal(false);
        setUnlockPassword("");
        showToast("success", "Akses rekening bank berhasil dibuka");
        fetchSettings(true);
      } else {
        showToast("error", "Kata sandi salah. Akses ditolak.");
      }
    } catch {
      showToast("error", "Kesalahan koneksi");
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload: Record<string, any> = {
        store_name: storeName.trim(),
        store_address: storeAddress.trim(),
        store_phone: storePhone.trim(),
        whatsapp_number: whatsappNumber.trim(),
        opening_hours: openingHours.trim(),
        auto_cancel_hours: Number(autoCancelHours),
        bca_bank_name: bcaBankName.trim(),
        bca_branch: bcaBranch.trim(),
        wa_template_reminder: waReminder.trim(),
        wa_template_paid: waPaid.trim(),
        wa_template_packed: waPacked.trim(),
        wa_template_pickup: waPickup.trim(),
        wa_template_shipped: waShipped.trim(),
      };

      if (isBcaRevealed && !bcaAccountNumber.includes("*")) {
        payload.bca_account_number = bcaAccountNumber.trim();
        payload.bca_account_holder = bcaAccountHolder.trim();
      }

      const res = await apiClient("/api/v1/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("success", "Pengaturan toko berhasil disimpan");
        fetchSettings(isBcaRevealed);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast("error", err.message || "Gagal menyimpan pengaturan");
      }
    } catch {
      showToast("error", "Kesalahan koneksi saat menyimpan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 border font-mono text-xs flex items-center gap-2 shadow-lg ${
            notification.type === "success"
              ? "bg-emerald-950 text-emerald-100 border-emerald-800"
              : "bg-red-950 text-red-100 border-red-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase font-mono flex items-center gap-2">
            <Settings className="w-5 h-5" /> Pengaturan Toko & Keamanan
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            Identitas operasional, rekening bank BCA terenkripsi, batas kadaluarsa pesanan, dan template WhatsApp
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSaving || loading}
          className="px-5 py-2 bg-black text-white font-mono text-xs uppercase font-bold hover:bg-neutral-800 disabled:opacity-40 flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <Save className="w-4 h-4" /> {isSaving ? "Menyimpan..." : "Simpan Semua Pengaturan"}
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center font-mono text-xs text-[var(--text-muted)] space-y-2">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-black" />
          <p>Memuat konfigurasi toko...</p>
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="space-y-6 font-mono text-xs">
          {/* Section 1: Store Identity */}
          <div className="bg-white border border-[var(--border-hairline)] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border-hairline)] pb-3">
              <Building className="w-4 h-4 text-neutral-600" />
              <h2 className="font-bold text-xs uppercase text-[var(--text-primary)]">
                Identitas Toko & Kontak Publik
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Nama Resmi Toko *
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Nomor WhatsApp Toko (Format: 628...) *
                </label>
                <input
                  type="text"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Alamat Lengkap Toko (Surabaya) *
                </label>
                <input
                  type="text"
                  required
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Telepon Toko
                </label>
                <input
                  type="text"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Jam Operasional
                </label>
                <input
                  type="text"
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: BCA Bank Account & Sensitive Access */}
          <div className="bg-white border border-[var(--border-hairline)] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-sky-700" />
                <h2 className="font-bold text-xs uppercase text-[var(--text-primary)]">
                  Rekening Bank Pembayaran BCA (Sensitif & Terenkripsi)
                </h2>
              </div>

              {!isBcaRevealed ? (
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="px-3 py-1.5 border border-sky-300 bg-sky-50 text-sky-900 text-[11px] uppercase font-bold hover:bg-sky-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-sky-700" /> Buka Akses Rekening
                </button>
              ) : (
                <span className="text-[11px] text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Akses Terbuka
                </span>
              )}
            </div>

            <p className="text-[11px] text-[var(--text-muted)]">
              Nomor rekening dan nama pemilik bank disamarkan (masked) secara default demi keamanan finansial toko.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Bank Penerima
                </label>
                <input
                  type="text"
                  value={bcaBankName}
                  onChange={(e) => setBcaBankName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Kantor Cabang
                </label>
                <input
                  type="text"
                  value={bcaBranch}
                  onChange={(e) => setBcaBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Nomor Rekening BCA *
                </label>
                <input
                  type="text"
                  readOnly={!isBcaRevealed}
                  value={bcaAccountNumber}
                  onChange={(e) => setBcaAccountNumber(e.target.value)}
                  className={`w-full px-3 py-2 border text-xs font-mono tnum font-bold ${
                    isBcaRevealed
                      ? "border-emerald-400 bg-white text-emerald-950 focus:border-black"
                      : "border-[var(--border-hairline)] bg-neutral-100 text-neutral-600 cursor-not-allowed"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Nama Pemilik Rekening *
                </label>
                <input
                  type="text"
                  readOnly={!isBcaRevealed}
                  value={bcaAccountHolder}
                  onChange={(e) => setBcaAccountHolder(e.target.value)}
                  className={`w-full px-3 py-2 border text-xs font-mono font-bold ${
                    isBcaRevealed
                      ? "border-emerald-400 bg-white text-emerald-950 focus:border-black"
                      : "border-[var(--border-hairline)] bg-neutral-100 text-neutral-600 cursor-not-allowed"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Auto-Expiry */}
          <div className="bg-white border border-[var(--border-hairline)] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border-hairline)] pb-3">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="font-bold text-xs uppercase text-[var(--text-primary)]">
                Batas Waktu Pembayaran & Kadaluarsa Pesanan
              </h2>
            </div>

            <div className="max-w-md space-y-2">
              <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                Batas Waktu Pembayaran (Jam) *
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={autoCancelHours}
                  onChange={(e) => setAutoCancelHours(Number(e.target.value))}
                  className="w-32 px-3 py-2 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono tnum"
                />
                <span className="text-[11px] text-[var(--text-muted)]">
                  Pesanan otomatis dibatalkan jika bukti transfer tidak diunggah setelah {autoCancelHours} jam
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: WhatsApp Templates */}
          <div className="bg-white border border-[var(--border-hairline)] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border-hairline)] pb-3">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-xs uppercase text-[var(--text-primary)]">
                Template Pesan WhatsApp Otomatis (5 Alur Komunikasi)
              </h2>
            </div>

            <p className="text-[11px] text-[var(--text-muted)]">
              Gunakan placeholder otomatis: <code>{`{nama}`}</code>, <code>{`{no_order}`}</code>, <code>{`{total}`}</code>, <code>{`{rekening}`}</code>, <code>{`{catatan}`}</code>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  1. Template Pengingat Pembayaran (Belum Bayar)
                </label>
                <textarea
                  rows={2}
                  value={waReminder}
                  onChange={(e) => setWaReminder(e.target.value)}
                  className="w-full p-2.5 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  2. Template Pembayaran Diterima & Terverifikasi
                </label>
                <textarea
                  rows={2}
                  value={waPaid}
                  onChange={(e) => setWaPaid(e.target.value)}
                  className="w-full p-2.5 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  3. Template Pesanan Selesai Dipacking (Gudang)
                </label>
                <textarea
                  rows={2}
                  value={waPacked}
                  onChange={(e) => setWaPacked(e.target.value)}
                  className="w-full p-2.5 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  4. Template Siap Diambil di Toko (Walk-in / ITC Surabaya)
                </label>
                <textarea
                  rows={2}
                  value={waPickup}
                  onChange={(e) => setWaPickup(e.target.value)}
                  className="w-full p-2.5 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  5. Template Dikirimkan via Kurir (Beserta Catatan Pengiriman)
                </label>
                <textarea
                  rows={2}
                  value={waShipped}
                  onChange={(e) => setWaShipped(e.target.value)}
                  className="w-full p-2.5 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono resize-none"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Password Re-Entry Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--border-hairline)] max-w-md w-full shadow-2xl p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <span className="font-bold uppercase flex items-center gap-2">
                <Lock className="w-4 h-4 text-sky-700" /> Konfirmasi Kata Sandi Owner
              </span>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-[var(--text-muted)] hover:text-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[var(--text-muted)] leading-relaxed">
              Untuk melihat atau mengedit nomor rekening resmi BCA, masukkan kembali kata sandi akun Owner Anda:
            </p>

            <form onSubmit={handleVerifyPassword} className="space-y-3">
              <input
                type="password"
                required
                autoFocus
                placeholder="Masukkan kata sandi..."
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                className="w-full px-3 py-2 border border-black outline-none font-mono text-xs"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3 py-1.5 border uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPassword}
                  className="px-4 py-1.5 bg-black text-white uppercase font-bold hover:bg-neutral-800 cursor-pointer"
                >
                  {isVerifyingPassword ? "Memverifikasi..." : "Buka Kunci"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
