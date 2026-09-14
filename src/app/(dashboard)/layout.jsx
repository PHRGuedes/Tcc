import { Sidebar } from "@/components/layout/sidebar";
import { ProjectProvider } from "@/components/layout/project-context";

export default function DashboardLayout({ children }) {
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
