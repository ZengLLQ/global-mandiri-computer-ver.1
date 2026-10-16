"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Star,
  Trash2,
  Reply,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface ReviewItem {
  id: string;
  product_id: string;
  product_name: string;
  user_id: string;
  customer_name: string;
  rating: number;
  headline: string;
  content: string;
  is_verified_purchase: boolean;
  status: "pending" | "approved" | "rejected" | string;
  admin_reply?: string | null;
  admin_reply_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Counts
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Modals
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        status: statusFilter,
      });
      if (ratingFilter !== "all") params.set("rating", ratingFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await apiClient(`/api/v1/admin/reviews?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
        setPendingCount(data.pending_count || 0);
        setApprovedCount(data.approved_count || 0);
        setRejectedCount(data.rejected_count || 0);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, statusFilter, ratingFilter, search]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Moderate Single Review
  const handleModerate = async (id: string, status: "approved" | "rejected", reason?: string) => {
    try {
      const res = await apiClient(`/api/v1/admin/reviews/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          rejection_reason: reason || null,
        }),
      });
      if (res.ok) {
        showToast("success", status === "approved" ? "Ulasan disetujui" : "Ulasan ditolak");
        setRejectTargetId(null);
        setRejectReason("");
        fetchReviews();
      } else {
        showToast("error", "Gagal memoderasi ulasan");
      }
    } catch {
      showToast("error", "Kesalahan koneksi");
    }
  };

  // Reply Review
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTargetId || !replyText.trim()) return;

    try {
      const res = await apiClient(`/api/v1/admin/reviews/${replyTargetId}/reply`, {
        method: "POST",
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      if (res.ok) {
        showToast("success", "Balasan staf berhasil dipublikasikan");
        setReplyTargetId(null);
        setReplyText("");
        fetchReviews();
      } else {
        showToast("error", "Gagal mengirim balasan");
      }
    } catch {
      showToast("error", "Kesalahan koneksi");
    }
  };

  // Delete Review
  const handleDelete = async (id: string) => {
    if (!confirm("Hapus ulasan ini secara permanen?")) return;

    try {
      const res = await apiClient(`/api/v1/admin/reviews/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("success", "Ulasan berhasil dihapus");
        fetchReviews();
      } else {
        showToast("error", "Gagal menghapus ulasan");
      }
    } catch {
      showToast("error", "Kesalahan koneksi");
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action: "approve" | "reject" | "delete") => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Terapkan aksi '${action}' pada ${selectedIds.length} ulasan terpilih?`)) return;

    setBulkLoading(true);
    try {
      const res = await apiClient("/api/v1/admin/reviews/bulk", {
        method: "POST",
        body: JSON.stringify({
          action,
          review_ids: selectedIds,
        }),
      });
      if (res.ok) {
        showToast("success", `Aksi massal berhasil diterapkan pada ${selectedIds.length} ulasan`);
        setSelectedIds([]);
        fetchReviews();
      } else {
        showToast("error", "Gagal menerapkan aksi massal");
      }
    } catch {
      showToast("error", "Kesalahan jaringan");
    } finally {
      setBulkLoading(false);
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
            <MessageSquare className="w-5 h-5" /> Moderasi Ulasan Produk
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            Tinjau feedback pembeli, cegah spam, dan tanggapi pertanyaan atau ulasan pelanggan
          </p>
        </div>

        <button
          onClick={fetchReviews}
          disabled={loading}
          className="px-3 py-1.5 border border-[var(--border-hairline)] bg-white font-mono text-xs uppercase hover:border-black flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Muat Ulang
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex border-b border-[var(--border-hairline)] overflow-x-auto text-xs font-mono">
        <button
          onClick={() => {
            setStatusFilter("all");
            setPage(1);
          }}
          className={`px-5 py-3 font-bold uppercase border-b-2 cursor-pointer transition-colors ${
            statusFilter === "all"
              ? "border-black text-black"
              : "border-transparent text-[var(--text-muted)] hover:text-black"
          }`}
        >
          Semua ({total})
        </button>
        <button
          onClick={() => {
            setStatusFilter("pending");
            setPage(1);
          }}
          className={`px-5 py-3 font-bold uppercase border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
            statusFilter === "pending"
              ? "border-amber-600 text-amber-900"
              : "border-transparent text-[var(--text-muted)] hover:text-black"
          }`}
        >
          <span>Menunggu Moderasi</span>
          {pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 border border-amber-300 text-[10px]">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setStatusFilter("approved");
            setPage(1);
          }}
          className={`px-5 py-3 font-bold uppercase border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
            statusFilter === "approved"
              ? "border-emerald-600 text-emerald-900"
              : "border-transparent text-[var(--text-muted)] hover:text-black"
          }`}
        >
          <span>Disetujui</span>
          <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.2 border border-emerald-300 text-[10px]">
            {approvedCount}
          </span>
        </button>
        <button
          onClick={() => {
            setStatusFilter("rejected");
            setPage(1);
          }}
          className={`px-5 py-3 font-bold uppercase border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
            statusFilter === "rejected"
              ? "border-red-600 text-red-900"
              : "border-transparent text-[var(--text-muted)] hover:text-black"
          }`}
        >
          <span>Ditolak</span>
          <span className="bg-red-100 text-red-900 px-1.5 py-0.2 border border-red-300 text-[10px]">
            {rejectedCount}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[var(--border-hairline)] p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-3">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama produk, nama reviewer, atau kata dalam ulasan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchReviews()}
              className="w-full pl-9 pr-3 py-2 bg-white border border-[var(--border-hairline)] text-xs font-mono focus:border-black outline-none"
            />
          </div>

          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-[var(--border-hairline)] text-xs font-mono cursor-pointer"
          >
            <option value="all">Semua Bintang</option>
            <option value="5">★★★★★ (5 Bintang)</option>
            <option value="4">★★★★☆ (4 Bintang)</option>
            <option value="3">★★★☆☆ (3 Bintang)</option>
            <option value="2">★★☆☆☆ (2 Bintang)</option>
            <option value="1">★☆☆☆☆ (1 Bintang)</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-black text-white p-3 flex flex-wrap items-center justify-between gap-3 font-mono text-xs shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-neutral-800 px-2 py-1">{selectedIds.length}</span>
            <span>ulasan dipilih</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction("approve")}
              disabled={bulkLoading}
              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 cursor-pointer uppercase font-bold"
            >
              Setujui Terpilih
            </button>
            <button
              onClick={() => handleBulkAction("reject")}
              disabled={bulkLoading}
              className="px-3 py-1 bg-amber-700 hover:bg-amber-600 cursor-pointer uppercase font-bold"
            >
              Tolak Terpilih
            </button>
            <button
              onClick={() => handleBulkAction("delete")}
              disabled={bulkLoading}
              className="px-3 py-1 bg-red-700 hover:bg-red-600 cursor-pointer uppercase font-bold"
            >
              Hapus Terpilih
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2 py-1 text-neutral-400 hover:text-white cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Review List */}
      <div className="bg-white border border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)]">
        {loading ? (
          <div className="p-12 text-center font-mono text-xs text-[var(--text-muted)] space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-black" />
            <p>Memuat ulasan pelanggan...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-[var(--text-muted)] space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-neutral-300" />
            <p>Tidak ada ulasan ditemukan untuk filter ini.</p>
          </div>
        ) : (
          reviews.map((r) => {
            const isSelected = selectedIds.includes(r.id);

            return (
              <div
                key={r.id}
                className={`p-5 space-y-3 transition-colors ${
                  isSelected ? "bg-neutral-50" : "hover:bg-neutral-50/50"
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds((prev) => [...prev, r.id]);
                        } else {
                          setSelectedIds((prev) => prev.filter((id) => id !== r.id));
                        }
                      }}
                      className="rounded border-[var(--border-hairline)] w-4 h-4 cursor-pointer accent-black"
                    />

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[var(--text-primary)]">
                          {r.customer_name}
                        </span>
                        {r.is_verified_purchase && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" /> Pembeli Terverifikasi
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.2 border font-bold ${
                            r.status === "approved"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : r.status === "pending"
                              ? "bg-amber-50 text-amber-900 border-amber-300"
                              : "bg-red-50 text-red-900 border-red-300"
                          }`}
                        >
                          {r.status === "approved"
                            ? "Disetujui"
                            : r.status === "pending"
                            ? "Menunggu Moderasi"
                            : "Ditolak"}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        Untuk: <strong className="text-neutral-700">{r.product_name}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Rating Stars & Timestamp */}
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < r.rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {new Date(r.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="pl-7 space-y-1">
                  {r.headline && (
                    <div className="font-semibold text-xs text-[var(--text-primary)]">
                      {r.headline}
                    </div>
                  )}
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                    {r.content}
                  </p>

                  {/* Rejection Reason Notice */}
                  {r.status === "rejected" && r.rejection_reason && (
                    <div className="p-2 border border-red-200 bg-red-50 text-[11px] font-mono text-red-900 mt-2">
                      <strong>Alasan Penolakan:</strong> {r.rejection_reason}
                    </div>
                  )}

                  {/* Staff Reply */}
                  {r.admin_reply && (
                    <div className="p-3 border border-neutral-300 bg-neutral-100/70 text-xs font-mono space-y-1 mt-2">
                      <div className="text-[10px] uppercase font-bold text-neutral-700 flex items-center gap-1">
                        <Reply className="w-3 h-3 rotate-180" /> Balasan Resmi Global Mandiri Computer:
                      </div>
                      <p className="text-neutral-900 leading-relaxed">{r.admin_reply}</p>
                    </div>
                  )}
                </div>

                {/* Actions row */}
                <div className="pl-7 pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    {r.status !== "approved" && (
                      <button
                        onClick={() => handleModerate(r.id, "approved")}
                        className="px-2.5 py-1 bg-emerald-700 text-white uppercase font-bold hover:bg-emerald-600 cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Setujui
                      </button>
                    )}
                    {r.status !== "rejected" && (
                      <button
                        onClick={() => {
                          setRejectTargetId(r.id);
                          setRejectReason("");
                        }}
                        className="px-2.5 py-1 bg-red-700 text-white uppercase font-bold hover:bg-red-600 cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Tolak
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setReplyTargetId(r.id);
                        setReplyText(r.admin_reply || "");
                      }}
                      className="px-2.5 py-1 border border-[var(--border-hairline)] bg-white uppercase hover:border-black cursor-pointer flex items-center gap-1"
                    >
                      <Reply className="w-3 h-3" /> {r.admin_reply ? "Edit Balasan" : "Balas"}
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1 text-neutral-400 hover:text-red-700 cursor-pointer"
                    title="Hapus ulasan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-[var(--text-muted)]">
          <div>
            Menampilkan halaman <span className="font-bold text-black">{page}</span> dari{" "}
            <span className="font-bold text-black">{totalPages}</span> ({total} total ulasan)
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

      {/* Reject Modal Prompt */}
      {rejectTargetId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--border-hairline)] max-w-md w-full shadow-2xl p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <span className="font-bold uppercase text-red-900">Alasan Penolakan Ulasan</span>
              <button
                onClick={() => setRejectTargetId(null)}
                className="text-[var(--text-muted)] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[var(--text-muted)]">
              Masukkan alasan mengapa ulasan ini ditolak (misal: spam, kata kasar, atau tidak relevan):
            </p>

            <textarea
              rows={3}
              placeholder="Contoh: Mengandung promosi link eksternal yang tidak terkait"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2.5 border border-[var(--border-hairline)] outline-none focus:border-black resize-none"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-hairline)]">
              <button
                onClick={() => setRejectTargetId(null)}
                className="px-3 py-1.5 border uppercase cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleModerate(rejectTargetId, "rejected", rejectReason)}
                className="px-4 py-1.5 bg-red-700 text-white uppercase font-bold hover:bg-red-600 cursor-pointer"
              >
                Tolak Ulasan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal Prompt */}
      {replyTargetId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--border-hairline)] max-w-lg w-full shadow-2xl p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <span className="font-bold uppercase">Balas Ulasan Sebagai Global Mandiri Computer</span>
              <button
                onClick={() => setReplyTargetId(null)}
                className="text-[var(--text-muted)] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[var(--text-muted)]">
              Tanggapan ini akan tampil secara publik di bawah ulasan produk di katalog toko:
            </p>

            <textarea
              rows={4}
              placeholder="Terima kasih atas ulasannya! Kami senang Anda puas dengan unit dan pelayanan toko kami..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full p-2.5 border border-[var(--border-hairline)] outline-none focus:border-black resize-none"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-hairline)]">
              <button
                onClick={() => setReplyTargetId(null)}
                className="px-3 py-1.5 border uppercase cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleReply}
                disabled={!replyText.trim()}
                className="px-4 py-1.5 bg-black text-white uppercase font-bold hover:bg-neutral-800 cursor-pointer"
              >
                Publikasikan Balasan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
