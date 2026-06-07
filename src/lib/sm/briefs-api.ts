import type { SMCreativeBrief } from "@/types/sm";

export async function parseBriefsResponse(res: Response): Promise<SMCreativeBrief[]> {
  const data = (await res.json()) as SMCreativeBrief[] | { briefs?: SMCreativeBrief[] };
  return Array.isArray(data) ? data : (data.briefs ?? []);
}
