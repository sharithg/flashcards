import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Spinner } from "@/components/common";
import { Button } from "@/components/ui/button";
import { authorizeCliAction, denyCliAction } from "./actions";
import { cliLoginRequest, type CliLoginRequest } from "./request";

export const metadata: Metadata = { title: "Authorize the CLI" };

/** Opened by `repaso login`. Signed-out visitors are sent through /sign-in first by the proxy. */
export default function CliLoginPage({ searchParams }: PageProps<"/cli/login">) {
  return (
    <Suspense fallback={<Spinner />}>
      {searchParams.then((sp) => {
        const req = cliLoginRequest.safeParse(sp);
        return req.success ? <Authorize req={req.data} /> : <Invalid />;
      })}
    </Suspense>
  );
}

const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded-sm border bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">{children}</code>
);

function Authorize({ req }: { req: CliLoginRequest }) {
  const hidden = (
    <>
      <input type="hidden" name="port" value={req.port} />
      <input type="hidden" name="state" value={req.state} />
      <input type="hidden" name="device" value={req.device} />
    </>
  );
  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <div className="rounded-md border bg-card p-6">
        <h1 className="text-2xl font-bold">Authorize the repaso CLI?</h1>
        <p className="mt-2 text-muted-foreground">
          A terminal on <Code>{req.device}</Code> is asking to read, create and delete your study sets. Only continue if
          you just ran <Code>repaso login</Code>.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          This creates an API key you can revoke any time with <Code>repaso logout</Code>.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <form action={denyCliAction}>
            {hidden}
            <Button type="submit" variant="ghost">
              Cancel
            </Button>
          </form>
          <form action={authorizeCliAction}>
            {hidden}
            <Button type="submit">Authorize</Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Invalid() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Invalid login link</h1>
      <p className="mt-2 text-muted-foreground">
        Run <Code>repaso login</Code> again to get a fresh link.
      </p>
    </div>
  );
}
