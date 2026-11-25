import { createSet, listSets, newSetInput } from "@/db/cli";
import { withCliAuth } from "@/lib/cli-auth";

export const GET = withCliAuth(async ({ userId }) => Response.json({ sets: await listSets(userId) }));

export const POST = withCliAuth(async ({ userId }, req) => {
  const body = await req.json().catch(() => undefined);
  const parsed = newSetInput.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid set", issues: parsed.error.issues }, { status: 400 });
  const id = await createSet(userId, parsed.data);
  return Response.json(
    { id, url: new URL(`/sets/${id}`, req.url).href, cards: parsed.data.cards.length },
    { status: 201 },
  );
});
