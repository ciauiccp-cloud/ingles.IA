import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, Card, Empty, Loadable, PageHeader, Select, Stat } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { fetchClasses, fetchMembers, fetchStudents, weekKey } from "../../lib/data";
import { categoryLabel, fmtDate, levelLabel, pct } from "../../lib/constants";
import { exportReportPDF } from "../../lib/pdf";
import { usePublicInfo } from "../../components/Logo";

const tip = { contentStyle: { background: "#15151c", border: "1px solid #26262f", borderRadius: 12 } };
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export default function Reports() {
  const { profile } = useAuth();
  const info = usePublicInfo();
  const [cls, setCls] = useState("");
  const { data, loading, error, reload } = useAsync(async () => {
    const since = new Date(Date.now() - 120 * 864e5).toISOString();
    const [students, classes, members, subs, acts, days, sessions, grammar, practice, writing] = await Promise.all([
      fetchStudents(profile!.id), fetchClasses(), fetchMembers(),
      supabase.from("submissions").select("student_id, activity_id, submitted_at, final_score, auto_score, max_score, activities(category)").gte("submitted_at", since).then(must),
      supabase.from("activities").select("id, class_id, student_id, published").eq("published", true).then(must),
      supabase.from("study_days").select("student_id, day").gte("day", since.slice(0, 10)).then(must),
      supabase.from("tutor_sessions").select("student_id, started_at, duration_seconds, report").gte("started_at", since).then(must),
      supabase.from("grammar_progress").select("student_id, best_score").then(must),
      supabase.from("practice_results").select("student_id, best_score, practice_texts(skill)").then(must),
      supabase.from("writing_entries").select("student_id, score").then(must),
    ]);
    return { students, classes, members, subs: subs as any[], acts: acts as any[], days: days as any[], sessions: sessions as any[], grammar: grammar as any[], practice: practice as any[], writing: writing as any[] };
  });

  const r = useMemo(() => {
    if (!data) return null;
    const ids = new Set(cls ? data.members.filter((m) => m.class_id === cls).map((m) => m.student_id) : data.students.map((s) => s.id));
    const studs = data.students.filter((s) => ids.has(s.id));
    const subs = data.subs.filter((s) => ids.has(s.student_id));
    const weeks = new Map<string, { notas: number[]; acessos: number; minutos: number; comp: number[] }>();
    const W = (k: string) => { if (!weeks.has(k)) weeks.set(k, { notas: [], acessos: 0, minutos: 0, comp: [] }); return weeks.get(k)!; };
    for (const s of subs) { const p = pct(s.final_score ?? s.auto_score, s.max_score); if (p != null) W(weekKey(new Date(s.submitted_at))).notas.push(p); }
    for (const d of data.days.filter((d) => ids.has(d.student_id))) W(weekKey(new Date(d.day + "T12:00"))).acessos++;
    for (const t of data.sessions.filter((t) => ids.has(t.student_id))) {
      const w = W(weekKey(new Date(t.started_at)));
      w.minutos += Math.round((t.duration_seconds ?? 0) / 60);
      if (t.report?.fluency_score != null) w.comp.push(t.report.fluency_score * 10);
    }
    const timeline = [...weeks.entries()].sort().slice(-12).map(([k, w]) => ({ semana: fmtDate(k).slice(0, 5), nota: avg(w.notas), acessos: w.acessos, minutos: w.minutos, fluencia: avg(w.comp) }));

    const cat: Record<string, number[]> = {};
    for (const s of subs) { const p = pct(s.final_score ?? s.auto_score, s.max_score); if (p != null) (cat[categoryLabel(s.activities?.category)] ??= []).push(p); }
    for (const g of data.grammar.filter((g) => ids.has(g.student_id))) (cat["Gramática"] ??= []).push(Number(g.best_score));
    for (const p of data.practice.filter((p) => ids.has(p.student_id))) (cat[p.practice_texts?.skill === "listening" ? "Listening" : "Reading"] ??= []).push(Number(p.best_score));
    for (const w of data.writing.filter((w) => ids.has(w.student_id) && w.score != null)) (cat["Writing"] ??= []).push(Number(w.score));
    const skills = Object.entries(cat).map(([skill, xs]) => ({ skill, media: avg(xs) }));

    const rows = studs.map((s) => {
      const classIds = data.members.filter((m) => m.student_id === s.id).map((m) => m.class_id);
      const assigned = data.acts.filter((a) => a.student_id === s.id || (!a.student_id && (!a.class_id || classIds.includes(a.class_id))));
      const mySubs = subs.filter((x) => x.student_id === s.id);
      const done = new Set(mySubs.map((x) => x.activity_id));
      const sessions = data.sessions.filter((t) => t.student_id === s.id);
      return {
        id: s.id, name: s.full_name, level: levelLabel(s.level),
        media: avg(mySubs.map((x) => pct(x.final_score ?? x.auto_score, x.max_score)).filter((x): x is number => x != null)),
        aproveitamento: assigned.length ? Math.round((assigned.filter((a) => done.has(a.id)).length / assigned.length) * 100) : null,
        dias: data.days.filter((d) => d.student_id === s.id).length,
        tutorMin: Math.round(sessions.reduce((a, t) => a + (t.duration_seconds ?? 0), 0) / 60),
        tutorN: sessions.length,
      };
    });
    return { timeline, skills, rows };
  }, [data, cls]);

  const exportPdf = () => {
    if (!r || !data) return;
    const name = cls ? data.classes.find((c) => c.id === cls)?.name : "Todos os alunos";
    exportReportPDF({
      title: `Relatório da turma — ${name}`,
      subtitle: "Últimos 120 dias",
      platform: info.platform_name,
      filename: `relatorio-turma-${(name ?? "geral").replace(/\s+/g, "-").toLowerCase()}.pdf`,
      sections: [
        { heading: "Desempenho por habilidade", table: { head: ["Habilidade", "Média (%)"], rows: r.skills.map((s) => [s.skill, s.media ?? "—"]) } },
        { heading: "Evolução semanal", table: { head: ["Semana", "Nota média (%)", "Dias de acesso", "Minutos com IA", "Fluência (%)"], rows: r.timeline.map((t) => [t.semana, t.nota ?? "—", t.acessos, t.minutos, t.fluencia ?? "—"]) } },
        { heading: "Alunos", table: { head: ["Aluno", "Nível", "Média (%)", "Aproveitamento (%)", "Dias estudados", "Tutor IA"], rows: r.rows.map((x) => [x.name, x.level, x.media ?? "—", x.aproveitamento ?? "—", x.dias, `${x.tutorN} sessões / ${x.tutorMin} min`]) } },
      ],
    });
  };

  return (
    <div>
      <PageHeader title="Relatórios pedagógicos" subtitle="Evolução, aproveitamento, frequência e conversação"
        actions={<Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportPdf} disabled={!r}>Exportar PDF</Button>} />
      <Select className="mb-4 sm:w-72" value={cls} onChange={(e) => setCls(e.target.value)}><option value="">Todos os alunos</option>{data?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      <Loadable loading={loading} error={error} reload={reload}>
        {r && (r.rows.length === 0 ? <Empty title="Sem alunos nesta seleção" /> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Alunos" value={r.rows.length} />
              <Stat label="Nota média" value={`${avg(r.rows.map((x) => x.media).filter((x): x is number => x != null)) ?? "—"}%`} />
              <Stat label="Aproveitamento" value={`${avg(r.rows.map((x) => x.aproveitamento).filter((x): x is number => x != null)) ?? "—"}%`} hint="Atividades concluídas / atribuídas" />
              <Stat label="Prática com IA" value={`${r.rows.reduce((a, x) => a + x.tutorMin, 0)} min`} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h3 className="mb-3 font-medium">Evolução das notas e da conversação</h3>
                <div className="h-64"><ResponsiveContainer><LineChart data={r.timeline}><CartesianGrid stroke="#26262f" vertical={false} /><XAxis dataKey="semana" stroke="#71717a" fontSize={12} /><YAxis domain={[0, 100]} stroke="#71717a" fontSize={12} /><Tooltip {...tip} /><Legend /><Line dataKey="nota" name="Nota média (%)" stroke="#a855f7" strokeWidth={2} connectNulls /><Line dataKey="fluencia" name="Fluência na conversação (%)" stroke="#38bdf8" strokeWidth={2} connectNulls /></LineChart></ResponsiveContainer></div>
              </Card>
              <Card>
                <h3 className="mb-3 font-medium">Frequência de acesso e prática com IA</h3>
                <div className="h-64"><ResponsiveContainer><BarChart data={r.timeline}><CartesianGrid stroke="#26262f" vertical={false} /><XAxis dataKey="semana" stroke="#71717a" fontSize={12} /><YAxis stroke="#71717a" fontSize={12} /><Tooltip {...tip} /><Legend /><Bar dataKey="acessos" name="Dias de acesso" fill="#7c3aed" radius={[4, 4, 0, 0]} /><Bar dataKey="minutos" name="Minutos com IA" fill="#c084fc" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
              </Card>
              <Card className="lg:col-span-2">
                <h3 className="mb-3 font-medium">Desempenho por habilidade (gramática, leitura, escrita, listening…)</h3>
                {r.skills.length === 0 ? <p className="text-sm text-zinc-500">Sem dados.</p> : (
                  <div className="h-64"><ResponsiveContainer><BarChart data={r.skills}><CartesianGrid stroke="#26262f" vertical={false} /><XAxis dataKey="skill" stroke="#71717a" fontSize={12} /><YAxis domain={[0, 100]} stroke="#71717a" fontSize={12} /><Tooltip {...tip} /><Bar dataKey="media" name="Média (%)" fill="#9333ea" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
                )}
              </Card>
            </div>
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-line text-left text-xs uppercase text-zinc-500"><tr><th className="px-4 py-3">Aluno</th><th className="px-4 py-3">Nível</th><th className="px-4 py-3">Média</th><th className="px-4 py-3">Aproveitamento</th><th className="px-4 py-3">Dias estudados</th><th className="px-4 py-3">Tutor IA</th><th /></tr></thead>
                <tbody>{r.rows.map((x) => (
                  <tr key={x.id} className="border-b border-line/60">
                    <td className="px-4 py-3">{x.name}</td><td className="px-4 py-3">{x.level}</td>
                    <td className="px-4 py-3">{x.media ?? "—"}{x.media != null && "%"}</td><td className="px-4 py-3">{x.aproveitamento ?? "—"}{x.aproveitamento != null && "%"}</td>
                    <td className="px-4 py-3">{x.dias}</td><td className="px-4 py-3">{x.tutorN} · {x.tutorMin} min</td>
                    <td className="px-4 py-3 text-right"><Link to={`/professora/alunos/${x.id}`}><Button size="sm" variant="ghost">Relatório individual</Button></Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          </div>
        ))}
      </Loadable>
    </div>
  );
}
