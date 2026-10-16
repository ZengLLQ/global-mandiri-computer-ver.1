"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FolderTree,
  Tag,
  Plus,
  GitMerge,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
  X,
  Save,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function AdminCategoriesBrandsPage() {
  const [activeTab, setActiveTab] = useState<"categories" | "brands">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [createType, setCreateType] = useState<"category" | "brand">("category");

  // Create form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Merge form state
  const [mergeType, setMergeType] = useState<"category" | "brand">("category");
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, bRes] = await Promise.all([
        apiClient("/api/v1/admin/categories"),
        apiClient("/api/v1/admin/brands"),
      ]);
      if (cRes.ok) setCategories(await cRes.json());
      if (bRes.ok) setBrands(await bRes.json());
    } catch (err) {
      console.error("Failed to load categories/brands:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create Category / Brand
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim()) {
      showToast("error", "Nama dan slug wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = createType === "category" ? "/api/v1/admin/categories" : "/api/v1/admin/brands";
      const res = await apiClient(endpoint, {
        method: "POST",
        body: JSON.stringify({
          name: formName.trim(),
          slug: formSlug.trim(),
          description: formDescription.trim() || null,
          sort_order: formSortOrder,
        }),
      });

      if (res.ok) {
        showToast("success", `${createType === "category" ? "Kategori" : "Brand"} berhasil ditambahkan`);
        setShowCreateModal(false);
        setFormName("");
        setFormSlug("");
        setFormDescription("");
        setFormSortOrder(0);
        loadData();
      } else {
        showToast("error", "Gagal menambahkan data");
      }
    } catch {
      showToast("error", "Kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Merge
  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId) {
      showToast("error", "Pilih sumber dan tujuan penggabungan");
      return;
    }
    if (sourceId === targetId) {
      showToast("error", "Sumber dan tujuan tidak boleh sama");
      return;
    }

    if (!confirm("Penggabungan ini akan memindahkan semua produk terkait ke entitas tujuan dan menonaktifkan entitas sumber. Lanjutkan?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = mergeType === "category" ? "/api/v1/admin/categories/merge" : "/api/v1/admin/brands/merge";
      const res = await apiClient(endpoint, {
        method: "POST",
        body: JSON.stringify({
          source_id: sourceId,
          target_id: targetId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast("success", `Penggabungan selesai. ${data.moved_products_count} produk berhasil dialihkan.`);
        setShowMergeModal(false);
        setSourceId("");
        setTargetId("");
        loadData();
      } else {
        showToast("error", "Gagal memproses penggabungan");
      }
    } catch {
      showToast("error", "Kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
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
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/products"
              className="text-xs font-mono text-[var(--text-muted)] hover:text-black flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Katalog
            </Link>
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase font-mono flex items-center gap-2">
            <FolderTree className="w-5 h-5" /> Manajemen Kategori & Brand
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            Atur hierarki kategori produk, data manufaktur brand, dan fitur penggabungan (merge) katalog
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setMergeType(activeTab === "categories" ? "category" : "brand");
              setSourceId("");
              setTargetId("");
              setShowMergeModal(true);
            }}
            className="px-3 py-2 border border-black bg-white font-mono text-xs uppercase font-bold hover:bg-neutral-50 flex items-center gap-1.5 cursor-pointer"
          >
            <GitMerge className="w-4 h-4" /> Gabungkan (Merge)
          </button>
          <button
            onClick={() => {
              setCreateType(activeTab === "categories" ? "category" : "brand");
              setFormName("");
              setFormSlug("");
              setFormDescription("");
              setFormSortOrder(0);
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-black text-white font-mono text-xs uppercase font-bold hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah {activeTab === "categories" ? "Kategori" : "Brand"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-hairline)]">
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-6 py-3 font-mono text-xs uppercase font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === "categories"
              ? "border-black text-black"
              : "border-transparent text-[var(--text-muted)] hover:text-black"
          }`}
        >
          Kategori ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab("brands")}
          className={`px-6 py-3 font-mono text-xs uppercase font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === "brands"
              ? "border-black text-black"
              : "border-transparent text-[var(--text-muted)] hover:text-black"
          }`}
        >
          Brand ({brands.length})
        </button>
      </div>

      {/* Table Content */}
      <div className="bg-white border border-[var(--border-hairline)]">
        {loading ? (
          <div className="p-12 text-center font-mono text-xs text-[var(--text-muted)] space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-black" />
            <p>Memuat data...</p>
          </div>
        ) : activeTab === "categories" ? (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono text-[10px] uppercase font-bold text-[var(--text-muted)]">
                <th className="p-3">Nama Kategori</th>
                <th className="p-3">Slug URL</th>
                <th className="p-3">Urutan</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50/60">
                  <td className="p-3 font-medium text-sm text-[var(--text-primary)]">
                    {c.name}
                    {c.description && (
                      <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                        {c.description}
                      </p>
                    )}
                  </td>
                  <td className="p-3 font-mono text-[var(--text-muted)]">
                    /{c.slug}
                  </td>
                  <td className="p-3 font-mono tnum text-[var(--text-muted)]">
                    {c.sort_order}
                  </td>
                  <td className="p-3 font-mono">
                    <span
                      className={`px-2 py-0.5 text-[10px] uppercase border font-bold ${
                        c.is_active
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-neutral-100 text-neutral-500 border-neutral-300"
                      }`}
                    >
                      {c.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono text-[10px] uppercase font-bold text-[var(--text-muted)]">
                <th className="p-3">Nama Brand</th>
                <th className="p-3">Slug URL</th>
                <th className="p-3">Urutan</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {brands.map((b) => (
                <tr key={b.id} className="hover:bg-neutral-50/60">
                  <td className="p-3 font-medium text-sm text-[var(--text-primary)]">
                    {b.name}
                    {b.description && (
                      <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                        {b.description}
                      </p>
                    )}
                  </td>
                  <td className="p-3 font-mono text-[var(--text-muted)]">
                    /{b.slug}
                  </td>
                  <td className="p-3 font-mono tnum text-[var(--text-muted)]">
                    {b.sort_order}
                  </td>
                  <td className="p-3 font-mono">
                    <span
                      className={`px-2 py-0.5 text-[10px] uppercase border font-bold ${
                        b.is_active
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-neutral-100 text-neutral-500 border-neutral-300"
                      }`}
                    >
                      {b.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--border-hairline)] max-w-md w-full shadow-2xl">
            <div className="p-4 border-b border-[var(--border-hairline)] flex items-center justify-between">
              <span className="font-mono text-sm font-bold uppercase">
                Tambah {createType === "category" ? "Kategori Baru" : "Brand Baru"}
              </span>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-[var(--text-muted)] hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs font-mono">
              <div>
                <label className="block uppercase text-[10px] font-bold text-[var(--text-muted)] mb-1">
                  Nama {createType === "category" ? "Kategori" : "Brand"} *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!formSlug || formSlug === formName.toLowerCase().replace(/\s+/g, "-")) {
                      setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                    }
                  }}
                  placeholder="Contoh: Laptop Gaming atau Asus"
                  className="w-full px-3 py-2 border border-[var(--border-hairline)] focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="block uppercase text-[10px] font-bold text-[var(--text-muted)] mb-1">
                  Slug URL *
                </label>
                <input
                  type="text"
                  required
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="laptop-gaming"
                  className="w-full px-3 py-2 border border-[var(--border-hairline)] focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="block uppercase text-[10px] font-bold text-[var(--text-muted)] mb-1">
                  Urutan Tampil (Sort Order)
                </label>
                <input
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[var(--border-hairline)] focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="block uppercase text-[10px] font-bold text-[var(--text-muted)] mb-1">
                  Deskripsi Singkat (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-hairline)] focus:border-black outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-hairline)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[var(--border-hairline)] hover:border-black cursor-pointer uppercase"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-black text-white uppercase font-bold hover:bg-neutral-800 cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> {isSubmitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--border-hairline)] max-w-lg w-full shadow-2xl">
            <div className="p-4 border-b border-[var(--border-hairline)] flex items-center justify-between">
              <span className="font-mono text-sm font-bold uppercase flex items-center gap-2">
                <GitMerge className="w-4 h-4" /> Gabungkan (Merge) {mergeType === "category" ? "Kategori" : "Brand"}
              </span>
              <button
                onClick={() => setShowMergeModal(false)}
                className="p-1 text-[var(--text-muted)] hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMerge} className="p-5 space-y-4 text-xs font-mono">
              <p className="text-[var(--text-muted)] leading-relaxed">
                Fitur ini memindahkan seluruh produk dari entitas sumber ke entitas tujuan, kemudian menonaktifkan entitas sumber. Berguna saat merapikan duplikasi data import.
              </p>

              <div>
                <label className="block uppercase text-[10px] font-bold text-[var(--text-muted)] mb-1">
                  Tipe Entitas
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mtype"
                      checked={mergeType === "category"}
                      onChange={() => {
                        setMergeType("category");
                        setSourceId("");
                        setTargetId("");
                      }}
                      className="accent-black"
                    />
                    <span>Kategori</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mtype"
                      checked={mergeType === "brand"}
                      onChange={() => {
                        setMergeType("brand");
                        setSourceId("");
                        setTargetId("");
                      }}
                      className="accent-black"
                    />
                    <span>Brand</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block uppercase text-[10px] font-bold text-red-700 mb-1">
                  1. Pilih Sumber (Akan Dihapus/Dinonaktifkan) *
                </label>
                <select
                  required
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full px-3 py-2 border border-red-300 bg-red-50/50 text-red-950 font-mono cursor-pointer"
                >
                  <option value="">-- Pilih Sumber --</option>
                  {(mergeType === "category" ? categories : brands).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center text-[var(--text-muted)]">
                <ArrowRight className="w-5 h-5 rotate-90 md:rotate-0" />
              </div>

              <div>
                <label className="block uppercase text-[10px] font-bold text-emerald-800 mb-1">
                  2. Pilih Tujuan (Akan Menampung Semua Produk) *
                </label>
                <select
                  required
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50/50 text-emerald-950 font-mono cursor-pointer"
                >
                  <option value="">-- Pilih Tujuan --</option>
                  {(mergeType === "category" ? categories : brands).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-[var(--border-hairline)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  className="px-4 py-2 border border-[var(--border-hairline)] hover:border-black cursor-pointer uppercase"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-black text-white uppercase font-bold hover:bg-neutral-800 cursor-pointer flex items-center gap-1.5"
                >
                  <GitMerge className="w-4 h-4" /> {isSubmitting ? "Menggabungkan..." : "Terapkan Penggabungan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
