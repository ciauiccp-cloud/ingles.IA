import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mic, MicOff, RefreshCw, Volume2 } from "lucide-react";
import { Badge, Button, Card, Loadable, PageHeader, Progress, Tabs, cx, useToast } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { TUTOR_TOPICS } from "../../lib/constants";
import { createRecognizer, similarity, speak, speechRecognitionSupported } from "../../lib/speech";

export default function Speaking() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"read" | "words" | "repeat" | "sim">("read");
  const voiceBlocked = profile!.is_minor && !profile!.guardian_consent;
  const { data, loading, error } = useAsync(async () => {
    const [words, topics, texts] = await Promise.all([
      supabase.from("vocab_words").select("word, example").then(must),
      supabase.from("grammar_topics").select("examples").then(must),
      supabase.from("practice_texts").select("body").eq("skill", "reading").then(must),
    ]);
    const sentences = [
      ...(topics as any[]).flatMap((t) => (t.examples ?? []).map((e: any) => e.en)),
      ...(words as any[]).map((w) => w.example).filter(Boolean),
    ];
    const paragraphs = (texts as any[]).map((t) => t.body.split(/(?<=[.!?])\s+/).slice(0, 3).join(" "));
    return { words: (words as any[]).map((w) => w.word), sentences, paragraphs };
  });

  return (
    <div>
      <PageHeader title="Speaking — fala" subtitle="Leitura em voz alta, pronúncia, repetição e simulações com a IA" />
      {voiceBlocked ? (
        <Card><p className="text-sm text-amber-300">O uso do microfone depende da autorização do seu responsável, registrada pela professora. Enquanto isso, você pode ouvir as frases e praticar a conversação por texto.</p></Card>
      ) : !speechRecognitionSupported() ? (
        <Card className="mb-4"><p className="text-sm text-amber-300">Para os exercícios de fala, use o Google Chrome ou o Microsoft Edge (o reconhecimento de voz não é suportado neste navegador).</p></Card>
      ) : null}
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "read", label: "Leitura em voz alta" }, { value: "words", label: "Pronúncia" }, { value: "repeat", label: "Repetição" }, { value: "sim", label: "Simulações reais" }]} />
      <Loadable loading={loading} error={error}>
        {data && tab === "read" && <SayIt items={data.paragraphs.length ? data.paragraphs : data.sentences} mode="read" disabled={voiceBlocked} />}
        {data && tab === "words" && <SayIt items={data.words} mode="word" disabled={voiceBlocked} />}
        {data && tab === "repeat" && <SayIt items={data.sentences} mode="repeat" disabled={voiceBlocked} />}
        {tab === "sim" && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TUTOR_TOPICS.filter((t) => t.value !== "free").map((t) => (
              <Link key={t.value} to="/aluno/conversacao" className="card p-5 transition hover:-translate-y-0.5 hover:border-brand/50">
                <div className="text-3xl">{t.emoji}</div><div className="mt-2 font-medium">{t.label}</div><div className="text-xs text-zinc-400">Pratique com a tutora de IA (escolha este tema e o modo voz)</div>
              </Link>
            ))}
          </div>
        )}
      </Loadable>
    </div>
  );
}

function SayIt({ items, mode, disabled }: { items: string[]; mode: "read" | "word" | "repeat"; disabled: boolean }) {
  const { toast } = useToast();
  const pool = useMemo(() => [...new Set(items)].filter(Boolean), [items]);
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * Math.max(1, pool.length)));
  const [listening, setListening] = useState(false);
  const [said, setSaid] = useState("");
  const [hidden, setHidden] = useState(mode === "repeat");
  const recRef = useRef<any>(null);
  const target = pool[idx % Math.max(1, pool.length)] ?? "";
  const result = said ? similarity(target, said) : null;

  const next = () => { setIdx(Math.floor(Math.random() * pool.length)); setSaid(""); setHidden(mode === "repeat"); };
  const listen = () => {
    if (listening) { recRef.current?.stop(); return; }
    const rec = createRecognizer({
      onInterim: setSaid,
      onFinal: (t) => { setSaid(t); setHidden(false); supabase.rpc("register_study"); },
      onEnd: () => setListening(false),
      onError: (m) => toast(m, "error"),
    });
    if (!rec) return toast("Reconhecimento de voz indisponível neste navegador.", "error");
    recRef.current = rec; setSaid(""); setListening(true); rec.start();
  };

  if (!pool.length) return <p className="text-sm text-zinc-500">Sem conteúdo disponível.</p>;
  return (
    <Card className="mx-auto max-w-2xl space-y-5 text-center">
      <div className="text-xs uppercase tracking-wide text-violet-300">{mode === "read" ? "Leia em voz alta" : mode === "word" ? "Pronuncie a palavra" : "Ouça e repita"}</div>
      <div className={cx("min-h-16 font-display font-semibold transition", mode === "word" ? "text-4xl" : "text-xl leading-relaxed", hidden && "blur-md select-none")}>
        {result ? result.words.map((w, i) => <span key={i} className={cx("mx-0.5", w.ok ? "text-emerald-300" : "text-rose-300 underline decoration-dotted")}>{w.w}</span>) : target}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="secondary" icon={<Volume2 className="h-4 w-4" />} onClick={() => speak(target, { rate: mode === "word" ? 0.8 : 0.9 })}>Ouvir</Button>
        <Button variant="ghost" onClick={() => speak(target, { rate: 0.65 })}>Ouvir devagar</Button>
        {hidden && <Button variant="ghost" onClick={() => setHidden(false)}>Mostrar frase</Button>}
      </div>
      <button disabled={disabled} onClick={listen} className={cx("mx-auto grid h-20 w-20 place-items-center rounded-full transition disabled:opacity-40", listening ? "bg-rose-600 pulse-ring" : "bg-gradient-to-br from-brand to-brand-2 shadow-xl shadow-brand/40 hover:scale-105")} aria-label="Gravar fala">
        {listening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
      </button>
      {said && <div className="text-sm text-zinc-400">Entendi: <span className="text-zinc-200">"{said}"</span></div>}
      {result && !listening && (
        <div className="space-y-2">
          <Progress value={result.score} />
          <Badge tone={result.score >= 85 ? "green" : result.score >= 60 ? "amber" : "red"}>{result.score >= 85 ? "Excelente pronúncia!" : result.score >= 60 ? "Muito bem, quase lá!" : "Tente novamente, devagar"} · {result.score}%</Badge>
          <p className="text-xs text-zinc-500">Palavras em vermelho não foram reconhecidas. Ouça de novo e repita.</p>
        </div>
      )}
      <Button variant="ghost" icon={<RefreshCw className="h-4 w-4" />} onClick={next}>Próxima</Button>
    </Card>
  );
}
