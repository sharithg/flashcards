import { connection } from "next/server";
import type { ReactNode } from "react";
import { getLibraryData } from "@/db/queries";
import { StoreProvider } from "@/lib/store";

/** Loads the user's data per request (it lives in Postgres, so it can't be prerendered) and seeds the client store. */
export async function DataProvider({ children }: { children: ReactNode }) {
  await connection();
  const data = await getLibraryData();
  return <StoreProvider initial={data}>{children}</StoreProvider>;
}
