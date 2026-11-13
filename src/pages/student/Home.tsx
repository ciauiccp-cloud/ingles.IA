import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Flame, ListChecks, MessagesSquare, Star, Target, Trophy } from "lucide-react";
import { Badge, Button, Card, Loadable, Progress } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { fetchMyClasses } from "../../lib/data";
import { BADGES, fmtDate, fmtDateTime, levelLabel, pct, xpLevel } from "../../lib/constants";

export async function loadStudentHome(uid: string, teacherId: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  const [classes, lessons, acts, subs, badges, settings, events, weekVocab] = await Promise.all([
    fetchMyClasses(uid),
    supabase.from("lessons").select("*").gte("lesson_date", today).neq("status", "cancelled").order("lesson_date").limit(4).then(must),
    supabase.from("activities").select("*").order("due_date", { ascending: true, nullsFirst: false }).then(must),
    supabase.rpc("get_my_submissions").then(must),
    supabase.from("student_badges").select("*").eq("student_id", uid).then(must),
    teacherId ? supabase.from("teacher_settings").select("*").eq("teacher_id", teacherId).maybeSingle().then(must) : Promise.resolve(null),
    supabase.from("events").select("*").gte("starts_at", new Date().toISOString()).order("starts_at").limit(4).then(must),
    supabase.from("vocab_reviews").select("word_id", { count: "exact", head: true }).eq("student_id", uid).gte("last_reviewed", new Date(Date.now() - 7 * 864e5).toISOString()),
  ]);
  const subsArr = (subs as any[]) ?? [];
  const done = new Set(subsArr.map((s) => s.activity_id));
  const pending = (acts as any[]).filter((a) => !done.has(a.id));
  return {
    classes, lessons: lessons as any[], pending, subs: subsArr, badges: badges as any[], settings: settings as any,
    events: events as any[], weekVocab: weekVocab.count ?? 0, totalActs: (acts as any[]).length,
  };
}

export default function Home() {
  const { profile } = useAuth();
  const { data, loading, error, reload } = useAsync(() => loadStudentHome(profile!.id, profile!.teacher_id));
  const gam = data?.settings?.gamification_enabled ?? true;
  const xp = xpLevel(profile!.points);
  const released = data?.subs.filter((s) => s.released) ?? [];
  const progress = data && data.totalActs ? Math.round(((data.totalActs - data.pending.length) / data.totalActs) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden p-6 animate-fade-up">
        <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-brand/30 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-violet-300">Welcome back!</p>
            <h1 className="font-display text-3xl font-semibold">Olá, {profile!.full_name.split(" ")[0]} 👋</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>Nível: {levelLabel(profile!.level)}</Badge>
              {data?.classes.map((c) => <Badge key={c.id} tone="zinc">{c.name}</Badge>)}
            </div>
          </div>
          <Link to="/aluno/conversacao"><Button size="lg" icon={<MessagesSquare className="h-5 w-5" />}>Praticar conversação</Button></Link>
        </div>
      </div>

      <Loadable loading={loading} error={error} reload={reload}>
        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card className="p-4"><div className="flex items-center gap-2 text-xs uppercase text-zinc-400"><Flame className="h-4 w-4 text-orange-400" /> Sequência</div><div className="mt-2 font-display text-2xl font-semibold">{profile!.streak} {profile!.streak === 1 ? "dia" : "dias"}</div><div className="text-xs text-zinc-500">Recorde: {profile!.best_streak}</div></Card>
              <Card className="p-4"><div className="flex items-center gap-2 text-xs uppercase text-zinc-400"><Target className="h-4 w-4 text-violet-300" /> Progresso geral</div><div className="mt-2 font-display text-2xl font-semibold">{progress}%</div><Progress value={progress} className="mt-2" /></Card>
              <Card className="p-4"><div className="flex items-center gap-2 text-xs uppercase text-zinc-400"><ListChecks className="h-4 w-4 text-amber-300" /> Pendentes</div><div className="mt-2 font-display text-2xl font-semibold">{data.pending.length}</div><div className="text-xs text-zinc-500">atividades</div></Card>
              {gam ? (
                <Card className="p-4"><div className="flex items-center gap-2 text-xs uppercase text-zinc-400"><Star className="h-4 w-4 text-yellow-300" /> Nível {xp.level}</div><div className="mt-2 font-display text-2xl font-semibold">{profile!.points} pts</div><Progress value={xp.progress} className="mt-2" /></Card>
              ) : <Card className="p-4"><div className="text-xs uppercase text-zinc-400">Notas liberadas</div><div className="mt-2 font-display text-2xl font-semibold">{released.length}</div></Card>}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <div className="mb-3 flex items-center justify-between"><h3 className="font-medium">Atividades pendentes</h3><Link to="/aluno/atividades" className="text-xs text-violet-300 hover:underline">Ver todas</Link></div>
                {data.pending.length === 0 ? <p className="text-sm text-zinc-500">Tudo em dia! 🎉</p> : (
                  <ul className="space-y-2">{data.pending.slice(0, 5).map((a) => (
                    <li key={a.id}><Link to={`/aluno/atividades/${a.id}`} className="flex items-center justify-between rounded-xl border border-line p-3 transition hover:border-brand/50">
                      <div><div className="text-sm font-medium">{a.title}</div><div className="text-xs text-zinc-400">{a.due_date ? `Entrega: ${fmtDateTime(a.due_date)}` : "Sem prazo"}</div></div>
                      <ArrowRight className="h-4 w-4 text-zinc-500" />
                    </Link></li>
                  ))}</ul>
                )}
              </Card>
              <Card>
                <h3 className="mb-3 font-medium">Próximas aulas e compromissos</h3>
                {data.lessons.length + data.events.length === 0 ? <p className="text-sm text-zinc-500">Nada agendado.</p> : (
                  <ul className="space-y-2 text-sm">
                    {data.lessons.map((l) => <li key={l.id} className="flex gap-2"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /><div><div>{l.title}</div><div className="text-xs text-zinc-500">{fmtDate(l.lesson_date)} {l.start_time?.slice(0, 5)}</div></div></li>)}
                    {data.events.filter((e) => e.kind !== "lesson").map((e) => <li key={e.id} className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fuchsia-500" /><div><div>{e.title}</div><div className="text-xs text-zinc-500">{fmtDateTime(e.starts_at)}</div></div></li>)}
                  </ul>
                )}
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <h3 className="mb-3 font-medium">Últimas notas</h3>
                {released.length === 0 ? <p className="text-sm text-zinc-500">Nenhuma nota liberada ainda.</p> : (
                  <ul className="space-y-2 text-sm">{released.slice(0, 5).map((s) => {
                    const p = pct(s.final_score, s.max_score);
                    return <li key={s.id} className="flex items-center justify-between"><span className="truncate">{s.activity_title}</span><Badge tone={p != null && p >= 70 ? "green" : "amber"}>{p}%</Badge></li>;
                  })}</ul>
                )}
              </Card>
              <Card>
                <h3 className="mb-3 font-medium">Metas de aprendizagem</h3>
                {profile!.goals ? <p className="text-sm text-zinc-300">{profile!.goals}</p> : <p className="text-sm text-zinc-500">Sua professora ainda não definiu metas.</p>}
                {gam && data.settings?.weekly_vocab_goal > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-zinc-400"><span>Meta semanal de vocabulário</span><span>{data.weekVocab}/{data.settings.weekly_vocab_goal}</span></div>
                    <Progress value={(data.weekVocab / data.settings.weekly_vocab_goal) * 100} className="mt-1.5" />
                  </div>
                )}
                {gam && data.settings?.weekly_challenge && (
                  <div className="mt-4 rounded-xl border border-brand/30 bg-brand/10 p-3 text-sm"><div className="text-xs font-semibold uppercase text-violet-300">Desafio da semana</div>{data.settings.weekly_challenge}</div>
                )}
              </Card>
              {gam && (
                <Card>
                  <div className="mb-3 flex items-center justify-between"><h3 className="font-medium">Medalhas</h3><Link to="/aluno/desempenho" className="text-xs text-violet-300 hover:underline">Ver todas</Link></div>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(BADGES).map(([name, b]) => {
                      const has = data.badges.some((x) => x.badge === name);
                      return <div key={name} title={`${name}: ${b.desc}`} className={`grid aspect-square place-items-center rounded-xl border text-2xl ${has ? "border-brand/50 bg-brand/15" : "border-line opacity-30 grayscale"}`}>{b.emoji}</div>;
                    })}
                  </div>
                  <p className="mt-2 text-xs text-zinc-500"><Trophy className="mr-1 inline h-3 w-3" />{data.badges.length} de {Object.keys(BADGES).length} conquistadas</p>
                </Card>
              )}
            </div>
          </>
        )}
      </Loadable>
    </div>
  );
}
