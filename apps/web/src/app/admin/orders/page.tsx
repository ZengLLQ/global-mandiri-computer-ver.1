"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  Download,
  Filter,
  CheckCircle,
  Clock,
  Printer,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  Store,
  MessageCircle,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { formatPriceIdr } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { OrderDetailDrawer } from "@/components/admin/order-detail-drawer";
import { PaymentVerificationDialog } from "@/components/admin/payment-verification-dialog";
import { ManualOrderModal } from "@/components/admin/manual-order-modal";
import { ReceiptModal } from "@/components/admin/receipt-modal";
import { AdminOrder } from "@/stores/admin-store";

interface OrderListItem {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  total_amount_idr: number;
  status: string;
  source: string;
  gift_wrapping: boolean;
  items_count: number;
  first_product_name: string;
  has_proof: boolean;
  created_at: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Modals & Drawers
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [verificationTarget, setVerificationTarget] = useState<OrderListItem | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<AdminOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        status: statusFilter,
        source: sourceFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await apiClient(`/api/v1/admin/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, statusFilter, sourceFilter, sortBy, sortOrder, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time updates via Server-Sent Events (SSE)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/v1/admin/events/sse");
      eventSource.addEventListener("order_created", () => {
        fetchOrders();
      });
      eventSource.addEventListener("order_status_updated", () => {
        fetchOrders();
      });
      eventSource.addEventListener("proof_uploaded", () => {
        fetchOrders();
      });
      eventSource.addEventListener("payment_verified", () => {
        fetchOrders();
      });
      eventSource.addEventListener("payment_rejected", () => {
        fetchOrders();
      });
    } catch {
      // SSE fallback
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [fetchOrders]);

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        search: search.trim(),
      });
      const res = await apiClient(`/api/v1/admin/orders/export-csv?${params.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gmc_orders_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      alert("Gagal mengunduh CSV");
    }
  };

  const handleBulkMarkPacked = async () => {
    const selectedIds = Object.keys(rowSelection).map((idx) => orders[parseInt(idx)]?.id).filter(Boolean);
    if (!selectedIds.length) return;

    if (!confirm(`Tandai ${selectedIds.length} pesanan terpilih sebagai DIKEMAS?`)) return;

    for (const id of selectedIds) {
      await apiClient(`/api/v1/admin/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "packed", note: "Bulk update packing" }),
      });
    }
    setRowSelection({});
    fetchOrders();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_payment":
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-100 text-amber-800 rounded-sm">MENUNGGU BAYAR</span>;
      case "proof_uploaded":
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-100 text-blue-800 rounded-sm">BUKTI DIUNGGAH</span>;
      case "paid":
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded-sm">LUNAS</span>;
      case "packed":
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 rounded-sm">DIKEMAS</span>;
      case "ready_pickup":
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-100 text-purple-800 rounded-sm">SIAP AMBIL</span>;
      case "shipped":
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800 rounded-sm">DIKIRIM</span>;
      case "done":
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-neutral-200 text-neutral-800 rounded-sm">SELESAI</span>;
      case "cancelled":
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-100 text-red-800 rounded-sm">BATAL</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-neutral-100 text-neutral-700 rounded-sm">{status}</span>;
    }
  };

  const STATUS_TABS = [
    { id: "all", label: "Semua" },
    { id: "pending_payment", label: "Menunggu Bayar" },
    { id: "proof_uploaded", label: "Bukti Diunggah" },
    { id: "paid", label: "Lunas" },
    { id: "packed", label: "Dikemas" },
    { id: "ready_pickup", label: "Siap Ambil" },
    { id: "done", label: "Selesai" },
    { id: "cancelled", label: "Dibatalkan" },
  ];

  // TanStack Columns definition
  const columns = useMemo<ColumnDef<OrderListItem>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="rounded-sm accent-black w-3.5 h-3.5 cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            className="rounded-sm accent-black w-3.5 h-3.5 cursor-pointer"
          />
        ),
      },
      {
        accessorKey: "order_number",
        header: "NO. PESANAN",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div>
              <span className="font-mono font-bold text-xs block text-[var(--text-primary)]">
                {item.order_number}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {new Date(item.created_at).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                  dateStyle: "short",
                  timeStyle: "short",
                })}{" "}
                WIB
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "customer_name",
        header: "PELANGGAN",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div>
              <span className="font-bold text-xs block text-[var(--text-primary)]">
                {item.customer_name}
              </span>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                {item.customer_phone}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "first_product_name",
        header: "PRODUK",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="max-w-[200px]">
              <span className="text-xs truncate block text-[var(--text-primary)]" title={item.first_product_name}>
                {item.first_product_name}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {item.items_count > 1 ? `+${item.items_count - 1} item lainnya` : "1 unit"}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "source",
        header: "SUMBER",
        cell: ({ row }) => {
          const src = row.original.source;
          return (
            <span className="text-[11px] font-mono uppercase text-[var(--text-secondary)]">
              {src === "in_store" ? "Gerai ITC" : src === "whatsapp" ? "WhatsApp" : "Website"}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "STATUS",
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: "total_amount_idr",
        header: "TOTAL",
        cell: ({ row }) => (
          <span className="font-mono font-bold text-xs">
            {formatPriceIdr(row.original.total_amount_idr)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "AKSI",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {item.status === "proof_uploaded" && (
                <button
                  type="button"
                  onClick={() => setVerificationTarget(item)}
                  className="px-2.5 py-1 bg-black text-white hover:bg-neutral-800 text-[10px] font-mono font-bold rounded-md flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Verifikasi Bukti Transfer"
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>VERIFIKASI</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedOrderId(item.id)}
                className="p-1.5 border border-[var(--border-hairline)] rounded-md hover:bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                title="Rincian Pesanan"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const printable: AdminOrder = {
                    orderNumber: item.order_number,
                    fullName: item.customer_name,
                    phone: item.customer_phone,
                    address: item.shipping_address,
                    shippingMethod: item.source === "in_store" ? "pickup" : "delivery",
                    totalAmountIdr: item.total_amount_idr,
                    status: item.status as any,
                    createdAt: item.created_at,
                    items: [
                      {
                        productName: item.first_product_name,
                        quantity: item.items_count,
                        priceIdr: item.total_amount_idr,
                      },
                    ],
                  };
                  setReceiptTarget(printable);
                }}
                className="p-1.5 border border-[var(--border-hairline)] rounded-md hover:bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                title="Cetak Nota"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: orders,
    columns,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-6">
      {/* Verification Dialog */}
      {verificationTarget && (
        <PaymentVerificationDialog
          orderId={verificationTarget.id}
          orderNumber={verificationTarget.order_number}
          customerName={verificationTarget.customer_name}
          expectedAmountIdr={verificationTarget.total_amount_idr}
          paymentMethod="Transfer BCA"
          onSuccess={() => {
            fetchOrders();
          }}
          onClose={() => setVerificationTarget(null)}
        />
      )}

      {/* Manual Order Creation Modal */}
      {showManualModal && (
        <ManualOrderModal
          onSuccess={(id) => {
            fetchOrders();
            setSelectedOrderId(id);
          }}
          onClose={() => setShowManualModal(false)}
        />
      )}

      {/* Order Detail Drawer */}
      {selectedOrderId && (
        <OrderDetailDrawer
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onRefresh={fetchOrders}
          onVerifyPayment={(detail) => {
            setVerificationTarget(detail.order);
          }}
        />
      )}

      {/* Receipt Modal */}
      {receiptTarget && (
        <ReceiptModal order={receiptTarget} onClose={() => setReceiptTarget(null)} />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">
              MANAJEMEN PESANAN
            </h1>
            <span className="font-mono text-xs px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full font-bold">
              {total} TOTAL
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Alur status pesanan, verifikasi bukti transfer BCA, cetak nota resmi dan aksi WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchOrders}
            className="p-2 border border-[var(--border-hairline)] rounded-xl hover:bg-[var(--bg-card)] cursor-pointer text-xs flex items-center gap-1 font-bold"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden md:inline">REFRESH</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 border border-[var(--border-hairline)] rounded-xl hover:bg-[var(--bg-card)] cursor-pointer text-xs flex items-center gap-1.5 font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EKSPOR CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="editorial-btn px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>PESANAN MANUAL (WALK-IN)</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="space-y-3">
        {/* Status Horizontal Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[var(--border-hairline)] no-scrollbar">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                statusFilter === tab.id
                  ? "bg-[var(--text-primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Source Dropdowns */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Cari nomor pesanan, nama pelanggan, atau nomor telepon..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs border border-[var(--border-hairline)] bg-[var(--bg-card)] focus:outline-hidden focus:ring-1 focus:ring-black"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] cursor-pointer"
            >
              <option value="all">Semua Sumber</option>
              <option value="website">Website</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="in_store">Walk-in ITC</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-");
                setSortBy(sb);
                setSortOrder(so as any);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] cursor-pointer font-mono"
            >
              <option value="created_at-desc">Terbaru</option>
              <option value="created_at-asc">Terlama</option>
              <option value="total_amount_idr-desc">Nominal Tertinggi</option>
              <option value="total_amount_idr-asc">Nominal Terendah</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (when rows selected) */}
      {selectedCount > 0 && (
        <div className="p-3 bg-neutral-900 text-white rounded-2xl flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold bg-white text-black px-2 py-0.5 rounded-sm">
              {selectedCount}
            </span>
            <span>pesanan terpilih</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkMarkPacked}
              className="px-3 py-1 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 cursor-pointer text-xs"
            >
              Tandai Dikemas
            </button>
            <button
              onClick={() => setRowSelection({})}
              className="px-2 py-1 text-neutral-400 hover:text-white cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Orders Data Table */}
      <div className="border border-[var(--border-hairline)] rounded-2xl overflow-hidden bg-[var(--bg-card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] bg-neutral-50/50 dark:bg-neutral-900/40 text-[10px] font-mono uppercase text-[var(--text-muted)]">
                {table.getHeaderGroups().map((headerGroup) =>
                  headerGroup.headers.map((header) => (
                    <th key={header.id} className="p-3 font-bold">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-12 text-center text-xs text-[var(--text-muted)]">
                    <div className="w-5 h-5 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Memuat data pesanan...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-12 text-center text-xs text-[var(--text-muted)]">
                    <ShoppingBag className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                    Tidak ada pesanan yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedOrderId(row.original.id)}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-900/50 cursor-pointer transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-3 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-3 text-xs bg-neutral-50/30 dark:bg-neutral-900/20">
          <div className="text-[var(--text-muted)] font-mono text-[11px]">
            Halaman {page} dari {totalPages} • Total {total} pesanan
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border border-[var(--border-hairline)] rounded-lg hover:bg-[var(--bg-canvas)] disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold text-xs px-2">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border border-[var(--border-hairline)] rounded-lg hover:bg-[var(--bg-canvas)] disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
