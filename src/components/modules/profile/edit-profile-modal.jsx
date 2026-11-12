"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  User,
  Mail,
  Shield,
  Camera,
  Trash2,
  Lock,
  Check,
  Loader2,
  AlertTriangle,
  Sparkles,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ROLES, ROLE_LABELS } from "@/lib/constants/roles";
import { getInitials } from "@/lib/utils/formatters";

// Avatares rápidos pré-configurados para escolha com 1 clique
const PRESET_AVATARS = [
  { id: "dev", name: "Dev Bot", url: "https://api.dicebear.com/7.x/bottts/svg?seed=ReqDev" },
  { id: "avatar1", name: "Alex", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" },
  { id: "avatar2", name: "Sara", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara" },
  { id: "avatar3", name: "Jordan", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan" },
  { id: "avatar4", name: "Maya", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya" },
  { id: "abstract", name: "Geo", url: "https://api.dicebear.com/7.x/shapes/svg?seed=Flow" },
];

export function EditProfileModal({ isOpen, onClose }) {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState(ROLES.REQUIREMENTS_ANALYST);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sincroniza estado com os dados do perfil atual ao abrir
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setRole(profile.role || ROLES.REQUIREMENTS_ANALYST);
      setAvatarUrl(profile.avatar_url || "");
      setNewPassword("");
      setConfirmPassword("");
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [profile, isOpen]);

  // Handler para processar upload de foto do computador com redimensionamento em canvas
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg("A imagem selecionada é muito grande. Escolha uma imagem de até 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar para max 256x256 mantendo qualidade e proporção
        const canvas = document.createElement("canvas");
        const maxDim = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Gerar data URI em JPEG com qualidade 0.88 (~20KB a 40KB)
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
        setAvatarUrl(compressedDataUrl);
        setErrorMsg("");
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    setErrorMsg("");
    setSuccessMsg("");

    if (!fullName.trim()) {
      setErrorMsg("O nome completo é obrigatório.");
      return;
    }

    // Validação de senha se preenchida
    if (showPasswordSection && newPassword) {
      if (newPassword.length < 6) {
        setErrorMsg("A nova senha deve ter no mínimo 6 caracteres.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("A confirmação de senha não coincide com a nova senha digitada.");
        return;
      }
    }

    setIsSaving(true);

    try {
      // 1. Atualizar a tabela public.profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          role: role,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        throw new Error(profileError.message || "Erro ao atualizar perfil no banco de dados.");
      }

      // 2. Atualizar user_metadata e senha (se alterada) no auth
      // CRÍTICO: NUNCA armazenar base64 dentro do user_metadata do Supabase Auth.
      // O Supabase Auth insere todo o user_metadata no token JWT salvo nos cookies HTTP da sessão.
      // Cookies com base64 ultrapassam o limite de cabeçalho do Node.js causando HTTP 431 (Header Too Large).
      // A foto fica salva com segurança e alta performance na coluna avatar_url da tabela public.profiles!
      const isShortUrl = avatarUrl && !avatarUrl.startsWith("data:") && avatarUrl.length < 500;
      const authUpdatePayload = {
        data: {
          full_name: fullName.trim(),
          role: role,
          avatar_url: isShortUrl ? avatarUrl : null,
        },
      };

      if (showPasswordSection && newPassword) {
        authUpdatePayload.password = newPassword;
      }

      const { error: authError } = await supabase.auth.updateUser(authUpdatePayload);
      if (authError) {
        console.warn("Aviso ao atualizar auth user:", authError);
      }

      // 3. Atualizar o estado do hook useAuth em tempo real
      if (refreshProfile) {
        await refreshProfile();
      }

      setSuccessMsg("Perfil e foto atualizados com sucesso!");
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      setErrorMsg(err.message || "Não foi possível salvar as alterações do perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentInitials = fullName ? getInitials(fullName) : user?.email?.slice(0, 2).toUpperCase() || "U";

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center z-[100] p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 flex flex-col text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#0f172a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Meu Perfil</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize seus dados de identificação e foto de perfil.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs font-medium flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Seção 1: Foto de Perfil & Avatar */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-3.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Foto de Perfil
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500/80 shadow-md ring-4 ring-blue-500/10"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-[#112240] dark:bg-blue-600 text-white flex items-center justify-center font-bold text-2xl tracking-wider shadow-md border-2 border-slate-300 dark:border-slate-700">
                    {currentInitials}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-transform active:scale-95 cursor-pointer"
                  title="Trocar foto"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Controles de Foto */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#131c31] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Upload de Foto</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl("")}
                      className="px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  PNG, JPG ou WebP de até 8MB (otimizado automaticamente).
                </p>
              </div>
            </div>

            {/* Avatares Rápidos Predefinidos */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-2">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Ou escolha um avatar rápido:</span>
              </span>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {PRESET_AVATARS.map((preset) => {
                  const isSelected = avatarUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAvatarUrl(preset.url)}
                      className={`relative w-9 h-9 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? "border-blue-600 ring-2 ring-blue-500/30 scale-105"
                          : "border-slate-200 dark:border-slate-700 hover:border-blue-400 opacity-80 hover:opacity-100"
                      }`}
                      title={preset.name}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Seção 2: Dados Pessoais */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nome Completo <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#131c31] transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                E-mail da Conta
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  disabled
                  value={profile?.email || user?.email || ""}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/50 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                O e-mail é utilizado para autenticação no sistema.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Papel Principal no Sistema
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <Shield className="w-4 h-4" />
                </span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-[#131c31] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs transition-all cursor-pointer"
                >
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Seção 3: Alterar Senha (Opcional / Expansível) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{showPasswordSection ? "Ocultar alteração de senha" : "Deseja alterar sua senha?"}</span>
            </button>

            {showPasswordSection && (
              <div className="mt-3.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-[#131c31] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-[#131c31] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (mounted && typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}

