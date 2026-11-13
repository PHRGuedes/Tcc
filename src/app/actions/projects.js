"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PROJECT_ROLES, ALL_PERMISSION_KEYS } from "@/lib/constants/permissions";

/**
 * Server Action para cadastrar um novo projeto no Supabase
 * Segue o padrão de Server Actions do Next.js App Router com cookies assíncronos.
 */
export async function createProjectAction({ name, description }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado no sistema." };
    }

    if (!name || !name.trim()) {
      return { success: false, error: "O nome do projeto é obrigatório." };
    }

    // 1. Inserir o novo projeto vinculado ao usuário autenticado (created_by)
    const { data: newProject, error: insertError } = await supabase
      .from("projects")
      .insert({
        name: name.trim(),
        description: description?.trim() || "Novo projeto de requisitos",
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Erro ao inserir projeto no Supabase:", insertError);
      return { success: false, error: insertError.message };
    }

    // 2. Vincular o criador como membro admin do projeto
    try {
      await supabase.from("project_members").insert({
        project_id: newProject.id,
        user_id: user.id,
        role_in_project: "admin",
      });
    } catch (memberErr) {
      console.warn("Aviso ao vincular criador como membro:", memberErr);
    }

    // 3. Registrar a ação no audit_logs para o feed de atividades
    try {
      await supabase.from("audit_logs").insert({
        project_id: newProject.id,
        user_id: user.id,
        entity_type: "project",
        entity_id: newProject.id,
        action: "created",
        description: `criou o projeto "${newProject.name}"`,
      });
    } catch (auditErr) {
      console.warn("Aviso ao registrar log de auditoria:", auditErr);
    }

    // 4. Revalidar cache do App Router para atualizar Server Components dependentes
    revalidatePath("/", "layout");

    return { success: true, data: newProject };
  } catch (err) {
    console.error("Exceção na Server Action createProjectAction:", err);
    return {
      success: false,
      error: "Ocorreu um erro interno no servidor ao cadastrar o projeto.",
    };
  }
}

/**
 * Server Action para atualizar dados básicos de um projeto (nome, descrição)
 */
export async function updateProjectAction({ projectId, name, description }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!projectId) {
      return { success: false, error: "ID do projeto não informado." };
    }

    if (!name || !name.trim()) {
      return { success: false, error: "O nome do projeto é obrigatório." };
    }

    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update({
        name: name.trim(),
        description: description?.trim() || "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .select()
      .single();

    if (updateError) {
      console.error("Erro ao atualizar projeto:", updateError);
      return { success: false, error: updateError.message };
    }

    // Registrar no audit_logs
    try {
      await supabase.from("audit_logs").insert({
        project_id: projectId,
        user_id: user.id,
        entity_type: "project",
        entity_id: projectId,
        action: "updated",
        description: `atualizou os dados do projeto para "${updatedProject.name}"`,
      });
    } catch (auditErr) {
      console.warn("Aviso ao registrar log de auditoria:", auditErr);
    }

    revalidatePath("/", "layout");

    return { success: true, data: updatedProject };
  } catch (err) {
    console.error("Exceção em updateProjectAction:", err);
    return {
      success: false,
      error: "Ocorreu um erro interno no servidor ao atualizar o projeto.",
    };
  }
}

/**
 * Server Action para listar stakeholders (membros) vinculados ao projeto.
 * Garante que o criador do projeto (created_by) esteja automaticamente cadastrado como 'admin'.
 */
export async function getProjectMembersAction(projectId) {
  try {
    const supabase = await createClient();

    if (!projectId) {
      return { success: false, error: "ID do projeto não fornecido.", data: [] };
    }

    // 1. Buscar projeto para identificar o criador original
    const { data: project } = await supabase
      .from("projects")
      .select("id, created_by")
      .eq("id", projectId)
      .maybeSingle();

    // 2. Buscar membros cadastrados atualmente
    let { data: members, error } = await supabase
      .from("project_members")
      .select(`
        id,
        project_id,
        user_id,
        role_in_project,
        joined_at,
        profiles (
          id,
          full_name,
          email,
          role,
          avatar_url
        )
      `)
      .eq("project_id", projectId)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Erro ao listar membros do projeto:", error);
      return {
        success: false,
        error: error.message,
        data: [],
        projectCreatorId: project?.created_by,
      };
    }

    members = members || [];

    // 3. Auto-vinculação: se o criador do projeto não está nos membros, cadastra como admin
    if (project?.created_by && !members.some((m) => m.user_id === project.created_by)) {
      const { data: newAdminMember, error: insertCreatorErr } = await supabase
        .from("project_members")
        .insert({
          project_id: projectId,
          user_id: project.created_by,
          role_in_project: "admin",
        })
        .select(`
          id,
          project_id,
          user_id,
          role_in_project,
          joined_at,
          profiles (
            id,
            full_name,
            email,
            role,
            avatar_url
          )
        `)
        .maybeSingle();

      if (newAdminMember) {
        members = [newAdminMember, ...members];
      } else if (insertCreatorErr) {
        console.warn("Aviso ao auto-cadastrar criador como admin:", insertCreatorErr.message);
      }
    }

    return {
      success: true,
      data: members,
      projectCreatorId: project?.created_by,
    };
  } catch (err) {
    console.error("Exceção em getProjectMembersAction:", err);
    return { success: false, error: err.message, data: [] };
  }
}

/**
 * Server Action para buscar todos os perfis disponíveis no sistema
 * (para adicionar como novo stakeholder no projeto)
 */
export async function getAvailableProfilesAction() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, avatar_url")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Erro ao buscar perfis:", error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error("Exceção em getAvailableProfilesAction:", err);
    return { success: false, error: err.message, data: [] };
  }
}

const VALID_PROJECT_ROLES = [
  "admin",
  "requirements_analyst",
  "product_owner",
  "scrum_master",
  "developer",
  "project_manager",
];

const PROJECT_ROLE_LABELS = {
  admin: "Administrador",
  requirements_analyst: "Analista de Requisitos",
  product_owner: "Product Owner",
  scrum_master: "Scrum Master",
  developer: "Desenvolvedor",
  project_manager: "Gerente de Projeto",
};

/**
 * Helper interno: Verifica se o usuário autenticado é Administrador ou Criador do projeto.
 */
async function checkIsProjectAdmin(supabase, projectId, userId) {
  if (!projectId || !userId) return false;

  try {
    const { data: project } = await supabase
      .from("projects")
      .select("created_by")
      .eq("id", projectId)
      .maybeSingle();

    if (project?.created_by === userId) return true;

    const { data: member } = await supabase
      .from("project_members")
      .select("role_in_project")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    return member?.role_in_project === "admin";
  } catch {
    return false;
  }
}

/**
 * Server Action para enviar convite a um novo stakeholder por e-mail.
 * O usuário convidado NÃO entra diretamente; ele recebe notificação e deve aceitar.
 */
export async function inviteProjectMemberAction({ projectId, email, roleInProject }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!projectId || !email?.trim()) {
      return { success: false, error: "Projeto e e-mail do usuário são obrigatórios." };
    }

    // 1. Apenas administradores ou criador podem convidar
    const isAdmin = await checkIsProjectAdmin(supabase, projectId, user.id);
    if (!isAdmin) {
      return {
        success: false,
        error: "Apenas administradores do projeto podem convidar novos stakeholders.",
      };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Buscar o usuário pontualmente pelo e-mail
    const { data: foundProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (profileErr || !foundProfile) {
      return {
        success: false,
        error: `Nenhum usuário cadastrado no sistema com o e-mail "${normalizedEmail}".`,
      };
    }

    // 3. Verificar se já é membro ativo
    const { data: existingMember } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", foundProfile.id)
      .maybeSingle();

    if (existingMember) {
      return {
        success: false,
        error: `O usuário (${foundProfile.full_name}) já é membro deste projeto.`,
      };
    }

    const role =
      roleInProject && typeof roleInProject === "string" && roleInProject.trim()
        ? roleInProject.trim()
        : "developer";

    // 4. Tentar criar convite em project_invitations
    let inviteData = null;
    try {
      // Verificar se já existe convite pendente
      const { data: existingInvite } = await supabase
        .from("project_invitations")
        .select("id")
        .eq("project_id", projectId)
        .eq("invited_user_id", foundProfile.id)
        .eq("status", "pending")
        .maybeSingle();

      if (existingInvite) {
        return {
          success: false,
          error: `Já existe um convite pendente para ${foundProfile.full_name} neste projeto.`,
        };
      }

      const { data: newInvite, error: inviteErr } = await supabase
        .from("project_invitations")
        .insert({
          project_id: projectId,
          invited_user_id: foundProfile.id,
          invited_by: user.id,
          role_in_project: role,
          status: "pending",
        })
        .select(`
          id,
          project_id,
          invited_user_id,
          invited_by,
          role_in_project,
          status,
          created_at,
          profiles:invited_user_id (id, full_name, email, avatar_url)
        `)
        .single();

      if (!inviteErr && newInvite) {
        inviteData = newInvite;
      }
    } catch {}

    // Fallback: se a tabela project_invitations ainda não existir no Postgres, vincula via project_members
    if (!inviteData) {
      const fallbackRes = await addProjectMemberAction({
        projectId,
        userId: foundProfile.id,
        roleInProject: role,
      });
      return fallbackRes;
    }

    // Auditoria
    try {
      await supabase.from("audit_logs").insert({
        project_id: projectId,
        user_id: user.id,
        entity_type: "project_invitation",
        entity_id: inviteData.id,
        action: "created",
        description: `enviou convite para ${foundProfile.full_name} como ${PROJECT_ROLE_LABELS[role] || role}`,
      });
    } catch (auditErr) {
      console.warn("Aviso ao registrar auditoria de convite:", auditErr);
    }

    revalidatePath("/", "layout");
    return {
      success: true,
      message: `Convite enviado com sucesso para ${foundProfile.full_name}! O usuário precisa aceitar para ingressar.`,
      data: inviteData,
    };
  } catch (err) {
    console.error("Exceção em inviteProjectMemberAction:", err);
    return {
      success: false,
      error: "Ocorreu um erro interno ao enviar o convite.",
    };
  }
}

/**
 * Server Action para buscar convites pendentes de um projeto específico
 */
export async function getProjectInvitationsAction(projectId) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, data: [] };
    }

    const { data, error } = await supabase
      .from("project_invitations")
      .select(`
        id,
        project_id,
        invited_user_id,
        invited_by,
        role_in_project,
        status,
        created_at,
        profiles:invited_user_id (id, full_name, email, avatar_url)
      `)
      .eq("project_id", projectId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, data: [] };
    }

    return { success: true, data: data || [] };
  } catch {
    return { success: false, data: [] };
  }
}

/**
 * Server Action para cancelar/revogar um convite pendente (apenas admin ou criador)
 */
export async function cancelProjectInvitationAction({ invitationId, projectId }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const isAdmin = await checkIsProjectAdmin(supabase, projectId, user.id);
    if (!isAdmin) {
      return { success: false, error: "Apenas administradores podem cancelar convites." };
    }

    const { error } = await supabase
      .from("project_invitations")
      .delete()
      .eq("id", invitationId)
      .eq("project_id", projectId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("Exceção em cancelProjectInvitationAction:", err);
    return { success: false, error: "Erro interno ao cancelar convite." };
  }
}

/**
 * Server Action para buscar convites pendentes recebidos pelo usuário autenticado
 */
export async function getUserProjectInvitationsAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, data: [] };
    }

    const { data, error } = await supabase
      .from("project_invitations")
      .select(`
        id,
        project_id,
        role_in_project,
        status,
        created_at,
        projects (id, name, description),
        inviter:invited_by (id, full_name, email)
      `)
      .eq("invited_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, data: [] };
    }

    return { success: true, data: data || [] };
  } catch {
    return { success: false, data: [] };
  }
}

/**
 * Server Action para responder a um convite de projeto (aceitar ou recusar)
 */
export async function respondProjectInvitationAction({ invitationId, accept }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!invitationId) {
      return { success: false, error: "ID do convite não informado." };
    }

    // 1. Obter os dados do convite pendente
    const { data: invite, error: fetchErr } = await supabase
      .from("project_invitations")
      .select("*, projects(id, name)")
      .eq("id", invitationId)
      .eq("invited_user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (fetchErr || !invite) {
      return {
        success: false,
        error: "Convite não encontrado ou já respondido.",
      };
    }

    if (accept) {
      // 2. Inserir em project_members
      const { error: insertErr } = await supabase
        .from("project_members")
        .insert({
          project_id: invite.project_id,
          user_id: user.id,
          role_in_project: invite.role_in_project,
        });

      if (insertErr && insertErr.code !== "23505") {
        return { success: false, error: insertErr.message };
      }

      // 3. Atualizar status do convite
      await supabase
        .from("project_invitations")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", invitationId);

      // 4. Auditoria
      try {
        await supabase.from("audit_logs").insert({
          project_id: invite.project_id,
          user_id: user.id,
          entity_type: "project_member",
          entity_id: user.id,
          action: "created",
          description: `aceitou o convite para ingressar no projeto "${invite.projects?.name}" como ${PROJECT_ROLE_LABELS[invite.role_in_project] || invite.role_in_project}`,
        });
      } catch {}

      revalidatePath("/", "layout");
      return {
        success: true,
        accepted: true,
        project: invite.projects,
        message: `Você agora faz parte do projeto "${invite.projects?.name}"!`,
      };
    } else {
      // Recusar convite
      await supabase
        .from("project_invitations")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", invitationId);

      revalidatePath("/", "layout");
      return {
        success: true,
        accepted: false,
        message: "Convite recusado com sucesso.",
      };
    }
  } catch (err) {
    console.error("Exceção em respondProjectInvitationAction:", err);
    return { success: false, error: "Erro interno ao processar resposta do convite." };
  }
}

/**
 * Server Action para um membro sair voluntariamente do projeto
 */
export async function leaveProjectAction({ projectId }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!projectId) {
      return { success: false, error: "ID do projeto não informado." };
    }

    // 1. Verificar se o usuário é o criador do projeto (criador NÃO pode sair)
    const { data: project } = await supabase
      .from("projects")
      .select("id, name, created_by")
      .eq("id", projectId)
      .maybeSingle();

    if (project?.created_by === user.id) {
      return {
        success: false,
        error: "O criador do projeto não pode sair do projeto. Você é o proprietário principal.",
      };
    }

    // 2. Remover o membro de project_members
    const { error: deleteErr } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", user.id);

    if (deleteErr) {
      return { success: false, error: deleteErr.message };
    }

    // 3. Auditoria
    try {
      await supabase.from("audit_logs").insert({
        project_id: projectId,
        user_id: user.id,
        entity_type: "project_member",
        entity_id: user.id,
        action: "deleted",
        description: `saiu voluntariamente do projeto "${project?.name || "Projeto"}"`,
      });
    } catch {}

    revalidatePath("/", "layout");
    return {
      success: true,
      message: `Você saiu do projeto "${project?.name || "Projeto"}" com sucesso.`,
    };
  } catch (err) {
    console.error("Exceção em leaveProjectAction:", err);
    return { success: false, error: "Erro interno ao sair do projeto." };
  }
}

/**
 * Server Action para adicionar um stakeholder ao projeto por e-mail ou userId.
 * Garante que ninguém possa listar todos os usuários do sistema, exigindo a digitação do e-mail.
 */
export async function addProjectMemberAction({ projectId, email, userId, roleInProject }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!projectId || (!email && !userId)) {
      return { success: false, error: "Projeto e e-mail do usuário são obrigatórios." };
    }

    let targetUserId = userId;
    let targetProfileName = "";

    // Se informado por e-mail, busca o usuário pontualmente pelo e-mail sem expor os demais usuários
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const { data: foundProfile, error: profileErr } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (profileErr || !foundProfile) {
        return {
          success: false,
          error: `Nenhum usuário cadastrado no sistema com o e-mail "${normalizedEmail}".`,
        };
      }

      targetUserId = foundProfile.id;
      targetProfileName = foundProfile.full_name;
    }

    // Verificar se já é membro do projeto
    const { data: existingMember } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (existingMember) {
      return {
        success: false,
        error: `Este usuário ${targetProfileName ? `(${targetProfileName}) ` : ""}já é stakeholder deste projeto.`,
      };
    }

    const role =
      roleInProject && typeof roleInProject === "string" && roleInProject.trim()
        ? roleInProject.trim()
        : "developer";

    const { data, error } = await supabase
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id: targetUserId,
        role_in_project: role,
      })
      .select(`
        id,
        project_id,
        user_id,
        role_in_project,
        joined_at,
        profiles (
          id,
          full_name,
          email,
          role,
          avatar_url
        )
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          error: "Este usuário já é stakeholder deste projeto.",
        };
      }
      return { success: false, error: error.message };
    }

    // Auditoria
    try {
      await supabase.from("audit_logs").insert({
        project_id: projectId,
        user_id: user.id,
        entity_type: "project_member",
        entity_id: data.id,
        action: "created",
        description: `adicionou ${data.profiles?.full_name || email} como ${PROJECT_ROLE_LABELS[role] || role}`,
      });
    } catch (auditErr) {
      console.warn("Aviso ao registrar auditoria de membro:", auditErr);
    }

    revalidatePath("/", "layout");
    return { success: true, data };
  } catch (err) {
    console.error("Exceção em addProjectMemberAction:", err);
    return {
      success: false,
      error: "Ocorreu um erro interno ao adicionar stakeholder.",
    };
  }
}

/**
 * Server Action para atualizar o perfil (role) do stakeholder no projeto
 */
export async function updateProjectMemberRoleAction({ memberId, roleInProject, projectId }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!roleInProject || typeof roleInProject !== "string" || !roleInProject.trim()) {
      return {
        success: false,
        error: "Perfil de acesso no projeto inválido.",
      };
    }

    // 1. Apenas administradores ou criador do projeto podem alterar funções
    const isAdmin = await checkIsProjectAdmin(supabase, projectId, user.id);
    if (!isAdmin) {
      return {
        success: false,
        error: "Apenas administradores do projeto podem alterar o perfil de stakeholders.",
      };
    }

    // 2. Buscar o membro alvo
    const { data: member } = await supabase
      .from("project_members")
      .select("user_id, projects(created_by)")
      .eq("id", memberId)
      .maybeSingle();

    if (!member) {
      return { success: false, error: "Stakeholder não encontrado neste projeto." };
    }

    // 3. O usuário não pode alterar sua própria função
    if (member.user_id === user.id) {
      return {
        success: false,
        error: "Você não pode alterar sua própria função no projeto.",
      };
    }

    // 4. Proteger o criador do projeto para não ter sua função rebaixada de admin
    if (member.user_id && member.projects?.created_by === member.user_id) {
      return {
        success: false,
        error: "O criador do projeto deve permanecer sempre como Administrador.",
      };
    }

    const { data, error } = await supabase
      .from("project_members")
      .update({ role_in_project: roleInProject })
      .eq("id", memberId)
      .select(`
        id,
        project_id,
        user_id,
        role_in_project,
        joined_at,
        profiles (
          id,
          full_name,
          email,
          role,
          avatar_url
        )
      `)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (projectId) {
      try {
        await supabase.from("audit_logs").insert({
          project_id: projectId,
          user_id: user.id,
          entity_type: "project_member",
          entity_id: memberId,
          action: "updated",
          description: `alterou a função de ${data.profiles?.full_name || "membro"} para ${PROJECT_ROLE_LABELS[roleInProject] || roleInProject}`,
        });
      } catch (auditErr) {
        console.warn("Aviso de auditoria:", auditErr);
      }
    }

    revalidatePath("/", "layout");
    return { success: true, data };
  } catch (err) {
    console.error("Exceção em updateProjectMemberRoleAction:", err);
    return {
      success: false,
      error: "Ocorreu um erro interno ao atualizar a função do stakeholder.",
    };
  }
}

/**
 * Server Action para desvincular um stakeholder do projeto
 */
export async function removeProjectMemberAction({ memberId, projectId }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    // 1. Apenas administradores ou criador do projeto podem remover outros membros
    const isAdmin = await checkIsProjectAdmin(supabase, projectId, user.id);
    if (!isAdmin) {
      return {
        success: false,
        error: "Apenas administradores do projeto podem remover stakeholders.",
      };
    }

    // 2. Proteger o criador do projeto para não ser removido
    if (projectId) {
      const { data: member } = await supabase
        .from("project_members")
        .select("user_id, projects(created_by)")
        .eq("id", memberId)
        .maybeSingle();

      if (member?.user_id && member.projects?.created_by === member.user_id) {
        return {
          success: false,
          error: "O criador do projeto não pode ser removido.",
        };
      }
    }

    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      return { success: false, error: error.message };
    }

    if (projectId) {
      try {
        await supabase.from("audit_logs").insert({
          project_id: projectId,
          user_id: user.id,
          entity_type: "project_member",
          entity_id: memberId,
          action: "deleted",
          description: "removeu um stakeholder do projeto",
        });
      } catch (auditErr) {
        console.warn("Aviso de auditoria:", auditErr);
      }
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("Exceção em removeProjectMemberAction:", err);
    return {
      success: false,
      error: "Ocorreu um erro interno ao remover o stakeholder.",
    };
  }
}

/**
 * Server Action para buscar as funções e permissões configuradas para um projeto.
 * Se o projeto ainda não possuir funções salvas em project_roles, realiza o seed das 6 funções padrão.
 */
export async function getProjectRolesAction(projectId) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, data: DEFAULT_PROJECT_ROLES };
    }

    if (!projectId) {
      return { success: false, data: DEFAULT_PROJECT_ROLES };
    }

    // 1. Tentar buscar da tabela project_roles
    const { data, error } = await supabase
      .from("project_roles")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      // Se a tabela ainda não existir no Postgres, retorna as funções padrão em memória
      console.warn("Aviso ao buscar project_roles (usando fallback padrão):", error.message);
      return { success: true, data: DEFAULT_PROJECT_ROLES };
    }

    // 2. Se não houver funções cadastradas para este projeto, realizar seed automático
    if (!data || data.length === 0) {
      const rowsToInsert = DEFAULT_PROJECT_ROLES.map((role) => ({
        project_id: projectId,
        name: role.name,
        slug: role.slug,
        description: role.description,
        is_system: role.is_system,
        permissions: role.permissions,
      }));

      const { data: seeded, error: seedErr } = await supabase
        .from("project_roles")
        .insert(rowsToInsert)
        .select("*")
        .order("created_at", { ascending: true });

      if (seedErr) {
        console.warn("Aviso ao realizar seed de funções:", seedErr.message);
        return { success: true, data: DEFAULT_PROJECT_ROLES };
      }

      return { success: true, data: seeded || DEFAULT_PROJECT_ROLES };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Exceção em getProjectRolesAction:", err);
    return { success: true, data: DEFAULT_PROJECT_ROLES };
  }
}

/**
 * Server Action para salvar permissões editadas de uma função existente no projeto
 */
export async function saveProjectRoleAction({ projectId, roleId, permissions, name, description }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const isAdmin = await checkIsProjectAdmin(supabase, projectId, user.id);
    if (!isAdmin) {
      return {
        success: false,
        error: "Apenas administradores do projeto podem editar permissões de funções.",
      };
    }

    // Buscar a função alvo
    const { data: role } = await supabase
      .from("project_roles")
      .select("*")
      .eq("id", roleId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (!role) {
      return { success: false, error: "Função não encontrada neste projeto." };
    }

    const cleanPermissions = { ...permissions };

    // Se for admin, garante que permissões vitais de administração permaneçam ativas
    if (role.slug === "admin") {
      cleanPermissions.project_settings_manage = true;
      cleanPermissions.project_members_manage = true;
      cleanPermissions.project_roles_manage = true;
    }

    const updatePayload = {
      permissions: cleanPermissions,
      updated_at: new Date().toISOString(),
    };

    // Funções customizadas também podem ter nome e descrição atualizados
    if (!role.is_system) {
      if (name?.trim()) updatePayload.name = name.trim();
      if (description !== undefined) updatePayload.description = description.trim();
    }

    const { data: updated, error } = await supabase
      .from("project_roles")
      .update(updatePayload)
      .eq("id", roleId)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true, data: updated };
  } catch (err) {
    console.error("Exceção em saveProjectRoleAction:", err);
    return { success: false, error: "Erro interno ao salvar permissões." };
  }
}

/**
 * Server Action para criar uma nova função personalizada no projeto
 */
export async function createCustomProjectRoleAction({ projectId, name, description, permissions }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const isAdmin = await checkIsProjectAdmin(supabase, projectId, user.id);
    if (!isAdmin) {
      return {
        success: false,
        error: "Apenas administradores do projeto podem criar novas funções.",
      };
    }

    if (!name || !name.trim()) {
      return { success: false, error: "O nome da função é obrigatório." };
    }

    const trimmedName = name.trim();
    const baseSlug = trimmedName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 30);

    const slug = `${baseSlug}_${Math.floor(100 + Math.random() * 900)}`;

    const { data: newRole, error } = await supabase
      .from("project_roles")
      .insert({
        project_id: projectId,
        name: trimmedName,
        slug,
        description: description?.trim() || "Função customizada do projeto",
        is_system: false,
        permissions: permissions || {},
      })
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true, data: newRole };
  } catch (err) {
    console.error("Exceção em createCustomProjectRoleAction:", err);
    return { success: false, error: "Erro interno ao criar função personalizada." };
  }
}

/**
 * Server Action para excluir uma função personalizada do projeto
 */
export async function deleteCustomProjectRoleAction({ projectId, roleId }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const isAdmin = await checkIsProjectAdmin(supabase, projectId, user.id);
    if (!isAdmin) {
      return {
        success: false,
        error: "Apenas administradores do projeto podem excluir funções.",
      };
    }

    const { data: role } = await supabase
      .from("project_roles")
      .select("id, slug, is_system")
      .eq("id", roleId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (!role) {
      return { success: false, error: "Função não encontrada." };
    }

    if (role.is_system) {
      return {
        success: false,
        error: "Funções padrão do sistema não podem ser excluídas.",
      };
    }

    // Reatribuir membros com esta função para 'developer'
    await supabase
      .from("project_members")
      .update({ role_in_project: "developer" })
      .eq("project_id", projectId)
      .eq("role_in_project", role.slug);

    const { error: delError } = await supabase
      .from("project_roles")
      .delete()
      .eq("id", roleId);

    if (delError) {
      return { success: false, error: delError.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("Exceção em deleteCustomProjectRoleAction:", err);
    return { success: false, error: "Erro interno ao excluir função." };
  }
}

/**
 * Server Action para buscar as permissões efetivas do usuário autenticado no projeto
 */
export async function getUserProjectPermissionsAction(projectId) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !projectId) {
      return { success: false, permissions: {} };
    }

    // 1. Verificar se é criador do projeto -> Todas as permissões são TRUE
    const { data: project } = await supabase
      .from("projects")
      .select("created_by")
      .eq("id", projectId)
      .maybeSingle();

    if (project?.created_by === user.id) {
      const allTrue = {};
      ALL_PERMISSION_KEYS.forEach((k) => (allTrue[k] = true));
      return { success: true, permissions: allTrue, role: "admin", isOwner: true };
    }

    // 2. Buscar o membro em project_members
    const { data: member } = await supabase
      .from("project_members")
      .select("role_in_project")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    const roleSlug = member?.role_in_project || "developer";

    if (roleSlug === "admin") {
      const allTrue = {};
      ALL_PERMISSION_KEYS.forEach((k) => (allTrue[k] = true));
      return { success: true, permissions: allTrue, role: "admin", isOwner: false };
    }

    // 3. Buscar a configuração de permissões da função em project_roles
    const { data: roleRow } = await supabase
      .from("project_roles")
      .select("permissions")
      .eq("project_id", projectId)
      .eq("slug", roleSlug)
      .maybeSingle();

    if (roleRow?.permissions && Object.keys(roleRow.permissions).length > 0) {
      return {
        success: true,
        permissions: roleRow.permissions,
        role: roleSlug,
        isOwner: false,
      };
    }

    // 4. Fallback padrão se não houver registro no banco
    const defaultRole =
      DEFAULT_PROJECT_ROLES.find((r) => r.slug === roleSlug) ||
      DEFAULT_PROJECT_ROLES.find((r) => r.slug === "developer");

    return {
      success: true,
      permissions: defaultRole?.permissions || {},
      role: roleSlug,
      isOwner: false,
    };
  } catch (err) {
    console.error("Exceção em getUserProjectPermissionsAction:", err);
    return { success: false, permissions: {} };
  }
}


