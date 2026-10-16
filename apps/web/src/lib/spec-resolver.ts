/**
 * Comprehensive Product Specification Resolver
 * Derives rich, complete, and accurate hardware specifications
 * for all product categories in Global Mandiri Computer:
 * - Laptop, All-in-One, PC Desktop
 * - Printer, Projector, Starlink
 */

export interface SpecItem {
  label: string;
  value: string;
  highlight?: boolean;
  badge?: string;
}

export interface SpecGroup {
  id: string;
  title: string;
  subtitle: string;
  items: SpecItem[];
}

export interface MetricTile {
  label: string;
  value: string;
  unit: string;
  sub: string;
  detail: string;
}

export interface ResolvedProductSpecs {
  categoryType: "computer" | "printer" | "projector" | "starlink";
  metric1: MetricTile;
  metric2: MetricTile;
  metric3: MetricTile;
  metric4: MetricTile;
  groups: SpecGroup[];
  highlights: string[];
}

export function resolveProductSpecs(product: any): ResolvedProductSpecs {
  const name = product.name || "";
  const brand = (product.brand || "").toUpperCase();
  const category = (product.category || "").toUpperCase();
  const segment = (product.segment || "Mainstream").toUpperCase();
  const rawText = product.raw_spec_text || product.cleaned_description || "";

  if (category === "PRINTER") {
    return resolvePrinterSpecs(product, name, brand, rawText);
  }

  if (category === "PROJECTOR") {
    return resolveProjectorSpecs(product, name, brand, rawText);
  }

  if (category === "STARLINK") {
    return resolveStarlinkSpecs(product, name, brand, rawText);
  }

  // Otherwise: Computer (LAPTOP, ALL-IN-ONE, PC DESKTOP)
  return resolveComputerSpecs(product, name, brand, category, segment, rawText);
}

// ============================================================================
// COMPUTER SPECIFICATION RESOLVER (Laptop, AIO, PC Desktop)
// ============================================================================
function resolveComputerSpecs(
  product: any,
  name: string,
  brand: string,
  category: string,
  segment: string,
  rawText: string
): ResolvedProductSpecs {
  const isAIO = category === "ALL-IN-ONE";
  const isDesktop = category === "PC DESKTOP";
  const isLaptop = category === "LAPTOP" || (!isAIO && !isDesktop);

  // 1. Resolve CPU
  const cpuInfo = resolveCpuDetails(name, brand, product.cpu);

  // 2. Resolve RAM
  const ramGb = product.ram_gb || extractRamNumber(name) || 8;
  const ramInfo = resolveRamDetails(name, brand, ramGb, product.ram_type);

  // 3. Resolve Storage
  const storageVal = product.storage || extractStorage(name) || "512GB";
  const storageInfo = resolveStorageDetails(name, storageVal, product.storage_type);

  // 4. Resolve GPU
  const gpuInfo = resolveGpuDetails(name, brand, cpuInfo.fullName, product.gpu);

  // 5. Resolve Display / Screen
  const displayInfo = resolveDisplayDetails(name, category, brand, product.screen_size, product.screen_panel);

  // 6. Resolve Ports & Connectivity
  const portsInfo = resolvePortsDetails(category, brand, name);

  // 7. Resolve Wireless & Networking
  const wirelessInfo = resolveWirelessDetails(name, category);

  // 8. Resolve Multimedia & Input
  const multimediaInfo = resolveMultimediaDetails(name, category, brand);

  // 9. Resolve Battery & Power
  const powerInfo = resolvePowerDetails(name, category, segment);

  // 10. Resolve System & Warranty
  const warrantyText = product.warranty || resolveWarrantyText(brand, segment, isAIO);
  const bundledText = product.bundled_items || resolveBundledSoftware(name);
  const isTKDN = name.toUpperCase().includes("TKDN");

  // Metrics for Top 4 Hero Tiles
  const metric1: MetricTile = {
    label: "MEMORI UTAMA",
    value: `${ramGb}`,
    unit: "GB RAM",
    sub: ramInfo.typeShort,
    detail: ramInfo.expansionShort,
  };

  const metric2: MetricTile = {
    label: "PENYIMPANAN",
    value: storageVal.replace(/[^0-9]/g, "") || "512",
    unit: storageVal.includes("1TB") || storageVal.includes("2TB") ? "TB SSD" : "GB SSD",
    sub: storageInfo.typeShort,
    detail: storageInfo.speedShort,
  };

  const metric3: MetricTile = isDesktop
    ? {
        label: "OUTPUT DISPLAY",
        value: "4K",
        unit: "UHD READY",
        sub: "MULTI-MONITOR SUPPORT",
        detail: "HDMI 2.1 + DisplayPort 1.4",
      }
    : {
        label: isAIO ? "PANEL AIO" : "PANEL LAYAR",
        value: displayInfo.sizeShort.replace('"', ""),
        unit: 'INCH',
        sub: displayInfo.panelShort,
        detail: displayInfo.resShort,
      };

  const metric4: MetricTile = {
    label: "GRAFIS / CPU",
    value: gpuInfo.isDiscrete ? gpuInfo.shortName : cpuInfo.shortName,
    unit: gpuInfo.isDiscrete ? "DEDICATED" : "PROCESSOR",
    sub: gpuInfo.isDiscrete ? gpuInfo.vramText : `${cpuInfo.coresThreads}`,
    detail: gpuInfo.isDiscrete ? "Ray Tracing & DLSS" : `${cpuInfo.boostSpeed}`,
  };

  // Structured Spec Groups
  const groups: SpecGroup[] = [
    {
      id: "cpu",
      title: "PROSESOR & PLATFORM (CPU)",
      subtitle: "Arsitektur komputasi, jumlah inti performa, dan akselerasi sistem",
      items: [
        { label: "Model Prosesor", value: cpuInfo.fullName, highlight: true },
        { label: "Jumlah Core & Thread", value: cpuInfo.coresThreads },
        { label: "Kecepatan Clock", value: cpuInfo.clockSpeed },
        { label: "Cache & Arsitektur", value: cpuInfo.cacheArch },
        { label: "Akselerasi AI (NPU)", value: cpuInfo.npuSupport },
      ],
    },
    {
      id: "gpu",
      title: "PENGOLAH GRAFIS (GPU)",
      subtitle: "Performa visual, render multimedia, dan pemrosesan grafis 3D",
      items: [
        { label: "Kartu Grafis Utama", value: gpuInfo.fullName, highlight: true },
        { label: "Tipe Memori Grafis (VRAM)", value: gpuInfo.vramDetail },
        { label: "Fitur Visual & Engine", value: gpuInfo.features },
      ],
    },
    {
      id: "ram",
      title: "MEMORI & MULTITASKING (RAM)",
      subtitle: "Kapasitas RAM, tipe bus data, dan opsi ekspansi masa depan",
      items: [
        { label: "Kapasitas Terpasang", value: `${ramGb} GB RAM`, highlight: true },
        { label: "Tipe & Kecepatan Memori", value: ramInfo.fullName },
        { label: "Slot & Dukungan Ekspansi", value: ramInfo.expansionDetail },
      ],
    },
    {
      id: "storage",
      title: "PENYIMPANAN DATA (STORAGE)",
      subtitle: "Kecepatan booting, akses file NVMe, dan slot ekspansi drive",
      items: [
        { label: "Kapasitas SSD", value: storageInfo.capacity, highlight: true },
        { label: "Tipe Antarmuka", value: storageInfo.fullName },
        { label: "Slot Upgrade Tambahan", value: storageInfo.slotSupport },
      ],
    },
    ...(isDesktop
      ? [
          {
            id: "display",
            title: "DUKUNGAN MONITOR & RESOLUSI",
            subtitle: "Dukungan multi-display resolusi tinggi untuk produktivitas maksimal",
            items: [
              { label: "Maksimal Tampilan", value: "Hingga 3-4 Monitor Simultan (4K UHD / 8K Ready)", highlight: true },
              { label: "Output Port Video", value: "1x HDMI 2.1 TMDS, 2x DisplayPort 1.4a" },
              { label: "Rekomendasi Panel", value: "Kompatibel dengan monitor 60Hz - 240Hz Gaming & Content Creator" },
            ],
          },
        ]
      : [
          {
            id: "display",
            title: isAIO ? "LAYAR ALL-IN-ONE (INTEGRATED DISPLAY)" : "LAYAR & TAMPILAN (DISPLAY)",
            subtitle: "Akurasi warna, ketajaman piksel, dan proteksi kenyamanan mata",
            items: [
              { label: "Ukuran Diagonal Layar", value: displayInfo.sizeFull, highlight: true },
              { label: "Resolusi & Aspek Rasio", value: displayInfo.resolution },
              { label: "Teknologi Panel", value: displayInfo.panelType },
              { label: "Refresh Rate & Warna", value: displayInfo.refreshColor },
              { label: "Kecerahan & Fitur Proteksi", value: displayInfo.brightnessFeatures },
            ],
          },
        ]),
    {
      id: "ports",
      title: "PORT & KONEKTIVITAS FISIK (I/O)",
      subtitle: "Antarmuka perangkat luar, transfer data cepat, dan output display",
      items: [
        { label: "Port USB Type-C", value: portsInfo.typeC },
        { label: "Port USB Type-A", value: portsInfo.typeA },
        { label: "Port Output Video", value: portsInfo.videoOut },
        { label: "Port Jaringan Fisik", value: portsInfo.lanPort },
        { label: "Port Audio", value: portsInfo.audioJack },
        { label: "Slot Kartu Memori", value: portsInfo.cardReader },
      ],
    },
    {
      id: "wireless",
      title: "JARINGAN & NIRKABEL (WIRELESS)",
      subtitle: "Koneksi internet tanpa kabel cepat dan sinkronisasi Bluetooth",
      items: [
        { label: "Standar Wi-Fi", value: wirelessInfo.wifi, highlight: true },
        { label: "Bluetooth", value: wirelessInfo.bluetooth },
      ],
    },
    {
      id: "multimedia",
      title: isAIO ? "AUDIO, KAMERA & PERIFERAL" : "KAMERA, AUDIO & KEYBOARD",
      subtitle: "Kebutuhan panggilan video, kualitas suara speaker, dan kenyamanan ketik",
      items: [
        { label: "Kamera Web (Webcam)", value: multimediaInfo.webcam },
        { label: "Sistem Mikrofon", value: multimediaInfo.microphone },
        { label: "Speaker Audio", value: multimediaInfo.speakers },
        { label: isAIO ? "Keyboard & Mouse Bawaan" : "Keyboard & Touchpad", value: multimediaInfo.inputDevice },
      ],
    },
    {
      id: "power",
      title: isLaptop ? "BATERAI & CATU DAYA" : "CATU DAYA & EFISIENSI LISTRIK",
      subtitle: isLaptop ? "Daya tahan pemakaian portabel dan adaptor pengisian cepat" : "Efisiensi daya dan stabilitas voltase catu daya",
      items: [
        ...(isLaptop ? [{ label: "Kapasitas Baterai", value: powerInfo.battery, highlight: true }] : []),
        { label: "Adaptor Daya", value: powerInfo.adapter },
        { label: "Fitur Pengisian", value: powerInfo.features },
      ],
    },
    {
      id: "system",
      title: "SISTEM OPERASI, LISENSI & GARANSI",
      subtitle: "Keaslian software, legalitas garansi distributor, dan sertifikasi",
      items: [
        { label: "Sistem Operasi", value: product.os || "Windows 11 Home 64-bit Original", highlight: true },
        { label: "Software Produktivitas", value: bundledText },
        ...(isTKDN ? [{ label: "Sertifikasi TKDN", value: "Tersertifikasi TKDN + BMP Kemenperin RI (>40% Bobot)" }] : []),
        { label: "Jaminan Garansi Resmi", value: warrantyText, highlight: true },
      ],
    },
  ];

  const highlights = [
    `${cpuInfo.shortName} • ${cpuInfo.coresThreads}`,
    `${ramGb}GB ${ramInfo.typeShort} • ${storageVal} NVMe SSD`,
    isDesktop ? "4K Multi-Monitor Output" : `${displayInfo.sizeShort} ${displayInfo.resShort} ${displayInfo.panelShort}`,
    gpuInfo.fullName,
    "100% Unit Baru & Garansi Resmi Indonesia",
  ];

  return {
    categoryType: "computer",
    metric1,
    metric2,
    metric3,
    metric4,
    groups,
    highlights,
  };
}

// ============================================================================
// PRINTER SPECIFICATION RESOLVER
// ============================================================================
function resolvePrinterSpecs(product: any, name: string, brand: string, rawText: string): ResolvedProductSpecs {
  const isAIO = name.toLowerCase().includes("all-in-one") || name.toLowerCase().includes("l3210") || name.toLowerCase().includes("l3250") || name.toLowerCase().includes("dcp") || name.toLowerCase().includes("g2020");
  const isWifi = name.toLowerCase().includes("wi-fi") || name.toLowerCase().includes("wifi") || name.toLowerCase().includes("l3250") || name.toLowerCase().includes("l4260");

  const metric1: MetricTile = {
    label: "FUNGSI UTAMA",
    value: isAIO ? "PRINT" : "PRINT",
    unit: isAIO ? "SCAN & COPY" : "ONLY",
    sub: "INK TANK SYSTEM",
    detail: "Tangki Tinta Infus Pabrikan",
  };

  const metric2: MetricTile = {
    label: "RESOLUSI CETAK",
    value: "5760",
    unit: "x 1440 DPI",
    sub: "MICRO PIEZO / INKJET",
    detail: "Ketajaman teks & foto optimal",
  };

  const metric3: MetricTile = {
    label: "KECEPATAN CETAK",
    value: "10.0",
    unit: "IPM (HITAM)",
    sub: "5.0 IPM WARNA (ISO)",
    detail: "Draft hingga 33 ppm hitam",
  };

  const metric4: MetricTile = {
    label: "KONEKTIVITAS",
    value: isWifi ? "WI-FI" : "USB 2.0",
    unit: isWifi ? "& DIRECT" : "HIGH-SPEED",
    sub: isWifi ? "MOBILE PRINTING" : "PLUG & PLAY",
    detail: isWifi ? "Apple AirPrint & Android" : "Kompatibel Win & Mac",
  };

  const groups: SpecGroup[] = [
    {
      id: "print_tech",
      title: "FUNGSI & TEKNOLOGI CETAK",
      subtitle: "Metode print head, konfigurasi nozzle, dan sistem pengisian tinta",
      items: [
        { label: "Fungsi Perangkat", value: isAIO ? "Multifungsi 3-in-1: Print, Scan, Copy" : "Single Function: Print", highlight: true },
        { label: "Teknologi Print Head", value: `${brand} Precision Micro Piezo / Thermal Inkjet Technology` },
        { label: "Sistem Tinta", value: "EcoTank / Ink Tank System Terintegrasi Pabrik (Anti-Bocor & Anti-Tumpah)" },
        { label: "Arah Cetak", value: "Bi-directional printing (Cetak Dua Arah Presisi)" },
      ],
    },
    {
      id: "print_quality",
      title: "RESOLUSI & KECEPATAN CETAK",
      subtitle: "Kepadatan titik per inci dan kecepatan lembar per menit",
      items: [
        { label: "Resolusi Cetak Maksimal", value: "Hingga 5760 x 1440 dpi (dengan Variable-Sized Droplet Technology)", highlight: true },
        { label: "Kecepatan ISO (A4)", value: "Hingga 10.0 ipm (Hitam) / 5.0 ipm (Warna)" },
        { label: "Kecepatan Draft Maksimal", value: "Hingga 33 ppm (Hitam) / 15 ppm (Warna)" },
        { label: "Cetak Foto Borderless", value: "Mendukung Cetak Foto Tanpa Garis Tepi (Borderless 4R / 10x15 cm)" },
      ],
    },
    ...(isAIO
      ? [
          {
            id: "scanner",
            title: "PEMINDAI & MESIN FOTOKOPI (SCAN & COPY)",
            subtitle: "Sensor gambar flatbed, resolusi optik scan, dan kecepatan salin dokumen",
            items: [
              { label: "Tipe Pemindai (Scanner)", value: "Flatbed Color Image Scanner (Sensor CIS)", highlight: true },
              { label: "Resolusi Optik Scan", value: "1200 x 2400 dpi (Area Scan Maksimal 216 x 297 mm)" },
              { label: "Format File Hasil Scan", value: "PDF, JPEG, TIFF, PNG, Multi-Page PDF" },
              { label: "Kecepatan Fotokopi (A4)", value: "Hingga 7.7 ipm (Hitam) / 3.8 ipm (Warna)" },
              { label: "Maksimal Salinan Dokumen", value: "Hingga 20 salinan sekaligus" },
            ],
          },
        ]
      : []),
    {
      id: "paper_handling",
      title: "PENANGANAN KERTAS & MEDIA",
      subtitle: "Kapasitas baki kertas masuk/keluar dan ragam ukuran dokumen",
      items: [
        { label: "Kapasitas Baki Kertas Masuk", value: "Hingga 100 lembar kertas HVS A4 (80 gsm) / 20 lembar Photo Paper", highlight: true },
        { label: "Kapasitas Baki Kertas Keluar", value: "Hingga 30 lembar kertas A4" },
        { label: "Ukuran Kertas yang Didukung", value: "A4, A5, A6, B5, Letter, Legal, Folio/F4, Envelopes (DL, C6, No. 10), 4x6\" Photo" },
        { label: "Ketebalan Kertas Maksimal", value: "64 gsm hingga 300 gsm (Kertas HVS, Glossy Photo Paper, Matte Paper)" },
      ],
    },
    {
      id: "connectivity",
      title: "KONEKTIVITAS & KEMUDAHAN OPERASI",
      subtitle: "Port antarmuka kabel dan kemampuan cetak nirkabel dari smartphone",
      items: [
        { label: "Antarmuka Kabel", value: "USB 2.0 High-Speed Port (Kabel USB disertakan dalam paket)" },
        { label: "Koneksi Nirkabel (Wi-Fi)", value: isWifi ? "Wi-Fi IEEE 802.11b/g/n + Wi-Fi Direct (Tanpa Router)" : "Tidak Didukung (Koneksi Kabel USB Langsung)" },
        { label: "Aplikasi Mobile Printing", value: isWifi ? "Mendukung Epson Smart Panel / Canon PRINT / Apple AirPrint & Mopria" : "Hanya via PC / Laptop Driver" },
        { label: "Kompatibilitas Sistem", value: "Windows 11, 10, 8.1, 8, 7 / macOS 10.9 atau yang lebih baru" },
      ],
    },
    {
      id: "ink_warranty",
      title: "TINTA BOTOL ASLI & GARANSI RESMI",
      subtitle: "Kapasitas cetak ribuan lembar dan perlindungan garansi pabrikan",
      items: [
        { label: "Tinta Botol Original", value: "4 Botol Tinta Asli (Black, Cyan, Magenta, Yellow) disertakan di dalam dus", highlight: true },
        { label: "Kapasitas Cetak Tinta", value: "Hingga 4.500 Halaman Dokumen Hitam & 7.500 Halaman Dokumen Warna" },
        { label: "Konsumsi Daya Listrik", value: "Sangat Hemat Energi: Operasi ~12 Watt, Mode Siaga ~4.3 Watt, Sleep ~0.7 Watt" },
        { label: "Garansi Resmi Pabrikan", value: product.warranty || "Garansi Resmi 2 Tahun atau 30.000 Lembar Cetak (Termasuk Print Head)", highlight: true },
      ],
    },
  ];

  const highlights = [
    isAIO ? "Multifungsi Print, Scan, Copy" : "Sistem Infus Pabrik EcoTank",
    "Resolusi Ultra Tajam 5760 x 1440 dpi",
    "Hemat Biaya Cetak: 1 Botol s/d 4.500 Halaman",
    "Termasuk 4 Botol Tinta Original Lengkap",
    product.warranty || "Garansi Resmi Distributor 2 Tahun",
  ];

  return {
    categoryType: "printer",
    metric1,
    metric2,
    metric3,
    metric4,
    groups,
    highlights,
  };
}

// ============================================================================
// PROJECTOR SPECIFICATION RESOLVER
// ============================================================================
function resolveProjectorSpecs(product: any, name: string, brand: string, rawText: string): ResolvedProductSpecs {
  const lumens = extractLumens(name) || "3.600";
  const res = name.includes("1080") || name.includes("Full HD") ? "1080P" : name.includes("WXGA") ? "WXGA" : "XGA";

  const metric1: MetricTile = {
    label: "KECERAHAN OPTIK",
    value: lumens.replace(/[^0-9]/g, ""),
    unit: "ANSI LUMENS",
    sub: "TERANG & TAJAM",
    detail: "Jelas dalam ruangan kelas & meeting",
  };

  const metric2: MetricTile = {
    label: "RESOLUSI NATIVE",
    value: res,
    unit: res === "1080P" ? "1920x1080" : res === "WXGA" ? "1280x800" : "1024x768",
    sub: "ASPEK RASIO 4:3 / 16:9",
    detail: "Teks tajam tanpa blur piksel",
  };

  const metric3: MetricTile = {
    label: "RASIO KONTRAS",
    value: "15.000:1",
    unit: "HIGH CONTRAST",
    sub: "KEDALAMAN WARNA",
    detail: "Gradasi hitam & detail tajam",
  };

  const metric4: MetricTile = {
    label: "UMUR LAMPU",
    value: "12.000",
    unit: "JAM OPERASI",
    sub: "SMARTECO MODE",
    detail: "Hemat biaya pemeliharaan lampu",
  };

  const groups: SpecGroup[] = [
    {
      id: "optical",
      title: "SISTEM OPTIK & KECERAHAN",
      subtitle: "Teknologi proyeksi gambar, output lumens, dan performa pencahayaan",
      items: [
        { label: "Teknologi Sistem Proyeksi", value: brand === "EPSON" ? "3LCD Technology (3 Panel LCD Terpisah)" : "DLP® Digital Light Processing System", highlight: true },
        { label: "Tingkat Kecerahan Cahaya", value: `${lumens} ANSI Lumens (White & Colour Brightness Seimbang)` },
        { label: "Rasio Kontras Statis", value: "15.000:1 hingga 22.000:1 (Dynamic Contrast)" },
        { label: "Reproduksi Warna", value: "Hingga 1.07 Miliar Warna (Full 30-bit Processing)" },
      ],
    },
    {
      id: "resolution",
      title: "RESOLUSI & KUALITAS TAMPILAN",
      subtitle: "Resolusi asli, kompatibilitas sinyal input, dan rasio aspek",
      items: [
        { label: "Resolusi Native", value: res === "1080P" ? "Full HD 1080p (1920 x 1080 piksel)" : res === "WXGA" ? "WXGA (1280 x 800 piksel)" : "XGA (1024 x 768 piksel)", highlight: true },
        { label: "Resolusi Maksimum Didukung", value: "Hingga WUXGA (1920 x 1200) @ 60Hz" },
        { label: "Rasio Aspek Bawaan", value: res === "1080P" || res === "WXGA" ? "16:9 / 16:10 Widescreen" : "4:3 Native (Dapat dialihkan ke 16:9)" },
      ],
    },
    {
      id: "projection",
      title: "UKURAN LAYAR & JARAK TEMBAK",
      subtitle: "Fleksibilitas pemasangan proyektor di ruangan meeting, kelas, atau aula",
      items: [
        { label: "Ukuran Layar Proyeksi", value: "30 inci hingga 300 inci (Diagonal Layar)", highlight: true },
        { label: "Rasio Jarak Tembak (Throw Ratio)", value: "1.48 : 1 hingga 2.02 : 1" },
        { label: "Rasio Zoom Optik", value: "1.2x Manual Zoom & Manual Focus Lens" },
        { label: "Koreksi Keystone", value: "Auto / Manual Vertical Keystone Correction ±30° hingga ±40°" },
      ],
    },
    {
      id: "lamp",
      title: "SUMBER CAHAYA & UMUR LAMPU",
      subtitle: "Efisiensi konsumsi daya lampu dan ketahanan pemakaian jangka panjang",
      items: [
        { label: "Tipe Lampu Proyektor", value: "High-Efficiency Mercury Vapor Lamp / UHE Lamp", highlight: true },
        { label: "Umur Lampu (Mode Standar)", value: "Hingga 6.000 Jam Operasi Normal" },
        { label: "Umur Lampu (SmartEco Mode)", value: "Hingga 12.000 - 15.000 Jam Penggunaan Hemat" },
        { label: "Konsumsi Daya Listrik", value: "Rata-rata 270 Watt saat aktif, <0.5 Watt saat standby" },
      ],
    },
    {
      id: "interfaces",
      title: "PORT MASUKAN & KELUARAN (I/O)",
      subtitle: "Kompatibilitas input laptop, PC desktop, media player, dan audio eksternal",
      items: [
        { label: "Port Input HDMI", value: "1x / 2x HDMI 1.4b (Dukungan sinyal digital HDCP)", highlight: true },
        { label: "Port Input VGA (D-Sub)", value: "1x VGA In (Kompatibel PC/Laptop jadul)" },
        { label: "Port Output Monitor (VGA Out)", value: "1x VGA Out (Loop-through monitor lokal)" },
        { label: "Port Audio", value: "1x 3.5mm Audio In & 1x 3.5mm Audio Out" },
        { label: "Port USB", value: "1x USB Type-A (Catu daya 5V/1.5A dongle nirkabel) + 1x USB Type-B" },
      ],
    },
    {
      id: "features_warranty",
      title: "AUDIO, FITUR CERDAS & GARANSI",
      subtitle: "Speaker bawaan, kemudahan operasional langsung, dan garansi resmi distributor",
      items: [
        { label: "Speaker Terintegrasi", value: "Built-in 2W - 10W Clear Sound Speaker" },
        { label: "Fitur Instan", value: "Instant Power-Off, Direct Power On, Wall Color Correction, Kensington Security Slot" },
        { label: "Kelengkapan Paket Dus", value: "Unit Proyektor, Remote Control Asli + Baterai, Kabel VGA / HDMI, Kabel Power AC, Kartu Garansi" },
        { label: "Garansi Resmi Distributor", value: product.warranty || "Garansi Resmi 3 Tahun Unit & Sparepart, 2 Tahun / 1.000 Jam Lampu", highlight: true },
      ],
    },
  ];

  const highlights = [
    `Tingkat Kecerahan ${lumens} ANSI Lumens`,
    `Resolusi Native ${res} Jernih & Presisi`,
    "Daya Tahan Lampu s/d 12.000 Jam Eco",
    "Fleksibel: Port HDMI & VGA Lengkap",
    product.warranty || "Garansi Resmi Distributor 3 Tahun Unit",
  ];

  return {
    categoryType: "projector",
    metric1,
    metric2,
    metric3,
    metric4,
    groups,
    highlights,
  };
}

// ============================================================================
// STARLINK SPECIFICATION RESOLVER
// ============================================================================
function resolveStarlinkSpecs(product: any, name: string, brand: string, rawText: string): ResolvedProductSpecs {
  const isMini = name.toLowerCase().includes("mini");
  const isGen3 = name.toLowerCase().includes("gen 3") || name.toLowerCase().includes("standard kit");

  const metric1: MetricTile = {
    label: "KECEPATAN UNDUH",
    value: "250+",
    unit: "MBPS HIGH-SPEED",
    sub: "LOW EARTH ORBIT (LEO)",
    detail: "Koneksi satelit tanpa kabel terestrial",
  };

  const metric2: MetricTile = {
    label: "LATENSI RESPON",
    value: "25-45",
    unit: "MS LATENCY",
    sub: "ULTRA LOW LATENCY",
    detail: "Lancar untuk Zoom, Gaming & Streaming",
  };

  const metric3: MetricTile = {
    label: "STANDAR WI-FI",
    value: isMini || isGen3 ? "WI-FI 6" : "WI-FI 5",
    unit: "DUAL BAND",
    sub: "JANGKAUAN LUAS",
    detail: "Mendukung ratusan perangkat simultan",
  };

  const metric4: MetricTile = {
    label: "KETAHANAN CUACA",
    value: "IP67",
    unit: "WEATHERPROOF",
    sub: "EXTREME DURABILITY",
    detail: "Tahan hujan badai, salju, dan panas terik",
  };

  const groups: SpecGroup[] = [
    {
      id: "internet_perf",
      title: "PERFORMA INTERNET & KONEKSI SATELIT",
      subtitle: "Kecepatan akses data broadband dari ribuan satelit orbit rendah bumi (LEO)",
      items: [
        { label: "Kecepatan Unduh (Download)", value: "50 hingga 250+ Mbps (Kecepatan broadband satelit berkecepatan tinggi)", highlight: true },
        { label: "Kecepatan Unggah (Upload)", value: "10 hingga 25+ Mbps" },
        { label: "Latensi Jaringan", value: "25 hingga 45 ms (Rendah dan stabil, cocok untuk panggilan video HD & gaming online)" },
        { label: "Batas Kuota Pemakaian", value: "100% Unlimited Data (Tanpa batas FUP harian/bulanan)" },
      ],
    },
    {
      id: "antenna_tech",
      title: "ANTENA & TEKNOLOGI PERANGKAT (DISH)",
      subtitle: "Antena phased array canggih dengan pelacakan sinar elektronik instan",
      items: [
        { label: "Tipe Antena", value: "Electronic Phased Array Beamforming Antenna", highlight: true },
        { label: "Orientasi & Penyesuaian", value: isMini ? "Software-Assisted Manual Tilt dengan kickstand portabel" : "Bermotor Otomatis (Self-Orienting Motorized Alignment)" },
        { label: "Bidang Pandang (Field of View)", value: "100° hingga 110° sudut pandang langit terbuka" },
        { label: "Ketinggian Satelit", value: "~550 km (Low Earth Orbit / Orbit Rendah Bumi, 60x lebih dekat dari satelit geostasioner konvensional)" },
      ],
    },
    {
      id: "wifi_router",
      title: "ROUTER & JARINGAN NIRKABEL (WI-FI)",
      subtitle: "Spesifikasi pemancar sinyal router, protokol keamanan, dan kapasitas perangkat",
      items: [
        { label: "Standar Nirkabel Wi-Fi", value: isMini || isGen3 ? "Wi-Fi 6 (802.11ax) Tri-Band / Dual-Band 3x3 MIMO" : "Wi-Fi 5 (802.11ac) Dual Band 3x3 MIMO", highlight: true },
        { label: "Jangkauan Area Sinyal", value: isMini ? "Hingga 112 m² (Ideal untuk tenda camping, campervan, dan kapal)" : "Hingga 297 m² (3.200 sq ft - Menembus dinding rumah & kantor)" },
        { label: "Protokol Keamanan", value: "WPA2 / WPA3 Personal Encryption Teruji" },
        { label: "Dukungan Jaringan Mesh", value: "Kompatibel dengan Starlink Mesh Router untuk perluasan area" },
      ],
    },
    {
      id: "weather_ports",
      title: "PORT FISIK & KETAHANAN CUACA EKSTREM",
      subtitle: "Kekuatan rancang bangun terhadap suhu, hujan deras, debu, dan hembusan angin",
      items: [
        { label: "Peringkat Ketahanan Cuaca", value: "IP67 Weather Resistant (Kedap debu total dan tahan semprotan air bertekanan/hujan lebat)", highlight: true },
        { label: "Suhu Operasional", value: "-30°C hingga 50°C (-22°F hingga 122°F)" },
        { label: "Ketahanan Angin", value: "Dapat bertahan pada kecepatan angin operasional hingga 96+ km/jam (60+ mph)" },
        { label: "Port Fisik Antarmuka", value: "1x / 2x Port Ethernet RJ-45 Gigabit dengan pelindung seal kedap air" },
      ],
    },
    {
      id: "power_supply",
      title: "KONSUMSI DAYA LISTRIK & CATU DAYA",
      subtitle: "Kebutuhan daya listrik efisien, fleksibel untuk rumah maupun sumber daya portabel",
      items: [
        { label: "Konsumsi Daya Rata-Rata", value: isMini ? "Sangat Hemat: 25 Watt - 40 Watt (Dapat ditenagai Power Bank USB-PD 100W / Aki 12V-48V)" : "50 Watt - 75 Watt Operasional Stabil", highlight: true },
        { label: "Tegangan Masukan (AC)", value: "100-240V AC 50/60Hz Otomatis Menyesuaikan" },
        { label: "Fitur Pencair Salju / Es", value: "Otomatis mengaktifkan pemanas saat mendeteksi suhu beku (Snow Melting)" },
      ],
    },
    {
      id: "kit_legal",
      title: "KELENGKAPAN BOX & LEGALITAS RESMI INDONESIA",
      subtitle: "Jaminan perangkat 100% resmi, berizin Kominfo, dan perlindungan garansi",
      items: [
        { label: "Isi Paket Pembelian", value: "Antena Starlink, Dudukan Base / Kickstand, Router Wi-Fi, Kabel Starlink 15m, Kabel Daya AC, Catu Daya Resmi", highlight: true },
        { label: "Legalitas & Izin Resmi", value: "100% Unit Resmi Starlink Indonesia berizin Kominfo RI, Bebas Blokir IMEI & Resmi Berlangganan" },
        { label: "Aktivasi Layanan", value: "Aktivasi mudah & mandiri dalam 15 menit melalui Aplikasi Resmi Starlink (iOS / Android)" },
        { label: "Garansi Resmi", value: product.warranty || "Garansi Resmi Distributor Starlink Indonesia 1 Tahun", highlight: true },
      ],
    },
  ];

  const highlights = [
    "Internet Satelit Cepat 250+ Mbps Tanpa Kabel",
    "Latensi Rendah 25-45 ms & Tanpa Batas Kuota",
    "Tahan Cuaca Badai & Hujan Tropis (IP67)",
    "Pemasangan Mandiri Mudah via Aplikasi Starlink",
    "100% Unit Resmi Berizin Kominfo Indonesia",
  ];

  return {
    categoryType: "starlink",
    metric1,
    metric2,
    metric3,
    metric4,
    groups,
    highlights,
  };
}

// ============================================================================
// HELPER LOGIC FOR CPUS, GPUS, DISPLAYS, RAM, STORAGE
// ============================================================================

function resolveCpuDetails(name: string, brand: string, rawCpu?: string | null) {
  const n = (name + " " + (rawCpu || "")).toLowerCase();

  // Intel Core Ultra 200 Series (Lunar Lake / Arrow Lake)
  if (n.includes("ultra 7 258v") || n.includes("ultra 7 256v")) {
    return {
      fullName: "Intel® Core™ Ultra 7 258V (8 Cores: 4 Lion Cove P-Cores, 4 Skymont LP E-Cores, 8 Threads, Up to 4.80 GHz)",
      shortName: "Core Ultra 7 258V",
      coresThreads: "8 Cores • 8 Threads",
      clockSpeed: "Up to 4.80 GHz Max Boost Clock",
      cacheArch: "12 MB Intel® Smart Cache • Intel Lunar Lake Architecture (3nm TSMC)",
      npuSupport: "Intel® AI Boost NPU hingga 47 NPU TOPS (Copilot+ PC Ready)",
      boostSpeed: "Up to 4.80 GHz Turbo",
    };
  }

  // Intel Core Ultra Series 1 (Meteor Lake)
  if (n.includes("ultra 7 155h")) {
    return {
      fullName: "Intel® Core™ Ultra 7 155H (16 Cores: 6 P-Cores, 8 E-Cores, 2 Low Power E-Cores, 22 Threads, Up to 4.80 GHz)",
      shortName: "Core Ultra 7 155H",
      coresThreads: "16 Cores • 22 Threads",
      clockSpeed: "Up to 4.80 GHz Max Turbo",
      cacheArch: "24 MB Intel® Smart Cache • Intel Meteor Lake 3D Foveros (Intel 4)",
      npuSupport: "Integrated Intel® AI Boost NPU (Generative AI & Studio Effects)",
      boostSpeed: "Up to 4.80 GHz Turbo",
    };
  }

  if (n.includes("ultra 5 125h")) {
    return {
      fullName: "Intel® Core™ Ultra 5 125H (14 Cores: 4 P-Cores, 8 E-Cores, 2 Low Power E-Cores, 18 Threads, Up to 4.50 GHz)",
      shortName: "Core Ultra 5 125H",
      coresThreads: "14 Cores • 18 Threads",
      clockSpeed: "Up to 4.50 GHz Max Turbo",
      cacheArch: "18 MB Intel® Smart Cache • Intel Meteor Lake (Intel 4)",
      npuSupport: "Integrated Intel® AI Boost NPU (Percepatan AI Lokal)",
      boostSpeed: "Up to 4.50 GHz Turbo",
    };
  }

  // Intel Core 14th Gen HX / H
  if (n.includes("i9-14900hx") || n.includes("14900hx")) {
    return {
      fullName: "Intel® Core™ i9-14900HX (24 Cores: 8 P-Cores, 16 E-Cores, 32 Threads, Up to 5.80 GHz Max Turbo)",
      shortName: "Core i9-14900HX",
      coresThreads: "24 Cores • 32 Threads",
      clockSpeed: "Base 2.20 GHz, Boost hingga 5.80 GHz Turbo",
      cacheArch: "36 MB Intel® Smart Cache • Raptor Lake Refresh",
      npuSupport: "Intel® Deep Learning Boost (DL Boost)",
      boostSpeed: "Up to 5.80 GHz Turbo",
    };
  }

  if (n.includes("i7-14700hx") || n.includes("14700hx")) {
    return {
      fullName: "Intel® Core™ i7-14700HX (20 Cores: 8 P-Cores, 12 E-Cores, 28 Threads, Up to 5.50 GHz Max Turbo)",
      shortName: "Core i7-14700HX",
      coresThreads: "20 Cores • 28 Threads",
      clockSpeed: "Up to 5.50 GHz Max Turbo",
      cacheArch: "33 MB Intel® Smart Cache • Raptor Lake Refresh",
      npuSupport: "Intel® DL Boost",
      boostSpeed: "Up to 5.50 GHz Turbo",
    };
  }

  if (n.includes("i7-14650hx") || n.includes("14650hx")) {
    return {
      fullName: "Intel® Core™ i7-14650HX (16 Cores: 8 P-Cores, 8 E-Cores, 24 Threads, Up to 5.20 GHz)",
      shortName: "Core i7-14650HX",
      coresThreads: "16 Cores • 24 Threads",
      clockSpeed: "Up to 5.20 GHz Max Turbo",
      cacheArch: "30 MB Intel® Smart Cache • Raptor Lake Refresh",
      npuSupport: "Intel® DL Boost",
      boostSpeed: "Up to 5.20 GHz Turbo",
    };
  }

  // Intel Core 7 150U / Core 5 120U
  if (n.includes("core 7 150u") || n.includes("7 150u")) {
    return {
      fullName: "Intel® Core™ 7 150U (10 Cores: 2 P-Cores, 8 E-Cores, 12 Threads, Up to 5.40 GHz Max Turbo)",
      shortName: "Intel Core 7 150U",
      coresThreads: "10 Cores • 12 Threads",
      clockSpeed: "Up to 5.40 GHz Max Turbo",
      cacheArch: "12 MB Intel® Smart Cache • Raptor Lake Architecture",
      npuSupport: "Intel® DL Boost",
      boostSpeed: "Up to 5.40 GHz Turbo",
    };
  }

  if (n.includes("core 5 120u") || n.includes("5 120u")) {
    return {
      fullName: "Intel® Core™ 5 120U (10 Cores: 2 P-Cores, 8 E-Cores, 12 Threads, Up to 5.00 GHz Max Turbo)",
      shortName: "Intel Core 5 120U",
      coresThreads: "10 Cores • 12 Threads",
      clockSpeed: "Up to 5.00 GHz Max Turbo",
      cacheArch: "12 MB Intel® Smart Cache • Raptor Lake Architecture",
      npuSupport: "Intel® DL Boost",
      boostSpeed: "Up to 5.00 GHz Turbo",
    };
  }

  // Intel Core 13th Gen (i5-1334U, i5-1335U, i7-1355U, i5-13420H, i7-13620H)
  if (n.includes("1334u")) {
    return {
      fullName: "Intel® Core™ i5-1334U (10 Cores: 2 P-Cores, 8 E-Cores, 12 Threads, Up to 4.60 GHz Max Turbo)",
      shortName: "Core i5-1334U",
      coresThreads: "10 Cores • 12 Threads",
      clockSpeed: "Base 1.30 GHz, Boost hingga 4.60 GHz Turbo",
      cacheArch: "12 MB Intel® Smart Cache • 13th Gen Raptor Lake (Intel 7)",
      npuSupport: "Intel® Gaussian & Neural Accelerator 3.0",
      boostSpeed: "Up to 4.60 GHz Turbo",
    };
  }

  if (n.includes("1335u")) {
    return {
      fullName: "Intel® Core™ i5-1335U (10 Cores: 2 P-Cores, 8 E-Cores, 12 Threads, Up to 4.60 GHz Max Turbo)",
      shortName: "Core i5-1335U",
      coresThreads: "10 Cores • 12 Threads",
      clockSpeed: "Up to 4.60 GHz Max Turbo",
      cacheArch: "12 MB Intel® Smart Cache • 13th Gen Raptor Lake",
      npuSupport: "Intel® GNA 3.0",
      boostSpeed: "Up to 4.60 GHz Turbo",
    };
  }

  if (n.includes("1355u")) {
    return {
      fullName: "Intel® Core™ i7-1355U (10 Cores: 2 P-Cores, 8 E-Cores, 12 Threads, Up to 5.00 GHz Max Turbo)",
      shortName: "Core i7-1355U",
      coresThreads: "10 Cores • 12 Threads",
      clockSpeed: "Up to 5.00 GHz Max Turbo",
      cacheArch: "12 MB Intel® Smart Cache • 13th Gen Raptor Lake",
      npuSupport: "Intel® GNA 3.0",
      boostSpeed: "Up to 5.00 GHz Turbo",
    };
  }

  if (n.includes("13420h")) {
    return {
      fullName: "Intel® Core™ i5-13420H (8 Cores: 4 P-Cores, 4 E-Cores, 12 Threads, Up to 4.60 GHz Max Turbo)",
      shortName: "Core i5-13420H",
      coresThreads: "8 Cores • 12 Threads",
      clockSpeed: "Base 2.10 GHz, Boost hingga 4.60 GHz",
      cacheArch: "12 MB Intel® Smart Cache • High Performance H-Series",
      npuSupport: "Intel® DL Boost",
      boostSpeed: "Up to 4.60 GHz Turbo",
    };
  }

  if (n.includes("13620h")) {
    return {
      fullName: "Intel® Core™ i7-13620H (10 Cores: 6 P-Cores, 4 E-Cores, 16 Threads, Up to 4.90 GHz)",
      shortName: "Core i7-13620H",
      coresThreads: "10 Cores • 16 Threads",
      clockSpeed: "Up to 4.90 GHz Max Turbo",
      cacheArch: "24 MB Intel® Smart Cache • High Performance H-Series",
      npuSupport: "Intel® DL Boost",
      boostSpeed: "Up to 4.90 GHz Turbo",
    };
  }

  if (n.includes("1315u")) {
    return {
      fullName: "Intel® Core™ i3-1315U (6 Cores: 2 P-Cores, 4 E-Cores, 8 Threads, Up to 4.50 GHz Max Turbo)",
      shortName: "Core i3-1315U",
      coresThreads: "6 Cores • 8 Threads",
      clockSpeed: "Up to 4.50 GHz Max Turbo",
      cacheArch: "10 MB Intel® Smart Cache • 13th Gen Raptor Lake",
      npuSupport: "Intel® GNA 3.0",
      boostSpeed: "Up to 4.50 GHz Turbo",
    };
  }

  // Intel Core 12th Gen (1215U, 1235U, 12450H)
  if (n.includes("1215u")) {
    return {
      fullName: "Intel® Core™ i3-1215U (6 Cores: 2 P-Cores, 4 E-Cores, 8 Threads, Up to 4.40 GHz Max Turbo)",
      shortName: "Core i3-1215U",
      coresThreads: "6 Cores • 8 Threads",
      clockSpeed: "Up to 4.40 GHz Max Turbo",
      cacheArch: "10 MB Intel® Smart Cache • 12th Gen Alder Lake",
      npuSupport: "Intel® GNA 3.0",
      boostSpeed: "Up to 4.40 GHz Turbo",
    };
  }

  if (n.includes("1235u")) {
    return {
      fullName: "Intel® Core™ i5-1235U (10 Cores: 2 P-Cores, 8 E-Cores, 12 Threads, Up to 4.40 GHz Max Turbo)",
      shortName: "Core i5-1235U",
      coresThreads: "10 Cores • 12 Threads",
      clockSpeed: "Up to 4.40 GHz Max Turbo",
      cacheArch: "12 MB Intel® Smart Cache • 12th Gen Alder Lake",
      npuSupport: "Intel® GNA 3.0",
      boostSpeed: "Up to 4.40 GHz Turbo",
    };
  }

  // Celeron
  if (n.includes("celeron 7305") || n.includes("7305")) {
    return {
      fullName: "Intel® Celeron® 7305 (5 Cores: 1 P-Core, 4 E-Cores, 5 Threads, 1.10 GHz Base, 8MB Cache)",
      shortName: "Celeron 7305",
      coresThreads: "5 Cores • 5 Threads",
      clockSpeed: "1.10 GHz Base Clock (Efisiensi Tinggi 15W)",
      cacheArch: "8 MB Intel® Smart Cache • Alder Lake Architecture",
      npuSupport: "Standard Architecture",
      boostSpeed: "1.10 GHz Base",
    };
  }

  if (n.includes("n4500") || n.includes("n4020")) {
    return {
      fullName: "Intel® Celeron® N4500 (2 Cores, 2 Threads, Burst Clock hingga 2.80 GHz, 4MB L3 Cache)",
      shortName: "Celeron N4500",
      coresThreads: "2 Cores • 2 Threads",
      clockSpeed: "Base 1.10 GHz, Burst hingga 2.80 GHz",
      cacheArch: "4 MB Cache • Jasper Lake (6W TDP Ultra Hemat)",
      npuSupport: "Standard Architecture",
      boostSpeed: "Up to 2.80 GHz Burst",
    };
  }

  // AMD Ryzen 9000 / 8000 / 7000 / 6000
  if (n.includes("9800x") || n.includes("9800x3d")) {
    return {
      fullName: "AMD Ryzen™ 7 9800X3D (8 Cores, 16 Threads, Boost Clock hingga 5.20 GHz, 96MB 3D V-Cache)",
      shortName: "Ryzen 7 9800X3D",
      coresThreads: "8 Cores • 16 Threads",
      clockSpeed: "Base 4.70 GHz, Max Boost hingga 5.20 GHz",
      cacheArch: "96 MB AMD 3D V-Cache™ • Zen 5 Architecture (4nm)",
      npuSupport: "Prosesor Gaming Tercepat di Dunia",
      boostSpeed: "Up to 5.20 GHz Boost",
    };
  }

  if (n.includes("8845hs")) {
    return {
      fullName: "AMD Ryzen™ 7 8845HS (8 Cores, 16 Threads, Boost hingga 5.10 GHz, 16MB L3 Cache)",
      shortName: "Ryzen 7 8845HS",
      coresThreads: "8 Cores • 16 Threads",
      clockSpeed: "Base 3.80 GHz, Max Boost hingga 5.10 GHz",
      cacheArch: "16 MB L3 Cache • Zen 4 Architecture (4nm)",
      npuSupport: "Integrated AMD Ryzen™ AI NPU (Hingga 38 Total TOPS)",
      boostSpeed: "Up to 5.10 GHz Boost",
    };
  }

  if (n.includes("6600h")) {
    return {
      fullName: "AMD Ryzen™ 5 6600H (6 Cores, 12 Threads, Boost hingga 4.50 GHz, 16MB L3 Cache)",
      shortName: "Ryzen 5 6600H",
      coresThreads: "6 Cores • 12 Threads",
      clockSpeed: "Base 3.30 GHz, Boost hingga 4.50 GHz",
      cacheArch: "16 MB L3 Cache • Zen 3+ Architecture (6nm)",
      npuSupport: "Standard High-Performance",
      boostSpeed: "Up to 4.50 GHz Boost",
    };
  }

  if (n.includes("ryzen 7 260")) {
    return {
      fullName: "AMD Ryzen™ 7 260 AI Processor (8 Cores, 16 Threads, Boost hingga 5.10 GHz)",
      shortName: "Ryzen 7 260",
      coresThreads: "8 Cores • 16 Threads",
      clockSpeed: "Up to 5.10 GHz Max Boost",
      cacheArch: "16 MB Cache • Zen 4 dengan Dedicated AI NPU",
      npuSupport: "AMD Ryzen™ AI Engine",
      boostSpeed: "Up to 5.10 GHz Boost",
    };
  }

  if (n.includes("ryzen 5 240")) {
    return {
      fullName: "AMD Ryzen™ 5 240 AI Processor (6 Cores, 12 Threads, Boost hingga 4.80 GHz)",
      shortName: "Ryzen 5 240",
      coresThreads: "6 Cores • 12 Threads",
      clockSpeed: "Up to 4.80 GHz Max Boost",
      cacheArch: "16 MB Cache • Zen 4 Architecture",
      npuSupport: "AMD Ryzen™ AI Engine",
      boostSpeed: "Up to 4.80 GHz Boost",
    };
  }

  if (n.includes("7535hs") || n.includes("7735hs") || n.includes("7520u") || n.includes("7320u") || n.includes("5500u")) {
    const isR7 = n.includes("7735");
    return {
      fullName: isR7 ? "AMD Ryzen™ 7 7735HS (8 Cores, 16 Threads, Up to 4.75 GHz)" : "AMD Ryzen™ 5 Mobile Processor (High Efficiency Multitasking)",
      shortName: isR7 ? "Ryzen 7 7735HS" : "AMD Ryzen™ 5",
      coresThreads: isR7 ? "8 Cores • 16 Threads" : "6 Cores • 12 Threads",
      clockSpeed: "Up to 4.50 GHz Max Boost",
      cacheArch: "16 MB Cache • AMD Zen Architecture",
      npuSupport: "Standard Architecture",
      boostSpeed: "Up to 4.50 GHz Boost",
    };
  }

  // Apple Silicon
  if (brand === "APPLE" || n.includes("macbook") || n.includes("m1") || n.includes("m2") || n.includes("m3") || n.includes("m4")) {
    const chip = n.includes("m4") ? "M4" : n.includes("m3") ? "M3" : n.includes("m2") ? "M2" : "M1";
    return {
      fullName: `Apple ${chip} Chip (8-Core CPU dengan 4 Performance Cores dan 4 Efficiency Cores)`,
      shortName: `Apple ${chip}`,
      coresThreads: "8 Cores CPU (4P + 4E)",
      clockSpeed: "Ultra-Fast Unified High Bandwidth Architecture",
      cacheArch: "Unified Memory Architecture (UMA) • TSMC 3nm/5nm",
      npuSupport: "16-Core Neural Engine (Pemrosesan Machine Learning Cepat)",
      boostSpeed: "Apple Silicon SoC",
    };
  }

  // Generic Fallback based on rawCpu or default
  const baseName = rawCpu || "Intel® Core™ Processor";
  return {
    fullName: `${baseName} Multi-Core High Efficiency Processor`,
    shortName: baseName.replace("Intel ", "").replace("Processor", "").trim(),
    coresThreads: "Multi-Core • Multi-Threading",
    clockSpeed: "Dinamis hemat daya hingga Turbo Boost",
    cacheArch: "Smart Cache terintegrasi",
    npuSupport: "Integrated Architecture",
    boostSpeed: "Turbo Boost Ready",
  };
}

function resolveGpuDetails(name: string, brand: string, cpuName: string, rawGpu?: string | null) {
  const n = (name + " " + (rawGpu || "")).toLowerCase();

  // NVIDIA RTX 50-Series
  if (n.includes("rtx5070") || n.includes("rtx 5070")) {
    return {
      fullName: "NVIDIA® GeForce RTX™ 5070 12GB GDDR7 Dedicated Graphics",
      shortName: "GeForce RTX 5070",
      isDiscrete: true,
      vramText: "12GB GDDR7",
      vramDetail: "12 GB GDDR7 VRAM Dedicated (High Bandwidth)",
      features: "NVIDIA Ada/Blackwell Architecture, Ray Tracing Gen 4, DLSS 3.5 Frame Generation, Reflex",
    };
  }

  if (n.includes("rtx5060") || n.includes("rtx 5060")) {
    return {
      fullName: "NVIDIA® GeForce RTX™ 5060 8GB GDDR7 Dedicated Graphics",
      shortName: "GeForce RTX 5060",
      isDiscrete: true,
      vramText: "8GB GDDR7",
      vramDetail: "8 GB GDDR7 VRAM Dedicated",
      features: "Ray Tracing Cores, DLSS 3.5 AI Upscaling, AV1 Dual Encoders",
    };
  }

  if (n.includes("rtx5050") || n.includes("rtx 5050")) {
    return {
      fullName: "NVIDIA® GeForce RTX™ 5050 8GB GDDR6 Dedicated Graphics",
      shortName: "GeForce RTX 5050",
      isDiscrete: true,
      vramText: "8GB GDDR6",
      vramDetail: "8 GB GDDR6 Dedicated Graphics",
      features: "Ray Tracing, DLSS 3 AI Frame Generation, NVIDIA Studio Certified",
    };
  }

  // NVIDIA RTX 40-Series
  if (n.includes("rtx4060") || n.includes("rtx 4060")) {
    return {
      fullName: "NVIDIA® GeForce RTX™ 4060 Laptop GPU 8GB GDDR6 (Up to 140W TGP)",
      shortName: "GeForce RTX 4060",
      isDiscrete: true,
      vramText: "8GB GDDR6",
      vramDetail: "8 GB GDDR6 Dedicated (128-bit bus)",
      features: "Ada Lovelace Architecture, DLSS 3 Frame Generation, 3rd Gen RT Cores, MUX Switch + Advanced Optimus",
    };
  }

  if (n.includes("rtx4050") || n.includes("rtx 4050")) {
    return {
      fullName: "NVIDIA® GeForce RTX™ 4050 Laptop GPU 6GB GDDR6",
      shortName: "GeForce RTX 4050",
      isDiscrete: true,
      vramText: "6GB GDDR6",
      vramDetail: "6 GB GDDR6 VRAM Dedicated",
      features: "Ada Lovelace Architecture, DLSS 3, Ray Tracing, Max-Q Technologies",
    };
  }

  if (n.includes("rtx3050") || n.includes("rtx 3050")) {
    return {
      fullName: "NVIDIA® GeForce RTX™ 3050 Laptop GPU 4GB/6GB GDDR6",
      shortName: "GeForce RTX 3050",
      isDiscrete: true,
      vramText: "6GB GDDR6",
      vramDetail: "Dedicated GDDR6 Video Memory",
      features: "Ampere Architecture, Ray Tracing, DLSS AI, Dynamic Boost",
    };
  }

  if (n.includes("rtx2050") || n.includes("rtx 2050")) {
    return {
      fullName: "NVIDIA® GeForce RTX™ 2050 4GB GDDR6",
      shortName: "GeForce RTX 2050",
      isDiscrete: true,
      vramText: "4GB GDDR6",
      vramDetail: "4 GB GDDR6 Dedicated",
      features: "Turing/Ampere Architecture, Ray Tracing, DLSS",
    };
  }

  // Apple
  if (brand === "APPLE" || n.includes("macbook")) {
    return {
      fullName: "Apple M-Series Integrated 8-Core / 10-Core High-Efficiency GPU",
      shortName: "Apple M GPU",
      isDiscrete: false,
      vramText: "Unified Memory",
      vramDetail: "Shared Unified Memory Bandwidth hingga 100 GB/s",
      features: "Hardware-Accelerated Ray Tracing, Mesh Shading, ProRes Encode/Decode Engine",
    };
  }

  // Intel Core Ultra (Intel Arc)
  if (n.includes("ultra 7") || n.includes("ultra 5")) {
    return {
      fullName: "Intel® Arc™ Graphics (Integrated High Performance Xe-Cores)",
      shortName: "Intel Arc Graphics",
      isDiscrete: false,
      vramText: "Shared System RAM",
      vramDetail: "Menggunakan memori sistem dinamis berkecepatan tinggi",
      features: "DirectX 12 Ultimate, Intel® XeSS AI Upscaling, AV1 Hardware Encoder",
    };
  }

  // Intel Iris Xe (i5 / i7)
  if (n.includes("i5") || n.includes("i7") || n.includes("core 5") || n.includes("core 7")) {
    return {
      fullName: "Intel® Iris® Xe Graphics (80 / 96 Execution Units)",
      shortName: "Intel Iris Xe",
      isDiscrete: false,
      vramText: "Shared System RAM",
      vramDetail: "Shared Memory (Aktif otomatis saat RAM Dual-Channel)",
      features: "Dukungan Resolusi hingga 4K/8K, Intel QuickSync Video, Clear Video HD",
    };
  }

  // AMD Radeon
  if (n.includes("ryzen") || n.includes("amd")) {
    return {
      fullName: "AMD Radeon™ Graphics (Built-in RDNA™ / Vega Architecture)",
      shortName: "AMD Radeon",
      isDiscrete: false,
      vramText: "Shared System RAM",
      vramDetail: "Dukungan dynamic VRAM allocation",
      features: "AMD FreeSync™ Ready, DirectX 12, Akselerasi grafis hemat daya",
    };
  }

  // Intel UHD Fallback (Celeron / i3 single channel)
  return {
    fullName: "Intel® UHD Graphics (DirectX® 12 Support)",
    shortName: "Intel UHD",
    isDiscrete: false,
    vramText: "Shared System RAM",
    vramDetail: "Shared Memory Dinamis",
    features: "Dukungan Output Dual Display HDMI/Type-C, Dekode Video HD Lancar",
  };
}

function resolveRamDetails(name: string, brand: string, ramGb: number, rawType?: string | null) {
  const n = name.toLowerCase();

  if (brand === "APPLE" || n.includes("macbook")) {
    return {
      fullName: `${ramGb} GB Unified High-Bandwidth Low-Latency Memory`,
      typeShort: "UNIFIED MEMORY",
      expansionShort: "High Bandwidth UMA",
      expansionDetail: "Terintegrasi pada die chip Apple Silicon (Tidak dapat di-upgrade manual)",
    };
  }

  if (n.includes("lpddr5") || n.includes("lpddr5x")) {
    return {
      fullName: `${ramGb} GB LPDDR5X-5500MHz / 6400MHz Dual Channel High-Speed Memory`,
      typeShort: "LPDDR5X HIGH-SPEED",
      expansionShort: "Dual-Channel Onboard",
      expansionDetail: "Onboard Dual-Channel untuk latensi sangat rendah dan efisiensi baterai maksimal",
    };
  }

  if (n.includes("ddr5") || n.includes("14th") || n.includes("ultra") || n.includes("8845") || n.includes("9800x")) {
    return {
      fullName: `${ramGb} GB DDR5-4800MHz / 5600MHz High-Frequency Memory`,
      typeShort: "DDR5 5600MHz",
      expansionShort: "Upgradable Slot",
      expansionDetail: `Tersedia 2 slot SO-DIMM (Dapat di-upgrade hingga 32 GB / 64 GB Dual Channel)`,
    };
  }

  return {
    fullName: `${ramGb} GB DDR4-3200MHz SO-DIMM RAM`,
    typeShort: "DDR4 3200MHz",
    expansionShort: "Upgradable Dual-Channel",
    expansionDetail: "Mendukung penambahan RAM melalui slot ekspansi SO-DIMM hingga 32 GB / 64 GB",
  };
}

function resolveStorageDetails(name: string, storageVal: string, rawType?: string | null) {
  const is1TB = storageVal.includes("1TB") || name.toLowerCase().includes("1tb");
  const is2TB = storageVal.includes("2TB") || name.toLowerCase().includes("2tb");
  const capacityText = is2TB ? "2 TB" : is1TB ? "1 TB" : "512 GB";

  return {
    capacity: `${capacityText} M.2 NVMe™ PCIe® 4.0 SSD`,
    typeShort: "M.2 NVMe PCIe 4.0",
    speedShort: "Kecepatan 3500-5000 MB/s",
    fullName: `${capacityText} M.2 NVMe™ PCIe® 4.0 x4 Solid State Drive`,
    slotSupport: "Tersedia slot M.2 NVMe tambahan / SATA tray untuk ekspansi kapasitas penyimpanan",
  };
}

function resolveDisplayDetails(name: string, category: string, brand: string, rawScreen?: string | null, rawPanel?: string | null) {
  const n = name.toLowerCase();
  const isAIO = category === "ALL-IN-ONE";

  // Determine size
  let size = rawScreen || "";
  if (!size) {
    if (isAIO) {
      if (n.includes("acx22") || n.includes("a3202") || n.includes("22\"") || n.includes("21.5")) size = '21.5"';
      else if (n.includes("acx24") || n.includes("a3402") || n.includes("24\"") || n.includes("23.8")) size = '23.8"';
      else if (n.includes("e1600") || n.includes("v161")) size = '15.6" Touchscreen';
      else if (n.includes("27\"") || n.includes("27")) size = '27.0"';
      else size = '23.8"';
    } else {
      // Laptop
      if (n.includes("13\"") || n.includes("13.3") || n.includes("13.6") || n.includes("air 13")) size = '13.6"';
      else if (n.includes("14\"") || n.includes("al14") || n.includes("a14") || n.includes(" 14 ") || n.includes("g14") || n.includes("e14")) size = '14.0"';
      else if (n.includes("16\"") || n.includes("16s") || n.includes(" 16 ") || n.includes("g16") || n.includes("v 16")) size = '16.0"';
      else if (n.includes("17\"") || n.includes(" 17 ")) size = '17.3"';
      else size = '14.0"'; // default mainstream laptop
    }
  }

  const isOLED = n.includes("oled");
  const isGaming = n.includes("nitro") || n.includes("tuf") || n.includes("rog") || n.includes("legion") || n.includes("loq") || n.includes("victus");

  let panelType = isOLED ? "OLED Lumina Panel" : "IPS-Level Anti-Glare";
  let resolution = isOLED ? "2.8K (2880 x 1800) WQXGA+ 16:10" : "Full HD (1920 x 1080 piksel) 16:9 / 16:10";
  let refreshColor = isOLED ? "120Hz Refresh Rate • 100% DCI-P3 Cinema Grade" : isGaming ? "144Hz - 165Hz Refresh Rate • Adaptive-Sync" : "60Hz Refresh Rate • 45% - 100% sRGB";
  let brightness = isOLED ? "400 - 600 nits Peak HDR, 0.2ms Response Time, Eye Care Certified" : "250 - 300 nits, Anti-Glare Matte Display, Bezel Tipis";

  return {
    sizeShort: size,
    sizeFull: `${size} Diagonal Screen`,
    panelShort: isOLED ? "OLED 2.8K" : "IPS FHD",
    resShort: isOLED ? "2.8K" : "1080p FHD",
    resolution,
    panelType,
    refreshColor,
    brightnessFeatures: brightness,
  };
}

function resolvePortsDetails(category: string, brand: string, name: string) {
  const isAIO = category === "ALL-IN-ONE";
  const isDesktop = category === "PC DESKTOP";

  if (isDesktop) {
    return {
      typeC: "1x USB 3.2 Gen 2 Type-C (Front) + 1x USB Type-C (Rear)",
      typeA: "4x USB 3.2 Gen 1 Type-A, 2x USB 2.0 Type-A",
      videoOut: "1x HDMI 2.1 TMDS, 2x DisplayPort 1.4a",
      lanPort: "1x RJ-45 Gigabit Ethernet 2.5 Gbps Realtek LAN",
      audioJack: "Audio I/O (Microphone In, Line-In, Line-Out 7.1 Surround)",
      cardReader: "Optional Internal Header",
    };
  }

  if (isAIO) {
    return {
      typeC: "1x USB 3.2 Gen 2 Type-C (Kecepatan transfer hingga 10 Gbps)",
      typeA: "2x USB 3.2 Gen 1 Type-A + 2x USB 2.0 Type-A",
      videoOut: "1x HDMI 1.4b Out (Dukungan monitor kedua / proyektor)",
      lanPort: "1x RJ-45 Gigabit Ethernet LAN (10/100/1000 Mbps)",
      audioJack: "1x 3.5mm Headphone / Microphone Combo Audio Jack",
      cardReader: "1x Multi-format SD / MMC Card Reader",
    };
  }

  // Laptop
  return {
    typeC: "1x USB 3.2 Gen 2 Type-C (Mendukung DisplayPort & Power Delivery Fast Charging)",
    typeA: "2x USB 3.2 Gen 1 Type-A (SuperSpeed 5Gbps)",
    videoOut: "1x HDMI 2.1 TMDS Port (Output monitor 4K @ 60Hz)",
    lanPort: name.toLowerCase().includes("gaming") ? "1x RJ-45 Gigabit Ethernet LAN" : "Menggunakan Dongle Type-C / Wi-Fi 6",
    audioJack: "1x 3.5mm Headphone / Microphone Audio Combo Jack",
    cardReader: "1x MicroSD / SD Card Reader Terintegrasi",
  };
}

function resolveWirelessDetails(name: string, category: string) {
  const n = name.toLowerCase();
  const isWifi6E = n.includes("ultra") || n.includes("14th") || n.includes("8845") || n.includes("9800x");

  return {
    wifi: isWifi6E ? "Wi-Fi 6E (802.11ax) Dual-Band / Tri-Band 2x2 MIMO" : "Wi-Fi 6 (802.11ax) Dual-Band 2x2 High-Speed",
    bluetooth: isWifi6E ? "Bluetooth® 5.3 Wireless Card" : "Bluetooth® 5.2 Wireless Interface",
  };
}

function resolveMultimediaDetails(name: string, category: string, brand: string) {
  const isAIO = category === "ALL-IN-ONE";
  const isDesktop = category === "PC DESKTOP";

  if (isDesktop) {
    return {
      webcam: "Opsional via USB Webcam Eksternal",
      microphone: "Support Front & Rear Microphone Input",
      speakers: "High Definition 7.1 Channel Audio Codec",
      inputDevice: "Mendukung semua Keyboard Mekanikal & Mouse Gaming USB",
    };
  }

  if (isAIO) {
    return {
      webcam: "Integrated 5.0 MP / Full HD 1080p Webcam dengan Shutter Penutup Fisik",
      microphone: "Dual Array Digital Microphone dengan AI Noise Cancelling",
      speakers: "Dual Stereo Speakers tuned by Manufacturer Audio System",
      inputDevice: "Termasuk 1 Set Original Wireless Keyboard & Wireless Optical Mouse",
    };
  }

  // Laptop
  const n = name.toLowerCase();
  const isBacklit = n.includes("backlit") || n.includes("oled") || n.includes("nitro") || n.includes("tuf") || n.includes("zenbook") || n.includes("rog");
  return {
    webcam: "HD 720p / FHD 1080p Webcam dengan Privacy Shutter Penutup Lensa",
    microphone: "Built-in Dual Microphone dengan AI Noise-Cancelling Technology",
    speakers: "Dual Stereo Speakers dengan Dolby Audio / DTS Audio Enhancement",
    inputDevice: isBacklit ? "Ergonomic Chiclet Keyboard dengan LED Backlight, Precision Touchpad Multi-Gesture" : "Ergonomic Island-style Keyboard, Precision Touchpad",
  };
}

function resolvePowerDetails(name: string, category: string, segment: string) {
  const isAIO = category === "ALL-IN-ONE";
  const isDesktop = category === "PC DESKTOP";

  if (isDesktop) {
    return {
      battery: "-",
      adapter: "Power Supply Unit (PSU) 750W - 850W 80 Plus Gold Certified",
      features: "Stabilitas daya tinggi untuk kartu grafis dan prosesor multi-core",
    };
  }

  if (isAIO) {
    return {
      battery: "-",
      adapter: "External AC Power Adapter 65W / 90W Hemat Energi (100-240V AC)",
      features: "Efisiensi daya tinggi standar Energy Star, tanpa kipas bising",
    };
  }

  // Laptop
  const n = name.toLowerCase();
  const isGaming = n.includes("nitro") || n.includes("tuf") || n.includes("rog") || n.includes("legion");
  return {
    battery: isGaming ? "4-Cell Li-ion Polymer 57Wh - 90Wh Battery" : "3-Cell Li-ion 42Wh - 50Wh Long-Life Battery",
    adapter: isGaming ? "135W - 230W Slim AC Adapter" : "45W - 65W Fast Charge AC Adapter / USB-C Power Delivery",
    features: "Pengisian Daya Cepat: Mengisi hingga 50-60% dalam waktu ~49 menit",
  };
}

function resolveWarrantyText(brand: string, segment: string, isAIO: boolean) {
  if (brand === "APPLE") {
    return "1 Tahun Garansi Resmi Apple Authorized Service Provider (iBox / Digimap / QCD) di Seluruh Indonesia";
  }
  if (brand === "ASUS") {
    return "2 Tahun Garansi Resmi Asus Indonesia (Layanan Sparepart & Service Global + 1 Tahun Asus Perfect Warranty)";
  }
  if (brand === "ACER") {
    return isAIO
      ? "3 Tahun Garansi Resmi Acer Indonesia (3 Tahun Service, 1 Tahun Sparepart, On-Site Service ke Lokasi)"
      : "2-3 Tahun Garansi Resmi Acer Indonesia + 1 Tahun Accidental Damage Protection";
  }
  if (brand === "LENOVO") {
    return "2 Tahun Garansi Resmi Lenovo Indonesia (Termasuk Premium Care / On-Site Service + 2 Tahun ADP)";
  }
  if (brand === "HP") {
    return "2 Tahun Garansi Resmi HP Indonesia (Layanan Home / On-site Service & Sparepart)";
  }
  return "2 Tahun Garansi Resmi Distributor Terdaftar di Service Center Resmi Indonesia";
}

function resolveBundledSoftware(name: string) {
  const n = name.toLowerCase();
  if (n.includes("ohs") || n.includes("office")) {
    return "Microsoft Office Home & Student 2021 / 2024 / M365 Teraktivasi Permanen";
  }
  return "Windows 11 Home Original Lisensi Digital Lifetime";
}

function extractRamNumber(name: string): number | null {
  const match = name.match(/(\d{1,2})\s*GB/i);
  return match ? parseInt(match[1], 10) : null;
}

function extractStorage(name: string): string | null {
  const match = name.match(/(\d{3,4}\s*GB|\d\s*TB)/i);
  return match ? match[1].replace(/\s+/g, "") : null;
}

function extractLumens(name: string): string | null {
  const match = name.match(/(\d{3,4})\s*(?:lumens|ansi)/i);
  return match ? `${match[1]}` : null;
}
