import type { Metadata } from "next";
import { Suspense } from "react";
import { FlashcardsScreen } from "@/components/screens";
import { Spinner } from "@/components/common";

export const metadata: Metadata = { title: "Flashcards" };

export default function Page({ params }: PageProps<"/sets/[id]/flashcards">) {
  return <Suspense fallback={<Spinner />}>{params.then(({ id }) => <FlashcardsScreen id={id} />)}</Suspense>;
}
