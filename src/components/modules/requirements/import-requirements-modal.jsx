"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  Globe,
  FolderGit2,
  Search,
  Check,
  CheckSquare,
  Square,
  Loader2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { TypeBadge, PriorityBadge } from "@/components/ui/badge";
import {
  getAvailableRequirementsForImportAction,
  importRequirementToProjectAction,
} from "@/app/actions/requirements";

export function ImportRequirementsModal({
  isOpen,
  onClose,
  activeProject,
  onImportSuccess,
}) {
  const [activeTab, setActiveTab] = useState("globals"); // 'globals' | 'projects'
  const [search, setSearch] = useState("");
  const [globals, setGlobals] = useState([]);
  const [otherProjects, setOtherProjects] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Carregar requisitos disponíveis para reutilização
  useEffect(() => {
    if (!isOpen || !activeProject?.id) return;
    setLoading(true);
    setErrorMsg("");
    setSelectedIds(new Set());

    async function loadImportables() {
      try {
        const res = await getAvailableRequirementsForImportAction(activeProject.id);
        if (res.success) {
          setGlobals(res.globals || []);
          setOtherProjects(res.otherProjects || []);
        } else {
          setErrorMsg(res.error || "Erro ao carregar lista de importação.");
        }
      } catch (err) {
        console.error("Erro ao carregar dados para importação:", err);
        setErrorMsg("Erro inesperado ao consultar requisitos disponíveis.");
      } finally {
        setLoading(false);
      }
    }

    loadImportables();
  }, [isOpen, activeProject?.id]);

  // Lista da aba atual
  const currentList = activeTab === "globals" ? globals : otherProjects;

  // Filtragem por busca
  const filteredList = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return currentList;
    return currentList.filter(
      (r) =>
        r.code?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.project_name?.toLowerCase().includes(q)
    );
  }, [currentList, search]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredList.length && filteredList.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredList.map((r) => r.id)));
    }
  };

  const handleImport = async () => {
    if (selectedIds.size === 0 || !activeProject?.id) return;
    setIsImporting(true);
    setErrorMsg("");

    try {
      const res = await importRequirementToProjectAction({
        targetProjectId: activeProject.id,
        requirementIds: Array.from(selectedIds),
      });

      if (!res.success) {
        setErrorMsg(res.error || "Erro ao importar requisitos selecionados.");
        setIsImporting(false);
        return;
      }

      onImportSuccess?.(res.count, res.importedCodes);
      onClose();
    } catch (err) {
      console.error("Erro inesperado na importação:", err);
      setErrorMsg("Ocorreu um erro inesperado ao importar os requisitos.");
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center z-[110] p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Importar / Reutilizar Requisitos
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  RF.33 / RF.34
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Clona requisitos da sua biblioteca ou de outros projetos para{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeProject?.name || "o projeto atual"}
                </span>
                .
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs & Search Bar */}
        <div className="p-6 pb-3 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Abas */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("globals");
                setSearch("");
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "globals"
                  ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Meus Requisitos Globais</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                {globals.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("projects");
                setSearch("");
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "projects"
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <FolderGit2 className="w-4 h-4" />
              <span>De Outros Projetos</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                {otherProjects.length}
              </span>
            </button>
          </div>

          {/* Search Box & Selecionar Todos */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por código, título ou projeto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {filteredList.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                {selectedIds.size === filteredList.length ? (
                  <>
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                    <span>Desmarcar Todos</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 text-slate-400" />
                    <span>Selecionar Todos</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Content: List of Requirements */}
        <div className="p-6 overflow-y-auto flex-1 space-y-2">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              <span>Consultando requisitos disponíveis...</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                {activeTab === "globals" ? (
                  <Globe className="w-6 h-6" />
                ) : (
                  <FolderGit2 className="w-6 h-6" />
                )}
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {activeTab === "globals"
                  ? "Nenhum requisito na sua Biblioteca Global"
                  : "Nenhum requisito encontrado em outros projetos"}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                {activeTab === "globals"
                  ? "Cadastre requisitos globais pelo menu 'Biblioteca Global' para reutilizá-los aqui."
                  : "Requisitos de outros projetos em que você participa aparecerão aqui."}
              </p>
            </div>
          ) : (
            filteredList.map((req) => {
              const isSelected = selectedIds.has(req.id);
              return (
                <div
                  key={req.id}
                  onClick={() => toggleSelect(req.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
                    isSelected
                      ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 ring-1 ring-blue-500/20"
                      : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                          {req.code}
                        </span>
                        {req.project_name && (
                          <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {req.project_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-1 mt-0.5">
                        {req.title || req.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <TypeBadge type={req.type} />
                    <PriorityBadge priority={req.priority} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {selectedIds.size}
            </span>{" "}
            requisito(s) selecionado(s)
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || selectedIds.size === 0}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Importar para o Projeto ({selectedIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modalContent, document.body) : null;
}

