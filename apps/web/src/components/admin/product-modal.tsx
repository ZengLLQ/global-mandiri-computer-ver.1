"use client";

import { useState } from "react";
import { X, Save, Trash2, AlertCircle } from "lucide-react";
import { StockStatus, useInventoryStore } from "@/stores/inventory-store";

interface ProductModalProps {
  product?: any | null; // if null, creating new
  onClose: () => void;
  onSaved: () => void;
}

export function ProductModal({ product, onClose, onSaved }: ProductModalProps) {
  const { updateInventory, addCustomProduct, updateCustomProduct, deleteProduct } =
    useInventoryStore();

  const isEditing = Boolean(product);

  const [name, setName] = useState(product?.name || "");
  const [brand, setBrand] = useState(product?.brand || "ASUS");
  const [category, setCategory] = useState(product?.category || "LAPTOP");
  const [priceIdr, setPriceIdr] = useState<number>(product?.min_price_idr || 0);
  const [isTanyaHarga, setIsTanyaHarga] = useState(product?.min_price_idr === 0);
  const [stockCount, setStockCount] = useState<number>(product?.stockCount ?? 5);
  const [status, setStatus] = useState<StockStatus>(product?.status || "ready");
  const [poEstimatedDays, setPoEstimatedDays] = useState(
    product?.poEstimatedDays || "3–5 hari kerja"
  );
  const [isFeatured, setIsFeatured] = useState(Boolean(product?.is_featured));
  const [isNew, setIsNew] = useState(Boolean(product?.is_new));
  const [cpu, setCpu] = useState(product?.cpu || "");
  const [ramGb, setRamGb] = useState(product?.ram_gb || "");
  const [storage, setStorage] = useState(product?.storage || "");
  const [gpu, setGpu] = useState(product?.gpu || "");
  const [display, setDisplay] = useState(product?.display || "");
  const [warranty, setWarranty] = useState(product?.warranty || "Garansi Resmi Indonesia 2 Tahun");
  const [notes, setNotes] = useState(product?.notes || "");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const finalPrice = isTanyaHarga ? 0 : Number(priceIdr);

    if (isEditing) {
      // If it's a seed product or custom product
      if (product.id?.startsWith("custom-")) {
        updateCustomProduct(product.id, {
          name,
          brand,
          category,
          min_price_idr: finalPrice,
          stockCount: Number(stockCount),
          status,
          poEstimatedDays,
          is_featured: isFeatured,
          is_new: isNew,
          cpu,
          ram_gb: Number(ramGb) || undefined,
          storage,
          gpu,
          display,
          warranty,
          notes,
        });
      } else {
        // Update seed product override
        updateInventory(product.id, {
          priceIdr: finalPrice,
          stockCount: Number(stockCount),
          status,
          poEstimatedDays,
          isFeatured,
          isNew,
          notes,
        });
      }
    } else {
      // Create new custom product
      const newId = `custom-${Date.now()}`;
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      addCustomProduct({
        id: newId,
        slug: slug || `unit-${Date.now()}`,
        name,
        brand,
        category,
        min_price_idr: finalPrice,
        stockCount: Number(stockCount),
        status,
        poEstimatedDays,
        is_featured: isFeatured,
        is_new: isNew,
        cpu,
        ram_gb: Number(ramGb) || undefined,
        storage,
        gpu,
        display,
        warranty,
        notes,
      });
    }

    onSaved();
    onClose();
  };

  const handleDelete = () => {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini dari katalog?")) {
      if (product?.id) {
        deleteProduct(product.id);
        onSaved();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--bg-canvas)] border border-[var(--border-hairline)] w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-hairline)] flex items-center justify-between bg-[var(--bg-card)]">
          <div>
            <span className="text-micro-label text-[var(--text-muted)] font-bold block">
              {isEditing ? "EDIT DATA & INVENTARIS UNIT" : "TAMBAH UNIT BARU KE KATALOG"}
            </span>
            <h2 className="text-base font-black uppercase tracking-tight text-[var(--text-primary)]">
              {isEditing ? name : "PRODUK KOMPUTASI BARU"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 border border-[var(--border-hairline)] rounded-xl hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Main Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-hairline)] pb-1.5">
              1. INFORMASI DASAR
            </h3>

            <div>
              <label className="text-micro-label text-[var(--text-muted)] block mb-1">NAMA LENGKAP PRODUK *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: ASUS ROG Zephyrus G16 GU605..."
                className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-xs font-semibold rounded-xl focus:outline-none focus:border-[var(--text-primary)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-micro-label text-[var(--text-muted)] block mb-1">BRAND RESMI *</label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-xs font-bold uppercase rounded-xl cursor-pointer"
                >
                  {[
                    "ASUS",
                    "LENOVO",
                    "APPLE",
                    "ACER",
                    "HP",
                    "EPSON",
                    "BENQ",
                    "CANON",
                    "BROTHER",
                    "INFOCUS",
                    "VIEWSONIC",
                    "OPTOMA",
                    "STARLINK",
                    "MSI",
                    "AXIOO",
                    "ADVAN",
                  ].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-micro-label text-[var(--text-muted)] block mb-1">KATEGORI UNIT *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-xs font-bold uppercase rounded-xl cursor-pointer"
                >
                  <option value="LAPTOP">LAPTOP</option>
                  <option value="ALL-IN-ONE">ALL-IN-ONE</option>
                  <option value="PC-DESKTOP">PC DESKTOP</option>
                  <option value="PRINTER">PRINTER</option>
                  <option value="PROJECTOR">PROJECTOR</option>
                  <option value="STARLINK">STARLINK</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-hairline)] pb-1.5">
              2. KONTROL HARGA &amp; INVENTARIS STOK
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Price */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-micro-label text-[var(--text-muted)]">HARGA JUAL (IDR)</label>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTanyaHarga}
                      onChange={(e) => setIsTanyaHarga(e.target.checked)}
                      className="accent-[var(--text-primary)]"
                    />
                    <span>TANYA HARGA</span>
                  </label>
                </div>
                <input
                  type="number"
                  disabled={isTanyaHarga}
                  value={isTanyaHarga ? "" : priceIdr}
                  onChange={(e) => setPriceIdr(Number(e.target.value))}
                  placeholder={isTanyaHarga ? "TANYA HARGA VIA SALES" : "15000000"}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl disabled:opacity-50"
                />
              </div>

              {/* Stock Count */}
              <div>
                <label className="text-micro-label text-[var(--text-muted)] block mb-1">
                  JUMLAH STOK FISIK (UNIT)
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockCount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStockCount(val);
                    if (val === 0 && status === "ready") {
                      setStatus("out_of_stock");
                    } else if (val > 0 && status === "out_of_stock") {
                      setStatus("ready");
                    }
                  }}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl"
                />
              </div>
            </div>

            {/* Availability Status & PO Lead Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-micro-label text-[var(--text-muted)] block mb-1">
                  STATUS KETERSEDIAAN *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StockStatus)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-xs font-bold uppercase rounded-xl cursor-pointer"
                >
                  <option value="ready">READY STOCK</option>
                  <option value="pre_order">PRE-ORDER (PO)</option>
                  <option value="out_of_stock">STOK HABIS (OUT OF STOCK)</option>
                  <option value="discontinued">DISCONTINUE (NONAKTIF)</option>
                </select>
              </div>

              {status === "pre_order" && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <label className="text-micro-label text-[var(--text-muted)] block mb-1">
                    ESTIMASI INDEN / PRE-ORDER
                  </label>
                  <input
                    type="text"
                    value={poEstimatedDays}
                    onChange={(e) => setPoEstimatedDays(e.target.value)}
                    placeholder="Contoh: 3–5 hari kerja / 1–2 minggu"
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-xs font-semibold rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Badges / Flags */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 accent-[var(--text-primary)]"
                />
                <span>FEATURED DI BERANDA</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={isNew}
                  onChange={(e) => setIsNew(e.target.checked)}
                  className="w-4 h-4 accent-[var(--text-primary)]"
                />
                <span>BARANG BARU (NEW ARRIVAL)</span>
              </label>
            </div>
          </div>

          {/* Hardware Specs */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-hairline)] pb-1.5">
              3. SPESIFIKASI TEKNIS HARDWARE
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-micro-label text-[var(--text-muted)] block mb-1">PROCESSOR (CPU)</label>
                <input
                  type="text"
                  value={cpu}
                  onChange={(e) => setCpu(e.target.value)}
                  placeholder="Contoh: Intel Core Ultra 7 155H"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-3.5 py-2 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-micro-label text-[var(--text-muted)] block mb-1">KAPASITAS RAM (GB)</label>
                <input
                  type="number"
                  value={ramGb}
                  onChange={(e) => setRamGb(e.target.value)}
                  placeholder="Contoh: 16"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-3.5 py-2 text-xs font-mono rounded-xl"
                />
              </div>

              <div>
                <label className="text-micro-label text-[var(--text-muted)] block mb-1">STORAGE (SSD/HDD)</label>
                <input
                  type="text"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  placeholder="Contoh: 512GB SSD PCIe 4.0 NVMe"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-3.5 py-2 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-micro-label text-[var(--text-muted)] block mb-1">KARTU GRAFIS (GPU)</label>
                <input
                  type="text"
                  value={gpu}
                  onChange={(e) => setGpu(e.target.value)}
                  placeholder="Contoh: NVIDIA GeForce RTX 4060 8GB"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-3.5 py-2 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-micro-label text-[var(--text-muted)] block mb-1">LAYAR / DISPLAY</label>
                <input
                  type="text"
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                  placeholder="Contoh: 16.0 2.5K 165Hz ROG Nebula"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-3.5 py-2 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-micro-label text-[var(--text-muted)] block mb-1">GARANSI RESMI</label>
                <input
                  type="text"
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                  placeholder="Contoh: 2 Tahun Garansi Resmi Indonesia"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-3.5 py-2 text-xs rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-micro-label text-[var(--text-muted)] block mb-1">CATATAN KHUSUS / PROMO</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bonus backpack, mouse wireless, lisensi OHS 2024..."
                className="w-full bg-[var(--bg-card)] border border-[var(--border-hairline)] px-3.5 py-2 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[var(--border-hairline)] flex items-center justify-between gap-4">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>HAPUS DARI KATALOG</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="editorial-btn-outline py-2.5 px-6 text-xs font-bold rounded-xl cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="submit"
                className="editorial-btn py-2.5 px-7 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Save className="w-3.5 h-3.5" />
                <span>SIMPAN PERUBAHAN &rarr;</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
