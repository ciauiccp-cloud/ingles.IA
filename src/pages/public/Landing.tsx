import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight, BarChart3, Bot, BookOpen, CalendarDays, CheckCircle2, Headphones, Mic, PenLine, ShieldCheck, Sparkles, Trophy, Users,
} from "lucide-react";
import { Logo, usePublicInfo } from "../../components/Logo";
import { Button } from "../../components/ui";
import { useAuth } from "../../lib/auth";

const features = [
  { icon: <Bot />, title: "Tutor de conversação com IA", text: "Pratique inglês por texto ou voz, com correções gentis e explicações em português." },
  { icon: <Mic />, title: "Fale e ouça", text: "Reconhecimento de fala e respostas em áudio para treinar pronúncia e listening." },
  { icon: <BookOpen />, title: "Aulas e materiais", text: "Todas as aulas, apostilas, áudios e vídeos organizados em um só lugar." },
  { icon: <CheckCircle2 />, title: "Atividades online", text: "Múltipla escolha, completar frases, tradução e mais, com correção automática." },
  { icon: <Headphones />, title: "4 habilidades", text: "Módulos de Listening, Reading, Writing e Speaking adaptados ao seu nível." },
  { icon: <Trophy />, title: "Gamificação", text: "Pontos, medalhas, sequência de dias e desafios semanais para manter o ritmo." },
  { icon: <BarChart3 />, title: "Acompanhamento", text: "Relatórios de evolução para a professora acompanhar cada aluno de perto." },
  { icon: <CalendarDays />, title: "Agenda e avisos", text: "Calendário de aulas, entregas e avaliações, com notificações." },
];

export default function Landing() {
  const { session, profile } = useAuth();
  const info = usePublicInfo();
  if (session && profile) return <Navigate to={profile.role === "teacher" ? "/professora" : "/aluno"} replace />;

  return (
    <div className="min-h-screen glow-bg">
      <header className="sticky top-0 z-20 border-b border-line/60 bg-ink/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <a href="#recursos" className="hidden text-sm text-zinc-400 hover:text-white sm:block px-3">Recursos</a>
            <a href="#professora" className="hidden text-sm text-zinc-400 hover:text-white sm:block px-3">A professora</a>
            <Link to="/entrar"><Button size="sm">Entrar</Button></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:pt-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs text-violet-200">
            <Sparkles className="h-3.5 w-3.5" /> Inglês com inteligência artificial
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Aprenda inglês <span className="text-gradient">conversando</span>, todos os dias.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-zinc-400">
            Aulas, materiais, atividades e um tutor de IA que conversa com você por texto e voz, corrige seus erros e explica tudo em português.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/entrar"><Button size="lg" icon={<ArrowRight className="h-4 w-4" />}>Acessar a plataforma</Button></Link>
            <a href="#recursos"><Button size="lg" variant="secondary">Conhecer as funcionalidades</Button></a>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm text-zinc-500">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Acesso individual e dados protegidos conforme a LGPD
          </div>
        </div>

        <div className="relative animate-fade-up [animation-delay:120ms]">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-brand/30 to-fuchsia-500/10 blur-3xl" />
          <div className="card relative space-y-3 p-5">
            <div className="flex items-center gap-3 border-b border-line pb-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-deep"><Bot className="h-5 w-5" /></div>
              <div><div className="text-sm font-medium">Ivy · Tutor de inglês</div><div className="text-xs text-emerald-400">exemplo de conversa</div></div>
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-ink-3 px-4 py-2.5 text-sm">Hi! Nice to meet you. How old are you?</div>
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-brand to-brand-2 px-4 py-2.5 text-sm">I have 15 years.</div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <div className="font-medium text-amber-200">Muito bem! Uma pequena correção:</div>
              <div className="mt-1 text-zinc-300">Em inglês dizemos <b className="text-white">“I am 15 years old”</b>. Usamos o verbo <i>to be</i> para falar sobre idade.</div>
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-ink-3 px-4 py-2.5 text-sm">Great! You're 15 years old. What do you like to do on weekends?</div>
          </div>
        </div>
      </section>

      <section id="recursos" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-semibold">Tudo o que você precisa para evoluir</h2>
        <p className="mt-2 text-zinc-400">A experiência de uma escola de idiomas com os recursos de uma plataforma tecnológica.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card group p-5 transition duration-300 hover:-translate-y-1 hover:border-brand/50">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-violet-300 transition group-hover:bg-brand group-hover:text-white [&>svg]:h-5 [&>svg]:w-5">{f.icon}</div>
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm text-zinc-400">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="professora" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="card grid gap-8 overflow-hidden p-8 md:grid-cols-[auto_1fr] md:items-center">
          <div className="grid h-28 w-28 place-items-center rounded-3xl bg-gradient-to-br from-brand-2 to-deep font-display text-4xl font-bold shadow-xl shadow-brand/30">
            {(info.teacher_name || "P").slice(0, 1)}
          </div>
          <div>
            <div className="text-sm uppercase tracking-wider text-violet-300">Sua professora</div>
            <h2 className="mt-1 font-display text-2xl font-semibold">{info.teacher_name || "Professora de inglês"}</h2>
            <p className="mt-3 max-w-2xl text-zinc-400">
              {info.teacher_bio || "Aulas personalizadas, acompanhamento individual e prática diária com tecnologia, para você ganhar confiança e falar inglês de verdade."}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: <Users />, t: "Para alunos", d: "Aulas, atividades, conversação com IA, vocabulário e muito mais em uma área fácil de usar." },
            { icon: <PenLine />, t: "Para a professora", d: "Painel completo para gerenciar turmas, aulas, materiais, correções e relatórios." },
            { icon: <ShieldCheck />, t: "Seguro", d: "Cada aluno vê apenas o que é seu. Conversas usadas apenas para acompanhamento pedagógico." },
          ].map((b) => (
            <div key={b.t} className="rounded-2xl border border-line bg-gradient-to-br from-deep/40 to-transparent p-6">
              <div className="text-violet-300 [&>svg]:h-6 [&>svg]:w-6">{b.icon}</div>
              <h3 className="mt-3 font-medium">{b.t}</h3>
              <p className="mt-1 text-sm text-zinc-400">{b.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/entrar"><Button size="lg">Entrar na plataforma</Button></Link>
          <p className="mt-3 text-sm text-zinc-500">O cadastro de alunos é feito pela professora.</p>
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} {info.platform_name || "Fluency Lab"} · Dados tratados conforme a LGPD
      </footer>
    </div>
  );
}
