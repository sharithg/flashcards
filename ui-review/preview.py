"""Temporary fixture preview. Run apply before local dev, restore after stopping it."""
import json
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
backup = root / 'ui-review/.preview-backup'
paths = ['src/proxy.ts', 'src/components/DataProvider.tsx', 'src/components/Header.tsx', 'src/lib/store.ts']

if sys.argv[1] == 'restore':
    originals = json.loads((backup / 'originals.json').read_text())
    for name, source in originals.items():
        (root / name).write_text(source)
    (backup / 'originals.json').unlink()
    backup.rmdir()
    print('Original source restored.')
elif sys.argv[1] == 'apply':
    if backup.exists():
        raise SystemExit('Preview backup already exists. Restore first.')
    originals = {name: (root / name).read_text() for name in paths}
    changes = dict(originals)
    changes[paths[0]] = 'import { NextResponse } from "next/server";\nexport default function proxy() { return NextResponse.next(); }\n'
    changes[paths[1]] = '''import { StoreProvider } from "@/lib/store";
import { SEED_SETS } from "@/lib/seed";
import type { ReactNode } from "react";
export function DataProvider({ children }: { children: ReactNode }) {
  return <StoreProvider initial={{ sets: SEED_SETS, studyDays: [] }}>{children}</StoreProvider>;
}
'''
    h = changes[paths[2]]
    h = h.replace('<Show when="signed-in">', '<>').replace('</Show>', '</>')
    h = re.sub(r'<Show when="signed-out">.*?</>', '', h, flags=re.S)
    h = h.replace('<UserButton />', '')
    h = h.replace('import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";\n', '')
    h = h.replace('{ Button, ButtonLink, Icon }', '{ ButtonLink, Icon }')
    changes[paths[2]] = h
    s = changes[paths[3]]
    s = s.replace('persist()\n', 'Promise.resolve()\n')
    s = s.replace('async function resync() {', 'async function resync() {\n  return;')
    changes[paths[3]] = s
    backup.mkdir()
    (backup / 'originals.json').write_text(json.dumps(originals))
    for name, source in changes.items():
        (root / name).write_text(source)
    print('Fixture preview applied. Restore before committing or deploying.')
else:
    raise SystemExit('Usage: preview.py apply|restore')
