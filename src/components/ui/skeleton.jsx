import React from "react";

/**
 * Componente base de Skeleton Loading com suporte a Tailwind v4 e tema claro/escuro.
 */
export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`}
      {...props}
    />
  );
}

/**
 * Skeleton para tabelas de listagem (ex: Requisitos, Histórias).
 */
export function SkeletonTable({ rows = 5, columns = 6, className = "" }) {
  const colWidths = [
    "w-16",
    "w-48",
    "w-20",
    "w-24",
    "w-28",
    "w-32",
    "w-20",
    "w-16",
  ];

  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-2xs ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-[#0a0f1d]/60">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="py-3.5 px-6">
                  <Skeleton className={`h-4 ${colWidths[i % colWidths.length]}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {Array.from({ length: rows }).map((_, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                {Array.from({ length: columns }).map((_, cIdx) => (
                  <td key={cIdx} className="py-4 px-6">
                    <Skeleton
                      className={`h-4 ${
                        cIdx === 0
                          ? "w-14"
                          : cIdx === 1
                          ? "w-64"
                          : colWidths[(cIdx + rIdx) % colWidths.length]
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Skeleton para linhas avulsas dentro de um tbody já existente.
 */
export function SkeletonTableRows({ rows = 5, columns = 6 }) {
  const colWidths = [
    "w-16",
    "w-48",
    "w-20",
    "w-24",
    "w-28",
    "w-32",
    "w-20",
    "w-16",
  ];

  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="border-b border-slate-100 dark:border-slate-800/60">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={cIdx} className="py-4 px-6">
              <Skeleton
                className={`h-4 ${
                  cIdx === 0
                    ? "w-14"
                    : cIdx === 1
                    ? "w-64"
                    : colWidths[(cIdx + rIdx) % colWidths.length]
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Skeleton para grades de cards (ex: KPIs do Dashboard, cards de User Stories).
 */
export function SkeletonCards({
  count = 4,
  columns = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  className = "",
}) {
  return (
    <div className={`grid gap-5 ${columns} ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-5 shadow-2xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para visualizações de Backlog / Kanban (Sprints com colunas e histórias).
 */
export function SkeletonKanban({
  columns = 2,
  cardsPerColumn = 3,
  className = "",
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-6 ${className}`}>
      {Array.from({ length: columns }).map((_, colIdx) => (
        <div
          key={colIdx}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-5 shadow-2xs space-y-4"
        >
          {/* Header da Coluna/Sprint */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {/* Cards da Sprint */}
          <div className="space-y-3">
            {Array.from({ length: cardsPerColumn }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
