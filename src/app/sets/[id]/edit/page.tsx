import type { Metadata } from "next";
import { Suspense } from "react";
import { EditSetScreen } from "@/components/screens";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Edit set" };

export default function Page({ params }: PageProps<"/sets/[id]/edit">) {
  return <Suspense fallback={<Spinner />}>{params.then(({ id }) => <EditSetScreen id={id} />)}</Suspense>;
}
