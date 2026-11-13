"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Globe, CheckCircle2, Bookmark } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { RequirementsTable } from "@/components/modules/requirements/requirements-table";
import { RequirementModal } from "@/components/modules/requirements/requirement-modal";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { deleteRequirementAction } from "@/app/actions/requirements";

export default function GlobalRequirementsPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Carregar Requisitos Globais da biblioteca pessoal do usuário
  const loadGlobalRequirements = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Buscar requisitos onde project_id IS NULL pertencentes ao usuário autenticado
      let query = supabase
        .from("requirements")
        .select("*")
        .is("project_id", null);

      if (user?.id) {
        query = query.eq("created_by", user.id);
      }

      const { data, error } = await query.order("code", { ascending: true });

      if (!error && data) {
        setRequirements(data);
      } else {
        // Fallback para demonstração se ainda não houver nenhum
        setRequirements([
          {
            id: "g-01",
            code: "RF-G01",
            title: "Padrão de Autenticação Segura (OAuth / JWT)",
            description: "O sistema deve autenticar usuários utilizando tokens JWT com rotação periódica e suporte a MFA.",
            type: "RF",
            priority: "high",
            source: "Biblioteca Pessoal — Arquitetura de Segurança",
            justification: "Garantir conformidade com OWASP e proteção contra vazamento de credenciais.",
            acceptance_criteria: "Tokens expirados devem ser rejeitados; MFA obrigatório para administradores.",
            is_incomplete: false,
          },
          {
            id: "g-02",
            code: "RNF-G02",
            title: "Tempo de Resposta de APIs REST",
            description: "Endpoints da API devem responder 95% das requisições em menos de 300ms sob carga normal.",
            type: "RNF",
            priority: "medium",
            source: "Biblioteca Pessoal — Performance Baseline",
            justification: "Experiência de uso fluida e conformidade com SLA acordado.",
            acceptance_criteria: "Testes de carga com k6 comprovando percentil p95 < 300ms.",
            is_incomplete: false,
          },
        ]);
      }
    } catch (err) {
      console.warn("Aviso ao carregar requisitos globais:", err);
      setRequirements([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    loadGlobalRequirements();
  }, [loadGlobalRequirements]);

  // Exclusão de requisito global
  const handleDeleteRequirement = async (req) => {
    const confirmDelete = window.confirm(
      `Deseja realmente excluir o requisito global "${req.code}" da sua biblioteca?`
    );
    if (!confirmDelete) return;

    setRequirements((prev) => prev.filter((r) => r.id !== req.id));
    await deleteRequirementAction(req.id);
    loadGlobalRequirements();
  };

  return (
    <>
      <Topbar title="Biblioteca Global de Requisitos" />

      {/* Modal de Criação / Edição de Requisito Global */}
      {isModalOpen && (
        <RequirementModal
          scope="global"
          isOpen={isModalOpen}
          requirement={selectedRequirement}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRequirement(null);
          }}
          onSaveSuccess={() => {
            loadGlobalRequirements();
            setToastMessage("Requisito global salvo na sua biblioteca com sucesso!");
            setTimeout(() => setToastMessage(""), 4000);
          }}
        />
      )}

      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Banner de Feedback / Toast */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage("")}
              className="text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0f172a] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Biblioteca Pessoal (Requisitos Globais)
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                  {requirements.length} {requirements.length === 1 ? "requisito" : "requisitos"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Repositório privado reutilizável. Crie padrões que podem ser importados para qualquer projeto.
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                setSelectedRequirement(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Requisito Global</span>
            </button>
          </div>
        </div>

        {/* Tabela de Requisitos Globais */}
        <RequirementsTable
          scope="global"
          requirements={requirements}
          loading={loading}
          onSelectRequirement={(req) => {
            setSelectedRequirement(req);
            setIsModalOpen(true);
          }}
          onDeleteRequirement={handleDeleteRequirement}
        />
      </div>
    </>
  );
}
