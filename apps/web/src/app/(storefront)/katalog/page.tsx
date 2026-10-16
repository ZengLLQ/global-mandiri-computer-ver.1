"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  ChevronDown,
  LayoutGrid,
  List,
  Laptop,
  Monitor,
  Cpu,
  Printer,
  Projector,
  Satellite
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product/product-card";
import { ProductListItem } from "@/components/product/product-list-item";
import { MotionButton } from "@/components/ui/motion-button";
import { Reveal } from "@/components/ui/reveal";
import catalogProducts from "@/lib/catalog_seed.json";
import { useInventoryStore } from "@/stores/inventory-store";
import { useTranslation } from "@/stores/language-store";

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">
          <p className="text-micro-label uppercase text-[var(--text-muted)] tracking-widest">
            MEMUAT KATALOG UNIT...
          </p>
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}

function CatalogContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL state
  const selectedCategory = searchParams.get("kategori") || "semua";
  const selectedBrand = searchParams.get("brand") || "semua";
  const selectedSegment = searchParams.get("segmen") || "semua";
  const selectedRam = searchParams.get("ram") || "semua";
  const selectedSort = searchParams.get("urutkan") || "terbaru";
  const searchQuery = searchParams.get("cari") || searchParams.get("q") || "";

  // UI state for inline filter panel toggle & view mode
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [sortPanelOpen, setSortPanelOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "list" || viewParam === "grid") {
      setViewMode(viewParam);
    } else {
      try {
        const savedMode = localStorage.getItem("gmc_catalog_view_mode") as "grid" | "list" | null;
        if (savedMode === "list" || savedMode === "grid") {
          setViewMode(savedMode);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [searchParams]);

  const toggleViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("gmc_catalog_view_mode", mode);
    } catch (e) {
      // ignore
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", mode);
    router.replace(`/katalog?${params.toString()}`, { scroll: false });
  };

  // Real-time Inventory Store integration
  const { overrides, customProducts, deletedProductIds, getAllEffectiveProducts } = useInventoryStore();
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const allProducts = useMemo(() => {
    if (!isHydrated) return catalogProducts;
    return getAllEffectiveProducts();
  }, [isHydrated, overrides, customProducts, deletedProductIds, getAllEffectiveProducts]);

  // Category counts based on active inventory
  const categoryCounts = useMemo(() => {
    return {
      semua: allProducts.length,
      laptop: allProducts.filter((p) => p.category.toLowerCase().includes("laptop")).length,
      "all-in-one": allProducts.filter(
        (p) => p.category.toLowerCase().includes("all-in-one") || p.category.toLowerCase().includes("aio")
      ).length,
      "pc-desktop": allProducts.filter((p) => p.category.toLowerCase().includes("pc")).length,
      printer: allProducts.filter((p) => p.category.toLowerCase().includes("printer")).length,
      projector: allProducts.filter((p) => p.category.toLowerCase().includes("projector")).length,
      starlink: allProducts.filter((p) => p.category.toLowerCase().includes("starlink")).length,
    };
  }, [allProducts]);

  const categoryTabs = [
    { key: "semua", label: t.catalog.filterAll, count: categoryCounts.semua, icon: LayoutGrid },
    { key: "laptop", label: t.home.categories.laptop, count: categoryCounts.laptop, icon: Laptop },
    { key: "all-in-one", label: t.home.categories.aio, count: categoryCounts["all-in-one"], icon: Monitor },
    { key: "pc-desktop", label: t.home.categories.desktop, count: categoryCounts["pc-desktop"], icon: Cpu },
    { key: "printer", label: t.home.categories.printer, count: categoryCounts.printer, icon: Printer },
    { key: "projector", label: t.home.categories.projector, count: categoryCounts.projector, icon: Projector },
    { key: "starlink", label: t.home.categories.starlink, count: categoryCounts.starlink, icon: Satellite },
  ];

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allProducts.forEach((p) => {
      counts[p.brand] = (counts[p.brand] || 0) + 1;
    });
    return counts;
  }, [allProducts]);

  const brands = useMemo(() => {
    return Object.keys(brandCounts).sort();
  }, [brandCounts]);

  const segments = ["Entry Level", "Mainstream", "Performance", "Gaming"];

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "semua") count++;
    if (selectedBrand !== "semua") count++;
    if (selectedSegment !== "semua") count++;
    if (selectedRam !== "semua") count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedCategory, selectedBrand, selectedSegment, selectedRam, searchQuery]);

  const updateFilter = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "semua" || !val) {
      params.delete(key);
    } else {
      params.set(key, val);
    }
    // Also clean alias
    if (key === "cari") params.delete("q");
    router.push(`/katalog?${params.toString()}`);
  };

  const resetAllFilters = () => {
    router.push(viewMode === "list" ? "/katalog?view=list" : "/katalog");
  };

  const filteredProducts = useMemo(() => {
    return allProducts
      .filter((product) => {
        if (selectedCategory !== "semua") {
          const catNorm = product.category.toLowerCase().replace(/\s+/g, "-");
          if (!catNorm.includes(selectedCategory.toLowerCase())) {
            return false;
          }
        }

        if (selectedBrand !== "semua") {
          if (product.brand.toLowerCase() !== selectedBrand.toLowerCase()) {
            return false;
          }
        }

        if (selectedSegment !== "semua") {
          if (product.segment.toLowerCase() !== selectedSegment.toLowerCase()) {
            return false;
          }
        }

        if (selectedRam !== "semua") {
          const ramInt = parseInt(selectedRam, 10);
          if (product.ram_gb !== ramInt) {
            return false;
          }
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = product.name.toLowerCase().includes(q);
          const matchesBrand = product.brand.toLowerCase().includes(q);
          const matchesCpu = product.cpu?.toLowerCase().includes(q) ?? false;
          const matchesGpu = product.gpu?.toLowerCase().includes(q) ?? false;
          if (!matchesName && !matchesBrand && !matchesCpu && !matchesGpu) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedSort === "termurah") {
          const pA = a.min_price_idr || 999999999;
          const pB = b.min_price_idr || 999999999;
          return pA - pB;
        }
        if (selectedSort === "termahal") {
          return (b.max_price_idr || 0) - (a.max_price_idr || 0);
        }
        if (selectedSort === "nama-az") {
          return a.name.localeCompare(b.name);
        }
        if (a.is_new && !b.is_new) return -1;
        if (!a.is_new && b.is_new) return 1;
        return 0;
      });
  }, [allProducts, selectedCategory, selectedBrand, selectedSegment, selectedRam, selectedSort, searchQuery]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Modern Unified Header */}
      <Header currentCategory={selectedCategory} />

      {/* Tiny Sub-Header Breadcrumb */}
      <div className="px-6 md:px-10 lg:px-12 pt-5">
        <div className="w-full text-micro-label text-[var(--text-muted)] flex items-center gap-2">
          <Link href="/" className="hover:text-[var(--text-primary)]">{t.catalog.breadcrumbHome}</Link>
          <span>/</span>
          <span className="text-[var(--text-primary)] font-bold">{t.catalog.breadcrumbCatalog}</span>
          {selectedCategory !== "semua" && (
            <>
              <span>/</span>
              <span className="uppercase text-[var(--text-primary)]">{selectedCategory}</span>
            </>
          )}
        </div>
      </div>

      <main className="flex-1 w-full px-6 md:px-10 lg:px-12 py-6 md:py-8">
        {/* Giant Centered DISPLAY XL Title: KATALOG */}
        <div className="text-center my-6 md:my-10">
          <h1 className="text-display-xl tracking-tighter">
            {t.catalog.title} <span className="text-slant-display">{t.catalog.titleSlant}</span>
          </h1>
          <p className="text-tech-tag mt-3 tracking-[0.16em]">
            {t.catalog.subtitle}
          </p>
        </div>

        {/* =========================================================================
            MODERNIZED NAV PANEL: SEGMENTED PILL RAIL
           ========================================================================= */}
        <div className="relative border-b border-[var(--border-hairline)] pb-4 mb-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth">
            {categoryTabs.map((tab) => {
              const isActive = selectedCategory === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => updateFilter("kategori", tab.key)}
                  className={`relative px-3.5 py-2 text-micro-label tracking-[0.1em] transition-all cursor-pointer select-none shrink-0 flex items-center gap-2 rounded-full ${
                    isActive
                      ? "text-[var(--bg-canvas)] font-black shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-card)]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="catalogSegmentPill"
                      className="absolute inset-0 bg-[var(--text-primary)] rounded-full z-0"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <Icon className={`relative z-10 w-3.5 h-3.5 stroke-[1.8] ${isActive ? "text-[var(--bg-canvas)]" : "text-[var(--text-muted)]"}`} />
                  <span className="relative z-10">{tab.label}</span>
                  <span
                    className={`relative z-10 text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-hairline)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            MODERNIZED TOOLBAR: DIRECT SEARCH + FILTER ACCORDION + SORT SELECTOR
           ========================================================================= */}
        <div className="py-3 border-b border-[var(--border-hairline)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Modern Integrated Search Bar in Nav Toolbar */}
          <div className="relative flex-1 max-w-md">
            <div className="group flex items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-card)]/80 hover:bg-[var(--bg-canvas)] focus-within:bg-[var(--bg-canvas)] focus-within:border-[var(--text-primary)] focus-within:ring-2 focus-within:ring-[var(--text-primary)]/10 px-4 py-2 transition-all duration-200 shadow-sm">
              <Search className="w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--text-primary)] mr-2.5 shrink-0 stroke-[1.8] transition-colors" />
              <input
                type="text"
                placeholder={t.catalog.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => updateFilter("cari", e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs font-semibold uppercase tracking-wider placeholder:normal-case placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
              />
              {searchQuery ? (
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => updateFilter("cari", "")}
                  className="grid h-4 w-4 place-items-center rounded-full bg-[var(--border-hairline)] hover:bg-black hover:text-white text-[var(--text-muted)] transition-colors ml-1.5 cursor-pointer shrink-0"
                  title="Hapus pencarian"
                >
                  <X className="w-2.5 h-2.5 stroke-[2.5]" />
                </motion.button>
              ) : (
                <kbd className="hidden sm:inline-block text-[9px] font-mono text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-hairline)] px-1.5 py-0.5 rounded-full ml-1.5 select-none shrink-0 shadow-[0_1px_1px_rgba(0,0,0,0.03)]">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Action Tools: Filter Button + Unit Count + Sort Selector */}
          <div className="flex items-center justify-between md:justify-end gap-3 text-micro-label font-bold tracking-[0.08em]">
            {/* Filter Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.025, y: -0.5 }}
              whileTap={{ scale: 0.96, y: 0.5 }}
              onClick={() => {
                setFilterPanelOpen(!filterPanelOpen);
                if (sortPanelOpen) setSortPanelOpen(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all cursor-pointer shadow-sm ${
                filterPanelOpen || activeFiltersCount > 0
                  ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)] font-black"
                  : "bg-[var(--bg-card)]/80 hover:bg-[var(--bg-canvas)] border-[var(--border-hairline)] hover:border-[var(--text-primary)] text-[var(--text-primary)]"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.8]" />
              <span>{t.catalog.filterButton}</span>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black transition-colors shadow-sm bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--border-hairline)]">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 stroke-[2] transition-transform duration-200 ${filterPanelOpen ? "rotate-180" : ""}`} />
            </motion.button>

            {/* Total Unit Count Badge */}
            <span className="text-[var(--text-muted)] font-mono text-[10px] px-2.5 py-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-card)]/60 whitespace-nowrap">
              {filteredProducts.length} {t.catalog.unitsCount}
            </span>

            {/* Sort Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.025, y: -0.5 }}
              whileTap={{ scale: 0.96, y: 0.5 }}
              onClick={() => {
                setSortPanelOpen(!sortPanelOpen);
                if (filterPanelOpen) setFilterPanelOpen(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all cursor-pointer shadow-sm ${
                sortPanelOpen
                  ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)] font-black"
                  : "bg-[var(--bg-card)] border-[var(--border-hairline)] hover:border-[var(--text-primary)] text-[var(--text-primary)]"
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5 stroke-[1.8]" />
              <span>{t.catalog.sortLabel} {selectedSort === "terbaru" ? t.catalog.sortOptions.featured : selectedSort === "termurah" ? t.catalog.sortOptions.priceAsc : selectedSort === "termahal" ? t.catalog.sortOptions.priceDesc : t.catalog.sortOptions.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 stroke-[2] transition-transform duration-200 ${sortPanelOpen ? "rotate-180" : ""}`} />
            </motion.button>

            {/* View Mode Switcher: Grid vs List */}
            <div className="flex items-center p-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-card)]/80 shadow-sm">
              <button
                type="button"
                onClick={() => toggleViewMode("grid")}
                title="Tampilan Grid"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 stroke-[2]" />
                <span className="hidden sm:inline">{t.catalog.viewGrid}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleViewMode("list")}
                title="Tampilan List"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <List className="w-3.5 h-3.5 stroke-[2]" />
                <span className="hidden sm:inline">{t.catalog.viewList}</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ACTIVE FILTER CHIPS STRIP (Removable tags)
           ========================================================================= */}
        {activeFiltersCount > 0 && (
          <div className="py-3 border-b border-[var(--border-hairline)] flex flex-wrap items-center gap-2 text-micro-label">
            <span className="text-[var(--text-muted)] font-bold mr-1">{t.catalog.activeFilters}</span>
            {selectedCategory !== "semua" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-hairline)] uppercase font-semibold rounded-full shadow-sm">
                <span>{t.locale === "en" ? "CATEGORY:" : "KATEGORI:"} {selectedCategory}</span>
                <button
                  onClick={() => updateFilter("kategori", "semua")}
                  className="hover:text-black cursor-pointer font-bold"
                >
                  &times;
                </button>
              </span>
            )}
            {selectedBrand !== "semua" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-hairline)] uppercase font-semibold rounded-full shadow-sm">
                <span>BRAND: {selectedBrand}</span>
                <button
                  onClick={() => updateFilter("brand", "semua")}
                  className="hover:text-black cursor-pointer font-bold"
                >
                  &times;
                </button>
              </span>
            )}
            {selectedSegment !== "semua" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-hairline)] uppercase font-semibold rounded-full shadow-sm">
                <span>{t.locale === "en" ? "SEGMENT:" : "SEGMEN:"} {selectedSegment}</span>
                <button
                  onClick={() => updateFilter("segmen", "semua")}
                  className="hover:text-black cursor-pointer font-bold"
                >
                  &times;
                </button>
              </span>
            )}
            {selectedRam !== "semua" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-hairline)] uppercase font-semibold rounded-full shadow-sm">
                <span>RAM: {selectedRam}GB</span>
                <button
                  onClick={() => updateFilter("ram", "semua")}
                  className="hover:text-black cursor-pointer font-bold"
                >
                  &times;
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-hairline)] uppercase font-semibold rounded-full shadow-sm">
                <span>{t.locale === "en" ? "SEARCH:" : "CARI:"} &ldquo;{searchQuery}&rdquo;</span>
                <button
                  onClick={() => updateFilter("cari", "")}
                  className="hover:text-black cursor-pointer font-bold"
                >
                  &times;
                </button>
              </span>
            )}
            <button
              onClick={resetAllFilters}
              className="text-[var(--text-primary)] hover:text-black font-bold hover:underline cursor-pointer ml-2 text-micro-label"
            >
              {t.catalog.resetAll} &times;
            </button>
          </div>
        )}

        {/* =========================================================================
            MODERNIZED PUSH-DOWN FILTER DASHBOARD
           ========================================================================= */}
        <AnimatePresence>
          {filterPanelOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden my-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] shadow-md"
            >
              <div className="p-6 md:p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {/* Brand Filter */}
                  <div>
                    <span className="text-micro-label text-[var(--text-muted)] block mb-3 font-bold uppercase tracking-wider">
                      {t.catalog.filterBrand}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => updateFilter("brand", "semua")}
                        className={`text-xs px-3.5 py-1.5 uppercase font-semibold cursor-pointer border rounded-full transition-all shadow-sm ${
                          selectedBrand === "semua"
                            ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)]"
                            : "border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--text-primary)]"
                        }`}
                      >
                        {t.catalog.filterAll} ({catalogProducts.length})
                      </motion.button>
                      {brands.map((b) => (
                        <motion.button
                          key={b}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => updateFilter("brand", b.toLowerCase())}
                          className={`text-xs px-3.5 py-1.5 uppercase font-semibold cursor-pointer border rounded-full transition-all flex items-center gap-1.5 shadow-sm ${
                            selectedBrand === b.toLowerCase()
                              ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)]"
                              : "border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--text-primary)]"
                          }`}
                        >
                          <span>{b}</span>
                          <span className="text-[10px] opacity-70">({brandCounts[b] || 0})</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Segment Filter */}
                  <div>
                    <span className="text-micro-label text-[var(--text-muted)] block mb-3 font-bold uppercase tracking-wider">
                      {t.catalog.filterSegment}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => updateFilter("segmen", "semua")}
                        className={`text-xs px-3.5 py-1.5 uppercase font-semibold cursor-pointer border rounded-full transition-all shadow-sm ${
                          selectedSegment === "semua"
                            ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)]"
                            : "border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--text-primary)]"
                        }`}
                      >
                        {t.catalog.filterAll}
                      </motion.button>
                      {segments.map((seg) => (
                        <motion.button
                          key={seg}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => updateFilter("segmen", seg.toLowerCase())}
                          className={`text-xs px-3.5 py-1.5 uppercase font-semibold cursor-pointer border rounded-full transition-all shadow-sm ${
                            selectedSegment === seg.toLowerCase()
                              ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)]"
                              : "border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--text-primary)]"
                          }`}
                        >
                          {seg}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* RAM Filter */}
                  <div>
                    <span className="text-micro-label text-[var(--text-muted)] block mb-3 font-bold uppercase tracking-wider">
                      {t.catalog.filterRam}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {["semua", "4", "8", "16", "24", "32"].map((ram) => (
                        <motion.button
                          key={ram}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => updateFilter("ram", ram)}
                          className={`text-xs px-3.5 py-1.5 uppercase font-semibold cursor-pointer border rounded-full transition-all shadow-sm ${
                            selectedRam === ram
                              ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)]"
                              : "border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--text-primary)]"
                          }`}
                        >
                          {ram === "semua" ? t.catalog.filterAll : `${ram} GB`}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Preset Filter */}
                  <div>
                    <span className="text-micro-label text-[var(--text-muted)] block mb-3 font-bold uppercase tracking-wider">
                      {t.locale === "en" ? "QUICK PRESETS" : "OPSI CEPAT"}
                    </span>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          updateFilter("kategori", "starlink");
                        }}
                        className="w-full text-left p-3 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] hover:border-[var(--text-primary)] rounded-xl text-xs font-bold uppercase flex justify-between items-center cursor-pointer transition-all shadow-sm hover:shadow"
                      >
                        <span>{t.locale === "en" ? "STARLINK SATELLITE INTERNET" : "STARLINK INTERNET SATELIT"}</span>
                        <span className="text-micro-label text-[var(--text-muted)]">&rarr;</span>
                      </button>
                      <button
                        onClick={() => {
                          updateFilter("segmen", "gaming");
                        }}
                        className="w-full text-left p-3 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] hover:border-[var(--text-primary)] rounded-xl text-xs font-bold uppercase flex justify-between items-center cursor-pointer transition-all shadow-sm hover:shadow"
                      >
                        <span>{t.locale === "en" ? "GAMING LAPTOPS & PC" : "LAPTOP & PC GAMING"}</span>
                        <span className="text-micro-label text-[var(--text-muted)]">&rarr;</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-hairline)] flex justify-between items-center text-micro-label">
                  <span className="text-[var(--text-muted)] font-mono">
                    {t.locale === "en" ? `SHOWING ${filteredProducts.length} UNITS MATCHING FILTERS` : `MENAMPILKAN ${filteredProducts.length} UNIT SESUAI FILTER`}
                  </span>
                  <button
                    onClick={resetAllFilters}
                    className="editorial-link text-[var(--text-primary)] hover:text-black font-bold cursor-pointer"
                  >
                    {t.catalog.resetFilters} &times;
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =========================================================================
            INLINE PUSH-DOWN SORT PANEL
           ========================================================================= */}
        <AnimatePresence>
          {sortPanelOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden my-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] shadow-md"
            >
              <div className="p-6 flex flex-wrap gap-3 items-center">
                <span className="text-micro-label text-[var(--text-muted)] font-bold mr-2 uppercase tracking-wider">
                  {t.catalog.sortLabel}
                </span>
                {[
                  { key: "terbaru", label: t.catalog.sortOptions.featured },
                  { key: "termurah", label: t.catalog.sortOptions.priceAsc },
                  { key: "termahal", label: t.catalog.sortOptions.priceDesc },
                  { key: "nama-az", label: t.catalog.sortOptions.name },
                ].map((s) => (
                  <motion.button
                    key={s.key}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      updateFilter("urutkan", s.key);
                      setSortPanelOpen(false);
                    }}
                    className={`text-xs px-4 py-2 uppercase font-semibold cursor-pointer border rounded-full transition-all shadow-sm ${
                      selectedSort === s.key
                        ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)] font-bold"
                        : "border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--text-primary)]"
                    }`}
                  >
                    {s.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =========================================================================
            PRODUCT GRID: 2 COLUMNS WITH 3D SPEC TILT CARDS
           ========================================================================= */}
        <div className="mt-8">
          {displayedProducts.length === 0 ? (
            <div className="py-24 text-center border border-[var(--border-hairline)] bg-[var(--bg-card)] rounded-2xl shadow-sm">
              <p className="text-lg font-bold uppercase mb-2">{t.catalog.noProducts}</p>
              <p className="text-body text-[var(--text-muted)] text-sm mb-6">
                {t.catalog.noProductsDesc}
              </p>
              <MotionButton onClick={resetAllFilters} className="text-xs px-6 py-2.5">
                {t.catalog.resetFilters}
              </MotionButton>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {displayedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  slug={p.slug}
                  name={p.name}
                  brand={p.brand}
                  segment={p.segment}
                  priceIdr={p.min_price_idr}
                  cpu={p.cpu}
                  ramGb={p.ram_gb}
                  ramType={p.ram_type}
                  storage={p.storage}
                  storageType={p.storage_type}
                  gpu={p.gpu}
                  screenSize={p.screen_size}
                  screenPanel={p.screen_panel}
                  os={p.os}
                  warranty={p.warranty}
                  bundledItems={p.bundled_items}
                  variantsCount={p.variants?.length || 1}
                  status={p.status}
                  stockCount={p.stockCount}
                  poEstimatedDays={p.poEstimatedDays}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:gap-4">
              {displayedProducts.map((p) => (
                <ProductListItem
                  key={p.id}
                  slug={p.slug}
                  name={p.name}
                  brand={p.brand}
                  segment={p.segment}
                  priceIdr={p.min_price_idr}
                  cpu={p.cpu}
                  ramGb={p.ram_gb}
                  ramType={p.ram_type}
                  storage={p.storage}
                  storageType={p.storage_type}
                  gpu={p.gpu}
                  screenSize={p.screen_size}
                  screenPanel={p.screen_panel}
                  os={p.os}
                  warranty={p.warranty}
                  bundledItems={p.bundled_items}
                  variantsCount={p.variants?.length || 1}
                  status={p.status}
                  stockCount={p.stockCount}
                  poEstimatedDays={p.poEstimatedDays}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination Button with 3D Tactile Action */}
        {visibleCount < filteredProducts.length && (
          <div className="text-center my-16">
            <MotionButton
              onClick={() => setVisibleCount((prev) => prev + 12)}
              className="px-12 py-4 text-xs font-bold"
            >
              {t.locale === "en" ? `LOAD MORE (${filteredProducts.length - visibleCount} UNITS REMAINING)` : `LIHAT LEBIH BANYAK (${filteredProducts.length - visibleCount} UNIT TERSISA)`}
            </MotionButton>
          </div>
        )}
      </main>

      {/* Unified Elevated Footer Component */}
      <Footer />
    </div>
  );
}
