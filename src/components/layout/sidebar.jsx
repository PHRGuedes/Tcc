"use client";

import { useState, useEffect } from "react";
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
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Globe,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  const isRequisitosActive = pathname.startsWith("/requisitos");
  const [isRequisitosOpen, setIsRequisitosOpen] = useState(isRequisitosActive);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Mantém aberto se a rota ativa for de requisitos
  useEffect(() => {
    if (isRequisitosActive) {
      setIsRequisitosOpen(true);
    }
    setIsMobileOpen(false);
  }, [isRequisitosActive, pathname]);

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutGrid, exact: true },
    {
      label: "Requisitos",
      icon: FileText,
      isCollapsible: true,
      subItems: [
        {
          label: "Requisitos do Projeto",
          href: "/requisitos",
          icon: FolderKanban,
          exact: true,
        },
        {
          label: "Biblioteca Global",
          href: "/requisitos/globais",
          icon: Globe,
          exact: true,
        },
      ],
    },
    { label: "User Stories", href: "/user-stories", icon: BookOpen },
    { label: "Backlog", href: "/backlog", icon: Layers },
    { label: "Rastreabilidade", href: "/rastreabilidade", icon: Network },
    { label: "Relatórios", href: "/relatorios", icon: BarChart2 },
  ];

  return (
    <>
      {/* Botão Flutuante Mobile / Tablet (RNF.07) */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed bottom-5 right-5 z-50 w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-xl flex items-center justify-center hover:bg-blue-700 transition-all cursor-pointer"
        aria-label="Abrir menu de navegação"
        title="Menu de Navegação"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Backdrop Mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 animate-in fade-in"
        />
      )}

      <aside
        className={cn(
          "w-64 bg-[#112240] dark:bg-[#090f1d] text-slate-300 flex flex-col justify-between h-screen shrink-0 select-none border-r border-slate-800/80 transition-transform duration-200 z-50",
          "fixed inset-y-0 left-0 lg:sticky lg:top-0 lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
      {/* Top Section: Brand */}
      <div>
        <div className="flex items-center justify-between px-6 py-6 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/40">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg tracking-tight leading-none">ReqFlow</h1>
              <span className="text-xs text-blue-300/80 font-medium">Eng. de Requisitos</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 mt-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            // Se for item colapsável (Requisitos)
            if (item.isCollapsible) {
              const isAnySubActive = item.subItems.some((sub) =>
                sub.exact ? pathname === sub.href : pathname.startsWith(sub.href)
              );

              return (
                <div key={item.label} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setIsRequisitosOpen((prev) => !prev)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer",
                      isAnySubActive && !isRequisitosOpen
                        ? "bg-blue-600/20 text-blue-400 font-semibold"
                        : "text-slate-300 hover:text-white hover:bg-white/5 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("w-5 h-5", isAnySubActive ? "text-blue-400" : "text-slate-400")} />
                      <span>{item.label}</span>
                    </div>
                    {isRequisitosOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {/* Subitems do Accordion */}
                  {isRequisitosOpen && (
                    <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-slate-700/60 ml-5 my-0.5 animate-in fade-in duration-200">
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = sub.exact
                          ? pathname === sub.href
                          : pathname.startsWith(sub.href);

                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
                              isSubActive
                                ? "bg-blue-600 text-white font-semibold shadow-xs"
                                : "text-slate-400 hover:text-white hover:bg-white/5 dark:hover:bg-slate-800/50"
                            )}
                          >
                            <SubIcon className={cn("w-4 h-4", isSubActive ? "text-white" : "text-slate-400")} />
                            <span>{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Item padrão do menu
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
    </>
  );
}
