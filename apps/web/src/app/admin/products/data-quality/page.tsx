"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  Cpu,
  Package,
  CheckCircle,
  RefreshCw,
  Edit2,
  Eye,
  Sliders,
  ChevronRight,
} from "lucide-react";
import { formatPriceIdr } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { ProductEditorModal } from "@/components/admin/product-editor-modal";
import { AdminProductItem } from "../page";

export default function DataQualityPage() {
  const [activeTab, setActiveTab] = useState<"price" | "specs" | "stock">("price");
  const [loading, setLoading] = useState(true);
  const [zeroPriceList, setZeroPriceList] = useState<AdminProductItem[]>([]);
  const [missingSpecsList, setMissingSpecsList] = useState<AdminProductItem[]>([]);
  const [lowStockList, setLowStockList] = useState<AdminProductItem[]>([]);

  // Reference data for modal
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Modal target
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Quick edit price state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);

  // Quick edit restock state
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<number>(0);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadQueues = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, bRes, cRes] = await Promise.all([
        apiClient("/api/v1/admin/products/data-quality"),
        apiClient("/api/v1/admin/brands"),
        apiClient("/api/v1/admin/categories"),
      ]);

      if (qRes.ok) {
        const qData = await qRes.json();
        setZeroPriceList(qData.zero_price_products || []);
        setMissingSpecsList(qData.missing_specs_products || []);
        setLowStockList(qData.low_stock_products || []);
      }
      if (bRes.ok) setBrands(await bRes.json());
      if (cRes.ok) setCategories(await cRes.json());
    } catch (err) {
      console.error("Failed to load data quality:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueues();
  }, [loadQueues]);

  const handleUpdatePrice = async (id: string, price: number) => {
    try {
      const res = await apiClient(`/api/v1/admin/products/${id}/inline`, {
        method: "PATCH",
        body: JSON.stringify({ price_idr: price }),
      });
      if (res.ok) {
        showToast("success", "Harga produk berhasil diperbarui");
        setEditingPriceId(null);
        loadQueues();
      } else {
        showToast("error", "Gagal memperbarui harga");
      }
    } catch {
      showToast("error", "Kesalahan koneksi");
    }
  };

  const handleUpdateStock = async (id: string, quantity: number) => {
    try {
      const res = await apiClient(`/api/v1/admin/products/${id}/inline`, {
        method: "PATCH",
        body: JSON.stringify({
          tracked_quantity: quantity,
          stock_status: quantity > 0 ? "in_stock" : "out_of_stock",
        }),
      });
      if (res.ok) {
        showToast("success", "Kuantitas stok berhasil ditambahkan");
        setEditingStockId(null);
        loadQueues();
      } else {
        showToast("error", "Gagal memperbarui stok");
      }
    } catch {
      showToast("error", "Kesalahan koneksi");
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
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/products"
              className="text-xs font-mono text-[var(--text-muted)] hover:text-black flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Katalog
            </Link>
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase font-mono flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" /> Antrean Kualitas Data (Triage)
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            Audit otomatis integritas data: produk harga nol, spesifikasi hardware kosong, dan stok menipis
          </p>
        </div>

        <button
          onClick={loadQueues}
          disabled={loading}
          className="px-3 py-1.5 border border-[var(--border-hairline)] bg-white font-mono text-xs uppercase hover:border-black flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Muat Ulang
        </button>
      </div>

      {/* Stat Metric Cards & Navigation Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tab 1: Zero Price */}
        <button
          onClick={() => setActiveTab("price")}
          className={`p-4 border text-left transition-all cursor-pointer ${
            activeTab === "price"
              ? "border-black bg-white shadow-xs ring-1 ring-black"
              : "border-[var(--border-hairline)] bg-white/70 hover:bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold">
              Harga Rp 0 / Kosong
            </span>
            <DollarSign className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tnum text-red-700">
            {zeroPriceList.length}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
            Produk terdaftar yang belum memiliki banderol harga valid
          </p>
        </button>

        {/* Tab 2: Missing Specs */}
        <button
          onClick={() => setActiveTab("specs")}
          className={`p-4 border text-left transition-all cursor-pointer ${
            activeTab === "specs"
              ? "border-black bg-white shadow-xs ring-1 ring-black"
              : "border-[var(--border-hairline)] bg-white/70 hover:bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold">
              Spesifikasi Kosong
            </span>
            <Cpu className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tnum text-amber-700">
            {missingSpecsList.length}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
            Produk tanpa data CPU, RAM, atau Storage yang jelas
          </p>
        </button>

        {/* Tab 3: Low Stock */}
        <button
          onClick={() => setActiveTab("stock")}
          className={`p-4 border text-left transition-all cursor-pointer ${
            activeTab === "stock"
              ? "border-black bg-white shadow-xs ring-1 ring-black"
              : "border-[var(--border-hairline)] bg-white/70 hover:bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold">
              Stok Menipis / Kritis
            </span>
            <Package className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tnum text-sky-700">
            {lowStockList.length}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
            Produk dengan kuantitas stok di bawah batas peringatan
          </p>
        </button>
      </div>

      {/* Active Tab Queue Content */}
      <div className="bg-white border border-[var(--border-hairline)]">
        {loading ? (
          <div className="p-12 text-center font-mono text-xs text-[var(--text-muted)] space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-black" />
            <p>Menganalisis anomali katalog...</p>
          </div>
        ) : activeTab === "price" ? (
          <div>
            <div className="p-4 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-red-900">
                Antrean Produk Dengan Harga Rp 0 ({zeroPriceList.length})
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Beri harga langsung di baris atau buka editor
              </span>
            </div>

            {zeroPriceList.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs text-emerald-800 space-y-1">
                <CheckCircle className="w-6 h-6 mx-auto text-emerald-600 mb-2" />
                <p className="font-bold">Semua produk memiliki harga yang valid!</p>
                <p className="text-[var(--text-muted)]">Tidak ada produk dalam antrean ini.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-hairline)]">
                {zeroPriceList.map((item) => (
                  <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50/60">
                    <div className="space-y-1">
                      <div className="font-medium text-sm text-[var(--text-primary)]">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)]">
                        <span>SKU: {item.primary_sku || "-"}</span>
                        <span>•</span>
                        <span>{item.brand_name}</span>
                        <span>•</span>
                        <span>{item.category_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingPriceId === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={tempPrice}
                            onChange={(e) => setTempPrice(Number(e.target.value))}
                            placeholder="Contoh: 12500000"
                            className="w-36 px-2 py-1.5 border border-black bg-white text-xs font-mono"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdatePrice(item.id, tempPrice)}
                            className="px-2.5 py-1.5 bg-black text-white text-xs font-mono uppercase font-bold cursor-pointer"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={() => setEditingPriceId(null)}
                            className="px-2 py-1.5 border text-xs font-mono cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPriceId(item.id);
                            setTempPrice(0);
                          }}
                          className="px-3 py-1.5 bg-red-50 text-red-900 border border-red-300 text-xs font-mono uppercase font-bold hover:bg-red-100 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Masukkan Harga
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedProductId(item.id)}
                        className="p-1.5 border border-[var(--border-hairline)] hover:border-black cursor-pointer"
                        title="Buka detail lengkap"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "specs" ? (
          <div>
            <div className="p-4 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-amber-900">
                Antrean Spesifikasi Belum Lengkap ({missingSpecsList.length})
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Lengkapi RAM, Prosesor, dan Storage agar katalog informatif
              </span>
            </div>

            {missingSpecsList.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs text-emerald-800 space-y-1">
                <CheckCircle className="w-6 h-6 mx-auto text-emerald-600 mb-2" />
                <p className="font-bold">Semua produk memiliki spesifikasi lengkap!</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-hairline)]">
                {missingSpecsList.map((item) => (
                  <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50/60">
                    <div className="space-y-1">
                      <div className="font-medium text-sm text-[var(--text-primary)]">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)]">
                        <span>SKU: {item.primary_sku || "-"}</span>
                        <span>•</span>
                        <span>{item.brand_name}</span>
                        <span>•</span>
                        <span className="text-amber-800 font-bold">⚠️ Data CPU/RAM/Storage kosong</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedProductId(item.id)}
                        className="px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-300 text-xs font-mono uppercase font-bold hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Lengkapi Spesifikasi
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="p-4 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-sky-900">
                Antrean Stok Kritis / Menipis ({lowStockList.length})
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Tambah stok segera untuk menghindari kekecewaan pembeli
              </span>
            </div>

            {lowStockList.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs text-emerald-800 space-y-1">
                <CheckCircle className="w-6 h-6 mx-auto text-emerald-600 mb-2" />
                <p className="font-bold">Tidak ada produk dengan stok menipis!</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-hairline)]">
                {lowStockList.map((item) => (
                  <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50/60">
                    <div className="space-y-1">
                      <div className="font-medium text-sm text-[var(--text-primary)]">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)]">
                        <span>SKU: {item.primary_sku || "-"}</span>
                        <span>•</span>
                        <span>Sisa Qty: <strong className="text-red-700 font-bold">{item.tracked_quantity ?? 0} unit</strong></span>
                        <span>•</span>
                        <span>Batas Alert: {item.min_stock_alert} unit</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingStockId === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={tempStock}
                            onChange={(e) => setTempStock(Number(e.target.value))}
                            placeholder="Kuantitas baru"
                            className="w-24 px-2 py-1.5 border border-black bg-white text-xs font-mono"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateStock(item.id, tempStock)}
                            className="px-2.5 py-1.5 bg-black text-white text-xs font-mono uppercase font-bold cursor-pointer"
                          >
                            Restock
                          </button>
                          <button
                            onClick={() => setEditingStockId(null)}
                            className="px-2 py-1.5 border text-xs font-mono cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingStockId(item.id);
                            setTempStock((item.tracked_quantity ?? 0) + 5);
                          }}
                          className="px-3 py-1.5 bg-sky-50 text-sky-900 border border-sky-300 text-xs font-mono uppercase font-bold hover:bg-sky-100 flex items-center gap-1 cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5" /> Restock Cepat
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedProductId(item.id)}
                        className="p-1.5 border border-[var(--border-hairline)] hover:border-black cursor-pointer"
                        title="Buka editor lengkap"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Editor Modal */}
      {selectedProductId && (
        <ProductEditorModal
          productId={selectedProductId}
          brands={brands}
          categories={categories}
          onSuccess={() => {
            setSelectedProductId(null);
            showToast("success", "Produk berhasil diperbarui");
            loadQueues();
          }}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </div>
  );
}
