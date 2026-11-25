"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
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
  let result: Record<string, string>;
  try {
    const key = await (
      await clerkClient()
    ).apiKeys.create({
      name: `repaso CLI · ${req.device} · ${stamp}`,
      description: "Created by `repaso login`",
      subject: userId,
      createdBy: userId,
    });
    result = key.secret ? { key: key.secret } : { error: "Clerk did not return the API key secret" };
  } catch (err) {
    // Most often: API keys aren't enabled for this Clerk instance. Report it in the terminal, not a 500 page.
    console.error("repaso CLI: creating API key failed", err);
    result = { error: `Couldn't create an API key: ${clerkMessage(err)}` };
  }
  redirect(callbackUrl(req, result));
}

function clerkMessage(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    const e = err.errors[0];
    return [e?.longMessage ?? e?.message ?? err.message, e?.code && `(${e.code})`].filter(Boolean).join(" ");
  }
  return err instanceof Error ? err.message : String(err);
}

export async function denyCliAction(form: FormData) {
  await requireUserId();
  redirect(callbackUrl(parse(form), { error: "denied" }));
}
