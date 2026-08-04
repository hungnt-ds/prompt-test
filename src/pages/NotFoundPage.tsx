import { Link, useLocation } from "react-router-dom";
import { Compass } from "lucide-react";

/** Fallback cho mọi đường dẫn không khớp — tránh màn hình trắng. */
export function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 p-6 bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      <Compass className="w-12 h-12 text-blue-600 dark:text-blue-400" />
      <div className="text-center space-y-1">
        <h1 className="text-lg font-bold">Không tìm thấy trang</h1>
        <p className="text-sm text-slate-500 font-mono break-all">{pathname}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {[
          { to: "/vocab", label: "Từ vựng" },
          { to: "/exercises", label: "Bài tập" },
          { to: "/chunks", label: "Đọc chunk" },
          { to: "/", label: "Trang chủ" },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 dark:border-slate-800 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
