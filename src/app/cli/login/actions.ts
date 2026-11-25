"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { callbackUrl, cliLoginRequest } from "./request";

function parse(form: FormData) {
  return cliLoginRequest.parse(Object.fromEntries(form));
}

/** Mints a Clerk API key for the signed-in user and hands it to the waiting CLI. */
export async function authorizeCliAction(form: FormData) {
  const userId = await requireUserId();
  const req = parse(form);
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const key = await (
    await clerkClient()
  ).apiKeys.create({
    name: `repaso CLI · ${req.device} · ${stamp}`,
    description: "Created by `repaso login`",
    subject: userId,
    createdBy: userId,
  });
  if (!key.secret) throw new Error("Clerk did not return the API key secret");
  redirect(callbackUrl(req, { key: key.secret }));
}

export async function denyCliAction(form: FormData) {
  await requireUserId();
  redirect(callbackUrl(parse(form), { error: "denied" }));
}
