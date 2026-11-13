import { useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Badge, Button, Card, Empty, Loadable, PageHeader, Progress, RichText, cx, useToast } from "../../components/ui";
import { SpeakButton } from "../../components/QuestionRunner";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { errMsg, supabase } from "../../lib/supabase";
import { levelLabel } from "../../lib/constants";

export default function Grammar() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [topics, prog] = await Promise.all([
      supabase.from("grammar_topics").select("*").order("position").order("created_at").then(must),
      supabase.from("grammar_progress").select("*").eq("student_id", profile!.id).then(must),
    ]);
    return { topics: topics as any[], prog: prog as any[] };
  });
  const [open, setOpen] = useState<any>(null);
  const [ans, setAns] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);

  const check = async () => {
    const ex = open.exercises ?? [];
    if (Object.keys(ans).length < ex.length) return toast("Responda todos os exercícios.", "error");
    const correct = ex.filter((e: any, i: number) => ans[i] === e.answer).length;
    const score = Math.round((correct / ex.length) * 100);
    setChecked(true);
    const { error } = await supabase.rpc("save_grammar_score", { tid: open.id, score });
    if (error) return toast(errMsg(error), "error");
    toast(`Você acertou ${correct} de ${ex.length}! +5 pontos`);
    reload(); refreshProfile();
  };

  if (open) {
    const ex = open.exercises ?? [];
    return (
      <div className="mx-auto max-w-3xl">
        <button onClick={() => { setOpen(null); setAns({}); setChecked(false); }} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Gramática</button>
        <PageHeader title={open.title} subtitle={<Badge>{levelLabel(open.level)}</Badge>} />
        <div className="space-y-4">
          <Card><h3 className="mb-3 font-medium">Explicação</h3><RichText text={open.explanation} /></Card>
          {open.examples?.length > 0 && (
            <Card><h3 className="mb-3 font-medium">Exemplos</h3>
              <ul className="space-y-2">{open.examples.map((e: any, i: number) => (
                <li key={i} className="flex items-center gap-2 rounded-xl bg-ink-2 px-3 py-2"><SpeakButton text={e.en} /><div><div>{e.en}</div><div className="text-xs text-zinc-500">{e.pt}</div></div></li>
              ))}</ul>
            </Card>
          )}
          {ex.length > 0 && (
            <Card>
              <h3 className="mb-3 font-medium">Exercícios</h3>
              <div className="space-y-4">{ex.map((e: any, i: number) => (
                <div key={i}>
                  <div className="mb-2 text-sm">{i + 1}. {e.prompt}</div>
                  <div className="flex flex-wrap gap-2">{e.options.map((o: string, k: number) => {
                    const sel = ans[i] === k;
                    return (
                      <button key={k} disabled={checked} onClick={() => setAns({ ...ans, [i]: k })}
                        className={cx("flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition",
                          checked && k === e.answer ? "border-emerald-500 bg-emerald-500/15" : checked && sel ? "border-rose-500 bg-rose-500/15" : sel ? "border-brand bg-brand/15" : "border-line hover:border-brand/40")}>
                        {checked && k === e.answer && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}{checked && sel && k !== e.answer && <XCircle className="h-4 w-4 text-rose-400" />}{o}
                      </button>
                    );
                  })}</div>
                  {checked && e.explanation && <p className="mt-1 text-xs text-zinc-400">💡 {e.explanation}</p>}
                </div>
              ))}</div>
              <div className="mt-4 flex gap-2">
                {!checked ? <Button onClick={check}>Corrigir</Button> : <Button variant="secondary" onClick={() => { setAns({}); setChecked(false); }}>Refazer</Button>}
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Gramática" subtitle="Explicações em português, exemplos com áudio e exercícios" />
      <Loadable loading={loading} error={error} reload={reload}>
        {data?.topics.length === 0 ? <Empty title="Nenhum conteúdo de gramática" /> : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data?.topics.map((t) => {
            const p = data.prog.find((x) => x.topic_id === t.id);
            return (
              <button key={t.id} onClick={() => setOpen(t)} className="card p-5 text-left transition hover:-translate-y-0.5 hover:border-brand/50">
                <div className="flex items-start justify-between gap-2"><h3 className="font-display text-lg font-semibold">{t.title}</h3><Badge>{levelLabel(t.level)}</Badge></div>
                <p className="mt-1 text-sm text-zinc-400">{t.summary}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400"><Progress value={p?.best_score ?? 0} className="flex-1" /><span>{p ? `${Math.round(p.best_score)}%` : "não iniciado"}</span></div>
              </button>
            );
          })}</div>
        )}
      </Loadable>
    </div>
  );
}
