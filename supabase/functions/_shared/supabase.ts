import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.119.0";
import { HttpError } from "./cors.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Cliente com privilégios de servidor. Nunca exposto ao navegador. */
export const admin: SupabaseClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type Caller = { id: string; role: "teacher" | "student"; teacher_id: string | null; full_name: string; level: string; profile: Record<string, unknown> };

/** Valida o token do usuário e devolve o perfil. */
export async function getCaller(req: Request): Promise<Caller> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Não autenticado");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Sessão inválida. Entre novamente.");
  const { data: profile, error: pErr } = await admin.from("profiles").select("*").eq("id", data.user.id).single();
  if (pErr || !profile) throw new HttpError(403, "Perfil não encontrado");
  if (!profile.active) throw new HttpError(403, "Conta desativada. Fale com a professora.");
  return { id: profile.id, role: profile.role, teacher_id: profile.teacher_id, full_name: profile.full_name, level: profile.level, profile };
}
