import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Flame, MessagesSquare, Star, Trophy } from "lucide-react";
import { Badge, Card, Empty, Loadable, PageHeader, Progress, Stat, cx } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { fetchMyClasses } from "../../lib/data";
import { BADGES, categoryLabel, fmtDate, fmtDateTime, pct, topicLabel, xpLevel } from "../../lib/constants";

const tip = { contentStyle: { background: "#15151c", border: "1px solid #26262f", borderRadius: 12 } };

export default function Performance() {
  const { profile } = useAuth();
  const uid = profile!.id;
  const { data, loading, error, reload } = useAsync(async () => {
    const [subs, sessions, badges, days, grammar, practice, writing, points, settings, classes] = await Promise.all([
      supabase.rpc("get_my_submissions").then(must),
      supabase.from("tutor_sessions").select("*").eq("student_id", uid).order("started_at").then(must),
      supabase.from("student_badges").select("*").eq("student_id", uid).then(must),
      supabase.from("study_days").select("day").eq("student_id", uid).gte("day", new Date(Date.now() - 84 * 864e5).toISOString().slice(0, 10)).then(must),
      supabase.from("grammar_progress").select("best_score").eq("student_id", uid).then(must),
      supabase.from("practice_results").select("best_score, practice_texts(skill)").eq("student_id", uid).then(must),
      supabase.from("writing_entries").select("score").eq("student_id", uid).then(must),
      supabase.from("point_events").select("*").eq("student_id", uid).order("created_at", { ascending: false }).limit(15).then(must),
      profile!.teacher_id ? supabase.from("teacher_settings").select("*").eq("teacher_id", profile!.teacher_id).maybeSingle().then(must) : Promise.resolve(null),
      fetchMyClasses(uid),
    ]);
    const settingsObj = settings as any;
    let ranking: any[] = [];
    if (settingsObj?.ranking_enabled && settingsObj?.gamification_enabled && classes[0]) {
      const r = await supabase.rpc("class_ranking", { cid: classes[0].id });
      ranking = (r.data as any[]) ?? [];
    }
    return { subs: ((subs as any[]) ?? []).filter((s) => s.released), sessions: sessions as any[], badges: badges as any[], days: (days as any[]).map((d) => d.day as string), grammar: grammar as any[], practice: practice as any[], writing: writing as any[], points: points as any[], settings: settingsObj, ranking, className: classes[0]?.name };
  });

  const gam = data?.settings?.gamification_enabled ?? true;
  const xp = xpLevel(profile!.points);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const skills = data ? [
    { skill: "Atividades", media: avg(data.subs.map((s) => pct(s.final_score, s.max_score)!).filter((x) => x != null)) },
    { skill: "Gramática", media: avg(data.grammar.map((g) => Number(g.best_score))) },
    { skill: "Listening", media: avg(data.practice.filter((p) => p.practice_texts?.skill === "listening").map((p) => Number(p.best_score))) },
    { skill: "Reading", media: avg(data.practice.filter((p) => p.practice_texts?.skill === "reading").map((p) => Number(p.best_score))) },
    { skill: "Writing", media: avg(data.writing.filter((w) => w.score != null).map((w) => Number(w.score))) },
    { skill: "Conversação", media: avg(data.sessions.filter((s) => s.report?.fluency_score != null).map((s) => s.report.fluency_score * 10)) },
  ].filter((s) => s.media != null) : [];
  const timeline = data?.subs.slice().reverse().map((s) => ({ data: fmtDate(s.submitted_at).slice(0, 5), nota: pct(s.final_score, s.max_score) })) ?? [];

  // Mapa de calor das últimas 12 semanas
  const heat = Array.from({ length: 84 }, (_, i) => { const d = new Date(Date.now() - (83 - i) * 864e5); return d.toISOString().slice(0, 10); });

  return (
    <div>
      <PageHeader title="Meu desempenho" subtitle="Acompanhe sua evolução, conquistas e histórico" />
      <Loadable loading={loading} error={error} reload={reload}>
        {data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {gam && <Stat label={`Nível ${xp.level}`} value={`${profile!.points} pts`} icon={<Star className="h-4 w-4" />} hint={<Progress value={xp.progress} className="mt-1" />} />}
              <Stat label="Sequência" value={`${profile!.streak} dias`} icon={<Flame className="h-4 w-4" />} hint={`Recorde: ${profile!.best_streak} dias`} accent="bg-orange-500/15 text-orange-300" />
              <Stat label="Conversas com IA" value={data.sessions.length} icon={<MessagesSquare className="h-4 w-4" />} hint={`${Math.round(data.sessions.reduce((a, s) => a + (s.duration_seconds ?? 0), 0) / 60)} min de prática`} />
              <Stat label="Medalhas" value={`${data.badges.length}/${Object.keys(BADGES).length}`} icon={<Trophy className="h-4 w-4" />} accent="bg-yellow-500/15 text-yellow-300" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h3 className="mb-3 font-medium">Evolução das notas</h3>
                {timeline.length === 0 ? <Empty title="Sem notas liberadas ainda" /> : <div className="h-56"><ResponsiveContainer><LineChart data={timeline}><CartesianGrid stroke="#26262f" vertical={false} /><XAxis dataKey="data" stroke="#71717a" fontSize={12} /><YAxis domain={[0, 100]} stroke="#71717a" fontSize={12} /><Tooltip {...tip} /><Line dataKey="nota" name="Nota (%)" stroke="#a855f7" strokeWidth={2} /></LineChart></ResponsiveContainer></div>}
              </Card>
              <Card>
                <h3 className="mb-3 font-medium">Por habilidade</h3>
                {skills.length === 0 ? <Empty title="Pratique para ver seus resultados" /> : <div className="h-56"><ResponsiveContainer><BarChart data={skills}><CartesianGrid stroke="#26262f" vertical={false} /><XAxis dataKey="skill" stroke="#71717a" fontSize={11} /><YAxis domain={[0, 100]} stroke="#71717a" fontSize={12} /><Tooltip {...tip} /><Bar dataKey="media" name="Média (%)" fill="#7c3aed" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>}
              </Card>
            </div>

            <Card>
              <h3 className="mb-3 font-medium">Dias estudados (últimas 12 semanas)</h3>
              <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">{heat.map((d) => <div key={d} title={fmtDate(d)} className={cx("h-4 w-4 rounded-sm", data.days.includes(d) ? "bg-brand" : "bg-zinc-800")} />)}</div>
            </Card>

            {gam && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-3 font-medium">Medalhas</h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {Object.entries(BADGES).map(([name, b]) => {
                      const has = data.badges.find((x) => x.badge === name);
                      return (
                        <div key={name} className={cx("rounded-xl border p-3 text-center", has ? "border-brand/50 bg-brand/10" : "border-line opacity-40 grayscale")}>
                          <div className="text-3xl">{b.emoji}</div><div className="mt-1 text-xs font-medium">{name}</div><div className="text-[10px] text-zinc-400">{has ? fmtDate(has.earned_at) : b.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
                <Card>
                  {data.ranking.length > 0 ? (
                    <>
                      <h3 className="mb-3 font-medium">Ranking — {data.className}</h3>
                      <ol className="space-y-1.5">{data.ranking.slice(0, 10).map((r, i) => (
                        <li key={r.student_id} className={cx("flex justify-between rounded-lg px-3 py-1.5 text-sm", r.student_id === profile!.id ? "bg-brand/20" : "bg-ink-2")}>
                          <span>{i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}º`} {r.full_name.split(" ")[0]}</span><span>{r.points} pts</span>
                        </li>
                      ))}</ol>
                    </>
                  ) : (
                    <>
                      <h3 className="mb-3 font-medium">Pontos recentes</h3>
                      {data.points.length === 0 ? <p className="text-sm text-zinc-500">Nenhum ponto ainda.</p> : <ul className="space-y-1.5 text-sm">{data.points.map((p) => <li key={p.id} className="flex justify-between"><span className="text-zinc-300">{p.reason}</span><Badge tone="green">+{p.points}</Badge></li>)}</ul>}
                    </>
                  )}
                </Card>
              </div>
            )}

            <Card>
              <h3 className="mb-3 font-medium">Histórico de conversação</h3>
              {data.sessions.length === 0 ? <p className="text-sm text-zinc-500">Nenhuma conversa ainda.</p> : (
                <ul className="divide-y divide-line text-sm">{data.sessions.slice().reverse().slice(0, 10).map((s) => (
                  <li key={s.id} className="flex justify-between py-2"><span>{topicLabel(s.topic)} <span className="text-xs text-zinc-500">· {fmtDateTime(s.started_at)}</span></span><span className="text-zinc-400">{Math.round((s.duration_seconds ?? 0) / 60)} min{s.report?.comprehension_score != null && ` · ${s.report.comprehension_score}/10`}</span></li>
                ))}</ul>
              )}
            </Card>
            <Card>
              <h3 className="mb-3 font-medium">Notas liberadas</h3>
              {data.subs.length === 0 ? <p className="text-sm text-zinc-500">Nenhuma.</p> : (
                <ul className="divide-y divide-line text-sm">{data.subs.map((s) => (
                  <li key={s.id} className="flex justify-between py-2"><span>{s.activity_title} <span className="text-xs text-zinc-500">· {categoryLabel(s.category)}</span></span><Badge tone={pct(s.final_score, s.max_score)! >= 70 ? "green" : "amber"}>{pct(s.final_score, s.max_score)}%</Badge></li>
                ))}</ul>
              )}
            </Card>
          </div>
        )}
      </Loadable>
    </div>
  );
}
