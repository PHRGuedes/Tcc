"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Componente reutilizável de Paginação com seletor de tamanho, números de página
 * e indicadores "Mostrando X–Y de Z".
 *
 * @param {number} currentPage - Página atual (1-based, padrão: 1)
 * @param {number} pageSize - Quantidade de itens por página (padrão: 20)
 * @param {number} totalCount - Total de registros retornados pelo count exato do Supabase
 * @param {function} onPageChange - Callback chamado ao trocar de página
 * @param {function} onPageSizeChange - Callback chamado ao trocar o tamanho da página
 * @param {number[]} pageSizeOptions - Opções de tamanho (padrão: [10, 20, 50])
 * @param {string} itemLabel - Rótulo da entidade (padrão: "registros")
 * @param {string} className - Classes CSS adicionais
 */
export function Pagination({
  currentPage = 1,
  pageSize = 20,
  totalCount = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = "registros",
  className = "",
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const from = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalCount);

  // Geração de números de página com elipses inteligentes
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (safePage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages];
  }, [safePage, totalPages]);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs ${className}`}
    >
      {/* Informações de Contagem e Seletor de Tamanho */}
      <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
        <div>
          Mostrando{" "}
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {from}–{to}
          </span>{" "}
          de{" "}
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {totalCount}
          </span>{" "}
          {itemLabel}
        </div>

        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-700/80">
          <label
            htmlFor="pagination-page-size"
            className="text-[11px] font-medium text-slate-500 dark:text-slate-400"
          >
            Exibir
          </label>
          <select
            id="pagination-page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            por pág.
          </span>
        </div>
      </div>

      {/* Controles de Navegação */}
      <div className="flex items-center gap-1">
        {/* Botão Anterior */}
        <button
          type="button"
          onClick={() => onPageChange?.(safePage - 1)}
          disabled={safePage <= 1}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Página Anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs font-semibold">Anterior</span>
        </button>

        {/* Números das Páginas */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 py-1 text-slate-400 dark:text-slate-500 select-none text-xs"
                >
                  ...
                </span>
              );
            }

            const isCurrent = p === safePage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange?.(p)}
                className={`min-w-8 h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Botão Próxima */}
        <button
          type="button"
          onClick={() => onPageChange?.(safePage + 1)}
          disabled={safePage >= totalPages}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Próxima Página"
        >
          <span className="hidden sm:inline text-xs font-semibold">Próxima</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
