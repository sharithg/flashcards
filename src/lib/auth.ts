import "server-only";
import { auth } from "@clerk/nextjs/server";

/**
 * The signed-in Clerk user's id. The proxy already sends signed-out visitors to /sign-in, but every
 * data access checks again so a misconfigured matcher can never expose another user's data.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  return userId;
}
