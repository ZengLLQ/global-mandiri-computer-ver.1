import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function BlogIndexPage() {
  const articles = [
    {
      slug: "tips-memilih-laptop-kantor-2026",
      title: "PANDUAN MEMILIH LAPTOP KANTOR DAN PRODUKTIVITAS DI TAHUN 2026",
      date: "08 OKTOBER 2026",
      category: "PANDUAN PEMBELIAN",
      excerpt: "Cara menentukan spesifikasi minimal prosesor, RAM 16GB sebagai standar baru, efisiensi baterai, dan jaminan after-sales garansi resmi Indonesia untuk kelancaran kerja jangka panjang.",
      author: "TIM TEKNIS GMC",
    },
    {
      slug: "garansi-resmi-vs-distributor-hak-konsumen",
      title: "GARANSI RESMI DISTRIBUTOR INDONESIA VS DISTRIBUTOR PARALEL: APA PERBEDAANNYA?",
      date: "02 OKTOBER 2026",
      category: "EDUKASI KONSUMEN",
      excerpt: "Memahami mengapa seluruh unit di Global Mandiri Computer hanya bersumber dari distributor resmi (Asus, Lenovo, Acer, Apple, HP, MSI) demi kemudahan klaim di service center resmi.",
      author: "TIM TEKNIS GMC",
    },
    {
      slug: "intel-core-ultra-vs-amd-ryzen-ai",
      title: "INTEL CORE ULTRA VS AMD RYZEN AI: MANA YANG LEBIH TEPAT UNTUK KEBUTUHAN ANDA?",
      date: "25 SEPTEMBER 2026",
      category: "KOMPARASI SPESIFIKASI",
      excerpt: "Bedah arsitektur NPU bawaan pada lini prosesor laptop generasi terbaru: performa baterai, akselerasi AI lokal, dan kemampuan olah grafis terintegrasi.",
      author: "TIM TEKNIS GMC",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Modern Unified Header */}
      <Header />

      {/* Breadcrumb */}
      <div className="px-6 md:px-10 lg:px-12 pt-6">
        <div className="w-full text-micro-label text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text-primary)]">BERANDA</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-primary)]">ARTIKEL &amp; BLOG</span>
        </div>
      </div>

      <main className="flex-1 w-full px-6 md:px-10 lg:px-12 py-12">
        <div className="mb-12 pb-4 border-b border-[var(--border-hairline)]">
          <p className="text-tech-tag mb-2">PANDUAN &amp; INSIGHT TEKNOLOGI</p>
          <h1 className="text-display-xl">
            BLOG &amp; <span className="text-slant-display">EDUKASI.</span>
          </h1>
        </div>

        <div className="divide-y divide-[var(--border-hairline)] border border-[var(--border-hairline)] bg-[var(--bg-card)]/30 rounded-2xl p-6 md:p-10 shadow-sm">
          {articles.map((art, idx) => (
            <article key={art.slug} className="py-10 first:pt-2 last:pb-2 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-3 space-y-1">
                <span className="text-micro-label text-[var(--text-muted)] block">
                  0{idx + 1} &bull; {art.category}
                </span>
                <span className="text-xs font-mono font-bold block">{art.date}</span>
                <span className="text-[0.625rem] text-[var(--text-muted)] uppercase block pt-2">
                  DITULIS OLEH: {art.author}
                </span>
              </div>

              <div className="md:col-span-9 space-y-4">
                <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight hover:underline underline-offset-4 decoration-1">
                  <Link href={`/blog/${art.slug}`}>
                    {art.title}
                  </Link>
                </h2>
                <p className="text-body text-[var(--text-muted)] text-sm max-w-3xl leading-relaxed">
                  {art.excerpt}
                </p>
                <div className="pt-2">
                  <Link href={`/blog/${art.slug}`} className="editorial-link text-xs">
                    BACA ARTIKEL LENGKAP &rarr;
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Unified Elevated Footer Component */}
      <Footer />
    </div>
  );
}
