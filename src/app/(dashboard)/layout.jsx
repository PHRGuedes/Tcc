import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { ProjectProvider } from "@/components/layout/project-context";
import { PermissionsProvider } from "@/components/layout/permissions-context";
import { ensureReqflowUserStoriesDirectly } from "@/lib/services/seed-user-stories";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Carga direta e automática das 25 User Stories no projeto ReqFlow (sem necessidade de botão)
  try {
    const { data: userProjects } = await supabase
      .from("projects")
      .select("id, name")
      .ilike("name", "%reqflow%");

    if (userProjects && userProjects.length > 0) {
      for (const p of userProjects) {
        const { count } = await supabase
          .from("user_stories")
          .select("id", { count: "exact", head: true })
          .eq("project_id", p.id);

        if (!count || count < 25) {
          await ensureReqflowUserStoriesDirectly(supabase, user.id, p.id);
        }
      }
    }
  } catch (err) {
    console.warn("Aviso ao auto-sincronizar user stories no layout:", err);
  }

  return (
    <ProjectProvider>
      <PermissionsProvider>
        <div className="flex min-h-screen bg-slate-100/70 dark:bg-[#070d17] text-slate-900 dark:text-slate-100 transition-colors duration-150">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
            {children}
          </main>
        </div>
      </PermissionsProvider>
    </ProjectProvider>
  );
}
