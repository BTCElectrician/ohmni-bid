"""Deterministic ID generation for Evidence, Entity, and Lead objects."""

import hashlib
from typing import Optional


def _sha256_hash(data: str) -> str:
    """Generate SHA256 hash of input string."""
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


def evidence_id(
    canonical_url: str,
    published_date: Optional[str],
    title: str
) -> str:
    """
    Generate deterministic evidence ID.
    
    Format: ev_ + sha256(canonical_url + published_date + title)[:16]
    """
    components = [
        canonical_url,
        published_date or "",
        title
    ]
    hash_input = "|".join(components)
    hash_hex = _sha256_hash(hash_input)
    return f"ev_{hash_hex[:16]}"


def entity_id(
    normalized_primary_name: str,
    jurisdiction: Optional[str] = None
) -> str:
    """
    Generate deterministic entity ID.
    
    Format: en_ + sha256(normalized_primary_name + jurisdiction)[:16]
    """
    components = [
        normalized_primary_name,
        jurisdiction or ""
    ]
    hash_input = "|".join(components)
    hash_hex = _sha256_hash(hash_input)
    return f"en_{hash_hex[:16]}"


def lead_id(
    signal_category: str,
    normalized_title: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> str:
    """
    Generate deterministic lead ID.
    
    Format: ld_ + sha256(signal_category + normalized_title + start_date + end_date)[:16]
    """
    components = [
        signal_category,
        normalized_title,
        start_date or "",
        end_date or ""
    ]
    hash_input = "|".join(components)
    hash_hex = _sha256_hash(hash_input)
    return f"ld_{hash_hex[:16]}"

