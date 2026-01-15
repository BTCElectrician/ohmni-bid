#!/usr/bin/env python3
"""
Validate artifacts against JSON schemas.

Ensures all public artifacts conform to strict schemas.
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any
from pydantic import BaseModel, Field, ValidationError


# Import models from run_daily_openai
from run_daily_openai import Evidence, Entity, Lead


def load_json_file(file_path: Path) -> List[Dict[str, Any]]:
    """Load JSON file as list of dicts."""
    if not file_path.exists():
        print(f"⚠️  File not found: {file_path}")
        return []
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    if not isinstance(data, list):
        raise ValueError(f"{file_path} must contain a JSON array")
    
    return data


def validate_evidence(evidence_list: List[Dict[str, Any]]) -> bool:
    """Validate evidence against Evidence schema."""
    errors = []
    
    for idx, item in enumerate(evidence_list):
        try:
            Evidence(**item)
        except ValidationError as e:
            errors.append(f"Evidence[{idx}]: {e}")
    
    if errors:
        print("❌ Evidence validation failed:")
        for err in errors:
            print(f"  {err}")
        return False
    
    print(f"✓ Evidence validation passed ({len(evidence_list)} items)")
    return True


def validate_entities(entity_list: List[Dict[str, Any]]) -> bool:
    """Validate entities against Entity schema."""
    errors = []
    
    for idx, item in enumerate(entity_list):
        try:
            Entity(**item)
        except ValidationError as e:
            errors.append(f"Entity[{idx}]: {e}")
    
    if errors:
        print("❌ Entity validation failed:")
        for err in errors:
            print(f"  {err}")
        return False
    
    print(f"✓ Entity validation passed ({len(entity_list)} items)")
    return True


def validate_leads(lead_list: List[Dict[str, Any]]) -> bool:
    """Validate leads against Lead schema."""
    errors = []
    
    for idx, item in enumerate(lead_list):
        try:
            Lead(**item)
        except ValidationError as e:
            errors.append(f"Lead[{idx}]: {e}")
    
    if errors:
        print("❌ Lead validation failed:")
        for err in errors:
            print(f"  {err}")
        return False
    
    print(f"✓ Lead validation passed ({len(lead_list)} items)")
    return True


def main() -> int:
    """Main validation."""
    print("=== Artifact Validation ===\n")
    
    site_data_dir = Path(__file__).parent.parent / "site" / "data"
    
    if not site_data_dir.exists():
        print(f"❌ Site data directory not found: {site_data_dir}")
        return 1
    
    # Load artifacts
    evidence_list = load_json_file(site_data_dir / "evidence.json")
    entity_list = load_json_file(site_data_dir / "entities.json")
    lead_list = load_json_file(site_data_dir / "leads.json")
    
    # Validate
    all_valid = True
    
    all_valid &= validate_evidence(evidence_list)
    all_valid &= validate_entities(entity_list)
    all_valid &= validate_leads(lead_list)
    
    if all_valid:
        print("\n✓ All artifacts valid")
        return 0
    else:
        print("\n❌ Validation failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())

