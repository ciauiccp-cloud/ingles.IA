import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { MediaView } from "./FileLink";
import { Input, Select, Textarea, cx } from "./ui";
import { speak } from "../lib/speech";

export type StudentQuestion = {
  id: string; type: string; prompt: string; passage: string | null; media_path: string | null; media_url: string | null; points: number;
  data: { options?: string[]; left?: string[]; right?: string[]; words?: string[]; blanks?: number };
};

/** Renderiza uma questão para o aluno responder. */
export function QuestionRunner({ q, value, onChange, index }: { q: StudentQuestion; value: any; onChange: (v: any) => void; index: number }) {
  const d = q.data ?? {};
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand/20 text-sm font-semibold text-violet-200">{index + 1}</span>
        <div className="flex-1">
          {q.passage && <div className="mb-3 whitespace-pre-wrap rounded-xl border border-line bg-ink-2 p-4 text-sm leading-relaxed text-zinc-200">{q.passage}</div>}
          {q.type !== "fill_blank" && <p className="font-medium">{q.prompt}</p>}
          <span className="text-xs text-zinc-500">{q.points} {Number(q.points) === 1 ? "ponto" : "pontos"}</span>
        </div>
      </div>
      {(q.media_path || q.media_url) && <MediaView path={q.media_path} url={q.media_url} kind={q.type === "image" ? "image" : "audio"} />}

      {d.options && (
        <div className="grid gap-2">
          {d.options.map((o, i) => (
            <button key={i} type="button" onClick={() => onChange(i)}
              className={cx("flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition", value === i ? "border-brand bg-brand/15" : "border-line hover:border-brand/40")}>
              <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs", value === i ? "border-brand bg-brand text-white" : "border-zinc-600")}>{q.type === "true_false" ? (i === 0 ? "V" : "F") : String.fromCharCode(65 + i)}</span>
              {q.type === "true_false" ? (o === "True" ? "Verdadeiro (True)" : "Falso (False)") : o}
            </button>
          ))}
        </div>
      )}

      {q.type === "fill_blank" && <FillBlank prompt={q.prompt} value={value ?? []} onChange={onChange} />}
      {q.type === "matching" && <Matching left={d.left ?? []} right={d.right ?? []} value={value ?? []} onChange={onChange} />}
      {q.type === "ordering" && <Ordering words={d.words ?? []} value={value ?? []} onChange={onChange} />}
      {(q.type === "translation" || q.type === "open" || (q.type === "interpretation" && !d.options)) && (
        <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={q.type === "translation" ? "Escreva sua tradução" : "Escreva sua resposta em inglês"} className="min-h-28" />
      )}
    </div>
  );
}

function FillBlank({ prompt, value, onChange }: { prompt: string; value: string[]; onChange: (v: string[]) => void }) {
  const parts = prompt.split(/_{3,}/);
  return (
    <div className="rounded-xl border border-line bg-ink-2 p-4 leading-[2.6] text-[15px]">
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <input value={value[i] ?? ""} onChange={(e) => { const v = [...value]; v[i] = e.target.value; onChange(v); }}
              className="mx-1 w-32 rounded-lg border border-brand/40 bg-ink px-2 py-1 text-center text-sm focus:border-brand focus:outline-none" aria-label={`Lacuna ${i + 1}`} />
          )}
        </span>
      ))}
    </div>
  );
}

function Matching({ left, right, value, onChange }: { left: string[]; right: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-2">
      {left.map((l, i) => (
        <div key={i} className="grid items-center gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-ink-2 px-4 py-2.5 text-sm">{l}</div>
          <Select value={value[i] ?? ""} onChange={(e) => { const v = [...value]; v[i] = e.target.value; onChange(v); }}>
            <option value="">Selecione…</option>
            {right.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
      ))}
    </div>
  );
}

function Ordering({ words, value, onChange }: { words: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [pool, setPool] = useState<{ w: string; i: number }[]>([]);
  useEffect(() => {
    const used = [...value];
    setPool(words.map((w, i) => ({ w, i })).filter(({ w }) => { const k = used.indexOf(w); if (k >= 0) { used.splice(k, 1); return false; } return true; }));
  }, [words.join("|")]);
  return (
    <div className="space-y-3">
      <div className="flex min-h-14 flex-wrap gap-2 rounded-xl border border-dashed border-brand/40 bg-ink-2 p-3">
        {value.length === 0 && <span className="text-sm text-zinc-500">Toque nas palavras abaixo na ordem correta</span>}
        {value.map((w, i) => (
          <button key={i} type="button" onClick={() => { onChange(value.filter((_, j) => j !== i)); setPool([...pool, { w, i: Date.now() + i }]); }}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm shadow">{w}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {pool.map((p) => (
          <button key={p.i} type="button" onClick={() => { onChange([...value, p.w]); setPool(pool.filter((x) => x.i !== p.i)); }}
            className="rounded-lg border border-line bg-ink-3 px-3 py-1.5 text-sm hover:border-brand/50">{p.w}</button>
        ))}
      </div>
    </div>
  );
}

/** Botão para ouvir uma frase em inglês com voz sintetizada. */
export function SpeakButton({ text, rate = 0.95, className }: { text: string; rate?: number; className?: string }) {
  return (
    <button type="button" onClick={() => speak(text, { rate })} className={cx("inline-grid h-8 w-8 place-items-center rounded-lg text-violet-300 hover:bg-brand/15", className)} aria-label="Ouvir pronúncia" title="Ouvir">
      <Volume2 className="h-4 w-4" />
    </button>
  );
}
