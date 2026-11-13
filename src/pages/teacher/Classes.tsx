import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Pencil, Plus, Trash2, Trophy, UserMinus, UserPlus, Users } from "lucide-react";
import { Badge, Button, Card, Empty, Field, Input, Loadable, Modal, PageHeader, Select, Textarea, Toggle, useToast } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { errMsg, supabase } from "../../lib/supabase";
import { fetchClasses, fetchMembers, fetchStudents, type ClassRow } from "../../lib/data";
import { LEVELS, levelLabel } from "../../lib/constants";

export default function Classes() {
  const { profile } = useAuth();
  const { toast, confirm } = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [classes, members, students, lessons, acts] = await Promise.all([
      fetchClasses(), fetchMembers(), fetchStudents(profile!.id),
      supabase.from("lessons").select("class_id").then(must), supabase.from("activities").select("class_id").then(must),
    ]);
    return { classes, members, students, lessons: lessons as any[], acts: acts as any[] };
  });
  const [form, setForm] = useState<Partial<ClassRow> | null>(null);
  const [manage, setManage] = useState<ClassRow | null>(null);
  const [ranking, setRanking] = useState<{ cls: ClassRow; rows: any[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form?.name?.trim()) return toast("Informe o nome da turma.", "error");
    setBusy(true);
    const payload = { name: form.name, level: form.level ?? "beginner", schedule: form.schedule || null, description: form.description || null, active: form.active ?? true };
    const { error } = form.id ? await supabase.from("classes").update(payload).eq("id", form.id) : await supabase.from("classes").insert(payload);
    setBusy(false);
    if (error) return toast(errMsg(error), "error");
    toast(form.id ? "Turma atualizada." : "Turma criada.");
    setForm(null); reload();
  };
  const remove = async (c: ClassRow) => {
    if (!(await confirm(`Excluir a turma "${c.name}"? Os alunos não serão excluídos; aulas e atividades ficam sem turma.`, { danger: true, ok: "Excluir" }))) return;
    const { error } = await supabase.from("classes").delete().eq("id", c.id);
    if (error) return toast(errMsg(error), "error");
    toast("Turma excluída."); reload();
  };
  const toggleMember = async (cid: string, sid: string, isIn: boolean) => {
    const { error } = isIn
      ? await supabase.from("class_members").delete().eq("class_id", cid).eq("student_id", sid)
      : await supabase.from("class_members").insert({ class_id: cid, student_id: sid });
    if (error) return toast(errMsg(error), "error");
    reload();
  };
  const showRanking = async (c: ClassRow) => {
    const { data: rows, error } = await supabase.rpc("class_ranking", { cid: c.id });
    if (error) return toast(errMsg(error), "error");
    setRanking({ cls: c, rows: rows ?? [] });
  };

  return (
    <div>
      <PageHeader title="Turmas" subtitle="Organize alunos, níveis e horários"
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ level: "beginner", active: true })}>Nova turma</Button>} />
      <Loadable loading={loading} error={error} reload={reload}>
        {data?.classes.length === 0 ? (
          <Empty title="Nenhuma turma criada" text="Crie turmas para organizar alunos e direcionar aulas, materiais e atividades."
            action={<Button onClick={() => setForm({ level: "beginner", active: true })}>Criar turma</Button>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data?.classes.map((c) => {
              const n = data.members.filter((m) => m.class_id === c.id).length;
              return (
                <Card key={c.id} className="flex flex-col transition hover:border-brand/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-lg font-semibold">{c.name}</h3>
                      <div className="mt-1 flex flex-wrap gap-1.5"><Badge>{levelLabel(c.level)}</Badge>{!c.active && <Badge tone="zinc">Inativa</Badge>}</div>
                    </div>
                    <div className="flex">
                      <Button size="sm" variant="ghost" onClick={() => setForm(c)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(c)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                    </div>
                  </div>
                  {c.description && <p className="mt-3 text-sm text-zinc-400">{c.description}</p>}
                  <div className="mt-4 space-y-1.5 text-sm text-zinc-300">
                    <div className="flex items-center gap-2"><Users className="h-4 w-4 text-zinc-500" /> {n} aluno(s)</div>
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-zinc-500" /> {c.schedule || "Horário não definido"}</div>
                    <div className="text-xs text-zinc-500">{data.lessons.filter((l) => l.class_id === c.id).length} aulas · {data.acts.filter((a) => a.class_id === c.id).length} atividades</div>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <Button size="sm" variant="secondary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setManage(c)}>Alunos</Button>
                    <Button size="sm" variant="ghost" icon={<Trophy className="h-4 w-4" />} onClick={() => showRanking(c)}>Ranking</Button>
                    <Link to={`/professora/aulas?turma=${c.id}`}><Button size="sm" variant="ghost">Aulas</Button></Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Loadable>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Editar turma" : "Nova turma"}
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button><Button loading={busy} onClick={save}>Salvar</Button></>}>
        {form && (
          <div className="space-y-4">
            <Field label="Nome da turma *"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Teens A2 — Terça e Quinta" /></Field>
            <Field label="Nível de inglês"><Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</Select></Field>
            <Field label="Horários"><Input value={form.schedule ?? ""} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Ex.: Ter e Qui, 18h–19h" /></Field>
            <Field label="Descrição"><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Toggle checked={form.active ?? true} onChange={(v) => setForm({ ...form, active: v })} label="Turma ativa" />
          </div>
        )}
      </Modal>

      <Modal open={!!manage} onClose={() => setManage(null)} title={`Alunos — ${manage?.name ?? ""}`} footer={<Button onClick={() => setManage(null)}>Concluir</Button>}>
        {manage && data && (
          data.students.length === 0 ? <p className="text-sm text-zinc-500">Cadastre alunos primeiro.</p> : (
            <ul className="divide-y divide-line">
              {data.students.map((s) => {
                const isIn = data.members.some((m) => m.class_id === manage.id && m.student_id === s.id);
                return (
                  <li key={s.id} className="flex items-center justify-between py-2.5">
                    <div><div className="text-sm">{s.full_name}</div><div className="text-xs text-zinc-500">{levelLabel(s.level)}</div></div>
                    <Button size="sm" variant={isIn ? "secondary" : "outline"} icon={isIn ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />} onClick={() => toggleMember(manage.id, s.id, isIn)}>
                      {isIn ? "Remover" : "Adicionar"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )
        )}
      </Modal>

      <Modal open={!!ranking} onClose={() => setRanking(null)} title={`Ranking — ${ranking?.cls.name ?? ""}`} footer={<Button onClick={() => setRanking(null)}>Fechar</Button>}>
        {ranking && (ranking.rows.length === 0 ? <p className="text-sm text-zinc-500">Sem alunos nesta turma.</p> : (
          <ol className="space-y-2">
            {ranking.rows.map((r, i) => (
              <li key={r.student_id} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm">
                <span><b className="mr-2 text-violet-300">{i + 1}º</b>{r.full_name}</span><span>{r.points} pts · 🔥 {r.streak}</span>
              </li>
            ))}
          </ol>
        ))}
        <p className="mt-3 text-xs text-zinc-500">Os alunos só veem o ranking se ele estiver ativado em Configurações.</p>
      </Modal>
    </div>
  );
}
