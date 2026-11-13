import { Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { Button, Field, Input, Select, Textarea, cx } from "./ui";
import { MediaView } from "./FileLink";
import { CATEGORIES, QUESTION_TYPES } from "../lib/constants";
import { uploadFile } from "../lib/supabase";

export type QDraft = {
  id?: string;
  type: string;
  category: string;
  level?: string | null;
  prompt: string;
  passage?: string | null;
  media_path?: string | null;
  media_url?: string | null;
  data: any;
  points: number;
  in_bank?: boolean;
  position?: number;
};

export const newQuestion = (type = "multiple_choice", category = "grammar"): QDraft => ({
  type, category, prompt: "", points: 1, data: defaultData(type),
});

export function defaultData(type: string) {
  switch (type) {
    case "multiple_choice": case "audio": case "image": return { options: ["", "", ""], answer: 0 };
    case "interpretation": return { options: ["", "", ""], answer: 0 };
    case "true_false": return { options: ["True", "False"], answer: 0 };
    case "fill_blank": return { answers: [""] };
    case "matching": return { pairs: [{ left: "", right: "" }, { left: "", right: "" }] };
    case "ordering": return { words: [] };
    default: return { reference: "", rubric: "" };
  }
}

/** Valida a questão antes de salvar; devolve mensagem de erro ou null. */
export function validateQuestion(q: QDraft): string | null {
  if (!q.prompt.trim()) return "Preencha o enunciado de todas as questões.";
  const d = q.data ?? {};
  if (["multiple_choice", "audio", "image"].includes(q.type) || (q.type === "interpretation" && d.options?.some((o: string) => o.trim()))) {
    if (!d.options || d.options.filter((o: string) => o.trim()).length < 2) return `"${q.prompt.slice(0, 30)}": informe ao menos 2 alternativas.`;
    if (!d.options[d.answer]?.trim()) return `"${q.prompt.slice(0, 30)}": marque a alternativa correta.`;
  }
  if (q.type === "fill_blank") {
    const blanks = (q.prompt.match(/_{3,}/g) ?? []).length;
    if (blanks === 0) return `"${q.prompt.slice(0, 30)}": use ___ para marcar as lacunas.`;
    if (d.answers?.length !== blanks || d.answers.some((a: string) => !a.trim())) return `"${q.prompt.slice(0, 30)}": informe uma resposta para cada lacuna (${blanks}).`;
  }
  if (q.type === "matching" && (d.pairs?.length < 2 || d.pairs.some((p: any) => !p.left.trim() || !p.right.trim()))) return "Relacionar colunas: preencha ao menos 2 pares completos.";
  if (q.type === "ordering" && (d.words?.length ?? 0) < 2) return "Organizar palavras: escreva a frase correta.";
  if (q.type === "audio" && !q.media_path && !q.media_url) return "Questão com áudio: envie um arquivo de áudio ou informe um link.";
  if (q.type === "image" && !q.media_path && !q.media_url) return "Questão com imagem: envie uma imagem ou informe um link.";
  return null;
}

/** Remove campos de cliente antes de gravar no banco. */
export function cleanData(q: QDraft) {
  const d = { ...q.data };
  if (Array.isArray(d.options) && q.type !== "true_false") {
    const kept: string[] = [];
    let answer = 0;
    d.options.forEach((o: string, i: number) => {
      if (!o.trim()) return;
      if (i === d.answer) answer = kept.length;
      kept.push(o.trim());
    });
    d.options = kept;
    d.answer = answer;
    if (q.type === "interpretation" && kept.length === 0) { delete d.options; delete d.answer; }
  }
  return d;
}

export function QuestionEditor({ q, onChange, teacherId, index }: { q: QDraft; onChange: (q: QDraft) => void; teacherId: string; index?: number }) {
  const [uploading, setUploading] = useState(false);
  const d = q.data ?? {};
  const set = (patch: Partial<QDraft>) => onChange({ ...q, ...patch });
  const setData = (patch: any) => onChange({ ...q, data: { ...d, ...patch } });
  const hasOptions = ["multiple_choice", "audio", "image", "interpretation"].includes(q.type);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label={index != null ? `Questão ${index + 1} — tipo` : "Tipo"} className="sm:col-span-2">
          <Select value={q.type} onChange={(e) => onChange({ ...q, type: e.target.value, data: defaultData(e.target.value) })}>
            {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="Categoria"><Select value={q.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></Field>
        <Field label="Pontos"><Input type="number" min={0} step={0.5} value={q.points} onChange={(e) => set({ points: Number(e.target.value) })} /></Field>
      </div>

      {q.type === "interpretation" && (
        <Field label="Texto para interpretação"><Textarea className="min-h-32" value={q.passage ?? ""} onChange={(e) => set({ passage: e.target.value })} /></Field>
      )}

      <Field label="Enunciado" hint={q.type === "fill_blank" ? "Use ___ (três sublinhados) para cada lacuna. Ex.: Yesterday I ___ to the beach." : q.type === "translation" ? "Frase a ser traduzida." : undefined}>
        <Textarea value={q.prompt} onChange={(e) => {
          const prompt = e.target.value;
          if (q.type === "fill_blank") {
            const n = (prompt.match(/_{3,}/g) ?? []).length;
            const answers = [...(d.answers ?? [])];
            while (answers.length < n) answers.push("");
            onChange({ ...q, prompt, data: { ...d, answers: answers.slice(0, Math.max(n, 1)) } });
          } else set({ prompt });
        }} />
      </Field>

      {(q.type === "audio" || q.type === "image") && (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-4 py-2.5 text-sm text-zinc-400 hover:border-brand/60 hover:text-white">
              <Upload className="h-4 w-4" /> {uploading ? "Enviando..." : q.type === "audio" ? "Enviar áudio" : "Enviar imagem"}
              <input type="file" className="hidden" accept={q.type === "audio" ? "audio/*" : "image/*"} onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setUploading(true);
                try { const up = await uploadFile(teacherId, f); set({ media_path: up.path, media_url: null }); } finally { setUploading(false); }
              }} />
            </label>
            <Input placeholder="ou cole um link" value={q.media_url ?? ""} onChange={(e) => set({ media_url: e.target.value, media_path: null })} />
          </div>
          {(q.media_path || q.media_url) && <MediaView path={q.media_path} url={q.media_url} kind={q.type} />}
        </div>
      )}

      {q.type === "true_false" && (
        <div className="flex gap-2">
          {["True", "False"].map((o, i) => (
            <button key={o} type="button" onClick={() => setData({ answer: i })}
              className={cx("rounded-xl border px-4 py-2 text-sm", d.answer === i ? "border-emerald-500 bg-emerald-500/15" : "border-line")}>{i === 0 ? "Verdadeiro" : "Falso"}{d.answer === i && " ✓"}</button>
          ))}
        </div>
      )}

      {hasOptions && (
        <Field label={q.type === "interpretation" ? "Alternativas (deixe em branco para resposta discursiva)" : "Alternativas — marque a correta"}>
          <div className="space-y-2">
            {(d.options ?? []).map((o: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name={`ans-${q.id ?? index}`} checked={d.answer === i} onChange={() => setData({ answer: i })} className="h-4 w-4 accent-violet-500" />
                <Input value={o} placeholder={`Alternativa ${String.fromCharCode(65 + i)}`} onChange={(e) => { const opts = [...d.options]; opts[i] = e.target.value; setData({ options: opts }); }} />
                <button type="button" onClick={() => setData({ options: d.options.filter((_: any, j: number) => j !== i), answer: d.answer > i ? d.answer - 1 : d.answer === i ? 0 : d.answer })} className="text-zinc-500 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {(d.options?.length ?? 0) < 6 && <Button type="button" size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setData({ options: [...(d.options ?? []), ""] })}>Alternativa</Button>}
          </div>
        </Field>
      )}

      {q.type === "fill_blank" && (
        <Field label="Respostas aceitas por lacuna" hint="Separe alternativas aceitas com | (ex.: went|traveled).">
          <div className="space-y-2">{(d.answers ?? []).map((a: string, i: number) => (
            <Input key={i} value={a} placeholder={`Lacuna ${i + 1}`} onChange={(e) => { const ans = [...d.answers]; ans[i] = e.target.value; setData({ answers: ans }); }} />
          ))}</div>
        </Field>
      )}

      {q.type === "matching" && (
        <Field label="Pares (coluna A → coluna B)">
          <div className="space-y-2">
            {(d.pairs ?? []).map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={p.left} placeholder="Coluna A" onChange={(e) => { const ps = [...d.pairs]; ps[i] = { ...p, left: e.target.value }; setData({ pairs: ps }); }} />
                <span className="text-zinc-500">→</span>
                <Input value={p.right} placeholder="Coluna B" onChange={(e) => { const ps = [...d.pairs]; ps[i] = { ...p, right: e.target.value }; setData({ pairs: ps }); }} />
                <button type="button" onClick={() => setData({ pairs: d.pairs.filter((_: any, j: number) => j !== i) })} className="text-zinc-500 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <Button type="button" size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setData({ pairs: [...(d.pairs ?? []), { left: "", right: "" }] })}>Par</Button>
          </div>
        </Field>
      )}

      {q.type === "ordering" && (
        <Field label="Frase correta" hint="As palavras serão embaralhadas para o aluno.">
          <Input value={(d.words ?? []).join(" ")} onChange={(e) => setData({ words: e.target.value.split(/\s+/).filter(Boolean) })} placeholder="Ex.: She is reading a book" />
        </Field>
      )}

      {(q.type === "translation" || q.type === "open" || (q.type === "interpretation" && !(d.options ?? []).some((o: string) => o.trim()))) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Resposta de referência"><Textarea value={d.reference ?? ""} onChange={(e) => setData({ reference: e.target.value })} /></Field>
          <Field label="Critérios de correção (para a IA)"><Textarea value={d.rubric ?? ""} onChange={(e) => setData({ rubric: e.target.value })} placeholder="Ex.: usar Simple Past corretamente; mínimo de 3 frases" /></Field>
        </div>
      )}
    </div>
  );
}
