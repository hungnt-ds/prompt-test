import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Type, AudioLines, ClipboardList, BookOpen, Zap, Repeat, Database, PanelLeftClose, PanelLeftOpen, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Type;
  /** Only match this exact path (used for the root route). */
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Prompt", icon: Type, end: true },
  { to: "/ipa", label: "Học IPA", icon: AudioLines },
  { to: "/vocab", label: "Từ vựng", icon: BookOpen },
  { to: "/practice", label: "Luyện tập", icon: Zap },
  { to: "/review", label: "Ôn tập", icon: Repeat },
  { to: "/exercises", label: "Bài tập", icon: ClipboardList },
  { to: "/questions", label: "Ngân hàng câu", icon: Database },
];

const STORAGE_KEY = "sidebar:collapsed";
const THEME_KEY = "ui:theme";

interface SidebarProps {
  /** "drawer" = bản mobile trong overlay: luôn mở rộng, ẩn nút thu gọn. */
  variant?: "desktop" | "drawer";
  /** Gọi khi bấm một mục menu (để drawer tự đóng). */
  onNavigate?: () => void;
}

export function Sidebar({ variant = "desktop", onNavigate }: SidebarProps) {
  const isDrawer = variant === "drawer";
  const [collapsedStored, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  const collapsed = isDrawer ? false : collapsedStored;
  const [dark, setDark] = useState<boolean>(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true
  );

  useEffect(() => {
    if (!isDrawer) window.localStorage.setItem(STORAGE_KEY, collapsedStored ? "1" : "0");
  }, [collapsedStored, isDrawer]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  };

  return (
    <aside
      className={cn(
        "shrink-0 h-screen flex flex-col border-r border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-[#0a0f1c] text-slate-900 dark:text-slate-100 transition-[width] duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Brand + collapse toggle */}
      <div className="h-16 flex items-center gap-2 px-3 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        {!collapsed && (
          <span className="flex-1 min-w-0 truncate text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Prompt&nbsp;·&nbsp;IPA
          </span>
        )}
        {!isDrawer && (
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 h-11 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-blue-600 text-white dark:bg-blue-600 dark:text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Theme toggle */}
      <div className="shrink-0 p-2 border-t border-slate-300/60 dark:border-slate-800/60">
        <button
          onClick={toggleTheme}
          title={dark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
          className={cn(
            "w-full flex items-center gap-3 rounded-lg px-3 h-11 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          {dark ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
          {!collapsed && <span className="truncate">{dark ? "Giao diện sáng" : "Giao diện tối"}</span>}
        </button>
      </div>
    </aside>
  );
}
