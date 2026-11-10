import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@astryxdesign/core/Button";
import { LibraryNavLink, LibraryNavLinkStatic } from "./LibraryNavLink";
import { Icon } from "./ui";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="-ml-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 font-heading text-lg font-bold tracking-tight text-primary outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="grid size-8 place-items-center rounded-md bg-accent-bg text-on-accent">
            <Icon name="cards" className="size-5" />
          </span>
          Recall
        </Link>
        <nav className="flex items-center gap-2">
          {/* Auth state is request data, so the nav streams in after the static shell. */}
          <Suspense>
            <Show when="signed-in">
              {/* The active state depends on the URL, so it streams in too. */}
              <Suspense fallback={<LibraryNavLinkStatic active={false} />}>
                <LibraryNavLink />
              </Suspense>
              <Button href="/create" variant="primary" size="sm" label="Create" icon={<Icon name="plus" className="size-4" />} />
              <UserButton />
            </Show>
            <Show when="signed-out">
              <SignInButton>
                <Button variant="ghost" size="sm" label="Sign in" />
              </SignInButton>
              <SignUpButton>
                <Button variant="secondary" size="sm" label="Sign up" />
              </SignUpButton>
            </Show>
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
