import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Folder,
  Loader2,
  AlertTriangle,
  Zap,
  Repeat,
  List,
  Volume2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import { ApiSettings } from "@/components/ApiSettings";
import { VoiceSettings } from "@/components/ipa/VoiceSettings";
import {
  getCollection,
  getCollectionTree,
  listWords,
  type Collection,
  type CollectionTreeNode,
  type Word,
} from "@/services/vocabApi";

/**
 * Bên trong một lộ trình từ vựng: thư mục con, danh sách từ,
 * và các chế độ luyện/ôn đã giới hạn sẵn phạm vi collection này.
 */
export function CollectionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<{
    key: string;
    collection?: Collection;
    children: CollectionTreeNode[];
    words: Word[];
    total: number;
    error?: string;
  } | null>(null);
  const { speak, speaking, supported } = useSpeech();

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const [collection, tree, wordPage] = await Promise.all([
          getCollection(slug),
          getCollectionTree({ root: slug, depth: 2 }),
          listWords({ collection: slug, includeSub: true, limit: 100 }),
        ]);
        if (cancelled) return;
        const root = tree.find(n => n.slug === collection.slug || n.id === collection.id);
        setData({
          key: slug,
          collection,
          children: root?.children ?? [],
          words: wordPage.words,
          total: wordPage.pagination.total,
        });
      } catch (e) {
        if (!cancelled)
          setData({ key: slug, children: [], words: [], total: 0, error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const loading = !data || data.key !== slug;
  const collection = data?.collection;

  const goPractice = () => navigate(`/vocab/practice?collections=${collection?.id ?? ""}`);
  const goReview = () => navigate("/vocab/review");

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      <header className="relative h-16 flex items-center justify-between gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={collection?.parent ? `/vocab/c/${collection.parent.slug}` : "/vocab"}
            className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold truncate">{collection?.title ?? slug}</h1>
            {collection && (
              <p className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500">
                {collection.parent && (
                  <>
                    <Link to={`/vocab/c/${collection.parent.slug}`} className="hover:underline">
                      {collection.parent.title}
                    </Link>
                    <ChevronRight className="w-3 h-3" />
                  </>
                )}
                {data?.total ?? 0} từ
                {collection.difficulty ? ` · độ khó ${collection.difficulty}/5` : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <VoiceSettings />
          <ApiSettings />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
          {data?.error && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {data.error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tải…
            </div>
          ) : (
            <>
              {collection?.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{collection.description}</p>
              )}

              {/* Chế độ học cho chính bộ này */}
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  onClick={goPractice}
                  className="flex items-start gap-3 rounded-xl border border-blue-500/50 bg-blue-500/5 p-3.5 text-left hover:bg-blue-500/10 transition-colors"
                >
                  <Zap className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <span>
                    <span className="block text-sm font-bold">Luyện bộ này</span>
                    <span className="block text-[11px] text-slate-500">Lật thẻ &amp; 8 dạng quiz</span>
                  </span>
                </button>
                <button
                  onClick={goReview}
                  className="flex items-start gap-3 rounded-xl border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 p-3.5 text-left hover:border-blue-500/60 transition-colors"
                >
                  <Repeat className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <span>
                    <span className="block text-sm font-bold">Ôn theo lịch</span>
                    <span className="block text-[11px] text-slate-500">Thẻ FSRS đến hạn</span>
                  </span>
                </button>
                <Link
                  to={`/vocab/words?collection=${collection?.slug ?? ""}`}
                  className="flex items-start gap-3 rounded-xl border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 p-3.5 hover:border-blue-500/60 transition-colors"
                >
                  <List className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <span>
                    <span className="block text-sm font-bold">Xem đầy đủ</span>
                    <span className="block text-[11px] text-slate-500">Danh sách từ có lọc</span>
                  </span>
                </Link>
              </div>

              {/* Thư mục con */}
              {data.children.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Thư mục con</h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.children.map(child => (
                      <Link
                        key={child.id}
                        to={`/vocab/c/${child.slug || child.id}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 px-4 py-3 hover:border-blue-500/60 transition-colors"
                      >
                        <Folder className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                        <span className="flex-1 min-w-0 truncate text-sm font-semibold">{child.title}</span>
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">
                          {child.totalWordCount} từ
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Từ trong bộ */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Từ trong bộ ({data.total})
                  </h2>
                  <div className="flex-1 h-px bg-slate-300/60 dark:bg-slate-800/60" />
                </div>
                {data.words.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-600 italic">
                    Bộ này chưa có từ nào.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.words.map(word => (
                      <div
                        key={word.id}
                        className="rounded-lg border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 px-3 py-2.5 space-y-1"
                      >
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-bold">{word.headword}</span>
                          {word.pronunciation && (
                            <span className="text-xs text-slate-500 font-mono">{word.pronunciation}</span>
                          )}
                          {supported && (
                            <button
                              onClick={() => speak(word.headword, String(word.id))}
                              className={cn(
                                "text-slate-400 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors",
                                speaking === String(word.id) && "text-blue-600 dark:text-blue-400"
                              )}
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {word.senses[0] && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                            {word.senses[0].partOfSpeech && (
                              <span className="font-bold mr-1.5">{word.senses[0].partOfSpeech}.</span>
                            )}
                            {word.senses[0].definition}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
