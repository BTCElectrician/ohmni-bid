#!/usr/bin/env python3
import runpy
import sys
from pathlib import Path


def main() -> None:
    legacy_script = (
        Path(__file__).resolve().parent.parent
        / "scripts"
        / "pricing"
        / "price_sync_email.py"
    )
    if not legacy_script.exists():
        print(f"Script not found: {legacy_script}")
        sys.exit(1)
    runpy.run_path(str(legacy_script), run_name="__main__")


if __name__ == "__main__":
    main()
