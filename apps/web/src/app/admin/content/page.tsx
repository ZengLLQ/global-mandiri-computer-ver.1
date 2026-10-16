"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  HelpCircle,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Layers,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface StaticPageItem {
  slug: string;
  title: string;
  content_markdown: string;
  updated_at: string;
}

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
}

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<"pages" | "faqs">("pages");
  const [loading, setLoading] = useState(true);

  // Pages state
  const [pages, setPages] = useState<StaticPageItem[]>([]);
  const [selectedPageSlug, setSelectedPageSlug] = useState<string>("tentang-kami");
  const [pageTitle, setPageTitle] = useState("");
  const [pageContent, setPageContent] = useState("");
  const [isSavingPage, setIsSavingPage] = useState(false);
  const [previewMarkdown, setPreviewMarkdown] = useState(false);

  // FAQs state
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqCategory, setFaqCategory] = useState("Umum");
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqSortOrder, setFaqSortOrder] = useState(0);
  const [isSubmittingFaq, setIsSubmittingFaq] = useState(false);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, fRes] = await Promise.all([
        apiClient("/api/v1/admin/content/pages"),
        apiClient("/api/v1/admin/content/faqs"),
      ]);

      if (pRes.ok) {
        const pagesData: StaticPageItem[] = await pRes.json();
        setPages(pagesData);
        if (pagesData.length > 0) {
          const current = pagesData.find((p) => p.slug === selectedPageSlug) || pagesData[0];
          setSelectedPageSlug(current.slug);
          setPageTitle(current.title);
          setPageContent(current.content_markdown);
        }
      }

      if (fRes.ok) {
        setFaqs(await fRes.json());
      }
    } catch {
      showToast("error", "Gagal memuat konten");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Switch Selected Page
  const handleSelectPage = (slug: string) => {
    setSelectedPageSlug(slug);
    const p = pages.find((item) => item.slug === slug);
    if (p) {
      setPageTitle(p.title);
      setPageContent(p.content_markdown);
    }
  };

  // Save Page
  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPage(true);

    try {
      const res = await apiClient(`/api/v1/admin/content/pages/${selectedPageSlug}`, {
        method: "PUT",
        body: JSON.stringify({
          title: pageTitle.trim(),
          content_markdown: pageContent,
        }),
      });

      if (res.ok) {
        showToast("success", `Halaman '${pageTitle}' berhasil disimpan & disanitasi.`);
        loadData();
      } else {
        showToast("error", "Gagal menyimpan halaman");
      }
    } catch {
      showToast("error", "Kesalahan koneksi");
    } finally {
      setIsSavingPage(false);
    }
  };

  // Save FAQ (Create or Update)
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;

    setIsSubmittingFaq(true);
    try {
      const endpoint = editingFaqId
        ? `/api/v1/admin/content/faqs/${editingFaqId}`
        : "/api/v1/admin/content/faqs";
      const method = editingFaqId ? "PUT" : "POST";

      const res = await apiClient(endpoint, {
        method,
        body: JSON.stringify({
          category: faqCategory.trim(),
          question: faqQuestion.trim(),
          answer: faqAnswer.trim(),
          sort_order: Number(faqSortOrder),
          is_published: true,
        }),
      });

      if (res.ok) {
        showToast("success", editingFaqId ? "FAQ berhasil diperbarui" : "FAQ baru berhasil dibuat");
        setShowFaqModal(false);
        setEditingFaqId(null);
        setFaqQuestion("");
        setFaqAnswer("");
        setFaqCategory("Umum");
        setFaqSortOrder(0);
        loadData();
      } else {
        showToast("error", "Gagal menyimpan FAQ");
      }
    } catch {
      showToast("error", "Kesalahan koneksi");
    } finally {
      setIsSubmittingFaq(false);
    }
  };

  // Delete FAQ
  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Hapus pertanyaan FAQ ini?")) return;

    try {
      const res = await apiClient(`/api/v1/admin/content/faqs/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("success", "FAQ berhasil dihapus");
        loadData();
      }
    } catch {
      showToast("error", "Gagal menghapus FAQ");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 border font-mono text-xs flex items-center gap-2 shadow-lg ${
            notification.type === "success"
              ? "bg-emerald-950 text-emerald-100 border-emerald-800"
              : "bg-red-950 text-red-100 border-red-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase font-mono flex items-center gap-2">
            <FileText className="w-5 h-5" /> Manajemen Konten & CMS
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            Editor halaman statis Markdown (tersanitasi Ammonia) dan manajemen Tanya Jawab (FAQ) toko
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-hairline)] font-mono text-xs">
        <button
          onClick={() => setActiveTab("pages")}
          className={`px-6 py-3 font-bold uppercase border-b-2 cursor-pointer transition-colors ${
            activeTab === "pages"
              ? "border-black text-black"
              : "border-transparent text-[var(--text-muted)] hover:text-black"
          }`}
        >
          Halaman Statis ({pages.length})
        </button>
        <button
          onClick={() => setActiveTab("faqs")}
          className={`px-6 py-3 font-bold uppercase border-b-2 cursor-pointer transition-colors ${
            activeTab === "faqs"
              ? "border-black text-black"
              : "border-transparent text-[var(--text-muted)] hover:text-black"
          }`}
        >
          Tanya Jawab / FAQ ({faqs.length})
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center font-mono text-xs text-[var(--text-muted)] space-y-2">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-black" />
          <p>Memuat konten...</p>
        </div>
      ) : activeTab === "pages" ? (
        /* ---------------- STATIC PAGES CMS ---------------- */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 font-mono text-xs">
          {/* Sidebar Page Selector */}
          <div className="bg-white border border-[var(--border-hairline)] p-4 space-y-3">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
              Pilih Halaman Statis
            </span>
            <div className="space-y-1">
              {pages.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => handleSelectPage(p.slug)}
                  className={`w-full text-left p-2.5 border text-xs cursor-pointer transition-colors ${
                    selectedPageSlug === p.slug
                      ? "border-black bg-neutral-900 text-white font-bold"
                      : "border-[var(--border-hairline)] bg-white hover:bg-neutral-50 text-[var(--text-primary)]"
                  }`}
                >
                  <div className="truncate">{p.title}</div>
                  <div className={`text-[10px] mt-0.5 ${selectedPageSlug === p.slug ? "text-neutral-400" : "text-[var(--text-muted)]"}`}>
                    /{p.slug}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Markdown Editor & Live Preview */}
          <div className="md:col-span-3 bg-white border border-[var(--border-hairline)] p-5 space-y-4">
            <form onSubmit={handleSavePage} className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold text-[var(--text-primary)]">
                    Edit Konten: /{selectedPageSlug}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMarkdown((prev) => !prev)}
                    className="px-3 py-1.5 border border-[var(--border-hairline)] bg-white text-xs uppercase hover:border-black flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> {previewMarkdown ? "Editor" : "Preview"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPage}
                    className="px-4 py-1.5 bg-black text-white text-xs uppercase font-bold hover:bg-neutral-800 cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> {isSavingPage ? "Menyimpan..." : "Simpan Halaman"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Judul Halaman
                </label>
                <input
                  type="text"
                  required
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Konten Markdown
                </label>
                {previewMarkdown ? (
                  <div className="w-full p-4 border border-[var(--border-hairline)] bg-[var(--bg-canvas)] min-h-[350px] font-sans text-sm prose max-w-none whitespace-pre-wrap leading-relaxed">
                    {pageContent}
                  </div>
                ) : (
                  <textarea
                    rows={16}
                    value={pageContent}
                    onChange={(e) => setPageContent(e.target.value)}
                    className="w-full p-3 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono resize-none leading-relaxed"
                  />
                )}
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* ---------------- FAQS MANAGER ---------------- */
        <div className="space-y-4 font-mono text-xs">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingFaqId(null);
                setFaqCategory("Umum");
                setFaqQuestion("");
                setFaqAnswer("");
                setFaqSortOrder(faqs.length + 1);
                setShowFaqModal(true);
              }}
              className="px-4 py-2 bg-black text-white uppercase font-bold hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah FAQ Baru
            </button>
          </div>

          <div className="bg-white border border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)]">
            {faqs.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)] space-y-1">
                <HelpCircle className="w-6 h-6 mx-auto text-neutral-300" />
                <p>Belum ada pertanyaan FAQ yang dibuat.</p>
              </div>
            ) : (
              faqs.map((faq) => (
                <div key={faq.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50/60">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 bg-neutral-100 border border-neutral-300 font-bold">
                        {faq.category}
                      </span>
                      <span className="font-bold text-xs text-[var(--text-primary)]">
                        {faq.question}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed pl-1">
                      {faq.answer}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingFaqId(faq.id);
                        setFaqCategory(faq.category);
                        setFaqQuestion(faq.question);
                        setFaqAnswer(faq.answer);
                        setFaqSortOrder(faq.sort_order);
                        setShowFaqModal(true);
                      }}
                      className="px-2.5 py-1.5 border border-[var(--border-hairline)] bg-white uppercase hover:border-black flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteFaq(faq.id)}
                      className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* FAQ Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--border-hairline)] max-w-lg w-full shadow-2xl p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <span className="font-bold uppercase flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" /> {editingFaqId ? "Edit Pertanyaan FAQ" : "Tambah FAQ Baru"}
              </span>
              <button
                onClick={() => setShowFaqModal(false)}
                className="text-[var(--text-muted)] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Kategori FAQ
                </label>
                <input
                  type="text"
                  required
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value)}
                  placeholder="Contoh: Pengiriman, Garansi, Pembayaran"
                  className="w-full px-3 py-2 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Pertanyaan *
                </label>
                <input
                  type="text"
                  required
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  placeholder="Contoh: Apakah laptop bergaransi resmi?"
                  className="w-full px-3 py-2 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Jawaban *
                </label>
                <textarea
                  rows={4}
                  required
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  placeholder="Tulis jawaban lengkap dan informatif..."
                  className="w-full p-2.5 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Urutan Tampil (Sort Order)
                </label>
                <input
                  type="number"
                  value={faqSortOrder}
                  onChange={(e) => setFaqSortOrder(Number(e.target.value))}
                  className="w-32 px-3 py-2 border border-[var(--border-hairline)] outline-none focus:border-black text-xs font-mono tnum"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => setShowFaqModal(false)}
                  className="px-3 py-1.5 border uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFaq}
                  className="px-4 py-1.5 bg-black text-white uppercase font-bold hover:bg-neutral-800 cursor-pointer"
                >
                  {isSubmittingFaq ? "Menyimpan..." : "Simpan FAQ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
