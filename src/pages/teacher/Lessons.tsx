import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarPlus, Eye, ListPlus, Paperclip, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { Badge, Button, Card, Empty, Field, Input, Loadable, Modal, PageHeader, RichText, Select, Textarea, Toggle, useToast } from "../../components/ui";
import { FileLink, MediaView } from "../../components/FileLink";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { errMsg, supabase, uploadFile } from "../../lib/supabase";
import { fetchClasses } from "../../lib/data";
import { LEVELS, fmtDate, levelLabel } from "../../lib/constants";

type Lesson = {
  id?: string; title: string; lesson_date: string; start_time: string | null; class_id: string | null; subject: string | null;
  level: string | null; objectives: string[]; content: string | null; homework: string | null; status: string; published: boolean;
};
const blank = (): Lesson => ({ title: "", lesson_date: new Date().toISOString().slice(0, 10), start_time: null, class_id: null, subject: "", level: null, objectives: [], content: "", homework: "", status: "planned", published: true });

function kindFromFile(f: File) {
  if (f.type.startsWith("audio")) return "audio";
  if (f.type.startsWith("video")) return "video";
  if (f.type.startsWith("image")) return "image";
  if (f.type === "application/pdf") return "pdf";
  if (/presentation|powerpoint|keynote/.test(f.type) || /\.(pptx?|key|odp)$/i.test(f.name)) return "presentation";
  return "other";
}

export default function Lessons() {
  const { profile } = useAuth();
  const { toast, confirm } = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { data, loading, error, reload } = useAsync(async () => {
    const [lessons, classes, mats, acts] = await Promise.all([
      supabase.from("lessons").select("*").order("lesson_date", { ascending: false }).then(must),
      fetchClasses(),
      supabase.from("materials").select("*").not("lesson_id", "is", null).then(must),
      supabase.from("activities").select("id, title, lesson_id, published").not("lesson_id", "is", null).then(must),
    ]);
    return { lessons: lessons as any[], classes, mats: mats as any[], acts: acts as any[] };
  });
  const [f, setF] = useState({ q: "", cls: params.get("turma") ?? "", level: "", subject: "", from: "", to: "" });
  const [form, setForm] = useState<Lesson | null>(null);
  const [objective, setObjective] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [addEvent, setAddEvent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<any>(null);

  const subjects = useMemo(() => [...new Set((data?.lessons ?? []).map((l) => l.subject).filter(Boolean))].sort(), [data]);
  const list = useMemo(() => (data?.lessons ?? []).filter((l) =>
    (!f.q || `${l.title} ${l.subject} ${l.content}`.toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.cls || (f.cls === "none" ? !l.class_id : l.class_id === f.cls)) &&
    (!f.level || l.level === f.level) && (!f.subject || l.subject === f.subject) &&
    (!f.from || l.lesson_date >= f.from) && (!f.to || l.lesson_date <= f.to)), [data, f]);

  const className = (id: string | null) => data?.classes.find((c) => c.id === id)?.name ?? "Todos os alunos";

  const save = async () => {
    if (!form?.title.trim()) return toast("Informe o título da aula.", "error");
    setBusy(true);
    try {
      const payload = { ...form, subject: form.subject || null, content: form.content || null, homework: form.homework || null, start_time: form.start_time || null };
      delete (payload as any).id;
      let id = form.id;
      if (id) { const r = await supabase.from("lessons").update(payload).eq("id", id); if (r.error) throw r.error; }
      else {
        const r = await supabase.from("lessons").insert(payload).select().single();
        if (r.error) throw r.error;
        id = r.data.id;
        if (addEvent) {
          const starts = new Date(`${form.lesson_date}T${form.start_time || "08:00"}:00`);
          await supabase.from("events").insert({ title: `Aula: ${form.title}`, kind: "lesson", class_id: form.class_id, starts_at: starts.toISOString(), ends_at: new Date(starts.getTime() + 3600e3).toISOString() });
        }
      }
      for (const file of files) {
        const up = await uploadFile(profile!.id, file);
        const r = await supabase.from("materials").insert({
          title: file.name.replace(/\.[^.]+$/, ""), kind: kindFromFile(file), file_path: up.path, file_name: up.name,
          lesson_id: id, class_id: form.class_id, subject: form.subject || null, level: form.level, published: form.published,
        });
        if (r.error) throw r.error;
      }
      toast("Aula salva.");
      setForm(null); setFiles([]); reload();
    } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  };

  const remove = async (l: any) => {
    if (!(await confirm(`Excluir a aula "${l.title}"? Os materiais anexados continuam na área de materiais.`, { danger: true, ok: "Excluir" }))) return;
    const { error } = await supabase.from("lessons").delete().eq("id", l.id);
    if (error) return toast(errMsg(error), "error");
    toast("Aula excluída."); reload();
  };

  return (
    <div>
      <PageHeader title="Aulas e Biblioteca" subtitle="Planeje aulas, anexe materiais e consulte o histórico completo"
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => { setForm(blank()); setFiles([]); }}>Nova aula</Button>} />
      <Card className="mb-4 grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><Input className="pl-9" placeholder="Buscar" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
        <Select value={f.cls} onChange={(e) => setF({ ...f, cls: e.target.value })}><option value="">Todas as turmas</option><option value="none">Sem turma (todos)</option>{data?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}><option value="">Todos os assuntos</option>{subjects.map((s) => <option key={s}>{s}</option>)}</Select>
        <Select value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}><option value="">Todos os níveis</option>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.short}</option>)}</Select>
        <div className="flex gap-2"><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} title="De" /><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} title="Até" /></div>
      </Card>
      <Loadable loading={loading} error={error} reload={reload}>
        {list.length === 0 ? (
          <Empty title={data?.lessons.length ? "Nenhuma aula com esses filtros" : "Nenhuma aula cadastrada"} text="Crie aulas para registrar o conteúdo trabalhado e compartilhar com os alunos." />
        ) : (
          <div className="space-y-3">
            {list.map((l) => {
              const mats = data!.mats.filter((m) => m.lesson_id === l.id);
              const acts = data!.acts.filter((a) => a.lesson_id === l.id);
              return (
                <Card key={l.id} className="flex flex-col gap-3 transition hover:border-brand/40 sm:flex-row sm:items-center">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand/15 text-center leading-tight">
                    <div><div className="font-display text-lg font-semibold">{l.lesson_date.slice(8, 10)}</div><div className="text-[10px] uppercase text-violet-300">{new Date(l.lesson_date + "T12:00").toLocaleDateString("pt-BR", { month: "short" })}</div></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{l.title}</h3>
                      {l.status === "done" && <Badge tone="green">Realizada</Badge>}
                      {l.status === "cancelled" && <Badge tone="red">Cancelada</Badge>}
                      {!l.published && <Badge tone="zinc">Rascunho</Badge>}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-400">{className(l.class_id)} · {l.subject || "Sem assunto"} · {levelLabel(l.level)} {l.start_time && `· ${l.start_time.slice(0, 5)}`}</div>
                    <div className="mt-1 flex gap-3 text-xs text-zinc-500"><span><Paperclip className="inline h-3 w-3" /> {mats.length} anexos</span><span>{acts.length} tarefas</span></div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setView(l)}><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { setForm({ ...l, objectives: l.objectives ?? [] }); setFiles([]); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(l)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Loadable>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Editar aula" : "Nova aula"} wide
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button><Button loading={busy} onClick={save}>Salvar aula</Button></>}>
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título *" className="sm:col-span-2"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Simple Past — viagens de férias" /></Field>
            <Field label="Data"><Input type="date" value={form.lesson_date} onChange={(e) => setForm({ ...form, lesson_date: e.target.value })} /></Field>
            <Field label="Horário"><Input type="time" value={form.start_time?.slice(0, 5) ?? ""} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></Field>
            <Field label="Turma"><Select value={form.class_id ?? ""} onChange={(e) => setForm({ ...form, class_id: e.target.value || null })}><option value="">Todos os meus alunos</option>{data?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Nível"><Select value={form.level ?? ""} onChange={(e) => setForm({ ...form, level: e.target.value || null })}><option value="">—</option>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</Select></Field>
            <Field label="Assunto"><Input list="subjects" value={form.subject ?? ""} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Ex.: Simple Past" /><datalist id="subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist></Field>
            <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="planned">Planejada</option><option value="done">Realizada</option><option value="cancelled">Cancelada</option></Select></Field>
            <Field label="Objetivos de aprendizagem" className="sm:col-span-2">
              <div className="flex gap-2">
                <Input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex.: Usar verbos irregulares no passado"
                  onKeyDown={(e) => { if (e.key === "Enter" && objective.trim()) { e.preventDefault(); setForm({ ...form, objectives: [...form.objectives, objective.trim()] }); setObjective(""); } }} />
                <Button type="button" variant="secondary" onClick={() => { if (objective.trim()) { setForm({ ...form, objectives: [...form.objectives, objective.trim()] }); setObjective(""); } }}>Adicionar</Button>
              </div>
              <ul className="mt-2 space-y-1">{form.objectives.map((o, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-ink-2 px-3 py-1.5 text-sm">🎯 {o}<button type="button" onClick={() => setForm({ ...form, objectives: form.objectives.filter((_, j) => j !== i) })}><X className="h-4 w-4 text-zinc-500" /></button></li>
              ))}</ul>
            </Field>
            <Field label="Conteúdo da aula" hint="Use **negrito** e linhas em branco para separar parágrafos." className="sm:col-span-2"><Textarea className="min-h-40" value={form.content ?? ""} onChange={(e) => setForm({ ...form, content: e.target.value })} /></Field>
            <Field label="Tarefa de casa / orientações" className="sm:col-span-2"><Textarea value={form.homework ?? ""} onChange={(e) => setForm({ ...form, homework: e.target.value })} /></Field>
            <Field label="Anexos (PDF, apresentações, imagens, vídeos, áudios)" className="sm:col-span-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-zinc-400 hover:border-brand/60 hover:text-white">
                <Upload className="h-4 w-4" /> Selecionar arquivos
                <input type="file" multiple className="hidden" onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])} />
              </label>
              {files.length > 0 && <ul className="mt-2 space-y-1 text-sm">{files.map((fl, i) => <li key={i} className="flex justify-between rounded-lg bg-ink-2 px-3 py-1.5">{fl.name}<button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="h-4 w-4" /></button></li>)}</ul>}
              {form.id && data!.mats.filter((m) => m.lesson_id === form.id).map((m) => <div key={m.id} className="mt-1 text-sm">📎 {m.file_path ? <FileLink path={m.file_path} name={m.file_name ?? m.title} /> : m.title}</div>)}
            </Field>
            <div className="space-y-2 sm:col-span-2">
              <Toggle checked={form.published} onChange={(v) => setForm({ ...form, published: v })} label="Visível para os alunos" />
              {!form.id && <Toggle checked={addEvent} onChange={setAddEvent} label={<span className="flex items-center gap-1"><CalendarPlus className="h-4 w-4" /> Adicionar ao calendário</span>} />}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.title ?? ""} wide
        footer={<>
          <Button variant="secondary" icon={<ListPlus className="h-4 w-4" />} onClick={() => nav(`/professora/atividades/nova?aula=${view.id}`)}>Criar tarefa desta aula</Button>
          <Button onClick={() => setView(null)}>Fechar</Button>
        </>}>
        {view && <LessonView lesson={view} className={className(view.class_id)} mats={data!.mats.filter((m) => m.lesson_id === view.id)} acts={data!.acts.filter((a) => a.lesson_id === view.id)} />}
      </Modal>
    </div>
  );
}

export function LessonView({ lesson, className, mats, acts, studentLinks }: { lesson: any; className: string; mats: any[]; acts: any[]; studentLinks?: boolean }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 text-sm text-zinc-400">
        <Badge>{fmtDate(lesson.lesson_date)} {lesson.start_time?.slice(0, 5)}</Badge><Badge tone="zinc">{className}</Badge>
        {lesson.subject && <Badge tone="sky">{lesson.subject}</Badge>}{lesson.level && <Badge tone="zinc">{levelLabel(lesson.level)}</Badge>}
      </div>
      {lesson.objectives?.length > 0 && (
        <div><h4 className="mb-2 font-medium">Objetivos</h4><ul className="space-y-1 text-sm text-zinc-300">{lesson.objectives.map((o: string, i: number) => <li key={i}>🎯 {o}</li>)}</ul></div>
      )}
      {lesson.content && <div><h4 className="mb-2 font-medium">Conteúdo</h4><RichText text={lesson.content} /></div>}
      {lesson.homework && <div className="rounded-xl border border-brand/30 bg-brand/5 p-4"><h4 className="mb-1 font-medium">Tarefa / orientações</h4><RichText text={lesson.homework} /></div>}
      {mats.length > 0 && (
        <div><h4 className="mb-2 font-medium">Materiais</h4>
          <div className="space-y-3">{mats.map((m) => (
            <div key={m.id} className="rounded-xl border border-line p-3">
              <div className="mb-2 text-sm font-medium">{m.title}</div>
              {["audio", "video", "image"].includes(m.kind) ? <MediaView path={m.file_path} url={m.url} kind={m.kind} name={m.title} />
                : m.file_path ? <FileLink path={m.file_path} name={m.file_name} /> : m.url ? <a className="text-sm text-violet-300 underline" href={m.url} target="_blank" rel="noopener">{m.url}</a> : <RichText text={m.body} />}
            </div>
          ))}</div>
        </div>
      )}
      {acts.length > 0 && (
        <div><h4 className="mb-2 font-medium">Tarefas relacionadas</h4>
          <ul className="space-y-1 text-sm">{acts.map((a) => <li key={a.id}><a className="text-violet-300 hover:underline" href={studentLinks ? `/aluno/atividades/${a.id}` : `/professora/atividades/${a.id}`}>📝 {a.title}</a></li>)}</ul>
        </div>
      )}
    </div>
  );
}
