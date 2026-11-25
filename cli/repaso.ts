/**
 * repaso — command-line access to your Repaso study sets.
 *
 *   pnpm repaso login                 open the browser to authorize this machine
 *   pnpm repaso whoami
 *   pnpm repaso sets list
 *   pnpm repaso sets show <id>
 *   pnpm repaso sets create <file.json | ->
 *   pnpm repaso sets delete <id> --yes
 *   pnpm repaso logout                revoke this machine's key
 *
 * Global flags: --api <url> (or REPASO_API; default https://repaso.me), --json for machine-readable output.
 * REPASO_TOKEN overrides the stored key. Keys are stored per API origin in ~/.config/repaso/config.json (mode 600).
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir, hostname } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

const DEFAULT_API = "https://repaso.me";
const CONFIG_DIR = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "repaso");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const LOGIN_TIMEOUT_MS = 5 * 60_000;

type HostAuth = { key: string; email: string | null };
type Config = { hosts: Record<string, HostAuth> };
type SetSummary = { id: string; title: string; description: string; cardCount: number; pinned: boolean; updatedAt: string };
type FullSet = Omit<SetSummary, "cardCount"> & {
  createdAt: string;
  cards: { id: string; term: string; definition: string; starred: boolean }[];
};

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    api: { type: "string" },
    json: { type: "boolean", default: false },
    yes: { type: "boolean", short: "y", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

const api = new URL(flags.api || process.env.REPASO_API || DEFAULT_API).origin;

class CliError extends Error {}

// ── config ──────────────────────────────────────────────────────────────────────────────────

async function loadConfig(): Promise<Config> {
  try {
    return JSON.parse(await readFile(CONFIG_FILE, "utf8")) as Config;
  } catch {
    return { hosts: {} };
  }
}

async function saveConfig(config: Config) {
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
}

async function token(): Promise<string> {
  const key = process.env.REPASO_TOKEN || (await loadConfig()).hosts[api]?.key;
  if (!key) throw new CliError(`Not logged in to ${api}. Run \`repaso login${flags.api ? ` --api ${api}` : ""}\`.`);
  return key;
}

// ── http ────────────────────────────────────────────────────────────────────────────────────

async function request<T>(method: string, path: string, body?: unknown, key?: string): Promise<T> {
  const res = await fetch(api + path, {
    method,
    headers: {
      Authorization: `Bearer ${key ?? (await token())}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new CliError(`${method} ${path}: unexpected ${res.status} response from ${api}`);
  }
  if (!res.ok) {
    const err = data as { error?: string; issues?: { path: (string | number)[]; message: string }[] };
    const issues = err.issues?.map((i) => `\n  ${i.path.join(".") || "(root)"}: ${i.message}`).join("") ?? "";
    throw new CliError(`${err.error ?? `HTTP ${res.status}`}${issues}`);
  }
  return data as T;
}

// ── output ──────────────────────────────────────────────────────────────────────────────────

function out(json: unknown, human: () => string) {
  console.log(flags.json ? JSON.stringify(json, null, 2) : human());
}

const day = (iso: string) => iso.slice(0, 10);

// ── commands ────────────────────────────────────────────────────────────────────────────────

async function login() {
  const state = randomBytes(24).toString("base64url");
  const { port, key } = await new Promise<{ port: number; key: Promise<string> }>((resolveServer, rejectServer) => {
    let settle!: { resolve: (k: string) => void; reject: (e: Error) => void };
    const key = new Promise<string>((resolve, reject) => (settle = { resolve, reject }));
    const page = (msg: string) =>
      `<!doctype html><meta charset="utf-8"><title>repaso CLI</title><body style="font:16px system-ui;padding:4rem;text-align:center">${msg}</body>`;

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/callback") return void res.writeHead(404).end();
      if (url.searchParams.get("state") !== state) {
        res.writeHead(400, { "Content-Type": "text/html" }).end(page("This login link doesn't match. Run <code>repaso login</code> again."));
        return;
      }
      const k = url.searchParams.get("key");
      const error = url.searchParams.get("error");
      const reason = error === "denied" || !error ? "Login was cancelled in the browser." : error;
      res
        .writeHead(k ? 200 : 400, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" })
        .end(page(k ? "Logged in. You can close this tab and return to the terminal." : "Login failed. Check the terminal for details."));
      server.close();
      if (k) settle.resolve(k);
      else settle.reject(new CliError(reason));
    });
    const timer = setTimeout(() => {
      server.close();
      settle.reject(new CliError("Timed out waiting for the browser."));
    }, LOGIN_TIMEOUT_MS);
    key.finally(() => clearTimeout(timer)).catch(() => {});
    server.on("error", rejectServer);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (typeof addr === "object" && addr) resolveServer({ port: addr.port, key });
    });
  });

  const authUrl = new URL("/cli/login", api);
  authUrl.search = new URLSearchParams({ port: String(port), state, device: hostname().slice(0, 64) }).toString();
  console.error(`Opening ${authUrl.href}\nIf the browser doesn't open, visit that URL. Waiting for authorization…`);
  openBrowser(authUrl.href);

  const secret = await key;
  const me = await request<{ email: string | null }>("GET", "/api/cli/whoami", undefined, secret);
  const config = await loadConfig();
  const previous = config.hosts[api]?.key;
  config.hosts[api] = { key: secret, email: me.email };
  await saveConfig(config);
  // Replace rather than accumulate keys for this machine.
  if (previous && previous !== secret) await request("DELETE", "/api/cli/whoami", undefined, previous).catch(() => {});
  out({ api, email: me.email }, () => `Logged in to ${api} as ${me.email ?? "your account"}.`);
}

function openBrowser(url: string) {
  const [cmd, args] =
    process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  spawn(cmd, args, { stdio: "ignore", detached: true }).on("error", () => {}).unref();
}

async function logout() {
  const config = await loadConfig();
  const auth = config.hosts[api];
  if (!auth) return out({ api, loggedOut: false }, () => `Not logged in to ${api}.`);
  await request("DELETE", "/api/cli/whoami", undefined, auth.key).catch(() => {
    console.error("Warning: couldn't revoke the key on the server; removing it locally anyway.");
  });
  delete config.hosts[api];
  await saveConfig(config);
  out({ api, loggedOut: true }, () => `Logged out of ${api}.`);
}

async function whoami() {
  const me = await request<{ userId: string; email: string | null; name: string | null }>("GET", "/api/cli/whoami");
  out({ api, ...me }, () => `${me.email ?? me.userId}${me.name ? ` (${me.name})` : ""} on ${api}`);
}

async function setsList() {
  const { sets } = await request<{ sets: SetSummary[] }>("GET", "/api/cli/sets");
  out(sets, () =>
    sets.length
      ? sets.map((s) => `${s.id}  ${s.pinned ? "★ " : ""}${s.title}  (${s.cardCount} cards, updated ${day(s.updatedAt)})`).join("\n")
      : "No sets yet.",
  );
}

async function setsShow(id: string) {
  const set = await request<FullSet>("GET", `/api/cli/sets/${encodeURIComponent(id)}`);
  out(set, () =>
    [
      `${set.title}  (${set.cards.length} cards)`,
      set.description,
      `${api}/sets/${set.id}`,
      "",
      ...set.cards.map((c, i) => `${String(i + 1).padStart(3)}. ${c.term}\n     ${c.definition}`),
    ]
      .filter((l, i) => i !== 1 || l)
      .join("\n"),
  );
}

async function setsCreate(file: string) {
  const raw = file === "-" ? await readStdin() : await readFile(file, "utf8").catch(() => {
    throw new CliError(`Can't read ${file}`);
  });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new CliError(`${file === "-" ? "stdin" : file} is not valid JSON`);
  }
  const res = await request<{ id: string; url: string; cards: number }>("POST", "/api/cli/sets", body);
  out(res, () => `Created set with ${res.cards} cards: ${res.url}`);
}

async function setsDelete(id: string) {
  if (!flags.yes) throw new CliError("Deleting a set can't be undone. Re-run with --yes to confirm.");
  await request("DELETE", `/api/cli/sets/${encodeURIComponent(id)}`);
  out({ id, deleted: true }, () => `Deleted set ${id}.`);
}

async function readStdin() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

const HELP = `Usage: repaso <command> [--api <url>] [--json]

  login                     authorize this machine in the browser
  logout                    revoke and forget this machine's key
  whoami                    show the logged-in account
  sets list                 list your sets
  sets show <id>            print a set and its cards
  sets create <file|->      create a set from JSON: {"title","description","cards":[{"term","definition"}]}
  sets delete <id> --yes    delete a set

API: ${api}`;

function need(arg: string | undefined, what: string): string {
  if (!arg) throw new CliError(`Missing ${what}.\n\n${HELP}`);
  return arg;
}

async function main() {
  const [cmd, sub, arg] = positionals;
  if (flags.help || !cmd) return console.log(HELP);
  if (cmd === "login") return login();
  if (cmd === "logout") return logout();
  if (cmd === "whoami") return whoami();
  if (cmd === "sets") {
    if (sub === "list" || sub === "ls") return setsList();
    if (sub === "show") return setsShow(need(arg, "set id"));
    if (sub === "create") return setsCreate(need(arg, "JSON file (or - for stdin)"));
    if (sub === "delete" || sub === "rm") return setsDelete(need(arg, "set id"));
  }
  throw new CliError(`Unknown command: ${positionals.join(" ")}\n\n${HELP}`);
}

main().catch((err: unknown) => {
  if (err instanceof CliError) console.error(`Error: ${err.message}`);
  else if (err instanceof TypeError && "cause" in err) console.error(`Error: couldn't reach ${api} (${String((err.cause as Error)?.message ?? err.cause)})`);
  else console.error(err);
  process.exit(1);
});
