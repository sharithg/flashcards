import { deleteSet, getSet } from "@/db/cli";
import { withCliAuth } from "@/lib/cli-auth";

type Ctx = RouteContext<"/api/cli/sets/[id]">;
const notFound = () => Response.json({ error: "Set not found" }, { status: 404 });

export const GET = withCliAuth(async ({ userId }, _req, { params }: Ctx) => {
  const set = await getSet(userId, (await params).id);
  return set ? Response.json(set) : notFound();
});

export const DELETE = withCliAuth(async ({ userId }, _req, { params }: Ctx) =>
  (await deleteSet(userId, (await params).id)) ? new Response(null, { status: 204 }) : notFound(),
);
