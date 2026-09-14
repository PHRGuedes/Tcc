"use client";

import { useState } from "react";
import { Bell, ChevronDown, FolderKanban, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/components/layout/project-context";
import { getInitials } from "@/lib/utils/formatters";
import { ROLE_LABELS } from "@/lib/constants/roles";

export function Topbar({ title = "Dashboard" }) {
  const { profile } = useAuth();
  const { activeProject, projects, setActiveProject } = useProject();
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const userInitials = getInitials(profile?.full_name || "Ana Ribeiro");
  const roleLabel = ROLE_LABELS[profile?.role] || profile?.role || "Analista de Requisitos";

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const newProj = {
      id: crypto.randomUUID(),
      name: newProjectName.trim(),
      description: "Novo projeto adicionado",
    };
    setActiveProject(newProj);
    projects.push(newProj);
    setNewProjectName("");
    setShowNewProjectModal(false);
    setShowProjectMenu(false);
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Title and Active Project Context */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">
          {title}
        </h2>
        <div className="relative inline-block mt-0.5">
          <button
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium py-0.5"
          >
            <span>Projeto: <strong className="text-slate-700 font-semibold">{activeProject?.name || "Sistema de Gestão Acadêmica"}</strong></span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Project Switcher Dropdown */}
          {showProjectMenu && (
            <div className="absolute left-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
                      activeProject?.id === proj.id
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <FolderKanban className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{proj.name}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100 mt-2 pt-2">
                <button
                  onClick={() => {
                    setShowNewProjectModal(true);
                    setShowProjectMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Novo Projeto</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Notifications & User Profile */}
      <div className="flex items-center gap-5">
        {/* Notifications Icon with dot */}
        <button
          title="Notificações"
          className="relative p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
        </button>

        {/* User Card */}
        <div className="flex items-center gap-3 pl-2">
          <div className="w-10 h-10 rounded-full bg-[#13233f] text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
            {userInitials}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold text-slate-800 leading-tight">
              {profile?.full_name || "Ana Ribeiro"}
            </span>
            <span className="text-xs text-slate-500 font-normal">
              {roleLabel}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Modal Criar Novo Projeto */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Cadastrar Novo Projeto</h3>
            <p className="text-xs text-slate-500 mb-4">
              Crie um novo projeto para organizar e vincular seus requisitos e sprints.
            </p>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Projeto
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Plataforma E-commerce B2B"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                >
                  Criar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
