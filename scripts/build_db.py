#!/usr/bin/env python3
"""
build_db.py — Reads all CSVs in data/ and loads them into docs/cfps.db

Directory conventions:
  data/P902_Results/      → CSVs go into the "P902_Results" table (append all files)
  data/layouts/           → CSVs go into the "layouts" table (append all files)
  data/P902_SO_Results/   → CSVs go into the "P902_SO_Results" table (append all files)

Run manually:   python scripts/build_db.py
Run in CI:      see .gitlab-ci.yml
"""

import sqlite3
import csv
import os
import glob
import sys
import json
import shutil
from datetime import datetime, timezone

DB_PATH = os.path.join("docs", "cfps.db")
MANIFEST_PATH = os.path.join("docs", "data_manifest.json")
PUBLIC_DATA_DIR = os.path.join("docs", "data")
DATA_DIR = "data"

# Single-file CSVs loaded as their own table (not a folder of CSVs)
SINGLE_FILE_MAP = {
    "experiment_meta.csv": "experiment_meta",
}

# Map subfolder names to table names
TABLE_MAP = {
    "P902_Results": "P902_Results",
    "layouts": "layouts",
    "P902_SO_Results": "P902_SO_Results",
}

# Lot tracker CSVs: each file in data/lots/ becomes its own table
# e.g. data/lots/fermentation.csv → table "lot_fermentation"
LOTS_DIR = os.path.join(DATA_DIR, "lots")


def infer_type(value):
    """Try to cast a string value to int, then float, else keep as text."""
    try:
        return int(value)
    except (ValueError, TypeError):
        pass
    try:
        return float(value)
    except (ValueError, TypeError):
        pass
    return value


def load_csv(filepath):
    """Read a CSV file and return (headers, rows)."""
    with open(filepath, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        headers = [h.strip().lower().replace(" ", "_") for h in next(reader)]
        rows = []
        for row in reader:
            if len(row) != len(headers):
                continue
            rows.append([infer_type(v.strip()) for v in row])
    return headers, rows


def create_table(cursor, table_name, headers, rows):
    """Create table if not exists, insert rows."""
    # Infer column types from first data row
    type_map = {int: "INTEGER", float: "REAL", str: "TEXT"}
    if rows:
        col_types = [type_map.get(type(v), "TEXT") for v in rows[0]]
    else:
        col_types = ["TEXT"] * len(headers)

    cols_def = ", ".join(
        f'"{h}" {t}' for h, t in zip(headers, col_types)
    )

    cursor.execute(f'CREATE TABLE IF NOT EXISTS "{table_name}" ({cols_def})')

    # Check existing columns — if new CSV has columns the table doesn't,
    # add them (handles schema evolution across experiments)
    cursor.execute(f'PRAGMA table_info("{table_name}")')
    existing_cols = {row[1] for row in cursor.fetchall()}
    for h, t in zip(headers, col_types):
        if h not in existing_cols:
            cursor.execute(f'ALTER TABLE "{table_name}" ADD COLUMN "{h}" {t}')

    placeholders = ", ".join("?" * len(headers))
    col_names = ", ".join(f'"{h}"' for h in headers)
    cursor.executemany(
        f'INSERT INTO "{table_name}" ({col_names}) VALUES ({placeholders})',
        rows,
    )


def main():
    os.makedirs("docs", exist_ok=True)

    # Remove old DB so we rebuild fresh each time
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    total_rows = 0

    for subfolder, table_name in TABLE_MAP.items():
        folder_path = os.path.join(DATA_DIR, subfolder)
        if not os.path.isdir(folder_path):
            print(f"  Skipping {folder_path}/ (not found)")
            continue

        csv_files = sorted(glob.glob(os.path.join(folder_path, "*.csv")))
        if not csv_files:
            print(f"  No CSVs in {folder_path}/")
            continue

        for csv_path in csv_files:
            filename = os.path.basename(csv_path)
            headers, rows = load_csv(csv_path)

            # Add a source_file column so you know which CSV each row came from
            headers.append("source_file")
            for row in rows:
                row.append(filename)

            create_table(cursor, table_name, headers, rows)
            total_rows += len(rows)
            print(f"  {table_name} ← {filename} ({len(rows)} rows)")

    conn.commit()

    # ── Single-file CSVs (e.g. experiment_meta.csv) ──────────────────────────
    for csv_name, table_name in SINGLE_FILE_MAP.items():
        csv_path = os.path.join(DATA_DIR, csv_name)
        if not os.path.exists(csv_path):
            print(f"  Skipping {csv_path} (not found)")
            continue
        headers, rows = load_csv(csv_path)
        if rows:
            create_table(cursor, table_name, headers, rows)
            total_rows += len(rows)
            print(f"  {table_name} ← {csv_name} ({len(rows)} rows)")
        else:
            cols_def = ", ".join(f'"{h}" TEXT' for h in headers)
            cursor.execute(f'CREATE TABLE IF NOT EXISTS "{table_name}" ({cols_def})')
            print(f"  {table_name} ← {csv_name} (empty, schema only)")
    conn.commit()

    # ── Lot tracker CSVs ─────────────────────────────────────────────────────
    if os.path.isdir(LOTS_DIR):
        lot_csvs = sorted(glob.glob(os.path.join(LOTS_DIR, "*.csv")))
        for csv_path in lot_csvs:
            filename = os.path.basename(csv_path)
            table_name = "lot_" + os.path.splitext(filename)[0]
            headers, rows = load_csv(csv_path)
            create_table(cursor, table_name, headers, rows)
            total_rows += len(rows)
            print(f"  {table_name} ← {filename} ({len(rows)} rows)")
        conn.commit()
    else:
        print(f"  Skipping {LOTS_DIR}/ (not found)")

    # ── Generate data manifest + stage CSVs for browser-side rebuild ────────
    manifest = {}
    staged = 0
    for subfolder in TABLE_MAP:
        src_dir = os.path.join(DATA_DIR, subfolder)
        dst_dir = os.path.join(PUBLIC_DATA_DIR, subfolder)
        if os.path.isdir(src_dir):
            csv_files = sorted(glob.glob(os.path.join(src_dir, "*.csv")))
            manifest[subfolder] = [os.path.basename(f) for f in csv_files]
            os.makedirs(dst_dir, exist_ok=True)
            for src in csv_files:
                shutil.copy2(src, os.path.join(dst_dir, os.path.basename(src)))
                staged += 1

    if os.path.isdir(LOTS_DIR):
        lot_csvs = sorted(glob.glob(os.path.join(LOTS_DIR, "*.csv")))
        manifest["lots"] = [os.path.basename(f) for f in lot_csvs]
        dst_dir = os.path.join(PUBLIC_DATA_DIR, "lots")
        os.makedirs(dst_dir, exist_ok=True)
        for src in lot_csvs:
            shutil.copy2(src, os.path.join(dst_dir, os.path.basename(src)))
            staged += 1

    with open(MANIFEST_PATH, "w") as mf:
        json.dump(manifest, mf, indent=2)
    print(f"\n  Manifest: {MANIFEST_PATH} ({len(manifest)} folders)")
    print(f"  Staged:   {staged} CSV(s) → {PUBLIC_DATA_DIR}/")

    # Print summary
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    all_tables = [r[0] for r in cursor.fetchall()]
    for table_name in all_tables:
        try:
            cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
            count = cursor.fetchone()[0]
            print(f"  Table '{table_name}': {count} total rows")
        except sqlite3.OperationalError:
            print(f"  Table '{table_name}': not created (no data)")

    conn.close()
    db_size = os.path.getsize(DB_PATH) / 1024
    print(f"\n  Database: {DB_PATH} ({db_size:.0f} KB)")
    print(f"  Total rows inserted: {total_rows}")

    # ── Write db_meta.json so the dashboard can detect when the DB was rebuilt ─
    meta_path = os.path.join("docs", "db_meta.json")
    db_meta = {
        "built_at": datetime.now(timezone.utc).isoformat(),
        "total_rows": total_rows,
    }
    with open(meta_path, "w") as f:
        json.dump(db_meta, f)
    print(f"  Metadata: {meta_path}")


if __name__ == "__main__":
    main()
