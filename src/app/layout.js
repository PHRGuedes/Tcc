import "./globals.css";

export const metadata = {
  title: "ReqFlow — Plataforma de Engenharia de Requisitos",
  description:
    "Plataforma web de apoio à Engenharia de Requisitos voltada a estudantes e desenvolvedores iniciantes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
