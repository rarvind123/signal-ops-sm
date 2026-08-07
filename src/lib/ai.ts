import { parseLlmJsonObject, prepareJsonSystemPrompt } from "@/lib/json-sanitize";

const ANTHROPIC_MODEL_MAP: Record<string, string> = {
  "claude-sonnet-4-6": "claude-sonnet-4-20250514",
  "claude-sonnet-4-20250514": "claude-sonnet-4-20250514",
  "claude-opus-4-20250514": "claude-opus-4-20250514",
  "claude-haiku-4-5-20251001": "claude-haiku-4-5-20251001",
};

function anthropicModel(model: string): string {
  return ANTHROPIC_MODEL_MAP[model] ?? "claude-sonnet-4-20250514";
}

function getAnthropicApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local.");
  }
  return apiKey;
}

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicImageBlock = {
  type: "image";
  source: { type: "url"; url: string };
};

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | Array<AnthropicTextBlock | AnthropicImageBlock>;
};

async function anthropicMessages(params: {
  model: string;
  maxTokens: number;
  temperature?: number;
  system?: string;
  messages: AnthropicMessage[];
}): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": getAnthropicApiKey(),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: anthropicModel(params.model),
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      system: params.system,
      messages: params.messages,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Anthropic API error (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`
    );
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content
    ?.filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("")
    .trim();
  return text ?? "";
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
  const text = await anthropicMessages({
    model,
    maxTokens,
    temperature,
    system,
    messages: [{ role: "user", content: user }],
  });
  return normalizeGeneratedText(text);
}

export async function callAIVision({
  system,
  userContent,
  maxTokens = 4000,
  temperature = 0.3,
  model = "claude-sonnet-4-6",
}: {
  system?: string;
  userContent: Array<AnthropicTextBlock | AnthropicImageBlock>;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}): Promise<string> {
  const text = await anthropicMessages({
    model,
    maxTokens,
    temperature,
    system,
    messages: [{ role: "user", content: userContent }],
  });
  return normalizeGeneratedText(text);
}

export function hasAnthropicApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
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
