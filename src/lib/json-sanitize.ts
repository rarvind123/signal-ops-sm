/**
 * Sanitize and parse JSON from LLM agent output.
 * Balanced structural extraction + apostrophe/quote repair.
 */

export const CRITICAL_SYSTEM_OPERATIONAL_BOUNDARY =
  "CRITICAL SYSTEM OPERATIONAL BOUNDARY: You are a headless micro-processing utility endpoint. " +
  "You must NEVER converse, explain, prefix, or suffix your outputs with human-friendly prose. " +
  "Do not output conversational introductory text. Output ONLY a perfectly formatted JSON structure. " +
  "Your output must start with '{' and end with '}'.";

export const JSON_ROOT_OBJECT_ENVELOPE_RULE =
  "JSON ROOT OBJECT ENVELOPE (MANDATORY): Raw JSON arrays at the top level are STRICTLY FORBIDDEN. " +
  "NEVER output `[...]` as the root response. Every list parameter MUST be nested inside a valid root JSON object key. " +
  'Example: { "data_list": [ ... ] } or { "segments": [ ... ] } — NOT [ ... ]. ' +
  "Your response MUST start with '{' and end with '}'.";

export const JSON_FORMATTING_BOUNDARY =
  "CRITICAL FORMATTING BOUNDARY: Use double quotes for ALL JSON string values. " +
  "Escape interior double quotes as \\\". " +
  'Contractions/possessives may use plain apostrophes inside double-quoted strings (e.g. "warrior\'s vow") — ' +
  "NEVER wrap values in single quotes. No trailing commas. Valid JSON only.";

export const CRITICAL_STRING_CONSTRAINT =
  "CRITICAL STRING CONSTRAINT: You must completely avoid using nested double quotes or backslashes within text description properties. " +
  "If you need to include a quote or text emphasis inside a property string, use standard single quotes without any backslash prefix. " +
  'Never output literal sequences like \\" inside a text node.';

export const CRITICAL_JSON_DOUBLE_QUOTE_SPEC =
  "CRITICAL SYSTEM SPECIFICATION: You must output strict, compliant JSON using ONLY double quotes for keys and property string values. " +
  "You are completely forbidden from using single quotes around object property names. " +
  "If character dialogues contain emphasis or spoken outbursts, wrap those specific internal dialogue phrases in plain single quotes inside your double-quoted parameters.";

function normalizeSmartQuotes(text: string): string {
  return text
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"');
}

/** Strip markdown code fences and bare "json" prefixes from LLM responses. */
export function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/^json\s+/im, "")
    .replace(/```\s*$/im, "")
    .trim();
}

export function extractBalancedSegment(
  text: string,
  start: number,
  openCh: string,
  closeCh: string
): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  let stringDelim = '"';

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i] ?? "";
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === stringDelim) inString = false;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringDelim = ch;
    } else if (ch === openCh) {
      depth += 1;
    } else if (ch === closeCh) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

/** Balanced markdown/JSON extractor — first complete `{...}` or `[...]`. */
export function extractStructuralJson(raw: string): string {
  const rawText = raw.trim();
  if (!rawText) return "";

  const fencePattern = /```(?:json|JSON)?\s*\n?([\s\S]*?)```/gi;
  let match: RegExpExecArray | null = fencePattern.exec(rawText);
  while (match) {
    const inner = (match[1] ?? "").trim();
    if (inner.startsWith("{")) {
      const seg = extractBalancedSegment(inner, 0, "{", "}");
      if (seg) return seg;
    }
    if (inner.startsWith("[")) {
      const seg = extractBalancedSegment(inner, 0, "[", "]");
      if (seg) return seg;
    }
    match = fencePattern.exec(rawText);
  }

  const normalized = normalizeSmartQuotes(rawText);
  let best = "";
  let bestPos = normalized.length + 1;

  for (const [openCh, closeCh] of [
    ["{", "}"],
    ["[", "]"],
  ] as const) {
    let idx = 0;
    while (idx < normalized.length) {
      const start = normalized.indexOf(openCh, idx);
      if (start === -1) break;
      const segment = extractBalancedSegment(normalized, start, openCh, closeCh);
      if (segment && start < bestPos) {
        best = segment;
        bestPos = start;
      }
      idx = start + 1;
    }
  }

  if (best.startsWith("{")) return best;
  if (best) return best;
  return trimJsonPreamble(normalized);
}

function isStringOpener(text: string, index: number, quote: string): boolean {
  if (text[index] !== quote) return false;
  let j = index - 1;
  while (j >= 0 && " \t\n\r".includes(text[j] ?? "")) j -= 1;
  if (j < 0) return quote === '"';
  const prev = text[j] ?? "";
  return ":,[{".includes(prev) || (quote === '"' && /[A-Za-z0-9_]/.test(prev));
}

function isStringCloser(text: string, index: number): boolean {
  let j = index + 1;
  while (j < text.length && " \t\n\r".includes(text[j] ?? "")) j += 1;
  if (j >= text.length) return true;
  return ",}]:;".includes(text[j] ?? "");
}

function convertPythonDictKeys(text: string): string {
  return text
    .replace(/^\{\s*'([A-Za-z_][A-Za-z0-9_]*)'\s*:/, '{"$1":')
    .replace(/\{\s*'([A-Za-z_][A-Za-z0-9_]*)'\s*:/g, '{"$1":')
    .replace(/([{\[,]\s*)'([A-Za-z_][A-Za-z0-9_]*)'\s*:/g, '$1"$2":');
}

export function convertPythonDictToJson(jsonStr: string): string {
  if (!jsonStr.trim()) return jsonStr;
  let text = normalizeSmartQuotes(jsonStr.trim());
  if (!text.includes("'") && !/['"][A-Za-z_][A-Za-z0-9_]*['"]\s*:/.test(text)) {
    return text;
  }
  text = convertPythonDictKeys(text);
  text = rewriteQuotedStrings(text, "'");
  text = rewriteQuotedStrings(text, '"');
  return text;
}

function cleanStringBody(body: string): string {
  if (!body) return body;
  return body
    .replace(/\\+'/g, "'")
    .replace(/\\+"/g, "'")
    .replace(/\\([^"\\/bfnrtu])/g, "$1");
}

function preprocessJsonEscapeTraps(jsonStr: string): string {
  if (!jsonStr) return jsonStr;
  let cleaned = normalizeSmartQuotes(jsonStr);
  cleaned = cleaned.replace(/\\\\n/g, "\\n");
  cleaned = cleaned.replace(/\\\\t/g, "\\t");
  cleaned = cleaned.replace(/\\\\r/g, "\\r");
  cleaned = cleaned.replace(/\\+'/g, "'");
  cleaned = cleaned.replace(/,\\+'/g, ", '");
  cleaned = cleaned.replace(/,\\+"/g, ", '");
  cleaned = cleaned.replace(/\\+"/g, "'");
  return cleaned;
}

function sanitizeJsonStringLiteralsWalker(jsonStr: string): string {
  if (!jsonStr.trim()) return jsonStr;
  const text = preprocessJsonEscapeTraps(jsonStr.trim());
  let result = "";
  let i = 0;

  while (i < text.length) {
    const ch = text[i] ?? "";
    if (ch === '"' && isStringOpener(text, i, '"')) {
      result += '"';
      i += 1;
      let body = "";

      while (i < text.length) {
        const cur = text[i] ?? "";
        if (cur === "\\" && i + 1 < text.length) {
          const nxt = text[i + 1] ?? "";
          if (nxt === '"') {
            body += '"';
            i += 2;
            continue;
          }
          if (nxt === "'") {
            body += "'";
            i += 2;
            continue;
          }
          if (nxt === "\\") {
            body += "\\";
            i += 2;
            continue;
          }
          if ("bfnrt/".includes(nxt)) {
            body += cur + nxt;
            i += 2;
            continue;
          }
          if (nxt === "u" && i + 5 < text.length) {
            body += text.slice(i, i + 6);
            i += 6;
            continue;
          }
          body += nxt;
          i += 2;
          continue;
        }
        if (cur === '"' && isStringCloser(text, i)) {
          i += 1;
          break;
        }
        if (cur === '"') {
          body += "'";
          i += 1;
          continue;
        }
        body += cur;
        i += 1;
      }

      result += escapeJsonStringBody(cleanStringBody(body));
      result += '"';
      continue;
    }

    result += ch;
    i += 1;
  }

  return result;
}

function escapeJsonStringBody(body: string): string {
  let out = "";
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i] ?? "";
    if (ch === "\\" && i + 1 < body.length) {
      const nxt = body[i + 1] ?? "";
      if ("\"\\/bfnrtu".includes(nxt)) {
        out += ch + nxt;
        i += 1;
        continue;
      }
    }
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else out += ch;
  }
  return out;
}

function rewriteQuotedStrings(text: string, quote: string): string {
  if (!text.includes(quote)) return text;

  let result = "";
  let i = 0;

  while (i < text.length) {
    const ch = text[i] ?? "";
    if (ch === quote && isStringOpener(text, i, quote)) {
      result += '"';
      i += 1;
      let body = "";

      while (i < text.length) {
        const cur = text[i] ?? "";
        if (cur === "\\" && i + 1 < text.length) {
          body += cur + (text[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (cur === quote && isStringCloser(text, i)) {
          i += 1;
          break;
        }
        if (cur === quote && quote === "'" && !isStringCloser(text, i)) {
          body += cur;
          i += 1;
          continue;
        }
        if (cur === '"' && quote === '"' && !isStringCloser(text, i)) {
          body += '\\"';
          i += 1;
          continue;
        }
        body += cur;
        i += 1;
      }

      result += escapeJsonStringBody(body);
      result += '"';
      continue;
    }

    result += ch;
    i += 1;
  }

  return result;
}

export function trimJsonPreamble(raw: string): string {
  let text = cleanJsonResponse(raw);
  if (text.includes("```")) {
    text = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    return text.slice(firstBracket, lastBracket + 1);
  }
  return text;
}

export function sanitizeJsonApostrophesAndQuotes(jsonStr: string): string {
  if (!jsonStr.trim()) return jsonStr;
  let cleaned = convertPythonDictToJson(jsonStr.trim());
  cleaned = rewriteQuotedStrings(cleaned, "'");
  cleaned = rewriteQuotedStrings(cleaned, '"');
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
  return cleaned;
}

export function sanitizeJsonStringLiterals(jsonStr: string): string {
  if (!jsonStr.trim()) return jsonStr;
  return sanitizeJsonStringLiteralsWalker(sanitizeJsonApostrophesAndQuotes(jsonStr));
}

export function repairJsonString(jsonStr: string): string {
  return sanitizeJsonStringLiterals(jsonStr)
    .replace(/\bNone\b/g, "null")
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false");
}

function scanJsonStructure(text: string): { inString: boolean; stack: string[] } {
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] ?? "";
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{") stack.push("{");
    else if (ch === "[") stack.push("[");
    else if (ch === "}" && stack[stack.length - 1] === "{") stack.pop();
    else if (ch === "]" && stack[stack.length - 1] === "[") stack.pop();
  }

  return { inString, stack };
}

/** Auto-close recovery for token-truncated LLM JSON bodies. */
export function repairTruncatedJson(jsonStr: string): string {
  const text = jsonStr.trim();
  if (!text) return text;

  let { inString, stack } = scanJsonStructure(text);
  if (!inString && stack.length === 0) return text;

  let repaired = text.replace(/\s+$/, "");
  if (inString) {
    const tail = repaired.includes(" ") ? repaired.split(" ").pop() ?? "" : repaired;
    if (tail && !/[.!?,;:}\]\'"]$/.test(tail)) {
      const spaceIdx = repaired.lastIndexOf(" ");
      if (spaceIdx !== -1) repaired = repaired.slice(0, spaceIdx);
    }
    repaired += '"';
    ({ stack } = scanJsonStructure(repaired));
  }

  const closers = [...stack]
    .reverse()
    .map((opener) => (opener === "[" ? "]" : "}"))
    .join("");
  return repaired + closers;
}

export function normalizeLlmJsonText(raw: string): string {
  if (!raw?.trim()) return raw;
  let text = normalizeSmartQuotes(cleanJsonResponse(raw));
  text = trimJsonPreamble(text);
  if (text.startsWith("{") || text.startsWith("[")) {
    text = convertPythonDictKeys(text);
    text = preprocessJsonEscapeTraps(text);
  }
  return sanitizeJsonStringLiterals(convertPythonDictToJson(text));
}

/** Unescape Python-style literal breaks in plain screenplay text (not JSON shells). */
export function normalizeScriptDisplayText(text: string): string {
  if (!text) return text;
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

export function cleanLlmJsonString(raw: string): string {
  const trimmed = cleanJsonResponse(raw);
  if (!trimmed) return "";
  const presanitized = sanitizeJsonStringLiterals(convertPythonDictToJson(trimmed));
  let extracted = extractStructuralJson(presanitized);
  if (!extracted.trim()) extracted = extractStructuralJson(trimmed);
  if (!extracted.trim()) extracted = trimJsonPreamble(presanitized || trimmed);
  return sanitizeJsonStringLiterals(extracted);
}

export function parseLlmJson<T = unknown>(text: string): T {
  if (!text?.trim()) {
    throw new Error("LLM returned empty response — expected JSON");
  }

  const cleaned = cleanLlmJsonString(text);
  if (!cleaned.trim()) {
    throw new Error(
      "LLM returned no structural JSON — response contained only conversational text. " +
        `Preview: ${text.slice(0, 240)}`
    );
  }

  const candidates = [
    cleaned,
    convertPythonDictToJson(text),
    sanitizeJsonStringLiterals(convertPythonDictToJson(text)),
    sanitizeJsonStringLiterals(cleaned),
    repairJsonString(cleaned),
    repairTruncatedJson(cleaned),
    repairJsonString(repairTruncatedJson(cleaned)),
    extractStructuralJson(text),
    sanitizeJsonStringLiterals(extractStructuralJson(text)),
    repairJsonString(extractStructuralJson(text)),
    repairTruncatedJson(extractStructuralJson(text)),
    trimJsonPreamble(text),
    repairJsonString(trimJsonPreamble(text)),
    repairTruncatedJson(trimJsonPreamble(text)),
  ];

  const seen = new Set<string>();
  const errors: string[] = [];

  for (const candidate of candidates) {
    const trimmed = (candidate || "").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    try {
      return JSON.parse(trimmed) as T;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
    const repaired = repairJsonString(trimmed);
    if (!seen.has(repaired)) {
      seen.add(repaired);
      try {
        return JSON.parse(repaired) as T;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    const autoClosed = repairTruncatedJson(trimmed);
    if (!seen.has(autoClosed)) {
      seen.add(autoClosed);
      try {
        return JSON.parse(autoClosed) as T;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
      const autoClosedRepaired = repairJsonString(autoClosed);
      if (!seen.has(autoClosedRepaired)) {
        seen.add(autoClosedRepaired);
        try {
          return JSON.parse(autoClosedRepaired) as T;
        } catch (e) {
          errors.push(e instanceof Error ? e.message : String(e));
        }
      }
    }
  }

  throw new Error(
    `Failed to parse LLM JSON: ${errors[0] ?? "unknown error"}. Preview: ${text.slice(0, 240)}`
  );
}

function inferListEnvelopeKey(items: unknown[]): string {
  if (!items.length) return "data_list";
  if (!items.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    return "data_list";
  }
  const sample = items[0] as Record<string, unknown>;
  const keys = new Set(Object.keys(sample));
  if (keys.has("segment_id") && keys.has("structural_beat")) return "segments";
  if (keys.has("segment_id") && keys.has("tension_spike_level")) return "segment_tension";
  if (keys.has("segment_id") && keys.has("dramatic_irony_hook")) return "segment_irony";
  if (keys.has("id") && (keys.has("powerstart_logic") || keys.has("idea_name") || keys.has("powerstart") || keys.has("title"))) return "routes";
  if (keys.has("id") && (keys.has("mid_portion_reveal_curve") || keys.has("middle_structure"))) return "mid_portions";
  if (keys.has("id") && (keys.has("cliffhanger_stack") || keys.has("cliffhanger"))) return "cliffhangers";
  if (keys.has("name") && (keys.has("age") || keys.has("role"))) return "cast_list";
  if (keys.has("page") && keys.has("word_budget")) return "pages";
  if (keys.has("hook_line") || keys.has("hook_type")) return "data";
  if (keys.has("timeline_model")) return "data";
  if (
    keys.has("id") &&
    keys.has("summary") &&
    (keys.has("source_moment") || keys.has("sourceMoment") || keys.has("source"))
  ) {
    return "beats";
  }
  return "data_list";
}

export function coerceLlmRootObject(
  parsed: unknown,
  expectedListKey?: string
): Record<string, unknown> {
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  if (Array.isArray(parsed)) {
    const key = expectedListKey || inferListEnvelopeKey(parsed);
    return { [key]: parsed };
  }
  throw new Error(`Expected JSON object or array, got ${typeof parsed}`);
}

export function parseLlmJsonObject<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  expectedListKey?: string
): T {
  const parsed = parseLlmJson(text);
  return coerceLlmRootObject(parsed, expectedListKey) as T;
}

export function prepareJsonSystemPrompt(system: string): string {
  const parts: string[] = [];
  if (!system.includes(CRITICAL_SYSTEM_OPERATIONAL_BOUNDARY)) {
    parts.push(CRITICAL_SYSTEM_OPERATIONAL_BOUNDARY);
  }
  if (!system.includes(JSON_FORMATTING_BOUNDARY)) {
    parts.push(JSON_FORMATTING_BOUNDARY);
  }
  if (!system.includes(JSON_ROOT_OBJECT_ENVELOPE_RULE)) {
    parts.push(JSON_ROOT_OBJECT_ENVELOPE_RULE);
  }
  if (!system.includes(CRITICAL_JSON_DOUBLE_QUOTE_SPEC)) {
    parts.push(CRITICAL_JSON_DOUBLE_QUOTE_SPEC);
  }
  if (!system.includes(CRITICAL_STRING_CONSTRAINT)) {
    parts.push(CRITICAL_STRING_CONSTRAINT);
  }
  parts.push(system.trim());
  parts.push("Respond with valid JSON only. No markdown fences. No preamble.");
  return parts.filter(Boolean).join("\n\n");
}
