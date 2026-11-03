#!/usr/bin/env python3
"""Download and verify the official Prithvi-EO 2.0 300M-TL checkpoint."""

from __future__ import annotations

import argparse
import hashlib
import os
import sys
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
MODEL_ID = "ibm-nasa-geospatial/Prithvi-EO-2.0-300M-TL"
CHECKPOINT_NAME = "Prithvi_EO_V2_300M_TL.pt"
SOURCE_URL = f"https://huggingface.co/{MODEL_ID}/resolve/main/{CHECKPOINT_NAME}?download=true"
DEFAULT_DESTINATION = ROOT_DIR / "models" / "prithvi" / CHECKPOINT_NAME
SUPPORT_FILES = {
    "config.json": f"https://huggingface.co/{MODEL_ID}/resolve/main/config.json?download=true",
    "official_prithvi_mae.py": f"https://huggingface.co/{MODEL_ID}/resolve/main/prithvi_mae.py?download=true",
}


def download(destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".part")
    downloaded = temporary.stat().st_size if temporary.exists() else 0
    headers = {"User-Agent": "kili-vault-prithvi-setup/1.0"}
    if downloaded:
        headers["Range"] = f"bytes={downloaded}-"
    request = urllib.request.Request(SOURCE_URL, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            is_partial = response.status == 206 and downloaded > 0
            if not is_partial:
                downloaded = 0
            mode = "ab" if is_partial else "wb"
            with temporary.open(mode) as output:
                total = int(response.headers.get("Content-Length", "0")) + downloaded
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    output.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        print(
                            f"\rDownloaded {downloaded / 1024**2:.1f}/{total / 1024**2:.1f} MB", end="", flush=True)
        print()
        temporary.replace(destination)
    except Exception as exc:
        print(f"\nDownload interrupted; partial file preserved at {temporary}: {exc}", file=sys.stderr)
        raise


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download official Prithvi-EO 2.0 300M-TL weights")
    parser.add_argument("--destination", type=Path,
                        default=DEFAULT_DESTINATION)
    parser.add_argument(
        "--sha256", help="Expected SHA-256 digest, if supplied by the official release")
    args = parser.parse_args()

    destination = args.destination if args.destination.is_absolute() else ROOT_DIR / \
        args.destination
    print("=" * 50)
    print("PRITHVI WEIGHTS SETUP")
    print("=" * 50)
    print(f"Model: {MODEL_ID}")
    print(f"Source: {SOURCE_URL}")
    print(f"Destination: {destination}")

    try:
        if destination.exists() and destination.stat().st_size > 0:
            print("Checkpoint already exists; validating it without overwriting.")
        else:
            print("Downloading official checkpoint...")
            download(destination)
    except Exception as exc:
        print(f"Download failed: {exc}", file=sys.stderr)
        return 1

    size = destination.stat().st_size if destination.exists() else 0
    if size <= 0:
        print("Checkpoint verification failed: file is empty or missing",
              file=sys.stderr)
        return 1

    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    if args.sha256 and digest.lower() != args.sha256.lower():
        print(
            f"Checksum mismatch: expected {args.sha256}, got {digest}", file=sys.stderr)
        return 1

    print(f"File exists: YES")
    print(f"File size: {size / 1024**3:.2f} GB")
    print(f"SHA-256: {digest}")
    for filename, url in SUPPORT_FILES.items():
        support_path = destination.parent / filename
        if not support_path.exists() or support_path.stat().st_size == 0:
            print(f"Downloading official support file: {filename}")
            request = urllib.request.Request(
                url, headers={"User-Agent": "kili-vault-prithvi-setup/1.0"})
            with urllib.request.urlopen(request) as response, support_path.open("wb") as output:
                output.write(response.read())
        if support_path.stat().st_size == 0:
            print(
                f"Support file verification failed: {filename}", file=sys.stderr)
            return 1
        print(f"Support file verified: {filename}")
    print("Checkpoint download verification: PASS")
    print("Use `python scripts/check_prithvi.py` for architecture and CPU forward validation.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
