import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function DeliveryAndWarrantyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Modern Unified Header */}
      <Header />

      {/* Breadcrumb */}
      <div className="px-6 md:px-10 lg:px-12 pt-6">
        <div className="w-full text-micro-label text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text-primary)]">BERANDA</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-primary)]">PENGIRIMAN &amp; GARANSI RESMI</span>
        </div>
      </div>

      <main className="flex-1 w-full px-6 md:px-10 lg:px-12 py-12 space-y-12">
        <div className="border-b border-[var(--border-hairline)] pb-6">
          <p className="text-tech-tag mb-2">KEBIJAKAN TOKO &bull; DISTRIBUTOR RESMI</p>
          <h1 className="text-display-l">
            PENGIRIMAN &amp; <span className="text-slant-display">GARANSI.</span>
          </h1>
        </div>

        {/* Section 1: Unboxing Policy */}
        <section className="p-8 border border-[var(--border-hairline)] bg-[var(--bg-card)] rounded-2xl shadow-sm space-y-4">
          <span className="text-micro-label font-bold text-red-600 uppercase tracking-widest block">
            KEBIJAKAN MUTLAK KLAIM FISIK
          </span>
          <h2 className="text-xl font-bold uppercase">
            WAJIB REKAM VIDEO UNBOXING UTUH SAAT BUKA PAKET
          </h2>
          <div className="text-body text-[var(--text-primary)] text-sm space-y-3 leading-relaxed">
            <p>
              Demi kenyamanan dan perlindungan hak konsumen, <strong>WAJIB membuat rekaman video unboxing utuh tanpa jeda (cut/pause)</strong> mulai dari paket masih tersegel rapi di bagian luar (memperlihatkan label pengiriman/resi) hingga seluruh isi paket dan unit dikeluarkan serta dihidupkan untuk pertama kali.
            </p>
            <p>
              Komplain atas kekurangan unit/kelengkapan, cacat fisik barang, atau kerusakan akibat kelalaian kurir tidak dapat diproses apabila tidak disertai bukti rekaman video unboxing tersebut.
            </p>
          </div>
        </section>

        {/* Section 2: Warranty Coverage */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-tight pb-2 border-b border-[var(--border-hairline)]">
            GARANSI RESMI DISTRIBUTOR INDONESIA
          </h2>
          <div className="text-body text-[var(--text-muted)] text-sm space-y-3 leading-relaxed">
            <p>
              Seluruh produk komputasi yang tercantum di katalog Global Mandiri Computer merupakan produk 100% baru, original, dan bergaransi resmi dari distributor utama di Indonesia (Asus, Lenovo, Acer, Apple Indonesia, HP, MSI, Axioo, Advan).
            </p>
            <p>
              Masa garansi berlaku sesuai ketentuan masing-masing brand (1 hingga 3 tahun). Klaim garansi hardware dapat dilakukan langsung di authorized service center resmi brand terkait di seluruh Indonesia hanya dengan membawa unit dan kartu garansi / invoice pembelian GMC.
            </p>
          </div>
        </section>

        {/* Section 3: Delivery Arrangement */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-tight pb-2 border-b border-[var(--border-hairline)]">
            PENGATURAN PENGIRIMAN &amp; AMBIL DI TOKO
          </h2>
          <div className="text-body text-[var(--text-muted)] text-sm space-y-3 leading-relaxed">
            <p>
              <strong>1. Ambil Langsung di Toko:</strong> Pembeli dipersilakan mengambil langsung unit di toko kami (ITC Mega Grosir Lantai B5 No. 7). Anda dapat memeriksa kondisi fisik unit dan segel box bersama teknisi kami sebelum serah terima.
            </p>
            <p>
              <strong>2. Pengiriman Kurir / Ekspedisi:</strong> Untuk pembeli luar kota atau yang menghendaki pengiriman ke alamat, pengiriman dikoordinasikan langsung melalui WhatsApp dengan opsi packing kayu dan asuransi pengiriman penuh.
            </p>
          </div>
        </section>

        <div className="pt-6 border-t border-[var(--border-hairline)]">
          <Link href="/katalog" className="editorial-btn text-xs px-8 py-3.5">
            JELAJAHI KATALOG PRODUK &rarr;
          </Link>
        </div>
      </main>

      {/* Unified Elevated Footer Component */}
      <Footer />
    </div>
  );
}
