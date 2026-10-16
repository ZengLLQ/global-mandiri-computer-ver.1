-- Seed Initial Data for Global Mandiri Computer (GMC)

-- 1. Default Admin User (Password: admin123)
INSERT INTO users (id, email, password_hash, full_name, phone, role)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@gmc.co.id',
    '$argon2id$v=19$m=65536,t=3,p=4$uzZbE1LVKym+4LbJj+znkw$5iPRYpAjFVtUlsFWDvebgiigq/WarVMWzAEG86+IZl8',
    'Administrator GMC',
    '+628113225678',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- 2. Store Settings
INSERT INTO store_settings (key, value, description) VALUES
('store_name', 'Global Mandiri Computer', 'Nama lengkap gerai resmi'),
('store_short_name', 'GMC', 'Wordmark singkatan toko'),
('tagline', 'Pusat Komputasi Andal & Terpercaya Surabaya', 'Tagline resmi toko'),
('address', 'ITC Mega Grosir B5 No. 7, Jl. Gembong No. 20-30, Kapasan, Kec. Simokerto, Surabaya, Jawa Timur 60141', 'Alamat toko fisik di Surabaya'),
('whatsapp_number', '+628113225678', 'Nomor WhatsApp resmi layanan sales'),
('whatsapp_url', 'https://wa.me/628113225678', 'Tautan langsung chat WhatsApp'),
('email', 'blessingteknologi@gmail.com', 'Alamat email korespondensi toko'),
('opening_hours', 'Senin - Sabtu, 10.00 - 17.00 WIB', 'Jam operasional gerai fisik dan chat'),
('bca_account_number', '1301510191', 'Nomor rekening BCA untuk transfer manual'),
('bca_account_name', 'LILY ALI', 'Nama pemilik rekening BCA'),
('bca_bank_name', 'Bank Central Asia (BCA)', 'Nama bank tujuan transfer'),
('gift_wrapping_price_idr', '25000', 'Tarif kemasan kado tambahan (IDR)'),
('price_disclaimer', 'Harga dapat berubah sewaktu-waktu. Hubungi tim sales kami.', 'Peringatan harga dinamis'),
('unboxing_terms', 'WAJIB Video Unboxing paket sampai selesai buka. Tidak menerima komplain kendala fisik atau kelengkapan tanpa video unboxing tanpa jeda.', 'Syarat klaim unboxing paket')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Core Categories
INSERT INTO categories (id, name, slug, description, sort_order) VALUES
('c0000000-0000-0000-0000-000000000001', 'Laptop', 'laptop', 'Laptop komputasi harian, bisnis, dan gaming resmi', 1),
('c0000000-0000-0000-0000-000000000002', 'MacBook', 'macbook', 'Lini laptop Apple MacBook Air dan MacBook Pro bertenaga Apple Silicon', 2),
('c0000000-0000-0000-0000-000000000003', 'PC Desktop', 'pc-desktop', 'Komputer desktop tower performa tinggi dan build-up', 3),
('c0000000-0000-0000-0000-000000000004', 'All-in-One', 'all-in-one', 'Komputer ringkas hemat ruang dengan layar terintegrasi untuk kantor dan rumah', 4),
('c0000000-0000-0000-0000-000000000005', 'Tablet', 'tablet', 'Tablet multifungsi edukasi, grafis, dan hiburan', 5),
('c0000000-0000-0000-0000-000000000006', 'Paket', 'paket', 'Paket hemat bundling komputer PC lengkap dengan monitor resmi', 6),
('c0000000-0000-0000-0000-000000000007', 'Smartphone', 'smartphone', 'Perangkat ponsel pintar Apple iPhone resmi', 7)
ON CONFLICT (slug) DO NOTHING;

-- 4. Core Brands
INSERT INTO brands (id, name, slug, description, sort_order) VALUES
('b0000000-0000-0000-0000-000000000001', 'ASUS', 'asus', 'ASUS Vivobook, Zenbook, ExpertBook, ROG & TUF Gaming', 1),
('b0000000-0000-0000-0000-000000000002', 'LENOVO', 'lenovo', 'Lenovo IdeaPad, ThinkPad, Yoga, LOQ & Legion', 2),
('b0000000-0000-0000-0000-000000000003', 'ACER', 'acer', 'Acer Aspire, Swift, TravelMate, Nitro & Predator', 3),
('b0000000-0000-0000-0000-000000000004', 'HP', 'hp', 'HP Pavilion, Envy, OmniBook, Victus & OMEN', 4),
('b0000000-0000-0000-0000-000000000005', 'MSI', 'msi', 'MSI Modern, Prestige, Thin, Cyborg, Katana & Vector', 5),
('b0000000-0000-0000-0000-000000000006', 'APPLE', 'apple', 'Apple MacBook Air, MacBook Pro & iPhone resmi', 6),
('b0000000-0000-0000-0000-000000000007', 'AXIOO', 'axioo', 'Axioo Hype, Slimbook & Pongo Gaming Indonesia', 7),
('b0000000-0000-0000-0000-000000000008', 'ADVAN', 'advan', 'Advan Soulmate, Workmate, Workplus & AIO One PC', 8),
('b0000000-0000-0000-0000-000000000009', 'COLORFUL', 'colorful', 'Colorful Evol & Rimbook Gaming', 9),
('b0000000-0000-0000-0000-000000000010', 'INFINIX', 'infinix', 'Infinix InBook & XBook Series', 10)
ON CONFLICT (slug) DO NOTHING;

-- 5. Seed 3 Blog Posts
INSERT INTO blog_posts (id, slug, title, excerpt, content, author_name, is_published, published_at) VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    'panduan-memilih-laptop-gaming-rtx-50-series',
    'Panduan Memilih Laptop Gaming Generasi Terbaru NVIDIA RTX 50 Series',
    'Kupas tuntas arsitektur kartu grafis RTX 5050 hingga RTX 5090 untuk kebutuhan rendering 3D, kecerdasan buatan, dan kompetisi gaming.',
    'Perkembangan kartu grafis laptop telah mencapai lompatan signifikan dengan hadirnya jajaran GPU NVIDIA GeForce RTX 50 Series (Blackwell Architecture). Di Global Mandiri Computer, kami menyediakan berbagai lini laptop yang dipersenjatai RTX 5050 hingga RTX 5090 dari brand ternama seperti ASUS ROG/TUF, Lenovo Legion, Acer Predator, dan MSI Katana.\n\n### 1. RTX 5050 vs RTX 5060: Titik Seimbang Mainstream\nBagi pengguna yang membutuhkan mesin serbaguna untuk pengeditan video 4K dan bermain game AAA pada resolusi 1080p/1200p, RTX 5050 dan RTX 5060 memberikan efisiensi daya luar biasa berkat memori GDDR7 terbaru.\n\n### 2. RTX 5070 hingga RTX 5090: Performa Tanpa Kompromi\nBagi kreator konten profesional, arsitek 3D, dan peneliti AI, memori grafis hingga 24GB pada RTX 5090 menghadirkan performa komputasi level workstation dalam form-factor laptop yang portabel.\n\nKunjungi toko kami di ITC Mega Grosir Surabaya atau hubungi sales kami via WhatsApp untuk mendapatkan konsultasi spesifikasi yang paling tepat untuk alur kerja Anda.',
    'Tim Teknis GMC',
    TRUE,
    NOW() - INTERVAL '3 days'
),
(
    'e0000000-0000-0000-0000-000000000002',
    'mengapa-komputer-all-in-one-pilihan-tepat-kantor-modern',
    'Mengapa Komputer All-in-One Jadi Solusi Ideal untuk Kantor & Resepsionis',
    'Solusi hemat tempat, konsumsi daya rendah, dan estetika meja kerja bersih tanpa kerumitan kabel tower.',
    'Dalam era ruang kerja minimalis, efisiensi meja kerja menjadi pertimbangan krusial bagi perusahaan, instansi, maupun klinik dan kantor pelayanan publik. Komputer All-in-One (AIO) menyatukan komponen komputasi, monitor FHD/IPS, speaker, dan kamera langsung dalam satu bingkai ramping.\n\n### Keunggulan Utama AIO di GMC:\n1. **Kerapian Meja Kerja**: Hanya membutuhkan satu kabel daya utama. Keyboard dan mouse nirkabel membuat area meja pelayanan tampak profesional dan bersih.\n2. **Layar Luas 21.5 hingga 27 Inci**: Sudut pandang panel IPS 99% sRGB memberikan kenyamanan visual sepanjang hari bagi staf administrasi.\n3. **Garansi Resmi Pabrikan**: Tersedia lini AIO dari ASUS ExpertCenter, Lenovo IdeaCentre, HP 24-cr, hingga Advan One PC dengan garansi resmi 1 hingga 3 tahun onsite service.',
    'Tim Sales Komersial GMC',
    TRUE,
    NOW() - INTERVAL '7 days'
),
(
    'e0000000-0000-0000-0000-000000000003',
    'tips-merawat-baterai-laptop-tahan-lama',
    '5 Tips Praktis Merawat Kesehatan Baterai Laptop Agar Awet Bertahun-tahun',
    'Langkah mudah mengatur ambang batas pengisian daya, suhu operasional, dan manajemen sirkulasi udara pada laptop modern.',
    'Baterai merupakan salah satu komponen yang paling sering mengalami penurunan performa jika tidak dirawat dengan benar. Berikut lima panduan praktis dari teknisi Global Mandiri Computer:\n\n1. **Aktifkan Battery Health Charging**: Laptop modern ASUS, Lenovo, dan HP memiliki fitur pembatas pengisian (80%) saat terus-menerus terhubung ke adaptor listrik.\n2. **Hindari Permukaan Kasur atau Bantal**: Sirkulasi udara bawah laptop harus selalu terbuka agar komponen baterai tidak terpapar panas berlebih.\n3. **Jangan Biarkan Baterai 0% Terlalu Sering**: Usahakan melakukan pengisian daya ketika kapasitas mencapai 20%.\n4. **Gunakan Charger Original**: Fluktuasi daya dari adaptor tidak resmi dapat merusak sirkuit manajemen daya internal laptop.\n5. **Pembersihan Rutin Kipas Pendingin**: Bawa laptop Anda secara berkala ke gerai kami di ITC Mega Grosir Surabaya untuk perawatan pasta termal dan pembersihan debu sirkulasi.',
    'Layanan Servis GMC',
    TRUE,
    NOW() - INTERVAL '12 days'
)
ON CONFLICT (slug) DO NOTHING;
