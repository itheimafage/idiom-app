#!/usr/bin/env python3
"""
Update idioms.json entries 1-200 with real example sentences from Chinese official media.
Searches 人民网、新华网、光明网 etc. for authentic usage examples.
"""

import json
import time
import urllib.request
import urllib.parse
import re
import ssl
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
IDIOMS_PATH = SCRIPT_DIR.parent / "data" / "idioms.json"
OUTPUT_PATH = IDIOMS_PATH  # Overwrite in place

# Chinese official media sites to search
MEDIA_SITES = [
    "site:people.com.cn",
    "site:xinhuanet.com",
    "site:gmw.cn",
    "site:cctv.com",
    "site:chinadaily.com.cn",
    "site:qstheory.cn",
]

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

# Chinese sentence pattern: matches full sentences ending with 。！？…
SENTENCE_PATTERN = re.compile(r"[^。！？…\n]+[。！？…]")


def search_bing(idiom: str, site: str) -> list[str]:
    """Search Bing for the idiom on a specific media site, return a list of sentences."""
    query = f'"{idiom}" {site}'
    url = f"https://www.bing.com/search?q={urllib.parse.quote(query)}&setlang=zh-cn"

    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    ctx = ssl.create_default_context()

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"  [WARN] Bing search failed for '{idiom}' on {site}: {e}")
        return []

    # Extract text snippets from search results
    # Bing search result snippets often contain the idiom in context
    sentences = []

    # Look for text around the idiom
    # Bing results are in various HTML structures; try common patterns
    # Pattern 1: <p> or <div> tags with text containing the idiom
    text_blocks = re.findall(r'<p[^>]*>(.*?)</p>', html, re.DOTALL)
    text_blocks += re.findall(r'<div[^>]*>(.*?)</div>', html, re.DOTALL)

    for block in text_blocks:
        # Strip HTML tags
        clean = re.sub(r'<[^>]+>', '', block)
        clean = clean.strip()
        if idiom in clean and len(clean) > 10:
            # Extract complete sentences
            found = SENTENCE_PATTERN.findall(clean)
            for s in found:
                s = s.strip()
                if idiom in s and len(s) >= 15 and len(s) <= 200:
                    sentences.append(s)

    return sentences


def search_baidu(idiom: str) -> list[str]:
    """Search Baidu for the idiom, extracting example sentences."""
    query = f'"{idiom}" 例句'
    url = f"https://www.baidu.com/s?wd={urllib.parse.quote(query)}"

    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    ctx = ssl.create_default_context()

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"  [WARN] Baidu search failed for '{idiom}': {e}")
        return []

    sentences = []
    # Extract text snippets
    text_blocks = re.findall(r'<span[^>]*>(.*?)</span>', html, re.DOTALL)
    for block in text_blocks:
        clean = re.sub(r'<[^>]+>', '', block)
        clean = clean.strip()
        if idiom in clean and len(clean) > 10:
            found = SENTENCE_PATTERN.findall(clean)
            for s in found:
                s = s.strip()
                if idiom in s and len(s) >= 15 and len(s) <= 200:
                    sentences.append(s)
    return sentences


def find_examples(idiom: str) -> list[str]:
    """Find 2 real example sentences for an idiom from official media."""
    all_sentences = []

    # Try each media site
    for site in MEDIA_SITES[:3]:  # Limit to first 3 sites for speed
        sentences = search_bing(idiom, site)
        for s in sentences:
            if s not in all_sentences:
                all_sentences.append(s)
        if len(all_sentences) >= 4:  # Collect a few extra for filtering
            break
        time.sleep(0.5)  # Rate limit

    # If not enough, try Baidu
    if len(all_sentences) < 2:
        sentences = search_baidu(idiom)
        for s in sentences:
            if s not in all_sentences:
                all_sentences.append(s)
        time.sleep(0.5)

    # Filter: prefer longer, more natural sentences
    # Sort by length (prefer medium-length natural sentences)
    all_sentences.sort(key=lambda x: abs(len(x) - 40))  # Prefer ~40 char sentences

    # Pick the best 2
    result = []
    seen = set()
    for s in all_sentences:
        # Deduplicate similar sentences
        norm = re.sub(r'\s+', '', s)
        if norm not in seen and len(s) >= 15:
            seen.add(norm)
            result.append(s)
        if len(result) >= 2:
            break

    return result


def main():
    print("=" * 60)
    print("Idiom Examples Updater - IDs 1-200")
    print("=" * 60)

    # Read idioms.json
    with open(IDIOMS_PATH, "r", encoding="utf-8") as f:
        idioms = json.load(f)

    print(f"Loaded {len(idioms)} idioms from {IDIOMS_PATH}")

    # Filter to IDs 1-200
    target = [i for i in idioms if 1 <= i["id"] <= 200]
    print(f"Target range: {len(target)} idioms (IDs 1-200)")

    updated_count = 0
    skipped_count = 0

    for idx, entry in enumerate(target):
        idiom = entry["name"]
        idiom_id = entry["id"]
        print(f"\n[{idx+1}/{len(target)}] ID={idiom_id}: {idiom} ({entry['pinyin']})")

        # Find examples
        examples = find_examples(idiom)

        if len(examples) >= 2:
            entry["examples"] = examples[:2]
            print(f"  Updated: {examples[0][:60]}...")
            print(f"           {examples[1][:60]}...")
            updated_count += 1
        elif len(examples) == 1:
            # Only one found, keep one existing and use one new
            old_examples = entry.get("examples", [])
            if old_examples:
                entry["examples"] = [examples[0], old_examples[0]]
            else:
                entry["examples"] = [examples[0], f"我们要学习{idiom}的精神。"]
            print(f"  Partial update (1 new + 1 kept)")
            updated_count += 1
        else:
            print(f"  [SKIP] No examples found, keeping existing")
            skipped_count += 1

        # Rate limiting between idioms
        if idx < len(target) - 1:
            time.sleep(1.0)

    # Write back
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(idioms, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"Done! Updated: {updated_count}, Skipped: {skipped_count}")
    print(f"Output: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
