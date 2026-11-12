"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, BookOpen, Layers, User, Tag } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { PriorityBadge } from "@/components/ui/badge";
import { useProject } from "@/components/layout/project-context";
import { createClient } from "@/lib/supabase/client";

export default function UserStoriesPage() {
  const { activeProject } = useProject();
  const supabase = useMemo(() => createClient(), []);

  const [search, setSearch] = useState("");
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [newStory, setNewStory] = useState({
    code: "US-01",
    title: "",
    as_a: "",
    i_want: "",
    so_that: "",
    priority: "medium",
  });

  const loadStories = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_stories")
        .select("*")
        .eq("project_id", activeProject.id)
        .order("code", { ascending: true });

      if (!error && data && data.length > 0) {
        setStories(data);
      } else if (activeProject.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
        setStories([
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
      } else {
        setStories([]);
      }
    } catch (err) {
      console.warn("Erro ao carregar histórias:", err);
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, supabase]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  useEffect(() => {
    setNewStory((prev) => ({
      ...prev,
      code: `US-0${stories.length + 1}`,
    }));
  }, [stories.length]);

  const handleCreateStory = async (e) => {
    e.preventDefault();
    if (!newStory.title || !activeProject?.id) return;

    try {
      const payload = {
        project_id: activeProject.id,
        code: newStory.code,
        title: newStory.title,
        as_a: newStory.as_a,
        i_want: newStory.i_want,
        so_that: newStory.so_that,
        priority: newStory.priority,
        status: "backlog",
      };

      const { data, error } = await supabase
        .from("user_stories")
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        setStories((prev) => [data, ...prev]);
      } else {
        setStories((prev) => [{ ...payload, id: crypto.randomUUID() }, ...prev]);
      }

      setShowModal(false);
      setNewStory({
        code: `US-0${stories.length + 2}`,
        title: "",
        as_a: "",
        i_want: "",
        so_that: "",
        priority: "medium",
      });
    } catch (err) {
      console.warn("Erro ao salvar história:", err);
      setShowModal(false);
    }
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

      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Header Controls */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, título ou ação da história..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
              className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 font-mono">
                    {story.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{story.title}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <PriorityBadge priority={story.priority} />
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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
              <div className="bg-slate-50/80 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 mb-3 space-y-1.5 text-xs">
                <p className="text-slate-700 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white font-semibold">Como</strong> {story.as_a},
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong className="text-blue-600 dark:text-blue-400 font-semibold">Quero</strong> {story.i_want},
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Para</strong> {story.so_that}.
                </p>
              </div>

              {/* Linked RFs */}
              {story.rf_codes && story.rf_codes.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span className="font-medium">Requisitos vinculados:</span>
                  <div className="flex gap-1.5">
                    {story.rf_codes.map((code, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] border border-slate-200 dark:border-slate-700 font-mono"
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
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Cadastrar User Story</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Preencha no formato padrão ágil: Como [perfil], quero [ação], para [benefício].
            </p>
            <form onSubmit={handleCreateStory} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Código
                  </label>
                  <input
                    type="text"
                    value={newStory.code}
                    onChange={(e) => setNewStory({ ...newStory, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-100 font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Prioridade
                  </label>
                  <select
                    value={newStory.priority}
                    onChange={(e) => setNewStory({ ...newStory, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Título da História
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Visualização de Notificações"
                  value={newStory.title}
                  onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Como (Perfil/Persona)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: usuário do sistema"
                  value={newStory.as_a}
                  onChange={(e) => setNewStory({ ...newStory, as_a: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Quero (Ação desejada)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex: receber alertas quando um requisito for aprovado"
                  value={newStory.i_want}
                  onChange={(e) => setNewStory({ ...newStory, i_want: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Para (Benefício / Valor de Negócio)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex: não perder prazos de implementação"
                  value={newStory.so_that}
                  onChange={(e) => setNewStory({ ...newStory, so_that: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
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
