"use client";

import { useState, useEffect } from "react";
import {
  X,
  Save,
  Plus,
  Trash2,
  Clock,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Sliders,
  DollarSign,
  Tag,
  Package,
} from "lucide-react";
import { formatPriceIdr } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface ProductEditorModalProps {
  productId?: string | null; // if null, create new
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  onSuccess: () => void;
  onClose: () => void;
}

export function ProductEditorModal({
  productId,
  brands,
  categories,
  onSuccess,
  onClose,
}: ProductEditorModalProps) {
  const isEditing = Boolean(productId);
  const [activeTab, setActiveTab] = useState<"general" | "specs" | "variants" | "history">("general");
  const [loading, setLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // General fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [brandId, setBrandId] = useState(brands[0]?.id || "");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [segment, setSegment] = useState("Mainstream");
  const [isNew, setIsNew] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isWhatsappOnly, setIsWhatsappOnly] = useState(false);
  const [stockStatus, setStockStatus] = useState("in_stock");
  const [trackedQuantity, setTrackedQuantity] = useState<number | undefined>(5);
  const [minStockAlert, setMinStockAlert] = useState(2);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  // Specs fields
  const [cpu, setCpu] = useState("");
  const [ramGb, setRamGb] = useState<number | undefined>(8);
  const [storage, setStorage] = useState("");
  const [gpu, setGpu] = useState("");
  const [screenSize, setScreenSize] = useState("");
  const [os, setOs] = useState("");
  const [warranty, setWarranty] = useState("Garansi Resmi 2 Tahun Distributor");
  const [bundledItems, setBundledItems] = useState("");
  const [rawSpecText, setRawSpecText] = useState("");

  // Variants fields
  const [variants, setVariants] = useState<
    {
      sku: string;
      color_name: string;
      price_idr: number;
      stock_status: string;
      tracked_quantity?: number;
    }[]
  >([
    {
      sku: "SKU-BARU",
      color_name: "Standard",
      price_idr: 0,
      stock_status: "in_stock",
      tracked_quantity: 5,
    },
  ]);

  // Price history
  const [priceHistory, setPriceHistory] = useState<any[]>([]);

  useEffect(() => {
    if (productId) {
      loadProductDetail(productId);
    }
  }, [productId]);

  const loadProductDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await apiClient(`/api/v1/admin/products/${id}`);
      if (!res.ok) throw new Error("Gagal mengambil rincian produk.");
      const data = await res.json();
      const p = data.product;
      setName(p.name);
      setSlug(p.slug);
      setBrandId(p.brand_id);
      setCategoryId(p.category_id);
      setSegment(p.segment);
      setIsNew(p.is_new);
      setIsVisible(p.is_visible);
      setIsWhatsappOnly(p.is_whatsapp_only);
      setStockStatus(p.stock_status);
      setTrackedQuantity(p.tracked_quantity ?? undefined);
      setMinStockAlert(p.min_stock_alert);
      setSeoTitle(p.seo_title || "");
      setSeoDescription(p.seo_description || "");

      if (data.specs) {
        setCpu(data.specs.cpu || "");
        setRamGb(data.specs.ram_gb ?? undefined);
        setStorage(data.specs.storage || "");
        setGpu(data.specs.gpu || "");
        setScreenSize(data.specs.screen_size || "");
        setOs(data.specs.os || "");
        setWarranty(data.specs.warranty || "");
        setBundledItems(data.specs.bundled_items || "");
        setRawSpecText(data.specs.raw_spec_text || "");
      }

      if (data.variants && data.variants.length > 0) {
        setVariants(
          data.variants.map((v: any) => ({
            sku: v.sku,
            color_name: v.color_name,
            price_idr: v.price_idr,
            stock_status: v.stock_status,
            tracked_quantity: v.tracked_quantity ?? undefined,
          }))
        );
      }

      setPriceHistory(data.price_history || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal memuat produk");
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setSlug(autoSlug);
    }
  };

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        sku: `${slug.toUpperCase().slice(0, 8)}-V${variants.length + 1}`,
        color_name: "Warna Tambahan",
        price_idr: variants[0]?.price_idr || 0,
        stock_status: "in_stock",
        tracked_quantity: 5,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: string, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleRestorePrice = (oldPrice: number, sku?: string) => {
    if (!confirm(`Kembalikan harga varian ke Rp ${oldPrice.toLocaleString("id-ID")}?`)) return;
    const updated = variants.map((v) => {
      if (!sku || v.sku === sku) {
        return { ...v, price_idr: oldPrice };
      }
      return v;
    });
    setVariants(updated);
    setSuccessMsg(`Harga varian disetel kembali ke Rp ${oldPrice.toLocaleString("id-ID")}. Simpan produk untuk memperbarui.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim()) {
      setErrorMsg("Nama produk wajib diisi.");
      return;
    }
    if (!slug.trim()) {
      setErrorMsg("Slug produk wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        brand_id: brandId,
        category_id: categoryId,
        segment,
        is_new: isNew,
        is_visible: isVisible,
        is_whatsapp_only: isWhatsappOnly,
        stock_status: stockStatus,
        tracked_quantity: trackedQuantity !== undefined ? Number(trackedQuantity) : undefined,
        min_stock_alert: Number(minStockAlert) || 2,
        seo_title: seoTitle.trim() || undefined,
        seo_description: seoDescription.trim() || undefined,
        variants: variants.map((v) => ({
          sku: v.sku.trim().toUpperCase(),
          color_name: v.color_name.trim(),
          price_idr: Number(v.price_idr) || 0,
          stock_status: v.stock_status,
          tracked_quantity: v.tracked_quantity !== undefined ? Number(v.tracked_quantity) : undefined,
        })),
        specs: {
          cpu: cpu.trim() || undefined,
          ram_gb: ramGb !== undefined ? Number(ramGb) : undefined,
          storage: storage.trim() || undefined,
          gpu: gpu.trim() || undefined,
          screen_size: screenSize.trim() || undefined,
          os: os.trim() || undefined,
          warranty: warranty.trim() || undefined,
          bundled_items: bundledItems.trim() || undefined,
          raw_spec_text: rawSpecText.trim() || undefined,
        },
      };

      const endpoint = isEditing ? `/api/v1/admin/products/${productId}` : `/api/v1/admin/products`;
      const method = isEditing ? "PUT" : "POST";

      const res = await apiClient(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Gagal menyimpan data produk");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan produk.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="bg-[var(--bg-canvas)] border border-[var(--border-hairline)] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 md:px-6 border-b border-[var(--border-hairline)] flex items-center justify-between bg-[var(--bg-card)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {isEditing ? "EDIT KATALOG & INVENTORY" : "TAMBAH PRODUK BARU"}
              </span>
              {isEditing && (
                <span className="text-xs px-2 py-0.5 rounded-sm bg-neutral-200 dark:bg-neutral-800 font-mono font-bold">
                  {slug}
                </span>
              )}
            </div>
            <h2 className="text-sm md:text-base font-black uppercase text-[var(--text-primary)] mt-0.5">
              {name || "Unit Laptop / Komputer Baru"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 border border-[var(--border-hairline)] rounded-xl hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-hairline)] px-4 md:px-6 bg-[var(--bg-card)] overflow-x-auto gap-2">
          {[
            { id: "general", label: "Informasi Umum", icon: Tag },
            { id: "specs", label: "Spesifikasi Teknis", icon: Sliders },
            { id: "variants", label: `Varian & Stok (${variants.length})`, icon: Package },
            { id: "history", label: `Riwayat Harga (${priceHistory.length})`, icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted)]">
              <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Memuat data lengkap produk...
            </div>
          ) : (
            <>
              {/* TAB 1: INFORMASI UMUM */}
              {activeTab === "general" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        NAMA RESMI PRODUK *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: ASUS Vivobook 14 (A1404ZA)"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] focus:outline-hidden focus:ring-1 focus:ring-black font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        SLUG URL * (UNIK)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="asus-vivobook-14-a1404za"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        MEREK / BRAND *
                      </label>
                      <select
                        value={brandId}
                        onChange={(e) => setBrandId(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] cursor-pointer"
                      >
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        KATEGORI *
                      </label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] cursor-pointer"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        SEGMEN PASAR
                      </label>
                      <select
                        value={segment}
                        onChange={(e) => setSegment(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] cursor-pointer"
                      >
                        <option value="Entry">Entry Level</option>
                        <option value="Mainstream">Mainstream</option>
                        <option value="Gaming">Gaming</option>
                        <option value="Creator">Content Creator</option>
                        <option value="Business">Business / Komersial</option>
                        <option value="Flagship">Flagship Premium</option>
                      </select>
                    </div>
                  </div>

                  {/* Toggles & Visibility */}
                  <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-bold">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={(e) => setIsVisible(e.target.checked)}
                        className="rounded-sm accent-black w-4 h-4 cursor-pointer"
                      />
                      <span>Tampilkan di Katalog Publik (Storefront)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-bold">
                      <input
                        type="checkbox"
                        checked={isNew}
                        onChange={(e) => setIsNew(e.target.checked)}
                        className="rounded-sm accent-black w-4 h-4 cursor-pointer"
                      />
                      <span>Tandai Badge &quot;BARU&quot; (New Arrival)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-bold">
                      <input
                        type="checkbox"
                        checked={isWhatsappOnly}
                        onChange={(e) => setIsWhatsappOnly(e.target.checked)}
                        className="rounded-sm accent-black w-4 h-4 cursor-pointer"
                      />
                      <span>Tanya Harga WhatsApp Saja (Harga Rp 0)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: SPESIFIKASI TEKNIS */}
              {activeTab === "specs" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        PROSESOR (CPU)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Intel Core i5-1235U (10 Cores, up to 4.4GHz)"
                        value={cpu}
                        onChange={(e) => setCpu(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        KAPASITAS RAM (GB)
                      </label>
                      <input
                        type="number"
                        placeholder="8"
                        value={ramGb ?? ""}
                        onChange={(e) => setRamGb(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        PENYIMPANAN (STORAGE)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 512GB M.2 NVMe PCIe 4.0 SSD"
                        value={storage}
                        onChange={(e) => setStorage(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        KARTU GRAFIS (GPU)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: NVIDIA GeForce RTX 3050 4GB / Intel Iris Xe"
                        value={gpu}
                        onChange={(e) => setGpu(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        LAYAR & PANEL
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 14.0 inch FHD (1920 x 1080) IPS, Anti-Glare"
                        value={screenSize}
                        onChange={(e) => setScreenSize(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        SISTEM OPERASI (OS)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Windows 11 Home + OHS 2021 Original"
                        value={os}
                        onChange={(e) => setOs(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        GARANSI & LAYANAN RESMI
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Garansi Resmi 2 Tahun ASUS Indonesia + 1 Tahun Perfect Warranty"
                        value={warranty}
                        onChange={(e) => setWarranty(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        BONUS & KELENGKAPAN DALAM KOTAK
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Charger Original, Backpack GMC, Mouse Optik"
                        value={bundledItems}
                        onChange={(e) => setBundledItems(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: VARIAN & STOK */}
              {activeTab === "variants" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase">
                      VARIAN WARNA & HARGA JUAL (IDR)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="text-xs font-bold flex items-center gap-1 text-[var(--text-primary)] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Varian Warna</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {variants.map((v, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl grid grid-cols-1 sm:grid-cols-5 gap-2 items-center"
                      >
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-mono text-[var(--text-muted)] block">SKU UNIT</label>
                          <input
                            type="text"
                            required
                            value={v.sku}
                            onChange={(e) => handleVariantChange(idx, "sku", e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-[var(--text-muted)] block">WARNA</label>
                          <input
                            type="text"
                            required
                            value={v.color_name}
                            onChange={(e) => handleVariantChange(idx, "color_name", e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-[var(--text-muted)] block">HARGA (IDR)</label>
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            required
                            value={v.price_idr}
                            onChange={(e) => handleVariantChange(idx, "price_idr", parseInt(e.target.value) || 0)}
                            className="w-full text-xs p-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono font-bold"
                          />
                        </div>

                        <div className="flex items-end justify-between sm:justify-end gap-2">
                          <select
                            value={v.stock_status}
                            onChange={(e) => handleVariantChange(idx, "stock_status", e.target.value)}
                            className="text-xs p-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] cursor-pointer"
                          >
                            <option value="in_stock">In Stock</option>
                            <option value="ask_store">Ask Store (PO)</option>
                            <option value="out_of_stock">Habis</option>
                          </select>

                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(idx)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Stock Tracking Settings */}
                  <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        JUMLAH STOK FISIK TERLACAK (UNIT)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={trackedQuantity ?? ""}
                        onChange={(e) => setTrackedQuantity(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="Contoh: 5"
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-1">
                        AMBANG PERINGATAN STOK RENDAH
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={minStockAlert}
                        onChange={(e) => setMinStockAlert(parseInt(e.target.value) || 2)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: RIWAYAT HARGA */}
              {activeTab === "history" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase">
                      CATATAN PERUBAHAN HARGA RESMI
                    </span>
                  </div>

                  {priceHistory.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl">
                      Belum ada riwayat perubahan harga pada produk ini.
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border-hairline)] border border-[var(--border-hairline)] rounded-2xl overflow-hidden bg-[var(--bg-card)]">
                      {priceHistory.map((h, idx) => (
                        <div key={h.id || idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 font-mono">
                              <span className="line-through text-[var(--text-muted)]">
                                {formatPriceIdr(h.old_price_idr)}
                              </span>
                              <span>&rarr;</span>
                              <span className="font-bold text-[var(--text-primary)]">
                                {formatPriceIdr(h.new_price_idr)}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                              Sumber: <strong className="uppercase">{h.source}</strong> •{" "}
                              {new Date(h.created_at).toLocaleString("id-ID", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRestorePrice(h.old_price_idr)}
                            className="px-2.5 py-1 text-[11px] font-mono border border-[var(--border-hairline)] rounded-lg hover:bg-[var(--bg-canvas)] flex items-center gap-1 cursor-pointer"
                            title="Pulihkan ke harga lama"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Kembalikan</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Action Footer */}
          <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center justify-end gap-3">
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
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "MENYIMPAN..." : "SIMPAN PRODUK"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
