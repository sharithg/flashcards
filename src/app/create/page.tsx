import type { Metadata } from "next";
import { Suspense } from "react";
import { SetEditor } from "@/components/SetEditor";

export const metadata: Metadata = { title: "Create a set" };

export default function CreatePage({ searchParams }: PageProps<"/create">) {
  return (
    <Suspense fallback={<SetEditor />}>
      {searchParams.then((sp) => (
        <SetEditor startWithImport={"import" in sp} />
      ))}
    </Suspense>
  );
}
