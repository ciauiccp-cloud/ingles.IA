import { useMemo, useState } from "react";
import { Bot, CheckCircle2, Send, Sparkles, XCircle } from "lucide-react";
import { Badge, Button, Card, Empty, Field, Input, Loadable, Modal, PageHeader, Select, Spinner, Tabs, Textarea, useToast } from "../../components/ui";
import { must, useAsync } from "../../lib/hooks";
import { callFn, errMsg, supabase } from "../../lib/supabase";
import { fmtDateTime, isOpenType, pct, qTypeLabel } from "../../lib/constants";
import { formatAnswer, formatKey } from "../../lib/answers";

const STATUS: Record<string, { label: string; tone: "amber" | "violet" | "sky" | "green" }> = {
  submitted: { label: "Aguardando", tone: "amber" }, ai_graded: { label: "IA sugeriu nota", tone: "violet" },
  graded: { label: "Corrigida", tone: "sky" }, released: { label: "Liberada", tone: "green" },
};

export default function Grading() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"pending" | "graded" | "released">("pending");
  const [act, setAct] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsync(async () => {
    const subs = must(await supabase.from("submissions").select("id, activity_id, attempt, status, submitted_at, auto_score, ai_score, final_score, max_score, needs_review, activities(title), profiles!submissions_student_id_fkey(full_name)").order("submitted_at", { ascending: false }).limit(500)) as any[];
    return subs;
  });
  const acts = useMemo(() => [...new Map((data ?? []).map((s) => [s.activity_id, s.activities?.title])).entries()], [data]);
  const list = (data ?? []).filter((s) => (!act || s.activity_id === act) &&
    (tab === "pending" ? ["submitted", "ai_graded"].includes(s.status) : tab === "graded" ? s.status === "graded" : s.status === "released"));

  const releaseAll = async () => {
    const ids = list.map((s) => s.id);
    if (!ids.length) return;
    const { error } = await supabase.from("submissions").update({ status: "released", released_at: new Date().toISOString() }).in("id", ids);
    if (error) return toast(errMsg(error), "error");
    toast(`${ids.length} resultado(s) liberado(s).`); reload();
  };

  return (
    <div>
      <PageHeader title="Correção de atividades" subtitle="Revise respostas, ajuste notas sugeridas pela IA e libere os resultados" />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: "pending", label: `Para corrigir (${(data ?? []).filter((s) => ["submitted", "ai_graded"].includes(s.status)).length})` },
        { value: "graded", label: `Corrigidas, não liberadas (${(data ?? []).filter((s) => s.status === "graded").length})` },
        { value: "released", label: "Liberadas" },
      ]} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Select className="sm:w-80" value={act} onChange={(e) => setAct(e.target.value)}><option value="">Todas as atividades</option>{acts.map(([id, t]) => <option key={id} value={id}>{t}</option>)}</Select>
        {tab === "graded" && list.length > 0 && <Button icon={<Send className="h-4 w-4" />} onClick={releaseAll}>Liberar todos ({list.length})</Button>}
      </div>
      <Loadable loading={loading} error={error} reload={reload}>
        {list.length === 0 ? <Empty title="Nada por aqui" text={tab === "pending" ? "Nenhuma atividade aguardando correção." : "Nenhum envio nesta etapa."} /> : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase text-zinc-500"><tr><th className="px-4 py-3">Aluno</th><th className="px-4 py-3">Atividade</th><th className="px-4 py-3">Enviada</th><th className="px-4 py-3">Nota</th><th className="px-4 py-3">Status</th><th /></tr></thead>
              <tbody>{list.map((s) => (
                <tr key={s.id} className="border-b border-line/60 hover:bg-white/[.02]">
                  <td className="px-4 py-3">{s.profiles?.full_name}</td>
                  <td className="px-4 py-3">{s.activities?.title} <span className="text-xs text-zinc-500">({s.attempt}ª tentativa)</span></td>
                  <td className="px-4 py-3 text-zinc-400">{fmtDateTime(s.submitted_at)}</td>
                  <td className="px-4 py-3">{s.final_score ?? s.auto_score}/{s.max_score} <span className="text-zinc-500">({pct(s.final_score ?? s.auto_score, s.max_score)}%)</span></td>
                  <td className="px-4 py-3"><Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => setOpen(s.id)}>Abrir</Button></td>
                </tr>
              ))}</tbody>
            </table>
          </Card>
        )}
      </Loadable>
      {open && <ReviewModal id={open} onClose={() => setOpen(null)} onSaved={reload} />}
    </div>
  );
}

function ReviewModal({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsync(async () => {
    const sub = must(await supabase.from("submissions").select("*, activities(title), profiles!submissions_student_id_fkey(full_name)").eq("id", id).single()) as any;
    const qs = must(await supabase.from("questions").select("*").eq("activity_id", sub.activity_id).order("position")) as any[];
    const sc: Record<string, number> = {};
    for (const q of qs) {
      const r = sub.results?.[q.id] ?? {};
      sc[q.id] = Number(r.teacher_score ?? (r.pending ? r.ai_score ?? 0 : r.score ?? 0));
    }
    setScores(sc);
    setComment(sub.teacher_comment ?? "");
    return { sub, qs };
  }, [id]);

  const total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);

  const askAI = async () => {
    setBusy("ai");
    try { const r = await callFn("ai", { action: "grade_submission", submission_id: id }); toast(r.graded ? "Correção da IA concluída." : "Não há questões discursivas para a IA corrigir."); reload(); }
    catch (e) { toast(errMsg(e), "error"); } finally { setBusy(null); }
  };
  const save = async (release: boolean) => {
    if (!data) return;
    setBusy(release ? "release" : "save");
    const results = { ...data.sub.results };
    for (const q of data.qs) results[q.id] = { ...(results[q.id] ?? {}), teacher_score: Number(scores[q.id]) || 0, max: Number(q.points) };
    const { error } = await supabase.from("submissions").update({
      results, final_score: total, teacher_comment: comment || null, status: release ? "released" : "graded",
      graded_at: new Date().toISOString(), released_at: release ? new Date().toISOString() : null,
    }).eq("id", id);
    setBusy(null);
    if (error) return toast(errMsg(error), "error");
    toast(release ? "Resultado liberado para o aluno." : "Correção salva.");
    onSaved(); onClose();
  };

  return (
    <Modal open onClose={onClose} title={data ? `${data.sub.profiles?.full_name} — ${data.sub.activities?.title}` : "Correção"} wide
      footer={data && <>
        <span className="mr-auto self-center text-sm">Nota final: <b className="text-lg">{total.toFixed(1)}</b> / {data.sub.max_score} ({pct(total, data.sub.max_score)}%)</span>
        {data.qs.some((q) => isOpenType(q.type, q.data)) && <Button variant="outline" icon={<Sparkles className="h-4 w-4" />} loading={busy === "ai"} onClick={askAI}>{data.sub.ai_score != null ? "Corrigir novamente com IA" : "Corrigir com IA"}</Button>}
        <Button variant="secondary" loading={busy === "save"} onClick={() => save(false)}>Salvar</Button>
        <Button icon={<Send className="h-4 w-4" />} loading={busy === "release"} onClick={() => save(true)}>Liberar resultado</Button>
      </>}>
      {loading ? <Spinner /> : error ? <p className="text-rose-300">{error}</p> : data && (
        <div className="space-y-4">
          {data.qs.map((q, i) => {
            const r = data.sub.results?.[q.id] ?? {};
            const ans = data.sub.answers?.[q.id];
            const open = isOpenType(q.type, q.data);
            const key = formatKey(q);
            return (
              <div key={q.id} className="rounded-xl border border-line p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <Badge>{i + 1}. {qTypeLabel(q.type)}</Badge>
                  {!open && (r.correct ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Correta (automática)</span> : <span className="flex items-center gap-1 text-xs text-rose-400"><XCircle className="h-4 w-4" /> {Number(r.score) > 0 ? "Parcial" : "Incorreta"} (automática)</span>)}
                </div>
                {q.passage && <p className="mb-2 max-h-32 overflow-y-auto rounded-lg bg-ink-2 p-3 text-xs text-zinc-400">{q.passage}</p>}
                <p className="text-sm font-medium">{q.prompt}</p>
                <div className="mt-2 rounded-lg bg-ink-2 p-3 text-sm"><span className="text-xs text-zinc-500">Resposta do aluno:</span><div className="mt-0.5 whitespace-pre-wrap">{formatAnswer(q, ans)}</div></div>
                {key && <div className="mt-2 text-xs text-zinc-400">{open ? "Referência" : "Gabarito"}: <span className="text-emerald-300">{key}</span></div>}
                {r.ai_feedback && (
                  <div className="mt-2 rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-violet-300"><Bot className="h-4 w-4" /> Sugestão da IA: {r.ai_score} / {Number(q.points)}</div>
                    <p className="mt-1 text-zinc-300">{r.ai_feedback}</p>
                    {r.ai_suggestion && <p className="mt-1 text-xs text-zinc-400">Versão sugerida: <i>{r.ai_suggestion}</i></p>}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <Field label="Pontuação" className="w-36"><Input type="number" min={0} max={Number(q.points)} step={0.25} value={scores[q.id] ?? 0} onChange={(e) => setScores({ ...scores, [q.id]: Math.min(Number(q.points), Math.max(0, Number(e.target.value))) })} /></Field>
                  <span className="mt-6 text-sm text-zinc-500">/ {Number(q.points)}</span>
                </div>
              </div>
            );
          })}
          <Field label="Comentário para o aluno"><Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escreva um feedback individual" /></Field>
        </div>
      )}
    </Modal>
  );
}
