"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Users,
  Search,
  Download,
  Filter,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Phone,
  Mail,
  Tag,
  Plus,
  X,
  FileText,
  Clock,
  ShoppingBag,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { formatPriceIdr } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface CustomerListItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  total_orders: number;
  total_spent_idr: number;
  last_order_at?: string | null;
  tags: string[];
  notes_count: number;
  created_at: string;
}

interface CustomerNote {
  id: string;
  user_id: string;
  author_name: string;
  note: string;
  created_at: string;
}

interface CustomerDetail {
  customer: CustomerListItem;
  orders: {
    id: string;
    order_number: string;
    total_amount_idr: number;
    status: string;
    source: string;
    created_at: string;
  }[];
  notes: CustomerNote[];
  tags: string[];
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sortBy, setSortBy] = useState("total_spent");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Detail Drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New Note & Tag inputs
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isSubmittingTag, setIsSubmittingTag] = useState(false);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (search.trim()) params.set("search", search.trim());
      if (selectedTag !== "all") params.set("tag", selectedTag);

      const res = await apiClient(`/api/v1/admin/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy, sortOrder, search, selectedTag]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Load Customer Detail
  const loadCustomerDetail = async (id: string) => {
    setSelectedCustomerId(id);
    setDetailLoading(true);
    try {
      const res = await apiClient(`/api/v1/admin/customers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
      } else {
        showToast("error", "Gagal memuat profil pelanggan");
      }
    } catch {
      showToast("error", "Kesalahan koneksi");
    } finally {
      setDetailLoading(false);
    }
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedCustomerId) return;

    setIsSubmittingNote(true);
    try {
      const res = await apiClient(`/api/v1/admin/customers/${selectedCustomerId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: newNote.trim() }),
      });
      if (res.ok) {
        showToast("success", "Catatan staf berhasil ditambahkan");
        setNewNote("");
        loadCustomerDetail(selectedCustomerId);
        fetchCustomers();
      } else {
        showToast("error", "Gagal menambahkan catatan");
      }
    } catch {
      showToast("error", "Kesalahan koneksi");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Add Tag
  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim() || !selectedCustomerId) return;

    setIsSubmittingTag(true);
    try {
      const res = await apiClient(`/api/v1/admin/customers/${selectedCustomerId}/tags`, {
        method: "POST",
        body: JSON.stringify({ tag: newTag.trim() }),
      });
      if (res.ok) {
        showToast("success", "Tag pelanggan berhasil ditambahkan");
        setNewTag("");
        loadCustomerDetail(selectedCustomerId);
        fetchCustomers();
      } else {
        showToast("error", "Gagal menambahkan tag");
      }
    } catch {
      showToast("error", "Kesalahan koneksi");
    } finally {
      setIsSubmittingTag(false);
    }
  };

  // Remove Tag
  const handleRemoveTag = async (tag: string) => {
    if (!selectedCustomerId) return;

    try {
      const res = await apiClient(
        `/api/v1/admin/customers/${selectedCustomerId}/tags/${encodeURIComponent(tag)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        showToast("success", "Tag berhasil dihapus");
        loadCustomerDetail(selectedCustomerId);
        fetchCustomers();
      }
    } catch {
      showToast("error", "Gagal menghapus tag");
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const res = await apiClient("/api/v1/admin/customers/export-csv");
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pelanggan_gmc_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast("success", "File CSV pelanggan berhasil diunduh");
      }
    } catch {
      showToast("error", "Gagal mengunduh CSV");
    }
  };

  // TanStack columns
  const columns = useMemo<ColumnDef<CustomerListItem>[]>(() => [
    {
      accessorKey: "name",
      header: "Nama Pelanggan",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="space-y-0.5">
            <span
              onClick={() => loadCustomerDetail(item.id)}
              className="font-medium text-sm text-[var(--text-primary)] hover:underline cursor-pointer block"
            >
              {item.name}
            </span>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-neutral-400" /> {item.phone || "-"}
              </span>
              {item.email && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-neutral-400" /> {item.email}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "total_spent_idr",
      header: "Total Belanja (IDR)",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold tnum text-[var(--text-primary)]">
          {formatPriceIdr(row.original.total_spent_idr)}
        </span>
      ),
    },
    {
      accessorKey: "total_orders",
      header: "Pesanan",
      cell: ({ row }) => (
        <span className="font-mono text-xs tnum bg-neutral-100 px-2 py-0.5 border border-neutral-200">
          {row.original.total_orders} pesanan
        </span>
      ),
    },
    {
      accessorKey: "tags",
      header: "Tag & Catatan",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-wrap items-center gap-1 max-w-xs">
            {item.tags.length === 0 && item.notes_count === 0 && (
              <span className="text-[11px] font-mono text-neutral-400">-</span>
            )}
            {item.tags.map((t) => (
              <span
                key={t}
                className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 font-semibold"
              >
                {t}
              </span>
            ))}
            {item.notes_count > 0 && (
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-sky-50 text-sky-900 border border-sky-300 font-semibold flex items-center gap-0.5">
                <FileText className="w-2.5 h-2.5" /> {item.notes_count} note
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "last_order_at",
      header: "Pesanan Terakhir",
      cell: ({ row }) => {
        const d = row.original.last_order_at;
        return (
          <span className="font-mono text-xs text-[var(--text-muted)]">
            {d ? new Date(d).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "-"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <button
          onClick={() => loadCustomerDetail(row.original.id)}
          className="px-2.5 py-1 border border-[var(--border-hairline)] bg-white text-xs font-mono uppercase hover:border-black cursor-pointer"
        >
          Detail
        </button>
      ),
    },
  ], []);

  const table = useReactTable({
    data: customers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Unique tags across customers for filter
  const allUniqueTags = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => c.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [customers]);

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
            <Users className="w-5 h-5" /> Manajemen Pelanggan
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            Total {total} pelanggan terdaftar & pembeli katalog GMC Surabaya
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 border border-[var(--border-hairline)] bg-white font-mono text-xs uppercase font-semibold hover:border-black flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV (Excel)
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[var(--border-hairline)] p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama pelanggan, nomor telepon, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchCustomers()}
              className="w-full pl-9 pr-3 py-2 bg-white border border-[var(--border-hairline)] text-xs font-mono focus:border-black outline-none"
            />
          </div>

          {/* Tag Filter */}
          <select
            value={selectedTag}
            onChange={(e) => {
              setSelectedTag(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-[var(--border-hairline)] text-xs font-mono cursor-pointer"
          >
            <option value="all">Semua Tag Pelanggan</option>
            {allUniqueTags.map((tag) => (
              <option key={tag} value={tag}>
                Tag: {tag}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-[var(--border-hairline)] text-xs font-mono cursor-pointer"
          >
            <option value="total_spent">Urutkan: Total Belanja Tertinggi</option>
            <option value="total_orders">Urutkan: Jumlah Pesanan Terbanyak</option>
            <option value="name">Urutkan: Nama (A-Z)</option>
            <option value="created_at">Urutkan: Pelanggan Terbaru</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[var(--border-hairline)] overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center font-mono text-xs text-[var(--text-muted)] space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-black" />
            <p>Memuat direktori pelanggan GMC...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-[var(--text-muted)] space-y-2">
            <Users className="w-8 h-8 mx-auto text-neutral-300" />
            <p>Tidak ada pelanggan yang cocok dengan kriteria pencarian.</p>
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
                <tr key={row.id} className="hover:bg-neutral-50/60 transition-colors">
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
      {!loading && customers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-[var(--text-muted)]">
          <div>
            Menampilkan halaman <span className="font-bold text-black">{page}</span> dari{" "}
            <span className="font-bold text-black">{totalPages}</span> ({total} pelanggan)
          </div>

          <div className="flex items-center gap-2">
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

      {/* Customer Detail Drawer */}
      {selectedCustomerId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end backdrop-blur-2xs">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-[var(--border-hairline)] animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[var(--border-hairline)] flex items-center justify-between">
              <span className="font-mono text-sm font-bold uppercase flex items-center gap-2">
                <Users className="w-4 h-4" /> Profil & Riwayat Pelanggan
              </span>
              <button
                onClick={() => {
                  setSelectedCustomerId(null);
                  setDetailData(null);
                }}
                className="p-1 text-[var(--text-muted)] hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs font-mono">
              {detailLoading || !detailData ? (
                <div className="p-12 text-center text-[var(--text-muted)] space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-black" />
                  <p>Memuat data pelanggan...</p>
                </div>
              ) : (
                <>
                  {/* Basic Profile */}
                  <div className="p-4 border border-[var(--border-hairline)] bg-[var(--bg-canvas)] space-y-2">
                    <div className="text-base font-bold text-[var(--text-primary)]">
                      {detailData.customer.name}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-muted)]">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="text-[var(--text-primary)]">{detailData.customer.phone || "-"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="text-[var(--text-primary)]">{detailData.customer.email || "-"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t border-[var(--border-hairline)]">
                      <div>
                        <span className="text-[10px] uppercase text-[var(--text-muted)] block">Total Belanja</span>
                        <span className="text-sm font-bold text-emerald-800 tnum">
                          {formatPriceIdr(detailData.customer.total_spent_idr)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-[var(--text-muted)] block">Total Pesanan</span>
                        <span className="text-sm font-bold text-[var(--text-primary)] tnum">
                          {detailData.customer.total_orders} transaksi
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Tags Manager */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
                      Tag Segmentasi Pelanggan
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {detailData.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-1 bg-neutral-100 border border-neutral-300 text-[10px] font-bold uppercase flex items-center gap-1.5"
                        >
                          {t}
                          <button
                            onClick={() => handleRemoveTag(t)}
                            className="hover:text-red-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <form onSubmit={handleAddTag} className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Tambah tag baru (contoh: VIP, Reseller, Grosir)"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-[var(--border-hairline)] text-xs font-mono outline-none focus:border-black"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingTag || !newTag.trim()}
                        className="px-3 py-1.5 bg-black text-white uppercase font-bold text-xs cursor-pointer hover:bg-neutral-800"
                      >
                        Tambah
                      </button>
                    </form>
                  </div>

                  {/* Internal Staff Notes */}
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-neutral-500" /> Catatan Internal Staf (Hanya Terlihat Staf)
                    </span>

                    {detailData.notes.length === 0 ? (
                      <p className="text-[11px] text-[var(--text-muted)] italic">
                        Belum ada catatan internal untuk pelanggan ini.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {detailData.notes.map((note) => (
                          <div
                            key={note.id}
                            className="p-3 border border-[var(--border-hairline)] bg-neutral-50/70 space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                              <span className="font-bold text-neutral-800">{note.author_name}</span>
                              <span>{new Date(note.created_at).toLocaleString("id-ID")}</span>
                            </div>
                            <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                              {note.note}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <form onSubmit={handleAddNote} className="space-y-2">
                      <textarea
                        rows={2}
                        placeholder="Tulis catatan penting terkait kebiasaan, preferensi, atau komitmen pelanggan..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="w-full p-2.5 border border-[var(--border-hairline)] text-xs font-mono outline-none focus:border-black resize-none"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingNote || !newNote.trim()}
                        className="px-4 py-1.5 bg-black text-white uppercase font-bold text-xs cursor-pointer hover:bg-neutral-800"
                      >
                        Simpan Catatan
                      </button>
                    </form>
                  </div>

                  {/* Order History */}
                  <div className="space-y-3 pt-3 border-t border-[var(--border-hairline)]">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-neutral-500" /> Riwayat Transaksi ({detailData.orders.length})
                    </span>

                    {detailData.orders.length === 0 ? (
                      <p className="text-[11px] text-[var(--text-muted)] italic">
                        Belum ada riwayat pesanan tercatat.
                      </p>
                    ) : (
                      <div className="divide-y divide-[var(--border-hairline)] border border-[var(--border-hairline)]">
                        {detailData.orders.map((ord) => (
                          <div key={ord.id} className="p-3 flex items-center justify-between hover:bg-neutral-50/60">
                            <div>
                              <div className="font-bold text-xs text-[var(--text-primary)]">
                                {ord.order_number}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)]">
                                {new Date(ord.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })} • Sumber: {ord.source}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-xs tnum">
                                {formatPriceIdr(ord.total_amount_idr)}
                              </div>
                              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 border border-neutral-300 bg-neutral-100">
                                {ord.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
