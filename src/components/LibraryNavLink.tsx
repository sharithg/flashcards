"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LibraryNavLinkStatic({ active }: { active: boolean }) {
  return (
    <Button asChild variant="ghost" size="sm" className="hidden aria-[current=page]:border-border aria-[current=page]:bg-accent sm:inline-flex">
      <Link href="/" aria-current={active ? "page" : undefined}>
        Library
      </Link>
    </Button>
  );
}

export function LibraryNavLink() {
  return <LibraryNavLinkStatic active={usePathname() === "/"} />;
}
