import OpenAI from "openai";
import { parseLlmJsonObject, prepareJsonSystemPrompt } from "@/lib/json-sanitize";

const OR_MODEL_MAP: Record<string, string> = {
  "claude-sonnet-4-6": "anthropic/claude-sonnet-4-6",
  "claude-sonnet-4-20250514": "anthropic/claude-sonnet-4-6",
  "claude-opus-4-20250514": "anthropic/claude-opus-4",
  "claude-haiku-4-5-20251001": "anthropic/claude-haiku-4-5",
};

function orModel(model: string): string {
  return OR_MODEL_MAP[model] ?? "anthropic/claude-sonnet-4-6";
}

let openrouter: OpenAI | null = null;

function getOpenRouter(): OpenAI {
  if (!openrouter) {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set. Add it to .env.local.");
    }
    openrouter = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://signal-ops-sm.vercel.app",
        "X-Title": "SignalOps SM",
      },
    });
  }
  return openrouter;
}

function normalizeGeneratedText(text: string): string {
  return text
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function callAI({
  system,
  user,
  maxTokens = 4000,
  temperature = 0.7,
  model = "claude-sonnet-4-6",
}: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}): Promise<string> {
  const response = await getOpenRouter().chat.completions.create({
    model: orModel(model),
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  return normalizeGeneratedText(response.choices[0]?.message?.content ?? "");
}

export async function completeText(
  system: string,
  user: string,
  model = "claude-sonnet-4-6",
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  return callAI({
    system,
    user,
    model,
    maxTokens: options?.maxTokens ?? 8192,
    temperature: options?.temperature ?? 0.75,
  });
}

export async function completeJson<T>(
  system: string,
  user: string,
  model = "claude-sonnet-4-6",
  options?: { maxTokens?: number; temperature?: number }
): Promise<T> {
  const text = await callAI({
    system: prepareJsonSystemPrompt(system),
    user,
    model,
    maxTokens: options?.maxTokens ?? 8192,
    temperature: options?.temperature ?? 0.75,
  });
  return parseLlmJsonObject(text) as T;
}
