"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

    const role = VALID_PROJECT_ROLES.includes(roleInProject) ? roleInProject : "developer";

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

    if (!VALID_PROJECT_ROLES.includes(roleInProject)) {
      return {
        success: false,
        error: "Perfil de acesso no projeto inválido.",
      };
    }

    // Proteger o criador do projeto para não ter sua função rebaixada de admin
    if (projectId) {
      const { data: member } = await supabase
        .from("project_members")
        .select("user_id, projects(created_by)")
        .eq("id", memberId)
        .maybeSingle();

      if (member?.user_id && member.projects?.created_by === member.user_id) {
        return {
          success: false,
          error: "O criador do projeto deve permanecer sempre como Administrador.",
        };
      }
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

    // Proteger o criador do projeto para não ser removido
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


