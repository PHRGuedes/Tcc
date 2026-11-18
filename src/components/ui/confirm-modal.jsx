"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, AlertCircle, Info, Loader2, X } from "lucide-react";

/**
 * Modal de Confirmação Customizado com suporte a tema claro/escuro,
 * acessibilidade por teclado (Esc/Enter) e estado de carregamento.
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar Ação",
  description = "Tem certeza que deseja prosseguir?",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger", // 'danger' | 'warning' | 'primary'
  isLoading = false,
}) {
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen || isLoading) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [isOpen, isLoading, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: AlertTriangle,
      iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900",
      button: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/30",
    },
    warning: {
      icon: AlertCircle,
      iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900",
      button: "bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/30",
    },
    primary: {
      icon: Info,
      iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900",
      button: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/30",
    },
  }[variant] || {
    icon: AlertTriangle,
    iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900",
    button: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/30",
  };

  const IconComponent = variantStyles.icon;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150"
      >
        <button
          type="button"
          disabled={isLoading}
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${variantStyles.iconBg}`}>
            <IconComponent className="w-6 h-6" />
          </div>
          <div className="flex-1 pr-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${variantStyles.button}`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}
