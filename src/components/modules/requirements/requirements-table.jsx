"use client";

import { useState, useMemo } from "react";
import { Search, Eye, Pencil, Trash2, AlertTriangle, Layers, Globe } from "lucide-react";
import { TypeBadge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  REQUIREMENT_STATUSES,
  REQUIREMENT_STATUS_LABELS,
  REQUIREMENT_TYPES,
} from "@/lib/constants/statuses";

export function RequirementsTable({
  scope = "project",
  requirements = [],
  loading = false,
  onSelectRequirement,
  onDeleteRequirement,
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Filtragem dinâmica
  const filteredRequirements = useMemo(() => {
    return requirements.filter((req) => {
      // 1. Busca por ID, título ou descrição
      const query = search.toLowerCase().trim();
      const matchSearch =
        !query ||
        req.code?.toLowerCase().includes(query) ||
        req.title?.toLowerCase().includes(query) ||
        req.description?.toLowerCase().includes(query);

      // 2. Filtro de Tipo (RF / RNF)
      const matchType = filterType === "all" || req.type === filterType;

      // 3. Filtro de Prioridade
      const matchPriority = filterPriority === "all" || req.priority === filterPriority;

      // 4. Filtro de Status (apenas no modo 'project')
      const matchStatus =
        scope === "global" || filterStatus === "all" || req.status === filterStatus;

      return matchSearch && matchType && matchPriority && matchStatus;
    });
  }, [requirements, search, filterType, filterPriority, filterStatus, scope]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por ID, título ou descrição do requisito..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Tipo */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Tipo
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Todos os tipos</option>
              <option value={REQUIREMENT_TYPES.RF}>RF — Funcional</option>
              <option value={REQUIREMENT_TYPES.RNF}>RNF — Não-Funcional</option>
            </select>
          </div>

          {/* Prioridade */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Prioridade
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Todas as prioridades</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Status (Apenas no escopo de Projeto) */}
          {scope === "project" ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Todos os status</option>
                {Object.entries(REQUIREMENT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Escopo
              </label>
              <div className="px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/30 text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Biblioteca Global Pessoal</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Requirements Table Card */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6 w-28">ID</th>
                <th className="py-4 px-6">Descrição</th>
                <th className="py-4 px-6 w-24">Tipo</th>
                <th className="py-4 px-6 w-32">Prioridade</th>
                {scope === "project" && <th className="py-4 px-6 w-36">Status</th>}
                <th className="py-4 px-6 w-44">
                  {scope === "project" ? "Responsável" : "Origem"}
                </th>
                <th className="py-4 px-6 text-right w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td
                    colSpan={scope === "project" ? 7 : 6}
                    className="py-12 text-center text-slate-400 dark:text-slate-500"
                  >
                    Carregando requisitos...
                  </td>
                </tr>
              ) : filteredRequirements.length === 0 ? (
                <tr>
                  <td
                    colSpan={scope === "project" ? 7 : 6}
                    className="py-12 text-center text-slate-400 dark:text-slate-500"
                  >
                    {scope === "global"
                      ? "Nenhum requisito global cadastrado na sua biblioteca pessoal."
                      : "Nenhum requisito encontrado para os filtros selecionados."}
                  </td>
                </tr>
              ) : (
                filteredRequirements.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Código */}
                    <td className="py-4 px-6 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {req.code}
                    </td>

                    {/* Descrição & Alerta de Incompletude */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {req.is_incomplete && (
                          <span
                            title="Requisito incompleto: faltam critérios de aceitação, fonte ou justificativa."
                            className="text-amber-500 shrink-0"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </span>
                        )}
                        <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                          {req.title || req.description}
                        </span>
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="py-4 px-6">
                      <TypeBadge type={req.type} />
                    </td>

                    {/* Prioridade */}
                    <td className="py-4 px-6">
                      <PriorityBadge priority={req.priority} />
                    </td>

                    {/* Status (se projeto) */}
                    {scope === "project" && (
                      <td className="py-4 px-6">
                        <StatusBadge status={req.status || "proposed"} />
                      </td>
                    )}

                    {/* Responsável / Origem */}
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[160px]">
                      {scope === "project"
                        ? req.responsible_name || "Não atribuído"
                        : req.source || "Biblioteca Pessoal"}
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => onSelectRequirement(req)}
                          title="Visualizar / Editar requisito"
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteRequirement && (
                          <button
                            type="button"
                            onClick={() => onDeleteRequirement(req)}
                            title="Excluir requisito"
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
