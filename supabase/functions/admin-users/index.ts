// Função "admin-users": cadastro de alunos pela professora e configuração inicial.
// Usa a service role no servidor; o navegador nunca recebe essa chave.
import { corsHeaders, HttpError, json } from "../_shared/cors.ts";
import { admin, getCaller } from "../_shared/supabase.ts";

const LEVELS = ["beginner", "elementary", "intermediate", "upper_intermediate", "advanced"];

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("") + "!7";
}

async function hasTeacher() {
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher");
  return (count ?? 0) > 0;
}

type StudentInput = {
  email: string;
  full_name: string;
  password?: string;
  level?: string;
  birth_date?: string | null;
  is_minor?: boolean;
  guardian_name?: string | null;
  guardian_consent?: boolean;
  goals?: string | null;
  class_ids?: string[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));

    // ---------- Ações públicas (configuração inicial)
    if (body.action === "status") {
      return json({ has_teacher: await hasTeacher() });
    }
    if (body.action === "bootstrap_teacher") {
      if (await hasTeacher()) throw new HttpError(409, "A plataforma já possui uma professora cadastrada.");
      const { email, password, full_name } = body;
      if (!email || !password || password.length < 8 || !full_name) {
        throw new HttpError(400, "Informe nome, e-mail e senha (mínimo 8 caracteres).");
      }
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name },
      });
      if (error) throw new HttpError(400, error.message);
      const id = data.user.id;
      await admin.from("profiles").upsert({ id, email, full_name, role: "teacher" });
      await admin.from("teacher_settings").upsert({ teacher_id: id, teacher_display_name: full_name });
      return json({ ok: true });
    }

    // ---------- Ações da professora
    const caller = await getCaller(req);
    if (caller.role !== "teacher") throw new HttpError(403, "Apenas a professora pode gerenciar alunos.");

    const ownStudent = async (studentId: string) => {
      const { data } = await admin.from("profiles").select("id, teacher_id, role").eq("id", studentId).single();
      if (!data || data.teacher_id !== caller.id || data.role !== "student") throw new HttpError(404, "Aluno não encontrado");
      return data;
    };

    switch (body.action) {
      case "create_student": {
        const s = body as StudentInput;
        const email = (s.email ?? "").trim().toLowerCase();
        if (!email || !s.full_name?.trim()) throw new HttpError(400, "Nome e e-mail são obrigatórios.");
        if (s.is_minor && !s.guardian_name?.trim()) throw new HttpError(400, "Para alunos menores de idade, informe o responsável.");
        const password = s.password && s.password.length >= 8 ? s.password : tempPassword();
        const { data, error } = await admin.auth.admin.createUser({
          email, password, email_confirm: true, user_metadata: { full_name: s.full_name.trim() },
        });
        if (error) {
          const msg = /already|registered|exists/i.test(error.message) ? "Já existe uma conta com este e-mail." : error.message;
          throw new HttpError(400, msg);
        }
        const id = data.user.id;
        const { error: pErr } = await admin.from("profiles").upsert({
          id, email, role: "student", teacher_id: caller.id,
          full_name: s.full_name.trim(),
          level: LEVELS.includes(s.level ?? "") ? s.level : "beginner",
          birth_date: s.birth_date || null,
          is_minor: !!s.is_minor,
          guardian_name: s.guardian_name || null,
          guardian_consent: !!s.guardian_consent,
          guardian_consent_at: s.guardian_consent ? new Date().toISOString() : null,
          goals: s.goals || null,
        });
        if (pErr) throw new HttpError(500, pErr.message);
        if (s.class_ids?.length) {
          const { data: classes } = await admin.from("classes").select("id").eq("teacher_id", caller.id).in("id", s.class_ids);
          if (classes?.length) {
            await admin.from("class_members").insert(classes.map((c) => ({ class_id: c.id, student_id: id })));
          }
        }
        await admin.from("notifications").insert({
          user_id: id, title: "Bem-vindo(a) à plataforma!", body: "Sua conta foi criada pela professora. Bons estudos!", link: "/aluno",
        });
        return json({ id, email, temp_password: s.password ? null : password });
      }

      case "reset_password": {
        await ownStudent(body.student_id);
        const password = body.password && body.password.length >= 8 ? body.password : tempPassword();
        const { error } = await admin.auth.admin.updateUserById(body.student_id, { password });
        if (error) throw new HttpError(400, error.message);
        return json({ temp_password: body.password ? null : password });
      }

      case "update_email": {
        await ownStudent(body.student_id);
        const email = (body.email ?? "").trim().toLowerCase();
        if (!email) throw new HttpError(400, "Informe o e-mail");
        const { error } = await admin.auth.admin.updateUserById(body.student_id, { email, email_confirm: true });
        if (error) throw new HttpError(400, error.message);
        await admin.from("profiles").update({ email }).eq("id", body.student_id);
        return json({ ok: true });
      }

      case "delete_student": {
        await ownStudent(body.student_id);
        // Exclusão definitiva: remove conta e todos os dados do aluno (direito de eliminação — LGPD)
        const { error } = await admin.auth.admin.deleteUser(body.student_id);
        if (error) throw new HttpError(400, error.message);
        return json({ ok: true });
      }

      default:
        throw new HttpError(400, "Ação desconhecida");
    }
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Erro interno no servidor" }, 500);
  }
});
