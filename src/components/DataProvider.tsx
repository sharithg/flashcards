import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { getLibraryData } from "@/db/queries";
import { StoreProvider } from "@/lib/store";

/**
 * Loads the signed-in user's data per request (it lives in Postgres, so it can't be prerendered) and
 * seeds the client store. Signed-out visitors only ever reach the sign-in/sign-up pages, which need no data.
 */
export async function DataProvider({ children }: { children: ReactNode }) {
  await connection();
  const { userId } = await auth();
  if (!userId) return children;
  const data = await getLibraryData(userId);
  // Keyed by user so switching accounts in the same tab starts from a fresh store.
  return (
    <StoreProvider key={userId} initial={data}>
      {children}
    </StoreProvider>
  );
}
