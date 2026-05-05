#!/usr/bin/env python3
"""
gen_manifest.py — Scans data/ and stages CSVs for the browser-side rebuild.

  1. Writes  public/data_manifest.json   (file list for the Rebuild button)
  2. Copies  data/…/*.csv → public/data/…/  (so the browser can fetch them)

This is the lightweight companion to build_db.py.  Run it after adding
new CSVs (e.g. from the AbsQuant analyzer) so the browser-side
"Rebuild cfps.db" button can discover and load them without a full
pipeline run.

    python scripts/gen_manifest.py
"""

import json
import os
import glob
import shutil

DATA_DIR = "data"
PUBLIC_DATA_DIR = os.path.join("public", "data")
MANIFEST_PATH = os.path.join("public", "data_manifest.json")

# Same folder→table map used by build_db.py
TABLE_FOLDERS = ["P902_Results", "layouts", "P902_SO_Results"]
LOTS_DIR = os.path.join(DATA_DIR, "lots")


def main():
    manifest = {}
    copied = 0

    for subfolder in TABLE_FOLDERS:
        src_dir = os.path.join(DATA_DIR, subfolder)
        dst_dir = os.path.join(PUBLIC_DATA_DIR, subfolder)
        if not os.path.isdir(src_dir):
            continue

        csv_files = sorted(glob.glob(os.path.join(src_dir, "*.csv")))
        manifest[subfolder] = [os.path.basename(f) for f in csv_files]

        # Copy CSVs into public/data/<subfolder>/
        os.makedirs(dst_dir, exist_ok=True)
        for src in csv_files:
            dst = os.path.join(dst_dir, os.path.basename(src))
            shutil.copy2(src, dst)
            copied += 1

        print(f"  {subfolder}/: {len(csv_files)} CSV(s)")

    if os.path.isdir(LOTS_DIR):
        lot_csvs = sorted(glob.glob(os.path.join(LOTS_DIR, "*.csv")))
        manifest["lots"] = [os.path.basename(f) for f in lot_csvs]
        dst_dir = os.path.join(PUBLIC_DATA_DIR, "lots")
        os.makedirs(dst_dir, exist_ok=True)
        for src in lot_csvs:
            dst = os.path.join(dst_dir, os.path.basename(src))
            shutil.copy2(src, dst)
            copied += 1
        print(f"  lots/: {len(lot_csvs)} CSV(s)")

    os.makedirs(os.path.dirname(MANIFEST_PATH), exist_ok=True)
    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n  Manifest: {MANIFEST_PATH}")
    print(f"  Staged:   {copied} CSV(s) → {PUBLIC_DATA_DIR}/")
    total = sum(len(v) for v in manifest.values())
    print(f"  Total:    {total} CSV(s) across {len(manifest)} folder(s)")


if __name__ == "__main__":
    main()
