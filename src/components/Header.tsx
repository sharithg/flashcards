import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { LibraryNavLink, LibraryNavLinkStatic } from "./LibraryNavLink";
import { ButtonLink, Icon } from "./common";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="-ml-1.5 flex items-center gap-2 rounded-md px-1.5 py-1 text-[17px] font-bold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          <span className="grid size-7 place-items-center rounded-md border-[1.5px] border-primary-edge bg-primary text-primary-foreground shadow-[0_2px_0_0_var(--primary-base)]">
            <Icon name="cards" className="size-4" />
          </span>
          Recall
        </Link>
        <nav className="flex items-center gap-1.5">
          {/* Auth state is request data, so the nav streams in after the static shell. */}
          <Suspense>
            <Show when="signed-in">
              {/* The active state depends on the URL, so it streams in too. */}
              <Suspense fallback={<LibraryNavLinkStatic active={false} />}>
                <LibraryNavLink />
              </Suspense>
              <ButtonLink href="/create" size="sm" className="mr-1.5">
                <Icon name="plus" className="size-4" />
                Create
              </ButtonLink>
              <UserButton />
            </Show>
            <Show when="signed-out">
              <SignInButton>
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton>
                <Button size="sm">Get started</Button>
              </SignUpButton>
            </Show>
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
