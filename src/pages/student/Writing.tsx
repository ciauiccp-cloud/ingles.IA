import { useState } from "react";
import { PenLine, Sparkles } from "lucide-react";
import { Badge, Button, Card, Loadable, Modal, PageHeader, Progress, Tabs, Textarea, useToast } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { callFn, errMsg, supabase } from "../../lib/supabase";
import { fmtDateTime } from "../../lib/constants";

const PROMPTS: Record<string, string[]> = {
  sentences: ["Write 5 sentences about your daily routine.", "Write 3 sentences about what you did last weekend.", "Describe your best friend in 4 sentences.", "Write 5 sentences about your plans for next year."],
  dialogue: ["Write a dialogue between a customer and a waiter at a restaurant.", "Write a dialogue between two friends planning a trip.", "Write a dialogue at a hotel reception.", "Write a dialogue between a student and a teacher about homework."],
  text: ["Write a short text (80–120 words) about your city.", "Write an email to a friend inviting them to your birthday party.", "Write a short story that starts with: 'It was a rainy night...'", "Write about a movie you watched recently and why you liked it."],
};

export default function Writing() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [kind, setKind] = useState<"sentences" | "dialogue" | "text">("sentences");
  const [prompt, setPrompt] = useState(PROMPTS.sentences[0]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState<any>(null);
  const [view, setView] = useState<any>(null);
  const hist = useAsync(async () => must(await supabase.from("writing_entries").select("*").eq("student_id", profile!.id).order("created_at", { ascending: false }).limit(20)) as any[]);

  const submit = async () => {
    if (text.trim().length < 10) return toast("Escreva um pouco mais antes de enviar.", "error");
    setBusy(true);
    try { const r = await callFn("ai", { action: "writing_feedback", text, prompt }); setFb(r); hist.reload(); refreshProfile(); }
    catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Writing — escrita" subtitle="Escreva em inglês e receba correção gramatical e sugestões da IA" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Tabs value={kind} onChange={(k) => { setKind(k); setPrompt(PROMPTS[k][0]); }} tabs={[{ value: "sentences", label: "Produção de frases" }, { value: "dialogue", label: "Diálogos" }, { value: "text", label: "Pequenos textos" }]} />
          <Card className="space-y-3">
            <div className="text-sm font-medium">Proposta</div>
            <div className="flex flex-wrap gap-2">{PROMPTS[kind].map((p) => <button key={p} onClick={() => setPrompt(p)} className={`rounded-lg border px-3 py-1.5 text-left text-xs ${prompt === p ? "border-brand bg-brand/15" : "border-line text-zinc-400 hover:text-white"}`}>{p}</button>)}</div>
            <Textarea className="min-h-56 text-[15px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Start writing here…" />
            <div className="flex items-center justify-between text-xs text-zinc-500"><span>{text.trim().split(/\s+/).filter(Boolean).length} palavras</span><Button loading={busy} icon={<Sparkles className="h-4 w-4" />} onClick={submit}>Corrigir com IA</Button></div>
          </Card>
          {fb && <Feedback fb={fb} />}
        </div>
        <Card>
          <h3 className="mb-3 font-medium">Meus textos</h3>
          <Loadable loading={hist.loading} error={hist.error}>
            {(hist.data ?? []).length === 0 ? <p className="text-sm text-zinc-500">Nenhum texto enviado ainda.</p> : (
              <ul className="space-y-2">{hist.data!.map((h) => (
                <li key={h.id}><button onClick={() => setView(h)} className="w-full rounded-xl border border-line p-3 text-left text-sm hover:border-brand/40">
                  <div className="flex justify-between"><PenLine className="h-4 w-4 text-violet-300" /><Badge tone={h.score >= 70 ? "green" : "amber"}>{h.score}</Badge></div>
                  <div className="mt-1 line-clamp-2 text-zinc-300">{h.text}</div><div className="mt-1 text-xs text-zinc-500">{fmtDateTime(h.created_at)}</div>
                </button></li>
              ))}</ul>
            )}
          </Loadable>
        </Card>
      </div>
      <Modal open={!!view} onClose={() => setView(null)} title="Correção" wide footer={<Button onClick={() => setView(null)}>Fechar</Button>}>
        {view && <><p className="mb-2 text-xs text-zinc-500">{view.prompt}</p><p className="mb-4 whitespace-pre-wrap rounded-xl bg-ink-2 p-3 text-sm">{view.text}</p>{view.feedback && <Feedback fb={view.feedback} />}</>}
      </Modal>
    </div>
  );
}

function Feedback({ fb }: { fb: any }) {
  return (
    <Card className="space-y-4 animate-fade-up">
      <div className="flex items-center gap-4">
        <div className="font-display text-4xl font-bold text-gradient">{fb.score}</div>
        <div className="flex-1"><Progress value={fb.score} /><div className="mt-1 text-xs text-zinc-400">Nível estimado: {fb.level_estimate}</div></div>
      </div>
      {fb.praise_pt && <p className="text-sm text-emerald-300">👏 {fb.praise_pt}</p>}
      <div><div className="mb-1 text-sm font-medium">Texto corrigido</div><p className="whitespace-pre-wrap rounded-xl bg-ink-2 p-3 text-sm text-emerald-100">{fb.corrected_text}</p></div>
      {fb.errors?.length > 0 && (
        <div><div className="mb-2 text-sm font-medium">Correções</div>
          <ul className="space-y-2">{fb.errors.map((e: any, i: number) => (
            <li key={i} className="rounded-xl border border-line p-3 text-sm"><span className="text-rose-300 line-through">{e.original}</span> → <span className="text-emerald-300">{e.corrected}</span><div className="mt-1 text-xs text-zinc-400">{e.explanation_pt}</div></li>
          ))}</ul>
        </div>
      )}
      {fb.suggestions_pt?.length > 0 && <div><div className="mb-1 text-sm font-medium">Sugestões</div><ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">{fb.suggestions_pt.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>}
    </Card>
  );
}
