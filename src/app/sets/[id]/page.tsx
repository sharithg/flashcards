import type { Metadata } from "next";
import { Suspense } from "react";
import { SetOverviewScreen } from "@/components/screens";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Study set" };

export default function Page({ params }: PageProps<"/sets/[id]">) {
  return <Suspense fallback={<Spinner />}>{params.then(({ id }) => <SetOverviewScreen id={id} />)}</Suspense>;
}
