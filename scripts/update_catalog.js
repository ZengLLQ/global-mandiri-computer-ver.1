const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const seedPath = path.join(__dirname, "../apps/web/src/lib/catalog_seed.json");
const rawData = JSON.parse(fs.readFileSync(seedPath, "utf8"));

// 1. Filter out PAKET BUNDLING and TABLET
let updatedProducts = rawData.filter(p => {
  const cat = (p.category || "").toUpperCase();
  if (cat === "PAKET BUNDLING" || cat === "PAKET" || cat === "TABLET") {
    return false;
  }
  return true;
});

// 2. Merge MACBOOK into LAPTOP and remove "is_new" distinction (per "hapus untuk BARU")
updatedProducts.forEach(p => {
  if (p.category === "MACBOOK") {
    p.category = "LAPTOP";
  }
  p.is_new = false;
});

// 3. New Products Definitions

// PRINTERS (Epson, HP, Brother, Canon)
const newPrinters = [
  // EPSON
  {
    name: "EPSON EcoTank L3210 All-in-One Ink Tank Printer",
    brand: "EPSON",
    category: "PRINTER",
    segment: "Home & Small Office",
    price: 2350000,
    specs: {
      screen_panel: "Ink Tank",
      screen_size: "A4 / Letter",
      storage: "Micro Piezo Printhead",
      cpu: "USB 2.0 High Speed",
      gpu: "Resolusi 5760 x 1440 dpi",
      bundled_items: "Tinta 4 Botol Original 003 (BK, C, M, Y) + Kabel USB",
      warranty: "Garansi Resmi Epson Indonesia 2 Tahun / 30.000 Lembar",
      cleaned_description: "Printer serbaguna EcoTank L3210 untuk cetak, scan, dan copy. Hemat biaya cetak hingga 4.500 halaman hitam dan 7.500 halaman warna per pengisian.",
      raw_spec_text: "Print, Scan, Copy | 5760 x 1440 dpi | Borderless 4R | Kecepatan hingga 10 ipm (Hitam) / 5.0 ipm (Warna) | USB 2.0"
    }
  },
  {
    name: "EPSON EcoTank L3250 Wi-Fi All-in-One Ink Tank Printer",
    brand: "EPSON",
    category: "PRINTER",
    segment: "Wireless Office",
    price: 2750000,
    specs: {
      screen_panel: "Ink Tank",
      screen_size: "A4 / F4",
      storage: "Wi-Fi & Wi-Fi Direct",
      cpu: "Epson Smart Panel App",
      gpu: "Resolusi 5760 x 1440 dpi",
      bundled_items: "Tinta 4 Botol 003 + Kabel Power + CD Driver",
      warranty: "Garansi Resmi Epson Indonesia 2 Tahun / 30.000 Lembar",
      cleaned_description: "Printer nirkabel serba guna dengan konektivitas Wi-Fi dan Wi-Fi Direct. Kontrol cetak mudah langsung dari smartphone via Epson Smart Panel.",
      raw_spec_text: "Print, Scan, Copy | Wi-Fi & Wi-Fi Direct | Borderless 4R | 10.0 ipm / 5.0 ipm | Kompatibel iOS & Android"
    }
  },
  {
    name: "EPSON EcoTank L121 Single Function Ink Tank Printer",
    brand: "EPSON",
    category: "PRINTER",
    segment: "Entry Level",
    price: 1650000,
    specs: {
      screen_panel: "Ink Tank",
      screen_size: "A4 / Legal",
      storage: "Print Only",
      cpu: "USB 2.0",
      gpu: "Resolusi 720 x 720 dpi",
      bundled_items: "Tinta Epson 664 Starter Pack + Kartu Garansi",
      warranty: "Garansi Resmi Epson Indonesia 2 Tahun / 20.000 Lembar",
      cleaned_description: "Printer single-function tangki tinta hemat tempat dengan biaya operasional super rendah untuk kebutuhan tugas harian dan kasir.",
      raw_spec_text: "Print Only | Kecepatan 9.0 ipm (Hitam) / 4.8 ipm (Warna) | Tangki Tinta Luar Ringkas | USB 2.0"
    }
  },
  {
    name: "EPSON EcoTank L5290 Wi-Fi ADF Fax All-in-One Printer",
    brand: "EPSON",
    category: "PRINTER",
    segment: "Corporate Office",
    price: 4450000,
    specs: {
      screen_panel: "Ink Tank + ADF",
      screen_size: "A4 / Legal",
      storage: "30-Sheet ADF + Fax",
      cpu: "Ethernet LAN & Wi-Fi Direct",
      gpu: "1.44\" Color LCD Screen",
      bundled_items: "Tinta 4 Botol 003 + Kabel LAN/RJ11 + USB",
      warranty: "Garansi Resmi Epson Indonesia 2 Tahun / 30.000 Lembar",
      cleaned_description: "All-in-one produktivitas tinggi dengan Automatic Document Feeder (ADF) 30 lembar, Fax, koneksi Ethernet jaringan kantor, dan Wi-Fi Direct.",
      raw_spec_text: "Print, Scan, Copy, Fax | ADF 30 Halaman | Layar LCD 1.44\" | Ethernet, Wi-Fi | 10.0 ipm / 5.0 ipm"
    }
  },
  {
    name: "EPSON EcoTank L15150 A3+ Duplex Wi-Fi All-in-One Printer",
    brand: "EPSON",
    category: "PRINTER",
    segment: "Enterprise & Design",
    price: 13999000,
    specs: {
      screen_panel: "PrecisionCore Heat-Free",
      screen_size: "A3+ / Wide Format",
      storage: "Auto Duplex A3 + Dual Tray 500 Lembar",
      cpu: "Ethernet, Wi-Fi Direct, USB Host",
      gpu: "Tinta Pigmen 4 Warna DURABrite ET",
      bundled_items: "Tinta Epson 008 Pigment Penuh + Tray Tambahan",
      warranty: "Garansi Resmi Epson Indonesia 2 Tahun / 80.000 Lembar",
      cleaned_description: "Solusi cetak kantor arsitektur, teknik, dan percetakan dokumen format besar A3+ dengan cetak bolak-balik otomatis (auto duplex) dan tinta pigmen tahan air.",
      raw_spec_text: "A3+ Print, Scan, Copy, Fax | Auto Duplex A3 | Kecepatan hingga 25 ipm | 4.3\" Layar Sentuh Warna"
    }
  },
  {
    name: "EPSON EcoTank L8050 6-Color Photo Wi-Fi Printer",
    brand: "EPSON",
    category: "PRINTER",
    segment: "Professional Photo",
    price: 4950000,
    specs: {
      screen_panel: "6-Color Dye Photo",
      screen_size: "A4 / 4R / CD-DVD / PVC ID Card",
      storage: "Slot Tray Cetak ID Card & CD",
      cpu: "Wi-Fi & Mobile App",
      gpu: "Resolusi 5760 x 1440 dpi",
      bundled_items: "Tinta 6 Botol 057 Series + Tray ID Card & CD",
      warranty: "Garansi Resmi Epson Indonesia 2 Tahun / 50.000 Lembar",
      cleaned_description: "Printer foto 6 warna profesional untuk studio foto, cetak kartu PVC / kartu nama, dan cetak sampul CD/DVD dengan gradasi warna sangat halus.",
      raw_spec_text: "6 Tinta Warna Foto (BK, C, M, Y, LC, LM) | Cetak Foto Borderless A4 | Tray PVC ID Card | Wi-Fi"
    }
  },

  // HP
  {
    name: "HP Smart Tank 580 All-in-One Wireless Ink Tank Printer",
    brand: "HP",
    category: "PRINTER",
    segment: "Home & Small Office",
    price: 2399000,
    specs: {
      screen_panel: "Thermal Inkjet Tank",
      screen_size: "A4 / Letter",
      storage: "Wi-Fi Self-Healing & Bluetooth LE",
      cpu: "HP Smart App + Smart Guided Buttons",
      gpu: "Resolusi Cetak 4800 x 1200 dpi",
      bundled_items: "Tinta HP GT53XL Black (hingga 6000 hal) + GT52 Color",
      warranty: "Garansi Resmi HP Indonesia 2 Tahun Onsite Service",
      cleaned_description: "Printer tangki tinta pintar dengan teknologi Wi-Fi self-healing yang otomatis memulihkan jaringan terputus, sensor tinta otomatis, dan biaya cetak rendah.",
      raw_spec_text: "Print, Scan, Copy | Wi-Fi Dual Band, BLE, USB 2.0 | Kecepatan hingga 12 ppm (Hitam) / 5 ppm (Warna) | Garansi Onsite"
    }
  },
  {
    name: "HP Smart Tank 520 All-in-One Ink Tank Printer",
    brand: "HP",
    category: "PRINTER",
    segment: "Entry Office",
    price: 1999000,
    specs: {
      screen_panel: "Thermal Inkjet Tank",
      screen_size: "A4 / Legal",
      storage: "Print, Scan, Copy",
      cpu: "USB 2.0 High Speed",
      gpu: "Resolusi 4800 x 1200 dpi",
      bundled_items: "Tinta HP GT53 Hitam + GT52 Warna Penuh",
      warranty: "Garansi Resmi HP Indonesia 2 Tahun Onsite",
      cleaned_description: "Solusi cetak hemat biaya harian dengan pengisian anti-tumpah, kapasitas input 100 lembar, dan hasil cetak teks tajam tahan luntur.",
      raw_spec_text: "Print, Scan, Copy | Kecepatan hingga 12 ppm / 5 ppm | USB 2.0 | Smart Sensor Tinta"
    }
  },
  {
    name: "HP Smart Tank 720 Duplex Wireless Ink Tank Printer",
    brand: "HP",
    category: "PRINTER",
    segment: "Business Duplex",
    price: 3499000,
    specs: {
      screen_panel: "Thermal Inkjet Tank",
      screen_size: "A4 / F4",
      storage: "Automatic Two-Sided Printing (Duplex)",
      cpu: "Dual Band Wi-Fi & Bluetooth",
      gpu: "Lampu Indikator Pintar Smart Guided",
      bundled_items: "Tinta GT53XL Hitam + GT52 Warna + Kabel Lengkap",
      warranty: "Garansi Resmi HP Indonesia 2 Tahun",
      cleaned_description: "Tingkatkan produktivitas kerja dengan cetak bolak-balik otomatis (auto-duplex), baki kertas tertutup kapasitas 250 lembar, dan kontrol nirkabel HP Smart.",
      raw_spec_text: "Auto Duplex Printing | Dual Band Wi-Fi | Tray Tertutup 250 Lembar | Hingga 15 ppm hitam / 9 ppm warna"
    }
  },
  {
    name: "HP LaserJet Pro MFP M135a Monochrome Laser Printer",
    brand: "HP",
    category: "PRINTER",
    segment: "Monochrome Laser",
    price: 2850000,
    specs: {
      screen_panel: "Monochrome Laser",
      screen_size: "A4 / Legal",
      storage: "Print, Scan, Copy Multi-fungsi",
      cpu: "Prosesor 600 MHz, Memori 128MB",
      gpu: "Resolusi Laser 1200 x 1200 dpi",
      bundled_items: "Toner HP 107A Starter Black + Kabel Power",
      warranty: "Garansi Resmi HP Indonesia 1 Tahun",
      cleaned_description: "Printer laser monokrom multifungsi dengan performa cepat hingga 20 halaman per menit dan teks hitam pekat legendaris HP.",
      raw_spec_text: "Laser Monokrom | Kecepatan 20 ppm | Resolusi 1200 dpi | Duty Cycle hingga 10.000 halaman / bulan"
    }
  },
  {
    name: "HP LaserJet Pro M12a Compact Laser Printer",
    brand: "HP",
    category: "PRINTER",
    segment: "Monochrome Laser Single",
    price: 1850000,
    specs: {
      screen_panel: "Monochrome Laser",
      screen_size: "A4 / Letter",
      storage: "Print Only Kompak",
      cpu: "USB 2.0",
      gpu: "Resolusi 600 x 600 dpi HP FastRes",
      bundled_items: "Toner HP 79A Black + CD Driver",
      warranty: "Garansi Resmi HP Indonesia 1 Tahun",
      cleaned_description: "Printer laser hitam putih ultra-ringkas yang sangat cocok diletakkan di meja kasir, loket kasir apotek, maupun meja kantor terbatas.",
      raw_spec_text: "Laser Monokrom Print Only | Kecepatan 18 ppm | Dimensi Kompak | Teknologi HP Auto-On/Auto-Off"
    }
  },

  // BROTHER
  {
    name: "BROTHER DCP-T420W All-in-One Wireless Ink Tank Printer",
    brand: "BROTHER",
    category: "PRINTER",
    segment: "Home & Small Office",
    price: 2290000,
    specs: {
      screen_panel: "Refill Tank System",
      screen_size: "A4 / Letter / Folio",
      storage: "Wi-Fi Direct & Wireless Printing",
      cpu: "Brother Mobile Connect",
      gpu: "Resolusi Cetak 1200 x 6000 dpi",
      bundled_items: "Tinta Brother BTD60BK + BT5000 C,M,Y + Kabel USB",
      warranty: "Garansi Resmi Brother Indonesia 3 Tahun / 30.000 Lembar",
      cleaned_description: "Printer tangki tinta Brother DCP-T420W dengan teknologi anti-paper-jam, tutup transparan untuk pemantauan level tinta, dan kecepatan cetak tinggi.",
      raw_spec_text: "Print, Scan, Copy | Wi-Fi Direct | Kecepatan hingga 16 ipm (Hitam) / 9 ipm (Warna) | Tray Kertas 150 Lembar"
    }
  },
  {
    name: "BROTHER DCP-T520W All-in-One Wi-Fi Ink Tank Printer with Display",
    brand: "BROTHER",
    category: "PRINTER",
    segment: "Small Office",
    price: 2750000,
    specs: {
      screen_panel: "Refill Tank System",
      screen_size: "A4 / Legal / Folio",
      storage: "1-Line LCD Display Panel",
      cpu: "Wi-Fi & Wi-Fi Direct",
      gpu: "Resolusi 1200 x 6000 dpi",
      bundled_items: "Tinta Brother BTD60BK 2 Botol + Warna BT5000",
      warranty: "Garansi Resmi Brother Indonesia 3 Tahun / 30.000 Lembar",
      cleaned_description: "Printer hemat ruang dengan panel LCD status 1 baris untuk pengoperasian mandiri, kecepatan cetak hingga 17 ipm hitam, dan paket 2 botol tinta hitam.",
      raw_spec_text: "Print, Scan, Copy | Layar LCD 1 Baris | 17 ipm / 9.5 ipm | Tray 150 Lembar + Manual Feed Slot 1 Lembar"
    }
  },
  {
    name: "BROTHER DCP-T720DW Auto Duplex ADF Wi-Fi Ink Tank Printer",
    brand: "BROTHER",
    category: "PRINTER",
    segment: "Business Workgroup",
    price: 3850000,
    specs: {
      screen_panel: "Refill Tank + ADF",
      screen_size: "A4 / Legal",
      storage: "Auto Duplex + 20-Sheet ADF",
      cpu: "Wireless & Mobile Connect",
      gpu: "Resolusi 1200 x 6000 dpi",
      bundled_items: "Tinta BTD60BK 2 Botol + Warna BT5000",
      warranty: "Garansi Resmi Brother Indonesia 3 Tahun / 50.000 Lembar",
      cleaned_description: "Lengkap dengan pengumpan dokumen otomatis (ADF) 20 lembar dan cetak 2 sisi bolak-balik otomatis, menghemat hingga 50% penggunaan kertas.",
      raw_spec_text: "Print, Scan, Copy | Auto Duplex | ADF 20 Lembar | Layar LCD | Kecepatan 17 ipm hitam / 16.5 ipm warna"
    }
  },
  {
    name: "BROTHER MFC-T920DW Professional Duplex ADF Fax Ethernet Printer",
    brand: "BROTHER",
    category: "PRINTER",
    segment: "Corporate Workhorse",
    price: 5250000,
    specs: {
      screen_panel: "Refill Tank System",
      screen_size: "A4 / Legal / Folio",
      storage: "Auto Duplex + ADF 20 Lembar + Fax + Tray Serbaguna 80 Lembar",
      cpu: "Gigabit Ethernet LAN, Wi-Fi & USB Direct Print",
      gpu: "1.8\" Color LCD Display Panel",
      bundled_items: "Tinta BTD60BK 2 Botol + Warna + Kabel Telepon RJ11",
      warranty: "Garansi Resmi Brother Indonesia 3 Tahun / 50.000 Lembar",
      cleaned_description: "Flagship ink tank printer Brother dengan Ethernet kabel jaringan, layar warna 1.8 inci, port USB Flashdisk langsung, dan kapasitas baki kertas ganda.",
      raw_spec_text: "Print, Scan, Copy, Fax | Auto Duplex | LAN Ethernet & Wi-Fi | Layar Warna 1.8\" | Tray 150+80 Lembar"
    }
  },
  {
    name: "BROTHER HL-1201 Compact Monochrome Laser Printer",
    brand: "BROTHER",
    category: "PRINTER",
    segment: "Monochrome Laser",
    price: 1450000,
    specs: {
      screen_panel: "Electrophotographic Laser",
      screen_size: "A4 / Letter",
      storage: "Print Only Monokrom",
      cpu: "USB 2.0",
      gpu: "Teknologi Bebas Paper Jam Hassle-Free",
      bundled_items: "Toner Brother TN-1010 + Drum Unit DR-1010",
      warranty: "Garansi Resmi Brother Indonesia 3 Tahun",
      cleaned_description: "Printer laser hitam putih super ringkas dengan pemisah toner dan drum terpisah untuk biaya perawatan yang jauh lebih ekonomis.",
      raw_spec_text: "Laser Monokrom | Kecepatan 20 ppm | Drum & Toner Terpisah | Desain Hassle-Free Bebas Macet"
    }
  },

  // CANON
  {
    name: "CANON PIXMA G1020 Single Function Ink Tank Printer",
    brand: "CANON",
    category: "PRINTER",
    segment: "Entry Level",
    price: 1699000,
    specs: {
      screen_panel: "Continuous Ink Tank",
      screen_size: "A4 / F4 / Legal",
      storage: "User-Replaceable Maintenance Cartridge",
      cpu: "USB 2.0 High-Speed",
      gpu: "Resolusi 4800 x 1200 dpi",
      bundled_items: "Tinta Canon GI-71 Penuh 4 Warna (Pigment Black + Dye Color)",
      warranty: "Garansi Resmi PT Datascrip 2 + 1 Tahun",
      cleaned_description: "Printer tangki tinta ekonomis dengan maintenance cartridge yang dapat diganti mandiri tanpa perlu repot ke service center.",
      raw_spec_text: "Print Only | Tinta Pigmen Hitam Tahan Air | Kecepatan 9.1 ipm (Hitam) / 5.0 ipm (Warna) | USB 2.0"
    }
  },
  {
    name: "CANON PIXMA G2020 All-in-One Ink Tank Printer",
    brand: "CANON",
    category: "PRINTER",
    segment: "Home & Small Office",
    price: 2199000,
    specs: {
      screen_panel: "Continuous Ink Tank",
      screen_size: "A4 / Legal",
      storage: "Print, Scan, Copy",
      cpu: "Layar LCD 2 Baris",
      gpu: "Resolusi 4800 x 1200 dpi",
      bundled_items: "Tinta GI-71 Set 4 Botol + Kabel Power",
      warranty: "Garansi Resmi PT Datascrip 2 + 1 Tahun",
      cleaned_description: "All-in-one serba guna dengan botol tinta berdesain nozel khusus yang anti-tumpah dan maintenance box yang dapat dilepas pasang sendiri.",
      raw_spec_text: "Print, Scan, Copy | Layar LCD 2 Baris | Kecepatan 9.1 ipm / 5.0 ipm | Borderless Printing A4"
    }
  },
  {
    name: "CANON PIXMA G3020 Wireless All-in-One Ink Tank Printer",
    brand: "CANON",
    category: "PRINTER",
    segment: "Wireless Office",
    price: 2699000,
    specs: {
      screen_panel: "Continuous Ink Tank",
      screen_size: "A4 / Legal",
      storage: "Wi-Fi, Wireless Direct, USB",
      cpu: "Canon PRINT Inkjet/SELPHY App",
      gpu: "Resolusi 4800 x 1200 dpi",
      bundled_items: "Tinta GI-71 Set Penuh + Kartu Garansi Datascrip",
      warranty: "Garansi Resmi PT Datascrip 2 + 1 Tahun",
      cleaned_description: "Cetak dokumen nirkabel dari perangkat seluler laptop, smartphone, dan tablet dengan konektivitas nirkabel Wi-Fi langsung tanpa router.",
      raw_spec_text: "Print, Scan, Copy | Wi-Fi Direct, Apple AirPrint, Mopria | Layar LCD 2 Baris | 9.1 ipm / 5.0 ipm"
    }
  },
  {
    name: "CANON PIXMA G4010 Wireless ADF Fax All-in-One Printer",
    brand: "CANON",
    category: "PRINTER",
    segment: "Corporate & Government",
    price: 3799000,
    specs: {
      screen_panel: "Continuous Ink Tank + ADF",
      screen_size: "A4 / F4 / Legal",
      storage: "ADF 20 Lembar + Fax + Wi-Fi",
      cpu: "Layar LCD 2 Baris",
      gpu: "Resolusi 4800 x 1200 dpi",
      bundled_items: "Tinta Canon GI-790 Set 4 Warna + Kabel Fax RJ11",
      warranty: "Garansi Resmi PT Datascrip 2 Tahun",
      cleaned_description: "Lengkap dengan fitur 4-in-1 (Print, Scan, Copy, Fax) dan Automatic Document Feeder 20 lembar untuk pemindaian multi-halaman cepat.",
      raw_spec_text: "Print, Scan, Copy, Fax | ADF 20 Lembar | Wi-Fi, AirPrint | Botol Tinta Hasil Cetak Tinggi 7000 Lembar"
    }
  },
  {
    name: "CANON PIXMA G570 6-Color Wireless Photo Ink Tank Printer",
    brand: "CANON",
    category: "PRINTER",
    segment: "Professional Photo",
    price: 3999000,
    specs: {
      screen_panel: "6-Color Dye Photo Tank",
      screen_size: "A4 / 4R / 5R / Square",
      storage: "Wi-Fi & Wireless Photo Print",
      cpu: "Layar LCD Dot Matrix 2 Baris",
      gpu: "Tinta GI-73 Khusus Foto (Red & Grey Ink)",
      bundled_items: "Tinta 6 Botol GI-73 Series + Tray Kertas Foto",
      warranty: "Garansi Resmi PT Datascrip 2 Tahun",
      cleaned_description: "Didesain khusus untuk studio foto dan percetakan kreatif dengan 6 tinta dye warna termasuk Red dan Grey untuk detail bayangan dan gamut warna luas.",
      raw_spec_text: "6 Warna Tinta Foto (Black, Cyan, Magenta, Yellow, Red, Grey) | Wi-Fi | Borderless Photo A4 | Cetak Foto 4R dalam 47 Detik"
    }
  }
];

// PROJECTORS (Epson, BenQ, InFocus, ViewSonic, Acer, Optoma)
const newProjectors = [
  // EPSON
  {
    name: "EPSON EB-E01 3LCD XGA 3300 Lumens Projector",
    brand: "EPSON",
    category: "PROJECTOR",
    segment: "Classroom & Meeting Room",
    price: 5450000,
    specs: {
      screen_panel: "3LCD Technology",
      screen_size: "30\" hingga 350\" Diagonal",
      storage: "3.300 ANSI Lumens",
      cpu: "Resolusi Native XGA (1024 x 768)",
      gpu: "Kontras Rasio 15.000:1",
      bundled_items: "Remote Control + Kabel VGA + Kabel Power",
      warranty: "Garansi Resmi Epson Indonesia 3 Tahun Unit, 2 Tahun / 1000 Jam Lampu",
      cleaned_description: "Proyektor bisnis dan pendidikan berteknologi 3LCD dengan kecerahan warna nyata (Color Brightness) setara White Brightness hingga 3.300 Lumens.",
      raw_spec_text: "Resolusi XGA (1024x768) | 3300 Lumens | 3LCD | Lamp Life hingga 12.000 Jam (Eco Mode) | Port HDMI, VGA"
    }
  },
  {
    name: "EPSON EB-X500 3LCD XGA 3600 Lumens Projector",
    brand: "EPSON",
    category: "PROJECTOR",
    segment: "Office & Boardroom",
    price: 6250000,
    specs: {
      screen_panel: "3LCD Technology",
      screen_size: "30\" hingga 300\"",
      storage: "3.600 ANSI Lumens",
      cpu: "Resolusi Native XGA (1024 x 768)",
      gpu: "Kontras Rasio 16.000:1 + Split Screen",
      bundled_items: "Remote Control + Tas Original Epson + Kabel HDMI/VGA",
      warranty: "Garansi Resmi Epson Indonesia 3 Tahun",
      cleaned_description: "Proyektor profesional dengan slider keystone horizontal untuk penempatan fleksibel di sudut meja serta fitur split-screen dari 2 perangkat sekaligus.",
      raw_spec_text: "3600 Lumens | XGA | Horizontal Keystone Slider | Split Screen Display | Lamp Life 12.000 Jam"
    }
  },
  {
    name: "EPSON EB-FH52 Full HD 4000 Lumens 3LCD Wireless Projector",
    brand: "EPSON",
    category: "PROJECTOR",
    segment: "Executive Conference",
    price: 14850000,
    specs: {
      screen_panel: "3LCD Technology",
      screen_size: "30\" hingga 300\"",
      storage: "4.000 ANSI Lumens",
      cpu: "Resolusi Full HD 1080p (1920 x 1080)",
      gpu: "Wireless Built-in & Miracast Screen Mirroring",
      bundled_items: "Remote + Tas Soft Carrying Case + Kabel Lengkap",
      warranty: "Garansi Resmi Epson Indonesia 3 Tahun",
      cleaned_description: "Proyektor resolusi Full HD dengan refresh rate 240Hz untuk presentasi video mulus dan wireless Miracast untuk presentasi nirkabel tanpa dongle.",
      raw_spec_text: "Resolusi Full HD 1080p | 4000 Lumens | Wi-Fi Built-in & Miracast | Refresh Rate 240Hz | Dual HDMI"
    }
  },
  {
    name: "EPSON CO-W01 Portable WXGA 3000 Lumens Projector",
    brand: "EPSON",
    category: "PROJECTOR",
    segment: "Portable Lifestyle & Business",
    price: 5750000,
    specs: {
      screen_panel: "3LCD Technology",
      screen_size: "25\" hingga 378\"",
      storage: "3.000 ANSI Lumens",
      cpu: "Resolusi Widescreen WXGA (1280 x 800)",
      gpu: "Desain Modern Minimalis Ringkas 2.4kg",
      bundled_items: "Remote Control + Kabel Daya + Kabel HDMI",
      warranty: "Garansi Resmi Epson Indonesia 3 Tahun",
      cleaned_description: "Desain portabel estetik yang mudah dibawa bepergian, memberikan rasio layar lebar 16:10 untuk presentasi PowerPoint dan menonton film hiburan.",
      raw_spec_text: "WXGA Widescreen (1280x800) | 3000 Lumens | Bobot Ringan 2.4kg | Speaker Internal 5W | HDMI & USB"
    }
  },

  // BENQ
  {
    name: "BENQ MS550 SVGA 3600 Lumens Business Projector",
    brand: "BENQ",
    category: "PROJECTOR",
    segment: "Essential Business",
    price: 4750000,
    specs: {
      screen_panel: "DLP Technology",
      screen_size: "60\" hingga 180\"",
      storage: "3.600 ANSI Lumens",
      cpu: "Resolusi Native SVGA (800 x 600)",
      gpu: "Kontras Rasio 20.000:1 Super High Contrast",
      bundled_items: "Remote Control + Kabel VGA + Kabel Power",
      warranty: "Garansi Resmi BenQ Indonesia 3 Tahun Unit, 1 Tahun / 1000 Jam Lampu",
      cleaned_description: "Proyektor DLP BenQ dengan lensa kaca murni untuk kejernihan teks optimal, mode SmartEco penghemat daya, dan dual port HDMI.",
      raw_spec_text: "SVGA (800x600) | 3600 Lumens | Dual HDMI | SmartEco Mode 15.000 Jam | Teks Tajam Anti-Blur"
    }
  },
  {
    name: "BENQ MX560 XGA 4000 Lumens High Brightness Projector",
    brand: "BENQ",
    category: "PROJECTOR",
    segment: "Meeting Room High Brightness",
    price: 5950000,
    specs: {
      screen_panel: "DLP Technology",
      screen_size: "60\" hingga 200\"",
      storage: "4.000 ANSI Lumens Super Bright",
      cpu: "Resolusi Native XGA (1024 x 768)",
      gpu: "Kontras Rasio 20.000:1",
      bundled_items: "Remote Control + Kabel VGA + Kabel Power",
      warranty: "Garansi Resmi BenQ Indonesia 3 Tahun",
      cleaned_description: "Kecerahan sangat tinggi 4.000 Lumens yang tetap terlihat terang dan jelas meskipun di ruangan berlampu terang tanpa perlu menutup gorden jendela.",
      raw_spec_text: "XGA (1024x768) | 4000 Lumens | Dual HDMI, USB Type-A Power | Sensor Anti-Debu Dust Accumulation Sensor"
    }
  },
  {
    name: "BENQ MH560 Full HD 1080p 3800 Lumens Projector",
    brand: "BENQ",
    category: "PROJECTOR",
    segment: "High Resolution Business",
    price: 9850000,
    specs: {
      screen_panel: "DLP Technology",
      screen_size: "60\" hingga 300\"",
      storage: "3.800 ANSI Lumens",
      cpu: "Resolusi Full HD 1080p (1920 x 1080)",
      gpu: "Lensa Kaca All-Glass Lenses Khusus",
      bundled_items: "Remote Control + Kabel HDMI + Kabel Power",
      warranty: "Garansi Resmi BenQ Indonesia 3 Tahun",
      cleaned_description: "Resolusi native Full HD 1080p menyajikan detail grafik spreadsheet, CAD, dan video presentasi dengan presisi pixel-to-pixel sempurna.",
      raw_spec_text: "Full HD 1080p | 3800 Lumens | 20.000:1 Contrast | Mode Infografis & Spreadsheet Eksklusif"
    }
  },
  {
    name: "BENQ GV30 Portable Smart LED Projector Extra Bass",
    brand: "BENQ",
    category: "PROJECTOR",
    segment: "Smart Portable Wireless",
    price: 8450000,
    specs: {
      screen_panel: "LED DLP",
      screen_size: "30\" hingga 120\"",
      storage: "300 ANSI Lumens LED",
      cpu: "Android TV Resmi + AirPlay + Chromecast",
      gpu: "Speaker 2.1 Channel 16W dengan Extra Bass",
      bundled_items: "Remote Android TV + Tas Jinjing Eksklusif + Adaptor Magnet",
      warranty: "Garansi Resmi BenQ Indonesia 2 Tahun",
      cleaned_description: "Proyektor pintar portabel berbentuk unik dengan rotasi sudut proyeksi 135° ke langit-langit atap, Android TV resmi, dan speaker Bluetooth portabel bersuara bass mantap.",
      raw_spec_text: "HD 720p | Rotasi 135 Derajat | Baterai hingga 2.5 Jam | Android TV, Netflix, YouTube | Speaker 2.1 Channel"
    }
  },

  // INFOCUS
  {
    name: "INFOCUS IN114xv XGA 3800 Lumens DLP Projector",
    brand: "INFOCUS",
    category: "PROJECTOR",
    segment: "Classroom & Meeting Room",
    price: 5250000,
    specs: {
      screen_panel: "DLP BrilliantColor",
      screen_size: "32\" hingga 300\"",
      storage: "3.800 ANSI Lumens",
      cpu: "Resolusi Native XGA (1024 x 768)",
      gpu: "Kontras Rasio 26.000:1 Ekstrem",
      bundled_items: "Remote Control + Kabel VGA + Kabel Power",
      warranty: "Garansi Resmi InFocus Indonesia 2 Tahun",
      cleaned_description: "Proyektor handal dengan kontras rasio luar biasa 26.000:1, teknologi Texas Instruments BrilliantColor, dan masa pakai lampu hingga 15.000 jam.",
      raw_spec_text: "XGA (1024x768) | 3800 Lumens | Kontras 26.000:1 | Lamp Life 15.000 Jam | 3D Ready"
    }
  },
  {
    name: "INFOCUS IN112xv SVGA 3800 Lumens DLP Projector",
    brand: "INFOCUS",
    category: "PROJECTOR",
    segment: "Budget Business",
    price: 4450000,
    specs: {
      screen_panel: "DLP Technology",
      screen_size: "30\" hingga 300\"",
      storage: "3.800 ANSI Lumens",
      cpu: "Resolusi Native SVGA (800 x 600)",
      gpu: "Kontras Rasio 26.000:1",
      bundled_items: "Remote Control + Kabel VGA + Kabel Power",
      warranty: "Garansi Resmi InFocus Indonesia 2 Tahun",
      cleaned_description: "Solusi hemat investasi untuk ruang kelas dan rapat kecil dengan kecerahan tinggi 3800 Lumens dan bodi tahan banting.",
      raw_spec_text: "SVGA (800x600) | 3800 Lumens | HDMI 1.4, VGA | Lampu Awet hingga 15.000 Jam"
    }
  },
  {
    name: "INFOCUS IN116xv WXGA 3800 Lumens Widescreen Projector",
    brand: "INFOCUS",
    category: "PROJECTOR",
    segment: "Widescreen Business",
    price: 6150000,
    specs: {
      screen_panel: "DLP Technology",
      screen_size: "30\" hingga 300\"",
      storage: "3.800 ANSI Lumens",
      cpu: "Resolusi Widescreen WXGA (1280 x 800)",
      gpu: "Rasio Aspek 16:10",
      bundled_items: "Remote Control + Kabel VGA + Kabel Power",
      warranty: "Garansi Resmi InFocus Indonesia 2 Tahun",
      cleaned_description: "Format proyeksi layar lebar 16:10 yang cocok untuk laptop modern, menjamin materi presentasi tidak terdistorsi atau terpotong.",
      raw_spec_text: "WXGA (1280x800) | 3800 Lumens | 26.000:1 Contrast | HDMI, VGA, S-Video | 3D Triple Flash"
    }
  },

  // VIEWSONIC
  {
    name: "VIEWSONIC PA503S SVGA 3800 Lumens DLP Projector",
    brand: "VIEWSONIC",
    category: "PROJECTOR",
    segment: "Education & Office",
    price: 4650000,
    specs: {
      screen_panel: "DLP SuperColor",
      screen_size: "30\" hingga 300\"",
      storage: "3.800 ANSI Lumens",
      cpu: "Resolusi Native SVGA (800 x 600)",
      gpu: "Teknologi Warna ViewSonic SuperColor",
      bundled_items: "Remote Control + Kabel VGA + Kabel Power",
      warranty: "Garansi Resmi ViewSonic Indonesia 3 Tahun Sparepart & Service",
      cleaned_description: "Teknologi roda warna eksklusif SuperColor 6 segmen menghasilkan rentang warna yang lebih kaya dan hidup di segala kondisi pencahayaan.",
      raw_spec_text: "SVGA (800x600) | 3800 Lumens | Kontras 22.000:1 | 5 Mode Tampilan Warna | SuperEco Mode 15.000 Jam"
    }
  },
  {
    name: "VIEWSONIC PA503X XGA 3800 Lumens DLP Projector",
    brand: "VIEWSONIC",
    category: "PROJECTOR",
    segment: "Business Meeting",
    price: 5350000,
    specs: {
      screen_panel: "DLP SuperColor",
      screen_size: "30\" hingga 300\"",
      storage: "3.800 ANSI Lumens",
      cpu: "Resolusi Native XGA (1024 x 768)",
      gpu: "Kontras Rasio 22.000:1",
      bundled_items: "Remote Control + Kabel VGA + Kabel Power",
      warranty: "Garansi Resmi ViewSonic Indonesia 3 Tahun",
      cleaned_description: "Ketajaman teks tingkat lanjut XGA untuk dokumen kantor, spreadsheet akuntansi, dan materi pelatihan profesional.",
      raw_spec_text: "XGA (1024x768) | 3800 Lumens | HDMI, Dual VGA | Speaker Internal 2W | Input Latency Rendah 16ms"
    }
  },
  {
    name: "VIEWSONIC M1+ Smart Ultra-Portable LED Projector Harman Kardon",
    brand: "VIEWSONIC",
    category: "PROJECTOR",
    segment: "Smart Mobile Entertainment",
    price: 5990000,
    specs: {
      screen_panel: "LED DLP",
      screen_size: "24\" hingga 100\"",
      storage: "300 LED Lumens",
      cpu: "Wi-Fi & Bluetooth, Baterai 6 Jam",
      gpu: "Speaker Ganda Harman Kardon Internal",
      bundled_items: "Smart Stand Terintegrasi + Tas Pouch + Remote",
      warranty: "Garansi Resmi ViewSonic Indonesia 2 Tahun",
      cleaned_description: "Proyektor portabel pemenang iF Design Award dengan dudukan pintar 360°, speaker akustik Harman Kardon kelas atas, dan port USB Type-C.",
      raw_spec_text: "WVGA 854x480 | Smart Stand 360 | Harman Kardon Audio | Baterai hingga 6 Jam | USB-C Video & Charging"
    }
  },

  // ACER
  {
    name: "ACER X1128H SVGA 4500 Lumens High Brightness Projector",
    brand: "ACER",
    category: "PROJECTOR",
    segment: "Large Room & Hall",
    price: 4850000,
    specs: {
      screen_panel: "DLP Technology",
      screen_size: "27\" hingga 300\"",
      storage: "4.500 ANSI Lumens Super Bright",
      cpu: "Resolusi Native SVGA (800 x 600)",
      gpu: "Acer ColorBoost 3D & ColorSafe II",
      bundled_items: "Remote Control + Kabel VGA + Kabel Power",
      warranty: "Garansi Resmi Acer Indonesia 3 Tahun",
      cleaned_description: "Kecerahan ekstra 4.500 Lumens untuk aula, auditorium, dan ruang pertemuan besar, dilengkapi filter BlueLightShield untuk kenyamanan mata audiens.",
      raw_spec_text: "SVGA | 4500 ANSI Lumens | Acer Bluelight Shield | Kontras 20.000:1 | HDMI, VGA | Speaker 3W"
    }
  },
  {
    name: "ACER X1228H XGA 4500 Lumens Business Projector",
    brand: "ACER",
    category: "PROJECTOR",
    segment: "Professional Presentation",
    price: 5650000,
    specs: {
      screen_panel: "DLP Technology",
      screen_size: "27\" hingga 300\"",
      storage: "4.500 ANSI Lumens",
      cpu: "Resolusi Native XGA (1024 x 768)",
      gpu: "Acer LumiSense & DynamicBlack",
      bundled_items: "Remote Control + Kabel VGA + Kabel Power",
      warranty: "Garansi Resmi Acer Indonesia 3 Tahun",
      cleaned_description: "Teknologi Acer LumiSense secara dinamis menyesuaikan kecerahan gambar sesuai dengan konten yang ditampilkan dan tingkat pencahayaan ruangan.",
      raw_spec_text: "XGA (1024x768) | 4500 Lumens | DynamicBlack 20.000:1 | HDMI 1.4a | Masa Pakai Lampu hingga 10.000 Jam"
    }
  },

  // OPTOMA
  {
    name: "OPTOMA SA520 SVGA 4000 Lumens DLP Projector",
    brand: "OPTOMA",
    category: "PROJECTOR",
    segment: "Classroom & Meeting",
    price: 4900000,
    specs: {
      screen_panel: "DLP Technology",
      screen_size: "25\" hingga 250\"",
      storage: "4.000 ANSI Lumens",
      cpu: "Resolusi Native SVGA (800 x 600)",
      gpu: "Kontras Rasio 25.000:1",
      bundled_items: "Remote Control + Kabel VGA + Kabel Power",
      warranty: "Garansi Resmi Optoma Indonesia 2 Tahun",
      cleaned_description: "Didesain untuk penggunaan jangka panjang di instansi pendidikan dan perkantoran dengan bobot ringan hanya 3.0 kg dan suara kipas sangat senyap.",
      raw_spec_text: "SVGA | 4000 Lumens | Kontras 25.000:1 | Port HDMI, VGA, Composite | Lampu hingga 15.000 Jam"
    }
  },
  {
    name: "OPTOMA X400LVe XGA 4000 Lumens Business Projector",
    brand: "OPTOMA",
    category: "PROJECTOR",
    segment: "Business & Education",
    price: 5850000,
    specs: {
      screen_panel: "DLP Technology",
      screen_size: "27\" hingga 300\"",
      storage: "4.000 ANSI Lumens",
      cpu: "Resolusi Native XGA (1024 x 768)",
      gpu: "Speaker 10W Internal Bertenaga",
      bundled_items: "Remote Control + Kabel VGA + Kabel Power",
      warranty: "Garansi Resmi Optoma Indonesia 2 Tahun",
      cleaned_description: "Menghasilkan gambar tajam beresolusi XGA dengan speaker internal 10 Watt yang bertenaga tanpa memerlukan speaker eksternal tambahan.",
      raw_spec_text: "XGA (1024x768) | 4000 Lumens | Speaker 10W | USB Power 5V/1.5A untuk Dongle Streaming | ECO+ Mode"
    }
  },
  {
    name: "OPTOMA HD146X Full HD 1080p 3600 Lumens Cinema Projector",
    brand: "OPTOMA",
    category: "PROJECTOR",
    segment: "Home Theater & Gaming",
    price: 10500000,
    specs: {
      screen_panel: "DLP Technology",
      screen_size: "28\" hingga 301\"",
      storage: "3.600 ANSI Lumens",
      cpu: "Resolusi Native Full HD 1080p (1920 x 1080)",
      gpu: "Enhanced Gaming Mode 16ms Low Latency",
      bundled_items: "Backlit Remote Control + Kabel HDMI + Kabel Power",
      warranty: "Garansi Resmi Optoma Indonesia 2 Tahun",
      cleaned_description: "Proyektor bioskop rumah dan gaming dengan kalibrasi warna sinematik Rec.709, kontras rasio tinggi, dan respon gaming ultra-cepat 16ms.",
      raw_spec_text: "1080p Full HD | 3600 Lumens | Kontras 25.000:1 | Respon 16ms | Mode Bioskop Sinematik Rec.709"
    }
  }
];

// STARLINK (Official Hardware & Kits)
const newStarlink = [
  {
    name: "STARLINK Standard Actuated Kit (Gen 2)",
    brand: "STARLINK",
    category: "STARLINK",
    segment: "Residential & Remote Office",
    price: 5900000,
    specs: {
      screen_panel: "Electronic Phased Array (Bermotor)",
      screen_size: "Antena 51.3 x 30.3 cm",
      storage: "Kecepatan Unduh hingga 250+ Mbps",
      cpu: "Router Wi-Fi 5 Dual Band 802.11ac",
      gpu: "IP54 Weather Resistant (Tahan Hujan & Panas)",
      bundled_items: "Antena Starlink, Base Dudukan, Router Wi-Fi, Kabel Starlink 15.2m, Kabel Daya AC 1.8m",
      warranty: "Garansi Resmi Distributor Starlink Indonesia 1 Tahun",
      cleaned_description: "Kit internet satelit orbit rendah (LEO) Starlink dengan antena bermotor yang otomatis mengunci posisi konstelasi satelit di langit. Solusi internet kecepatan tinggi tanpa sinyal kabel di seluruh pelosok pulau.",
      raw_spec_text: "Download 50-250 Mbps | Latensi Rendah 25-50ms | Rating Cuaca IP54 | Bidang Pandang 100 Derajat | Konsumsi Daya 50-75W"
    }
  },
  {
    name: "STARLINK Standard Kit (Gen 3 / V4)",
    brand: "STARLINK",
    category: "STARLINK",
    segment: "Residential & High Throughput",
    price: 7500000,
    specs: {
      screen_panel: "Electronic Phased Array (Kickstand)",
      screen_size: "Antena 59.4 x 38.3 cm Tipis",
      storage: "Throughput Lebih Tinggi & Cakupan Luas",
      cpu: "Router Wi-Fi 6 Tri-Band dengan 2 Port Ethernet LAN",
      gpu: "IP67 Environmental Rating (Tahan Cuaca Ekstrem)",
      bundled_items: "Antena Starlink Gen 3, Kickstand Terpasang, Router Wi-Fi 6, Kabel Starlink Gen 3 15m, Kabel Daya AC",
      warranty: "Garansi Resmi Distributor Starlink Indonesia 1 Tahun",
      cleaned_description: "Generasi terbaru Starlink V4 dengan profil fisik lebih tipis, kickstand bawaan, router Wi-Fi 6 Tri-Band berkecepatan tinggi yang dilengkapi 2 port LAN Ethernet fisik langsung tanpa adaptor tambahan.",
      raw_spec_text: "Wi-Fi 6 Tri-Band 4x4 MU-MIMO | 2 Port Ethernet LAN RJ45 | IP67 Tahan Air Hujan Lebat | Field of View 110 Derajat"
    }
  },
  {
    name: "STARLINK Mini Kit Ultra-Portable Satellite Internet",
    brand: "STARLINK",
    category: "STARLINK",
    segment: "Portable & Mobile Travel",
    price: 5900000,
    specs: {
      screen_panel: "Integrated Phased Array + Wi-Fi",
      screen_size: "Ukuran Laptop Kompak 29.8 x 25.9 cm",
      storage: "Bobot Ultra Ringan 1.1 kg",
      cpu: "Router Wi-Fi Terintegrasi Langsung di Antena",
      gpu: "Input Daya DC 12V-48V (Bisa Pakai Powerbank USB-C PD / Aki)",
      bundled_items: "Antena Starlink Mini, Stand Kickstand, Pipe Adapter, Kabel DC Power 15m, Catu Daya AC",
      warranty: "Garansi Resmi Distributor Starlink Indonesia 1 Tahun",
      cleaned_description: "Internet satelit ukuran laptop yang muat di dalam ransel. Router Wi-Fi sudah tertanam di bodi antena, konsumsi daya hanya 20-40 Watt, dapat dinyalakan menggunakan powerbank USB-C 100W atau aki mobil.",
      raw_spec_text: "Bobot 1.1 kg | Wi-Fi 5 Terintegrasi + 1 Port LAN Gigabit | Input Daya DC 12V-48V | Download hingga 100+ Mbps"
    }
  },
  {
    name: "STARLINK Flat High Performance Kit (Enterprise / Maritime)",
    brand: "STARLINK",
    category: "STARLINK",
    segment: "Enterprise, Mining & Maritime",
    price: 39000000,
    specs: {
      screen_panel: "High Performance Phased Array",
      screen_size: "Antena Datar 57.5 x 51.1 cm",
      storage: "Bidang Pandang Lebar 140° (Koneksi Bergerak)",
      cpu: "Power Supply Unit High Power + Router Wi-Fi",
      gpu: "Desain Khusus Pemasangan Permanen (In-Motion)",
      bundled_items: "Antena Flat High Performance, Wedge Mount Dudukan Miring, Kabel 25m, Power Supply 300W",
      warranty: "Garansi Resmi Starlink Indonesia 2 Tahun",
      cleaned_description: "Perangkat kelas enterprise untuk operasional bisnis, kapal laut komersial, situs pertambangan, dan perkebunan terpencil yang membutuhkan throughput tinggi dan koneksi stabil saat kendaraan bergerak.",
      raw_spec_text: "Bidang Pandang 140 Derajat | Dukungan Konektivitas In-Motion (Bergerak) | Kemampuan Menembus Cuaca Ekstrem | Dual High-Gain"
    }
  },
  {
    name: "STARLINK Ethernet Adapter (Gen 2 Actuated)",
    brand: "STARLINK",
    category: "STARLINK",
    segment: "Official Accessory",
    price: 750000,
    specs: {
      screen_panel: "Aksesoris Resmi",
      screen_size: "Kompak",
      storage: "Port LAN Gigabit 1000 Mbps",
      cpu: "Plug and Play",
      gpu: "Kompatibel Router Gen 2",
      bundled_items: "Ethernet Adapter Unit",
      warranty: "Garansi Resmi 1 Tahun",
      cleaned_description: "Adaptor resmi Starlink untuk menghubungkan kabel LAN RJ45 ke router Starlink Gen 2, memungkinkan integrasi ke switch jaringan kantor, router Mikrotik, atau access point eksternal.",
      raw_spec_text: "Port RJ45 Gigabit Ethernet 1 Gbps | Khusus Router Starlink Standard Actuated Gen 2"
    }
  },
  {
    name: "STARLINK Replacement Cable 22.8 Meter (75ft)",
    brand: "STARLINK",
    category: "STARLINK",
    segment: "Official Accessory",
    price: 1250000,
    specs: {
      screen_panel: "Aksesoris Resmi",
      screen_size: "Panjang 22.8 Meter",
      storage: "Kabel Ekstensi / Pengganti",
      cpu: "Konektor Khusus Starlink",
      gpu: "Pelindung Kabel Tahan Cuaca Outdoor",
      bundled_items: "Kabel Starlink 75ft Box Original",
      warranty: "Garansi Resmi 1 Tahun",
      cleaned_description: "Kabel pengganti resmi pabrikan sepanjang 22.8 meter untuk antena Starlink Gen 2, dirancang tahan radiasi UV matahari dan air hujan lebat.",
      raw_spec_text: "Panjang 22.8 Meter (75ft) | Pelindung Cuaca Ekstrem | Konektor Original Starlink"
    }
  },
  {
    name: "STARLINK Pivot Mount / Wall Bracket Kit",
    brand: "STARLINK",
    category: "STARLINK",
    segment: "Official Accessory",
    price: 950000,
    specs: {
      screen_panel: "Aksesoris Resmi",
      screen_size: "Mounting Braket",
      storage: "Bahan Logam Tahan Karat",
      cpu: "Sudut Kemiringan Dapat Diatur",
      gpu: "Pemasangan Dinding / Atap",
      bundled_items: "Pivot Mount Bracket, Baut Fisher, Panduan Instalasi",
      warranty: "Garansi Resmi 1 Tahun",
      cleaned_description: "Braket pemasangan resmi untuk instalasi antena Starlink di tepi dinding atau atap rumah dengan sudut kemiringan yang dapat disesuaikan untuk hasil penerimaan sinyal terbaik.",
      raw_spec_text: "Material Baja Tahan Karat | Sudut Kemiringan Fleksibel | Pemasangan Genteng / Tembok Bata"
    }
  }
];

function convertToProduct(raw, index) {
  const slug = raw.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return {
    id: crypto.randomUUID(),
    slug,
    name: raw.name,
    brand: raw.brand,
    category: raw.category,
    segment: raw.segment,
    is_new: false,
    stock_status: "in_stock",
    min_price_idr: raw.price,
    max_price_idr: raw.price,
    cpu: raw.specs.cpu || null,
    ram_gb: null,
    ram_type: null,
    storage: raw.specs.storage || null,
    storage_type: raw.specs.screen_panel || null,
    gpu: raw.specs.gpu || null,
    screen_size: raw.specs.screen_size || null,
    screen_panel: raw.specs.screen_panel || null,
    os: null,
    warranty: raw.specs.warranty || "Garansi Resmi Pabrikan",
    bundled_items: raw.specs.bundled_items || "Kelengkapan Resmi Distributor",
    cleaned_description: raw.specs.cleaned_description,
    raw_spec_text: raw.specs.raw_spec_text,
    detailed_spec_text: raw.specs.raw_spec_text,
    variants: [
      {
        id: crypto.randomUUID(),
        sku: `GMC-${raw.brand.substring(0,3)}-${1000 + index}`,
        part_number: raw.name.substring(0, 25),
        color_name: "STANDARD",
        price_idr: raw.price,
        stock_status: "in_stock"
      }
    ]
  };
}

let idxCounter = 1;
const convertedPrinters = newPrinters.map(p => convertToProduct(p, idxCounter++));
const convertedProjectors = newProjectors.map(p => convertToProduct(p, idxCounter++));
const convertedStarlink = newStarlink.map(p => convertToProduct(p, idxCounter++));

// Append all new items
updatedProducts.push(...convertedPrinters, ...convertedProjectors, ...convertedStarlink);

fs.writeFileSync(seedPath, JSON.stringify(updatedProducts, null, 2), "utf8");

console.log("=== CATALOG SEED UPDATE COMPLETE ===");
console.log("Total products now:", updatedProducts.length);
const cats = {};
updatedProducts.forEach(p => cats[p.category] = (cats[p.category] || 0) + 1);
console.log("Category Breakdown:", cats);
const brands = {};
updatedProducts.forEach(p => brands[p.brand] = (brands[p.brand] || 0) + 1);
console.log("Brand Count:", Object.keys(brands).length);
