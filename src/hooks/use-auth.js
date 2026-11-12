"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUser(user);

          // Autocura de cookies: se o user_metadata antigo continha base64 no token JWT, limpa para não inchar os cookies
          if (user.user_metadata?.avatar_url?.startsWith("data:")) {
            supabase.auth.updateUser({
              data: { avatar_url: null },
            });
          }

          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profileData) {
            setProfile(profileData);
          } else {
            setProfile({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário",
              email: user.email,
              role: user.user_metadata?.role || "requirements_analyst",
            });
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.warn("Auth check:", err);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (profileData) {
          setProfile(profileData);
        } else {
          setProfile({
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Usuário",
            email: session.user.email,
            role: session.user.user_metadata?.role || "requirements_analyst",
          });
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const refreshProfile = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        setUser(currentUser);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          return profileData;
        }
      }
    } catch (err) {
      console.warn("Erro ao atualizar perfil:", err);
    }
  };

  return { user, profile, loading, signOut, refreshProfile };
}
