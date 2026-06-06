"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { btnGhost } from "@/lib/sm/ui";

export default function CampaignNav({ campaignId }: { campaignId: string }) {
  const pathname = usePathname();
  const base = `/campaign/${campaignId}`;
  const links = [
    { href: base, label: "Overview" },
    { href: `${base}/strategy`, label: "Strategy" },
    { href: `${base}/calendar`, label: "Calendar" },
    { href: `${base}/briefs`, label: "Briefs" },
  ];

  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`px-2 py-1 transition-colors ${
            pathname === link.href ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {link.label}
        </Link>
      ))}
      <Link href="/" className={`${btnGhost} ml-2`}>
        Home
      </Link>
    </nav>
  );
}
