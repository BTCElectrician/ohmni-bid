#!/usr/bin/env python3
"""
Price Sync Monitor (Next stack)
Tracks changes to the master Excel file and logs when it's been updated.
Run this periodically (cron) or manually to check if pricing needs re-sync.
"""

import json
import os
import hashlib
from datetime import datetime
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

PROJECT_ROOT = Path(__file__).resolve().parents[2]

if load_dotenv:
    load_dotenv(PROJECT_ROOT / ".env")

DEFAULT_XLSX = PROJECT_ROOT / "legacy" / "data" / "Unit price - Master 11-3-21- JG.xlsx"
EXCEL_PATH = Path(os.getenv("PRICING_XLSX_PATH", str(DEFAULT_XLSX)))
PRICING_JSON_PATH = PROJECT_ROOT / "data" / "pricing_database.json"
SYNC_LOG_PATH = PROJECT_ROOT / "data" / "sync_history.json"


def get_file_hash(filepath: Path) -> str | None:
    """Get MD5 hash of file contents."""
    if not filepath.exists():
        return None
    with filepath.open("rb") as f:
        return hashlib.md5(f.read()).hexdigest()


def get_file_modified_time(filepath: Path) -> str | None:
    """Get file modification time as ISO string."""
    if not filepath.exists():
        return None
    timestamp = filepath.stat().st_mtime
    return datetime.fromtimestamp(timestamp).isoformat()


def load_sync_history() -> dict:
    """Load existing sync history or create new."""
    if SYNC_LOG_PATH.exists():
        return json.loads(SYNC_LOG_PATH.read_text())
    return {
        "created_at": datetime.now().isoformat(),
        "checks": [],
        "last_excel_hash": None,
        "last_sync_at": None,
        "last_seen_excel_hash": None,
        "last_seen_excel_modified": None,
        "last_checked_at": None,
    }


def save_sync_history(history: dict) -> None:
    """Save sync history to JSON."""
    SYNC_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    SYNC_LOG_PATH.write_text(json.dumps(history, indent=2))


def check_sync_status() -> dict:
    """Check if Excel has changed since last sync."""
    history = load_sync_history()

    excel_hash = get_file_hash(EXCEL_PATH)
    excel_modified = get_file_modified_time(EXCEL_PATH)
    json_modified = get_file_modified_time(PRICING_JSON_PATH)
    previous_seen_hash = history.get("last_seen_excel_hash")
    previous_seen_modified = history.get("last_seen_excel_modified")

    check_record = {
        "checked_at": datetime.now().isoformat(),
        "excel_exists": EXCEL_PATH.exists(),
        "excel_hash": excel_hash,
        "excel_modified": excel_modified,
        "json_modified": json_modified,
        "excel_changed": excel_hash != history.get("last_excel_hash"),
        "excel_changed_since_last_check": (
            previous_seen_hash is not None and excel_hash != previous_seen_hash
        ),
        "previous_excel_modified": previous_seen_modified,
        "needs_sync": False,
    }

    if not EXCEL_PATH.exists():
        check_record["needs_sync"] = True
        check_record["message"] = "Excel file missing. Set PRICING_XLSX_PATH."
    elif excel_hash and excel_hash != history.get("last_excel_hash"):
        check_record["needs_sync"] = True
        check_record["message"] = "Excel file has changed! Run npm run pricing:extract."
    elif not PRICING_JSON_PATH.exists():
        check_record["needs_sync"] = True
        check_record["message"] = "pricing_database.json missing! Run npm run pricing:extract."
    else:
        if previous_seen_hash is None:
            check_record["message"] = "Pricing is in sync. Tracking started."
        elif check_record["excel_changed_since_last_check"]:
            check_record["message"] = "Pricing is in sync. Excel updated since last check."
        else:
            check_record["message"] = "Pricing is in sync. No Excel update since last check."

    history["checks"].append(check_record)
    history["checks"] = history["checks"][-100:]
    history["last_seen_excel_hash"] = excel_hash
    history["last_seen_excel_modified"] = excel_modified
    history["last_checked_at"] = check_record["checked_at"]

    save_sync_history(history)
    return check_record


def mark_synced() -> None:
    """Mark current Excel hash as synced (call after running pricing:extract/import)."""
    history = load_sync_history()
    excel_hash = get_file_hash(EXCEL_PATH)

    history["last_excel_hash"] = excel_hash
    history["last_sync_at"] = datetime.now().isoformat()

    save_sync_history(history)
    print(f"Marked as synced at {history['last_sync_at']}")
    print(f"Excel hash: {excel_hash}")


def show_history() -> None:
    """Display sync history."""
    history = load_sync_history()

    print("\n=== PRICE SYNC HISTORY ===\n")
    print(f"Tracking since: {history.get('created_at', 'Unknown')}")
    print(f"Last sync: {history.get('last_sync_at', 'Never')}")
    print(f"Total checks: {len(history.get('checks', []))}")

    changes = [c for c in history.get("checks", []) if c.get("excel_changed")]
    print(f"Times Excel changed: {len(changes)}")

    print("\n--- Recent Checks ---")
    for check in history.get("checks", [])[-10:]:
        status = "NEEDS SYNC" if check.get("needs_sync") else "IN SYNC"
        print(f"{check['checked_at']}: {status}")

    print()


def main() -> None:
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == "--mark-synced":
            mark_synced()
        elif sys.argv[1] == "--history":
            show_history()
        else:
            print("Usage:")
            print("  python scripts/pricing/price_sync_monitor.py          # Check sync status")
            print("  python scripts/pricing/price_sync_monitor.py --mark-synced  # Mark as synced")
            print("  python scripts/pricing/price_sync_monitor.py --history      # Show history")
    else:
        result = check_sync_status()
        print("\n=== PRICE SYNC CHECK ===\n")
        print(f"Excel file: {'Found' if result['excel_exists'] else 'MISSING'}")
        print(f"Excel modified: {result['excel_modified']}")
        print(f"JSON modified: {result['json_modified']}")
        print(
            "Pricing stale (Excel changed since last sync): "
            f"{'YES' if result['excel_changed'] else 'No'}"
        )
        print(
            "PM updated Excel since last check: "
            f"{'YES' if result['excel_changed_since_last_check'] else 'No'}"
        )
        if result.get("previous_excel_modified"):
            print(f"Previous Excel modified: {result['previous_excel_modified']}")
        print(f"\nStatus: {result['message']}")
        print()


if __name__ == "__main__":
    main()
