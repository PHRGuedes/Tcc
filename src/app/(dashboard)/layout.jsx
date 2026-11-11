import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { ProjectProvider } from "@/components/layout/project-context";

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
      <div className="flex min-h-screen bg-[#f8fafc]">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </ProjectProvider>
  );
}
