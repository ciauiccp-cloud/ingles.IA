import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Pause, Play, XCircle } from "lucide-react";
import { Badge, Button, Card, Empty, Loadable, PageHeader, Progress, Select, cx, useToast } from "../../components/ui";
import { AudioPlayer, MediaView, useSignedUrl } from "../../components/FileLink";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { errMsg, supabase } from "../../lib/supabase";
import { LEVELS, levelLabel } from "../../lib/constants";
import { speak, speechSynthesisSupported, stopSpeaking } from "../../lib/speech";

const GENRE: Record<string, string> = { story: "História curta", news: "Notícia adaptada", dialogue: "Diálogo", article: "Artigo", other: "Texto" };

export default function Practice({ skill }: { skill: "listening" | "reading" }) {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [level, setLevel] = useState("");
  const [open, setOpen] = useState<any>(null);
  const { data, loading, error, reload } = useAsync(async () => {
    const [texts, res, mats] = await Promise.all([
      supabase.from("practice_texts").select("*").eq("skill", skill).order("level").order("created_at").then(must),
      supabase.from("practice_results").select("*").eq("student_id", profile!.id).then(must),
      supabase.from("materials").select("*").eq("skill", skill).then(must),
    ]);
    return { texts: texts as any[], res: res as any[], mats: mats as any[] };
  }, [skill]);
  useEffect(() => { setOpen(null); }, [skill]);

  if (open) return <PracticeItem item={open} skill={skill} onBack={() => { stopSpeaking(); setOpen(null); }} onScore={async (score) => {
    const { error } = await supabase.rpc("save_practice_score", { tid: open.id, score });
    if (error) return toast(errMsg(error), "error");
    toast(`Resultado: ${score}% · +5 pontos`); reload(); refreshProfile();
  }} />;

  const list = (data?.texts ?? []).filter((t) => !level || t.level === level);
  return (
    <div>
      <PageHeader title={skill === "listening" ? "Listening — compreensão auditiva" : "Reading — leitura"}
        subtitle={skill === "listening" ? "Ouça diálogos e áudios em diferentes velocidades e responda às questões" : "Textos por nível, histórias curtas e notícias adaptadas, com glossário"} />
      <Select className="mb-4 sm:w-64" value={level} onChange={(e) => setLevel(e.target.value)}><option value="">Todos os níveis</option>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</Select>
      <Loadable loading={loading} error={error} reload={reload}>
        {list.length === 0 ? <Empty title="Nenhum conteúdo disponível" /> : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map((t) => {
            const r = data!.res.find((x) => x.text_id === t.id);
            return (
              <button key={t.id} onClick={() => setOpen(t)} className="card p-5 text-left transition hover:-translate-y-0.5 hover:border-brand/50">
                <div className="text-2xl">{skill === "listening" ? "🎧" : "📖"}</div>
                <h3 className="mt-2 font-medium">{t.title}</h3>
                <div className="mt-2 flex flex-wrap gap-1"><Badge>{levelLabel(t.level)}</Badge><Badge tone="zinc">{GENRE[t.genre]}</Badge></div>
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400"><Progress value={r?.best_score ?? 0} className="flex-1" />{r ? `${Math.round(r.best_score)}%` : "novo"}</div>
              </button>
            );
          })}</div>
        )}
        {(data?.mats.length ?? 0) > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 font-medium">Materiais da professora</h3>
            <div className="grid gap-3 md:grid-cols-2">{data!.mats.map((m) => <Card key={m.id}><div className="mb-2 font-medium">{m.title}</div><MediaView path={m.file_path} url={m.url} kind={m.kind} name={m.title} />{m.body && <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{m.body}</p>}</Card>)}</div>
          </div>
        )}
      </Loadable>
    </div>
  );
}

function PracticeItem({ item, skill, onBack, onScore }: { item: any; skill: string; onBack: () => void; onScore: (s: number) => void }) {
  const [showText, setShowText] = useState(skill === "reading");
  const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [ans, setAns] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const audioUrl = useSignedUrl(item.audio_path);
  const qs = item.questions ?? [];

  const playTTS = () => {
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    setPlaying(true);
    const text = item.body.replace(/^[A-Z][\w ]{0,20}:\s*/gm, "");
    speak(text, { rate: rate * 0.95, onEnd: () => setPlaying(false) });
  };
  const check = () => {
    setChecked(true);
    onScore(Math.round((qs.filter((q: any, i: number) => ans[i] === q.answer).length / Math.max(1, qs.length)) * 100));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar</button>
      <PageHeader title={item.title} subtitle={<span className="flex gap-2"><Badge>{levelLabel(item.level)}</Badge><Badge tone="zinc">{GENRE[item.genre]}</Badge></span>} />
      <div className="space-y-4">
        {skill === "listening" && (
          <Card className="space-y-3">
            {item.video_url && <MediaView url={item.video_url} kind="video" />}
            {item.audio_path ? (audioUrl ? <AudioPlayer src={audioUrl} /> : <p className="text-sm text-zinc-500">Carregando áudio…</p>) : speechSynthesisSupported() ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button icon={playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} onClick={playTTS}>{playing ? "Parar" : "Ouvir"}</Button>
                <div className="flex items-center gap-1 text-xs text-zinc-400">Velocidade:{[0.75, 1, 1.25].map((r) => <button key={r} onClick={() => setRate(r)} className={cx("rounded-lg px-2 py-1", rate === r ? "bg-brand text-white" : "bg-ink-3")}>{r}x</button>)}</div>
              </div>
            ) : <p className="text-sm text-amber-300">Seu navegador não suporta áudio sintetizado. Leia a transcrição.</p>}
            <Button size="sm" variant="ghost" icon={showText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} onClick={() => setShowText(!showText)}>{showText ? "Ocultar transcrição" : "Mostrar transcrição"}</Button>
          </Card>
        )}
        {showText && <Card><div className="whitespace-pre-wrap text-[15px] leading-relaxed">{item.body}</div></Card>}
        {item.glossary?.length > 0 && (showText || checked) && (
          <Card><h3 className="mb-2 font-medium">Vocabulário do texto</h3><div className="flex flex-wrap gap-1.5">{item.glossary.map((g: any, i: number) => <Badge key={i} tone="sky">{g.word} = {g.translation}</Badge>)}</div></Card>
        )}
        {qs.length > 0 && (
          <Card>
            <h3 className="mb-3 font-medium">Compreensão</h3>
            <div className="space-y-4">{qs.map((q: any, i: number) => (
              <div key={i}>
                <div className="mb-2 text-sm">{i + 1}. {q.prompt}</div>
                <div className="flex flex-wrap gap-2">{q.options.map((o: string, k: number) => {
                  const sel = ans[i] === k;
                  return <button key={k} disabled={checked} onClick={() => setAns({ ...ans, [i]: k })}
                    className={cx("flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm", checked && k === q.answer ? "border-emerald-500 bg-emerald-500/15" : checked && sel ? "border-rose-500 bg-rose-500/15" : sel ? "border-brand bg-brand/15" : "border-line hover:border-brand/40")}>
                    {checked && k === q.answer && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}{checked && sel && k !== q.answer && <XCircle className="h-4 w-4 text-rose-400" />}{o}</button>;
                })}</div>
              </div>
            ))}</div>
            <div className="mt-4">{!checked ? <Button disabled={Object.keys(ans).length < qs.length} onClick={check}>Corrigir</Button> : <Button variant="secondary" onClick={() => { setAns({}); setChecked(false); }}>Tentar novamente</Button>}</div>
          </Card>
        )}
      </div>
    </div>
  );
}
