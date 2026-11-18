"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  Bookmark,
  Layers,
  BarChart3,
  Globe,
  Kanban,
  Sparkles,
  Sun,
  Moon,
  ArrowRight,
  X,
  FileCheck,
} from "lucide-react";
import { useProject } from "@/components/layout/project-context";
import { useTheme } from "@/components/layout/theme-provider";
import { createClient } from "@/lib/supabase/client";

export function CommandPalette({ isOpen, onClose, onSeedDemo }) {
  const router = useRouter();
  const { activeProject } = useProject();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [requirements, setRequirements] = useState([]);
  const [userStories, setUserStories] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Carregar itens do projeto ativo para pesquisa
  useEffect(() => {
    if (!activeProject?.id || !isOpen) return;

    const supabase = createClient();
    let isMounted = true;

    async function loadData() {
      try {
        const [reqsRes, usRes] = await Promise.all([
          supabase
            .from("requirements")
            .select("id, code, title, type, status")
            .eq("project_id", activeProject.id)
            .order("code", { ascending: true })
            .limit(30),
          supabase
            .from("user_stories")
            .select("id, code, title, status")
            .eq("project_id", activeProject.id)
            .order("code", { ascending: true })
            .limit(30),
        ]);

        if (isMounted) {
          setRequirements(reqsRes?.data || []);
          setUserStories(usRes?.data || []);
        }
      } catch (err) {
        console.warn("Erro ao buscar dados para command palette:", err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [activeProject?.id, isOpen]);

  // Foco no input ao abrir
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Lista de páginas
  const navigationPages = useMemo(
    () => [
      {
        id: "nav-dashboard",
        title: "Dashboard",
        description: "Visão geral, KPIs e feed de atividades",
        category: "Navegação",
        icon: BarChart3,
        action: () => router.push("/"),
      },
      {
        id: "nav-requisitos",
        title: "Requisitos do Projeto",
        description: "Lista, CRUD, filtros e controle de status",
        category: "Navegação",
        icon: FileText,
        action: () => router.push("/requisitos"),
      },
      {
        id: "nav-user-stories",
        title: "Histórias de Usuário (User Stories)",
        description: "Critérios de aceitação e vinculação",
        category: "Navegação",
        icon: Bookmark,
        action: () => router.push("/user-stories"),
      },
      {
        id: "nav-backlog",
        title: "Backlog & Sprints",
        description: "Quadro Scrum, gestão de sprints e cards",
        category: "Navegação",
        icon: Kanban,
        action: () => router.push("/backlog"),
      },
      {
        id: "nav-rastreabilidade",
        title: "Matriz de Rastreabilidade",
        description: "Cruzamento entre requisitos, histórias e stakeholders",
        category: "Navegação",
        icon: Layers,
        action: () => router.push("/rastreabilidade"),
      },
      {
        id: "nav-relatorios",
        title: "Relatórios & Documento SRS (IEEE 830)",
        description: "Exportação em PDF, CSV e especificações",
        category: "Navegação",
        icon: FileCheck,
        action: () => router.push("/relatorios"),
      },
      {
        id: "nav-globais",
        title: "Biblioteca de Requisitos Globais",
        description: "Requisitos reutilizáveis entre múltiplos projetos",
        category: "Navegação",
        icon: Globe,
        action: () => router.push("/requisitos/globais"),
      },
    ],
    [router]
  );

  // Ações do sistema
  const quickActions = useMemo(
    () => [
      {
        id: "act-seed",
        title: "Popular Projeto com Dados de Demonstração (Banca)",
        description: "Insere 8 requisitos, 4 histórias e Sprint 1 de exemplo",
        category: "Ações Rápidas",
        icon: Sparkles,
        badge: "Demo",
        action: () => {
          if (onSeedDemo) onSeedDemo();
        },
      },
      {
        id: "act-theme",
        title: `Alternar para Tema ${theme === "dark" ? "Claro" : "Escuro"}`,
        description: "Mudar contraste visual da interface",
        category: "Ações Rápidas",
        icon: theme === "dark" ? Sun : Moon,
        action: () => toggleTheme(),
      },
      {
        id: "act-pdf",
        title: "Ir para Exportação de Relatório PDF",
        description: "Abrir página de relatórios diagramados",
        category: "Ações Rápidas",
        icon: FileCheck,
        action: () => router.push("/relatorios"),
      },
    ],
    [theme, toggleTheme, onSeedDemo, router]
  );

  // Filtragem dos resultados com base na busca
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Filtrar páginas
    const pages = navigationPages.filter(
      (p) =>
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );

    // 2. Filtrar ações rápidas
    const actions = quickActions.filter(
      (a) =>
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );

    // 3. Filtrar requisitos
    const reqs = requirements
      .filter(
        (r) =>
          !q ||
          r.code.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q)
      )
      .slice(0, 8)
      .map((r) => ({
        id: `req-${r.id}`,
        title: `${r.code} - ${r.title}`,
        description: `Tipo: ${r.type} • Status: ${r.status}`,
        category: "Requisitos do Projeto",
        icon: FileText,
        action: () => router.push("/requisitos"),
      }));

    // 4. Filtrar histórias de usuário
    const stories = userStories
      .filter(
        (s) =>
          !q ||
          s.code.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q)
      )
      .slice(0, 6)
      .map((s) => ({
        id: `story-${s.id}`,
        title: `${s.code} - ${s.title}`,
        description: `Status: ${s.status}`,
        category: "Histórias de Usuário",
        icon: Bookmark,
        action: () => router.push("/user-stories"),
      }));

    return [...actions, ...pages, ...reqs, ...stories];
  }, [query, navigationPages, quickActions, requirements, userStories, router]);

  // Tratar teclas de navegação
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredResults.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredResults.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredResults[selectedIndex];
        if (selected) {
          selected.action();
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [isOpen, filteredResults, selectedIndex, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Rolar para manter item visível
  useEffect(() => {
    if (listRef.current) {
      const activeElement = listRef.current.children[selectedIndex];
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Palette Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[75vh]"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={`Buscar em "${activeProject?.name || "ReqFlow"}" (Requisitos, Histórias, Páginas)...`}
            className="w-full bg-transparent border-0 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/50"
        >
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Nenhum resultado encontrado para &quot;{query}&quot;.
            </div>
          ) : (
            filteredResults.map((item, index) => {
              const IconComp = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 block truncate">
                        {item.description}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                      {item.category}
                    </span>
                    <ArrowRight
                      className={`w-3.5 h-3.5 transition-opacity ${
                        isSelected ? "opacity-100 text-blue-600 dark:text-blue-400" : "opacity-0"
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">
                ↑
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">
                ↓
              </kbd>{" "}
              navegar
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">
                ↵
              </kbd>{" "}
              selecionar
            </span>
          </div>
          <span>ReqFlow • Busca Global</span>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : null;
}
