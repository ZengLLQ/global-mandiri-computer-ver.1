import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OrderStatus =
  | "pending_payment"
  | "proof_uploaded"
  | "paid"
  | "packed"
  | "ready_pickup"
  | "shipped"
  | "done"
  | "cancelled";

export interface OrderItem {
  productName: string;
  variantSku?: string;
  quantity: number;
  priceIdr: number;
  specs?: string;
}

export interface AdminOrder {
  orderNumber: string;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  shippingMethod: "pickup" | "delivery";
  totalAmountIdr: number;
  status: OrderStatus;
  proofImageUrl?: string;
  proofUploadedAt?: string;
  notes?: string;
  trackingNumber?: string;
  createdAt: string;
  items: OrderItem[];
}

export interface StoreSettings {
  storeName: string;
  brandWordmark: string;
  tagline: string;
  address: string;
  whatsapp: string;
  email: string;
  hours: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  marqueeAnnouncements: string[];
}

interface AdminStore {
  orders: AdminOrder[];
  settings: StoreSettings;

  // Order Actions
  addOrder: (order: AdminOrder) => void;
  updateOrderStatus: (orderNumber: string, status: OrderStatus, trackingNumber?: string) => void;
  verifyOrderPayment: (orderNumber: string) => void;
  rejectOrderPayment: (orderNumber: string, reason?: string) => void;
  deleteOrder: (orderNumber: string) => void;

  // Settings Actions
  updateSettings: (partial: Partial<StoreSettings>) => void;
  resetDefaultSettings: () => void;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Global Mandiri Computer",
  brandWordmark: "GMC",
  tagline: "Pusat Komputasi Andal & Terpercaya Sejak 2008",
  address: "ITC Mega Grosir Lantai B5 No. 7, Jl. Gembong No. 20-30, Kapasan, Surabaya, Jawa Timur 60141",
  whatsapp: "+62 811-3225-678",
  email: "blessingteknologi@gmail.com",
  hours: "Senin – Sabtu, 10.00 – 17.00 WIB (Minggu Libur)",
  bankName: "Bank Central Asia (BCA)",
  bankAccount: "1301510191",
  bankHolder: "LILY ALI",
  marqueeAnnouncements: [
    "100% GARANSI RESMI DISTRIBUTOR",
    "600+ UNIT TERSEDIA LENGKAP",
    "KONSULTASI BEBAS VIA WHATSAPP",
    "GERAI RESMI ITC MEGA GROSIR B5 NO. 7",
    "PACKING KAYU & ASURANSI PENUH",
    "EST. 2008 SURABAYA",
  ],
};

const SEED_ORDERS: AdminOrder[] = [
  {
    orderNumber: "GMC-20261009-8812",
    fullName: "Budi Santoso",
    phone: "081234567890",
    email: "budi.santoso@gmail.com",
    address: "Jl. Manyar Kertoarjo No. 12, Surabaya, Jawa Timur",
    shippingMethod: "delivery",
    totalAmountIdr: 12800000,
    status: "proof_uploaded",
    proofImageUrl: "https://images.unsplash.com/photo-1554415707-9e49fe832847?w=600&auto=format&fit=crop&q=80",
    proofUploadedAt: "2026-10-09T10:15:00Z",
    createdAt: "2026-10-09T09:45:00Z",
    notes: "Tolong packing kayu tebal untuk laptop Acer.",
    items: [
      {
        productName: "ACER Aspire AI A14-71M-53XH Intel Core Ultra 5 125 16GB 512GB",
        variantSku: "NX.JD1SN.001",
        quantity: 1,
        priceIdr: 12800000,
        specs: "Intel Core Ultra 5 • 16GB LPDDR5X • 512GB SSD • Steel Grey",
      },
    ],
  },
  {
    orderNumber: "GMC-20261009-4102",
    fullName: "Diana Lestari",
    phone: "081987654321",
    email: "diana.lestari@office.co.id",
    address: "ITC Mega Grosir Lantai B5 No. 7 (Ambil Langsung di Gerai)",
    shippingMethod: "pickup",
    totalAmountIdr: 34999000,
    status: "paid",
    proofUploadedAt: "2026-10-09T09:30:00Z",
    createdAt: "2026-10-09T09:00:00Z",
    notes: "Akan diambil staf kantor siang ini sekitar jam 14.00 WIB.",
    items: [
      {
        productName: "APPLE MacBook Pro 14 M4 16GB 512GB Space Black",
        variantSku: "MW2U3ID/A",
        quantity: 1,
        priceIdr: 34999000,
        specs: "Apple M4 Chip 10-Core • 16GB Unified Memory • 512GB SSD • Liquid Retina XDR",
      },
    ],
  },
  {
    orderNumber: "GMC-20261009-1954",
    fullName: "Hendro Wijaya",
    phone: "082155667788",
    email: "hendro.w@gmail.com",
    address: "Graha Famili Blok B No. 45, Surabaya Barat",
    shippingMethod: "delivery",
    totalAmountIdr: 6850000,
    status: "packed",
    createdAt: "2026-10-08T15:20:00Z",
    notes: "Pengadaan printer kantor notaris.",
    items: [
      {
        productName: "EPSON EcoTank L6290 All-in-One Ink Tank Printer",
        variantSku: "C11CJ60501",
        quantity: 1,
        priceIdr: 6850000,
        specs: "Print/Scan/Copy/Fax/ADF • Wi-Fi Direct • Duplex Printing",
      },
    ],
  },
  {
    orderNumber: "GMC-20261008-0721",
    fullName: "PT Sinar Mandiri Jaya (UP: Kevin)",
    phone: "081133221100",
    email: "procurement@sinarmandiri.com",
    address: "Kawasan Industri Rungkut SIER, Surabaya",
    shippingMethod: "delivery",
    totalAmountIdr: 18200000,
    status: "done",
    createdAt: "2026-10-08T11:00:00Z",
    notes: "Faktur pajak dan kwitansi rangkap 2 sudah disertakan.",
    trackingNumber: "GMC-COURIER-SUB-049",
    items: [
      {
        productName: "LENOVO IdeaCentre Tower 08IRH9 Intel Core i5-13420H 8GB 512GB",
        variantSku: "90XW0006ID",
        quantity: 2,
        priceIdr: 9100000,
        specs: "Intel Core i5-13420H • 8GB DDR5 • 512GB SSD NVMe • Cloud Grey",
      },
    ],
  },
];

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      orders: SEED_ORDERS,
      settings: DEFAULT_SETTINGS,

      addOrder: (order) => {
        set((state) => ({
          orders: [order, ...state.orders],
        }));
      },

      updateOrderStatus: (orderNumber, status, trackingNumber) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.orderNumber === orderNumber
              ? { ...o, status, ...(trackingNumber ? { trackingNumber } : {}) }
              : o
          ),
        }));
      },

      verifyOrderPayment: (orderNumber) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.orderNumber === orderNumber ? { ...o, status: "paid" } : o
          ),
        }));
      },

      rejectOrderPayment: (orderNumber, reason) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.orderNumber === orderNumber
              ? { ...o, status: "pending_payment", notes: reason ? `Penolakan bukti: ${reason}` : o.notes }
              : o
          ),
        }));
      },

      deleteOrder: (orderNumber) => {
        set((state) => ({
          orders: state.orders.filter((o) => o.orderNumber !== orderNumber),
        }));
      },

      updateSettings: (partial) => {
        set((state) => ({
          settings: { ...state.settings, ...partial },
        }));
      },

      resetDefaultSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
      },
    }),
    {
      name: "gmc_admin_storage",
    }
  )
);
