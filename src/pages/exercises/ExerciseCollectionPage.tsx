import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Folder,
  FolderPlus,
  Loader2,
  AlertTriangle,
  ListChecks,
  ChevronRight,
  Shuffle,
  Plus,
  Pencil,
  Minus,
} from "lucide-react";
import { ApiSettings } from "@/components/ApiSettings";
import { CollectionFormDialog } from "@/components/collections/CollectionFormDialog";
import { AddItemsDialog } from "@/components/collections/AddItemsDialog";
import {
  getCollection,
  getCollectionTree,
  listExercises,
  removeExercisesFromCollection,
  type Collection,
  type CollectionTreeNode,
  type ExerciseListItem,
} from "@/services/vocabApi";

/** Bên trong một lộ trình bài tập: thư mục con + danh sách đề. */
export function ExerciseCollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [reloadTick, setReloadTick] = useState(0);
  const [dialog, setDialog] = useState<null | "edit" | "child" | "add-exercises">(null);
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
          key: `${slug}:${reloadTick}`,
          collection,
          children: root?.children ?? [],
          exercises: page.exercises,
          total: page.pagination.total,
        });
      } catch (e) {
        if (!cancelled)
          setData({
            key: `${slug}:${reloadTick}`,
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
  }, [slug, reloadTick]);

  const loading = !data || data.key !== `${slug}:${reloadTick}`;
  const collection = data?.collection;
  const reload = () => setReloadTick(t => t + 1);

  const removeExercise = async (id: number) => {
    if (!collection) return;
    setData(d => d && { ...d, exercises: d.exercises.filter(e => e.id !== id), total: d.total - 1 });
    try {
      await removeExercisesFromCollection(collection.id, [id]);
    } catch {
      reload();
    }
  };

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
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setDialog("edit")}
            disabled={!collection}
            title="Sửa / xóa lộ trình"
            className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-40"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <ApiSettings />
          <button
            onClick={() => setDialog("add-exercises")}
            disabled={!collection}
            className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all whitespace-nowrap disabled:opacity-40"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">Thêm bài tập</span>
          </button>
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

              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Thư mục con ({data.children.length})
                  </h2>
                  <div className="flex-1 h-px bg-slate-300/60 dark:bg-slate-800/60" />
                  <button
                    onClick={() => setDialog("child")}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    Tạo thư mục con
                  </button>
                </div>
                {data.children.length > 0 && (
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
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Bài tập ({data.total})
                  </h2>
                  <div className="flex-1 h-px bg-slate-300/60 dark:bg-slate-800/60" />
                </div>
                {data.exercises.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-sm text-slate-400 dark:text-slate-600 italic">
                      Lộ trình này chưa có bài tập nào.
                    </p>
                    <button
                      onClick={() => setDialog("add-exercises")}
                      className="mx-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm bài tập vào lộ trình
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.exercises.map(ex => (
                      <div
                        key={ex.id}
                        className="relative rounded-xl border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 hover:border-blue-500/60 transition-colors"
                      >
                        <Link to={`/exercises/${ex.id}`} className="block p-3.5 space-y-2 pr-8">
                          <h3 className="text-sm font-bold leading-snug line-clamp-2">{ex.title}</h3>
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <ListChecks className="w-3 h-3" />
                            {ex.questionCount} câu
                          </span>
                        </Link>
                        <button
                          onClick={() => void removeExercise(ex.id)}
                          title="Gỡ khỏi lộ trình (không xóa bài tập)"
                          className="absolute top-3 right-3 text-slate-300 dark:text-slate-700 hover:text-red-500 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {dialog === "edit" && collection && (
        <CollectionFormDialog
          editing={collection}
          onClose={() => setDialog(null)}
          onSaved={saved => {
            if (saved.slug !== collection.slug) navigate(`/exercises/c/${saved.slug}`, { replace: true });
            else reload();
          }}
          onDeleted={() => navigate("/exercises", { replace: true })}
        />
      )}
      {dialog === "child" && collection && (
        <CollectionFormDialog
          parentId={collection.id}
          parentTitle={collection.title}
          onClose={() => setDialog(null)}
          onSaved={() => reload()}
        />
      )}
      {dialog === "add-exercises" && collection && (
        <AddItemsDialog
          collectionId={collection.id}
          collectionTitle={collection.title}
          kind="exercises"
          onClose={() => setDialog(null)}
          onAdded={() => reload()}
        />
      )}
    </div>
  );
}
