import type { Metadata } from "next";
import { Suspense } from "react";
import { LearnScreen } from "@/components/screens";
import { Spinner } from "@/components/common";

export const metadata: Metadata = { title: "Learn" };

export default function Page({ params }: PageProps<"/sets/[id]/learn">) {
  return <Suspense fallback={<Spinner />}>{params.then(({ id }) => <LearnScreen id={id} />)}</Suspense>;
}
