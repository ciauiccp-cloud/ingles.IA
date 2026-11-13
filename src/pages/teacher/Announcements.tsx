import { useState } from "react";
import { Megaphone, Pin, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Empty, Field, Input, Loadable, Modal, PageHeader, Select, Textarea, Toggle, useToast } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { errMsg, supabase } from "../../lib/supabase";
import { fetchClasses, fetchStudents } from "../../lib/data";
import { fmtDateTime } from "../../lib/constants";

export const NOTICE_KINDS = [
  { value: "notice", label: "Comunicado" }, { value: "message", label: "Mensagem" }, { value: "schedule", label: "Mudança de horário" },
  { value: "activity", label: "Nova atividade" }, { value: "reminder", label: "Lembrete" },
];

export default function Announcements() {
  const { profile } = useAuth();
  const { toast, confirm } = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [items, classes, students] = await Promise.all([
      supabase.from("announcements").select("*, classes(name), profiles!announcements_student_id_fkey(full_name)").order("pinned", { ascending: false }).order("created_at", { ascending: false }).then(must),
      fetchClasses(), fetchStudents(profile!.id),
    ]);
    return { items: items as any[], classes, students };
  });
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.title?.trim() || !form.body?.trim()) return toast("Preencha título e mensagem.", "error");
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({
      title: form.title, body: form.body, kind: form.kind, pinned: !!form.pinned,
      class_id: form.target?.startsWith("c:") ? form.target.slice(2) : null, student_id: form.target?.startsWith("s:") ? form.target.slice(2) : null,
    });
    setBusy(false);
    if (error) return toast(errMsg(error), "error");
    toast("Aviso publicado e alunos notificados."); setForm(null); reload();
  };
  const remove = async (a: any) => {
    if (!(await confirm("Excluir este aviso?", { danger: true }))) return;
    await supabase.from("announcements").delete().eq("id", a.id); reload();
  };
  const togglePin = async (a: any) => { await supabase.from("announcements").update({ pinned: !a.pinned }).eq("id", a.id); reload(); };

  return (
    <div>
      <PageHeader title="Avisos e comunicação" subtitle="Comunicados para todos, para uma turma ou mensagens individuais"
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ kind: "notice", target: "" })}>Novo aviso</Button>} />
      <Loadable loading={loading} error={error} reload={reload}>
        {data?.items.length === 0 ? <Empty icon={<Megaphone className="h-6 w-6" />} title="Nenhum aviso publicado" /> : (
          <div className="space-y-3">{data?.items.map((a) => (
            <Card key={a.id} className={a.pinned ? "border-brand/40" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned && <Pin className="h-4 w-4 text-violet-300" />}
                    <h3 className="font-medium">{a.title}</h3>
                    <Badge>{NOTICE_KINDS.find((k) => k.value === a.kind)?.label}</Badge>
                    <Badge tone="zinc">{a.profiles?.full_name ? `Para: ${a.profiles.full_name}` : a.classes?.name ?? "Todos os alunos"}</Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{a.body}</p>
                  <div className="mt-2 text-xs text-zinc-500">{fmtDateTime(a.created_at)}</div>
                </div>
                <div className="flex shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => togglePin(a)} title={a.pinned ? "Desafixar" : "Fixar"}><Pin className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(a)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                </div>
              </div>
            </Card>
          ))}</div>
        )}
      </Loadable>
      <Modal open={!!form} onClose={() => setForm(null)} title="Novo aviso"
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button><Button loading={busy} onClick={save}>Publicar</Button></>}>
        {form && (
          <div className="space-y-4">
            <Field label="Tipo"><Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{NOTICE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select></Field>
            <Field label="Para">
              <Select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
                <option value="">Todos os alunos</option>
                <optgroup label="Turmas">{data?.classes.map((c) => <option key={c.id} value={`c:${c.id}`}>{c.name}</option>)}</optgroup>
                <optgroup label="Aluno (mensagem individual)">{data?.students.map((s) => <option key={s.id} value={`s:${s.id}`}>{s.full_name}</option>)}</optgroup>
              </Select>
            </Field>
            <Field label="Título *"><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Mensagem *"><Textarea className="min-h-32" value={form.body ?? ""} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
            <Toggle checked={!!form.pinned} onChange={(v) => setForm({ ...form, pinned: v })} label="Fixar no topo" />
          </div>
        )}
      </Modal>
    </div>
  );
}
