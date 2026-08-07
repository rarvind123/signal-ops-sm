import type { SMLayoutTemplate } from "@/types/sm";

/** Layouts that always need the strategy headline on the image. */
export function layoutRequiresHeadline(layout?: SMLayoutTemplate | string | null): boolean {
  return (
    layout === "type_forward" ||
    layout === "full_bleed_top_text" ||
    layout === "brand_band_bottom" ||
    layout === "brand_band_left"
  );
}

export function overlayLayoutForAsset(
  layoutTemplate: SMLayoutTemplate | string | undefined,
  isConceptAd: boolean
): SMLayoutTemplate {
  const layout = (layoutTemplate ?? "full_bleed_gradient") as SMLayoutTemplate;
  if (layoutRequiresHeadline(layout)) return layout;
  if (isConceptAd) return "full_bleed_gradient";
  return layout;
}
