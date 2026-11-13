import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { ProjectProvider } from "@/components/layout/project-context";
import { PermissionsProvider } from "@/components/layout/permissions-context";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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
