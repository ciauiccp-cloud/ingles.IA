import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, KeyRound, Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { Badge, Button, Card, Empty, Field, Input, Loadable, Modal, PageHeader, Select, Textarea, Toggle, useToast } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { useAsync } from "../../lib/hooks";
import { callFn, errMsg, supabase } from "../../lib/supabase";
import { fetchClasses, fetchMembers, fetchStudents, type StudentRow } from "../../lib/data";
import { LEVELS, fmtDate, levelLabel } from "../../lib/constants";

type Form = {
  id?: string; full_name: string; email: string; password: string; level: string; birth_date: string; is_minor: boolean;
  guardian_name: string; guardian_consent: boolean; goals: string; class_ids: string[]; active: boolean;
};
const emptyForm: Form = { full_name: "", email: "", password: "", level: "beginner", birth_date: "", is_minor: false, guardian_name: "", guardian_consent: false, goals: "", class_ids: [], active: true };

export default function Students() {
  const { profile } = useAuth();
  const { toast, confirm } = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [students, classes, members] = await Promise.all([fetchStudents(profile!.id), fetchClasses(), fetchMembers()]);
    return { students, classes, members };
  });
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const list = useMemo(() => {
    if (!data) return [];
    return data.students.filter((s) =>
      (!q || `${s.full_name} ${s.email}`.toLowerCase().includes(q.toLowerCase())) &&
      (!cls || data.members.some((m) => m.class_id === cls && m.student_id === s.id)));
  }, [data, q, cls]);

  const classesOf = (sid: string) => data?.members.filter((m) => m.student_id === sid).map((m) => data.classes.find((c) => c.id === m.class_id)?.name).filter(Boolean) ?? [];

  const openEdit = async (s: StudentRow) => {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", s.id).single();
    setForm({
      id: s.id, full_name: p.full_name, email: p.email ?? "", password: "", level: p.level, birth_date: p.birth_date ?? "",
      is_minor: p.is_minor, guardian_name: p.guardian_name ?? "", guardian_consent: p.guardian_consent, goals: p.goals ?? "",
      class_ids: data!.members.filter((m) => m.student_id === s.id).map((m) => m.class_id), active: p.active,
    });
  };

  const save = async () => {
    if (!form) return;
    if (form.is_minor && !form.guardian_name.trim()) return toast("Informe o nome do responsável pelo aluno menor de idade.", "error");
    setBusy(true);
    try {
      if (!form.id) {
        const r = await callFn<{ email: string; temp_password: string | null }>("admin-users", {
          action: "create_student", ...form, birth_date: form.birth_date || null, password: form.password || undefined,
        });
        setCreated({ email: r.email, password: r.temp_password ?? form.password });
        toast("Aluno cadastrado com sucesso!");
      } else {
        const { error } = await supabase.from("profiles").update({
          full_name: form.full_name, level: form.level, birth_date: form.birth_date || null, is_minor: form.is_minor,
          guardian_name: form.guardian_name || null, guardian_consent: form.guardian_consent,
          guardian_consent_at: form.guardian_consent ? new Date().toISOString() : null, goals: form.goals || null, active: form.active,
        }).eq("id", form.id);
        if (error) throw error;
        const current = data!.members.filter((m) => m.student_id === form.id).map((m) => m.class_id);
        const toAdd = form.class_ids.filter((c) => !current.includes(c));
        const toRemove = current.filter((c) => !form.class_ids.includes(c));
        if (toAdd.length) { const r = await supabase.from("class_members").insert(toAdd.map((c) => ({ class_id: c, student_id: form.id }))); if (r.error) throw r.error; }
        for (const c of toRemove) await supabase.from("class_members").delete().eq("class_id", c).eq("student_id", form.id);
        const original = data!.students.find((s) => s.id === form.id);
        if (original && form.email.trim() && form.email.trim().toLowerCase() !== (original.email ?? "")) {
          await callFn("admin-users", { action: "update_email", student_id: form.id, email: form.email });
        }
        toast("Dados do aluno atualizados.");
      }
      setForm(null);
      reload();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally { setBusy(false); }
  };

  const remove = async (s: StudentRow) => {
    if (!(await confirm(`Excluir definitivamente ${s.full_name}? A conta, notas, conversas e histórico serão apagados. Para apenas bloquear o acesso, edite o aluno e desative-o.`, { danger: true, ok: "Excluir" }))) return;
    try { await callFn("admin-users", { action: "delete_student", student_id: s.id }); toast("Aluno excluído."); reload(); }
    catch (e) { toast(errMsg(e), "error"); }
  };

  const resetPw = async (s: StudentRow) => {
    if (!(await confirm(`Gerar uma nova senha temporária para ${s.full_name}?`))) return;
    try {
      const r = await callFn<{ temp_password: string }>("admin-users", { action: "reset_password", student_id: s.id });
      setCreated({ email: s.email ?? "", password: r.temp_password });
    } catch (e) { toast(errMsg(e), "error"); }
  };

  return (
    <div>
      <PageHeader title="Alunos" subtitle="Cadastre, organize e acompanhe cada estudante"
        actions={<Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setForm({ ...emptyForm })}>Cadastrar aluno</Button>} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input placeholder="Buscar por nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={cls} onChange={(e) => setCls(e.target.value)} className="sm:w-56">
          <option value="">Todas as turmas</option>
          {data?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>
      <Loadable loading={loading} error={error} reload={reload}>
        {list.length === 0 ? (
          <Empty title={data?.students.length ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado"} text="Cadastre seus alunos para que eles possam acessar a plataforma."
            action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ ...emptyForm })}>Cadastrar aluno</Button>} />
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr><th className="px-4 py-3">Aluno</th><th className="px-4 py-3">Turmas</th><th className="px-4 py-3">Nível</th><th className="px-4 py-3">Pontos</th><th className="px-4 py-3">Último estudo</th><th className="px-4 py-3" /></tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id} className="border-b border-line/60 last:border-0 hover:bg-white/[.02]">
                      <td className="px-4 py-3">
                        <Link to={`/professora/alunos/${s.id}`} className="font-medium hover:text-violet-300">{s.full_name}</Link>
                        <div className="text-xs text-zinc-500">{s.email}</div>
                        <div className="mt-1 flex gap-1">
                          {!s.active && <Badge tone="zinc">Inativo</Badge>}
                          {s.is_minor && <Badge tone={s.guardian_consent ? "sky" : "amber"}>{s.guardian_consent ? "Menor · autorizado" : "Menor · sem autorização"}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{classesOf(s.id).join(", ") || <span className="text-zinc-500">—</span>}</td>
                      <td className="px-4 py-3"><Badge>{levelLabel(s.level)}</Badge></td>
                      <td className="px-4 py-3">{s.points}</td>
                      <td className="px-4 py-3 text-zinc-400">{s.last_study_date ? fmtDate(s.last_study_date) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(s)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => resetPw(s)} title="Nova senha"><KeyRound className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(s)} title="Excluir"><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </Loadable>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Editar aluno" : "Cadastrar aluno"} wide
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button><Button loading={busy} onClick={save}>Salvar</Button></>}>
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo *"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="E-mail de acesso *"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            {!form.id && <Field label="Senha inicial" hint="Deixe em branco para gerar uma senha temporária automaticamente."><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="mínimo 8 caracteres" /></Field>}
            <Field label="Nível de inglês">
              <Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</Select>
            </Field>
            <Field label="Data de nascimento">
              <Input type="date" value={form.birth_date} onChange={(e) => {
                const v = e.target.value;
                const age = v ? (Date.now() - new Date(v).getTime()) / (365.25 * 864e5) : 99;
                setForm({ ...form, birth_date: v, is_minor: age < 18 });
              }} />
            </Field>
            <Field label="Turmas" className="sm:col-span-2">
              <div className="flex flex-wrap gap-2">
                {data?.classes.length === 0 && <span className="text-sm text-zinc-500">Crie turmas no menu Turmas.</span>}
                {data?.classes.map((c) => {
                  const on = form.class_ids.includes(c.id);
                  return <button type="button" key={c.id} onClick={() => setForm({ ...form, class_ids: on ? form.class_ids.filter((x) => x !== c.id) : [...form.class_ids, c.id] })}
                    className={`rounded-full border px-3 py-1 text-sm transition ${on ? "border-brand bg-brand/20 text-white" : "border-line text-zinc-400 hover:text-white"}`}>{c.name}</button>;
                })}
              </div>
            </Field>
            <Field label="Metas de aprendizagem" className="sm:col-span-2"><Textarea value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} placeholder="Ex.: conversar com confiança em viagens; preparar para entrevista de emprego" /></Field>
            <div className="space-y-3 rounded-xl border border-line p-4 sm:col-span-2">
              <div className="text-sm font-medium">Privacidade e LGPD</div>
              <Toggle checked={form.is_minor} onChange={(v) => setForm({ ...form, is_minor: v })} label="Aluno menor de idade" />
              {form.is_minor && (
                <>
                  <Field label="Nome do responsável legal *"><Input value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} /></Field>
                  <Toggle checked={form.guardian_consent} onChange={(v) => setForm({ ...form, guardian_consent: v })}
                    label="Tenho a autorização do responsável para o uso da plataforma, do tutor com IA e do reconhecimento de voz" />
                  <p className="text-xs text-zinc-500">Sem essa autorização, o aluno menor pode usar o tutor apenas por texto.</p>
                </>
              )}
              {form.id && <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Acesso ativo" />}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!created} onClose={() => setCreated(null)} title="Dados de acesso" footer={<Button onClick={() => setCreated(null)}>Pronto</Button>}>
        {created && (
          <div className="space-y-3 text-sm">
            <p className="text-zinc-400">Envie estes dados ao aluno por um canal seguro. A senha não será exibida novamente.</p>
            <div className="rounded-xl bg-ink-2 p-4 font-mono">
              <div>E-mail: {created.email}</div>
              <div>Senha: {created.password}</div>
            </div>
            <Button variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => {
              navigator.clipboard.writeText(`Acesso à plataforma de inglês\nEndereço: ${window.location.origin}/entrar\nE-mail: ${created.email}\nSenha: ${created.password}`);
              toast("Copiado!");
            }}>Copiar mensagem</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
