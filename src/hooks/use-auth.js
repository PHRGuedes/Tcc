"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    id: "11111111-1111-1111-1111-111111111111",
    full_name: "Ana Ribeiro",
    email: "ana.ribeiro@reqflow.com",
    role: "requirements_analyst",
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUser(user);
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
        }
      } catch (err) {
        console.warn("Auth check:", err);
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
        if (profileData) setProfile(profileData);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return { user, profile, loading, signOut };
}
