import { Link } from "react-router-dom";
import { AlertCircle, BookOpen, CheckCheck, ClipboardList, GraduationCap, MessagesSquare, TrendingUp, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Button, Card, Empty, Loadable, PageHeader, Stat } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { EVENT_KINDS, fmtDate, fmtDateTime } from "../../lib/constants";
import { weekKey } from "../../lib/data";

export default function Dashboard() {
  const { profile } = useAuth();
  const { data, loading, error, reload } = useAsync(async () => {
    const now = new Date().toISOString();
    const [stats, events, lessons, subs, pending] = await Promise.all([
      supabase.rpc("teacher_dashboard").then(must),
      supabase.from("events").select("*, classes(name)").gte("starts_at", now).order("starts_at").limit(6).then(must),
      supabase.from("lessons").select("*, classes(name)").gte("lesson_date", now.slice(0, 10)).neq("status", "cancelled").order("lesson_date").limit(5).then(must),
      supabase.from("submissions").select("submitted_at, final_score, auto_score, max_score").gte("submitted_at", new Date(Date.now() - 70 * 864e5).toISOString()).then(must),
      supabase.from("submissions").select("id, submitted_at, status, activities(title), profiles!submissions_student_id_fkey(full_name)").in("status", ["submitted", "ai_graded"]).order("submitted_at", { ascending: false }).limit(6).then(must),
    ]);
    const weeks = new Map<string, { sum: number; n: number }>();
    for (const s of subs as any[]) {
      if (!s.max_score) continue;
      const k = weekKey(new Date(s.submitted_at));
      const w = weeks.get(k) ?? { sum: 0, n: 0 };
      w.sum += (100 * Number(s.final_score ?? s.auto_score)) / Number(s.max_score);
      w.n++;
      weeks.set(k, w);
    }
    const chart = [...weeks.entries()].sort().map(([k, w]) => ({ semana: fmtDate(k).slice(0, 5), media: Math.round(w.sum / w.n) }));
    return { stats: stats as any, events: events as any[], lessons: lessons as any[], chart, pending: pending as any[] };
  });

  const s = data?.stats;
  return (
    <div>
      <PageHeader title={`Olá, ${profile?.full_name.split(" ")[0]} 👋`} subtitle="Visão geral da sua plataforma de ensino"
        actions={<><Link to="/professora/aulas"><Button variant="secondary">Nova aula</Button></Link><Link to="/professora/atividades"><Button>Nova atividade</Button></Link></>} />
      <Loadable loading={loading} error={error} reload={reload}>
        {s && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Alunos" value={s.students} icon={<Users className="h-4 w-4" />} />
              <Stat label="Turmas ativas" value={s.classes} icon={<GraduationCap className="h-4 w-4" />} />
              <Stat label="Aulas realizadas" value={s.lessons_done} icon={<BookOpen className="h-4 w-4" />} />
              <Stat label="Desempenho geral" value={s.avg_score != null ? `${s.avg_score}%` : "—"} icon={<TrendingUp className="h-4 w-4" />} hint="Média das atividades" />
              <Stat label="Atividades pendentes" value={s.pending} icon={<ClipboardList className="h-4 w-4" />} accent="bg-amber-500/15 text-amber-300" hint="Aguardando correção" />
              <Stat label="Atividades corrigidas" value={s.graded} icon={<CheckCheck className="h-4 w-4" />} accent="bg-emerald-500/15 text-emerald-300" />
              <Stat label="Prática com IA" value={`${s.tutor_minutes} min`} icon={<MessagesSquare className="h-4 w-4" />} hint="Total dos alunos" />
              <Stat label="Precisam de atenção" value={s.attention.length} icon={<AlertCircle className="h-4 w-4" />} accent="bg-rose-500/15 text-rose-300" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <h3 className="mb-4 font-medium">Evolução das notas (média semanal)</h3>
                {data.chart.length === 0 ? <Empty title="Sem dados ainda" text="As médias aparecem quando os alunos começarem a enviar atividades." /> : (
                  <div className="h-64">
                    <ResponsiveContainer>
                      <AreaChart data={data.chart}>
                        <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9333ea" stopOpacity={0.5} /><stop offset="1" stopColor="#9333ea" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid stroke="#26262f" vertical={false} />
                        <XAxis dataKey="semana" stroke="#71717a" fontSize={12} />
                        <YAxis domain={[0, 100]} stroke="#71717a" fontSize={12} />
                        <Tooltip contentStyle={{ background: "#15151c", border: "1px solid #26262f", borderRadius: 12 }} />
                        <Area type="monotone" dataKey="media" name="Média (%)" stroke="#a855f7" fill="url(#g1)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
              <Card>
                <h3 className="mb-3 font-medium">Alunos que precisam de acompanhamento</h3>
                {s.attention.length === 0 ? <p className="text-sm text-zinc-500">Nenhum aluno em alerta. 🎉</p> : (
                  <ul className="space-y-2">
                    {s.attention.map((a: any) => (
                      <li key={a.id}>
                        <Link to={`/professora/alunos/${a.id}`} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white/5">
                          <span className="text-sm">{a.full_name}</span>
                          <span className="text-xs text-zinc-400">
                            {a.avg_score != null ? <Badge tone="red">{a.avg_score}%</Badge> : <Badge tone="zinc">sem notas</Badge>}
                          </span>
                        </Link>
                        <div className="px-3 text-[11px] text-zinc-500">Último estudo: {a.last_study_date ? fmtDate(a.last_study_date) : "nunca"}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <h3 className="mb-3 font-medium">Próximas aulas</h3>
                {data.lessons.length === 0 ? <p className="text-sm text-zinc-500">Nenhuma aula agendada.</p> : (
                  <ul className="space-y-2">{data.lessons.map((l) => (
                    <li key={l.id} className="rounded-xl border border-line p-3">
                      <div className="text-sm font-medium">{l.title}</div>
                      <div className="text-xs text-zinc-400">{fmtDate(l.lesson_date)} {l.start_time?.slice(0, 5)} · {l.classes?.name ?? "Todos os alunos"}</div>
                    </li>))}</ul>
                )}
              </Card>
              <Card>
                <h3 className="mb-3 font-medium">Compromissos</h3>
                {data.events.length === 0 ? <p className="text-sm text-zinc-500">Agenda livre.</p> : (
                  <ul className="space-y-2">{data.events.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                      <span className={`mt-1.5 h-2 w-2 rounded-full ${EVENT_KINDS.find((k) => k.value === e.kind)?.color}`} />
                      <div><div className="text-sm font-medium">{e.title}</div><div className="text-xs text-zinc-400">{fmtDateTime(e.starts_at)} · {e.classes?.name ?? "Geral"}</div></div>
                    </li>))}</ul>
                )}
              </Card>
              <Card>
                <div className="mb-3 flex items-center justify-between"><h3 className="font-medium">Para corrigir</h3><Link to="/professora/correcoes" className="text-xs text-violet-300 hover:underline">Ver todas</Link></div>
                {data.pending.length === 0 ? <p className="text-sm text-zinc-500">Nenhuma atividade aguardando.</p> : (
                  <ul className="space-y-2">{data.pending.map((p) => (
                    <li key={p.id} className="rounded-xl border border-line p-3">
                      <div className="text-sm font-medium">{p.activities?.title}</div>
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>{p.profiles?.full_name} · {fmtDateTime(p.submitted_at)}</span>
                        {p.status === "ai_graded" && <Badge>IA sugeriu nota</Badge>}
                      </div>
                    </li>))}</ul>
                )}
              </Card>
            </div>
          </div>
        )}
      </Loadable>
    </div>
  );
}
