# GLOBAL MANDIRI COMPUTER (GMC)
> **Pusat Komputasi & Retailer Resmi IT Surabaya**  
> ITC Mega Grosir Surabaya B5 No. 7, Jl. Gembong No. 20-30, Kapasan, Surabaya, Jawa Timur 60141  
> WhatsApp: [+62 811-3225-678](https://wa.me/628113225678) • Email: `blessingteknologi@gmail.com`

---

## 1. Ikhtisar Proyek (Project Overview)

Platform e-commerce *photo-free editorial* (Swiss Minimalist / M.N.M.L. aesthetic) berperforma tinggi untuk **Global Mandiri Computer (GMC)**. Sistem ini menggantikan ketergantungan foto produk dengan **tipografi editorial data-driven** dan **spec dashboard interaktif 3D** yang menampilkan spesifikasi perangkat keras (CPU, RAM, SSD, Layar, GPU) secara transparan dari katalog resmi distributor (581 produk dari 25 sheet file `catalog.xls`).

### Prinsip Utama & Scope Decisions
- **Photo-Free / Spec-First Design:** Desain sepenuhnya mengandalkan tipografi murni, *outlined brand wordmarks*, dan kartu spesifikasi matriks 2x2.
- **Strict Single Typeface:** Menggunakan satu-satunya jenis huruf keluarga **Inter Variable** (optical sizing auto, tabular numbers `tnum`, slashed zero `zero`, `case` uppercase alignment).
- **Smooth 3D Motion Physics:** Animasi kartu perspektif 3D (*perspective tilt* dengan spring physics, specular glare sheen, dan *translateZ* depth parallax), *tactile spring buttons*, dan *smooth layout expansions*.
- **Metode Pembayaran Manual BCA:** Pembayaran direct bank transfer BCA (a.n. LILY ALI) dengan fitur 1-klik salin nomor rekening, upload bukti transfer mandiri, dan konfirmasi instan ke WhatsApp toko. Nomor rekening tersimpan aman di database / konfigurasi environment dan tidak pernah di-hardcode di frontend source.
- **Pengaturan Pengiriman Transparan:** Pengiriman dikoordinasikan secara personal melalui WhatsApp (tanpa shipping calculator / tarif ekspedisi otomatis).

---

## 2. Arsitektur & Tech Stack

```
web-catalogue-gmc/
├── apps/
│   ├── web/               # Next.js 15 (App Router), TypeScript, Tailwind v4, Zustand, Framer Motion
│   └── api/               # Rust (Axum, Tokio, SQLx, Utoipa OpenAPI, Argon2, Calamine)
├── infra/                 # Dockerfiles (web & api) & deployment configurations
├── catalog.xls            # Price list sumber distributor (25 sheets)
├── docker-compose.yml     # Orkestrasi PostgreSQL 16 + Rust API + Next.js Web
└── README.md
```

### Frontend (`apps/web`)
- **Framework:** Next.js 15 App Router, React 19, TypeScript
- **Styling & Tokens:** Tailwind CSS v4, CSS Custom Variables (`--bg-canvas`, `--color-accent: #1447E6`, dll.)
- **Tipografi:** `@next/font/google` Inter Variable (`opsz`, `wght 100-900`)
- **Interaktivitas 3D:** Framer Motion (Perspective 3D tilt, spring tactile hover, smooth accordions)
- **State Management:** Zustand (Keranjang belanja persisten dengan LocalStorage)
- **Form & Validasi:** React Hook Form + Zod

### Backend (`apps/api`)
- **Bahasa & Web Framework:** Rust (edition 2021), Axum, Tokio async runtime
- **Database Client:** SQLx (PostgreSQL dengan compile-time checked queries & migrations)
- **Pencarian Cepat:** PostgreSQL Full-Text Search (`tsvector`) + `pg_trgm` (trigram similarity)
- **Dokumentasi API:** Utoipa + Swagger UI interaktif di `http://localhost:8080/docs`
- **Keamanan:** Argon2id password hashing, JWT authentication via HttpOnly cookies, CORS whitelist
- **Katalog Parser:** Calamine (Membaca file `.xls` BIFF8 biner secara native dan mengekstrak hardware specs)

---

## 3. Desain Sistem & Palet Warna

| Elemen | Token | Nilai Hex | Karakter & Penggunaan |
|---|---|---|---|
| **Canvas** | `--bg-canvas` | `#FBFBF9` | Warm off-white khas editorial cetak |
| **Cards** | `--bg-card` | `#F2F1ED` | Abu-abu lembut dengan kontras halus |
| **Footer** | `--bg-footer` | `#E8E4DC` | Warm beige untuk fondasi visual bagian bawah |
| **Hairline** | `--border-hairline` | `#E2DFD8` | Garis pembatas 1px tajam tanpa box-shadow |
| **Text Primary**| `--text-primary` | `#121212` | Hitam pekat untuk judul dan label teknis |
| **Text Muted** | `--text-muted` | `#706E68` | Abu-abu medium untuk deskripsi dan micro-label |
| **Accent** | `--color-accent` | `#1447E6` | Tech Cobalt Blue untuk fokus interaksi & link aktif |

---

## 4. Cara Menjalankan Server (Local Development)

### Opsi A: Menjalankan Langsung via Local Node.js & Cargo (Direkomendasikan untuk Dev Cepat)

#### 1. Persiapan Dependensi
Pastikan telah terpasang:
- **Node.js 20+** dan **pnpm 9+**
- **Rust toolchain 1.80+** (jika ingin menjalankan API backend lokal)

#### 2. Jalankan Frontend Web Storefront
```bash
# Instalasi dependensi monorepo
pnpm install

# Jalankan Next.js dev server pada port 3000
pnpm --filter web dev
```
Buka peramban di: **`http://localhost:3000`**

#### 3. Jalankan Backend REST API (Opsional untuk integrasi DB)
```bash
# Jalankan migrasi dan server API Axum
cargo run --manifest-path apps/api/Cargo.toml --bin server
```
Dokumentasi OpenAPI Swagger tersedia di: **`http://localhost:8080/docs`**

---

### Opsi B: Menjalankan Menggunakan Docker Compose (Full Stack)

Pastikan **Docker Desktop** sedang berjalan, lalu eksekusi dari root folder:
```bash
# Build dan jalankan seluruh container (Postgres, Rust API, Next.js Web)
docker compose up --build -d
```

- **Storefront Website:** `http://localhost:3000`
- **Backend API & Swagger:** `http://localhost:8080/docs`
- **PostgreSQL Database:** `localhost:5432` (`gmc_db`)

Untuk menghentikan:
```bash
docker compose down
```

---

## 5. Menjalankan Impor Data dari `catalog.xls`

Backend dilengkapi utilitas CLI Rust berbasis library `calamine` yang secara otomatis mengurai seluruh 25 sheet katalog dan mengelompokkan 582 baris SKU menjadi 581 produk induk dengan varian warna dan spesifikasi terstruktur:

```bash
# Menjalankan importer CLI
cargo run --manifest-path apps/api/Cargo.toml --bin import_catalog
```
Hasil pemrosesan juga disimpan dalam format JSON siap pakai di:
`apps/web/src/lib/catalog_seed.json`

---

## 6. Struktur Rute Halaman (Page Routes)

- **`/`** — *Beranda:* Headline Display XL, Tile Kategori Typographic 3D, Brand Marquee, & Pilihan Barang Baru.
- **`/katalog`** — *Katalog Lengkap:* Tab filter kategori beranimasi, panel filter geser inline (Brand, Segmen, RAM, Storage, CPU, Rentang Harga), dan grid kartu produk 3D.
- **`/katalog/[slug]`** — *Detail Produk:* Judul model responsif, 4-Card 3D Spec Dashboard (RAM, SSD, Layar, GPU), pemilih varian teks, kuantitas stepper, tombol CTA keranjang, accordion spesifikasi teknis, 3-kolom verified reviews, dan rekomendasi terkait.
- **`/keranjang`** — *Keranjang Belanja:* Ringkasan item, pengatur kuantitas, catatan pesanan, dan navigasi checkout.
- **`/checkout`** — *Checkout:* Formulir nama, nomor WhatsApp aktif, alamat pengiriman, dan catatan pesanan (tanpa kalkulator ongkir otomatis).
- **`/order/[orderNumber]`** — *Instruksi Pembayaran BCA:* Salin nomor rekening 1-klik, formulir konfirmasi bukti transfer, dan tombol hubungi WhatsApp langsung.
- **`/lacak`** — *Lacak Pesanan:* Pengecekan status verifikasi transaksi BCA dan pengiriman unit berdasarkan nomor pesanan resmi.
- **`/kontak`** — *Informasi Toko:* Jam operasional ITC Mega Grosir Surabaya, alamat peta, kontak CS, dan formulir konsultasi.
- **`/pengiriman-garansi`** — *Panduan Kebijakan:* Prosedur wajib video unboxing dan alur klaim garansi resmi distributor.
- **`/blog` & `/blog/[slug]`** — *Editorial Tech Guide:* Panduan pemilihan laptop, pemahaman TGP GPU, dan perbedaan layar OLED vs IPS.
- **`/admin`** — *Dashboard Operasional:* Manajemen stok katalog, verifikasi pesanan masuk, dan pengaturan informasi toko.
- **`/robots.txt` & `/sitemap.xml`** — *SEO Engine:* Indeks dinamis untuk 581+ produk katalog secara otomatis.

---

## 7. Lisensi & Hak Cipta
Hak Cipta © 2026 **Global Mandiri Computer (GMC)**. Seluruh hak cipta dilindungi undang-undang.
