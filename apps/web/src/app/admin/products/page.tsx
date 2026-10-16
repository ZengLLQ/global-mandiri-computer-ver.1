"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  RowSelectionState,
} from "@tanstack/react-table";
import {
  Search,
  Plus,
  Filter,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
  Copy,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Package,
  Layers,
  ArrowUpDown,
  Tag,
  AlertTriangle,
  FolderTree,
} from "lucide-react";
import { formatPriceIdr } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { ProductEditorModal } from "@/components/admin/product-editor-modal";

export interface AdminProductItem {
  id: string;
  slug: string;
  name: string;
  brand_id: string;
  brand_name: string;
  category_id: string;
  category_name: string;
  segment: string;
  is_new: boolean;
  is_visible: boolean;
  stock_status: string;
  tracked_quantity?: number | null;
  min_stock_alert: number;
  is_whatsapp_only: boolean;
  min_price_idr: number;
  max_price_idr: number;
  variants_count: number;
  primary_sku: string;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProductItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Reference data
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStock, setSelectedStock] = useState("all");
  const [selectedVisibility, setSelectedVisibility] = useState("all");
  const [priceZeroOnly, setPriceZeroOnly] = useState(false);
  const [inTrash, setInTrash] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Modals & Drawers
  const [editorProductId, setEditorProductId] = useState<string | null | undefined>(undefined);
  // undefined: modal closed, null: create new, string: edit product ID
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Quick inline edit state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);

  // Fetch reference brands & categories
  useEffect(() => {
    async function loadMeta() {
      try {
        const [bRes, cRes] = await Promise.all([
          apiClient("/api/v1/admin/brands"),
          apiClient("/api/v1/admin/categories"),
        ]);
        if (bRes.ok) {
          const bData = await bRes.json();
          setBrands(bData);
        }
        if (cRes.ok) {
          const cData = await cRes.json();
          setCategories(cData);
        }
      } catch (err) {
        console.error("Failed to load brands/categories:", err);
      }
    }
    loadMeta();
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
        in_trash: inTrash.toString(),
      });

      if (search.trim()) params.set("search", search.trim());
      if (selectedBrand !== "all") params.set("brand_id", selectedBrand);
      if (selectedCategory !== "all") params.set("category_id", selectedCategory);
      if (selectedStock !== "all") params.set("stock_status", selectedStock);
      if (selectedVisibility === "visible") params.set("is_visible", "true");
      if (selectedVisibility === "hidden") params.set("is_visible", "false");
      if (priceZeroOnly) params.set("price_zero", "true");

      const res = await apiClient(`/api/v1/admin/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    perPage,
    sortBy,
    sortOrder,
    inTrash,
    search,
    selectedBrand,
    selectedCategory,
    selectedStock,
    selectedVisibility,
    priceZeroOnly,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Inline Quick Updates
  const handleInlineUpdate = async (id: string, payload: {
    price_idr?: number;
    stock_status?: string;
    tracked_quantity?: number;
    is_visible?: boolean;
    is_new?: boolean;
  }) => {
    try {
      const res = await apiClient(`/api/v1/admin/products/${id}/inline`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast("success", "Perubahan produk berhasil disimpan");
        fetchProducts();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast("error", err.message || "Gagal memperbarui produk");
      }
    } catch {
      showToast("error", "Terjadi kesalahan jaringan");
    }
  };

  // Quick Duplicate
  const handleDuplicate = async (id: string) => {
    if (!confirm("Duplikasi produk ini sebagai draft baru?")) return;
    setActionLoadingId(id);
    try {
      const res = await apiClient(`/api/v1/admin/products/${id}/duplicate`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        showToast("success", `Produk berhasil diduplikasi (${data.name})`);
        fetchProducts();
      } else {
        showToast("error", "Gagal menduplikasi produk");
      }
    } catch {
      showToast("error", "Terjadi kesalahan koneksi");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Soft Delete / Restore
  const handleDeleteOrRestore = async (id: string, isRestore: boolean) => {
    if (!confirm(isRestore ? "Pulihkan produk ini dari tempat sampah?" : "Pindahkan produk ini ke tempat sampah?")) {
      return;
    }
    setActionLoadingId(id);
    try {
      const res = await apiClient(
        isRestore ? `/api/v1/admin/products/${id}/restore` : `/api/v1/admin/products/${id}`,
        { method: isRestore ? "POST" : "DELETE" }
      );
      if (res.ok) {
        showToast("success", isRestore ? "Produk berhasil dipulihkan" : "Produk dipindahkan ke tempat sampah");
        fetchProducts();
      } else {
        showToast("error", "Gagal memproses aksi produk");
      }
    } catch {
      showToast("error", "Terjadi kesalahan koneksi");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action: string, value?: any) => {
    const selectedIndices = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    const selectedIds = selectedIndices.map((idx) => products[Number(idx)]?.id).filter(Boolean);

    if (selectedIds.length === 0) {
      alert("Pilih minimal satu produk untuk aksi massal");
      return;
    }

    if (!confirm(`Terapkan aksi '${action}' ke ${selectedIds.length} produk terpilih?`)) {
      return;
    }

    setBulkLoading(true);
    try {
      const res = await apiClient("/api/v1/admin/products/bulk", {
        method: "POST",
        body: JSON.stringify({
          action,
          product_ids: selectedIds,
          value,
        }),
      });
      if (res.ok) {
        showToast("success", `Aksi massal berhasil diterapkan pada ${selectedIds.length} produk`);
        setRowSelection({});
        fetchProducts();
      } else {
        showToast("error", "Gagal memproses aksi massal");
      }
    } catch {
      showToast("error", "Terjadi kegagalan jaringan saat aksi massal");
    } finally {
      setBulkLoading(false);
    }
  };

  // TanStack Table columns definition
  const columns = useMemo<ColumnDef<AdminProductItem>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="rounded border-[var(--border-hairline)] w-4 h-4 cursor-pointer accent-black"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="rounded border-[var(--border-hairline)] w-4 h-4 cursor-pointer accent-black"
        />
      ),
      size: 40,
    },
    {
      accessorKey: "name",
      header: "Produk & SKU",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-[var(--text-primary)] hover:underline cursor-pointer"
                    onClick={() => setEditorProductId(item.id)}>
                {item.name}
              </span>
              {item.is_new && (
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 font-bold">
                  NEW
                </span>
              )}
              {!item.is_visible && (
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-neutral-100 text-neutral-600 border border-neutral-300">
                  DISEMBUNYIKAN
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)]">
              <span>SKU: {item.primary_sku || "-"}</span>
              <span>•</span>
              <span>{item.brand_name}</span>
              <span>•</span>
              <span>{item.category_name}</span>
              {item.segment && (
                <>
                  <span>•</span>
                  <span>{item.segment}</span>
                </>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "price",
      header: "Harga (IDR)",
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingPriceId === item.id;
        const isZero = item.min_price_idr === 0;

        if (isEditing) {
          return (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={tempPrice}
                onChange={(e) => setTempPrice(Number(e.target.value))}
                className="w-32 px-2 py-1 border border-black bg-white text-xs font-mono"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleInlineUpdate(item.id, { price_idr: tempPrice });
                    setEditingPriceId(null);
                  } else if (e.key === "Escape") {
                    setEditingPriceId(null);
                  }
                }}
              />
              <button
                onClick={() => {
                  handleInlineUpdate(item.id, { price_idr: tempPrice });
                  setEditingPriceId(null);
                }}
                className="px-2 py-1 bg-black text-white text-[10px] font-mono uppercase cursor-pointer"
              >
                Simpan
              </button>
            </div>
          );
        }

        return (
          <div
            className="group flex items-center gap-2 cursor-pointer"
            onClick={() => {
              setEditingPriceId(item.id);
              setTempPrice(item.min_price_idr);
            }}
            title="Klik untuk ubah cepat harga"
          >
            <div className="font-mono text-xs tnum">
              {isZero ? (
                <span className="text-red-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Rp 0 (Perlu Diisi)
                </span>
              ) : item.min_price_idr === item.max_price_idr ? (
                formatPriceIdr(item.min_price_idr)
              ) : (
                `${formatPriceIdr(item.min_price_idr)} - ${formatPriceIdr(item.max_price_idr)}`
              )}
            </div>
            <Edit2 className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        );
      },
    },
    {
      accessorKey: "stock_status",
      header: "Status Stok & Kuantitas",
      cell: ({ row }) => {
        const item = row.original;
        const isLow =
          item.tracked_quantity !== undefined &&
          item.tracked_quantity !== null &&
          item.tracked_quantity <= item.min_stock_alert;

        return (
          <div className="space-y-1">
            <select
              value={item.stock_status}
              onChange={(e) => handleInlineUpdate(item.id, { stock_status: e.target.value })}
              className={`text-[11px] font-mono px-2 py-1 border cursor-pointer ${
                item.stock_status === "in_stock"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                  : item.stock_status === "pre_order"
                  ? "bg-amber-50 text-amber-900 border-amber-300"
                  : "bg-red-50 text-red-900 border-red-300"
              }`}
            >
              <option value="in_stock">Ready Stock</option>
              <option value="pre_order">Pre-Order</option>
              <option value="out_of_stock">Stok Habis</option>
            </select>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
              <span>Qty:</span>
              <input
                type="number"
                defaultValue={item.tracked_quantity ?? ""}
                placeholder="∞"
                onBlur={(e) => {
                  const val = e.target.value.trim() === "" ? undefined : Number(e.target.value);
                  if (val !== item.tracked_quantity) {
                    handleInlineUpdate(item.id, { tracked_quantity: val });
                  }
                }}
                className={`w-14 px-1.5 py-0.5 border text-center text-xs font-mono ${
                  isLow ? "border-amber-500 bg-amber-50 text-amber-900 font-bold" : "border-[var(--border-hairline)] bg-white"
                }`}
                title="Kuantitas stok terlacak (kosongkan jika tak terbatas)"
              />
              {isLow && (
                <span className="text-[10px] text-amber-700 font-bold" title="Stok di bawah batas minimum">
                  ⚠️ Menipis
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "visibility",
      header: "Visibilitas",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <button
            onClick={() => handleInlineUpdate(item.id, { is_visible: !item.is_visible })}
            className={`p-1.5 border transition-colors cursor-pointer ${
              item.is_visible
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                : "bg-neutral-100 text-neutral-500 border-neutral-300 hover:bg-neutral-200"
            }`}
            title={item.is_visible ? "Sembunyikan dari katalog publik" : "Tampilkan di katalog publik"}
          >
            {item.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        );
      },
    },
    {
      id: "actions",
      header: "Tindakan",
      cell: ({ row }) => {
        const item = row.original;
        const isBusy = actionLoadingId === item.id;

        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setEditorProductId(item.id)}
              disabled={isBusy}
              className="px-2.5 py-1.5 border border-[var(--border-hairline)] bg-white text-xs font-mono uppercase hover:border-black cursor-pointer flex items-center gap-1 transition-colors"
              title="Edit spesifikasi lengkap & varian"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => handleDuplicate(item.id)}
              disabled={isBusy}
              className="p-1.5 border border-[var(--border-hairline)] bg-white hover:border-black cursor-pointer transition-colors"
              title="Duplikasi produk"
            >
              <Copy className="w-3.5 h-3.5 text-neutral-600" />
            </button>
            <button
              onClick={() => handleDeleteOrRestore(item.id, Boolean(item.deleted_at))}
              disabled={isBusy}
              className={`p-1.5 border cursor-pointer transition-colors ${
                item.deleted_at
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : "border-red-200 bg-white text-red-600 hover:bg-red-50"
              }`}
              title={item.deleted_at ? "Pulihkan produk" : "Hapus produk (soft delete)"}
            >
              {item.deleted_at ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        );
      },
    },
  ], [
    brands,
    categories,
    editingPriceId,
    tempPrice,
    actionLoadingId,
  ]);

  const table = useReactTable({
    data: products,
    columns,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  });

  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length;

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

      {/* Header & Quick Links */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase font-mono">
            Katalog & Manajemen Stok
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            Total {total} produk terdaftar • Update harga, stok terlacak, dan varian secara real-time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/products/data-quality"
            className="px-3 py-2 border border-amber-300 bg-amber-50 text-amber-900 font-mono text-xs uppercase font-bold hover:bg-amber-100 flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Data Quality Queue
          </Link>
          <Link
            href="/admin/categories"
            className="px-3 py-2 border border-[var(--border-hairline)] bg-white font-mono text-xs uppercase font-semibold hover:border-black flex items-center gap-1.5"
          >
            <FolderTree className="w-3.5 h-3.5" /> Kategori & Brand
          </Link>
          <button
            onClick={() => setEditorProductId(null)}
            className="px-4 py-2 bg-black text-white font-mono text-xs uppercase font-bold hover:bg-neutral-800 cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Tambah Produk
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[var(--border-hairline)] p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama produk, SKU, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchProducts()}
              className="w-full pl-9 pr-3 py-2 bg-white border border-[var(--border-hairline)] text-xs font-mono focus:border-black outline-none"
            />
          </div>

          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-[var(--border-hairline)] text-xs font-mono cursor-pointer"
          >
            <option value="all">Semua Brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-[var(--border-hairline)] text-xs font-mono cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Secondary Filters & Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-hairline)] text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4">
            {/* Stock Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">Stok:</span>
              <select
                value={selectedStock}
                onChange={(e) => {
                  setSelectedStock(e.target.value);
                  setPage(1);
                }}
                className="px-2 py-1 bg-white border border-[var(--border-hairline)] text-xs font-mono"
              >
                <option value="all">Semua</option>
                <option value="in_stock">Ready Stock</option>
                <option value="pre_order">Pre-Order</option>
                <option value="out_of_stock">Stok Habis</option>
              </select>
            </div>

            {/* Visibility Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">Visibilitas:</span>
              <select
                value={selectedVisibility}
                onChange={(e) => {
                  setSelectedVisibility(e.target.value);
                  setPage(1);
                }}
                className="px-2 py-1 bg-white border border-[var(--border-hairline)] text-xs font-mono"
              >
                <option value="all">Semua</option>
                <option value="visible">Publik</option>
                <option value="hidden">Tersembunyi</option>
              </select>
            </div>

            {/* Price = 0 Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={priceZeroOnly}
                onChange={(e) => {
                  setPriceZeroOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-[var(--border-hairline)] accent-black"
              />
              <span className={priceZeroOnly ? "text-red-700 font-bold" : "text-[var(--text-muted)]"}>
                Harga Rp 0 Saja
              </span>
            </label>

            {/* Trash Tab Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inTrash}
                onChange={(e) => {
                  setInTrash(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-[var(--border-hairline)] accent-black"
              />
              <span className={inTrash ? "text-amber-800 font-bold" : "text-[var(--text-muted)]"}>
                Tempat Sampah ({inTrash ? "Aktif" : "Non-aktif"})
              </span>
            </label>
          </div>

          <button
            onClick={() => {
              setSearch("");
              setSelectedBrand("all");
              setSelectedCategory("all");
              setSelectedStock("all");
              setSelectedVisibility("all");
              setPriceZeroOnly(false);
              setInTrash(false);
              setPage(1);
            }}
            className="text-[var(--text-muted)] hover:text-black hover:underline cursor-pointer"
          >
            Reset Semua Filter
          </button>
        </div>
      </div>

      {/* Bulk Actions Floating Bar */}
      {selectedCount > 0 && (
        <div className="bg-black text-white p-3 flex flex-wrap items-center justify-between gap-3 font-mono text-xs shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-neutral-800 px-2 py-1">{selectedCount}</span>
            <span>produk dipilih</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkAction("set_stock_status", "in_stock")}
              disabled={bulkLoading}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 cursor-pointer uppercase"
            >
              Set Ready Stock
            </button>
            <button
              onClick={() => handleBulkAction("set_stock_status", "pre_order")}
              disabled={bulkLoading}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 cursor-pointer uppercase"
            >
              Set Pre-Order
            </button>
            <button
              onClick={() => handleBulkAction("set_stock_status", "out_of_stock")}
              disabled={bulkLoading}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 cursor-pointer uppercase"
            >
              Set Stok Habis
            </button>
            <button
              onClick={() => handleBulkAction("set_visibility", true)}
              disabled={bulkLoading}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 cursor-pointer uppercase"
            >
              Publikasikan
            </button>
            <button
              onClick={() => handleBulkAction("set_visibility", false)}
              disabled={bulkLoading}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 cursor-pointer uppercase"
            >
              Sembunyikan
            </button>
            {inTrash ? (
              <button
                onClick={() => handleBulkAction("restore")}
                disabled={bulkLoading}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 cursor-pointer uppercase font-bold"
              >
                Pulihkan Terpilih
              </button>
            ) : (
              <button
                onClick={() => handleBulkAction("delete")}
                disabled={bulkLoading}
                className="px-2.5 py-1 bg-red-700 hover:bg-red-600 cursor-pointer uppercase font-bold"
              >
                Buang Terpilih
              </button>
            )}
            <button
              onClick={() => setRowSelection({})}
              className="px-2 py-1 text-neutral-400 hover:text-white cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white border border-[var(--border-hairline)] overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center font-mono text-xs text-[var(--text-muted)] space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-black" />
            <p>Memuat daftar katalog produk...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-[var(--text-muted)] space-y-3">
            <Package className="w-8 h-8 mx-auto text-neutral-300" />
            <p>Tidak ada produk ditemukan untuk kriteria filter ini.</p>
            <button
              onClick={() => setEditorProductId(null)}
              className="px-3 py-1.5 bg-black text-white text-xs uppercase font-bold cursor-pointer"
            >
              Tambah Produk Pertama
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="p-3 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] text-xs">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-neutral-50/60 transition-colors ${
                    row.getIsSelected() ? "bg-neutral-100/70" : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && products.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-[var(--text-muted)]">
          <div>
            Menampilkan halaman <span className="font-bold text-black">{page}</span> dari{" "}
            <span className="font-bold text-black">{totalPages}</span> ({total} total produk)
          </div>

          <div className="flex items-center gap-2">
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-white border border-[var(--border-hairline)] cursor-pointer text-xs font-mono"
            >
              <option value={10}>10 per hal</option>
              <option value={20}>20 per hal</option>
              <option value={50}>50 per hal</option>
              <option value={100}>100 per hal</option>
            </select>

            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border border-[var(--border-hairline)] bg-white disabled:opacity-40 cursor-pointer hover:border-black"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border border-[var(--border-hairline)] bg-white disabled:opacity-40 cursor-pointer hover:border-black"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Product Editor Modal */}
      {editorProductId !== undefined && (
        <ProductEditorModal
          productId={editorProductId}
          brands={brands}
          categories={categories}
          onSuccess={() => {
            setEditorProductId(undefined);
            showToast("success", "Katalog berhasil diperbarui");
            fetchProducts();
          }}
          onClose={() => setEditorProductId(undefined)}
        />
      )}
    </div>
  );
}
