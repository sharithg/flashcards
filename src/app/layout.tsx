import "./globals.css"; // first: declares the cascade-layer order Astryx relies on

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DataProvider } from "@/components/DataProvider";
import { Header } from "@/components/Header";
import { Spinner } from "@/components/ui";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Recall", template: "%s · Recall" },
  description: "Make flashcards and study them with flashcards, learn, test, and match modes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <ClerkProvider>
          <Providers>
            <Header />
            <main className="flex-1">
              <Suspense fallback={<Spinner />}>
                <DataProvider>{children}</DataProvider>
              </Suspense>
            </main>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
