import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Folder,
  Loader2,
  AlertTriangle,
  ListChecks,
  ChevronRight,
  Shuffle,
} from "lucide-react";
import { ApiSettings } from "@/components/ApiSettings";
import {
  getCollection,
  getCollectionTree,
  listExercises,
  type Collection,
  type CollectionTreeNode,
  type ExerciseListItem,
} from "@/services/vocabApi";

/** Bên trong một lộ trình bài tập: thư mục con + danh sách đề. */
export function ExerciseCollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<{
    key: string;
    collection?: Collection;
    children: CollectionTreeNode[];
    exercises: ExerciseListItem[];
    total: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const [collection, tree, page] = await Promise.all([
          getCollection(slug),
          getCollectionTree({ root: slug, depth: 2 }),
          listExercises({ collection: slug, includeSub: true, limit: 100 }),
        ]);
        if (cancelled) return;
        const root = tree.find(n => n.slug === collection.slug || n.id === collection.id);
        setData({
          key: slug,
          collection,
          children: root?.children ?? [],
          exercises: page.exercises,
          total: page.pagination.total,
        });
      } catch (e) {
        if (!cancelled)
          setData({
            key: slug,
            children: [],
            exercises: [],
            total: 0,
            error: e instanceof Error ? e.message : String(e),
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const loading = !data || data.key !== slug;
  const collection = data?.collection;

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      <header className="relative h-16 flex items-center justify-between gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={collection?.parent ? `/exercises/c/${collection.parent.slug}` : "/exercises"}
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
                    <Link to={`/exercises/c/${collection.parent.slug}`} className="hover:underline">
                      {collection.parent.title}
                    </Link>
                    <ChevronRight className="w-3 h-3" />
                  </>
                )}
                {data?.total ?? 0} bài tập
              </p>
            )}
          </div>
        </div>
        <ApiSettings />
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

              <Link
                to={`/exercises/questions?collection=${collection?.slug ?? ""}`}
                className="flex items-start gap-3 rounded-xl border border-blue-500/50 bg-blue-500/5 p-3.5 hover:bg-blue-500/10 transition-colors"
              >
                <Shuffle className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <span>
                  <span className="block text-sm font-bold">Trộn đề từ lộ trình này</span>
                  <span className="block text-[11px] text-slate-500">Chọn câu trong ngân hàng rồi tạo đề mới</span>
                </span>
              </Link>

              {data.children.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Thư mục con</h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.children.map(child => (
                      <Link
                        key={child.id}
                        to={`/exercises/c/${child.slug || child.id}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 px-4 py-3 hover:border-blue-500/60 transition-colors"
                      >
                        <Folder className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                        <span className="flex-1 min-w-0 truncate text-sm font-semibold">{child.title}</span>
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">
                          {child.totalExerciseCount} bài
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Bài tập ({data.total})
                  </h2>
                  <div className="flex-1 h-px bg-slate-300/60 dark:bg-slate-800/60" />
                </div>
                {data.exercises.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-600 italic">
                    Lộ trình này chưa có bài tập nào.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.exercises.map(ex => (
                      <Link
                        key={ex.id}
                        to={`/exercises/${ex.id}`}
                        className="rounded-xl border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 p-3.5 space-y-2 hover:border-blue-500/60 transition-colors"
                      >
                        <h3 className="text-sm font-bold leading-snug line-clamp-2">{ex.title}</h3>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <ListChecks className="w-3 h-3" />
                          {ex.questionCount} câu
                        </span>
                      </Link>
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
