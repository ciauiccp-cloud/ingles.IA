import { useEffect, useRef, useState } from "react";
import { Bot, Keyboard, Loader2, Mic, MicOff, Send, ShieldCheck, Square, Volume2, VolumeX } from "lucide-react";
import { Badge, Button, Card, Empty, Modal, PageHeader, Select, Spinner, Toggle, cx, useToast } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { callFn, errMsg, supabase } from "../../lib/supabase";
import { LEVELS, TUTOR_TOPICS, fmtDateTime, levelLabel, topicLabel } from "../../lib/constants";
import { createRecognizer, speak, speechRecognitionSupported, speechSynthesisSupported, stopSpeaking } from "../../lib/speech";
import { SessionReportView, type TutorReport } from "../shared/TutorReport";

type Msg = { id: string; role: "user" | "assistant"; content: string; correction?: any; new_words?: { word: string; meaning_pt: string }[]; via_voice?: boolean };

export default function Tutor() {
  const { profile, refreshProfile } = useAuth();
  const { toast, confirm } = useToast();
  const [stage, setStage] = useState<"setup" | "chat" | "report">("setup");
  const [topic, setTopic] = useState("free");
  const [level, setLevel] = useState(profile!.level);
  const [voiceMode, setVoiceMode] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [slow, setSlow] = useState(false);
  const [report, setReport] = useState<TutorReport | null>(null);
  const [ending, setEnding] = useState(false);
  const [history, setHistory] = useState<any[] | null>(null);
  const [viewReport, setViewReport] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const voiceBlocked = profile!.is_minor && !profile!.guardian_consent;
  const srOk = speechRecognitionSupported();
  const ttsOk = speechSynthesisSupported();

  useEffect(() => {
    supabase.from("tutor_sessions").select("*").eq("student_id", profile!.id).order("started_at", { ascending: false }).limit(10).then(({ data }) => setHistory(data ?? []));
  }, [stage]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, thinking, interim]);
  useEffect(() => {
    if (stage !== "chat" || !session) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [stage, session]);
  useEffect(() => () => { stopSpeaking(); recRef.current?.abort(); }, []);

  const say = (text: string) => { if (ttsOk && (voiceMode || autoSpeak)) speak(text, { rate: slow ? 0.8 : 0.95 }); };

  const start = async () => {
    try {
      const { data, error } = await supabase.from("tutor_sessions").insert({ topic, level, mode: voiceMode ? "voice" : "text" }).select().single();
      if (error) throw error;
      setSession(data); setMsgs([]); setReport(null); setStage("chat"); setElapsed(0);
      setThinking(true);
      const r = await callFn("ai", { action: "tutor_reply", session_id: data.id });
      setMsgs([{ id: `a${Date.now()}`, role: "assistant", content: r.reply, new_words: r.new_words }]);
      say(r.reply);
    } catch (e) { toast(errMsg(e), "error"); } finally { setThinking(false); }
  };

  const send = async (text: string, viaVoice = false) => {
    const t = text.trim();
    if (!t || thinking || !session) return;
    stopSpeaking();
    const userMsg: Msg = { id: `u${Date.now()}`, role: "user", content: t, via_voice: viaVoice };
    setMsgs((m) => [...m, userMsg]);
    setInput(""); setInterim("");
    setThinking(true);
    try {
      const r = await callFn("ai", { action: "tutor_reply", session_id: session.id, message: t, via_voice: viaVoice });
      setMsgs((m) => [...m.map((x) => (x.id === userMsg.id ? { ...x, correction: r.correction } : x)), { id: `a${Date.now()}`, role: "assistant", content: r.reply, new_words: r.new_words }]);
      say(r.reply);
    } catch (e) {
      toast(errMsg(e), "error");
      setMsgs((m) => m.filter((x) => x.id !== userMsg.id));
      setInput(t);
    } finally { setThinking(false); }
  };

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); return; }
    stopSpeaking();
    const rec = createRecognizer({
      onInterim: setInterim,
      onFinal: (txt) => send(txt, true),
      onEnd: () => { setListening(false); setInterim(""); },
      onError: (m) => toast(m, "error"),
    });
    if (!rec) return toast("Seu navegador não suporta reconhecimento de voz. Use o Google Chrome ou o Microsoft Edge.", "error");
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const end = async () => {
    if (!session) return;
    if (msgs.filter((m) => m.role === "user").length === 0 && !(await confirm("Você ainda não conversou. Encerrar mesmo assim?"))) return;
    stopSpeaking(); recRef.current?.abort();
    setEnding(true);
    try {
      const r = await callFn("ai", { action: "tutor_end", session_id: session.id });
      setReport(r.report); setStage("report"); refreshProfile();
    } catch (e) { toast(errMsg(e), "error"); } finally { setEnding(false); }
  };

  // ---------- Aviso de privacidade (LGPD)
  if (!profile!.privacy_ack_at) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="space-y-4 p-7">
          <ShieldCheck className="h-10 w-10 text-emerald-400" />
          <h1 className="font-display text-2xl font-semibold">Antes de começar</h1>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li>• O tutor é uma inteligência artificial que conversa com você em inglês para praticar.</li>
            <li>• <b>Suas conversas educacionais ficam registradas e podem ser analisadas pela sua professora</b> para acompanhar seu aprendizado.</li>
            <li>• No modo voz, o reconhecimento de fala é feito pelo seu navegador. A plataforma <b>não grava nem armazena o áudio</b>, apenas o texto reconhecido.</li>
            <li>• Não compartilhe dados pessoais como endereço, telefone, documentos ou senhas.</li>
            {profile!.is_minor && <li>• Como você é menor de idade, o uso de voz depende da autorização do seu responsável, registrada pela professora.</li>}
          </ul>
          <Button className="w-full" onClick={async () => { const { error } = await supabase.rpc("ack_privacy"); if (error) return toast(errMsg(error), "error"); await refreshProfile(); }}>Entendi e quero começar</Button>
        </Card>
      </div>
    );
  }

  // ---------- Configuração da sessão
  if (stage === "setup") {
    return (
      <div>
        <PageHeader title="Conversação com IA" subtitle="Pratique inglês com a Ivy, sua tutora particular. Ela corrige com carinho e explica em português." />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <Card>
              <h3 className="mb-3 font-medium">1. Escolha um tema</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                {TUTOR_TOPICS.map((t) => (
                  <button key={t.value} onClick={() => setTopic(t.value)}
                    className={cx("rounded-xl border p-3 text-left text-sm transition", topic === t.value ? "border-brand bg-brand/15 shadow-lg shadow-brand/10" : "border-line hover:border-brand/40")}>
                    <div className="text-2xl">{t.emoji}</div><div className="mt-1 leading-tight">{t.label}</div>
                  </button>
                ))}
              </div>
            </Card>
            <Card className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 font-medium">2. Nível da conversa</h3>
                <Select value={level} onChange={(e) => setLevel(e.target.value)}>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</Select>
              </div>
              <div>
                <h3 className="mb-2 font-medium">3. Como quer praticar?</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setVoiceMode(false)} className={cx("flex items-center justify-center gap-2 rounded-xl border p-2.5 text-sm", !voiceMode ? "border-brand bg-brand/15" : "border-line")}><Keyboard className="h-4 w-4" /> Texto</button>
                  <button disabled={voiceBlocked || !srOk} onClick={() => setVoiceMode(true)} className={cx("flex items-center justify-center gap-2 rounded-xl border p-2.5 text-sm disabled:opacity-40", voiceMode ? "border-brand bg-brand/15" : "border-line")}><Mic className="h-4 w-4" /> Voz</button>
                </div>
                {voiceBlocked && <p className="mt-2 text-xs text-amber-300">Voz indisponível: aguardando autorização do responsável.</p>}
                {!voiceBlocked && !srOk && <p className="mt-2 text-xs text-amber-300">Para usar voz, abra a plataforma no Chrome ou Edge.</p>}
              </div>
            </Card>
            <Button size="lg" className="w-full sm:w-auto" icon={<Bot className="h-5 w-5" />} onClick={start} loading={thinking}>Começar conversa</Button>
          </div>
          <Card>
            <h3 className="mb-3 font-medium">Conversas anteriores</h3>
            {!history ? <Spinner /> : history.length === 0 ? <p className="text-sm text-zinc-500">Nenhuma ainda. Que tal começar agora?</p> : (
              <ul className="space-y-2">{history.map((h) => (
                <li key={h.id} className="rounded-xl border border-line p-3 text-sm">
                  <div className="font-medium">{topicLabel(h.topic)}</div>
                  <div className="text-xs text-zinc-400">{fmtDateTime(h.started_at)} · {Math.round((h.duration_seconds ?? 0) / 60)} min · {h.interactions} falas</div>
                  {h.report && <button onClick={() => setViewReport(h)} className="mt-1 text-xs text-violet-300 hover:underline">Ver relatório</button>}
                </li>
              ))}</ul>
            )}
          </Card>
        </div>
        <Modal open={!!viewReport} onClose={() => setViewReport(null)} title={viewReport ? `Relatório — ${topicLabel(viewReport.topic)}` : ""} wide footer={<Button onClick={() => setViewReport(null)}>Fechar</Button>}>
          {viewReport?.report && <SessionReportView report={viewReport.report} interactive />}
        </Modal>
      </div>
    );
  }

  // ---------- Relatório final
  if (stage === "report") {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Relatório da conversa" subtitle={`${topicLabel(session.topic)} · ${levelLabel(session.level)}`} />
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Card className="p-4 text-center"><div className="text-xs text-zinc-400">Tempo</div><div className="font-display text-2xl font-semibold">{Math.max(1, Math.round(elapsed / 60))} min</div></Card>
          <Card className="p-4 text-center"><div className="text-xs text-zinc-400">Interações</div><div className="font-display text-2xl font-semibold">{msgs.filter((m) => m.role === "user").length}</div></Card>
          <Card className="p-4 text-center"><div className="text-xs text-zinc-400">Correções</div><div className="font-display text-2xl font-semibold">{msgs.filter((m) => m.correction).length}</div></Card>
        </div>
        <Card>{report ? <SessionReportView report={report} interactive /> : <Empty title="Conversa muito curta para gerar relatório" text="Converse um pouco mais na próxima vez!" />}</Card>
        <div className="mt-4 flex gap-2"><Button onClick={() => setStage("setup")}>Nova conversa</Button></div>
      </div>
    );
  }

  // ---------- Chat
  const mm = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="relative grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand to-deep"><Bot className="h-6 w-6" /><span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ink bg-emerald-400" /></div>
          <div><div className="font-medium">Ivy · {topicLabel(session.topic)}</div><div className="text-xs text-zinc-400">{levelLabel(session.level)} · ⏱ {mm}</div></div>
        </div>
        <div className="flex items-center gap-2">
          {ttsOk && <Button size="sm" variant="ghost" onClick={() => { setAutoSpeak(!autoSpeak); if (autoSpeak) stopSpeaking(); }} title="Ler respostas em voz alta">{autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</Button>}
          {ttsOk && <Toggle checked={slow} onChange={setSlow} label={<span className="text-xs">Devagar</span>} />}
          <Button size="sm" variant="danger" icon={<Square className="h-3.5 w-3.5" />} loading={ending} onClick={end}>Encerrar</Button>
        </div>
      </div>

      <div className="card flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
        {msgs.map((m) => (
          <div key={m.id} className={cx("flex flex-col animate-fade-up", m.role === "user" ? "items-end" : "items-start")}>
            <div className={cx("max-w-[88%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed", m.role === "user" ? "rounded-tr-sm bg-gradient-to-r from-brand to-brand-2" : "rounded-tl-sm bg-ink-3")}>
              {m.content}
              {m.role === "assistant" && ttsOk && <button onClick={() => speak(m.content, { rate: slow ? 0.8 : 0.95 })} className="ml-2 inline-flex align-middle text-violet-300 hover:text-white" aria-label="Ouvir"><Volume2 className="h-4 w-4" /></button>}
              {m.via_voice && <Mic className="ml-1 inline h-3 w-3 opacity-60" />}
            </div>
            {m.correction && (
              <div className="mt-2 max-w-[88%] rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm animate-fade-up">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-300">Correção</div>
                <div className="text-rose-300 line-through decoration-rose-400/60">{m.correction.original}</div>
                <div className="font-medium text-emerald-300">{m.correction.corrected} {ttsOk && <button onClick={() => speak(m.correction.corrected, { rate: 0.85 })} className="inline-flex align-middle"><Volume2 className="h-3.5 w-3.5" /></button>}</div>
                <div className="mt-1 text-zinc-300">{m.correction.explanation_pt}</div>
                {m.correction.example && <div className="mt-1 text-xs text-zinc-400">Exemplo: <i>{m.correction.example}</i></div>}
              </div>
            )}
            {m.new_words && m.new_words.length > 0 && (
              <div className="mt-1.5 flex max-w-[88%] flex-wrap gap-1">{m.new_words.map((w, i) => <Badge key={i} tone="sky">{w.word} = {w.meaning_pt}</Badge>)}</div>
            )}
          </div>
        ))}
        {interim && <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm border border-dashed border-brand/50 px-4 py-2.5 text-sm italic text-zinc-300">{interim}…</div>}
        {thinking && <div className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin text-brand" /> Ivy está pensando…</div>}
        <div ref={endRef} />
      </div>

      <div className="mt-3">
        {voiceMode ? (
          <div className="flex flex-col items-center gap-2">
            <button onClick={toggleMic} disabled={thinking}
              className={cx("grid h-20 w-20 place-items-center rounded-full transition disabled:opacity-40", listening ? "bg-rose-600 pulse-ring" : "bg-gradient-to-br from-brand to-brand-2 shadow-xl shadow-brand/40 hover:scale-105")}
              aria-label={listening ? "Parar" : "Falar"}>
              {listening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </button>
            <div className="text-xs text-zinc-400">{listening ? "Ouvindo… fale em inglês" : "Toque para falar"}</div>
            <button onClick={() => setVoiceMode(false)} className="text-xs text-violet-300 hover:underline">Prefiro digitar</button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="Type your message in English…"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-line bg-ink-2 px-4 py-3 text-[15px] focus:border-brand focus:outline-none" />
            {srOk && !voiceBlocked && <Button type="button" variant={listening ? "danger" : "secondary"} className="h-12 w-12 !px-0" onClick={toggleMic} aria-label="Falar"><Mic className="h-5 w-5" /></Button>}
            <Button type="submit" className="h-12 w-12 !px-0" disabled={!input.trim() || thinking} aria-label="Enviar"><Send className="h-5 w-5" /></Button>
          </form>
        )}
      </div>
    </div>
  );
}
