/**
 * Curated agency-grade style packs.
 * Used when Pinterest is unavailable or to backfill reference images.
 * Image URLs are stable Unsplash CDN assets (editorial / photographic).
 */

export type StylePackId =
  | "yoga_wellness"
  | "beauty_skincare"
  | "food_beverage"
  | "fitness"
  | "fashion"
  | "finance_trust"
  | "tech_product"
  | "event_lifestyle"
  | "general_editorial";

export type StylePack = {
  id: StylePackId;
  label: string;
  /** Keywords that map a brief onto this pack */
  match: RegExp;
  /** Phase 1 — best ads / campaigns in this category */
  adCreativeQueries: string[];
  /** Phase 2 — broader photographic / mood references */
  visualReferenceQueries: string[];
  /** Agency art-direction brief — always available even without images */
  styleBrief: string;
  /** Fallback reference image URLs (max used: 2) */
  fallbackImageUrls: string[];
};

export const STYLE_PACKS: StylePack[] = [
  {
    id: "yoga_wellness",
    label: "yoga wellness studio",
    match:
      /\b(yoga|ayurveda|wellness|meditation|mindful|pilates|studio\s+class|pranayama|asana)\b/i,
    adCreativeQueries: [
      "best yoga studio advertising campaign India",
      "wellness brand Instagram ad creative award winning",
      "yoga class trial offer social media ad creative",
      "Cannes lions wellness print advertising",
    ],
    visualReferenceQueries: [
      "editorial wellness studio warm window light empty space",
      "Indian wellness campaign photography natural light no text",
      "yoga studio interior architecture sunlight no people",
      "time metaphor editorial photography still life wellness",
    ],
    styleBrief:
      "Warm natural window light, honey wood floors, cream walls, single subject in motion, naturalistic shadows (not neon/CGI), quiet negative space, medium-format film feel, non-corporate, no props clutter.",
    fallbackImageUrls: [
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1599901860904-17e6ed7083fd?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "beauty_skincare",
    label: "beauty skincare",
    match: /\b(skincare|beauty|serum|cream|glow|cosmetic|dermat|face\s*wash|moisturizer)\b/i,
    adCreativeQueries: [
      "best beauty brand advertising campaign India",
      "skincare Instagram ad creative award winning",
      "Cannes lions beauty print ad",
      "Indian beauty brand campaign creative",
    ],
    visualReferenceQueries: [
      "editorial skincare photography soft daylight texture",
      "minimal beauty campaign photography no product packshot",
      "Indian beauty brand lifestyle editorial photograph",
    ],
    styleBrief:
      "Soft daylight, tactile skin/texture detail, restrained palette, intimate framing, premium quiet luxury — never clinical white seamless or stock smiling close-ups.",
    fallbackImageUrls: [
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "food_beverage",
    label: "food beverage",
    match: /\b(food|coffee|tea|restaurant|cafe|beverage|recipe|kitchen|chef|dining)\b/i,
    adCreativeQueries: [
      "best food brand advertising campaign India",
      "cafe coffee Instagram ad creative award winning",
      "Cannes lions food beverage print ad",
      "restaurant brand social media ad creative India",
    ],
    visualReferenceQueries: [
      "editorial food photography natural light film",
      "cafe lifestyle photography warm daylight India",
      "beverage campaign photography no packaging text",
    ],
    styleBrief:
      "Directional natural light, honest texture, shallow depth, appetite without clutter, editorial not menu-shoot, avoid overhead flat-lay clichés unless essential.",
    fallbackImageUrls: [
      "https://images.unsplash.com/photo-1495474472287-4d71fc08e126?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "fitness",
    label: "fitness training",
    match: /\b(fitness|gym|workout|training|athlete|crossfit|run(?:ning)?|strength)\b/i,
    adCreativeQueries: [
      "best fitness brand advertising campaign",
      "gym Instagram ad creative award winning",
      "Cannes lions sports fitness print ad",
      "athletic brand social media campaign creative India",
    ],
    visualReferenceQueries: [
      "editorial fitness photography naturalistic light",
      "athletic portrait film photography no gym cliche",
      "movement sports photography cinematic still",
    ],
    styleBrief:
      "Kinetic but unposed energy, sweat/effort as truth not glamour, cinematic contrast, avoid stock determination-face and floating dumbbells.",
    fallbackImageUrls: [
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "fashion",
    label: "fashion apparel",
    match: /\b(fashion|apparel|clothing|wear|outfit|boutique|saree|ethnic\s*wear)\b/i,
    adCreativeQueries: [
      "best fashion brand advertising campaign India",
      "apparel Instagram ad creative award winning",
      "Cannes lions fashion print campaign",
      "Indian fashion brand campaign creative",
    ],
    visualReferenceQueries: [
      "fashion editorial photography natural light India",
      "contemporary fashion campaign film look",
      "street fashion photography clean composition",
    ],
    styleBrief:
      "Strong silhouette, intentional wardrobe, location as character, editorial casting energy — not catalogue pose, not white seamless packshot.",
    fallbackImageUrls: [
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "finance_trust",
    label: "finance insurance",
    match: /\b(bank|finance|insurance|invest|loan|fintech|money|wealth)\b/i,
    adCreativeQueries: [
      "best fintech advertising campaign India",
      "banking brand campaign creative award winning",
      "Cannes lions finance insurance print ad",
      "Indian insurance brand advertising creative",
    ],
    visualReferenceQueries: [
      "human finance brand photography warm documentary",
      "trust brand lifestyle photography India editorial",
      "quiet luxury documentary photography no handshake cliche",
    ],
    styleBrief:
      "Human-scale documentary warmth, quiet confidence, real environments — ban handshake, umbrella, piggy-bank, and blue-network clichés.",
    fallbackImageUrls: [
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "tech_product",
    label: "tech product",
    match: /\b(tech|app|saas|software|gadget|device|ai\b|digital|startup)\b/i,
    adCreativeQueries: [
      "best tech brand advertising campaign",
      "app launch Instagram ad creative award winning",
      "Cannes lions technology print ad",
      "Indian startup brand campaign creative",
    ],
    visualReferenceQueries: [
      "tech lifestyle photography human scale editorial",
      "product in real life photography no UI mockup",
      "modern workspace photography warm not blue glow",
    ],
    styleBrief:
      "Human scale, real-world context, warm materials over blue neon UI glow, one clear idea per frame.",
    fallbackImageUrls: [
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "event_lifestyle",
    label: "event lifestyle",
    match: /\b(event|launch|festival|party|concert|exhibition|workshop|trial\s+class)\b/i,
    adCreativeQueries: [
      "best event marketing advertising campaign India",
      "workshop class Instagram ad creative",
      "Cannes lions experiential brand campaign",
      "lifestyle brand social media ad creative India",
    ],
    visualReferenceQueries: [
      "lifestyle event photography editorial warm light",
      "intimate gathering photography film still",
      "workshop class lifestyle photography India",
    ],
    styleBrief:
      "Anticipation and presence over crowd noise, warm practical light, one human moment that sells the feeling of being there.",
    fallbackImageUrls: [
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "general_editorial",
    label: "brand advertising",
    match: /./,
    adCreativeQueries: [
      "best advertising campaign creative India",
      "award winning Instagram ad creative agency",
      "Cannes lions print ad photography concept",
      "Indian brand campaign creative film look",
    ],
    visualReferenceQueries: [
      "award winning advertising photography editorial",
      "brand campaign photography film look no text",
      "editorial lifestyle photography natural light India",
    ],
    styleBrief:
      "One unforgettable visual idea, naturalistic light, medium-format stillness, generous craft, zero corporate stock aesthetic, no on-image text.",
    fallbackImageUrls: [
      "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1200&q=80",
    ],
  },
];

export function selectStylePack(haystack: string): StylePack {
  for (const pack of STYLE_PACKS) {
    if (pack.id === "general_editorial") continue;
    if (pack.match.test(haystack)) return pack;
  }
  return STYLE_PACKS.find((p) => p.id === "general_editorial")!;
}

export function buildResearchHaystack(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).join("\n");
}
