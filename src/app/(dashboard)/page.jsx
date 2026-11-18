"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { KpiGrid } from "@/components/modules/dashboard/kpi-grid";
import { StatusDonutChart } from "@/components/modules/dashboard/status-donut";
import { ActivityFeed } from "@/components/modules/dashboard/activity-feed";
import { useProject } from "@/components/layout/project-context";
import { createClient } from "@/lib/supabase/client";
import { seedDemoDataAction } from "@/app/actions/seed";

export default function DashboardPage() {
  const { activeProject } = useProject();
  const [stats, setStats] = useState({
    total: 0,
    underReview: 0,
    approved: 0,
    notApproved: 0,
    userStories: 0,
  });
  const [activities, setActivities] = useState([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const loadDashboardData = useCallback(async () => {
    if (!activeProject?.id) return;

    try {
      // Disparar requisições em paralelo (Promise.all) para evitar waterfalls
      const [reqs, userStoriesCount, logs] = await Promise.all([
          // 1. Buscar requisitos vinculados ao projeto (tentando via project_id direto e fallback via project_requirements)
          (async () => {
            let fetchedReqs = [];
            try {
              const { data: directReqs, error: directErr } = await supabase
                .from("requirements")
                .select("id, status")
                .eq("project_id", activeProject.id);

              if (!directErr && directReqs && directReqs.length > 0) {
                fetchedReqs = directReqs;
              }
            } catch {}

            if (fetchedReqs.length === 0) {
              try {
                const { data: linked } = await supabase
                  .from("project_requirements")
                  .select("requirement:requirements(id, status)")
                  .eq("project_id", activeProject.id);

                if (linked) {
                  fetchedReqs = linked.map((l) => l.requirement).filter(Boolean);
                }
              } catch {}
            }
            return fetchedReqs;
          })(),

          // 2. Buscar contagem total de User Stories do projeto
          (async () => {
            try {
              const { count, error: usErr } = await supabase
                .from("user_stories")
                .select("id", { count: "exact", head: true })
                .eq("project_id", activeProject.id);

              if (!usErr && typeof count === "number") {
                return count;
              }
            } catch {}
            return 0;
          })(),

          // 3. Buscar atividades recentes de auditoria do projeto ativo
          (async () => {
            try {
              const { data } = await supabase
                .from("audit_logs")
                .select("id, action, description, created_at, profiles(full_name, avatar_url)")
                .eq("project_id", activeProject.id)
                .order("created_at", { ascending: false })
                .limit(5);
              return data || [];
            } catch {
              return [];
            }
          })(),
        ]);

        if (reqs && reqs.length > 0) {
          const total = reqs.length;
          const underReview = reqs.filter(
            (r) =>
              r.status === "under_review" ||
              r.status === "proposed" ||
              r.status === "in_development"
          ).length;
          const approved = reqs.filter(
            (r) => r.status === "approved" || r.status === "implemented"
          ).length;
          const notApproved = reqs.filter(
            (r) =>
              r.status === "not_approved" ||
              r.status === "cancelled" ||
              r.status === "rejected"
          ).length;

          setStats({
            total,
            underReview,
            approved,
            notApproved,
            userStories: userStoriesCount,
          });
        } else if (activeProject.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
          // Projeto mock inicial
          setStats({
            total: 44,
            underReview: 18,
            approved: 21,
            notApproved: 5,
            userStories: 12,
          });
        } else {
          // Projeto novo vazio
          setStats({
            total: 0,
            underReview: 0,
            approved: 0,
            notApproved: 0,
            userStories: userStoriesCount,
          });
        }

        if (logs && logs.length > 0) {
          setActivities(
            logs.map((log) => ({
              id: log.id,
              user_name: log.profiles?.full_name || "Membro da Equipe",
              avatar_url: log.profiles?.avatar_url || null,
              text: log.description,
              time: new Date(log.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }))
          );
        } else {
          setActivities([]);
        }
      } catch (err) {
        console.warn("Dashboard fetch:", err);
      }
    },
    [activeProject?.id, supabase]
  );

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSeedDemo = async () => {
    if (!activeProject?.id) return;
    setIsSeeding(true);
    try {
      const res = await seedDemoDataAction(activeProject.id);
      if (res.success) {
        alert(res.message);
        loadDashboardData();
      } else {
        alert(res.error || "Não foi possível carregar dados de demonstração.");
      }
    } catch (err) {
      console.error("Erro ao popular demonstração:", err);
      alert("Erro ao popular demonstração.");
    } finally {
      setIsSeeding(false);
    }
  };

  const chartData = [
    { name: "Aprovados", value: stats.approved, color: "#10b981" },
    { name: "Em Análise", value: stats.underReview, color: "#f59e0b" },
    { name: "Não Aprovados", value: stats.notApproved, color: "#f43f5e" },
  ];

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="p-8 max-w-7xl w-full mx-auto">
        {/* Onboarding Banner para Projeto Novo Vazio (Modo Apresentação / Seed Rápido) */}
        {stats.total === 0 && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/20 border border-blue-200/80 dark:border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 shadow-sm shadow-blue-600/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Projeto Pronto para Apresentação à Banca</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    Seed Rápido
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Preencha este projeto instantaneamente com 8 requisitos (RF/RNF), 4 histórias de usuário, Sprint 1 e matriz de rastreabilidade.
                </p>
              </div>
            </div>
            <button
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Preenchendo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Preencher Dados de Demonstração</span>
                </>
              )}
            </button>
          </div>
        )}

        <KpiGrid stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:span-5 lg:col-span-5">
            <StatusDonutChart data={chartData} total={stats.total} />
          </div>
          <div className="lg:span-7 lg:col-span-7">
            <ActivityFeed activities={activities} />
          </div>
        </div>
      </div>
    </>
  );
}
