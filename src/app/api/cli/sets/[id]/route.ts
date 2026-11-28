import { deleteSet, getSet, setPatchInput, updateSet } from "@/db/cli";
import { withCliAuth } from "@/lib/cli-auth";

type Ctx = RouteContext<"/api/cli/sets/[id]">;
const notFound = () => Response.json({ error: "Set not found" }, { status: 404 });

export const GET = withCliAuth(async ({ userId }, _req, { params }: Ctx) => {
  const set = await getSet(userId, (await params).id);
  return set ? Response.json(set) : notFound();
});

export const PATCH = withCliAuth(async ({ userId }, req, { params }: Ctx) => {
  const id = (await params).id;
  const body = await req.json().catch(() => undefined);
  const parsed = setPatchInput.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid update", issues: parsed.error.issues }, { status: 400 });
  if (!(await updateSet(userId, id, parsed.data))) return notFound();
  return Response.json(await getSet(userId, id));
});

export const DELETE = withCliAuth(async ({ userId }, _req, { params }: Ctx) =>
  (await deleteSet(userId, (await params).id)) ? new Response(null, { status: 204 }) : notFound(),
);
