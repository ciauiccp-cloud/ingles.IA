import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && key);

export const supabase = createClient(url || "http://localhost:54321", key || "public-anon-key", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Chama uma Edge Function e devolve o JSON, lançando erro com a mensagem do servidor. */
export async function callFn<T = any>(name: "ai" | "admin-users", body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    try {
      const ctx = (error as any).context as Response | undefined;
      if (ctx && typeof ctx.json === "function") {
        const j = await ctx.json();
        if (j?.error) message = j.error;
      }
    } catch { /* ignora */ }
    if (/Failed to send a request/i.test(message)) message = "Não foi possível conectar ao servidor. Verifique sua internet ou se as funções foram publicadas.";
    throw new Error(message);
  }
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as T;
}

export function errMsg(e: unknown): string {
  if (!e) return "Erro desconhecido";
  if (typeof e === "string") return e;
  const m = (e as any).message ?? String(e);
  if (/Invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/Email not confirmed/i.test(m)) return "E-mail ainda não confirmado.";
  if (/row-level security/i.test(m)) return "Você não tem permissão para esta ação.";
  if (/duplicate key/i.test(m)) return "Este registro já existe.";
  return m;
}

/** Upload para o bucket privado "materials" na pasta da professora. */
export async function uploadFile(teacherId: string, file: File): Promise<{ path: string; name: string }> {
  const safe = file.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = `${teacherId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from("materials").upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  return { path, name: file.name };
}

const urlCache = new Map<string, { url: string; exp: number }>();
export async function signedUrl(path: string): Promise<string> {
  const c = urlCache.get(path);
  if (c && c.exp > Date.now()) return c.url;
  const { data, error } = await supabase.storage.from("materials").createSignedUrl(path, 3600);
  if (error || !data) throw error ?? new Error("Arquivo indisponível");
  urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}
