import { useMemo, useState } from "react";
import { Lock, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { Badge, Button, Card, Empty, Field, Input, Loadable, Modal, PageHeader, Select, Tabs, Textarea, Toggle, useToast } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { errMsg, supabase, uploadFile } from "../../lib/supabase";
import { fetchClasses } from "../../lib/data";
import { LEVELS, levelLabel } from "../../lib/constants";

/** Gestão de vocabulário, gramática e textos de Listening/Reading. Conteúdo base (sem dono) é somente leitura. */
export default function Content() {
  const [tab, setTab] = useState<"vocab" | "grammar" | "texts">("vocab");
  return (
    <div>
      <PageHeader title="Conteúdos de aprendizagem" subtitle="Vocabulário, gramática e textos de Listening e Reading. O conteúdo base da plataforma pode ser complementado com o seu." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "vocab", label: "Vocabulário" }, { value: "grammar", label: "Gramática" }, { value: "texts", label: "Listening e Reading" }]} />
      {tab === "vocab" && <VocabAdmin />}
      {tab === "grammar" && <GrammarAdmin />}
      {tab === "texts" && <TextsAdmin />}
    </div>
  );
}

const BaseTag = () => <Badge tone="zinc"><Lock className="h-3 w-3" /> Conteúdo base</Badge>;

function VocabAdmin() {
  const { toast, confirm } = useToast();
  const { data, loading, error, reload } = useAsync(async () => must(await supabase.from("vocab_words").select("*").order("category").order("word")) as any[]);
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<any>(null);
  const [bulk, setBulk] = useState<{ category: string; level: string; text: string } | null>(null);
  const cats = useMemo(() => [...new Set((data ?? []).map((w) => w.category))].sort(), [data]);
  const list = (data ?? []).filter((w) => (!cat || w.category === cat) && (!q || `${w.word} ${w.translation}`.toLowerCase().includes(q.toLowerCase())));

  const save = async () => {
    if (!form.word?.trim() || !form.translation?.trim() || !form.category?.trim()) return toast("Preencha palavra, tradução e categoria.", "error");
    const { teacher_id, created_at, id, ...row } = form;
    const r = id ? await supabase.from("vocab_words").update(row).eq("id", id) : await supabase.from("vocab_words").insert({ ...row, teacher_id: (await supabase.auth.getUser()).data.user!.id });
    if (r.error) return toast(errMsg(r.error), "error");
    toast("Palavra salva."); setForm(null); reload();
  };
  const saveBulk = async () => {
    if (!bulk) return;
    const uid = (await supabase.auth.getUser()).data.user!.id;
    const rows = bulk.text.split("\n").map((l) => l.split(/\s*[;|\t]\s*|\s+[—–-]\s+/)).filter((p) => p[0]?.trim() && p[1]?.trim())
      .map((p) => ({ teacher_id: uid, category: bulk.category || "Geral", level: bulk.level, word: p[0].trim(), translation: p[1].trim(), example: p[2]?.trim() || null }));
    if (!rows.length) return toast("Nenhuma linha válida. Use: palavra — tradução — exemplo (opcional).", "error");
    const { error } = await supabase.from("vocab_words").insert(rows);
    if (error) return toast(errMsg(error), "error");
    toast(`${rows.length} palavras adicionadas.`); setBulk(null); reload();
  };
  const remove = async (w: any) => { if (await confirm(`Excluir "${w.word}"?`, { danger: true })) { await supabase.from("vocab_words").delete().eq("id", w.id); reload(); } };

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><Input className="pl-9" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select className="sm:w-52" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas as categorias</option>{cats.map((c) => <option key={c}>{c}</option>)}</Select>
        <Button variant="secondary" onClick={() => setBulk({ category: "", level: "beginner", text: "" })}>Lista em lote</Button>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ level: "beginner", category: cat })}>Palavra</Button>
      </div>
      <Loadable loading={loading} error={error} reload={reload}>
        {list.length === 0 ? <Empty title="Nenhuma palavra" /> : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase text-zinc-500"><tr><th className="px-4 py-3">Palavra</th><th className="px-4 py-3">Tradução</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Exemplo</th><th /></tr></thead>
              <tbody>{list.map((w) => (
                <tr key={w.id} className="border-b border-line/60">
                  <td className="px-4 py-2.5 font-medium">{w.word} <span className="text-xs text-zinc-500">{w.pronunciation}</span></td>
                  <td className="px-4 py-2.5">{w.translation}</td>
                  <td className="px-4 py-2.5"><Badge tone="zinc">{w.category}</Badge></td>
                  <td className="px-4 py-2.5 text-zinc-400">{w.example}</td>
                  <td className="px-4 py-2.5 text-right">{w.teacher_id ? <><Button size="sm" variant="ghost" onClick={() => setForm(w)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => remove(w)}><Trash2 className="h-4 w-4 text-rose-400" /></Button></> : <BaseTag />}</td>
                </tr>
              ))}</tbody>
            </table>
          </Card>
        )}
      </Loadable>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Editar palavra" : "Nova palavra"} footer={<><Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        {form && <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Palavra / expressão *"><Input value={form.word ?? ""} onChange={(e) => setForm({ ...form, word: e.target.value })} /></Field>
          <Field label="Tradução *"><Input value={form.translation ?? ""} onChange={(e) => setForm({ ...form, translation: e.target.value })} /></Field>
          <Field label="Categoria *"><Input list="vcats" value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} /><datalist id="vcats">{cats.map((c) => <option key={c} value={c} />)}</datalist></Field>
          <Field label="Pronúncia (IPA)"><Input value={form.pronunciation ?? ""} onChange={(e) => setForm({ ...form, pronunciation: e.target.value })} placeholder="/ˈwɜːrd/" /></Field>
          <Field label="Exemplo em inglês" className="sm:col-span-2"><Input value={form.example ?? ""} onChange={(e) => setForm({ ...form, example: e.target.value })} /></Field>
          <Field label="Tradução do exemplo" className="sm:col-span-2"><Input value={form.example_translation ?? ""} onChange={(e) => setForm({ ...form, example_translation: e.target.value })} /></Field>
          <Field label="Nível"><Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.short}</option>)}</Select></Field>
        </div>}
      </Modal>
      <Modal open={!!bulk} onClose={() => setBulk(null)} title="Adicionar lista de vocabulário" footer={<><Button variant="ghost" onClick={() => setBulk(null)}>Cancelar</Button><Button onClick={saveBulk}>Adicionar</Button></>}>
        {bulk && <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria"><Input list="vcats" value={bulk.category} onChange={(e) => setBulk({ ...bulk, category: e.target.value })} /></Field>
            <Field label="Nível"><Select value={bulk.level} onChange={(e) => setBulk({ ...bulk, level: e.target.value })}>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.short}</option>)}</Select></Field>
          </div>
          <Field label="Uma palavra por linha" hint="Formato: palavra — tradução — exemplo (opcional). Também aceita ; ou | como separador.">
            <Textarea className="min-h-48 font-mono" value={bulk.text} onChange={(e) => setBulk({ ...bulk, text: e.target.value })} placeholder={"umbrella — guarda-chuva — Take your umbrella.\nraincoat — capa de chuva"} />
          </Field>
        </div>}
      </Modal>
    </>
  );
}

function GrammarAdmin() {
  const { toast, confirm } = useToast();
  const { data, loading, error, reload } = useAsync(async () => must(await supabase.from("grammar_topics").select("*").order("position").order("created_at")) as any[]);
  const [form, setForm] = useState<any>(null);
  const save = async () => {
    if (!form.title?.trim() || !form.explanation?.trim()) return toast("Preencha título e explicação.", "error");
    let examples, exercises;
    try {
      examples = form.examplesText.split("\n").filter((l: string) => l.trim()).map((l: string) => { const [en, pt] = l.split(/\s*[|]\s*/); return { en: en.trim(), pt: (pt ?? "").trim() }; });
      exercises = form.exercises;
    } catch { return toast("Exemplos inválidos.", "error"); }
    const row = { title: form.title, level: form.level, summary: form.summary || null, explanation: form.explanation, examples, exercises, position: form.position ?? 100 };
    const r = form.id ? await supabase.from("grammar_topics").update(row).eq("id", form.id) : await supabase.from("grammar_topics").insert({ ...row, teacher_id: (await supabase.auth.getUser()).data.user!.id });
    if (r.error) return toast(errMsg(r.error), "error");
    toast("Tópico salvo."); setForm(null); reload();
  };
  const ex = form?.exercises ?? [];
  const setEx = (i: number, patch: any) => setForm({ ...form, exercises: ex.map((e: any, j: number) => (j === i ? { ...e, ...patch } : e)) });
  return (
    <>
      <div className="mb-4 flex justify-end"><Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ level: "beginner", examplesText: "", exercises: [] })}>Novo tópico</Button></div>
      <Loadable loading={loading} error={error} reload={reload}>
        <div className="grid gap-3 md:grid-cols-2">{data?.map((g) => (
          <Card key={g.id} className="flex items-start justify-between gap-2">
            <div><div className="font-medium">{g.title}</div><div className="mt-1 text-xs text-zinc-400">{g.summary}</div><div className="mt-2 flex gap-1"><Badge>{levelLabel(g.level)}</Badge><Badge tone="zinc">{g.exercises?.length ?? 0} exercícios</Badge></div></div>
            {g.teacher_id ? <div className="flex"><Button size="sm" variant="ghost" onClick={() => setForm({ ...g, examplesText: (g.examples ?? []).map((e: any) => `${e.en} | ${e.pt}`).join("\n") })}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={async () => { if (await confirm(`Excluir "${g.title}"?`, { danger: true })) { await supabase.from("grammar_topics").delete().eq("id", g.id); reload(); } }}><Trash2 className="h-4 w-4 text-rose-400" /></Button></div> : <BaseTag />}
          </Card>
        ))}</div>
      </Loadable>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Editar tópico" : "Novo tópico de gramática"} wide footer={<><Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        {form && <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Título *" className="sm:col-span-2"><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Nível"><Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.short}</option>)}</Select></Field>
          </div>
          <Field label="Resumo"><Input value={form.summary ?? ""} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
          <Field label="Explicação (em português) *" hint="Use **negrito** e *itálico*."><Textarea className="min-h-40" value={form.explanation ?? ""} onChange={(e) => setForm({ ...form, explanation: e.target.value })} /></Field>
          <Field label="Exemplos" hint="Um por linha: frase em inglês | tradução"><Textarea value={form.examplesText} onChange={(e) => setForm({ ...form, examplesText: e.target.value })} /></Field>
          <div>
            <div className="mb-2 text-sm font-medium text-zinc-300">Exercícios (múltipla escolha)</div>
            <div className="space-y-3">{ex.map((e: any, i: number) => (
              <div key={i} className="space-y-2 rounded-xl border border-line p-3">
                <div className="flex gap-2"><Input placeholder="Enunciado (use ___ para a lacuna)" value={e.prompt} onChange={(ev) => setEx(i, { prompt: ev.target.value })} /><Button size="sm" variant="ghost" onClick={() => setForm({ ...form, exercises: ex.filter((_: any, j: number) => j !== i) })}><Trash2 className="h-4 w-4 text-rose-400" /></Button></div>
                <div className="grid gap-2 sm:grid-cols-3">{[0, 1, 2].map((k) => (
                  <label key={k} className="flex items-center gap-2"><input type="radio" className="accent-violet-500" checked={e.answer === k} onChange={() => setEx(i, { answer: k })} /><Input placeholder={`Opção ${k + 1}`} value={e.options[k] ?? ""} onChange={(ev) => { const o = [...e.options]; o[k] = ev.target.value; setEx(i, { options: o }); }} /></label>
                ))}</div>
                <Input placeholder="Explicação da resposta" value={e.explanation ?? ""} onChange={(ev) => setEx(i, { explanation: ev.target.value })} />
              </div>
            ))}</div>
            <Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} className="mt-2" onClick={() => setForm({ ...form, exercises: [...ex, { prompt: "", options: ["", "", ""], answer: 0, explanation: "" }] })}>Exercício</Button>
          </div>
        </div>}
      </Modal>
    </>
  );
}

function TextsAdmin() {
  const { profile } = useAuth();
  const { toast, confirm } = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [texts, classes] = await Promise.all([supabase.from("practice_texts").select("*").order("skill").order("created_at", { ascending: false }).then(must), fetchClasses()]);
    return { texts: texts as any[], classes };
  });
  const [form, setForm] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.title?.trim() || !form.body?.trim()) return toast("Preencha título e texto/transcrição.", "error");
    if (form.questions.some((q: any) => !q.prompt.trim() || q.options.filter((o: string) => o.trim()).length < 2)) return toast("Complete as questões (enunciado e ao menos 2 opções).", "error");
    setBusy(true);
    try {
      let audio_path = form.audio_path ?? null;
      if (file) audio_path = (await uploadFile(profile!.id, file)).path;
      const glossary = (form.glossaryText ?? "").split("\n").filter((l: string) => l.includes("|")).map((l: string) => { const [w, t] = l.split("|"); return { word: w.trim(), translation: t.trim() }; });
      const row = { skill: form.skill, genre: form.genre, title: form.title, level: form.level, body: form.body, audio_path, video_url: form.video_url || null, glossary, questions: form.questions, class_id: form.class_id || null, published: form.published ?? true };
      const r = form.id ? await supabase.from("practice_texts").update(row).eq("id", form.id) : await supabase.from("practice_texts").insert({ ...row, teacher_id: profile!.id });
      if (r.error) throw r.error;
      toast("Texto salvo."); setForm(null); setFile(null); reload();
    } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  };
  const qs = form?.questions ?? [];
  const setQ = (i: number, patch: any) => setForm({ ...form, questions: qs.map((q: any, j: number) => (j === i ? { ...q, ...patch } : q)) });
  return (
    <>
      <div className="mb-4 flex justify-end"><Button icon={<Plus className="h-4 w-4" />} onClick={() => { setForm({ skill: "reading", genre: "story", level: "beginner", questions: [], glossaryText: "", published: true }); setFile(null); }}>Novo texto</Button></div>
      <Loadable loading={loading} error={error} reload={reload}>
        <div className="grid gap-3 md:grid-cols-2">{data?.texts.map((t) => (
          <Card key={t.id} className="flex items-start justify-between gap-2">
            <div><div className="font-medium">{t.skill === "listening" ? "🎧" : "📖"} {t.title}</div><div className="mt-2 flex flex-wrap gap-1"><Badge>{levelLabel(t.level)}</Badge><Badge tone="zinc">{t.questions?.length ?? 0} questões</Badge>{t.audio_path && <Badge tone="sky">áudio</Badge>}</div></div>
            {t.teacher_id ? <div className="flex"><Button size="sm" variant="ghost" onClick={() => { setForm({ ...t, glossaryText: (t.glossary ?? []).map((g: any) => `${g.word} | ${g.translation}`).join("\n") }); setFile(null); }}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={async () => { if (await confirm(`Excluir "${t.title}"?`, { danger: true })) { await supabase.from("practice_texts").delete().eq("id", t.id); reload(); } }}><Trash2 className="h-4 w-4 text-rose-400" /></Button></div> : <BaseTag />}
          </Card>
        ))}</div>
      </Loadable>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Editar texto" : "Novo texto"} wide footer={<><Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button><Button loading={busy} onClick={save}>Salvar</Button></>}>
        {form && <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Módulo"><Select value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })}><option value="reading">Reading</option><option value="listening">Listening</option></Select></Field>
            <Field label="Gênero"><Select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}><option value="story">História curta</option><option value="news">Notícia adaptada</option><option value="dialogue">Diálogo</option><option value="article">Artigo</option><option value="other">Outro</option></Select></Field>
            <Field label="Nível"><Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.short}</option>)}</Select></Field>
            <Field label="Turma"><Select value={form.class_id ?? ""} onChange={(e) => setForm({ ...form, class_id: e.target.value })}><option value="">Todos</option>{data?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          </div>
          <Field label="Título *"><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label={form.skill === "listening" ? "Transcrição *" : "Texto *"} hint={form.skill === "listening" ? "Sem arquivo de áudio, a plataforma lê a transcrição com voz sintetizada em inglês." : undefined}><Textarea className="min-h-40" value={form.body ?? ""} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          {form.skill === "listening" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-zinc-400 hover:border-brand/60"><Upload className="h-4 w-4" />{file ? file.name : form.audio_path ? "Substituir áudio" : "Enviar áudio (opcional)"}<input type="file" accept="audio/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
              <Input placeholder="Link de vídeo com o diálogo (opcional)" value={form.video_url ?? ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
            </div>
          )}
          <Field label="Glossário" hint="Uma por linha: palavra | tradução"><Textarea value={form.glossaryText} onChange={(e) => setForm({ ...form, glossaryText: e.target.value })} /></Field>
          <div>
            <div className="mb-2 text-sm font-medium text-zinc-300">Questões de compreensão</div>
            <div className="space-y-3">{qs.map((q: any, i: number) => (
              <div key={i} className="space-y-2 rounded-xl border border-line p-3">
                <div className="flex gap-2"><Input placeholder="Pergunta" value={q.prompt} onChange={(e) => setQ(i, { prompt: e.target.value })} /><Button size="sm" variant="ghost" onClick={() => setForm({ ...form, questions: qs.filter((_: any, j: number) => j !== i) })}><Trash2 className="h-4 w-4 text-rose-400" /></Button></div>
                <div className="grid gap-2 sm:grid-cols-3">{[0, 1, 2].map((k) => (
                  <label key={k} className="flex items-center gap-2"><input type="radio" className="accent-violet-500" checked={q.answer === k} onChange={() => setQ(i, { answer: k })} /><Input placeholder={`Opção ${k + 1}`} value={q.options[k] ?? ""} onChange={(e) => { const o = [...q.options]; o[k] = e.target.value; setQ(i, { options: o }); }} /></label>
                ))}</div>
              </div>
            ))}</div>
            <Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} className="mt-2" onClick={() => setForm({ ...form, questions: [...qs, { prompt: "", options: ["", "", ""], answer: 0 }] })}>Questão</Button>
          </div>
          <Toggle checked={form.published ?? true} onChange={(v) => setForm({ ...form, published: v })} label="Visível para os alunos" />
        </div>}
      </Modal>
    </>
  );
}
