import type { SMContentFormat } from "@/types/sm";

export const FORMAT_COLORS: Record<SMContentFormat, string> = {
  static: "border-zinc-600 text-zinc-400",
  carousel: "border-zinc-500 text-zinc-300",
  reel: "border-zinc-400 text-zinc-200",
  reel_comic: "border-amber-500/30 text-amber-400/90",
  meme: "border-pink-500/20 text-pink-300/80",
  testimonial: "border-amber-500/20 text-amber-300/80",
  offer: "border-red-500/20 text-red-300/80",
};

export function formatLabel(format: SMContentFormat): string {
  return format.replace("_", " ");
}
