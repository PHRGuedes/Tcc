"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { AlertCircle, X, ShieldAlert } from "lucide-react";
import { useProject } from "@/components/layout/project-context";
import { useAuth } from "@/hooks/use-auth";
import { getUserProjectPermissionsAction } from "@/app/actions/projects";
import { ROLE_LABELS } from "@/lib/constants/roles";

const PermissionsContext = createContext({
  permissions: {},
  role: null,
  isOwner: false,
  isLoading: true,
  hasPermission: () => true,
  guardAction: (permissionId, callback) => callback && callback(),
  refreshPermissions: () => {},
});

export function PermissionsProvider({ children }) {
  const { user } = useAuth();
  const { activeProject } = useProject();

  const [permissions, setPermissions] = useState({});
  const [role, setRole] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Estado para toast/notificação de ação bloqueada
  const [toast, setToast] = useState(null);

  const fetchPermissions = useCallback(async () => {
    if (!activeProject?.id || !user?.id) {
      setPermissions({});
      setRole(null);
      setIsOwner(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await getUserProjectPermissionsAction(activeProject.id);
      if (res.success) {
        setPermissions(res.permissions || {});
        setRole(res.role || "developer");
        setIsOwner(Boolean(res.isOwner));
      } else {
        setPermissions({});
      }
    } catch (err) {
      console.warn("Aviso ao carregar permissões do projeto:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProject?.id, user?.id]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Função para verificar se possui uma permissão específica
  const hasPermission = useCallback(
    (permissionId) => {
      if (isOwner || role === "admin") return true;
      return Boolean(permissions[permissionId]);
    },
    [isOwner, role, permissions]
  );

  // Disparar toast de notificação de bloqueio
  const showBlockedNotification = useCallback(
    (actionLabel) => {
      const currentRoleLabel = ROLE_LABELS[role] || role || "Membro";
      const message = actionLabel
        ? `Seu perfil atual (${currentRoleLabel}) não possui permissão para ${actionLabel} neste projeto.`
        : `Seu perfil atual (${currentRoleLabel}) não possui permissão para esta ação neste projeto.`;

      setToast({
        title: "Ação Restrita por Permissão",
        message,
        id: Date.now(),
      });

      // Auto fechar após 4.5 segundos
      setTimeout(() => {
        setToast((prev) => (prev?.id === prev?.id ? null : prev));
      }, 4500);
    },
    [role]
  );

  // Executa callback se tiver permissão, ou notifica o usuário se bloqueado
  const guardAction = useCallback(
    (permissionId, callback, actionLabel) => {
      if (hasPermission(permissionId)) {
        if (typeof callback === "function") callback();
        return true;
      } else {
        showBlockedNotification(actionLabel);
        return false;
      }
    },
    [hasPermission, showBlockedNotification]
  );

  const value = useMemo(
    () => ({
      permissions,
      role,
      isOwner,
      isLoading,
      hasPermission,
      guardAction,
      refreshPermissions: fetchPermissions,
    }),
    [permissions, role, isOwner, isLoading, hasPermission, guardAction, fetchPermissions]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}

      {/* Toast Notification Flutuante para Ações Bloqueadas */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-md w-full animate-in slide-in-from-bottom-3 fade-in duration-200">
          <div className="bg-white dark:bg-[#0f172a] border border-amber-300 dark:border-amber-800/80 rounded-2xl p-4 shadow-2xl flex items-start gap-3.5 text-slate-800 dark:text-slate-100 ring-1 ring-amber-400/20">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800/50 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <h5 className="text-xs font-bold text-amber-800 dark:text-amber-300">
                {toast.title}
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                {toast.message}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Solicite alteração das permissões na aba <em>Funções & Permissões</em> ao Administrador do projeto.
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions deve ser utilizado dentro de um PermissionsProvider");
  }
  return context;
}

