import { connection } from "next/server";
import { getLibraryData } from "@/db/queries";

/** Fresh snapshot for the client store (used to resync after a failed write or when the tab regains focus). */
export async function GET() {
  await connection();
  return Response.json(await getLibraryData(), { headers: { "Cache-Control": "no-store" } });
}
