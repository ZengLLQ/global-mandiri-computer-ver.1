"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  FileSpreadsheet,
  Users,
  MessageSquare,
  FileText,
  BarChart3,
  ShieldAlert,
  Settings,
  Activity,
  Menu,
  X,
  Search,
  Bell,
  LogOut,
  KeyRound,
  Shield,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  User,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "admin" | "staff" | string;
  is_totp_enabled: boolean;
  must_change_password: boolean;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Don't wrap the login page with the admin shell
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Check auth
  useEffect(() => {
    let isMounted = true;
    apiFetch<UserProfile>("/api/v1/auth/me")
      .then((data) => {
        if (isMounted) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch((_) => {
        if (isMounted) {
          router.push("/admin/login");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  // Global Keyboard Shortcuts (Ctrl+K, Cmd+K, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
      } else if (e.key === "?" && !isInput) {
        e.preventDefault();
        setShortcutsModalOpen(true);
      } else if (e.key === "Escape") {
        setCmdPaletteOpen(false);
        setShortcutsModalOpen(false);
        setUserMenuOpen(false);
        setNotificationsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
    }
  };

  const role = user?.role?.toLowerCase() || "staff";
  const isOwner = role === "owner";
  const isAdminOrOwner = role === "owner" || role === "admin";

  const navGroups = [
    {
      title: "Utama",
      items: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      ],
    },
    {
      title: "Operasional",
      items: [
        { label: "Pesanan", href: "/admin/orders", icon: ShoppingBag },
        { label: "Katalog & Stok", href: "/admin/products", icon: Package },
        ...(isAdminOrOwner
          ? [{ label: "Import Excel", href: "/admin/import", icon: FileSpreadsheet }]
          : []),
      ],
    },
    {
      title: "Pelanggan & Konten",
      items: [
        { label: "Pelanggan", href: "/admin/customers", icon: Users },
        { label: "Moderasi Ulasan", href: "/admin/reviews", icon: MessageSquare },
        ...(isAdminOrOwner
          ? [{ label: "Konten & CMS", href: "/admin/content", icon: FileText }]
          : []),
      ],
    },
    {
      title: "Sistem & Laporan",
      items: [
        { label: "Laporan & Analitik", href: "/admin/analytics", icon: BarChart3 },
        ...(isAdminOrOwner
          ? [{ label: "Audit Log", href: "/admin/audit", icon: ShieldAlert }]
          : []),
        ...(isAdminOrOwner
          ? [{ label: "Pengaturan Toko", href: "/admin/settings", icon: Settings }]
          : []),
        { label: "Status Operasional", href: "/admin/health", icon: Activity },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
        Memuat Sistem Admin GMC...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col md:flex-row selection:bg-[#111111] selection:text-white">
      {/* ---------------- MOBILE DRAWER BACKDROP ---------------- */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      {/* ---------------- LEFT SIDEBAR ---------------- */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-[var(--border-hairline)] z-50 flex flex-col transition-transform duration-200 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 group">
            <span className="font-mono text-sm tracking-wider font-extrabold uppercase">
              GMC • ADMIN
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 font-mono uppercase font-bold border ${
                isOwner
                  ? "bg-amber-50 text-amber-900 border-amber-200"
                  : isAdminOrOwner
                  ? "bg-sky-50 text-sky-900 border-sky-200"
                  : "bg-neutral-100 text-neutral-800 border-neutral-300"
              }`}
            >
              {role}
            </span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1 text-[var(--text-muted)] hover:text-black cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="px-3 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1.5">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs font-mono tracking-tight transition-colors ${
                        isActive
                          ? "bg-[#111111] text-white font-bold"
                          : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-neutral-500"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Storefront Link & Sidebar Footer */}
        <div className="p-3 border-t border-[var(--border-hairline)] bg-[var(--bg-card)] text-xs font-mono">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 text-neutral-700 hover:text-black hover:bg-neutral-200/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Lihat Toko Web</span>
            </span>
            <span className="text-[10px] text-neutral-500">:3000</span>
          </a>
        </div>
      </aside>

      {/* ---------------- MAIN CONTENT AREA ---------------- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[var(--border-hairline)] px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 text-neutral-700 hover:text-black cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Command Palette Trigger */}
            <button
              onClick={() => setCmdPaletteOpen(true)}
              className="flex items-center gap-3 bg-[var(--bg-canvas)] hover:bg-neutral-100 border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-mono text-[var(--text-muted)] hover:text-black transition-colors cursor-pointer w-48 sm:w-72"
            >
              <Search className="w-3.5 h-3.5 text-neutral-400" />
              <span className="truncate">Cari pesanan, SKU, produk...</span>
              <kbd className="hidden sm:inline-block ml-auto text-[9px] bg-white border border-[var(--border-hairline)] px-1 py-0.5 text-neutral-500 font-bold">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Keyboard Shortcuts Help Button */}
            <button
              onClick={() => setShortcutsModalOpen(true)}
              title="Pintasan Keyboard (?)"
              className="p-2 text-neutral-600 hover:text-black hover:bg-neutral-100 border border-transparent hover:border-[var(--border-hairline)] transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="p-2 text-neutral-600 hover:text-black hover:bg-neutral-100 border border-transparent hover:border-[var(--border-hairline)] transition-colors cursor-pointer relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-600 rounded-full" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[var(--border-hairline)] shadow-lg p-3 z-50 text-xs font-mono">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)] mb-2 font-bold uppercase tracking-wider text-[10px]">
                    <span>Notifikasi Sistem</span>
                    <span className="text-[var(--text-muted)]">Terbaru</span>
                  </div>
                  <div className="space-y-2 py-1">
                    <div className="p-2 bg-[var(--bg-canvas)] border border-[var(--border-hairline)]">
                      <p className="font-bold text-neutral-900">Pesanan Baru Masuk</p>
                      <p className="text-[11px] text-neutral-600 mt-0.5">
                        GMC-20261010-9182 menunggu verifikasi bukti transfer.
                      </p>
                      <span className="text-[9px] text-neutral-400 mt-1 block">Baru saja</span>
                    </div>
                    <div className="p-2 bg-[var(--bg-canvas)] border border-[var(--border-hairline)]">
                      <p className="font-bold text-neutral-900">Peringatan Stok Menipis</p>
                      <p className="text-[11px] text-neutral-600 mt-0.5">
                        ASUS Vivobook 14 tersisa 1 unit di gudang ITC Surabaya.
                      </p>
                      <span className="text-[9px] text-neutral-400 mt-1 block">1 jam lalu</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 bg-neutral-100 hover:bg-neutral-200/80 border border-[var(--border-hairline)] text-xs font-mono transition-colors cursor-pointer"
              >
                <div className="w-5 h-5 bg-[#111111] text-white flex items-center justify-center font-bold text-[10px]">
                  {user?.full_name?.charAt(0) || "U"}
                </div>
                <span className="hidden sm:inline-block font-semibold truncate max-w-[120px]">
                  {user?.full_name || "Admin"}
                </span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[var(--border-hairline)] shadow-lg p-2 z-50 text-xs font-mono">
                  <div className="px-3 py-2 border-b border-[var(--border-hairline)] mb-1">
                    <p className="font-bold text-neutral-900 truncate">{user?.full_name}</p>
                    <p className="text-[10px] text-neutral-500 truncate">{user?.email}</p>
                    <span className="inline-block mt-1 text-[9px] bg-neutral-100 px-1 py-0.5 font-bold uppercase border border-neutral-300">
                      Peran: {role}
                    </span>
                  </div>

                  <Link
                    href="/admin/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 text-neutral-700 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Pengaturan Akun</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Content Outlet */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ---------------- COMMAND PALETTE MODAL (Ctrl+K) ---------------- */}
      {cmdPaletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
          <div className="w-full max-w-lg bg-white border border-[var(--border-hairline)] shadow-2xl overflow-hidden font-mono text-xs">
            {/* Search Input */}
            <div className="p-3 border-b border-[var(--border-hairline)] flex items-center gap-2.5">
              <Search className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                autoFocus
                placeholder="Lompat ke No. Pesanan, SKU, Produk, atau Pelanggan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-xs text-[var(--text-primary)] placeholder:text-neutral-400 focus:outline-hidden"
              />
              <button
                onClick={() => setCmdPaletteOpen(false)}
                className="text-[10px] bg-neutral-100 px-1.5 py-0.5 text-neutral-500 border border-neutral-300 hover:text-black cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-neutral-400">
                Menu Cepat
              </div>
              <button
                onClick={() => {
                  router.push("/admin/orders");
                  setCmdPaletteOpen(false);
                }}
                className="w-full text-left px-2.5 py-2 hover:bg-neutral-100 flex items-center justify-between text-neutral-800 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Daftar Pesanan & Verifikasi Bukti</span>
                </span>
                <span className="text-[10px] text-neutral-400">/admin/orders</span>
              </button>
              <button
                onClick={() => {
                  router.push("/admin/products");
                  setCmdPaletteOpen(false);
                }}
                className="w-full text-left px-2.5 py-2 hover:bg-neutral-100 flex items-center justify-between text-neutral-800 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" />
                  <span>Katalog Produk & Edit Stok</span>
                </span>
                <span className="text-[10px] text-neutral-400">/admin/products</span>
              </button>
              {isAdminOrOwner && (
                <button
                  onClick={() => {
                    router.push("/admin/audit");
                    setCmdPaletteOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-neutral-100 flex items-center justify-between text-neutral-800 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Audit Trail Log</span>
                  </span>
                  <span className="text-[10px] text-neutral-400">/admin/audit</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- KEYBOARD SHORTCUTS MODAL (?) ---------------- */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[var(--border-hairline)] shadow-2xl p-6 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hairline)] mb-4">
              <span className="font-bold uppercase tracking-wider text-sm">
                Pintasan Keyboard GMC
              </span>
              <button
                onClick={() => setShortcutsModalOpen(false)}
                className="p-1 text-neutral-500 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { key: "Ctrl + K / ⌘K", desc: "Membuka Command Palette / Pencarian Global" },
                { key: "?", desc: "Membuka dialog bantuan pintasan keyboard ini" },
                { key: "Esc", desc: "Menutup modal, dialog, atau drawer yang aktif" },
                { key: "j / k", desc: "Navigasi baris pada tabel data pesanan" },
                { key: "Ctrl + P", desc: "Cetak nota resmi / packing slip (Print Preview)" },
              ].map((s) => (
                <div key={s.key} className="flex items-center justify-between py-1 border-b border-neutral-100">
                  <span className="text-neutral-600">{s.desc}</span>
                  <kbd className="bg-neutral-100 border border-neutral-300 px-2 py-0.5 text-[10px] font-bold">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border-hairline)] text-right">
              <button
                onClick={() => setShortcutsModalOpen(false)}
                className="bg-[#111111] text-white px-4 py-2 font-bold uppercase text-[11px] cursor-pointer"
              >
                Tutup (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
