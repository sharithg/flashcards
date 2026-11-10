"use client";

import { usePathname } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";

export function LibraryNavLinkStatic({ active }: { active: boolean }) {
  return (
    <Button
      href="/"
      label="Library"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      aria-current={active ? "page" : undefined}
      className="hidden sm:inline-flex"
    />
  );
}

export function LibraryNavLink() {
  return <LibraryNavLinkStatic active={usePathname() === "/"} />;
}
