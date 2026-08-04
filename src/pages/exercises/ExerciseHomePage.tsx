import { Link } from "react-router-dom";
import { List, Database, Upload, ClipboardList } from "lucide-react";
import { ApiSettings } from "@/components/ApiSettings";
import { FolderBrowser } from "@/components/collections/FolderBrowser";

/** Màn hình gốc của Bài tập: duyệt lộ trình như thư mục + lối tắt. */
export function ExerciseHomePage() {
  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      <header className="relative h-16 flex items-center justify-between gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold truncate">Bài tập</h1>
          <p className="hidden sm:block text-[11px] text-slate-500">
            Chọn lộ trình để làm bài, hoặc vào ngân hàng câu để trộn đề
          </p>
        </div>
        <ApiSettings />
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
          <div className="grid gap-2 sm:grid-cols-3">
            <ShortcutCard to="/exercises/all" icon={List} title="Tất cả bài tập" desc="Danh sách có lọc, tìm kiếm" />
            <ShortcutCard to="/exercises/questions" icon={Database} title="Ngân hàng câu hỏi" desc="Duyệt câu, trộn đề mới" />
            <ShortcutCard to="/exercises/upload" icon={Upload} title="Import .md" desc="Nạp từ vựng &amp; bài tập" />
          </div>

          <FolderBrowser
            basePath="/exercises/c"
            countOf={n => n.totalExerciseCount}
            unitLabel="bài tập"
          />
        </div>
      </div>
    </div>
  );
}

function ShortcutCard({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: typeof ClipboardList;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-start gap-3 rounded-xl border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 p-3.5 hover:border-blue-500/60 transition-colors"
    >
      <Icon className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{title}</span>
        <span className="block text-[11px] text-slate-500">{desc}</span>
      </span>
    </Link>
  );
}
