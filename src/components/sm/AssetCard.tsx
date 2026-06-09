"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import CreativeFinalizePanel from "@/components/sm/CreativeFinalizePanel";
import { getAdSize } from "@/lib/sm/ad-sizes";
import {
  brightnessFromPalette,
  getImageRegionBrightness,
  selectLogoForFormat,
} from "@/lib/sm/logo-selector";
import {
  CORNER_CLASSES,
  DEFAULT_OVERLAY_OPTIONS,
  logoBgClass,
  logoImgStyle,
  overlayOptionsFromSettings,
  PIP_SIZE_CLASS,
  TEXT_SIZE_MAP,
  type OverlayOptions,
} from "@/lib/sm/overlay-options";
import { getOverlayConfig, type LogoPosition } from "@/lib/sm/overlay-config";
import {
  getBrandAccentColor,
  getClientTypography,
  getReadableBrandAccent,
  getTypographyFontProps,
  resolveHeadlineTiers,
  splitWord,
} from "@/lib/sm/typography";
import { btnSecondary, field } from "@/lib/sm/ui";
import type {
  SMCreativeFormat,
  SMClient,
  SMGeneratedAsset,
  SMSignalOpsHeadline,
  SMVisualApproach,
} from "@/types/sm";
import PublishModal from "./PublishModal";

const EXTRA_TEXT_POSITION_CLASSES: Record<
  OverlayOptions["extraTextPosition"],
  string
> = {
  "bottom-left": "bottom-3 left-4",
  "bottom-right": "bottom-3 right-4",
  "bottom-center": "bottom-3 left-0 right-0 text-center",
};

function PunchLine({
  punch,
  emphasisWord,
  accentColor,
  cssClass,
  fontWeight,
  letterSpacing,
  textTransform,
  fontSize,
  punchColor,
  textShadow,
  fontFamily,
}: {
  punch: string;
  emphasisWord?: string;
  accentColor?: string;
  cssClass: string;
  fontWeight: number;
  letterSpacing: string;
  textTransform: "uppercase" | "none";
  fontSize: string;
  punchColor: string;
  textShadow: string;
  fontFamily?: string;
}) {
  const words = punch.split(" ");
  const accentIndex = emphasisWord
    ? words.findIndex((w) => splitWord(w).clean.toLowerCase() === emphasisWord.toLowerCase())
    : words.length - 1;
  const targetIndex = accentIndex >= 0 ? accentIndex : words.length - 1;

  return (
    <p
      className={cssClass}
      style={{
        color: punchColor,
        fontWeight,
        letterSpacing,
        textTransform,
        fontSize,
        lineHeight: 1.1,
        textShadow,
        fontFamily,
      }}
    >
      {words.map((word, i) => {
        const { clean, punct } = splitWord(word);
        const isAccent = accentColor && i === targetIndex;
        return (
          <span key={i}>
            {i > 0 && " "}
            {isAccent ? (
              <span
                style={{
                  color: accentColor,
                  textShadow: `0 0 20px ${accentColor}40`,
                }}
              >
                {clean}
              </span>
            ) : (
              clean
            )}
            {punct}
          </span>
        );
      })}
    </p>
  );
}

const LOGO_POSITION_CLASSES: Record<LogoPosition, string> = {
  "top-right": "right-3 top-3",
  "top-left": "left-3 top-3",
  "bottom-right": "right-3 bottom-3",
  "bottom-left": "left-3 bottom-3",
};

export default function AssetCard({
  asset,
  client,
  headlineMeta,
  visualApproach,
  creativeFormat,
  onRegenerate,
}: {
  asset: SMGeneratedAsset;
  client: SMClient;
  headlineMeta?: SMSignalOpsHeadline;
  visualApproach?: SMVisualApproach;
  creativeFormat?: SMCreativeFormat;
  onRegenerate: (id: string, direction?: string) => Promise<void>;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showRedoInput, setShowRedoInput] = useState(false);
  const [redoDirection, setRedoDirection] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(
    client.logos?.primary ?? client.logo_url ?? null
  );
  const [localAsset, setLocalAsset] = useState(asset);
  const [showTextOverlay, setShowTextOverlay] = useState(true);
  const [draftOverlayOptions, setDraftOverlayOptions] =
    useState<OverlayOptions>(DEFAULT_OVERLAY_OPTIONS);
  const [appliedOverlayOptions, setAppliedOverlayOptions] =
    useState<OverlayOptions>(DEFAULT_OVERLAY_OPTIONS);
  const [showFinalizePanel, setShowFinalizePanel] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const typo = getClientTypography(client);
  const fontProps = getTypographyFontProps(typo);

  const copyDependency = visualApproach?.copy_dependency ?? 3;
  const isConceptAd =
    visualApproach?.image_is_the_ad === true || copyDependency <= 2;
  const isBalancedAd = !isConceptAd && copyDependency === 3;

  useEffect(() => {
    setLocalAsset(asset);
  }, [asset]);

  useEffect(() => {
    const options = overlayOptionsFromSettings(asset.overlay_settings);
    setDraftOverlayOptions(options);
    setAppliedOverlayOptions(options);
  }, [asset.id, asset.overlay_settings]);

  useEffect(() => {
    if (!typo.isCustomFont || !typo.fontFamily) return;
    const fontName = typo.fontFamily.replace(/ /g, "+");
    if (!fontName) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@300;400;600;700&display=swap`;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [typo.isCustomFont, typo.fontFamily]);

  useEffect(() => {
    if (!appliedOverlayOptions.qrUrl || !appliedOverlayOptions.showQr) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(appliedOverlayOptions.qrUrl, {
      width: 80,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [appliedOverlayOptions.qrUrl, appliedOverlayOptions.showQr]);

  useEffect(() => {
    if (!localAsset.storage_url) return;

    const logos = client.logos ?? {};
    const hasVariants = Boolean(logos.white || logos.dark);
    const formatForced =
      creativeFormat === "print_ad" || creativeFormat === "outdoor";

    if (!hasVariants && !formatForced) {
      const fallback = logos.primary ?? client.logo_url ?? null;
      if (fallback) setLogoUrl(fallback);
      else {
        fetch(`/api/sm/clients/${client.id}/logo`)
          .then((r) => r.json())
          .then((data: { logo_url: string | null }) => {
            if (data.logo_url) setLogoUrl(data.logo_url);
          })
          .catch(() => {});
      }
      return;
    }

    if (formatForced) {
      setLogoUrl(selectLogoForFormat(logos, creativeFormat) ?? logos.primary ?? null);
      return;
    }

    const layout = localAsset.layout_template ?? "full_bleed_gradient";
    const overlay = getOverlayConfig(
      creativeFormat,
      5,
      layout,
      getBrandAccentColor(client)
    );

    if (overlay.logoInBand) {
      setLogoUrl(selectLogoForFormat(logos, creativeFormat) ?? logos.primary ?? null);
      return;
    }

    const imageSrc = `${localAsset.storage_url}?v=${refreshKey}`;
    const paletteBrightness = brightnessFromPalette(client.color_palette);
    const region =
      overlay.logoPosition === "bottom-right"
        ? { x: 240, y: 320, w: 160, h: 80 }
        : overlay.logoPosition === "bottom-left"
          ? { x: 0, y: 320, w: 160, h: 80 }
          : overlay.logoPosition === "top-left"
            ? { x: 0, y: 0, w: 160, h: 80 }
            : { x: 240, y: 0, w: 160, h: 80 };

    void getImageRegionBrightness(imageSrc, {
      ...region,
      imgW: 400,
      imgH: 400,
    }).then((brightness) => {
      const effectiveBrightness =
        brightness === 128 && paletteBrightness !== undefined
          ? paletteBrightness
          : brightness;
      setLogoUrl(
        selectLogoForFormat(logos, creativeFormat, effectiveBrightness) ??
          logos.primary ??
          client.logo_url ??
          null
      );
    });
  }, [
    localAsset.storage_url,
    client.logos,
    client.logo_url,
    client.id,
    creativeFormat,
    refreshKey,
    localAsset.layout_template,
  ]);

  const isTextOnly =
    localAsset.status === "done" && !localAsset.storage_url && Boolean(localAsset.copy);
  const platformLabel = localAsset.platform.charAt(0).toUpperCase() + localAsset.platform.slice(1);
  const typeLabel = isTextOnly ? "TV Script" : localAsset.asset_type.replace("_", " ");

  const formatLabel = (() => {
    if (creativeFormat === "print_ad" && localAsset.ad_size_id) {
      const size = getAdSize("print_ad", localAsset.ad_size_id);
      return size ? `PRINT · ${size.label.toUpperCase()}` : "PRINT AD";
    }
    if (creativeFormat === "outdoor" && localAsset.ad_size_id) {
      const size = getAdSize("outdoor", localAsset.ad_size_id);
      return size ? `OOH · ${size.label.toUpperCase()}` : "OUTDOOR";
    }
    return `${platformLabel.toUpperCase()} · ${typeLabel.toUpperCase()}`;
  })();

  async function handleRedo() {
    setRegenerating(true);
    setLocalAsset((prev) => ({ ...prev, status: "generating", error_message: undefined }));
    try {
      await onRegenerate(localAsset.id, redoDirection.trim() || undefined);
      setRefreshKey((k) => k + 1);
      setShowRedoInput(false);
      setRedoDirection("");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleApplyOverlayChanges() {
    const res = await fetch(`/api/sm/assets/${localAsset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overlay_options: draftOverlayOptions }),
    });
    if (!res.ok) {
      console.error("Failed to save overlay settings");
      return;
    }
    const updated = (await res.json()) as SMGeneratedAsset;
    setLocalAsset((prev) => ({
      ...prev,
      overlay_settings: updated.overlay_settings,
    }));
    setAppliedOverlayOptions(draftOverlayOptions);
    setShowFinalizePanel(false);
  }

  function handleCancelOverlayChanges() {
    setDraftOverlayOptions(appliedOverlayOptions);
    setShowFinalizePanel(false);
  }

  async function handleDownload() {
    if (isTextOnly && localAsset.copy) {
      const blob = new Blob([localAsset.copy], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${client.name}-tv-script-30s.txt`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const res = await fetch(`/api/sm/assets/${localAsset.id}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overlay_options: appliedOverlayOptions }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client.name}-${localAsset.platform}-${localAsset.asset_type}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-900/30">
      <div
        className={`@container relative overflow-hidden bg-zinc-950 ${
          isTextOnly ? "min-h-[400px]" : "aspect-square"
        }`}
      >
        {isTextOnly && (
          <div className="max-h-[400px] overflow-y-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-zinc-400">
            {localAsset.copy}
          </div>
        )}

        {localAsset.status === "done" && localAsset.storage_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${localAsset.storage_url}?v=${refreshKey}`}
              alt={`${platformLabel} ${typeLabel}`}
              className={
                (() => {
                  const layout = isConceptAd
                    ? "full_bleed_gradient"
                    : (localAsset.layout_template ?? "full_bleed_gradient");
                  const overlay = getOverlayConfig(
                    creativeFormat,
                    5,
                    layout,
                    getBrandAccentColor(client)
                  );
                  return overlay.imageClass;
                })()
              }
            />
            {localAsset.headline &&
              showTextOverlay &&
              !isConceptAd &&
              (() => {
                const tiers = resolveHeadlineTiers(localAsset.headline, headlineMeta);
                if (!tiers) return null;

                const punchWordCount = tiers.punch.split(" ").length;
                const layout = isConceptAd
                  ? "full_bleed_gradient"
                  : (localAsset.layout_template ?? "full_bleed_gradient");
                const brandColor = getBrandAccentColor(client);
                const overlay = getOverlayConfig(
                  creativeFormat,
                  punchWordCount,
                  layout,
                  brandColor
                );
                const useBand = Boolean(overlay.bandPosition);
                const textAtTop = appliedOverlayOptions.textPosition === "top";
                const textAtBottom = appliedOverlayOptions.textPosition === "bottom";
                const gradientAnchor = useBand
                  ? "none"
                  : isBalancedAd
                    ? "bottom"
                    : textAtTop
                      ? "top"
                      : textAtBottom
                        ? "bottom"
                        : overlay.gradientAnchor;
                const wrapperClass = useBand
                  ? overlay.wrapperClass
                  : textAtTop
                    ? "absolute top-0 left-0 right-0"
                    : textAtBottom && overlay.gradientAnchor === "top"
                      ? "absolute bottom-0 left-0 right-0"
                      : overlay.wrapperClass;
                const textSizeKey = isBalancedAd
                  ? appliedOverlayOptions.textSize === "xl"
                    ? "lg"
                    : appliedOverlayOptions.textSize === "lg"
                      ? "md"
                      : appliedOverlayOptions.textSize === "md"
                        ? "sm"
                        : "sm"
                  : appliedOverlayOptions.textSize;
                const sizes = TEXT_SIZE_MAP[textSizeKey];
                const setupWeight = Math.max(typo.fontWeight - 200, 300);
                const punchWeight = Math.min(typo.fontWeight + 200, 900);
                const accentColor = getReadableBrandAccent(client);
                const logoClearsText =
                  useBand &&
                  overlay.logoInBand &&
                  overlay.logoPosition.startsWith("top") &&
                  textAtTop;
                const bandContainerClass = useBand
                  ? `${overlay.containerClass} ${
                      textAtTop
                        ? `justify-start ${logoClearsText ? "pt-16" : "pt-8"}`
                        : overlay.bandPosition === "bottom"
                          ? "justify-center"
                          : "justify-end pb-4"
                    }`
                  : overlay.containerClass;

                const textBlock = (
                  <div className={`${bandContainerClass} max-w-full overflow-hidden`}>
                    {tiers.setup && (
                      <p
                        className={`${fontProps.className} mb-0.5 break-words`}
                        style={{
                          color: overlay.setupColor,
                          fontWeight: setupWeight,
                          letterSpacing: typo.letterSpacing,
                          textTransform: typo.textTransform,
                          fontSize: sizes.setup,
                          lineHeight: 1.25,
                          textShadow: overlay.setupShadow,
                          fontFamily: fontProps.fontFamily,
                          wordBreak: "break-word",
                        }}
                      >
                        {tiers.setup}
                      </p>
                    )}
                    <PunchLine
                      punch={tiers.punch}
                      emphasisWord={headlineMeta?.emphasis_word}
                      accentColor={accentColor}
                      cssClass={`${fontProps.className} break-words`}
                      fontWeight={punchWeight}
                      letterSpacing={
                        typo.textTransform === "uppercase" ? "0.04em" : typo.letterSpacing
                      }
                      textTransform={typo.textTransform}
                      fontSize={sizes.punch}
                      punchColor={overlay.punchColor}
                      textShadow={overlay.punchShadow}
                      fontFamily={fontProps.fontFamily}
                    />
                  </div>
                );

                return (
                  <div
                    className={`pointer-events-none ${wrapperClass}`}
                    style={
                      overlay.bandColor && overlay.bandPosition
                        ? { background: overlay.bandColor }
                        : undefined
                    }
                  >
                    {overlay.gradientStyle !== "none" && gradientAnchor !== "none" && (
                      <div
                        className={`absolute left-0 right-0 ${
                          gradientAnchor === "top" ? "top-0" : "bottom-0"
                        }`}
                        style={{
                          height: "60%",
                          background: overlay.gradientStyle,
                        }}
                      />
                    )}
                    {textBlock}
                    {logoUrl && overlay.logoInBand && (
                      <div
                        className={`absolute z-20 ${LOGO_POSITION_CLASSES[overlay.logoPosition]} ${logoBgClass(appliedOverlayOptions.logoBg, useBand)}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoUrl}
                          alt={client.name}
                          className="w-auto max-w-[140px] object-contain"
                          style={logoImgStyle(
                            appliedOverlayOptions.logoBg,
                            appliedOverlayOptions.logoSize
                          )}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            {visualApproach?.product_placement === "corner_stamp" && logoUrl && (
              <div className="absolute bottom-3 right-3 z-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={client.name}
                  className="w-auto object-contain"
                  style={logoImgStyle("none", appliedOverlayOptions.logoSize)}
                />
              </div>
            )}
            {logoUrl &&
              visualApproach?.product_placement !== "corner_stamp" &&
              (() => {
                const layout = isConceptAd
                  ? "full_bleed_gradient"
                  : (localAsset.layout_template ?? "full_bleed_gradient");
                const overlay = getOverlayConfig(
                  creativeFormat,
                  5,
                  layout,
                  getBrandAccentColor(client)
                );
                if (overlay.logoInBand) return null;
                const logoPosition = isConceptAd || isBalancedAd
                  ? "bottom-right"
                  : overlay.logoPosition;
                return (
                  <div
                    className={`absolute z-20 ${LOGO_POSITION_CLASSES[logoPosition]} ${logoBgClass(appliedOverlayOptions.logoBg, isConceptAd)}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt={client.name}
                      className="w-auto max-w-[140px] object-contain"
                      style={logoImgStyle(
                        appliedOverlayOptions.logoBg,
                        appliedOverlayOptions.logoSize
                      )}
                    />
                  </div>
                );
              })()}
            {appliedOverlayOptions.showExtraText && appliedOverlayOptions.extraText && (
              <div
                className={`absolute z-20 ${EXTRA_TEXT_POSITION_CLASSES[appliedOverlayOptions.extraTextPosition]}`}
              >
                <p
                  style={{
                    fontFamily: fontProps.fontFamily ?? "inherit",
                    fontSize: "clamp(10px, 2.5cqi, 14px)",
                    color: "rgba(255,255,255,0.85)",
                    textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                    fontWeight: 400,
                    letterSpacing: "0.05em",
                  }}
                >
                  {appliedOverlayOptions.extraText}
                </p>
              </div>
            )}
            {appliedOverlayOptions.showQr && qrDataUrl && (
              <div className={`absolute z-20 ${CORNER_CLASSES[appliedOverlayOptions.qrPosition]}`}>
                <div className="rounded-lg bg-white p-1.5 shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="QR" className="block h-14 w-14" />
                </div>
              </div>
            )}
            {appliedOverlayOptions.showPip && appliedOverlayOptions.pipImageUrl && (
              <div
                className={`absolute z-20 overflow-hidden rounded-xl border-2 border-white/30 shadow-lg ${CORNER_CLASSES[appliedOverlayOptions.pipPosition]} ${PIP_SIZE_CLASS[appliedOverlayOptions.pipSize]}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={appliedOverlayOptions.pipImageUrl}
                  alt="Secondary image"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </>
        )}

        {localAsset.status === "generating" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-600">
            <div className="h-5 w-5 animate-spin rounded-full border border-zinc-600 border-t-zinc-300" />
            <span className="text-xs">Generating</span>
          </div>
        )}

        {localAsset.status === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <p className="text-sm text-red-400/90">Generation failed</p>
            {localAsset.error_message && (
              <p className="max-w-[200px] text-xs leading-relaxed text-zinc-600">
                {localAsset.error_message}
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleRedo()}
              disabled={regenerating}
              className={`${btnSecondary} mt-2 px-3 py-1.5 text-xs`}
            >
              {regenerating ? "…" : "Try again"}
            </button>
          </div>
        )}

        <div className="absolute left-2 top-2 rounded bg-black/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
          {formatLabel}
        </div>

      </div>

      {localAsset.status === "done" && localAsset.storage_url && !isTextOnly && (
        <button
          type="button"
          onClick={() => {
            setShowFinalizePanel((prev) => {
              if (!prev) setDraftOverlayOptions(appliedOverlayOptions);
              return !prev;
            });
          }}
          className={`w-full border-t py-2 text-xs transition-colors ${
            showFinalizePanel
              ? "border-violet-500/30 bg-violet-500/5 text-violet-400"
              : "border-zinc-800 text-zinc-600 hover:text-zinc-400"
          }`}
        >
          {showFinalizePanel ? "↑ Close editor" : "✦ Edit creative"}
        </button>
      )}

      {showFinalizePanel && (
        <CreativeFinalizePanel
          options={draftOverlayOptions}
          onChange={setDraftOverlayOptions}
          onApply={handleApplyOverlayChanges}
          onCancel={handleCancelOverlayChanges}
        />
      )}

      {localAsset.headline && !isConceptAd && (
        <div className="px-3 pt-3">
          <p className="text-sm text-zinc-200">&ldquo;{localAsset.headline}&rdquo;</p>
        </div>
      )}
      {isConceptAd && visualApproach?.impossible_element && (
        <div className="px-3 pt-3">
          <p className="text-[10px] uppercase tracking-wider text-amber-400/80">
            Concept ad — image only
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {visualApproach.impossible_element}
          </p>
        </div>
      )}
      {localAsset.copy && !isTextOnly && copyDependency >= 4 && (
        <div className="px-3 pb-2 pt-1">
          <p className="line-clamp-3 text-xs leading-relaxed text-zinc-500">{localAsset.copy}</p>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 px-3 pb-3 pt-1">
        {showRedoInput && !isTextOnly && (
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={redoDirection}
              onChange={(e) => setRedoDirection(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !regenerating) void handleRedo();
                if (e.key === "Escape") {
                  setShowRedoInput(false);
                  setRedoDirection("");
                }
              }}
              placeholder="e.g. warmer tones, outdoor setting…"
              className={`${field} min-w-0 flex-1 py-2 text-xs`}
            />
            <button
              type="button"
              onClick={() => void handleRedo()}
              disabled={regenerating}
              className={`${btnSecondary} shrink-0 px-3 py-2 text-xs`}
            >
              {regenerating ? "…" : "Go"}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {localAsset.status === "done" &&
            localAsset.storage_url &&
            localAsset.headline &&
            !isTextOnly && (
              <button
                type="button"
                onClick={() => setShowTextOverlay((prev) => !prev)}
                className={`shrink-0 rounded border px-2 py-1.5 text-xs transition-colors ${
                  showTextOverlay
                    ? "border-zinc-600 text-zinc-400 hover:text-zinc-300"
                    : "border-zinc-700 text-zinc-600 line-through hover:text-zinc-500"
                }`}
                title="Toggle headline overlay"
              >
                Tt
              </button>
            )}
          <button
            type="button"
            onClick={() => void handleDownload()}
            className={`${btnSecondary} flex-1 py-2 text-xs`}
          >
            Download
          </button>
          {!isTextOnly && (
            <button
              type="button"
              onClick={() => {
                if (!showRedoInput) {
                  setShowRedoInput(true);
                } else if (redoDirection.trim()) {
                  void handleRedo();
                } else {
                  setShowRedoInput(false);
                }
              }}
              disabled={regenerating || localAsset.status === "generating"}
              className={`${btnSecondary} flex-1 py-2 text-xs`}
            >
              {regenerating ? "…" : "Redo"}
            </button>
          )}
          {!isTextOnly && (
            <button
              type="button"
              onClick={() => setShowPublish(true)}
              className={`${btnSecondary} flex-1 py-2 text-xs`}
            >
              Publish
            </button>
          )}
        </div>
      </div>

      {showPublish && (
        <PublishModal
          asset={localAsset}
          client={client}
          onClose={() => setShowPublish(false)}
        />
      )}
    </div>
  );
}
