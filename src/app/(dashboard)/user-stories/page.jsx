"use client";

import { useState, useEffect } from "react";
import { Plus, Search, BookOpen, Layers, User, Tag } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { PriorityBadge } from "@/components/ui/badge";
import { useProject } from "@/components/layout/project-context";
import { createClient } from "@/lib/supabase/client";

export default function UserStoriesPage() {
  const { activeProject } = useProject();
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [stories, setStories] = useState([
    {
      id: "us-01",
      code: "US-01",
      title: "Autenticação de usuários",
      as_a: "usuário cadastrado",
      i_want: "realizar login com meu e-mail e senha de forma segura",
      so_that: "eu possa acessar o painel de requisitos e meus projetos",
      priority: "high",
      status: "done",
      rf_codes: ["REQ-001"],
    },
    {
      id: "us-02",
      code: "US-02",
      title: "Painel de indicadores",
      as_a: "analista de requisitos",
      i_want: "visualizar gráficos de status e métricas de completude",
      so_that: "eu possa monitorar a saúde do projeto em tempo hábil",
      priority: "high",
      status: "in_progress",
      rf_codes: ["REQ-002"],
    },
    {
      id: "us-03",
      code: "US-03",
      title: "Gestão de requisitos (CRUD)",
      as_a: "analista de requisitos",
      i_want: "cadastrar, editar e categorizar RFs e RNFs",
      so_that: "a especificação do software fique documentada e organizada",
      priority: "high",
      status: "in_progress",
      rf_codes: ["REQ-004"],
    },
    {
      id: "us-04",
      code: "US-04",
      title: "Histórico de versões",
      as_a: "desenvolvedor ou auditor",
      i_want: "consultar alterações anteriores de um requisito com justificativa",
      so_that: "eu entenda o porquê de cada modificação ao longo do tempo",
      priority: "medium",
      status: "todo",
      rf_codes: ["REQ-005"],
    },
    {
      id: "us-05",
      code: "US-05",
      title: "Matriz de rastreabilidade",
      as_a: "gerente de projeto",
      i_want: "cruzar requisitos com user stories e partes interessadas",
      so_that: "nenhum requisito seja esquecido ou fique sem implementação",
      priority: "high",
      status: "todo",
      rf_codes: ["REQ-007"],
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [newStory, setNewStory] = useState({
    code: `US-0${stories.length + 1}`,
    title: "",
    as_a: "",
    i_want: "",
    so_that: "",
    priority: "medium",
  });

  const handleCreateStory = (e) => {
    e.preventDefault();
    if (!newStory.title) return;
    setStories([
      {
        ...newStory,
        id: crypto.randomUUID(),
        status: "backlog",
        rf_codes: [],
      },
      ...stories,
    ]);
    setShowModal(false);
    setNewStory({
      code: `US-0${stories.length + 2}`,
      title: "",
      as_a: "",
      i_want: "",
      so_that: "",
      priority: "medium",
    });
  };

  const filteredStories = stories.filter(
    (s) =>
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.i_want.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Topbar title="User Stories" />

      <div className="p-8 max-w-7xl w-full mx-auto">
        {/* Header Controls */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, título ou ação..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova User Story</span>
          </button>
        </div>

        {/* List of User Stories */}
        <div className="space-y-4">
          {filteredStories.map((story) => (
            <div
              key={story.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                    {story.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{story.title}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <PriorityBadge priority={story.priority} />
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {story.status === "done"
                      ? "Concluído"
                      : story.status === "in_progress"
                      ? "Em Progresso"
                      : story.status === "todo"
                      ? "A Fazer"
                      : "Backlog"}
                  </span>
                </div>
              </div>

              {/* Persona Pattern (Como / Quero / Para) */}
              <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/60 mb-3 space-y-1.5 text-xs">
                <p className="text-slate-700">
                  <strong className="text-slate-900 font-semibold">Como</strong> {story.as_a},
                </p>
                <p className="text-slate-700">
                  <strong className="text-blue-700 font-semibold">Quero</strong> {story.i_want},
                </p>
                <p className="text-slate-700">
                  <strong className="text-emerald-700 font-semibold">Para</strong> {story.so_that}.
                </p>
              </div>

              {/* Linked RFs */}
              {story.rf_codes && story.rf_codes.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium">Requisitos vinculados:</span>
                  <div className="flex gap-1.5">
                    {story.rf_codes.map((code, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal Nova User Story */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Cadastrar User Story</h3>
            <p className="text-xs text-slate-500 mb-4">
              Preencha no formato padrão ágil: Como [perfil], quero [ação], para [benefício].
            </p>
            <form onSubmit={handleCreateStory} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    value={newStory.code}
                    onChange={(e) => setNewStory({ ...newStory, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={newStory.priority}
                    onChange={(e) => setNewStory({ ...newStory, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título da História
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Visualização de Notificações"
                  value={newStory.title}
                  onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Como (Perfil/Persona)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: usuário do sistema"
                  value={newStory.as_a}
                  onChange={(e) => setNewStory({ ...newStory, as_a: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quero (Ação desejada)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex: receber alertas quando um requisito for aprovado"
                  value={newStory.i_want}
                  onChange={(e) => setNewStory({ ...newStory, i_want: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Para (Benefício / Valor de Negócio)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex: não perder prazos de implementação"
                  value={newStory.so_that}
                  onChange={(e) => setNewStory({ ...newStory, so_that: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
                >
                  Salvar História
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
