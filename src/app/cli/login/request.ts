import { z } from "zod";

/** What `repaso login` puts in the authorize URL: where its loopback server listens and a nonce it checks. */
export const cliLoginRequest = z.object({
  port: z.coerce.number().int().min(1024).max(65535),
  state: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
  device: z
    .string()
    .trim()
    .max(64)
    .transform((d) => d.replace(/[^\w .-]/g, "") || "unknown device")
    .catch("unknown device"),
});

export type CliLoginRequest = z.output<typeof cliLoginRequest>;

/** The CLI's loopback callback. Only 127.0.0.1 is ever targeted, so a key can't be sent anywhere else. */
export function callbackUrl(req: CliLoginRequest, params: Record<string, string>) {
  const url = new URL(`http://127.0.0.1:${req.port}/callback`);
  url.searchParams.set("state", req.state);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.href;
}
