import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

/**
 * Shell shared by every route.
 * Desktop (≥ md): persistent left sidebar.
 * Mobile: sidebar ẩn, thay bằng nút menu nổi mở drawer trượt từ trái.
 */
export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#0a0f1c]">
      {/* Desktop sidebar */}
      <div className="hidden md:block h-screen shrink-0">
        <Sidebar />
      </div>

      {/* Mobile: menu button ở góc trái header (các trang chừa sẵn pl-16) */}
      <button
        onClick={() => setDrawerOpen(true)}
        title="Mở menu"
        className="md:hidden fixed top-3 left-3 z-40 flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white shadow-md shadow-blue-600/30 active:scale-95 transition-transform"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile: drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full shadow-2xl shadow-black/50 animate-in slide-in-from-left duration-200">
            <Sidebar variant="drawer" onNavigate={() => setDrawerOpen(false)} />
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            title="Đóng menu"
            className="absolute top-3 left-[15rem] flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
