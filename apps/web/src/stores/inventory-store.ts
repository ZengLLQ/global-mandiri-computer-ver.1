import { create } from "zustand";
import { persist } from "zustand/middleware";
import catalogProducts from "@/lib/catalog_seed.json";

export type StockStatus = "ready" | "pre_order" | "out_of_stock" | "discontinued";

export interface ProductInventoryOverride {
  priceIdr?: number; // 0 = "Tanya Harga / Inquire Price"
  stockCount?: number;
  status?: StockStatus;
  poEstimatedDays?: string; // e.g. "3–5 hari kerja"
  isFeatured?: boolean;
  isNew?: boolean;
  notes?: string;
}

export interface CustomProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  min_price_idr: number;
  max_price_idr?: number;
  price_unit_text?: string;
  stockCount: number;
  status: StockStatus;
  poEstimatedDays?: string;
  is_new?: boolean;
  is_featured?: boolean;
  cpu?: string;
  ram_gb?: number;
  storage?: string;
  gpu?: string;
  display?: string;
  warranty?: string;
  cleaned_description?: string;
  detailed_spec_text?: string;
  notes?: string;
  variants?: Array<{
    sku: string;
    color: string;
    color_hex?: string;
    price_idr: number;
  }>;
}

interface InventoryStore {
  overrides: Record<string, ProductInventoryOverride>;
  customProducts: CustomProduct[];
  deletedProductIds: string[];

  // Actions
  updateInventory: (id: string, updates: ProductInventoryOverride) => void;
  batchUpdateInventory: (updates: Record<string, ProductInventoryOverride>) => void;
  addCustomProduct: (product: CustomProduct) => void;
  updateCustomProduct: (id: string, updates: Partial<CustomProduct>) => void;
  deleteProduct: (id: string) => void;
  restoreProduct: (id: string) => void;
  resetAllOverrides: () => void;

  // Selectors & Computed helpers
  getEffectiveProduct: (product: any) => any;
  getAllEffectiveProducts: () => any[];
}

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      overrides: {},
      customProducts: [],
      deletedProductIds: [],

      updateInventory: (id, updates) => {
        set((state) => ({
          overrides: {
            ...state.overrides,
            [id]: {
              ...(state.overrides[id] || {}),
              ...updates,
            },
          },
        }));
      },

      batchUpdateInventory: (batchUpdates) => {
        set((state) => ({
          overrides: {
            ...state.overrides,
            ...batchUpdates,
          },
        }));
      },

      addCustomProduct: (product) => {
        set((state) => ({
          customProducts: [product, ...state.customProducts],
        }));
      },

      updateCustomProduct: (id, updates) => {
        set((state) => ({
          customProducts: state.customProducts.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      deleteProduct: (id) => {
        set((state) => ({
          deletedProductIds: [...state.deletedProductIds, id],
          customProducts: state.customProducts.filter((p) => p.id !== id),
        }));
      },

      restoreProduct: (id) => {
        set((state) => ({
          deletedProductIds: state.deletedProductIds.filter((deletedId) => deletedId !== id),
        }));
      },

      resetAllOverrides: () => {
        set({ overrides: {}, customProducts: [], deletedProductIds: [] });
      },

      getEffectiveProduct: (product: any) => {
        if (!product) return product;
        const override = get().overrides[product.id] || get().overrides[product.slug];
        if (!override) {
          // Provide default stock calculation if none set
          return {
            ...product,
            stockCount: (product as any).stockCount ?? 5,
            status: (product as any).status ?? "ready",
            poEstimatedDays: (product as any).poEstimatedDays ?? "3–5 hari kerja",
          };
        }

        const effectivePrice =
          override.priceIdr !== undefined ? override.priceIdr : product.min_price_idr;

        return {
          ...product,
          min_price_idr: effectivePrice,
          stockCount: override.stockCount !== undefined ? override.stockCount : ((product as any).stockCount ?? 5),
          status: override.status || ((product as any).status ?? "ready"),
          poEstimatedDays: override.poEstimatedDays || ((product as any).poEstimatedDays ?? "3–5 hari kerja"),
          is_featured: override.isFeatured !== undefined ? override.isFeatured : product.is_featured,
          is_new: override.isNew !== undefined ? override.isNew : product.is_new,
          notes: override.notes,
        };
      },

      getAllEffectiveProducts: () => {
        const { overrides, customProducts, deletedProductIds, getEffectiveProduct } = get();

        // Filter out deleted seed products
        const activeSeed = catalogProducts.filter((p) => !deletedProductIds.includes(p.id));

        // Map seed products with overrides
        const mappedSeed = activeSeed.map((p) => getEffectiveProduct(p));

        // Combine with active custom products
        return [...customProducts, ...mappedSeed];
      },
    }),
    {
      name: "gmc_inventory_storage",
    }
  )
);
