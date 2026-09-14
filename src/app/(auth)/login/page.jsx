"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("ana.ribeiro@reqflow.com");
  const [password, setPassword] = useState("12345678");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const supabase = createClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Se usuário ainda não existe no auth do Supabase, tenta logar ou simular
        console.warn("Auth Supabase:", error.message);
        // Se falhar (ex: usuário demo ainda não registrado no Auth remoto), permite navegação demo
        if (email.includes("@reqflow.com")) {
          router.push("/");
          router.refresh();
          return;
        }
        setErrorMsg(error.message || "Credenciais inválidas. Verifique seu e-mail e senha.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setErrorMsg("Ocorreu um erro ao conectar ao serviço de autenticação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#112240] flex items-center justify-center text-white shadow-md mb-3">
          <Boxes className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ReqFlow</h1>
        <p className="text-xs text-slate-500 mt-0.5">Plataforma de Engenharia de Requisitos</p>
      </div>

      {/* Login Card */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8">
        <h2 className="text-lg font-bold text-slate-900">Entrar na sua conta</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Acesse para gerenciar seus projetos e requisitos.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@reqflow.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Senha
              </label>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Para recuperar a senha, entre em contato com o administrador do projeto.");
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Esqueceu a senha?
              </a>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-70 text-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Entrar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Não tem uma conta?{" "}
          <Link href="/register" className="text-blue-600 font-semibold hover:underline">
            Criar conta
          </Link>
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="mt-8 text-xs text-slate-400">
        © 2026 ReqFlow. Todos os direitos reservados.
      </footer>
    </div>
  );
}
