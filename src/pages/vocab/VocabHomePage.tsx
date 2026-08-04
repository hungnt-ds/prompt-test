import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { List, Zap, Repeat, Layers, X } from "lucide-react";
import { ApiSettings } from "@/components/ApiSettings";
import { VoiceSettings } from "@/components/ipa/VoiceSettings";
import { TagManager } from "@/components/TagManager";
import { FolderBrowser } from "@/components/collections/FolderBrowser";

/**
 * Màn hình gốc của Từ vựng: duyệt lộ trình như thư mục (theo tag nhóm lớn),
 * chọn nhiều bộ để học kết hợp, hoặc vào các lối tắt (tất cả từ / luyện / ôn).
 */
export function VocabHomePage() {
  const [selected, setSelected] = useState<number[]>([]);
  const navigate = useNavigate();

  const toggle = (id: number) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const practiceSelected = () =>
    navigate(`/vocab/practice?collections=${selected.join(",")}`);

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      <header className="relative h-16 flex items-center justify-between gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold truncate">Từ vựng</h1>
          <p className="hidden sm:block text-[11px] text-slate-500">
            Chọn lộ trình để học, hoặc tick nhiều bộ để luyện kết hợp
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TagManager />
          <VoiceSettings />
          <ApiSettings />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
          {/* Lối tắt */}
          <div className="grid gap-2 sm:grid-cols-3">
            <ShortcutCard to="/vocab/words" icon={List} title="Tất cả từ vựng" desc="Duyệt, tìm, sửa tag" />
            <ShortcutCard to="/vocab/practice" icon={Zap} title="Luyện tập nhanh" desc="Lật thẻ & 8 dạng quiz" />
            <ShortcutCard to="/vocab/review" icon={Repeat} title="Ôn theo lịch" desc="Thẻ FSRS đến hạn" />
          </div>

          {/* Thư mục lộ trình */}
          <FolderBrowser
            basePath="/vocab/c"
            countOf={n => n.totalWordCount}
            unitLabel="từ"
            selectable
            selected={selected}
            onToggleSelect={toggle}
          />
        </div>
        <div className="h-20" />
      </div>

      {/* Thanh chọn nhiều bộ */}
      {selected.length > 0 && (
        <footer className="shrink-0 border-t border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-[#0d1424] px-4 md:px-6 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-blue-600 dark:text-blue-400">{selected.length} bộ đã chọn</span>
              <button
                onClick={() => setSelected([])}
                title="Bỏ chọn hết"
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </span>
            <button
              onClick={practiceSelected}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all"
            >
              <Layers className="w-4 h-4" />
              Luyện kết hợp
            </button>
          </div>
        </footer>
      )}
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
  icon: typeof List;
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
