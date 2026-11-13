import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Profile = {
  id: string;
  role: "teacher" | "student";
  full_name: string;
  email: string | null;
  teacher_id: string | null;
  level: string;
  birth_date: string | null;
  is_minor: boolean;
  guardian_name: string | null;
  guardian_consent: boolean;
  voice_consent: boolean;
  privacy_ack_at: string | null;
  goals: string | null;
  points: number;
  streak: number;
  best_streak: number;
  last_study_date: string | null;
  active: boolean;
  bio: string | null;
  created_at: string;
};

type Ctx = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>(null as unknown as Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (s: Session | null) => {
    if (!s) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", s.user.id).single();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setTimeout(() => loadProfile(s), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // registra o dia de estudo do aluno (sequência e frequência)
  useEffect(() => {
    if (profile?.role === "student") supabase.rpc("register_study").then(() => {});
  }, [profile?.id]);

  return (
    <AuthCtx.Provider
      value={{
        session, profile, loading,
        refreshProfile: () => loadProfile(session),
        signOut: async () => { await supabase.auth.signOut(); setProfile(null); },
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
