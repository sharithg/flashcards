"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LibraryNavLinkStatic({ active }: { active: boolean }) {
  return (
    <Link
      href="/"
      aria-current={active ? "page" : undefined}
      className={`hidden rounded-lg px-3 py-2 text-sm font-semibold outline-none focus-visible:outline-2 focus-visible:outline-accent sm:block ${
        active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-ink"
      }`}
    >
      Library
    </Link>
  );
}

export function LibraryNavLink() {
  return <LibraryNavLinkStatic active={usePathname() === "/"} />;
}
