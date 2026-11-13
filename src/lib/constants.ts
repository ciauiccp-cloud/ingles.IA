export const LEVELS = [
  { value: "beginner", label: "Beginner — Iniciante", short: "Iniciante" },
  { value: "elementary", label: "Elementary — Básico", short: "Básico" },
  { value: "intermediate", label: "Intermediate — Intermediário", short: "Intermediário" },
  { value: "upper_intermediate", label: "Upper Intermediate — Interm. avançado", short: "Interm. avançado" },
  { value: "advanced", label: "Advanced — Avançado", short: "Avançado" },
] as const;
export type Level = (typeof LEVELS)[number]["value"];
export const levelLabel = (v?: string | null) => LEVELS.find((l) => l.value === v)?.short ?? "—";

export const CATEGORIES = [
  { value: "grammar", label: "Gramática" },
  { value: "vocabulary", label: "Vocabulário" },
  { value: "interpretation", label: "Interpretação" },
  { value: "listening", label: "Listening" },
  { value: "writing", label: "Writing" },
  { value: "reading", label: "Reading" },
  { value: "speaking", label: "Speaking" },
] as const;
export const categoryLabel = (v?: string | null) => CATEGORIES.find((c) => c.value === v)?.label ?? v ?? "—";

export const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Múltipla escolha" },
  { value: "true_false", label: "Verdadeiro ou falso" },
  { value: "fill_blank", label: "Completar frases" },
  { value: "matching", label: "Relacionar colunas" },
  { value: "ordering", label: "Organizar palavras" },
  { value: "translation", label: "Tradução" },
  { value: "interpretation", label: "Interpretação de texto" },
  { value: "open", label: "Discursiva" },
  { value: "audio", label: "Questão com áudio" },
  { value: "image", label: "Questão com imagem" },
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number]["value"];
export const qTypeLabel = (v: string) => QUESTION_TYPES.find((t) => t.value === v)?.label ?? v;
/** Tipos corrigidos com IA + professora (sem gabarito fechado). */
export const isOpenType = (t: string, data?: any) =>
  t === "translation" || t === "open" || (t === "interpretation" && !(data?.options?.length));

export const TUTOR_TOPICS = [
  { value: "free", label: "Conversa livre", emoji: "💬" },
  { value: "introductions", label: "Apresentar-se", emoji: "👋" },
  { value: "family", label: "Família", emoji: "👨‍👩‍👧" },
  { value: "shopping", label: "Compras em uma loja", emoji: "🛍️" },
  { value: "restaurant", label: "Pedir comida no restaurante", emoji: "🍽️" },
  { value: "travel", label: "Viagem", emoji: "✈️" },
  { value: "school", label: "Escola", emoji: "🏫" },
  { value: "job_interview", label: "Entrevista de emprego", emoji: "💼" },
  { value: "movies_music_sports", label: "Filmes, música e esportes", emoji: "🎬" },
  { value: "daily_life", label: "Situações do cotidiano", emoji: "☀️" },
] as const;
export const topicLabel = (v: string) => TUTOR_TOPICS.find((t) => t.value === v)?.label ?? v;

export const BADGES: Record<string, { emoji: string; desc: string }> = {
  "First Activity": { emoji: "🎯", desc: "Concluiu a primeira atividade" },
  "First Conversation": { emoji: "💬", desc: "Primeira conversa com a IA" },
  "Conversation Pro": { emoji: "🎙️", desc: "10 conversas com a IA" },
  "Grammar Master": { emoji: "📘", desc: "80%+ em 5 tópicos de gramática" },
  "Vocabulary Champion": { emoji: "🏆", desc: "50 palavras memorizadas" },
  "Listening Expert": { emoji: "🎧", desc: "80%+ em 5 práticas de listening" },
  "Reading Star": { emoji: "📖", desc: "80%+ em 5 textos de reading" },
  "Seven Days Learning": { emoji: "🔥", desc: "7 dias seguidos de estudo" },
};

export const EVENT_KINDS = [
  { value: "lesson", label: "Aula", color: "bg-violet-500" },
  { value: "exam", label: "Avaliação", color: "bg-rose-500" },
  { value: "deadline", label: "Entrega de atividade", color: "bg-amber-500" },
  { value: "review", label: "Revisão", color: "bg-sky-500" },
  { value: "event", label: "Evento", color: "bg-emerald-500" },
  { value: "other", label: "Outro", color: "bg-zinc-500" },
] as const;

export const MATERIAL_KINDS = [
  { value: "pdf", label: "PDF / Apostila" },
  { value: "presentation", label: "Apresentação" },
  { value: "audio", label: "Áudio" },
  { value: "video", label: "Vídeo" },
  { value: "image", label: "Imagem" },
  { value: "text", label: "Texto criado na plataforma" },
  { value: "link", label: "Link externo" },
  { value: "other", label: "Outro arquivo" },
] as const;

/** Nível evolutivo a partir dos pontos (gamificação). */
export function xpLevel(points: number) {
  const lvl = Math.floor(Math.sqrt(points / 25)) + 1;
  const cur = 25 * (lvl - 1) ** 2;
  const next = 25 * lvl ** 2;
  return { level: lvl, progress: Math.round(((points - cur) / (next - cur)) * 100), next };
}

export const fmtDate = (d?: string | null) => (d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("pt-BR") : "—");
export const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
export const pct = (score?: number | null, max?: number | null) =>
  score == null || !max ? null : Math.round((Number(score) / Number(max)) * 100);
