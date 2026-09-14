import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Intercepta todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico (ícone do navegador)
     * - imagens/ (pasta com mockups)
     * - arquivos públicos (.svg, .png, .jpg, .jpeg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|imagens/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
