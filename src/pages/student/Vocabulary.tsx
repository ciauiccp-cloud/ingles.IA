import { useMemo, useState } from "react";
import { Check, RotateCcw, Search, Shuffle, X } from "lucide-react";
import { Badge, Button, Card, Empty, Input, Loadable, PageHeader, Progress, Select, Tabs, cx, useToast } from "../../components/ui";
import { SpeakButton } from "../../components/QuestionRunner";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { errMsg, supabase } from "../../lib/supabase";

type Word = { id: string; category: string; word: string; translation: string; pronunciation: string | null; example: string | null; example_translation: string | null; level: string };
type Review = { word_id: string; correct: number; wrong: number; box: number; next_review: string };

export default function Vocabulary() {
  const { profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState<"study" | "cards" | "review">("study");
  const { data, loading, error, reload } = useAsync(async () => {
    const [words, reviews] = await Promise.all([
      supabase.from("vocab_words").select("*").order("category").order("word").then(must),
      supabase.from("vocab_reviews").select("*").eq("student_id", profile!.id).then(must),
    ]);
    return { words: words as Word[], reviews: reviews as Review[] };
  });
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const cats = useMemo(() => [...new Set((data?.words ?? []).map((w) => w.category))], [data]);
  const rev = (id: string) => data?.reviews.find((r) => r.word_id === id);
  const learned = data?.reviews.filter((r) => r.box >= 3).length ?? 0;
  const today = new Date().toISOString().slice(0, 10);
  const due = (data?.words ?? []).filter((w) => { const r = rev(w.id); return r && r.next_review <= today; });
  const hardest = (data?.words ?? []).filter((w) => (rev(w.id)?.wrong ?? 0) > 0).sort((a, b) => (rev(b.id)!.wrong - rev(b.id)!.correct) - (rev(a.id)!.wrong - rev(a.id)!.correct));

  return (
    <div>
      <PageHeader title="Vocabulário" subtitle="Palavras com tradução, pronúncia, áudio e exemplos. Use os flashcards para memorizar." />
      <Loadable loading={loading} error={error} reload={reload}>
        {data && (
          <>
            <div className="mb-5 grid grid-cols-3 gap-3">
              <Card className="p-4"><div className="text-xs text-zinc-400">Memorizadas</div><div className="font-display text-2xl font-semibold">{learned}</div><Progress value={(learned / Math.max(1, data.words.length)) * 100} className="mt-2" /></Card>
              <Card className="p-4"><div className="text-xs text-zinc-400">Para revisar hoje</div><div className="font-display text-2xl font-semibold">{due.length}</div></Card>
              <Card className="p-4"><div className="text-xs text-zinc-400">Mais difíceis</div><div className="font-display text-2xl font-semibold">{hardest.length}</div></Card>
            </div>
            <Tabs value={tab} onChange={setTab} tabs={[{ value: "study", label: "Estudar palavras" }, { value: "cards", label: "Flashcards" }, { value: "review", label: `Revisão (${due.length + hardest.length})` }]} />
            {tab === "study" && (
              <>
                <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><Input className="pl-9" placeholder="Buscar palavra" value={q} onChange={(e) => setQ(e.target.value)} /></div>
                  <Select className="sm:w-56" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas as categorias</option>{cats.map((c) => <option key={c}>{c}</option>)}</Select>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data.words.filter((w) => (!cat || w.category === cat) && (!q || `${w.word} ${w.translation}`.toLowerCase().includes(q.toLowerCase()))).map((w) => (
                    <Card key={w.id} className="p-4 transition hover:border-brand/40">
                      <div className="flex items-start justify-between">
                        <div><div className="font-display text-lg font-semibold">{w.word}</div><div className="text-xs text-zinc-500">{w.pronunciation}</div></div>
                        <SpeakButton text={w.word} rate={0.85} />
                      </div>
                      <div className="mt-1 text-violet-200">{w.translation}</div>
                      {w.example && <div className="mt-2 flex items-start gap-1 text-sm text-zinc-300"><span className="flex-1 italic">"{w.example}"</span><SpeakButton text={w.example} className="h-6 w-6" /></div>}
                      {w.example_translation && <div className="text-xs text-zinc-500">{w.example_translation}</div>}
                      <div className="mt-2 flex gap-1"><Badge tone="zinc">{w.category}</Badge>{(rev(w.id)?.box ?? 0) >= 3 && <Badge tone="green">memorizada</Badge>}</div>
                    </Card>
                  ))}
                </div>
              </>
            )}
            {tab === "cards" && <Flashcards words={data.words} cats={cats} onDone={() => { reload(); refreshProfile(); }} />}
            {tab === "review" && (due.length + hardest.length === 0
              ? <Empty title="Nada para revisar agora" text="Estude com os flashcards. As palavras que você errar aparecem aqui para revisão." />
              : <Flashcards words={[...new Map([...hardest, ...due].map((w) => [w.id, w])).values()]} onDone={() => { reload(); refreshProfile(); }} review />)}
          </>
        )}
      </Loadable>
    </div>
  );
}

function Flashcards({ words, cats, onDone, review }: { words: Word[]; cats?: string[]; onDone: () => void; review?: boolean }) {
  const { toast } = useToast();
  const [cat, setCat] = useState("");
  const [direction, setDirection] = useState<"en" | "pt">("en");
  const [deck, setDeck] = useState<Word[] | null>(review ? shuffle(words).slice(0, 20) : null);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [score, setScore] = useState({ ok: 0, bad: 0 });

  const begin = () => {
    const pool = words.filter((w) => !cat || w.category === cat);
    if (!pool.length) return toast("Nenhuma palavra nessa categoria.", "error");
    setDeck(shuffle(pool).slice(0, 15)); setI(0); setFlipped(false); setScore({ ok: 0, bad: 0 });
  };
  const answer = async (ok: boolean) => {
    const w = deck![i];
    const { error } = await supabase.rpc("review_word", { wid: w.id, was_correct: ok });
    if (error) return toast(errMsg(error), "error");
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), bad: s.bad + (ok ? 0 : 1) }));
    setFlipped(false);
    setI(i + 1);
  };

  if (!deck) {
    return (
      <Card className="mx-auto max-w-md space-y-4 text-center">
        <h3 className="font-display text-xl font-semibold">Flashcards</h3>
        <p className="text-sm text-zinc-400">Veja a palavra, tente lembrar e vire o cartão. Diga se acertou: as palavras que você erra voltam com mais frequência.</p>
        {cats && <Select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas as categorias</option>{cats.map((c) => <option key={c}>{c}</option>)}</Select>}
        <div className="flex justify-center gap-2 text-sm">
          <button onClick={() => setDirection("en")} className={cx("rounded-lg px-3 py-1.5", direction === "en" ? "bg-brand" : "bg-ink-3")}>Inglês → Português</button>
          <button onClick={() => setDirection("pt")} className={cx("rounded-lg px-3 py-1.5", direction === "pt" ? "bg-brand" : "bg-ink-3")}>Português → Inglês</button>
        </div>
        <Button icon={<Shuffle className="h-4 w-4" />} onClick={begin}>Começar</Button>
      </Card>
    );
  }
  if (i >= deck.length) {
    return (
      <Card className="mx-auto max-w-md space-y-3 text-center">
        <div className="text-5xl">🎉</div>
        <h3 className="font-display text-xl font-semibold">Sessão concluída!</h3>
        <p className="text-sm text-zinc-400">Acertos: <b className="text-emerald-300">{score.ok}</b> · Para revisar: <b className="text-rose-300">{score.bad}</b> · +{deck.length} pontos</p>
        <Button icon={<RotateCcw className="h-4 w-4" />} onClick={() => { setDeck(review ? null : null); onDone(); }}>Concluir</Button>
      </Card>
    );
  }
  const w = deck[i];
  const front = direction === "en" ? w.word : w.translation;
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-2 flex justify-between text-xs text-zinc-400"><span>{i + 1} / {deck.length}</span><span>✓ {score.ok} · ✗ {score.bad}</span></div>
      <Progress value={(i / deck.length) * 100} className="mb-4" />
      <button onClick={() => setFlipped(!flipped)} className="relative h-64 w-full [perspective:1000px]" aria-label="Virar cartão">
        <div className={cx("absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d]", flipped && "[transform:rotateY(180deg)]")}>
          <div className="card absolute inset-0 grid place-items-center p-6 [backface-visibility:hidden]">
            <div><div className="font-display text-3xl font-semibold">{front}</div><div className="mt-2 text-xs text-zinc-500">toque para virar</div></div>
          </div>
          <div className="card absolute inset-0 grid place-items-center border-brand/50 bg-gradient-to-br from-deep/60 to-ink-2 p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div>
              <div className="font-display text-2xl font-semibold">{w.word}</div>
              <div className="text-sm text-zinc-400">{w.pronunciation}</div>
              <div className="mt-2 text-lg text-violet-200">{w.translation}</div>
              {w.example && <div className="mt-3 text-sm italic text-zinc-300">"{w.example}"</div>}
            </div>
          </div>
        </div>
      </button>
      <div className="mt-3 flex justify-center"><SpeakButton text={w.word} rate={0.85} /></div>
      {flipped ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button variant="secondary" icon={<X className="h-4 w-4 text-rose-400" />} onClick={() => answer(false)}>Errei</Button>
          <Button icon={<Check className="h-4 w-4" />} onClick={() => answer(true)}>Acertei</Button>
        </div>
      ) : <Button className="mt-3 w-full" variant="secondary" onClick={() => setFlipped(true)}>Mostrar resposta</Button>}
    </div>
  );
}

function shuffle<T>(a: T[]) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
