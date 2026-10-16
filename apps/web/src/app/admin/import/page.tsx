"use client";

import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Upload,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Layers,
  History,
  Eye,
  FileCheck,
  Package,
} from "lucide-react";
import { formatPriceIdr } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface DiffNewItem {
  sku: string;
  name: string;
  brand: string;
  category: string;
  price_idr: number;
  is_new: boolean;
}

interface DiffPriceChangeItem {
  sku: string;
  product_name: string;
  old_price_idr: number;
  new_price_idr: number;
  diff_idr: number;
}

interface DiffVanishedItem {
  sku: string;
  name: string;
  current_price_idr: number;
  stock_status: string;
}

interface ImportPreviewData {
  import_run_id: string;
  filename: string;
  total_rows: number;
  new_products_count: number;
  price_changes_count: number;
  vanished_products_count: number;
  new_products: DiffNewItem[];
  price_changes: DiffPriceChangeItem[];
  vanished_products: DiffVanishedItem[];
}

interface ImportRunHistory {
  id: string;
  filename: string;
  total_rows: number;
  imported_count: number;
  updated_count: number;
  created_at: string;
}

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "prices" | "vanished">("prices");

  // Conflict resolution options
  const [applyNew, setApplyNew] = useState(true);
  const [applyPriceChanges, setApplyPriceChanges] = useState(true);
  const [hideVanished, setHideVanished] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Past Import Runs History
  const [history, setHistory] = useState<ImportRunHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await apiClient("/api/v1/admin/import/history");
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Handle Upload and Preview
  const handlePreview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPreviewing(true);

    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      }

      const res = await apiClient("/api/v1/admin/import/preview", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
        if (data.price_changes_count > 0) setActiveTab("prices");
        else if (data.new_products_count > 0) setActiveTab("new");
        else setActiveTab("vanished");
        showToast("success", `File berhasil di-parse: ${data.total_rows} baris katalog terbaca.`);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast("error", err.message || "Gagal memproses file Excel");
      }
    } catch {
      showToast("error", "Kesalahan koneksi saat parsing");
    } finally {
      setIsPreviewing(false);
    }
  };

  // Handle Apply Import
  const handleApply = async () => {
    if (!previewData) return;
    if (!confirm("Terapkan hasil impor ke database katalog aktif? Tindakan ini akan memperbarui harga dan mencatat riwayat harga.")) {
      return;
    }

    setIsApplying(true);
    try {
      const res = await apiClient("/api/v1/admin/import/apply", {
        method: "POST",
        body: JSON.stringify({
          filename: previewData.filename,
          apply_new: applyNew,
          apply_price_changes: applyPriceChanges,
          hide_vanished: hideVanished,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        showToast("success", result.message || "Impor katalog berhasil diterapkan!");
        setPreviewData(null);
        setFile(null);
        loadHistory();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast("error", err.message || "Gagal menerapkan impor");
      }
    } catch {
      showToast("error", "Kesalahan koneksi");
    } finally {
      setIsApplying(false);
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
            <FileSpreadsheet className="w-5 h-5" /> Import & Sinkronisasi Katalog Excel
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            Parser multi-sheet engine berbasis Calamine • Perbandingan selisih harga (diff) sebelum penulisan database
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      {!previewData && (
        <div className="bg-white border border-[var(--border-hairline)] p-6 space-y-4">
          <div className="border-2 border-dashed border-[var(--border-hairline)] hover:border-black p-8 text-center space-y-3 transition-colors">
            <Upload className="w-8 h-8 mx-auto text-neutral-400" />
            <div className="space-y-1">
              <p className="font-mono text-xs font-bold uppercase text-[var(--text-primary)]">
                Pilih atau Tarik File Excel Pricelist Toko (.xls / .xlsx)
              </p>
              <p className="font-mono text-[11px] text-[var(--text-muted)]">
                Mendukung sheet ASUS, ACER, LENOVO, HP, APPLE, MSI, dsb. dengan header standar GMC
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <input
                type="file"
                id="catalog-upload"
                accept=".xls,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label
                htmlFor="catalog-upload"
                className="px-4 py-2 bg-white border border-black font-mono text-xs uppercase font-bold hover:bg-neutral-50 cursor-pointer"
              >
                {file ? file.name : "Pilih File Excel"}
              </label>

              <button
                onClick={() => handlePreview()}
                disabled={isPreviewing}
                className="px-5 py-2 bg-black text-white font-mono text-xs uppercase font-bold hover:bg-neutral-800 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPreviewing ? "animate-spin" : ""}`} />
                {isPreviewing ? "Menganalisis File..." : "Preview Diff Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diff Inspector & Action Panel */}
      {previewData && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-[var(--border-hairline)] p-4">
              <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] font-bold block">
                Total Baris Terbaca
              </span>
              <span className="text-2xl font-bold font-mono tnum text-neutral-900 mt-1 block">
                {previewData.total_rows}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">File: {previewData.filename}</span>
            </div>

            <button
              onClick={() => setActiveTab("prices")}
              className={`p-4 border text-left transition-colors cursor-pointer ${
                activeTab === "prices"
                  ? "border-black bg-white ring-1 ring-black"
                  : "border-[var(--border-hairline)] bg-white/70 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] font-bold">
                  Perubahan Harga
                </span>
                <TrendingUp className="w-4 h-4 text-sky-600" />
              </div>
              <span className="text-2xl font-bold font-mono tnum text-sky-800 mt-1 block">
                {previewData.price_changes_count}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">SKU yang mengalami selisih</span>
            </button>

            <button
              onClick={() => setActiveTab("new")}
              className={`p-4 border text-left transition-colors cursor-pointer ${
                activeTab === "new"
                  ? "border-black bg-white ring-1 ring-black"
                  : "border-[var(--border-hairline)] bg-white/70 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] font-bold">
                  Produk Baru
                </span>
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-bold font-mono tnum text-emerald-800 mt-1 block">
                {previewData.new_products_count}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">Belum ada di katalog GMC</span>
            </button>

            <button
              onClick={() => setActiveTab("vanished")}
              className={`p-4 border text-left transition-colors cursor-pointer ${
                activeTab === "vanished"
                  ? "border-black bg-white ring-1 ring-black"
                  : "border-[var(--border-hairline)] bg-white/70 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] font-bold">
                  Tidak Ditemukan
                </span>
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-2xl font-bold font-mono tnum text-amber-800 mt-1 block">
                {previewData.vanished_products_count}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">Hilang dari file pricelist</span>
            </button>
          </div>

          {/* Action & Options Bar */}
          <div className="bg-neutral-900 text-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs shadow-lg">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyPriceChanges}
                  onChange={(e) => setApplyPriceChanges(e.target.checked)}
                  className="rounded accent-white"
                />
                <span>Perbarui Harga ({previewData.price_changes_count})</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyNew}
                  onChange={(e) => setApplyNew(e.target.checked)}
                  className="rounded accent-white"
                />
                <span>Buat Produk Baru ({previewData.new_products_count})</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideVanished}
                  onChange={(e) => setHideVanished(e.target.checked)}
                  className="rounded accent-white"
                />
                <span>Set Stok Habis Produk Hilang ({previewData.vanished_products_count})</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewData(null)}
                className="px-3 py-1.5 border border-neutral-600 text-neutral-300 hover:text-white uppercase cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleApply}
                disabled={isApplying}
                className="px-5 py-1.5 bg-white text-black font-bold uppercase hover:bg-neutral-200 cursor-pointer flex items-center gap-1.5"
              >
                {isApplying ? "Menerapkan Impor..." : "Terapkan Ke Database"}
              </button>
            </div>
          </div>

          {/* Diff Table Views */}
          <div className="bg-white border border-[var(--border-hairline)]">
            {activeTab === "prices" ? (
              <div>
                <div className="p-3 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono text-xs uppercase font-bold text-sky-900">
                  Daftar Perubahan Harga ({previewData.price_changes.length})
                </div>
                {previewData.price_changes.length === 0 ? (
                  <div className="p-8 text-center font-mono text-xs text-[var(--text-muted)]">
                    Tidak ada perubahan harga terdeteksi.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-hairline)] font-mono text-[10px] uppercase font-bold text-[var(--text-muted)] bg-[var(--bg-canvas)]">
                        <th className="p-3">SKU & Produk</th>
                        <th className="p-3 text-right">Harga Lama</th>
                        <th className="p-3 text-right">Harga Baru (File)</th>
                        <th className="p-3 text-right">Selisih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-hairline)] font-mono">
                      {previewData.price_changes.map((item) => (
                        <tr key={item.sku} className="hover:bg-neutral-50/60">
                          <td className="p-3">
                            <span className="font-bold text-[var(--text-primary)] block">{item.product_name}</span>
                            <span className="text-[11px] text-[var(--text-muted)]">SKU: {item.sku}</span>
                          </td>
                          <td className="p-3 text-right tnum text-[var(--text-muted)] line-through">
                            {formatPriceIdr(item.old_price_idr)}
                          </td>
                          <td className="p-3 text-right tnum font-bold text-black">
                            {formatPriceIdr(item.new_price_idr)}
                          </td>
                          <td className="p-3 text-right tnum">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold border ${
                                item.diff_idr > 0
                                  ? "bg-amber-50 text-amber-900 border-amber-300"
                                  : "bg-emerald-50 text-emerald-900 border-emerald-300"
                              }`}
                            >
                              {item.diff_idr > 0 ? `+${formatPriceIdr(item.diff_idr)}` : formatPriceIdr(item.diff_idr)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : activeTab === "new" ? (
              <div>
                <div className="p-3 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono text-xs uppercase font-bold text-emerald-900">
                  Daftar Produk Baru ({previewData.new_products.length})
                </div>
                {previewData.new_products.length === 0 ? (
                  <div className="p-8 text-center font-mono text-xs text-[var(--text-muted)]">
                    Tidak ada produk baru terdeteksi.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-hairline)] font-mono text-[10px] uppercase font-bold text-[var(--text-muted)] bg-[var(--bg-canvas)]">
                        <th className="p-3">Nama Model</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Brand & Kategori</th>
                        <th className="p-3 text-right">Harga Patokan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-hairline)] font-mono">
                      {previewData.new_products.map((item) => (
                        <tr key={item.sku} className="hover:bg-neutral-50/60">
                          <td className="p-3 font-bold text-[var(--text-primary)]">
                            {item.name}
                            {item.is_new && (
                              <span className="ml-2 px-1 py-0.2 bg-amber-100 text-amber-900 text-[9px] border border-amber-300 font-bold">
                                NEW
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-[var(--text-muted)]">{item.sku}</td>
                          <td className="p-3 text-[var(--text-muted)]">
                            {item.brand} • {item.category}
                          </td>
                          <td className="p-3 text-right font-bold tnum">
                            {formatPriceIdr(item.price_idr)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div>
                <div className="p-3 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono text-xs uppercase font-bold text-amber-900">
                  Produk Hilang Dari Pricelist ({previewData.vanished_products.length})
                </div>
                {previewData.vanished_products.length === 0 ? (
                  <div className="p-8 text-center font-mono text-xs text-[var(--text-muted)]">
                    Semua produk katalog saat ini tercantum di file Excel.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-hairline)] font-mono text-[10px] uppercase font-bold text-[var(--text-muted)] bg-[var(--bg-canvas)]">
                        <th className="p-3">Nama Produk</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Status Stok Saat Ini</th>
                        <th className="p-3 text-right">Harga Saat Ini</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-hairline)] font-mono">
                      {previewData.vanished_products.map((item) => (
                        <tr key={item.sku} className="hover:bg-neutral-50/60">
                          <td className="p-3 font-medium text-[var(--text-primary)]">{item.name}</td>
                          <td className="p-3 text-[var(--text-muted)]">{item.sku}</td>
                          <td className="p-3">
                            <span className="px-1.5 py-0.5 border text-[10px] uppercase bg-neutral-100">
                              {item.stock_status}
                            </span>
                          </td>
                          <td className="p-3 text-right tnum">{formatPriceIdr(item.current_price_idr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import History Table */}
      <div className="bg-white border border-[var(--border-hairline)] space-y-3 p-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
          <span className="font-mono text-xs font-bold uppercase flex items-center gap-1.5">
            <History className="w-4 h-4 text-neutral-500" /> Riwayat Impor Katalog
          </span>
          <button
            onClick={loadHistory}
            className="text-[11px] font-mono text-[var(--text-muted)] hover:text-black hover:underline cursor-pointer"
          >
            Segarkan Riwayat
          </button>
        </div>

        {historyLoading ? (
          <div className="p-4 text-center font-mono text-xs text-[var(--text-muted)]">
            Memuat riwayat...
          </div>
        ) : history.length === 0 ? (
          <div className="p-4 text-center font-mono text-xs text-[var(--text-muted)] italic">
            Belum ada riwayat impor yang tercatat.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-hairline)] text-xs font-mono">
            {history.map((h) => (
              <div key={h.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[var(--text-primary)]">{h.filename}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {new Date(h.created_at).toLocaleString("id-ID")}
                  </div>
                </div>
                <div className="text-right text-[11px]">
                  <span className="text-emerald-700 font-bold">+{h.imported_count} baru</span>
                  <span className="mx-1.5">•</span>
                  <span className="text-sky-700 font-bold">{h.updated_count} harga</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
