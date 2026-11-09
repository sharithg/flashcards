import Link from "next/link";
import { Suspense } from "react";
import { LibraryNavLink, LibraryNavLinkStatic } from "./LibraryNavLink";
import { ButtonLink, Icon } from "./ui";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="-ml-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-lg font-bold tracking-tight outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-ink">
            <Icon name="cards" className="size-5" />
          </span>
          Recall
        </Link>
        <nav className="flex items-center gap-2">
          {/* The active state depends on the URL, so it streams in after the static shell. */}
          <Suspense fallback={<LibraryNavLinkStatic active={false} />}>
            <LibraryNavLink />
          </Suspense>
          <ButtonLink href="/create" size="sm">
            <Icon name="plus" className="size-4" />
            Create
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
