import type { Metadata } from "next";
import { Suspense } from "react";
import { TestScreen } from "@/components/screens";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Test" };

export default function Page({ params }: PageProps<"/sets/[id]/test">) {
  return <Suspense fallback={<Spinner />}>{params.then(({ id }) => <TestScreen id={id} />)}</Suspense>;
}
