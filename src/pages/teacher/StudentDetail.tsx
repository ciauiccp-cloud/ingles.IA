import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Flame, MessageSquarePlus, Trash2, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Button, Card, Empty, Loadable, PageHeader, Stat, Tabs, Textarea, useToast } from "../../components/ui";
import { must, useAsync } from "../../lib/hooks";
import { errMsg, supabase } from "../../lib/supabase";
import { BADGES, categoryLabel, fmtDate, fmtDateTime, levelLabel, pct, topicLabel } from "../../lib/constants";
import { exportReportPDF } from "../../lib/pdf";
import { SessionReportView, TranscriptModal } from "../shared/TutorReport";

const tip = { contentStyle: { background: "#15151c", border: "1px solid #26262f", borderRadius: 12 } };

export async function loadStudentData(id: string) {
  const [profile, subs, sessions, notes, badges, vocab, grammar, practice, days, classes, writing] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single().then(must),
    supabase.from("submissions").select("*, activities(title, category)").eq("student_id", id).order("submitted_at").then(must),
    supabase.from("tutor_sessions").select("*").eq("student_id", id).order("started_at", { ascending: false }).then(must),
    supabase.from("student_notes").select("*").eq("student_id", id).order("created_at", { ascending: false }).then(must),
    supabase.from("student_badges").select("*").eq("student_id", id).then(must),
    supabase.from("vocab_reviews").select("box, correct, wrong, vocab_words(word, translation)").eq("student_id", id).then(must),
    supabase.from("grammar_progress").select("best_score, attempts, grammar_topics(title)").eq("student_id", id).then(must),
    supabase.from("practice_results").select("best_score, attempts, practice_texts(title, skill)").eq("student_id", id).then(must),
    supabase.from("study_days").select("day, actions").eq("student_id", id).gte("day", new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)).then(must),
    supabase.from("class_members").select("classes(name)").eq("student_id", id).then(must),
    supabase.from("writing_entries").select("score, created_at").eq("student_id", id).order("created_at").then(must),
  ]);
  return {
    profile: profile as any, subs: subs as any[], sessions: sessions as any[], notes: notes as any[], badges: badges as any[],
    vocab: vocab as any[], grammar: grammar as any[], practice: practice as any[], days: days as any[],
    classes: (classes as any[]).map((c) => c.classes?.name).filter(Boolean) as string[], writing: writing as any[],
  };
}

export function skillBreakdown(d: Awaited<ReturnType<typeof loadStudentData>>) {
  const acc: Record<string, { sum: number; n: number }> = {};
  const add = (k: string, v: number | null) => { if (v == null) return; acc[k] ??= { sum: 0, n: 0 }; acc[k].sum += v; acc[k].n++; };
  for (const s of d.subs) add(categoryLabel(s.activities?.category), pct(s.final_score ?? s.auto_score, s.max_score));
  for (const g of d.grammar) add("Gramática", Number(g.best_score));
  for (const p of d.practice) add(p.practice_texts?.skill === "listening" ? "Listening" : "Reading", Number(p.best_score));
  for (const w of d.writing) add("Writing", w.score != null ? Number(w.score) : null);
  for (const s of d.sessions) if (s.report?.fluency_score != null) add("Conversação", Number(s.report.fluency_score) * 10);
  return Object.entries(acc).map(([skill, v]) => ({ skill, media: Math.round(v.sum / v.n) }));
}

export default function StudentDetail() {
  const { id } = useParams();
  const { toast, confirm } = useToast();
  const [tab, setTab] = useState<"perf" | "acts" | "tutor" | "vocab" | "notes">("perf");
  const [note, setNote] = useState("");
  const [openSession, setOpenSession] = useState<any>(null);
  const { data: d, loading, error, reload } = useAsync(() => loadStudentData(id!), [id]);

  const addNote = async () => {
    if (!note.trim()) return;
    const { error } = await supabase.from("student_notes").insert({ student_id: id, note: note.trim() });
    if (error) return toast(errMsg(error), "error");
    setNote(""); toast("Observação registrada."); reload();
  };
  const delNote = async (nid: string) => {
    if (!(await confirm("Excluir esta observação?", { danger: true }))) return;
    await supabase.from("student_notes").delete().eq("id", nid); reload();
  };

  const exportPdf = () => {
    if (!d) return;
    const p = d.profile;
    const tutorMin = Math.round(d.sessions.reduce((a, s) => a + (s.duration_seconds ?? 0), 0) / 60);
    exportReportPDF({
      title: `Relatório individual — ${p.full_name}`,
      subtitle: `Nível ${levelLabel(p.level)} · Turmas: ${d.classes.join(", ") || "—"}`,
      filename: `relatorio-${p.full_name.replace(/\s+/g, "-").toLowerCase()}.pdf`,
      sections: [
        { heading: "Resumo", text: `Pontos: ${p.points} · Sequência atual: ${p.streak} dias (recorde ${p.best_streak}) · Dias estudados (90d): ${d.days.length} · Conversação com IA: ${d.sessions.length} sessões, ${tutorMin} min · Medalhas: ${d.badges.map((b) => b.badge).join(", ") || "—"}` },
        { heading: "Desempenho por habilidade", table: { head: ["Habilidade", "Média (%)"], rows: skillBreakdown(d).map((s) => [s.skill, s.media]) } },
        { heading: "Atividades", table: { head: ["Data", "Atividade", "Categoria", "Nota", "Status"], rows: d.subs.map((s) => [fmtDate(s.submitted_at), s.activities?.title, categoryLabel(s.activities?.category), `${s.final_score ?? s.auto_score}/${s.max_score}`, s.status === "released" ? "Liberada" : "Em correção"]) } },
        { heading: "Conversação com IA", table: { head: ["Data", "Tema", "Duração", "Interações", "Compreensão"], rows: d.sessions.filter((s) => s.ended_at).map((s) => [fmtDate(s.started_at), topicLabel(s.topic), `${Math.round((s.duration_seconds ?? 0) / 60)} min`, s.interactions, s.report?.comprehension_score != null ? `${s.report.comprehension_score}/10` : "—"]) } },
        { heading: "Principais dificuldades", text: [...new Set(d.sessions.flatMap((s) => s.report?.difficulties ?? []))].join(" · ") || "—" },
        { heading: "Observações pedagógicas", text: d.notes.map((n) => `${fmtDate(n.created_at)}: ${n.note}`).join("\n") || "—" },
      ],
    });
  };

  const scoreLine = d?.subs.map((s) => ({ data: fmtDate(s.submitted_at).slice(0, 5), nota: pct(s.final_score ?? s.auto_score, s.max_score) })) ?? [];
  const skills = d ? skillBreakdown(d) : [];

  return (
    <div>
      <Link to="/professora/alunos" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Alunos</Link>
      <Loadable loading={loading} error={error} reload={reload}>
        {d && (
          <>
            <PageHeader title={d.profile.full_name}
              subtitle={<span className="flex flex-wrap items-center gap-2">{d.profile.email} <Badge>{levelLabel(d.profile.level)}</Badge> {d.classes.map((c) => <Badge key={c} tone="zinc">{c}</Badge>)}</span>}
              actions={<Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportPdf}>Exportar PDF</Button>} />
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
              <Stat label="Pontos" value={d.profile.points} icon={<Trophy className="h-4 w-4" />} />
              <Stat label="Sequência" value={`${d.profile.streak} dias`} icon={<Flame className="h-4 w-4" />} hint={`Recorde: ${d.profile.best_streak}`} />
              <Stat label="Atividades" value={d.subs.length} />
              <Stat label="Sessões com IA" value={d.sessions.length} hint={`${Math.round(d.sessions.reduce((a, s) => a + (s.duration_seconds ?? 0), 0) / 60)} min de prática`} />
              <Stat label="Dias estudados" value={d.days.length} hint="últimos 90 dias" />
            </div>
            <Tabs value={tab} onChange={setTab} tabs={[
              { value: "perf", label: "Desempenho" }, { value: "acts", label: "Atividades" }, { value: "tutor", label: "Conversação IA" },
              { value: "vocab", label: "Vocabulário e gramática" }, { value: "notes", label: `Observações (${d.notes.length})` },
            ]} />

            {tab === "perf" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-3 font-medium">Evolução das notas</h3>
                  {scoreLine.length === 0 ? <Empty title="Sem atividades enviadas" /> : (
                    <div className="h-60"><ResponsiveContainer><LineChart data={scoreLine}><CartesianGrid stroke="#26262f" vertical={false} /><XAxis dataKey="data" stroke="#71717a" fontSize={12} /><YAxis domain={[0, 100]} stroke="#71717a" fontSize={12} /><Tooltip {...tip} /><Line dataKey="nota" name="Nota (%)" stroke="#a855f7" strokeWidth={2} dot /></LineChart></ResponsiveContainer></div>
                  )}
                </Card>
                <Card>
                  <h3 className="mb-3 font-medium">Desempenho por habilidade</h3>
                  {skills.length === 0 ? <Empty title="Sem dados ainda" /> : (
                    <div className="h-60"><ResponsiveContainer><BarChart data={skills}><CartesianGrid stroke="#26262f" vertical={false} /><XAxis dataKey="skill" stroke="#71717a" fontSize={11} /><YAxis domain={[0, 100]} stroke="#71717a" fontSize={12} /><Tooltip {...tip} /><Bar dataKey="media" name="Média (%)" fill="#7c3aed" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
                  )}
                </Card>
                <Card>
                  <h3 className="mb-3 font-medium">Medalhas</h3>
                  {d.badges.length === 0 ? <p className="text-sm text-zinc-500">Nenhuma medalha ainda.</p> : (
                    <div className="flex flex-wrap gap-2">{d.badges.map((b) => <Badge key={b.badge}>{BADGES[b.badge]?.emoji} {b.badge}</Badge>)}</div>
                  )}
                </Card>
                <Card>
                  <h3 className="mb-3 font-medium">Perfil</h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-zinc-500">Nascimento</dt><dd>{fmtDate(d.profile.birth_date)}</dd>
                    <dt className="text-zinc-500">Menor de idade</dt><dd>{d.profile.is_minor ? `Sim · resp.: ${d.profile.guardian_name ?? "—"}` : "Não"}</dd>
                    <dt className="text-zinc-500">Autorização do responsável</dt><dd>{d.profile.is_minor ? (d.profile.guardian_consent ? `Sim (${fmtDate(d.profile.guardian_consent_at)})` : "Pendente") : "—"}</dd>
                    <dt className="text-zinc-500">Ciente do aviso do tutor</dt><dd>{d.profile.privacy_ack_at ? fmtDate(d.profile.privacy_ack_at) : "Ainda não"}</dd>
                    <dt className="text-zinc-500">Metas</dt><dd>{d.profile.goals ?? "—"}</dd>
                  </dl>
                </Card>
              </div>
            )}

            {tab === "acts" && (d.subs.length === 0 ? <Empty title="Nenhuma atividade enviada" /> : (
              <Card className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-line text-left text-xs uppercase text-zinc-500"><tr><th className="px-4 py-3">Atividade</th><th className="px-4 py-3">Tentativa</th><th className="px-4 py-3">Enviada</th><th className="px-4 py-3">Nota</th><th className="px-4 py-3">Status</th></tr></thead>
                  <tbody>{[...d.subs].reverse().map((s) => (
                    <tr key={s.id} className="border-b border-line/60">
                      <td className="px-4 py-3">{s.activities?.title}<div className="text-xs text-zinc-500">{categoryLabel(s.activities?.category)}</div></td>
                      <td className="px-4 py-3">{s.attempt}ª</td>
                      <td className="px-4 py-3 text-zinc-400">{fmtDateTime(s.submitted_at)}</td>
                      <td className="px-4 py-3">{s.final_score ?? s.auto_score}/{s.max_score} <span className="text-zinc-500">({pct(s.final_score ?? s.auto_score, s.max_score)}%)</span></td>
                      <td className="px-4 py-3"><Badge tone={s.status === "released" ? "green" : "amber"}>{s.status === "released" ? "Liberada" : s.status === "graded" ? "Corrigida" : "Aguardando"}</Badge></td>
                    </tr>))}</tbody>
                </table>
              </Card>
            ))}

            {tab === "tutor" && (d.sessions.length === 0 ? <Empty title="O aluno ainda não usou o tutor de IA" /> : (
              <div className="space-y-3">
                {d.sessions.map((s) => (
                  <Card key={s.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{topicLabel(s.topic)} <span className="text-sm text-zinc-500">· {levelLabel(s.level)} · {s.mode === "voice" ? "voz" : "texto"}</span></div>
                        <div className="text-xs text-zinc-400">{fmtDateTime(s.started_at)} · {Math.round((s.duration_seconds ?? 0) / 60)} min · {s.interactions} interações · {s.corrections_count} correções</div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => setOpenSession(s)}>Ver conversa</Button>
                    </div>
                    {s.report && <div className="mt-4"><SessionReportView report={s.report} compact /></div>}
                    {!s.ended_at && <p className="mt-2 text-xs text-zinc-500">Sessão não finalizada.</p>}
                  </Card>
                ))}
              </div>
            ))}

            {tab === "vocab" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-1 font-medium">Vocabulário</h3>
                  <p className="mb-3 text-xs text-zinc-500">{d.vocab.filter((v) => v.box >= 3).length} palavras memorizadas de {d.vocab.length} estudadas</p>
                  <div className="text-sm font-medium text-zinc-300">Palavras com mais erros</div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {[...d.vocab].sort((a, b) => b.wrong - a.wrong).filter((v) => v.wrong > 0).slice(0, 10).map((v, i) => (
                      <li key={i} className="flex justify-between"><span>{v.vocab_words?.word} <span className="text-zinc-500">— {v.vocab_words?.translation}</span></span><Badge tone="red">{v.wrong} erros</Badge></li>
                    ))}
                    {!d.vocab.some((v) => v.wrong > 0) && <li className="text-zinc-500">Nenhum erro registrado.</li>}
                  </ul>
                </Card>
                <Card>
                  <h3 className="mb-3 font-medium">Gramática, Listening e Reading</h3>
                  <ul className="space-y-2 text-sm">
                    {d.grammar.map((g, i) => <li key={i} className="flex justify-between"><span>{g.grammar_topics?.title}</span><Badge tone={g.best_score >= 70 ? "green" : "amber"}>{Math.round(g.best_score)}%</Badge></li>)}
                    {d.practice.map((p, i) => <li key={`p${i}`} className="flex justify-between"><span>{p.practice_texts?.skill === "listening" ? "🎧" : "📖"} {p.practice_texts?.title}</span><Badge tone={p.best_score >= 70 ? "green" : "amber"}>{Math.round(p.best_score)}%</Badge></li>)}
                    {d.grammar.length + d.practice.length === 0 && <li className="text-zinc-500">Sem exercícios realizados.</li>}
                  </ul>
                </Card>
              </div>
            )}

            {tab === "notes" && (
              <div className="space-y-4">
                <Card>
                  <Textarea placeholder="Registrar observação pedagógica (visível apenas para você)" value={note} onChange={(e) => setNote(e.target.value)} />
                  <div className="mt-3 flex justify-end"><Button icon={<MessageSquarePlus className="h-4 w-4" />} onClick={addNote}>Adicionar</Button></div>
                </Card>
                {d.notes.map((n) => (
                  <Card key={n.id} className="flex items-start justify-between gap-3">
                    <div><div className="text-xs text-zinc-500">{fmtDateTime(n.created_at)}</div><p className="mt-1 whitespace-pre-wrap text-sm">{n.note}</p></div>
                    <button onClick={() => delNote(n.id)} className="text-zinc-500 hover:text-rose-400" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </Loadable>
      <TranscriptModal session={openSession} onClose={() => setOpenSession(null)} />
    </div>
  );
}
