#!/usr/bin/env python3
"""
Lint public text for banned accusatory language.

This is a safety net to catch problematic language before publication.
"""

import json
import sys
import re
from pathlib import Path
from typing import List, Tuple


# Banned words/phrases (case-insensitive)
BANNED_TERMS = [
    r'\bfraud\b',
    r'\bkickback\b',
    r'\billegal\b',
    r'\bcorrupt\b',
    r'\bcorruption\b',
    r'\bstole\b',
    r'\bstolen\b',
    r'\bembezzl\w*\b',
    r'\bbrib\w*\b',
    r'\bscam\b',
    r'\bscamm\w*\b'
]


def check_text(text: str, context: str) -> List[Tuple[str, str]]:
    """
    Check text for banned terms.
    
    Returns list of (term, context) tuples for violations.
    """
    violations = []
    
    for pattern in BANNED_TERMS:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            violations.append((match.group(), context))
    
    return violations


def lint_json_file(file_path: Path) -> List[Tuple[str, str, str]]:
    """
    Lint a JSON file for banned terms.
    
    Returns list of (file, field, term) tuples for violations.
    """
    if not file_path.exists():
        return []
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    violations = []
    
    if isinstance(data, list):
        for idx, item in enumerate(data):
            for key, value in item.items():
                if isinstance(value, str):
                    context = f"{file_path.name}[{idx}].{key}"
                    found = check_text(value, context)
                    for term, ctx in found:
                        violations.append((file_path.name, ctx, term))
                elif isinstance(value, list):
                    for sub_idx, sub_value in enumerate(value):
                        if isinstance(sub_value, str):
                            context = f"{file_path.name}[{idx}].{key}[{sub_idx}]"
                            found = check_text(sub_value, context)
                            for term, ctx in found:
                                violations.append((file_path.name, ctx, term))
    
    return violations


def lint_markdown_files(casebook_dir: Path) -> List[Tuple[str, str, str]]:
    """
    Lint markdown casebook files.
    
    Returns list of (file, line_no, term) tuples for violations.
    """
    if not casebook_dir.exists():
        return []
    
    violations = []
    
    for md_file in casebook_dir.glob("*.md"):
        with open(md_file, 'r') as f:
            for line_no, line in enumerate(f, 1):
                found = check_text(line, str(line_no))
                for term, ctx in found:
                    violations.append((md_file.name, ctx, term))
    
    return violations


def main() -> int:
    """Main linting."""
    print("=== Public Text Linting ===\n")
    
    site_dir = Path(__file__).parent.parent / "site"
    
    all_violations = []
    
    # Lint JSON artifacts
    data_dir = site_dir / "data"
    if data_dir.exists():
        for json_file in ["evidence.json", "entities.json", "leads.json"]:
            violations = lint_json_file(data_dir / json_file)
            all_violations.extend(violations)
    
    # Lint casebook
    casebook_dir = site_dir / "casebook"
    if casebook_dir.exists():
        violations = lint_markdown_files(casebook_dir)
        all_violations.extend(violations)
    
    # Report
    if all_violations:
        print("❌ Found banned terms in public artifacts:\n")
        for file, context, term in all_violations:
            print(f"  {file} :: {context} :: '{term}'")
        print(f"\nTotal violations: {len(all_violations)}")
        print("\nThese terms must be removed before publication.")
        return 1
    else:
        print("✓ No banned terms found in public artifacts")
        return 0


if __name__ == "__main__":
    sys.exit(main())

