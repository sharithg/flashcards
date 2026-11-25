#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["youtube-transcript-api>=1.2"]
# ///
"""
Print the transcript of one or more YouTube videos as plain text (or JSON).

Usage:
  uv run scripts/yt-transcript.py <url-or-id> [<url-or-id> ...] [--lang en,es] [--json] [--timestamps]

Accepts watch, youtu.be, shorts, embed and live URLs, or bare 11-character video ids.
Prefers a manually created transcript in the requested languages, then an auto-generated one,
and finally any available transcript translated to the first requested language.
"""
import argparse
import json
import re
import sys
import urllib.parse
import urllib.request

from youtube_transcript_api import YouTubeTranscriptApi, YouTubeTranscriptApiException

ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def video_id(arg: str) -> str:
    arg = arg.strip()
    if ID_RE.match(arg):
        return arg
    url = urllib.parse.urlparse(arg if "://" in arg else "https://" + arg)
    host = (url.hostname or "").removeprefix("www.").removeprefix("m.")
    if host == "youtu.be":
        candidate = url.path.lstrip("/").split("/")[0]
    elif host.endswith("youtube.com") or host.endswith("youtube-nocookie.com"):
        query = urllib.parse.parse_qs(url.query)
        if "v" in query:
            candidate = query["v"][0]
        else:
            parts = [p for p in url.path.split("/") if p]
            candidate = parts[1] if len(parts) >= 2 and parts[0] in ("shorts", "embed", "live", "v") else ""
    else:
        candidate = ""
    if not ID_RE.match(candidate):
        raise ValueError(f"Not a YouTube video URL or id: {arg}")
    return candidate


def video_title(vid: str) -> str | None:
    """Best-effort title lookup through YouTube's public oEmbed endpoint."""
    url = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(f"https://www.youtube.com/watch?v={vid}")
    try:
        with urllib.request.urlopen(url, timeout=10) as res:
            return json.load(res).get("title")
    except Exception:
        return None


def fetch(api: YouTubeTranscriptApi, vid: str, langs: list[str]):
    transcripts = api.list(vid)
    for finder in (transcripts.find_manually_created_transcript, transcripts.find_generated_transcript):
        try:
            return finder(langs).fetch()
        except YouTubeTranscriptApiException:
            pass
    # Nothing in the requested languages: translate whatever exists.
    for t in transcripts:
        if t.is_translatable:
            return t.translate(langs[0]).fetch()
        return t.fetch()
    raise RuntimeError("no transcripts available")


def stamp(seconds: float) -> str:
    s = int(seconds)
    return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}" if s >= 3600 else f"{s // 60}:{s % 60:02d}"


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("videos", nargs="+", help="YouTube URLs or video ids")
    p.add_argument("--lang", default="en", help="comma-separated language preference (default: en)")
    p.add_argument("--json", action="store_true", help="emit a JSON array instead of text")
    p.add_argument("--timestamps", action="store_true", help="prefix each text line with [m:ss]")
    args = p.parse_args()

    langs = [l.strip() for l in args.lang.split(",") if l.strip()]
    api = YouTubeTranscriptApi()
    results, failed = [], 0

    for arg in args.videos:
        try:
            vid = video_id(arg)
            fetched = fetch(api, vid, langs)
        except Exception as e:  # keep going for the other videos
            print(f"error: {arg}: {e}", file=sys.stderr)
            failed += 1
            continue
        snippets = [s for s in fetched.snippets if s.text.strip()]
        results.append(
            {
                "id": vid,
                "url": f"https://www.youtube.com/watch?v={vid}",
                "title": video_title(vid),
                "language": fetched.language_code,
                "generated": fetched.is_generated,
                "snippets": [{"start": round(s.start, 2), "text": s.text} for s in snippets],
                "text": " ".join(s.text.replace("\n", " ") for s in snippets),
            }
        )

    if args.json:
        if not args.timestamps:
            for r in results:
                del r["snippets"]
        json.dump(results, sys.stdout, ensure_ascii=False, indent=2)
        print()
    else:
        for r in results:
            kind = "auto-generated" if r["generated"] else "manual"
            print(f"# {r['title'] or r['id']}\n{r['url']} ({r['language']}, {kind})\n")
            if args.timestamps:
                print("\n".join(f"[{stamp(s['start'])}] {s['text']}" for s in r["snippets"]))
            else:
                print(r["text"])
            print()

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
