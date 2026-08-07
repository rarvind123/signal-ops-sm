import { completeJson } from "@/lib/ai";
import type { SMClient } from "@/types/sm";

const INGREDIENT_INTENT =
  /\bingredients?\b|\bherbs?\b|\bherbals?\b|\bbotanicals?\b|\bnatural\s+actives?\b|\bkey\s+ingredients?\b/i;

const NAMED_INGREDIENT =
  /\b(aloe|neem|turmeric|honey|coconut|almond|olive|shea|lavender|chamomile|calendula|jojoba|vitamin\s*[a-e]|retinol|niacinamide|hyaluronic|ashwagandha|tulsi|brahmi|sandalwood|rose|hibiscus|amla|ginger|tea\s*tree)\b/i;

export function briefRequestsIngredients(briefText: string, mustInclude?: string | null): boolean {
  const haystack = `${briefText}\n${mustInclude ?? ""}`;
  return INGREDIENT_INTENT.test(haystack);
}

export function hasNamedIngredients(text?: string | null): boolean {
  if (!text?.trim()) return false;
  return NAMED_INGREDIENT.test(text);
}

export function needsIngredientResearch(
  briefText: string,
  mustInclude?: string | null
): boolean {
  if (!briefRequestsIngredients(briefText, mustInclude)) return false;
  // Already specified concrete ingredients in must_include
  if (hasNamedIngredients(mustInclude)) return false;
  return true;
}

export async function researchBrandIngredients(
  client: Pick<SMClient, "name" | "usp" | "tagline" | "guidelines_summary">
): Promise<string[]> {
  try {
    const result = await completeJson<{ ingredients: string[] }>(
      `You research well-established consumer brand ingredients for advertising creatives.
Return ONLY JSON: {"ingredients": string[]} with 3-6 specific, visually depictable ingredients
commonly associated with this brand's category/products. Prefer real signature ingredients.
If the brand is unknown, return plausible category-typical natural ingredients.
No packaging, no marketing slogans — ingredient names only.`,
      `Brand: ${client.name}
Tagline: ${client.tagline ?? ""}
USP: ${client.usp ?? ""}
Guidelines: ${client.guidelines_summary ?? ""}`,
      "claude-haiku-4-5-20251001",
      { maxTokens: 300, temperature: 0.3 }
    );

    const list = Array.isArray(result.ingredients)
      ? result.ingredients.map((s) => String(s).trim()).filter(Boolean)
      : [];
    return list.slice(0, 6);
  } catch (error) {
    console.warn("[brand-ingredient-research] failed:", error);
    return [];
  }
}

export function formatIngredientsForMustInclude(ingredients: string[]): string {
  if (ingredients.length === 0) return "";
  return `clearly showcase these key ingredients as primary visual focus: ${ingredients.join(", ")}`;
}
