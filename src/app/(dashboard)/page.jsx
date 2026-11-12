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
    pending: 0,
    approved: 0,
    inDevelopment: 0,
    implemented: 0,
  });
  const [activities, setActivities] = useState([]);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadDashboardData() {
      if (!activeProject?.id) return;

      try {
        // Buscar contagem de requisitos vinculados ao projeto ativo
        const { data: linked } = await supabase
          .from("project_requirements")
          .select("requirement:requirements(id, status)")
          .eq("project_id", activeProject.id);

        const reqs = (linked || []).map((l) => l.requirement).filter(Boolean);

        if (reqs && reqs.length > 0) {
          const total = reqs.length;
          const pending = reqs.filter(
            (r) => r.status === "proposed" || r.status === "under_review"
          ).length;
          const approved = reqs.filter((r) => r.status === "approved").length;
          const inDevelopment = reqs.filter(
            (r) => r.status === "in_development"
          ).length;
          const implemented = reqs.filter(
            (r) => r.status === "implemented"
          ).length;

          setStats({
            total,
            pending,
            approved,
            inDevelopment,
            implemented,
          });
        } else if (activeProject.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
          // Projeto mock inicial
          setStats({
            total: 44,
            pending: 8,
            approved: 21,
            inDevelopment: 10,
            implemented: 5,
          });
        } else {
          // Projeto novo vazio
          setStats({
            total: 0,
            pending: 0,
            approved: 0,
            inDevelopment: 0,
            implemented: 0,
          });
        }

        // Buscar atividades recentes de auditoria do projeto ativo
        const { data: logs } = await supabase
          .from("audit_logs")
          .select("id, action, description, created_at, profiles(full_name, avatar_url)")
          .eq("project_id", activeProject.id)
          .order("created_at", { ascending: false })
          .limit(5);

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
    { name: "Aprovados", value: stats.approved, color: "#16a34a" },
    { name: "Em Desenvolvimento", value: stats.inDevelopment, color: "#2563eb" },
    { name: "Pendentes", value: stats.pending, color: "#d97706" },
    { name: "Implementados", value: stats.implemented, color: "#1e293b" },
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
