import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Folder,
  FolderOpen,
  Loader2,
  AlertTriangle,
  CheckSquare,
  Square,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCollectionTree,
  listTags,
  type CollectionTreeNode,
  type Tag,
} from "@/services/vocabApi";

// ============================================================
// Duyệt collection kiểu thư mục: chia section theo tag nhóm lớn
// (GET /api/tags?type=collection), mỗi section là hàng thẻ "folder".
// Dùng chung cho Từ vựng và Bài tập — khác nhau ở `countOf` và link.
// ============================================================

const DIFFICULTY_BAR = [
  "bg-emerald-500",
  "bg-lime-500",
  "bg-amber-500",
  "bg-orange-500",
  "bg-red-500",
];

export interface FolderBrowserProps {
  /** Đường dẫn gốc để tạo link vào folder, vd "/vocab/c" */
  basePath: string;
  /** Số hiển thị trên thẻ (từ vựng hay bài tập) */
  countOf: (node: CollectionTreeNode) => number;
  /** Nhãn đơn vị: "bộ từ" / "bài tập" */
  unitLabel: string;
  /** Bật chọn nhiều folder (để học/làm kết hợp) */
  selectable?: boolean;
  selected?: number[];
  onToggleSelect?: (id: number) => void;
}

interface TreeState {
  tags: Tag[];
  /** tag.name → cây collection của tag đó ("" = không tag) */
  byTag: Record<string, CollectionTreeNode[]>;
  error: string | null;
}

export function FolderBrowser({
  basePath,
  countOf,
  unitLabel,
  selectable = false,
  selected = [],
  onToggleSelect,
}: FolderBrowserProps) {
  const [state, setState] = useState<TreeState | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tags, allRoots] = await Promise.all([listTags("collection"), getCollectionTree({ depth: 3 })]);
        if (cancelled) return;
        const byTag: Record<string, CollectionTreeNode[]> = {};
        for (const tag of tags) {
          byTag[tag.name] = allRoots.filter(n => n.tags.includes(tag.name));
        }
        // Lộ trình không mang tag nhóm nào → gom vào section "Khác"
        const tagged = new Set(tags.flatMap(t => byTag[t.name].map(n => n.id)));
        const untagged = allRoots.filter(n => !tagged.has(n.id));
        if (untagged.length) byTag[""] = untagged;
        setState({ tags, byTag, error: null });
      } catch (e) {
        if (!cancelled) setState({ tags: [], byTag: {}, error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(() => {
    if (!state) return [];
    const q = search.trim().toLowerCase();
    const match = (nodes: CollectionTreeNode[]) =>
      q ? nodes.filter(n => n.title.toLowerCase().includes(q) || n.slug.toLowerCase().includes(q)) : nodes;
    const list: { key: string; label: string; nodes: CollectionTreeNode[] }[] = state.tags.map(t => ({
      key: t.name,
      label: t.label || t.name,
      nodes: match(state.byTag[t.name] ?? []),
    }));
    if (state.byTag[""]) list.push({ key: "", label: "Khác", nodes: match(state.byTag[""]) });
    return list.filter(s => s.nodes.length > 0);
  }, [state, search]);

  if (!state) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Đang tải lộ trình…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {state.error && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {state.error}
        </div>
      )}

      {(sections.length > 0 || search) && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-600" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm lộ trình…"
            className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
          />
        </div>
      )}

      {sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 py-12 text-center space-y-1">
          <FolderOpen className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600" />
          <p className="text-sm text-slate-500">
            {search ? "Không có lộ trình nào khớp." : "Chưa có lộ trình nào."}
          </p>
          {!search && (
            <p className="text-xs text-slate-400 dark:text-slate-600">
              Tạo collection ở API rồi tải lại, hoặc dùng mục "Tất cả" bên trên.
            </p>
          )}
        </div>
      ) : (
        sections.map(section => (
          <section key={section.key} className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{section.label}</h2>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 dark:bg-slate-800/60 rounded-full px-2 py-0.5">
                {section.nodes.length} lộ trình
              </span>
              <div className="flex-1 h-px bg-slate-300/60 dark:bg-slate-800/60" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.nodes.map(node => (
                <FolderCard
                  key={node.id}
                  node={node}
                  basePath={basePath}
                  count={countOf(node)}
                  unitLabel={unitLabel}
                  selectable={selectable}
                  checked={selected.includes(node.id)}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export function FolderCard({
  node,
  basePath,
  count,
  unitLabel,
  selectable,
  checked,
  onToggleSelect,
}: {
  node: CollectionTreeNode;
  basePath: string;
  count: number;
  unitLabel: string;
  selectable?: boolean;
  checked?: boolean;
  onToggleSelect?: (id: number) => void;
}) {
  const difficulty = node.difficulty ?? 0;

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-white dark:bg-slate-950/40 transition-colors",
        checked
          ? "border-blue-500/60 ring-1 ring-blue-500/30"
          : "border-slate-300/60 dark:border-slate-800/60 hover:border-slate-400 dark:hover:border-slate-700"
      )}
    >
      <Link to={`${basePath}/${node.slug || node.id}`} className="block p-4 space-y-3">
        <div className="flex items-start gap-2.5 pr-6">
          <Folder className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
            {node.title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-medium">
            {count} {unitLabel}
          </span>
          {node.childCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 text-slate-500">
              {node.childCount} thư mục con
            </span>
          )}
        </div>

        {difficulty > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>Độ khó</span>
              <span className="tabular-nums">{difficulty}/5</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={cn("h-full rounded-full", DIFFICULTY_BAR[difficulty - 1] ?? "bg-slate-400")}
                style={{ width: `${(difficulty / 5) * 100}%` }}
              />
            </div>
          </div>
        )}
      </Link>

      {selectable && (
        <button
          onClick={() => onToggleSelect?.(node.id)}
          title={checked ? "Bỏ chọn bộ này" : "Chọn để học kết hợp"}
          className={cn(
            "absolute top-3 right-3 transition-colors",
            checked ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300"
          )}
        >
          {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}
