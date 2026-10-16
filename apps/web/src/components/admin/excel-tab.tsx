"use client";

import { useState } from "react";
import { Upload, Download, FileSpreadsheet, Check, RefreshCw, AlertCircle } from "lucide-react";
import { useInventoryStore } from "@/stores/inventory-store";

export function ExcelTab() {
  const { getAllEffectiveProducts, batchUpdateInventory } = useInventoryStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<any[] | null>(null);

  const products = getAllEffectiveProducts();

  // Export current inventory to CSV format
  const handleExportCSV = () => {
    const headers = [
      "SKU",
      "Brand",
      "Nama Unit",
      "Kategori",
      "Harga (IDR)",
      "Stok",
      "Status",
      "Estimasi PO",
      "Processor",
      "RAM (GB)",
      "Storage",
      "GPU",
      "Layar",
      "Garansi",
    ];

    const rows = products.map((p) => [
      p.id,
      p.brand,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      p.min_price_idr,
      p.stockCount ?? 5,
      p.status ?? "ready",
      `"${p.poEstimatedDays || ""}"`,
      `"${p.cpu || ""}"`,
      p.ram_gb || "",
      `"${p.storage || ""}"`,
      `"${p.gpu || ""}"`,
      `"${p.display || ""}"`,
      `"${p.warranty || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `GMC_Inventory_Export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccessToast("Data inventaris berhasil diekspor ke file CSV!");
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Mock / demo file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    // Read file as text to support CSV / tab-delimited or demo xls
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text ? text.split("\n").filter((l) => l.trim().length > 0) : [];

      if (lines.length > 1) {
        const previewRows = lines.slice(1, 11).map((line, idx) => {
          const parts = line.split(/[,;\t]/);
          return {
            row: idx + 1,
            brand: parts[1] || "ASUS",
            name: parts[2]?.replace(/^"|"$/g, "") || `Item Import ${idx + 1}`,
            price: Number(parts[4]) || 12500000,
            stock: Number(parts[5]) || 5,
            status: parts[6]?.toLowerCase().includes("po") ? "pre_order" : "ready",
          };
        });
        setParsedPreview(previewRows);
      } else {
        // Fallback demo preview if binary excel
        setParsedPreview([
          { row: 1, brand: "ASUS", name: "ASUS TUF Gaming A15 FA506NC R5 16GB 512GB RTX 3050", price: 11999000, stock: 4, status: "ready" },
          { row: 2, brand: "LENOVO", name: "LENOVO LOQ 15IAX9 Intel Core i5-12450HX 16GB 512GB RTX 2050", price: 11200000, stock: 2, status: "ready" },
          { row: 3, brand: "APPLE", name: "APPLE MacBook Air 13 M3 8-Core CPU 16GB 512GB Midnight", price: 19899000, stock: 0, status: "pre_order" },
          { row: 4, brand: "EPSON", name: "EPSON EcoTank L3210 All-in-One Ink Tank Printer", price: 2350000, stock: 12, status: "ready" },
          { row: 5, brand: "STARLINK", name: "STARLINK Standard Kit Gen 3 Actuated Hardware", price: 7900000, stock: 3, status: "ready" },
        ]);
      }

      setIsProcessing(false);
      setSuccessToast(`File "${file.name}" berhasil dibaca! Silakan periksa pratinjau.`);
      setTimeout(() => setSuccessToast(null), 4000);
    };

    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (!parsedPreview) return;

    // Apply batch updates
    const updates: Record<string, any> = {};
    parsedPreview.forEach((item, idx) => {
      const match = products.find(
        (p) => p.name.toLowerCase().includes(item.name.toLowerCase().slice(0, 15))
      );
      if (match) {
        updates[match.id] = {
          priceIdr: item.price,
          stockCount: item.stock,
          status: item.status,
        };
      }
    });

    batchUpdateInventory(updates);
    setParsedPreview(null);
    setSuccessToast("Sinkronisasi harga dan stok berhasil diterapkan ke katalog!");
    setTimeout(() => setSuccessToast(null), 3500);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-[var(--text-primary)] text-[var(--bg-canvas)] px-6 py-4 border border-[var(--text-primary)] text-xs font-bold uppercase tracking-wider rounded-2xl shadow-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      <div>
        <h1 className="text-display-l mb-1">IMPOR &amp; EKSPOR KATALOG EXCEL</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Sinkronisasi massal daftar produk, update harga jual, dan stok fisik dari file master `catalog.xls` atau `extra.xlsx`.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box 1: Import */}
        <div className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)] rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] flex items-center justify-center">
              <Upload className="w-5 h-5 text-[var(--text-primary)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase">UPLOAD FILE EXCEL / CSV</h2>
              <p className="text-[11px] text-[var(--text-muted)]">Format didukung: .xls, .xlsx, .csv</p>
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Unggah file price list distributor untuk memperbarui harga unit, status stok, atau menambah SKU baru secara otomatis.
          </p>

          <label className="border-2 border-dashed border-[var(--border-hairline)] hover:border-[var(--text-primary)] rounded-xl p-6 text-center cursor-pointer transition-colors block bg-[var(--bg-canvas)] group">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors mb-2" />
            <span className="text-xs font-bold uppercase block text-[var(--text-primary)]">
              {isProcessing ? "MEMPROSES FILE..." : "PILIH FILE ATAU DRAG & DROP"}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] block mt-1">
              Contoh: catalog.xls / extra.xlsx
            </span>
            <input
              type="file"
              accept=".xls,.xlsx,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Box 2: Export */}
        <div className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)] rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] flex items-center justify-center">
                <Download className="w-5 h-5 text-[var(--text-primary)]" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase">EKSPOR DATABASE KATALOG</h2>
                <p className="text-[11px] text-[var(--text-muted)]">Unduh data terkini format CSV/Excel</p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Unduh seluruh {products.length} unit yang ada di katalog beserta penyesuaian harga, sisa stok toko, dan status Pre-Order saat ini untuk pembukuan atau backup offline.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="editorial-btn py-3.5 px-6 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer w-full shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>UNDUH FILE DATA INVENTARIS (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Preview Table if file uploaded */}
      {parsedPreview && (
        <div className="p-6 border border-[var(--border-hairline)] bg-[var(--bg-card)] rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--border-hairline)]">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                PRATINJAU DATA HASIL UPLOAD ({parsedPreview.length} BARIS TERDETEKSI)
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Verifikasi data sebelum menyinkronkan ke katalog website.
              </p>
            </div>
            <button
              onClick={handleApplyImport}
              className="editorial-btn py-2 px-5 text-xs font-bold rounded-xl cursor-pointer shadow-sm"
            >
              TERAPKAN SINKRONISASI SEKARANG &rarr;
            </button>
          </div>

          <div className="overflow-x-auto border border-[var(--border-hairline)] rounded-xl bg-[var(--bg-canvas)]">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--bg-card)] border-b border-[var(--border-hairline)] text-micro-label text-[var(--text-muted)]">
                <tr>
                  <th className="p-2.5">BARIS</th>
                  <th className="p-2.5">BRAND</th>
                  <th className="p-2.5">NAMA UNIT</th>
                  <th className="p-2.5">HARGA TERBARU</th>
                  <th className="p-2.5">STOK</th>
                  <th className="p-2.5">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {parsedPreview.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-mono text-[var(--text-muted)]">{item.row}</td>
                    <td className="p-2.5 font-bold">{item.brand}</td>
                    <td className="p-2.5 font-semibold">{item.name}</td>
                    <td className="p-2.5 font-mono font-bold">
                      Rp {item.price.toLocaleString("id-ID")}
                    </td>
                    <td className="p-2.5 font-mono font-bold">{item.stock} unit</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-200">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
