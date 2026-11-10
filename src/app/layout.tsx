import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Code_Pro } from "next/font/google";
import { Suspense } from "react";
import { DataProvider } from "@/components/DataProvider";
import { Header } from "@/components/Header";
import { Spinner } from "@/components/common";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceCode = Source_Code_Pro({
  variable: "--font-source-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Recall", template: "%s · Recall" },
  description: "Make flashcards and study them with flashcards, learn, test, and match modes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexSans.variable} ${sourceCode.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <Header />
          <main className="flex-1">
            <Suspense fallback={<Spinner />}>
              <DataProvider>{children}</DataProvider>
            </Suspense>
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}
