import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, RotateCcw, Send, XCircle } from "lucide-react";
import { Badge, Button, Card, ErrorBox, PageHeader, RichText, Spinner, useToast } from "../../components/ui";
import { QuestionRunner, type StudentQuestion } from "../../components/QuestionRunner";
import { callFn, errMsg, supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { categoryLabel, fmtDateTime, isOpenType, pct } from "../../lib/constants";
import { formatAnswer, formatKey } from "../../lib/answers";

type Loaded = { activity: any; questions: StudentQuestion[]; attempts_used: number };

export default function TakeActivity() {
  const { id } = useParams();
  const { refreshProfile } = useAuth();
  const { toast, confirm } = useToast();
  const [data, setData] = useState<Loaded | null>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"intro" | "doing" | "result">("intro");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const submittedRef = useRef(false);

  const load = async () => {
    try {
      const [{ data: d, error: e1 }, { data: s, error: e2 }] = await Promise.all([
        supabase.rpc("get_activity_for_student", { aid: id }),
        supabase.rpc("get_my_submissions", { aid: id }),
      ]);
      if (e1) throw e1; if (e2) throw e2;
      setData(d as Loaded); setSubs((s as any[]) ?? []);
    } catch (e) { setError(errMsg(e)); }
  };
  useEffect(() => { load(); }, [id]);

  // Cronômetro
  useEffect(() => {
    if (mode !== "doing" || !data?.activity.time_limit_minutes || !startedAt) return;
    const end = startedAt.getTime() + data.activity.time_limit_minutes * 60000;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0 && !submittedRef.current) { clearInterval(t); toast("Tempo esgotado! Enviando suas respostas.", "info"); submit(true); }
    }, 1000);
    return () => clearInterval(t);
  }, [mode, startedAt]);

  const start = () => { setAnswers({}); setStartedAt(new Date()); setMode("doing"); submittedRef.current = false; window.scrollTo({ top: 0 }); };

  const submit = async (auto = false) => {
    if (!data || submittedRef.current) return;
    const unanswered = data.questions.filter((q) => answers[q.id] == null || answers[q.id] === "" || (Array.isArray(answers[q.id]) && answers[q.id].every((x: any) => !x))).length;
    if (!auto && unanswered > 0 && !(await confirm(`Você deixou ${unanswered} questão(ões) sem resposta. Enviar mesmo assim?`))) return;
    submittedRef.current = true;
    setBusy(true);
    try {
      const { data: r, error } = await supabase.rpc("submit_activity", { aid: id, ans: answers, started: startedAt?.toISOString() });
      if (error) throw error;
      if ((r as any).needs_review) {
        // pede à IA uma correção sugerida; a professora revisa antes de liberar
        callFn("ai", { action: "grade_submission", submission_id: (r as any).submission_id }).catch(() => {});
      }
      setResult(r);
      setMode("result");
      await load();
      refreshProfile();
      toast("Atividade enviada! +10 pontos");
    } catch (e) {
      submittedRef.current = false;
      toast(errMsg(e), "error");
    } finally { setBusy(false); }
  };

  if (error) return <div><BackLink /><ErrorBox error={error} /></div>;
  if (!data) return <Spinner />;
  const a = data.activity;
  const canRetry = a.max_attempts === 0 || data.attempts_used < a.max_attempts;
  const mm = left != null ? `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}` : null;

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink />
      <PageHeader title={a.title} subtitle={<span className="flex flex-wrap gap-2"><Badge>{categoryLabel(a.category)}</Badge>{a.due_date && <Badge tone="amber">Entrega: {fmtDateTime(a.due_date)}</Badge>}<Badge tone="zinc">{data.questions.length} questões</Badge></span>} />

      {mode === "intro" && (
        <div className="space-y-4">
          <Card className="space-y-4">
            {a.description ? <RichText text={a.description} /> : <p className="text-sm text-zinc-400">Responda às questões abaixo com atenção.</p>}
            <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
              <span>⏱ {a.time_limit_minutes ? `${a.time_limit_minutes} minutos` : "Sem limite de tempo"}</span>
              <span>🔁 Tentativas: {data.attempts_used}/{a.max_attempts === 0 ? "∞" : a.max_attempts}</span>
              <span>📣 Resultado: {a.feedback_mode === "immediate" ? "imediato" : "após liberação da professora"}</span>
            </div>
            {canRetry ? <Button size="lg" onClick={start}>{data.attempts_used ? "Fazer novamente" : "Começar"}</Button> : <p className="text-sm text-amber-300">Você já usou todas as tentativas disponíveis.</p>}
          </Card>
          {subs.length > 0 && <History subs={subs} />}
        </div>
      )}

      {mode === "doing" && (
        <div className="space-y-4">
          {mm && (
            <div className={`sticky top-16 z-10 flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium backdrop-blur ${left! < 60 ? "border-rose-500/50 bg-rose-950/80 text-rose-200" : "border-line bg-ink-2/90"}`}>
              <Clock className="h-4 w-4" /> Tempo restante: {mm}
            </div>
          )}
          {data.questions.map((q, i) => (
            <Card key={q.id} className="animate-fade-up"><QuestionRunner q={q} index={i} value={answers[q.id]} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} /></Card>
          ))}
          <div className="flex justify-end"><Button size="lg" loading={busy} icon={<Send className="h-4 w-4" />} onClick={() => submit(false)}>Enviar respostas</Button></div>
        </div>
      )}

      {mode === "result" && result && (
        <div className="space-y-4">
          <Card className="text-center">
            {result.show_result ? (
              <>
                <div className="text-sm text-zinc-400">Sua nota</div>
                <div className="font-display text-5xl font-bold text-gradient">{pct(result.score, result.max)}%</div>
                <div className="text-sm text-zinc-400">{Number(result.score)} de {Number(result.max)} pontos</div>
              </>
            ) : (
              <>
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
                <h3 className="mt-2 font-display text-xl font-semibold">Respostas enviadas!</h3>
                <p className="mt-1 text-sm text-zinc-400">{result.needs_review ? "Algumas questões serão corrigidas pela professora (com apoio da IA). Você será avisado quando o resultado for liberado." : "O resultado será liberado pela professora."}</p>
              </>
            )}
            <div className="mt-4 flex justify-center gap-2">
              <Link to="/aluno/atividades"><Button variant="secondary">Voltar às atividades</Button></Link>
              {canRetry && <Button variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setMode("intro")}>Tentar novamente</Button>}
            </div>
          </Card>
          {subs[0]?.released && <ReleasedDetail sub={subs[0]} />}
        </div>
      )}
    </div>
  );
}

const BackLink = () => <Link to="/aluno/atividades" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Atividades</Link>;

function History({ subs }: { subs: any[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card>
      <h3 className="mb-3 font-medium">Histórico de tentativas</h3>
      <ul className="space-y-2">{subs.map((s) => (
        <li key={s.id} className="rounded-xl border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>{s.attempt}ª tentativa · {fmtDateTime(s.submitted_at)}</span>
            {s.released ? <span className="flex items-center gap-2"><Badge tone="green">{pct(s.final_score, s.max_score)}%</Badge><button className="text-xs text-violet-300 hover:underline" onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? "Ocultar" : "Ver correção"}</button></span> : <Badge tone="zinc">Aguardando correção</Badge>}
          </div>
          {open === s.id && <div className="mt-3"><ReleasedDetail sub={s} /></div>}
        </li>
      ))}</ul>
    </Card>
  );
}

function ReleasedDetail({ sub }: { sub: any }) {
  const [key, setKey] = useState<Record<string, any> | null>(null);
  useEffect(() => { supabase.rpc("get_answer_key", { sub: sub.id }).then(({ data }) => setKey((data as any) ?? {})); }, [sub.id]);
  if (!key) return <Spinner />;
  const ids = Object.keys(key).sort((a, b) => (key[a].position ?? 0) - (key[b].position ?? 0));
  return (
    <div className="space-y-3">
      {sub.teacher_comment && <div className="rounded-xl border border-brand/30 bg-brand/10 p-3 text-sm"><b className="text-violet-200">Comentário da professora:</b> {sub.teacher_comment}</div>}
      {ids.map((qid, i) => {
        const q = key[qid];
        const r = sub.results?.[qid] ?? {};
        const score = r.teacher_score ?? (r.pending ? r.ai_score : r.score) ?? 0;
        const full = Number(score) >= Number(r.max ?? 1);
        const open = isOpenType(q.type, q.data);
        return (
          <div key={qid} className="rounded-xl border border-line p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{i + 1}. {q.prompt}</p>
              <span className="flex shrink-0 items-center gap-1 text-xs">{full ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}{Number(score)}/{Number(r.max ?? 0)}</span>
            </div>
            <div className="mt-1 text-zinc-400">Sua resposta: <span className="text-zinc-200">{formatAnswer(q, sub.answers?.[qid])}</span></div>
            {formatKey(q) && <div className="text-zinc-400">{open ? "Resposta de referência" : "Resposta correta"}: <span className="text-emerald-300">{formatKey(q)}</span></div>}
            {r.ai_feedback && <div className="mt-1 text-xs text-zinc-400">💡 {r.ai_feedback}</div>}
          </div>
        );
      })}
    </div>
  );
}
