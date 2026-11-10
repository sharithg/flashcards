import type { Metadata } from "next";
import { Suspense } from "react";
import { MatchScreen } from "@/components/screens";
import { Spinner } from "@/components/common";

export const metadata: Metadata = { title: "Match" };

export default function Page({ params }: PageProps<"/sets/[id]/match">) {
  return <Suspense fallback={<Spinner />}>{params.then(({ id }) => <MatchScreen id={id} />)}</Suspense>;
}
