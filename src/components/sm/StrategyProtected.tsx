"use client";

import { useEffect, useRef, type ReactNode } from "react";

const PROTECTION_STYLE = {
  userSelect: "none" as const,
  WebkitUserSelect: "none" as const,
  MozUserSelect: "none" as const,
  WebkitTouchCallout: "none" as const,
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, a, input, textarea, select, [role='button']"));
}

export default function StrategyProtected({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const blockMenu = (e: Event) => {
      e.preventDefault();
    };

    const blockCopy = (e: Event) => {
      e.preventDefault();
    };

    const blockSelect = (e: Event) => {
      if (isInteractiveTarget(e.target)) return;
      e.preventDefault();
    };

    const blockDrag = (e: Event) => {
      if (isInteractiveTarget(e.target)) return;
      e.preventDefault();
    };

    el.addEventListener("contextmenu", blockMenu, true);
    el.addEventListener("copy", blockCopy, true);
    el.addEventListener("cut", blockCopy, true);
    el.addEventListener("selectstart", blockSelect, true);
    el.addEventListener("dragstart", blockDrag, true);

    return () => {
      el.removeEventListener("contextmenu", blockMenu, true);
      el.removeEventListener("copy", blockCopy, true);
      el.removeEventListener("cut", blockCopy, true);
      el.removeEventListener("selectstart", blockSelect, true);
      el.removeEventListener("dragstart", blockDrag, true);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-strategy-protected
      className={`strategy-protected ${className}`}
      style={PROTECTION_STYLE}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}
