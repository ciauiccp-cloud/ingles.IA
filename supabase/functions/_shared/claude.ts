// Integração com a API do Claude (Anthropic). A chave fica apenas no servidor (secret ANTHROPIC_API_KEY).
import Anthropic from "npm:@anthropic-ai/sdk@1.8.0";
import { HttpError } from "./cors.ts";

const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("AI_MODEL") ?? "claude-opus-5-5";
const client = apiKey ? new Anthropic({ apiKey }) : null;

type Effort = "low" | "medium" | "high";

/**
 * Chama o modelo e devolve um objeto JSON que segue `schema` (structured outputs).
 * Usa fallback automático do servidor em caso de recusa por classificadores de segurança.
 */
export async function askJSON<T>(opts: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  schema: Record<string, unknown>;
  effort?: Effort;
  maxTokens?: number;
}): Promise<T> {
  if (!client) throw new HttpError(503, "IA não configurada: defina o secret ANTHROPIC_API_KEY no Supabase.");
  let response;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 4000,
      system: opts.system,
      messages: opts.messages,
      output_config: { effort: opts.effort ?? "low", format: { type: "json_schema", schema: opts.schema } },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new HttpError(429, "Muitas solicitações à IA. Tente novamente em instantes.");
    if (err instanceof Anthropic.AuthenticationError) throw new HttpError(503, "Chave da IA inválida. Verifique ANTHROPIC_API_KEY.");
    if (err instanceof Anthropic.APIError) throw new HttpError(502, `Falha na IA (${err.status ?? "rede"}).`);
    throw err;
  }
  if (response.stop_reason === "refusal") {
    throw new HttpError(422, "A IA não pôde responder a essa mensagem. Tente reformular.");
  }
  const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(502, "Resposta da IA em formato inesperado. Tente novamente.");
  }
}

export const LEVEL_GUIDE: Record<string, string> = {
  beginner: "Beginner (A1): very short sentences, the most common 500 words, present simple and 'to be', speak slowly and simply.",
  elementary: "Elementary (A2): short sentences, everyday vocabulary, simple past and future, avoid idioms.",
  intermediate: "Intermediate (B1): natural everyday English, some phrasal verbs, a variety of tenses, explain rare words.",
  upper_intermediate: "Upper Intermediate (B2): natural fluent English, idioms and phrasal verbs welcome, more complex ideas.",
  advanced: "Advanced (C1): native-like English, nuanced vocabulary, idioms, abstract topics.",
};

export const LEVEL_PT: Record<string, string> = {
  beginner: "Iniciante", elementary: "Básico", intermediate: "Intermediário",
  upper_intermediate: "Intermediário avançado", advanced: "Avançado",
};
