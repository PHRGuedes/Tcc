export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-[#070d17] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 transition-colors">
      {children}
    </div>
  );
}
