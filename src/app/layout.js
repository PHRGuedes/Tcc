import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";

export const metadata = {
  title: "ReqFlow — Plataforma de Engenharia de Requisitos",
  description:
    "Plataforma web de apoio à Engenharia de Requisitos voltada a estudantes e desenvolvedores iniciantes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storedTheme = localStorage.getItem('reqflow_theme');
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (storedTheme === 'dark' || (!storedTheme && systemPrefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#f1f5f9] dark:bg-[#070d17] text-slate-900 dark:text-slate-100 transition-colors duration-150">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
