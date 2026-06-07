/** Shared minimal UI class strings for SignalOps screens */

export const SIGNALOPS_TM = "SignalOps™";

/** 80% grey — homepage (#cccccc) */
export const HOME_GREY = "#cccccc";
export const HOME_GREY_TEXT_STYLE = { color: HOME_GREY } as const;
export const HOME_GREY_BTN_STYLE = {
  backgroundColor: HOME_GREY,
  color: "#09090b",
} as const;
export const HOME_LOGO_STYLE = { opacity: 0.65 } as const;

export const HOME_TEXT_GREY = "home-primary-text";
export const HOME_BTN_PRIMARY =
  "home-btn-primary rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

export const label = "text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500";

export const field =
  "w-full rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-zinc-600 focus:bg-zinc-900/60";

export const select = `${field} cursor-pointer appearance-none`;

export const btnPrimary =
  "rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

export const btnGhost =
  "text-xs text-zinc-500 transition-colors hover:text-zinc-300";

export const btnSecondary =
  "rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-40";

export const chip =
  "rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400 transition-colors";

export const chipActive = "border-zinc-500 bg-zinc-800/80 text-zinc-100";

export const sectionTitle = "text-base font-medium tracking-tight text-zinc-100";

export const sectionSub = "text-sm text-zinc-500";
