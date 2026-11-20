"use client";

import { useEffect, useState, useMemo } from "react";
import { Topbar } from "@/components/layout/topbar";
import { KpiGrid } from "@/components/modules/dashboard/kpi-grid";
import { StatusDonutChart } from "@/components/modules/dashboard/status-donut";
import { ActivityFeed } from "@/components/modules/dashboard/activity-feed";
import { useProject } from "@/components/layout/project-context";
import { createClient } from "@/lib/supabase/client";

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
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadDashboardData() {
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
        } else {
          // Projeto novo ou vazio: estatísticas zeradas
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
    }

    loadDashboardData();
  }, [activeProject?.id, supabase]);

  const chartData = [
    { name: "Aprovados", value: stats.approved, color: "#10b981" },
    { name: "Em Análise", value: stats.underReview, color: "#f59e0b" },
    { name: "Não Aprovados", value: stats.notApproved, color: "#f43f5e" },
  ];

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="p-8 max-w-7xl w-full mx-auto">
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
