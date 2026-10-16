import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Modern Unified Header */}
      <Header />

      {/* Breadcrumb */}
      <div className="px-6 pt-6">
        <div className="max-w-[1000px] mx-auto text-micro-label text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text-primary)]">BERANDA</Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-[var(--text-primary)]">BLOG</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-primary)]">ARTIKEL</span>
        </div>
      </div>

      <main className="flex-1 max-w-[1000px] w-full mx-auto px-6 py-12 space-y-10">
        <div>
          <span className="text-micro-label text-[var(--text-muted)] tracking-widest block mb-2">
            PANDUAN PEMBELIAN &bull; 08 OKTOBER 2026
          </span>
          <h1 className="text-display-l mb-6 leading-tight">
            PANDUAN MEMILIH LAPTOP KANTOR DAN PRODUKTIVITAS DI TAHUN 2026
          </h1>
          <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-muted)] pb-6 border-b border-[var(--border-hairline)]">
            <span>OLEH: TIM TEKNIS GLOBAL MANDIRI COMPUTER</span>
            <span>&bull;</span>
            <span>WAKTU BACA: 4 MENIT</span>
          </div>
        </div>

        {/* Article Body Content */}
        <div className="text-body space-y-6 text-sm text-[var(--text-primary)] leading-relaxed">
          <p className="text-base font-semibold">
            Memilih laptop untuk kebutuhan kantor dan operasional bisnis menuntut keseimbangan antara durabilitas fisik, kestabilan sistem operasi, dan kelayakan spesifikasi untuk pemakaian 3 hingga 5 tahun ke depan.
          </p>

          <h2 className="text-lg font-bold uppercase tracking-tight pt-4 border-t border-[var(--border-hairline)]">
            1. RAM 16GB Sebagai Standar Minimum Baru
          </h2>
          <p>
            Di tahun 2026, membuka puluhan tab browser modern, software spreadsheet berukuran besar, serta aplikasi meeting online (seperti Zoom atau Teams) secara simultan mengonsumsi lebih dari 8GB RAM. Memilih varian 16GB DDR5 atau LPDDR5X memastikan sistem operasi Windows 11 tetap responsif tanpa mengalami bottle-necking swapping memory ke SSD.
          </p>

          <h2 className="text-lg font-bold uppercase tracking-tight pt-4 border-t border-[var(--border-hairline)]">
            2. Kecepatan Storage NVMe Gen 4
          </h2>
          <p>
            Kapasitas 512GB PCIe NVMe SSD merupakan titik manis (sweet spot) untuk operasional kantor. Kecepatan baca di atas 3500 MB/s menjamin booting dalam hitungan detik dan pembukaan file presentasi berat tanpa lag.
          </p>

          <h2 className="text-lg font-bold uppercase tracking-tight pt-4 border-t border-[var(--border-hairline)]">
            3. Mengapa Garansi Resmi Distributor Mutlak Diperlukan
          </h2>
          <p>
            Sebagai retailer resmi di ITC Mega Grosir, Global Mandiri Computer senantiasa menekankan pentingnya garansi resmi distributor Indonesia (Asus, Lenovo, Acer, HP, Apple Indonesia). Garansi resmi melindungi aset perusahaan Anda dari risiko kelangkaan suku cadang dan memastikan perbaikan dilakukan oleh teknisi bersertifikasi pabrikan.
          </p>
        </div>

        <div className="pt-8 border-t border-[var(--border-hairline)] flex justify-between items-center">
          <Link href="/blog" className="editorial-link text-xs">
            &larr; KEMBALI KE DAFTAR BLOG
          </Link>
          <Link href="/katalog" className="editorial-btn text-xs px-6 py-3">
            LIHAT REKOMENDASI LAPTOP KANTOR &rarr;
          </Link>
        </div>
      </main>

      {/* Unified Elevated Footer Component */}
      <Footer />
    </div>
  );
}
