import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { getLibraryData } from "@/db/queries";

/** Fresh snapshot for the client store (used to resync after a failed write or when the tab regains focus). */
export async function GET() {
  await connection();
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });
  return Response.json(await getLibraryData(userId), { headers: { "Cache-Control": "no-store" } });
}
