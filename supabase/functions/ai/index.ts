// Função "ai": tutor de conversação, relatórios, correção assistida e escrita.
// Todas as chamadas à IA passam por aqui; a chave nunca chega ao navegador.
import { corsHeaders, HttpError, json } from "../_shared/cors.ts";
import { admin, getCaller, type Caller } from "../_shared/supabase.ts";
import { askJSON, LEVEL_GUIDE, LEVEL_PT } from "../_shared/claude.ts";

const TOPICS: Record<string, string> = {
  free: "Free conversation about anything the student wants",
  introductions: "Introducing yourself (name, age, where you live, hobbies)",
  family: "Talking about family members",
  shopping: "Shopping in a clothing store (the AI plays the shop assistant)",
  restaurant: "Ordering food at a restaurant (the AI plays the waiter)",
  travel: "Traveling: airport, hotel check-in, asking for directions",
  school: "Talking about school, subjects and classmates",
  job_interview: "A job interview (the AI plays the interviewer)",
  movies_music_sports: "Movies, music and sports",
  daily_life: "Everyday situations: routine, weekend plans, the weather",
};

const str = { type: "string" };
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const arr = (items: unknown) => ({ type: "array", items });

// ------------------------------------------------------------------ Tutor
const TUTOR_SCHEMA = obj({
  reply: str,
  has_correction: { type: "boolean" },
  correction: obj({ original: str, corrected: str, explanation_pt: str, example: str }),
  new_words: arr(obj({ word: str, meaning_pt: str })),
});

type TutorOut = {
  reply: string;
  has_correction: boolean;
  correction: { original: string; corrected: string; explanation_pt: string; example: string };
  new_words: { word: string; meaning_pt: string }[];
};

function tutorSystem(name: string, level: string, topic: string) {
  return `You are "Ivy", a warm, patient private English conversation tutor for a Brazilian student named ${name}.
Student level: ${LEVEL_GUIDE[level] ?? LEVEL_GUIDE.beginner}
Conversation scenario: ${TOPICS[topic] ?? topic}

How to behave:
- Always reply in English (field "reply"), adapted to the student's level. Keep replies short (1-3 sentences for beginner/elementary, up to 5 for higher levels) and end with a natural question or prompt so the conversation keeps going, like a real dialogue between two people.
- Prioritize communication. Do NOT interrupt the flow for tiny issues. Only flag an error that matters for understanding or a clear, recurring grammar/vocabulary mistake. At most one correction per turn.
- When you flag an error, set has_correction=true and fill "correction":
  original = exactly what the student wrote/said, corrected = the correct English sentence,
  explanation_pt = a short, friendly explanation IN BRAZILIAN PORTUGUESE of why it was wrong (start with an encouraging word such as "Muito bem!" or "Quase!"),
  example = one extra English example sentence using the structure correctly.
  You may also gently model the correct form inside your English reply.
- When there is no correction, set has_correction=false and fill every correction field with an empty string.
- new_words: up to 3 useful words or expressions from YOUR reply that may be new for this level, with meaning in Portuguese. Empty list if none.
- If the student writes in Portuguese, answer in simple English and encourage them to try in English, offering the English sentence they could use.
- The student may be a minor: keep everything educational and appropriate for school. Never ask for personal data like full address, phone, documents or passwords. Politely steer away from inappropriate topics.
- If the message came from speech recognition, ignore missing punctuation and capitalization; do not correct those.`;
}

async function loadSession(caller: Caller, sessionId: string) {
  const { data: s } = await admin.from("tutor_sessions").select("*").eq("id", sessionId).single();
  if (!s || s.student_id !== caller.id) throw new HttpError(404, "Sessão não encontrada");
  return s;
}

async function tutorReply(caller: Caller, body: { session_id: string; message?: string; via_voice?: boolean }) {
  if (caller.role !== "student") throw new HttpError(403, "Apenas alunos usam o tutor");
  const s = await loadSession(caller, body.session_id);
  if (s.ended_at) throw new HttpError(409, "Esta sessão já foi encerrada");
  const message = (body.message ?? "").trim().slice(0, 2000);
  const p = caller.profile as { is_minor?: boolean; guardian_consent?: boolean; voice_consent?: boolean; privacy_ack_at?: string | null };
  if (!p.privacy_ack_at) throw new HttpError(412, "Leia e aceite o aviso de privacidade antes de usar o tutor.");
  if (body.via_voice && p.is_minor && !p.guardian_consent) {
    throw new HttpError(403, "Aluno menor de idade: o uso de voz depende da autorização do responsável registrada pela professora.");
  }

  const { data: history } = await admin.from("tutor_messages")
    .select("role, content").eq("session_id", s.id).order("id", { ascending: true }).limit(60);
  const msgs: { role: "user" | "assistant"; content: string }[] = (history ?? []).map((m) => ({ role: m.role, content: m.content }));

  if (!message) {
    if (msgs.length > 0) throw new HttpError(400, "Mensagem vazia");
    msgs.push({ role: "user", content: "(The student just opened the session. Greet them by name and start the scenario with an opening question. No correction.)" });
  } else {
    msgs.push({ role: "user", content: body.via_voice ? `[spoken] ${message}` : message });
  }

  const out = await askJSON<TutorOut>({
    system: tutorSystem(caller.full_name.split(" ")[0] || "student", s.level, s.topic),
    messages: msgs,
    schema: TUTOR_SCHEMA,
    effort: "low",
    maxTokens: 1500,
  });

  const correction = out.has_correction && out.correction?.corrected ? out.correction : null;
  if (message) {
    await admin.from("tutor_messages").insert({ session_id: s.id, role: "user", content: message, correction, via_voice: !!body.via_voice });
  }
  const { data: aiMsg } = await admin.from("tutor_messages")
    .insert({ session_id: s.id, role: "assistant", content: out.reply }).select().single();
  if (message) {
    await admin.from("tutor_sessions").update({
      interactions: s.interactions + 1,
      corrections_count: s.corrections_count + (correction ? 1 : 0),
      mode: body.via_voice ? "voice" : s.mode,
    }).eq("id", s.id);
  }
  return { reply: out.reply, correction, new_words: out.new_words ?? [], message_id: aiMsg?.id };
}

// ------------------------------------------------------------------ Relatório da sessão
const REPORT_SCHEMA = obj({
  summary_pt: str,
  vocabulary_learned: arr(obj({ word: str, meaning_pt: str })),
  frequent_errors: arr(str),
  corrected_sentences: arr(obj({ original: str, corrected: str, explanation_pt: str })),
  comprehension_score: { type: "integer" },
  comprehension_comment_pt: str,
  fluency_score: { type: "integer" },
  suggestions_pt: arr(str),
  mini_activity: obj({
    instructions_pt: str,
    questions: arr(obj({ prompt: str, options: arr(str), answer: { type: "integer" } })),
  }),
  difficulties: arr(str),
});

async function tutorEnd(caller: Caller, body: { session_id: string }) {
  const s = await loadSession(caller, body.session_id);
  if (s.ended_at && s.report) return { report: s.report, session: s };
  const { data: history } = await admin.from("tutor_messages")
    .select("role, content, correction").eq("session_id", s.id).order("id");
  const msgs = history ?? [];
  const endedAt = new Date();
  const duration = Math.max(0, Math.round((endedAt.getTime() - new Date(s.started_at).getTime()) / 1000));

  let report: Record<string, unknown> | null = null;
  const studentTurns = msgs.filter((m) => m.role === "user").length;
  if (studentTurns > 0) {
    const transcript = msgs.map((m) =>
      `${m.role === "user" ? "STUDENT" : "TUTOR"}: ${m.content}${m.correction ? `  [correction given: "${m.correction.original}" -> "${m.correction.corrected}"]` : ""}`
    ).join("\n");
    report = await askJSON<Record<string, unknown>>({
      system: `You are an English teacher writing a short post-session report for a Brazilian student (level: ${LEVEL_PT[s.level] ?? s.level}).
Write every *_pt field in Brazilian Portuguese, friendly and encouraging. Base everything strictly on the transcript.
- vocabulary_learned: up to 8 useful words/expressions that appeared in the conversation.
- frequent_errors: short labels of recurring error patterns (in Portuguese), empty if none.
- corrected_sentences: the student's sentences that had errors, with corrections (max 8).
- comprehension_score and fluency_score: integers 0-10.
- suggestions_pt: 2-4 concrete tips.
- mini_activity: 3 multiple-choice questions (English prompts, 3 options each, answer = index of correct option) reinforcing what was practiced.
- difficulties: up to 4 short labels (Portuguese) the teacher should watch, e.g. "Simple Past irregular", "Pronúncia de -ed".`,
      messages: [{ role: "user", content: `Scenario: ${TOPICS[s.topic] ?? s.topic}\nTranscript:\n${transcript.slice(0, 60000)}` }],
      schema: REPORT_SCHEMA,
      effort: "medium",
      maxTokens: 6000,
    });
  }

  const { data: updated } = await admin.from("tutor_sessions").update({
    ended_at: endedAt.toISOString(),
    duration_seconds: duration,
    report,
  }).eq("id", s.id).select().single();

  if (studentTurns > 0) {
    await admin.rpc("award_internal", { sid: caller.id, pts: 15, why: "Conversação com a IA" });
  }
  return { report, session: updated };
}

// ------------------------------------------------------------------ Correção assistida de atividades
const GRADE_SCHEMA = obj({
  items: arr(obj({ question_id: str, score: { type: "number" }, feedback_pt: str, suggested_answer: str })),
});

async function gradeSubmission(caller: Caller, body: { submission_id: string }) {
  const { data: sub } = await admin.from("submissions").select("*, activities(*)").eq("id", body.submission_id).single();
  if (!sub) throw new HttpError(404, "Envio não encontrado");
  const act = sub.activities;
  const allowed = sub.student_id === caller.id || (caller.role === "teacher" && act.teacher_id === caller.id);
  if (!allowed) throw new HttpError(403, "Sem acesso");

  const { data: questions } = await admin.from("questions").select("*").eq("activity_id", sub.activity_id).order("position");
  const open = (questions ?? []).filter((q) => sub.results?.[q.id]?.pending);
  if (open.length === 0) return { graded: 0 };

  const payload = open.map((q) => ({
    question_id: q.id,
    type: q.type,
    max_points: Number(q.points),
    prompt: q.prompt,
    passage: q.passage ?? undefined,
    reference_answer: q.data?.reference ?? q.data?.answer_text ?? undefined,
    rubric: q.data?.rubric ?? undefined,
    student_answer: String(sub.answers?.[q.id] ?? ""),
  }));

  const out = await askJSON<{ items: { question_id: string; score: number; feedback_pt: string; suggested_answer: string }[] }>({
    system: `You are an assistant helping an English teacher grade open-ended answers from Brazilian students.
For each item give a fair score between 0 and max_points (decimals allowed), considering meaning, grammar and task completion; follow the rubric/reference when present.
For translations, accept any correct natural translation, not only the reference.
feedback_pt: 1-3 short sentences in Brazilian Portuguese, constructive, pointing the main errors.
suggested_answer: an improved/correct version of the student's answer in the target language.
An empty answer scores 0. The teacher will review your suggestion before releasing the grade.`,
    messages: [{ role: "user", content: JSON.stringify(payload) }],
    schema: GRADE_SCHEMA,
    effort: "medium",
    maxTokens: 6000,
  });

  const results = { ...(sub.results ?? {}) };
  let aiTotal = 0;
  for (const it of out.items) {
    const q = open.find((x) => x.id === it.question_id);
    if (!q) continue;
    const score = Math.max(0, Math.min(Number(q.points), Number(it.score) || 0));
    aiTotal += score;
    results[q.id] = { ...results[q.id], ai_score: score, ai_feedback: it.feedback_pt, ai_suggestion: it.suggested_answer };
  }
  const suggestedFinal = Number(sub.auto_score) + aiTotal;
  await admin.from("submissions").update({
    results,
    ai_score: aiTotal,
    final_score: suggestedFinal,
    status: sub.status === "submitted" ? "ai_graded" : sub.status,
  }).eq("id", sub.id);
  return { graded: out.items.length, ai_score: aiTotal };
}

// ------------------------------------------------------------------ Writing
const WRITING_SCHEMA = obj({
  corrected_text: str,
  score: { type: "integer" },
  level_estimate: str,
  errors: arr(obj({ original: str, corrected: str, explanation_pt: str })),
  suggestions_pt: arr(str),
  praise_pt: str,
});

async function writingFeedback(caller: Caller, body: { text: string; prompt?: string }) {
  const text = (body.text ?? "").trim();
  if (text.length < 3) throw new HttpError(400, "Escreva um texto antes de enviar");
  if (text.length > 4000) throw new HttpError(400, "Texto muito longo (máximo de 4000 caracteres)");
  const out = await askJSON<Record<string, unknown>>({
    system: `You are an English writing tutor for a Brazilian student (declared level: ${LEVEL_PT[caller.level] ?? caller.level}).
Correct the student's text. corrected_text: the full text corrected, keeping the student's ideas and style.
score: 0-100 for this level. level_estimate: CEFR estimate like "A2".
errors: the main errors (max 10) with short explanations in Brazilian Portuguese.
suggestions_pt: 2-4 tips to improve the writing (in Portuguese). praise_pt: one encouraging sentence in Portuguese about what was good.`,
    messages: [{ role: "user", content: `${body.prompt ? `Task: ${body.prompt}\n\n` : ""}Student text:\n${text}` }],
    schema: WRITING_SCHEMA,
    effort: "medium",
    maxTokens: 5000,
  });
  if (caller.role === "student") {
    await admin.from("writing_entries").insert({ student_id: caller.id, prompt: body.prompt ?? null, text, feedback: out, score: out.score });
    await admin.rpc("award_internal", { sid: caller.id, pts: 5, why: "Produção escrita" });
  }
  return out;
}

// ------------------------------------------------------------------ Geração de questões (professora)
const QGEN_SCHEMA = obj({
  questions: arr(obj({
    type: { type: "string", enum: ["multiple_choice", "true_false", "fill_blank", "translation", "open", "ordering"] },
    prompt: str,
    options: arr(str),
    answer: { type: "integer" },
    answers: arr(str),
    words: arr(str),
    reference: str,
  })),
});

async function generateQuestions(caller: Caller, body: { topic: string; level: string; count?: number; types?: string[] }) {
  if (caller.role !== "teacher") throw new HttpError(403, "Apenas a professora");
  const count = Math.min(Math.max(body.count ?? 5, 1), 15);
  return await askJSON({
    system: `You create English exercises for Brazilian students. Level: ${LEVEL_GUIDE[body.level] ?? body.level}.
Return exactly ${count} questions about the topic. Allowed types: ${(body.types?.length ? body.types : ["multiple_choice", "fill_blank", "true_false"]).join(", ")}.
Field rules per type (fill unused fields with [] / "" / 0):
- multiple_choice: options (3-4), answer = index of the correct option.
- true_false: options ["True","False"], answer index.
- fill_blank: prompt with "___" for each blank; answers = one entry per blank; alternatives separated by "|".
- ordering: words = the correct sentence split into words in the correct order; prompt = instruction.
- translation: prompt = Portuguese sentence to translate into English; reference = a good translation.
- open: prompt = question; reference = an example of a good answer.
Instructions to the student may be in Portuguese; the English content must be correct and natural.`,
    messages: [{ role: "user", content: `Topic: ${body.topic}` }],
    schema: QGEN_SCHEMA,
    effort: "medium",
    maxTokens: 6000,
  });
}

// ------------------------------------------------------------------ Roteador
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await getCaller(req);
    const body = await req.json().catch(() => ({}));
    switch (body.action) {
      case "tutor_reply": return json(await tutorReply(caller, body));
      case "tutor_end": return json(await tutorEnd(caller, body));
      case "grade_submission": return json(await gradeSubmission(caller, body));
      case "writing_feedback": return json(await writingFeedback(caller, body));
      case "generate_questions": return json(await generateQuestions(caller, body));
      default: throw new HttpError(400, "Ação desconhecida");
    }
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Erro interno no servidor" }, 500);
  }
});
