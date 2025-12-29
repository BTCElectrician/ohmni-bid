"""Archive utilities for downloading and storing source materials."""

import hashlib
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any
import requests


def _sha256_file_hash(content: bytes) -> str:
    """Generate SHA256 hash of file content."""
    return hashlib.sha256(content).hexdigest()


def _detect_extension(content_type: Optional[str], url: str) -> str:
    """Detect file extension from content type or URL."""
    if content_type:
        content_type_lower = content_type.lower()
        if 'pdf' in content_type_lower:
            return 'pdf'
        elif 'html' in content_type_lower:
            return 'html'
        elif 'json' in content_type_lower:
            return 'json'
        elif 'xml' in content_type_lower:
            return 'xml'
    
    # Fallback to URL extension
    if url.endswith('.pdf'):
        return 'pdf'
    elif url.endswith('.json'):
        return 'json'
    elif url.endswith('.xml'):
        return 'xml'
    
    # Default to html
    return 'html'


def download_and_archive(
    url: str,
    archive_dir: str = "data/raw",
    timeout: int = 30,
    max_size_mb: int = 50
) -> Dict[str, Any]:
    """
    Download content from URL and archive it.
    
    Returns dict with:
        - retrieved_at: ISO timestamp
        - content_hash: SHA256 of content
        - archive_path: relative path to archived file
        - success: bool
        - error: Optional error message
    """
    result = {
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "content_hash": None,
        "archive_path": None,
        "success": False,
        "error": None
    }
    
    try:
        # Download with streaming to check size
        headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; OhmniInvestigationBot/1.0)'
        }
        
        response = requests.get(url, headers=headers, timeout=timeout, stream=True)
        response.raise_for_status()
        
        # Check content length
        content_length = response.headers.get('content-length')
        if content_length and int(content_length) > max_size_mb * 1024 * 1024:
            result["error"] = f"Content too large: {content_length} bytes"
            return result
        
        # Read content
        content = response.content
        
        # Check actual size
        if len(content) > max_size_mb * 1024 * 1024:
            result["error"] = f"Content too large: {len(content)} bytes"
            return result
        
        # Calculate hash
        content_hash = _sha256_file_hash(content)
        result["content_hash"] = content_hash
        
        # Detect extension
        content_type = response.headers.get('content-type')
        ext = _detect_extension(content_type, url)
        
        # Create archive directory
        Path(archive_dir).mkdir(parents=True, exist_ok=True)
        
        # Save file
        filename = f"{content_hash}.{ext}"
        archive_path = os.path.join(archive_dir, filename)
        
        with open(archive_path, 'wb') as f:
            f.write(content)
        
        result["archive_path"] = archive_path
        result["success"] = True
        
    except requests.RequestException as e:
        result["error"] = f"Request error: {str(e)}"
    except OSError as e:
        result["error"] = f"File system error: {str(e)}"
    except Exception as e:
        result["error"] = f"Unexpected error: {str(e)}"
    
    return result

