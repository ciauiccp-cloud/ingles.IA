import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock, MessagesSquare, ShieldCheck, Users } from "lucide-react";
import { Badge, Button, Card, Empty, Loadable, PageHeader, Select, Stat } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { fetchClasses, fetchMembers, fetchStudents, weekKey } from "../../lib/data";
import { fmtDate, fmtDateTime, levelLabel, topicLabel } from "../../lib/constants";
import { SessionReportView, TranscriptModal } from "../shared/TutorReport";

export default function TutorReports() {
  const { profile } = useAuth();
  const [cls, setCls] = useState("");
  const [student, setStudent] = useState("");
  const [openS, setOpenS] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsync(async () => {
    const [sessions, students, classes, members] = await Promise.all([
      supabase.from("tutor_sessions").select("*").order("started_at", { ascending: false }).limit(1000).then(must),
      fetchStudents(profile!.id), fetchClasses(), fetchMembers(),
    ]);
    return { sessions: sessions as any[], students, classes, members };
  });

  const filtered = useMemo(() => (data?.sessions ?? []).filter((s) =>
    (!student || s.student_id === student) && (!cls || data!.members.some((m) => m.class_id === cls && m.student_id === s.student_id))), [data, cls, student]);

  const perStudent = useMemo(() => {
    const map = new Map<string, { n: number; secs: number; topics: Record<string, number>; diff: Record<string, number>; vocab: number; comp: number[] }>();
    for (const s of filtered) {
      const e = map.get(s.student_id) ?? { n: 0, secs: 0, topics: {}, diff: {}, vocab: 0, comp: [] };
      e.n++; e.secs += s.duration_seconds ?? 0;
      e.topics[s.topic] = (e.topics[s.topic] ?? 0) + 1;
      for (const d of s.report?.difficulties ?? []) e.diff[d] = (e.diff[d] ?? 0) + 1;
      e.vocab += s.report?.vocabulary_learned?.length ?? 0;
      if (s.report?.comprehension_score != null) e.comp.push(s.report.comprehension_score);
      map.set(s.student_id, e);
    }
    return [...map.entries()].map(([id, e]) => ({ id, name: data?.students.find((x) => x.id === id)?.full_name ?? "—", ...e }));
  }, [filtered, data]);

  const weekly = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of filtered) { const k = weekKey(new Date(s.started_at)); m.set(k, (m.get(k) ?? 0) + Math.round((s.duration_seconds ?? 0) / 60)); }
    return [...m.entries()].sort().slice(-10).map(([k, v]) => ({ semana: fmtDate(k).slice(0, 5), minutos: v }));
  }, [filtered]);

  const topDiff = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of perStudent) for (const [d, n] of Object.entries(p.diff)) m[d] = (m[d] ?? 0) + n;
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [perStudent]);

  return (
    <div>
      <PageHeader title="Tutor de IA — acompanhamento" subtitle="Uso, tempo de prática, temas, dificuldades e relatórios das conversas" />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-line bg-ink-2 p-3 text-xs text-zinc-400">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
        Os alunos são avisados, antes de usar o tutor, de que as conversas educacionais podem ser analisadas para acompanhamento pedagógico. Use estes registros apenas para essa finalidade.
      </div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Select className="sm:w-60" value={cls} onChange={(e) => setCls(e.target.value)}><option value="">Todas as turmas</option>{data?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select className="sm:w-60" value={student} onChange={(e) => setStudent(e.target.value)}><option value="">Todos os alunos</option>{data?.students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</Select>
      </div>
      <Loadable loading={loading} error={error} reload={reload}>
        {filtered.length === 0 ? <Empty title="Nenhuma conversa registrada" text="Quando os alunos praticarem com o tutor, os relatórios aparecerão aqui." /> : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Sessões" value={filtered.length} icon={<MessagesSquare className="h-4 w-4" />} />
              <Stat label="Tempo de prática" value={`${Math.round(filtered.reduce((a, s) => a + (s.duration_seconds ?? 0), 0) / 60)} min`} icon={<Clock className="h-4 w-4" />} />
              <Stat label="Alunos ativos" value={perStudent.length} icon={<Users className="h-4 w-4" />} />
              <Stat label="Interações" value={filtered.reduce((a, s) => a + s.interactions, 0)} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <h3 className="mb-3 font-medium">Minutos de prática por semana</h3>
                <div className="h-56"><ResponsiveContainer><BarChart data={weekly}><CartesianGrid stroke="#26262f" vertical={false} /><XAxis dataKey="semana" stroke="#71717a" fontSize={12} /><YAxis stroke="#71717a" fontSize={12} /><Tooltip contentStyle={{ background: "#15151c", border: "1px solid #26262f", borderRadius: 12 }} /><Bar dataKey="minutos" fill="#9333ea" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
              </Card>
              <Card>
                <h3 className="mb-3 font-medium">Principais dificuldades</h3>
                {topDiff.length === 0 ? <p className="text-sm text-zinc-500">Sem dados.</p> : <ul className="space-y-1.5 text-sm">{topDiff.map(([d, n]) => <li key={d} className="flex justify-between"><span>{d}</span><Badge tone="red">{n}</Badge></li>)}</ul>}
              </Card>
            </div>
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-line text-left text-xs uppercase text-zinc-500"><tr><th className="px-4 py-3">Aluno</th><th className="px-4 py-3">Usos</th><th className="px-4 py-3">Tempo</th><th className="px-4 py-3">Temas preferidos</th><th className="px-4 py-3">Vocabulário</th><th className="px-4 py-3">Compreensão</th></tr></thead>
                <tbody>{perStudent.map((p) => (
                  <tr key={p.id} className="border-b border-line/60">
                    <td className="px-4 py-3"><Link className="hover:text-violet-300" to={`/professora/alunos/${p.id}`}>{p.name}</Link></td>
                    <td className="px-4 py-3">{p.n}</td>
                    <td className="px-4 py-3">{Math.round(p.secs / 60)} min</td>
                    <td className="px-4 py-3 text-zinc-400">{Object.entries(p.topics).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => topicLabel(t)).join(", ")}</td>
                    <td className="px-4 py-3">{p.vocab} palavras</td>
                    <td className="px-4 py-3">{p.comp.length ? `${(p.comp.reduce((a, b) => a + b, 0) / p.comp.length).toFixed(1)}/10` : "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
            <div>
              <h3 className="mb-3 font-medium">Sessões recentes</h3>
              <div className="space-y-2">
                {filtered.slice(0, 40).map((s) => (
                  <Card key={s.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{data!.students.find((x) => x.id === s.student_id)?.full_name} · {topicLabel(s.topic)}</div>
                        <div className="text-xs text-zinc-400">{fmtDateTime(s.started_at)} · {levelLabel(s.level)} · {Math.round((s.duration_seconds ?? 0) / 60)} min · {s.interactions} interações · {s.mode === "voice" ? "🎙️ voz" : "⌨️ texto"}</div>
                      </div>
                      <div className="flex gap-2">
                        {s.report && <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>{expanded === s.id ? "Ocultar relatório" : "Relatório"}</Button>}
                        <Button size="sm" variant="secondary" onClick={() => setOpenS(s)}>Conversa</Button>
                      </div>
                    </div>
                    {expanded === s.id && s.report && <div className="mt-4 border-t border-line pt-4"><SessionReportView report={s.report} /></div>}
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </Loadable>
      <TranscriptModal session={openS} onClose={() => setOpenS(null)} />
    </div>
  );
}
