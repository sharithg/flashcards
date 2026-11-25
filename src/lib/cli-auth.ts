import "server-only";
import { auth } from "@clerk/nextjs/server";

/*
 * The `repaso` CLI authenticates with a Clerk API key created for the user by `repaso login`
 * (see src/app/cli/login). Requests carry it as `Authorization: Bearer <key>`.
 */

export type CliCaller = { userId: string; keyId: string };

/** The user (and key) behind the request's API key, or null when it is missing, revoked or expired. */
export async function cliCaller(): Promise<CliCaller | null> {
  const a = await auth({ acceptsToken: "api_key" });
  if (!a.isAuthenticated || !a.subject.startsWith("user_")) return null;
  return { userId: a.subject, keyId: a.id };
}

export const unauthorized = () =>
  Response.json({ error: "Not logged in or the key was revoked. Run `repaso login`." }, { status: 401 });

/** Wraps a route handler so it only runs for an authenticated CLI caller. */
export function withCliAuth<A extends unknown[]>(
  handler: (caller: CliCaller, req: Request, ...rest: A) => Promise<Response>,
) {
  return async (req: Request, ...rest: A) => {
    const caller = await cliCaller();
    return caller ? handler(caller, req, ...rest) : unauthorized();
  };
}
