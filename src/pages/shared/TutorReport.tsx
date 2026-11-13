import { useEffect, useState } from "react";
import { CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import { Badge, Button, Modal, Progress, Spinner, cx } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { fmtDateTime, topicLabel } from "../../lib/constants";

export type TutorReport = {
  summary_pt: string;
  vocabulary_learned: { word: string; meaning_pt: string }[];
  frequent_errors: string[];
  corrected_sentences: { original: string; corrected: string; explanation_pt: string }[];
  comprehension_score: number;
  comprehension_comment_pt: string;
  fluency_score: number;
  suggestions_pt: string[];
  mini_activity: { instructions_pt: string; questions: { prompt: string; options: string[]; answer: number }[] };
  difficulties: string[];
};

export function SessionReportView({ report, compact, interactive }: { report: TutorReport; compact?: boolean; interactive?: boolean }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  if (!report) return null;
  return (
    <div className="space-y-4 text-sm">
      <p className="text-zinc-300">{report.summary_pt}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-3">
          <div className="flex justify-between text-xs text-zinc-400"><span>Compreensão</span><span>{report.comprehension_score}/10</span></div>
          <Progress value={report.comprehension_score * 10} className="mt-2" />
          {!compact && <p className="mt-2 text-xs text-zinc-400">{report.comprehension_comment_pt}</p>}
        </div>
        <div className="rounded-xl border border-line p-3">
          <div className="flex justify-between text-xs text-zinc-400"><span>Fluência</span><span>{report.fluency_score}/10</span></div>
          <Progress value={report.fluency_score * 10} className="mt-2" />
        </div>
      </div>
      {report.vocabulary_learned?.length > 0 && (
        <div>
          <div className="mb-1.5 font-medium">Vocabulário</div>
          <div className="flex flex-wrap gap-1.5">{report.vocabulary_learned.map((v, i) => <Badge key={i} tone="sky">{v.word} · {v.meaning_pt}</Badge>)}</div>
        </div>
      )}
      {report.frequent_errors?.length > 0 && (
        <div>
          <div className="mb-1.5 font-medium">Erros mais frequentes</div>
          <div className="flex flex-wrap gap-1.5">{report.frequent_errors.map((e, i) => <Badge key={i} tone="amber">{e}</Badge>)}</div>
        </div>
      )}
      {report.corrected_sentences?.length > 0 && (
        <div>
          <div className="mb-1.5 font-medium">Frases corrigidas</div>
          <ul className="space-y-2">
            {report.corrected_sentences.map((c, i) => (
              <li key={i} className="rounded-xl bg-ink-2 p-3">
                <div className="text-rose-300 line-through decoration-rose-500/60">{c.original}</div>
                <div className="text-emerald-300">{c.corrected}</div>
                {!compact && <div className="mt-1 text-xs text-zinc-400">{c.explanation_pt}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {report.suggestions_pt?.length > 0 && (
        <div>
          <div className="mb-1.5 font-medium">Sugestões de melhoria</div>
          <ul className="space-y-1">{report.suggestions_pt.map((s, i) => <li key={i} className="flex gap-2 text-zinc-300"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{s}</li>)}</ul>
        </div>
      )}
      {!compact && report.mini_activity?.questions?.length > 0 && (
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
          <div className="font-medium">Atividade de reforço</div>
          <p className="mb-3 text-xs text-zinc-400">{report.mini_activity.instructions_pt}</p>
          <div className="space-y-3">
            {report.mini_activity.questions.map((q, qi) => (
              <div key={qi}>
                <div className="mb-1.5">{qi + 1}. {q.prompt}</div>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((o, oi) => {
                    const chosen = answers[qi] === oi;
                    const show = interactive && answers[qi] != null;
                    return (
                      <button key={oi} disabled={!interactive || answers[qi] != null} onClick={() => setAnswers({ ...answers, [qi]: oi })}
                        className={cx("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition",
                          show && oi === q.answer ? "border-emerald-500 bg-emerald-500/15" : show && chosen ? "border-rose-500 bg-rose-500/15" : "border-line hover:border-brand/50",
                          !interactive && oi === q.answer && "border-emerald-500/50")}>
                        {show && oi === q.answer && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                        {show && chosen && oi !== q.answer && <XCircle className="h-4 w-4 text-rose-400" />}
                        {o}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {compact && report.difficulties?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-xs text-zinc-400">Dificuldades: {report.difficulties.map((d, i) => <Badge key={i} tone="red">{d}</Badge>)}</div>
      )}
    </div>
  );
}

export function TranscriptModal({ session, onClose }: { session: any; onClose: () => void }) {
  const [msgs, setMsgs] = useState<any[] | null>(null);
  useEffect(() => {
    setMsgs(null);
    if (session) supabase.from("tutor_messages").select("*").eq("session_id", session.id).order("id").then(({ data }) => setMsgs(data ?? []));
  }, [session?.id]);
  return (
    <Modal open={!!session} onClose={onClose} title={session ? `${topicLabel(session.topic)} · ${fmtDateTime(session.started_at)}` : ""} wide
      footer={<Button onClick={onClose}>Fechar</Button>}>
      {!msgs ? <Spinner /> : msgs.length === 0 ? <p className="text-sm text-zinc-500">Sem mensagens.</p> : (
        <div className="space-y-3">
          {msgs.map((m) => (
            <div key={m.id} className={m.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[85%]"}>
              <div className={cx("rounded-2xl px-4 py-2.5 text-sm", m.role === "user" ? "bg-brand/80" : "bg-ink-3")}>{m.content}{m.via_voice && <span className="ml-2 text-[10px] opacity-60">🎙️</span>}</div>
              {m.correction && (
                <div className="mt-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs">
                  <b className="text-amber-200">Correção:</b> {m.correction.corrected} — <span className="text-zinc-400">{m.correction.explanation_pt}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
