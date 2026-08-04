import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { List, Database, Upload, ClipboardList, FolderPlus, FilePlus2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiSettings } from "@/components/ApiSettings";
import { FolderBrowser } from "@/components/collections/FolderBrowser";
import { CollectionFormDialog } from "@/components/collections/CollectionFormDialog";

/** Màn hình gốc của Bài tập: duyệt lộ trình như thư mục + lối tắt. */
export function ExerciseHomePage() {
  const [creating, setCreating] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      <header className="relative h-16 flex items-center justify-between gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold truncate">Bài tập</h1>
          <p className="hidden sm:block text-[11px] text-slate-500">
            Chọn lộ trình để làm bài, hoặc vào ngân hàng câu để trộn đề
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ApiSettings />
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">Tạo lộ trình</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ShortcutCard to="/exercises/new" icon={FilePlus2} title="Soạn đề mới" desc="Trắc nghiệm, điền câu, đối thoại" highlight />
            <ShortcutCard to="/exercises/all" icon={List} title="Tất cả bài tập" desc="Danh sách có lọc, tìm kiếm" />
            <ShortcutCard to="/exercises/questions" icon={Database} title="Ngân hàng câu hỏi" desc="Duyệt câu, trộn đề mới" />
            <ShortcutCard to="/exercises/upload" icon={Upload} title="Import .md" desc="Nạp từ vựng &amp; bài tập" />
          </div>

          <FolderBrowser
            key={reloadTick}
            basePath="/exercises/c"
            countOf={n => n.totalExerciseCount}
            unitLabel="bài tập"
          />
        </div>
      </div>

      {creating && (
        <CollectionFormDialog
          onClose={() => setCreating(false)}
          onSaved={c => {
            setReloadTick(t => t + 1);
            navigate(`/exercises/c/${c.slug || c.id}`);
          }}
        />
      )}
    </div>
  );
}

function ShortcutCard({
  to,
  icon: Icon,
  title,
  desc,
  highlight,
}: {
  to: string;
  icon: typeof ClipboardList;
  title: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3.5 transition-colors",
        highlight
          ? "border-blue-500/50 bg-blue-500/5 hover:bg-blue-500/10"
          : "border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 hover:border-blue-500/60"
      )}
    >
      <Icon className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{title}</span>
        <span className="block text-[11px] text-slate-500">{desc}</span>
      </span>
    </Link>
  );
}
