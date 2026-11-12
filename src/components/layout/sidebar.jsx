"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  LayoutGrid,
  FileText,
  BookOpen,
  Layers,
  Network,
  BarChart2,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutGrid, exact: true },
  { label: "Requisitos", href: "/requisitos", icon: FileText },
  { label: "User Stories", href: "/user-stories", icon: BookOpen },
  { label: "Backlog", href: "/backlog", icon: Layers },
  { label: "Rastreabilidade", href: "/rastreabilidade", icon: Network },
  { label: "Relatórios", href: "/relatorios", icon: BarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="w-64 bg-[#112240] dark:bg-[#090f1d] text-slate-300 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none border-r border-slate-800/80 transition-colors">
      {/* Top Section: Brand */}
      <div>
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800/60">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/40">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg tracking-tight leading-none">ReqFlow</h1>
            <span className="text-xs text-blue-300/80 font-medium">Eng. de Requisitos</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 mt-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-white/5 dark:hover:bg-slate-800/50"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Sign Out */}
      <div className="p-4 border-t border-slate-800/80">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
