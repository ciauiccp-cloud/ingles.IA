import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Bookmark, Database, Plus, Sparkles, Trash2 } from "lucide-react";
import { Badge, Button, Card, Field, Input, Loadable, Modal, PageHeader, Select, Spinner, Textarea, Toggle, useToast } from "../../components/ui";
import { QuestionEditor, cleanData, newQuestion, validateQuestion, type QDraft } from "../../components/QuestionEditor";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { callFn, errMsg, supabase } from "../../lib/supabase";
import { fetchClasses, fetchStudents } from "../../lib/data";
import { CATEGORIES, LEVELS, categoryLabel, qTypeLabel } from "../../lib/constants";

type Act = {
  id?: string; title: string; description: string; category: string; class_id: string | null; student_id: string | null; lesson_id: string | null;
  due_date: string | null; time_limit_minutes: number | null; max_attempts: number; feedback_mode: string; published: boolean;
};

const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default function ActivityEditor() {
  const { id } = useParams();
  const isNew = id === "nova";
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { profile } = useAuth();
  const { toast, confirm } = useToast();
  const [act, setAct] = useState<Act | null>(null);
  const [questions, setQuestions] = useState<QDraft[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const meta = useAsync(async () => {
    const [classes, students, lessons] = await Promise.all([
      fetchClasses(), fetchStudents(profile!.id), supabase.from("lessons").select("id, title, lesson_date").order("lesson_date", { ascending: false }).then(must),
    ]);
    return { classes, students, lessons: lessons as any[] };
  });

  useEffect(() => {
    (async () => {
      if (isNew) {
        const lessonId = params.get("aula");
        let class_id: string | null = null;
        if (lessonId) {
          const { data } = await supabase.from("lessons").select("class_id").eq("id", lessonId).single();
          class_id = data?.class_id ?? null;
        }
        setAct({ title: "", description: "", category: "grammar", class_id, student_id: null, lesson_id: lessonId, due_date: null, time_limit_minutes: null, max_attempts: 1, feedback_mode: "immediate", published: false });
        setQuestions([newQuestion()]);
        return;
      }
      const { data: a, error } = await supabase.from("activities").select("*").eq("id", id).single();
      if (error) { toast(errMsg(error), "error"); return; }
      setAct({ ...a, description: a.description ?? "" });
      const { data: qs } = await supabase.from("questions").select("*").eq("activity_id", id).order("position");
      setQuestions((qs ?? []).map((q: any) => ({ ...q, points: Number(q.points) })));
    })();
  }, [id]);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const qs = [...questions];
    [qs[i], qs[j]] = [qs[j], qs[i]];
    setQuestions(qs);
  };

  const save = async (publish?: boolean) => {
    if (!act) return;
    if (!act.title.trim()) return toast("Informe o título da atividade.", "error");
    if (questions.length === 0) return toast("Adicione ao menos uma questão.", "error");
    for (const q of questions) { const err = validateQuestion(q); if (err) return toast(err, "error"); }
    setSaving(true);
    try {
      const payload = {
        title: act.title.trim(), description: act.description || null, category: act.category, class_id: act.student_id ? null : act.class_id,
        student_id: act.student_id, lesson_id: act.lesson_id, due_date: act.due_date, time_limit_minutes: act.time_limit_minutes || null,
        max_attempts: act.max_attempts, feedback_mode: act.feedback_mode, published: publish ?? act.published,
      };
      let actId = act.id;
      // salva questões antes de publicar (a notificação dispara na publicação)
      if (!actId) {
        const r = await supabase.from("activities").insert({ ...payload, published: false }).select().single();
        if (r.error) throw r.error;
        actId = r.data.id;
      }
      for (const qid of removed) await supabase.from("questions").delete().eq("id", qid);
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const row = {
          activity_id: actId, position: i, type: q.type, category: q.category, level: q.level ?? null, prompt: q.prompt.trim(),
          passage: q.passage || null, media_path: q.media_path || null, media_url: q.media_url || null, data: cleanData(q), points: q.points || 0, in_bank: false,
        };
        const r = q.id ? await supabase.from("questions").update(row).eq("id", q.id) : await supabase.from("questions").insert(row);
        if (r.error) throw r.error;
      }
      const r = await supabase.from("activities").update(payload).eq("id", actId);
      if (r.error) throw r.error;
      toast(payload.published ? "Atividade publicada! Os alunos foram notificados." : "Rascunho salvo.");
      if (isNew) nav(`/professora/atividades/${actId}`, { replace: true });
      else {
        setAct({ ...act, published: payload.published });
        const { data: qs } = await supabase.from("questions").select("*").eq("activity_id", actId).order("position");
        setQuestions((qs ?? []).map((q: any) => ({ ...q, points: Number(q.points) }))); setRemoved([]);
      }
    } catch (e) { toast(errMsg(e), "error"); } finally { setSaving(false); }
  };

  const saveToBank = async (q: QDraft) => {
    const err = validateQuestion(q); if (err) return toast(err, "error");
    const { error } = await supabase.from("questions").insert({
      type: q.type, category: q.category, level: q.level ?? null, prompt: q.prompt, passage: q.passage || null,
      media_path: q.media_path || null, media_url: q.media_url || null, data: cleanData(q), points: q.points, in_bank: true, activity_id: null,
    });
    if (error) return toast(errMsg(error), "error");
    toast("Questão salva no banco de questões.");
  };

  const total = questions.reduce((a, q) => a + (Number(q.points) || 0), 0);

  if (!act) return <Spinner />;
  return (
    <div>
      <Link to="/professora/atividades" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Atividades</Link>
      <PageHeader title={isNew ? "Nova atividade" : act.title || "Editar atividade"} subtitle={<span>{questions.length} questões · {total} pontos {act.published ? <Badge tone="green">Publicada</Badge> : <Badge tone="zinc">Rascunho</Badge>}</span>}
        actions={<>
          <Button variant="secondary" loading={saving} onClick={() => save(false)}>{act.published ? "Despublicar" : "Salvar rascunho"}</Button>
          <Button loading={saving} onClick={() => save(true)}>{act.published ? "Salvar" : "Publicar"}</Button>
        </>} />

      <Loadable loading={meta.loading} error={meta.error}>
        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <Card className="h-fit space-y-4 xl:sticky xl:top-20">
            <Field label="Título *"><Input value={act.title} onChange={(e) => setAct({ ...act, title: e.target.value })} /></Field>
            <Field label="Instruções"><Textarea value={act.description} onChange={(e) => setAct({ ...act, description: e.target.value })} /></Field>
            <Field label="Categoria"><Select value={act.category} onChange={(e) => setAct({ ...act, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></Field>
            <Field label="Destinatários">
              <Select value={act.student_id ? `s:${act.student_id}` : act.class_id ? `c:${act.class_id}` : ""} onChange={(e) => {
                const v = e.target.value;
                setAct({ ...act, class_id: v.startsWith("c:") ? v.slice(2) : null, student_id: v.startsWith("s:") ? v.slice(2) : null });
              }}>
                <option value="">Todos os meus alunos</option>
                <optgroup label="Turmas">{meta.data?.classes.map((c) => <option key={c.id} value={`c:${c.id}`}>{c.name}</option>)}</optgroup>
                <optgroup label="Aluno individual">{meta.data?.students.map((s) => <option key={s.id} value={`s:${s.id}`}>{s.full_name}</option>)}</optgroup>
              </Select>
            </Field>
            <Field label="Aula relacionada"><Select value={act.lesson_id ?? ""} onChange={(e) => setAct({ ...act, lesson_id: e.target.value || null })}><option value="">Nenhuma</option>{meta.data?.lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</Select></Field>
            <Field label="Prazo de entrega"><Input type="datetime-local" value={toLocalInput(act.due_date)} onChange={(e) => setAct({ ...act, due_date: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cronômetro (min)" hint="Vazio = sem limite"><Input type="number" min={1} value={act.time_limit_minutes ?? ""} onChange={(e) => setAct({ ...act, time_limit_minutes: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label="Tentativas" hint="0 = ilimitadas"><Input type="number" min={0} value={act.max_attempts} onChange={(e) => setAct({ ...act, max_attempts: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Feedback ao aluno">
              <Select value={act.feedback_mode} onChange={(e) => setAct({ ...act, feedback_mode: e.target.value })}>
                <option value="immediate">Imediato (questões objetivas)</option>
                <option value="after_release">Somente após liberação da professora</option>
              </Select>
            </Field>
            <p className="text-xs text-zinc-500">Questões discursivas e de tradução recebem uma correção sugerida pela IA e só são liberadas depois da sua revisão.</p>
          </Card>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <Card key={q.id ?? `n${i}`} className="animate-fade-up">
                <div className="mb-3 flex items-center justify-between">
                  <Badge>{i + 1}. {qTypeLabel(q.type)} · {categoryLabel(q.category)}</Badge>
                  <div className="flex">
                    <Button size="sm" variant="ghost" onClick={() => move(i, -1)} title="Subir"><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => move(i, 1)} title="Descer"><ArrowDown className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => saveToBank(q)} title="Salvar no banco de questões"><Bookmark className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" title="Remover" onClick={async () => {
                      if (q.prompt && !(await confirm("Remover esta questão?"))) return;
                      if (q.id) setRemoved([...removed, q.id]);
                      setQuestions(questions.filter((_, j) => j !== i));
                    }}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                  </div>
                </div>
                <QuestionEditor q={q} index={i} teacherId={profile!.id} onChange={(nq) => setQuestions(questions.map((x, j) => (j === i ? nq : x)))} />
              </Card>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setQuestions([...questions, newQuestion("multiple_choice", act.category)])}>Adicionar questão</Button>
              <Button variant="secondary" icon={<Database className="h-4 w-4" />} onClick={() => setBankOpen(true)}>Do banco de questões</Button>
              <Button variant="outline" icon={<Sparkles className="h-4 w-4" />} onClick={() => setAiOpen(true)}>Gerar com IA</Button>
            </div>
          </div>
        </div>
      </Loadable>

      <BankPicker open={bankOpen} onClose={() => setBankOpen(false)} onPick={(qs) => {
        setQuestions([...questions, ...qs.map(({ id: _id, ...q }: any) => ({ ...q, points: Number(q.points) }))]);
        setBankOpen(false);
      }} />
      <AiGenerator open={aiOpen} onClose={() => setAiOpen(false)} category={act.category} onDone={(qs) => { setQuestions([...questions.filter((q) => q.prompt.trim()), ...qs]); setAiOpen(false); }} />
    </div>
  );
}

function BankPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (q: any[]) => void }) {
  const [cat, setCat] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const { data, loading, error } = useAsync(async () => (open ? (must(await supabase.from("questions").select("*").eq("in_bank", true).order("created_at", { ascending: false })) as any[]) : []), [open]);
  const list = (data ?? []).filter((q) => !cat || q.category === cat);
  return (
    <Modal open={open} onClose={onClose} title="Banco de questões" wide
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button disabled={!sel.length} onClick={() => { onPick(list.filter((q) => sel.includes(q.id))); setSel([]); }}>Adicionar {sel.length || ""}</Button></>}>
      <Select className="mb-3" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas as categorias</option>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select>
      <Loadable loading={loading} error={error}>
        {list.length === 0 ? <p className="py-6 text-center text-sm text-zinc-500">Nenhuma questão salva no banco. Use o ícone de marcador em uma questão para salvá-la.</p> : (
          <ul className="space-y-2">{list.map((q) => (
            <li key={q.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 hover:border-brand/40">
                <input type="checkbox" className="mt-1 accent-violet-500" checked={sel.includes(q.id)} onChange={(e) => setSel(e.target.checked ? [...sel, q.id] : sel.filter((x) => x !== q.id))} />
                <div><div className="text-sm">{q.prompt}</div><div className="mt-1 flex gap-1"><Badge>{qTypeLabel(q.type)}</Badge><Badge tone="zinc">{categoryLabel(q.category)}</Badge></div></div>
              </label>
            </li>
          ))}</ul>
        )}
      </Loadable>
    </Modal>
  );
}

function AiGenerator({ open, onClose, onDone, category }: { open: boolean; onClose: () => void; onDone: (q: QDraft[]) => void; category: string }) {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("elementary");
  const [count, setCount] = useState(5);
  const [types, setTypes] = useState<string[]>(["multiple_choice", "fill_blank"]);
  const [busy, setBusy] = useState(false);
  const all = [["multiple_choice", "Múltipla escolha"], ["true_false", "V ou F"], ["fill_blank", "Completar"], ["ordering", "Organizar palavras"], ["translation", "Tradução"], ["open", "Discursiva"]];
  const gen = async () => {
    if (!topic.trim()) return toast("Descreva o assunto.", "error");
    setBusy(true);
    try {
      const r = await callFn<{ questions: any[] }>("ai", { action: "generate_questions", topic, level, count, types });
      onDone(r.questions.map((q) => {
        const base: QDraft = { type: q.type, category, level, prompt: q.prompt, points: 1, data: {} };
        if (q.type === "multiple_choice" || q.type === "true_false") base.data = { options: q.options, answer: q.answer };
        else if (q.type === "fill_blank") base.data = { answers: q.answers };
        else if (q.type === "ordering") base.data = { words: q.words };
        else base.data = { reference: q.reference, rubric: "" };
        return base;
      }));
      toast("Questões geradas. Revise antes de publicar.");
    } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Gerar questões com IA"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button loading={busy} icon={<Sparkles className="h-4 w-4" />} onClick={gen}>Gerar</Button></>}>
      <div className="space-y-4">
        <Field label="Assunto"><Textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: Simple Past com verbos irregulares, contexto de viagens" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nível"><Select value={level} onChange={(e) => setLevel(e.target.value)}>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.short}</option>)}</Select></Field>
          <Field label="Quantidade"><Input type="number" min={1} max={15} value={count} onChange={(e) => setCount(Number(e.target.value))} /></Field>
        </div>
        <Field label="Tipos">
          <div className="flex flex-wrap gap-2">{all.map(([v, l]) => (
            <Toggle key={v} checked={types.includes(v)} onChange={(on) => setTypes(on ? [...types, v] : types.filter((t) => t !== v))} label={l} />
          ))}</div>
        </Field>
        <p className="text-xs text-zinc-500">A IA cria um rascunho. Revise as questões e gabaritos antes de publicar.</p>
      </div>
    </Modal>
  );
}
