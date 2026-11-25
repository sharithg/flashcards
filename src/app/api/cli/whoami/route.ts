import { clerkClient } from "@clerk/nextjs/server";
import { withCliAuth } from "@/lib/cli-auth";

/** Who the CLI is logged in as. */
export const GET = withCliAuth(async ({ userId }) => {
  const user = await (await clerkClient()).users.getUser(userId);
  return Response.json({
    userId,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    name: user.fullName ?? user.username ?? null,
  });
});

/** `repaso logout`: revokes the key this request was made with. */
export const DELETE = withCliAuth(async ({ keyId }) => {
  await (await clerkClient()).apiKeys.revoke({ apiKeyId: keyId, revocationReason: "repaso logout" });
  return new Response(null, { status: 204 });
});
