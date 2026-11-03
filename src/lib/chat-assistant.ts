import type { ChatOrderTracking } from "@/lib/chat-order-tracking";

export type AssistantSource = "gemini" | "database" | "fallback";
export type AssistantReply = {
  text: string;
  source: AssistantSource;
  notice?: string;
  tracking?: ChatOrderTracking;
  href?: string;
  linkLabel?: string;
};

export const MAX_CHAT_QUESTION = 500;

/** Reduces accidental disclosure; this is not a guarantee of anonymization. */
export function redactChatQuestion(text: string) {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email removed]")
    .replace(/(?:\+?63|0)[\s-]*9(?:[\s-]*\d){9}\b/g, "[phone removed]")
    .replace(/\b(?:AIza[\w-]{20,}|sk-[\w-]{16,}|sb_secret_[\w-]+|eyJ[\w-]+\.[\w-]+\.[\w-]+)\b/g, "[secret removed]");
}

export type GeminiAnswer = { text: string; topic: "general" | "order_tracking" };

export function parseGeminiAnswer(payload: unknown): GeminiAnswer | null {
  const result = payload as {
    promptFeedback?: { blockReason?: string };
    candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  } | null;
  if (result?.promptFeedback?.blockReason) return null;
  const candidate = result?.candidates?.[0];
  if (candidate?.finishReason !== "STOP") return null;
  const text = candidate.content?.parts?.filter((part) => !part.thought).map((part) => part.text ?? "").join("");
  if (!text) return null;
  try {
    const answer = JSON.parse(text);
    if (!["general", "order_tracking"].includes(answer.topic) || typeof answer.text !== "string") return null;
    if (!answer.text.trim() || answer.text.length > 2400) return null;
    return { topic: answer.topic, text: answer.text.trim() };
  } catch { return null; }
}
