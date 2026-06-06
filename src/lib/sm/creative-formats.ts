import "server-only";

import type { SMCreativeFormat } from "@/types/sm";

export type FormatAspectRatio = "1:1" | "9:16" | "16:9" | "4:5" | "3:4";

export interface CreativeFormat {
  id: SMCreativeFormat;
  output_type: "image" | "text";
  default_aspect_ratio?: FormatAspectRatio;
  signalops_context: string;
  copy_constraints: {
    max_headline_words: number;
    max_body_words: number;
    note: string;
  };
}

const FORMATS: CreativeFormat[] = [
  {
    id: "social_media",
    output_type: "image",
    default_aspect_ratio: "4:5",
    copy_constraints: {
      max_headline_words: 12,
      max_body_words: 50,
      note: "Platform-native length. Instagram favours brevity + emotion.",
    },
    signalops_context: `
FORMAT CONTEXT: SOCIAL MEDIA
You are creating for a social media feed — Instagram, LinkedIn, Facebook, or X.
Rules for this format:
- The audience is scrolling fast. The image must stop the scroll in 0.3 seconds.
- The headline must work without the image. The image must work without the headline. Together they create a third meaning.
- Copy is short. One idea per post. No sub-messages.
- Platform-native: Instagram = emotion + aspiration. LinkedIn = insight + authority. Facebook = community + accessibility.
- The visual should feel native to the feed — not like a banner ad that wandered in from 2010.
`,
  },
  {
    id: "print_ad",
    output_type: "image",
    default_aspect_ratio: "3:4",
    copy_constraints: {
      max_headline_words: 15,
      max_body_words: 120,
      note: "Print allows longer copy. Headlines can be more considered. Body copy rewards the reader who stops.",
    },
    signalops_context: `
FORMAT CONTEXT: PRINT ADVERTISEMENT
You are creating for print — newspaper, magazine, or poster format.
Rules for this format:
- Print is a permanent medium. The reader chose to look at this page. They will give it more than 0.3 seconds.
- Headlines can be more considered and craft-driven — up to 15 words if every word earns its place.
- Body copy is permitted and rewards readers who engage. Write for someone who will read it twice.
- The visual composition must work in high contrast and at full bleed. No digital gradients or motion implied — think still, architectural, considered.
- Print is where the Big Idea lives at its fullest expression. No compromises for algorithm.
- White space is not empty. It is part of the design.
`,
  },
  {
    id: "outdoor",
    output_type: "image",
    default_aspect_ratio: "16:9",
    copy_constraints: {
      max_headline_words: 7,
      max_body_words: 0,
      note: "Outdoor = 7 words maximum. Often fewer. No body copy. The visual IS the message.",
    },
    signalops_context: `
FORMAT CONTEXT: OUTDOOR / OUT-OF-HOME (OOH)
You are creating for outdoor advertising — billboards, transit shelters, hoardings, bus wraps.
This is the most demanding creative format. The constraints are absolute:
- THE 3-SECOND RULE: A driver at 60km/h has 3 seconds to receive the full message. This is not a guideline. It is physics.
- MAXIMUM 7 WORDS IN THE HEADLINE. Fewer is better. The best outdoor ads have 3-5 words or zero words.
- NO BODY COPY. If it cannot be read from a moving vehicle, it does not belong on this medium.
- ONE IDEA ONLY. No sub-messages. No multiple benefits. One thought, communicated with maximum efficiency.
- THE VISUAL CARRIES THE WEIGHT: The image must communicate the full idea with zero words if possible. The headline is reinforcement, not explanation.
- BIG, BOLD, UNMISSABLE: Composition must work at billboard scale — large subject, high contrast, no small detail that disappears at distance.
- LOCATION AWARENESS: The best OOH is contextually aware of where it will be seen. A gym ad near a fast food restaurant. A coffee brand near the morning commute.
Headlines for this format must be punishing in their brevity. If the direction suggests 8 words, cut 2 more.
`,
  },
  {
    id: "tv_script",
    output_type: "text",
    copy_constraints: {
      max_headline_words: 0,
      max_body_words: 300,
      note: "TV script = 30 seconds (75 words spoken) or 60 seconds (150 words spoken). Include scene directions, dialogue, VO, SFX.",
    },
    signalops_context: `
FORMAT CONTEXT: TV / VIDEO SCRIPT
You are creating a TV or digital video advertisement — 30 or 60 seconds.
Rules for this format:
- TV is the most emotionally powerful advertising medium. It has time, sound, motion, and narrative.
- SCENE BY SCENE: Structure the script as distinct scenes. Each scene has a visual description, dialogue or VO, and SFX/music note.
- TIMING IS EVERYTHING: A 30-second TV ad has approximately 75 spoken words. A 60-second has 150. Every word costs airtime.
- SHOW, DON'T TELL: The visual must do the work. The VO reinforces — it does not explain what the viewer can already see.
- THE EMOTIONAL ARC: Even a 30-second ad needs a beginning, middle, and end. Setup, tension, release.
- THE FINAL 5 SECONDS: The last 5 seconds is the brand moment. Logo + tagline + endline. This is earned by what came before.
- FORMAT FOR PRODUCTION: Output must be formatted as a production-ready script that a director can take to set.
`,
  },
  {
    id: "social_video",
    output_type: "text",
    copy_constraints: { max_headline_words: 0, max_body_words: 0, note: "" },
    signalops_context: "",
  },
  {
    id: "pitch_deck",
    output_type: "text",
    copy_constraints: { max_headline_words: 0, max_body_words: 0, note: "" },
    signalops_context: "",
  },
];

export function getFormat(id: SMCreativeFormat | undefined): CreativeFormat {
  return FORMATS.find((f) => f.id === (id ?? "social_media")) ?? FORMATS[0];
}
