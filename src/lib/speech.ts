// Reconhecimento de fala e síntese de voz pelo navegador (Web Speech API).
// O áudio não é gravado nem armazenado pela plataforma: apenas o texto reconhecido é enviado ao tutor.

export const speechRecognitionSupported = () =>
  typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
export const speechSynthesisSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function createRecognizer(opts: {
  lang?: string;
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
}) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = opts.lang ?? "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = "";
  rec.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t;
      else interim += t;
    }
    opts.onInterim?.(finalText + interim);
  };
  rec.onerror = (e: any) => {
    const map: Record<string, string> = {
      "not-allowed": "Permissão do microfone negada. Libere o microfone nas configurações do navegador.",
      "no-speech": "Não ouvi nada. Tente falar mais perto do microfone.",
      "audio-capture": "Nenhum microfone encontrado.",
      network: "Falha de rede no reconhecimento de voz.",
    };
    opts.onError?.(map[e.error] ?? `Erro no reconhecimento de voz (${e.error}).`);
  };
  rec.onend = () => {
    if (finalText.trim()) opts.onFinal(finalText.trim());
    finalText = "";
    opts.onEnd?.();
  };
  return rec as { start: () => void; stop: () => void; abort: () => void };
}

let cachedVoice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  cachedVoice =
    en.find((v) => /female|samantha|jenny|aria|zira|google us english/i.test(v.name)) ??
    en.find((v) => v.lang === "en-US") ?? en[0] ?? null;
  return cachedVoice;
}
if (speechSynthesisSupported()) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = null; pickVoice(); };
}

export function speak(text: string, opts: { rate?: number; lang?: string; onEnd?: () => void } = {}) {
  if (!speechSynthesisSupported()) { opts.onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts.lang ?? "en-US";
  u.rate = opts.rate ?? 1;
  const v = pickVoice();
  if (v && u.lang.startsWith("en")) u.voice = v;
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  window.speechSynthesis.speak(u);
}
export const stopSpeaking = () => speechSynthesisSupported() && window.speechSynthesis.cancel();

/** Compara a fala do aluno com a frase-alvo (treino de pronúncia / leitura em voz alta). */
export function similarity(target: string, said: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean);
  const a = norm(target), b = norm(said);
  if (!a.length) return { score: 0, words: [] as { w: string; ok: boolean }[] };
  const bag = [...b];
  const words = a.map((w) => {
    const i = bag.indexOf(w);
    if (i >= 0) bag.splice(i, 1);
    return { w, ok: i >= 0 };
  });
  return { score: Math.round((words.filter((x) => x.ok).length / a.length) * 100), words };
}
