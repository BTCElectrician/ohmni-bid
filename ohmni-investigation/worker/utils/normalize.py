"""Normalization utilities for URLs, names, and dates."""

import re
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
from typing import Optional
from datetime import datetime


def normalize_url(url: str) -> str:
    """
    Canonicalize URL by removing tracking parameters and fragments.
    
    Strips common tracking params like utm_*, fbclid, etc.
    """
    parsed = urlparse(url)
    
    # Remove fragment
    parsed = parsed._replace(fragment="")
    
    # Parse query string
    query_params = parse_qs(parsed.query, keep_blank_values=False)
    
    # Remove tracking parameters
    tracking_params = {
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'msclkid', '_ga', 'mc_cid', 'mc_eid'
    }
    
    cleaned_params = {
        k: v for k, v in query_params.items()
        if k.lower() not in tracking_params
    }
    
    # Rebuild query string
    new_query = urlencode(cleaned_params, doseq=True) if cleaned_params else ""
    parsed = parsed._replace(query=new_query)
    
    return urlunparse(parsed)


def normalize_name(name: str) -> str:
    """
    Normalize entity name for consistent matching.
    
    - Lowercase
    - Strip excess whitespace
    - Remove common punctuation
    - Preserve alphanumeric and spaces
    """
    # Lowercase
    normalized = name.lower()
    
    # Remove punctuation except spaces and hyphens
    normalized = re.sub(r'[^\w\s-]', '', normalized)
    
    # Collapse multiple spaces
    normalized = re.sub(r'\s+', ' ', normalized)
    
    # Strip leading/trailing whitespace
    normalized = normalized.strip()
    
    return normalized


def normalize_date(date_str: Optional[str]) -> Optional[str]:
    """
    Normalize date string to ISO 8601 format (YYYY-MM-DD).
    
    Returns None if date cannot be parsed.
    """
    if not date_str:
        return None
    
    # Common date formats to try
    formats = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%m/%d/%Y",
        "%m-%d-%Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%d %B %Y",
        "%d %b %Y",
        "%Y%m%d"
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    
    return None

