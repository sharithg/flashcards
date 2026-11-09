import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { DataProvider } from "@/components/DataProvider";
import { Header } from "@/components/Header";
import { Spinner } from "@/components/ui";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Recall", template: "%s · Recall" },
  description: "Make flashcards and study them with flashcards, learn, test, and match modes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <ClerkProvider>
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
