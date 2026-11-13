"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  ChevronDown,
  FolderKanban,
  Plus,
  Loader2,
  Settings,
  Sun,
  Moon,
  User,
  LogOut,
  Check,
  X,
  Mail,
  UserMinus,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/components/layout/project-context";
import { useTheme } from "@/components/layout/theme-provider";
import { getInitials } from "@/lib/utils/formatters";
import { ROLE_LABELS } from "@/lib/constants/roles";
import { ManageProjectModal } from "@/components/modules/projects/manage-project-modal";
import { EditProfileModal } from "@/components/modules/profile/edit-profile-modal";
import { createClient } from "@/lib/supabase/client";
import {
  getUserProjectInvitationsAction,
  respondProjectInvitationAction,
  leaveProjectAction,
} from "@/app/actions/projects";

export function Topbar({ title = "Dashboard" }) {
  const { profile, loading, signOut } = useAuth();
  const { activeProject, projects, setActiveProject, createProject, refreshProjects } = useProject();
  const { theme, toggleTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [projectActivities, setProjectActivities] = useState([]);
  const [actionNotificationId, setActionNotificationId] = useState(null);
  const [isLeavingProject, setIsLeavingProject] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [projectRole, setProjectRole] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isProjectCreator = Boolean(
    activeProject?.created_by && profile?.id && activeProject.created_by === profile.id
  );

  const isProjectAdmin = Boolean(
    isProjectCreator || projectRole === "admin"
  );

  // Carrega a função do usuário autenticado no projeto atual
  useEffect(() => {
    if (!activeProject?.id || !profile?.id) return;

    if (activeProject.created_by === profile.id) {
      setProjectRole("admin");
      return;
    }

    const supabase = createClient();
    supabase
      .from("project_members")
      .select("role_in_project")
      .eq("project_id", activeProject.id)
      .eq("user_id", profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.role_in_project) {
          setProjectRole(data.role_in_project);
        } else {
          setProjectRole(null);
        }
      });
  }, [activeProject?.id, activeProject?.created_by, profile?.id]);

  // Carrega e monitora convites pendentes e notificações recentes do projeto (RF.41)
  useEffect(() => {
    if (!profile?.id) return;
    let isMounted = true;

    const loadInvitesAndActivities = async () => {
      try {
        const res = await getUserProjectInvitationsAction();
        if (isMounted && res.success) {
          setNotifications(res.data || []);
        }

        if (activeProject?.id) {
          const supabase = createClient();
          const { data: logs } = await supabase
            .from("audit_logs")
            .select("id, action, entity_type, description, created_at, profiles(full_name)")
            .eq("project_id", activeProject.id)
            .order("created_at", { ascending: false })
            .limit(8);

          if (isMounted && logs) {
            setProjectActivities(logs);
          }
        }
      } catch (err) {
        console.warn("Aviso ao buscar notificações:", err);
      }
    };

    loadInvitesAndActivities();
    const interval = setInterval(loadInvitesAndActivities, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [profile?.id, activeProject?.id, showNotifications]);

  const userInitials = profile?.full_name ? getInitials(profile.full_name) : "--";
  const roleLabel = isProjectCreator
    ? "Criador • Administrador"
    : projectRole
    ? ROLE_LABELS[projectRole] || projectRole
    : profile?.role
    ? ROLE_LABELS[profile.role] || profile.role
    : loading
    ? "Carregando..."
    : "Membro";

  // Responder a convite (Aceitar ou Recusar)
  const handleRespondInvite = async (invitationId, accept) => {
    setActionNotificationId(invitationId);
    try {
      const res = await respondProjectInvitationAction({ invitationId, accept });
      if (res.success) {
        setNotifications((prev) => prev.filter((item) => item.id !== invitationId));
        if (accept) {
          await refreshProjects();
        }
      } else {
        alert(res.error || "Não foi possível responder ao convite.");
      }
    } catch (err) {
      console.error("Erro ao responder convite:", err);
    } finally {
      setActionNotificationId(null);
    }
  };

  // Sair voluntariamente do projeto atual
  const handleLeaveProject = async () => {
    if (!activeProject?.id || isProjectCreator) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja sair do projeto "${activeProject.name}"? Você deixará de ser membro e perderá o acesso.`
    );
    if (!confirmed) return;

    setIsLeavingProject(true);
    try {
      const res = await leaveProjectAction({ projectId: activeProject.id });
      if (!res.success) {
        alert(res.error || "Não foi possível sair do projeto.");
        return;
      }
      setShowProjectMenu(false);
      await refreshProjects();
    } catch (err) {
      console.error("Erro ao sair do projeto:", err);
      alert("Erro ao processar saída do projeto.");
    } finally {
      setIsLeavingProject(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsSubmitting(true);
    setCreateError("");

    try {
      await createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || "Novo projeto de requisitos",
      });

      setNewProjectName("");
      setNewProjectDesc("");
      setShowNewProjectModal(false);
      setShowProjectMenu(false);
    } catch (err) {
      console.error("Erro ao cadastrar projeto:", err);
      setCreateError(err.message || "Não foi possível cadastrar o projeto no banco de dados.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header className="h-20 bg-white/95 dark:bg-[#0c1427]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Title and Active Project Context */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          {title}
        </h2>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="relative inline-block">
            <button
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-medium py-0.5 cursor-pointer"
            >
              <span>
                Projeto:{" "}
                <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                  {activeProject?.name || "Sistema de Gestão Acadêmica"}
                </strong>
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </button>

            {/* Project Switcher Dropdown */}
            {showProjectMenu && (
              <div className="absolute left-0 mt-1.5 w-72 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Alternar Projeto
                </div>
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setActiveProject(proj);
                        setShowProjectMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                        activeProject?.id === proj.id
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-semibold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                      }`}
                    >
                      <FolderKanban className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">{proj.name}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 mt-2 pt-2 space-y-1">
                  {isProjectAdmin && (
                    <button
                      onClick={() => {
                        setShowManageModal(true);
                        setShowProjectMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span>Gerenciar Projeto Atual</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowNewProjectModal(true);
                      setShowProjectMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Novo Projeto</span>
                  </button>
                  {!isProjectCreator && (
                    <button
                      onClick={handleLeaveProject}
                      disabled={isLeavingProject}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title="Sair deste projeto"
                    >
                      {isLeavingProject ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4 text-rose-500" />
                      )}
                      <span>Sair deste Projeto</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botão de Acesso Rápido para Gerenciar Projeto (Apenas Administradores) */}
          {isProjectAdmin && (
            <button
              onClick={() => setShowManageModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800/80 dark:hover:bg-blue-950/40 border border-slate-200 hover:border-blue-200 dark:border-slate-700 dark:hover:border-blue-800 rounded-lg transition-all shadow-2xs cursor-pointer"
              title="Gerenciar Projeto (alterar nome, descrição e stakeholders)"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Gerenciar</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Controls: Theme Toggle, Notifications & User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Dark Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-600 dark:text-amber-400 shadow-2xs transition-all cursor-pointer"
          aria-label="Alternar tema"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 transition-transform duration-200 rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 hover:text-blue-600 transition-transform duration-200" />
          )}
        </button>

        {/* Notificações e Convites de Projeto */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProjectMenu(false);
              setShowUserMenu(false);
            }}
            title="Convites e Notificações"
            className="relative p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#0c1427] animate-pulse">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Popover / Dropdown de Notificações */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-0 z-50 animate-in fade-in slide-in-from-top-1 text-slate-900 dark:text-slate-100 overflow-hidden">
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Notificações & Convites
                </span>
                {notifications.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {notifications.length} {notifications.length === 1 ? "pendente" : "pendentes"}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">Em dia</span>
                )}
              </div>

              {notifications.length === 0 && projectActivities.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
                  <Mail className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                  <span>Você não possui convites ou alertas recentes neste projeto.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                  {notifications.map((invite) => {
                    const isActing = actionNotificationId === invite.id;
                    const roleLabelInvited =
                      ROLE_LABELS[invite.role_in_project] || invite.role_in_project;
                    return (
                      <div
                        key={invite.id}
                        className="p-3.5 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-100/70 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200 dark:border-blue-900/50">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                              Convite para o Projeto:{" "}
                              <span className="text-blue-600 dark:text-blue-400">
                                {invite.projects?.name || "Projeto"}
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                              {invite.inviter?.full_name
                                ? `${invite.inviter.full_name} convidou você`
                                : "Você foi convidado"}{" "}
                              para atuar como{" "}
                              <strong className="text-slate-800 dark:text-slate-200">
                                {roleLabelInvited}
                              </strong>
                              .
                            </p>

                            {/* Botões Aceitar e Recusar */}
                            <div className="flex items-center gap-2 mt-3">
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleRespondInvite(invite.id, true)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {isActing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Aceitar Convite</span>
                              </button>
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleRespondInvite(invite.id, false)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Recusar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Atividades & Alertas Recentes do Projeto Ativo (RF.41) */}
                  {projectActivities.length > 0 && (
                    <>
                      <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Alertas Recentes do Projeto ({activeProject?.name || "Projeto"})
                      </div>
                      {projectActivities.map((act) => (
                        <div
                          key={act.id}
                          className="p-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex items-start gap-2.5"
                        >
                          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {getInitials(act.profiles?.full_name || "Sistema")}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                              <strong className="text-slate-900 dark:text-white font-semibold">
                                {act.profiles?.full_name || "Membro"}
                              </strong>{" "}
                              {act.description}
                            </p>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                              {new Date(act.created_at).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* User Card & Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 sm:gap-3 pl-1 py-1 pr-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all cursor-pointer select-none group border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60"
            title="Menu do Usuário (Clique para editar perfil ou sair)"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || "Avatar"}
                className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#112240] dark:bg-blue-600 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm shrink-0">
                {userInitials}
              </div>
            )}
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {profile?.full_name || (loading ? "Carregando..." : "Não autenticado")}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                {roleLabel}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 hidden md:block group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 text-slate-900 dark:text-slate-100">
              {/* Profile Overview Header */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 mb-2">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || "Avatar"}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[#112240] dark:bg-blue-600 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-2xs shrink-0">
                    {userInitials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {profile?.full_name || "Usuário"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {profile?.email || ""}
                  </p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                    {roleLabel}
                  </span>
                </div>
              </div>

              {/* Menu Actions */}
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setShowProfileModal(true);
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Editar Meu Perfil</span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Modal Criar Novo Projeto (Renderizado fora do header para não ser afetado por backdrop-filter) */}
    {showNewProjectModal &&
      (mounted && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center z-[100] p-4 overflow-y-auto">
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-8">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  Cadastrar Novo Projeto
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Crie um novo projeto para organizar e vincular seus requisitos e sprints.
                </p>

                {createError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium">
                    {createError}
                  </div>
                )}

                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nome do Projeto <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isSubmitting}
                      placeholder="Ex: Plataforma E-commerce B2B"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131c31] text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Descrição do Projeto
                    </label>
                    <textarea
                      rows={3}
                      disabled={isSubmitting}
                      placeholder="Descreva o objetivo ou escopo geral deste projeto..."
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131c31] text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-70"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setShowNewProjectModal(false);
                        setCreateError("");
                      }}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <span>Criar Projeto</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null)}

    {/* Modal Gerenciar Projeto */}
    <ManageProjectModal
      key={activeProject?.id || "manage-modal"}
      isOpen={showManageModal}
      onClose={() => setShowManageModal(false)}
    />

    {/* Modal Editar Perfil do Usuário */}
    <EditProfileModal
      isOpen={showProfileModal}
      onClose={() => setShowProfileModal(false)}
    />
  </>
  );
}
