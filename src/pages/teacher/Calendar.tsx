import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Field, Input, Loadable, Modal, PageHeader, Select, Textarea, useToast } from "../../components/ui";
import { MonthCalendar, type CalItem } from "../../components/MonthCalendar";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { errMsg, supabase } from "../../lib/supabase";
import { fetchClasses, fetchStudents } from "../../lib/data";
import { EVENT_KINDS } from "../../lib/constants";

const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function Calendar() {
  const { profile } = useAuth();
  const { toast, confirm } = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [events, acts, classes, students] = await Promise.all([
      supabase.from("events").select("*, classes(name)").then(must),
      supabase.from("activities").select("id, title, due_date, class_id").not("due_date", "is", null).then(must),
      fetchClasses(), fetchStudents(profile!.id),
    ]);
    return { events: events as any[], acts: acts as any[], classes, students };
  });
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const items: CalItem[] = useMemo(() => [
    ...(data?.events ?? []).map((e) => ({ id: e.id, date: new Date(e.starts_at), title: e.title, kind: e.kind, sub: e.classes?.name ?? (e.student_id ? "Individual" : "Geral"), raw: e })),
    ...(data?.acts ?? []).map((a) => ({ id: `a-${a.id}`, date: new Date(a.due_date), title: `Entrega: ${a.title}`, kind: "deadline", sub: data?.classes.find((c) => c.id === a.class_id)?.name })),
  ], [data]);

  const save = async () => {
    if (!form.title?.trim() || !form.starts_at) return toast("Informe título e data.", "error");
    setBusy(true);
    const payload = {
      title: form.title, kind: form.kind, description: form.description || null,
      class_id: form.target?.startsWith("c:") ? form.target.slice(2) : null, student_id: form.target?.startsWith("s:") ? form.target.slice(2) : null,
      starts_at: new Date(form.starts_at).toISOString(), ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    };
    const r = form.id ? await supabase.from("events").update(payload).eq("id", form.id) : await supabase.from("events").insert(payload);
    setBusy(false);
    if (r.error) return toast(errMsg(r.error), "error");
    toast(form.id ? "Compromisso atualizado." : "Compromisso criado. Os alunos foram notificados."); setForm(null); reload();
  };
  const remove = async () => {
    if (!(await confirm("Excluir este compromisso?", { danger: true }))) return;
    await supabase.from("events").delete().eq("id", form.id); setForm(null); reload();
  };

  return (
    <div>
      <PageHeader title="Calendário" subtitle="Aulas, avaliações, entregas, eventos e revisões"
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ kind: "lesson", starts_at: toLocal(new Date()), target: "" })}>Novo compromisso</Button>} />
      <Loadable loading={loading} error={error} reload={reload}>
        <MonthCalendar items={items}
          onDayClick={(d) => setForm({ kind: "lesson", starts_at: toLocal(d), target: "" })}
          onItemClick={(it) => it.raw && setForm({ ...it.raw, starts_at: toLocal(new Date(it.raw.starts_at)), ends_at: it.raw.ends_at ? toLocal(new Date(it.raw.ends_at)) : "", target: it.raw.class_id ? `c:${it.raw.class_id}` : it.raw.student_id ? `s:${it.raw.student_id}` : "" })} />
        <p className="mt-2 text-xs text-zinc-500">Dica: clique duas vezes em um dia para criar um compromisso. Prazos de atividades aparecem automaticamente.</p>
      </Loadable>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Editar compromisso" : "Novo compromisso"}
        footer={<>{form?.id && <Button variant="ghost" className="mr-auto" icon={<Trash2 className="h-4 w-4 text-rose-400" />} onClick={remove}>Excluir</Button>}<Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button><Button loading={busy} onClick={save}>Salvar</Button></>}>
        {form && (
          <div className="space-y-4">
            <Field label="Título *"><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Tipo"><Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{EVENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Início *"><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></Field>
              <Field label="Fim"><Input type="datetime-local" value={form.ends_at ?? ""} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></Field>
            </div>
            <Field label="Para">
              <Select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
                <option value="">Todos os alunos</option>
                <optgroup label="Turmas">{data?.classes.map((c) => <option key={c.id} value={`c:${c.id}`}>{c.name}</option>)}</optgroup>
                <optgroup label="Aluno">{data?.students.map((s) => <option key={s.id} value={`s:${s.id}`}>{s.full_name}</option>)}</optgroup>
              </Select>
            </Field>
            <Field label="Descrição"><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
