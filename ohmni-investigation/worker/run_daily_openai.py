#!/usr/bin/env python3
"""
Daily worker script using OpenAI Responses API.

Discovers new sources, extracts structured data, generates leads.
"""

import os
import json
import yaml
from datetime import datetime, timezone, date
from pathlib import Path
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from openai import OpenAI

from utils.ids import evidence_id, entity_id, lead_id
from utils.normalize import normalize_url, normalize_name, normalize_date
from utils.dedupe import merge_evidence_list, merge_entity_list, merge_lead_list
from utils.archive import download_and_archive


# Load environment
load_dotenv()


# Pydantic models for structured output
class Evidence(BaseModel):
    evidence_id: str
    source_url: str
    title: str
    excerpt: str
    summary: str
    relevance_tags: List[str]
    confidence: float = Field(ge=0, le=1)
    retrieved_at: str
    published_date: Optional[str] = None
    content_hash: Optional[str] = None
    archive_path: Optional[str] = None
    created_at: str
    updated_at: str


class EntityRelationship(BaseModel):
    entity_id: str
    relationship_type: str
    evidence_ids: List[str] = Field(default_factory=list)


class Entity(BaseModel):
    entity_id: str
    primary_name: str
    aliases: List[str] = Field(default_factory=list)
    entity_type: str
    jurisdiction: Optional[str] = None
    roles: List[str]
    relationships: List[EntityRelationship] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    created_at: str
    updated_at: str


class Lead(BaseModel):
    lead_id: str
    title: str
    signal_category: str
    summary: str
    evidence_ids: List[str]
    entity_ids: List[str] = Field(default_factory=list)
    innocent_explanations: List[str]
    next_tests: List[str]
    confidence: float = Field(ge=0, le=1)
    status: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    created_at: str
    updated_at: str


class DailyOutput(BaseModel):
    run_date: str
    evidence: List[Evidence]
    entities: List[Entity]
    leads: List[Lead]
    casebook_markdown: str


def load_config() -> Dict[str, Any]:
    """Load configuration from environment and sources.yaml."""
    config = {
        "openai_api_key": os.getenv("OPENAI_API_KEY"),
        "model": os.getenv("OHMNI_OPENAI_MODEL", "gpt-5.2"),
        "reasoning_effort": os.getenv("OHMNI_OPENAI_REASONING_EFFORT", "high"),
        "max_sources": int(os.getenv("OHMNI_MAX_SOURCES", "20")),
        "two_stage": os.getenv("OHMNI_TWO_STAGE", "false").lower() == "true",
        "run_date": os.getenv("OHMNI_RUN_DATE", date.today().isoformat())
    }
    
    # Load sources.yaml
    sources_path = Path(__file__).parent / "sources.yaml"
    with open(sources_path, 'r') as f:
        sources = yaml.safe_load(f)
    
    config["queries"] = sources.get("queries", [])
    config["watchlist"] = sources.get("watchlist", [])
    
    return config


def load_prompts() -> Dict[str, str]:
    """Load system and run prompts."""
    prompts_dir = Path(__file__).parent / "prompts"
    
    with open(prompts_dir / "system_investigator.md", 'r') as f:
        system_prompt = f.read()
    
    with open(prompts_dir / "run_daily.md", 'r') as f:
        run_prompt_template = f.read()
    
    return {
        "system": system_prompt,
        "run_template": run_prompt_template
    }


def generate_ids_for_output(output: DailyOutput) -> DailyOutput:
    """Generate deterministic IDs for all objects in output."""
    now = datetime.now(timezone.utc).isoformat()
    
    # Process evidence
    for ev in output.evidence:
        canonical_url = normalize_url(ev.source_url)
        ev.evidence_id = evidence_id(canonical_url, ev.published_date, ev.title)
        ev.source_url = canonical_url
        if not ev.created_at:
            ev.created_at = now
        if not ev.updated_at:
            ev.updated_at = now
        if not ev.retrieved_at:
            ev.retrieved_at = now
    
    # Process entities
    for ent in output.entities:
        normalized_name = normalize_name(ent.primary_name)
        ent.entity_id = entity_id(normalized_name, ent.jurisdiction)
        if not ent.created_at:
            ent.created_at = now
        if not ent.updated_at:
            ent.updated_at = now
    
    # Process leads
    for ld in output.leads:
        normalized_title = normalize_name(ld.title)
        ld.lead_id = lead_id(
            ld.signal_category,
            normalized_title,
            ld.start_date,
            ld.end_date
        )
        if not ld.created_at:
            ld.created_at = now
        if not ld.updated_at:
            ld.updated_at = now
    
    return output


def call_openai_api(
    client: OpenAI,
    config: Dict[str, Any],
    prompts: Dict[str, str]
) -> DailyOutput:
    """Call OpenAI Responses API with structured output."""
    
    # Format run prompt
    run_prompt = prompts["run_template"].format(
        run_date=config["run_date"],
        queries="\n".join([f"- {q}" for q in config["queries"]]),
        watchlist="\n".join([f"- {w['name']}" for w in config["watchlist"]]),
        max_sources=config["max_sources"]
    )
    
    # Build messages
    messages = [
        {"role": "system", "content": prompts["system"]},
        {"role": "user", "content": run_prompt}
    ]
    
    # Call API with structured output
    completion = client.beta.chat.completions.parse(
        model=config["model"],
        messages=messages,
        response_format=DailyOutput,
        tools=[{"type": "web_search"}]
    )
    
    # Extract parsed output
    output = completion.choices[0].message.parsed
    
    return output


def archive_sources(evidence_list: List[Evidence], config: Dict[str, Any]) -> None:
    """Optionally archive source materials."""
    for ev in evidence_list:
        if not ev.archive_path:
            # Try to download and archive
            result = download_and_archive(ev.source_url)
            if result["success"]:
                ev.content_hash = result["content_hash"]
                ev.archive_path = result["archive_path"]
                print(f"  Archived: {ev.source_url} -> {ev.archive_path}")
            else:
                print(f"  Archive failed: {ev.source_url} ({result['error']})")


def load_existing_artifacts() -> Dict[str, List[Dict[str, Any]]]:
    """Load existing artifacts from site/data/."""
    site_data_dir = Path(__file__).parent.parent / "site" / "data"
    site_data_dir.mkdir(parents=True, exist_ok=True)
    
    artifacts = {
        "evidence": [],
        "entities": [],
        "leads": []
    }
    
    for key in artifacts.keys():
        file_path = site_data_dir / f"{key}.json"
        if file_path.exists():
            with open(file_path, 'r') as f:
                artifacts[key] = json.load(f)
    
    return artifacts


def save_artifacts(
    evidence: List[Evidence],
    entities: List[Entity],
    leads: List[Lead]
) -> None:
    """Save artifacts to site/data/."""
    site_data_dir = Path(__file__).parent.parent / "site" / "data"
    site_data_dir.mkdir(parents=True, exist_ok=True)
    
    # Convert to dicts
    evidence_dicts = [ev.model_dump() for ev in evidence]
    entity_dicts = [ent.model_dump() for ent in entities]
    lead_dicts = [ld.model_dump() for ld in leads]
    
    # Save
    with open(site_data_dir / "evidence.json", 'w') as f:
        json.dump(evidence_dicts, f, indent=2)
    
    with open(site_data_dir / "entities.json", 'w') as f:
        json.dump(entity_dicts, f, indent=2)
    
    with open(site_data_dir / "leads.json", 'w') as f:
        json.dump(lead_dicts, f, indent=2)


def save_casebook(run_date: str, casebook_markdown: str) -> None:
    """Save casebook entry and update manifest."""
    casebook_dir = Path(__file__).parent.parent / "site" / "casebook"
    casebook_dir.mkdir(parents=True, exist_ok=True)
    
    # Save markdown
    casebook_file = casebook_dir / f"{run_date}.md"
    with open(casebook_file, 'w') as f:
        f.write(casebook_markdown)
    
    # Update manifest
    manifest_path = casebook_dir / "manifest.json"
    if manifest_path.exists():
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
    else:
        manifest = {"entries": []}
    
    # Add entry if not exists
    if run_date not in [e["date"] for e in manifest["entries"]]:
        manifest["entries"].append({
            "date": run_date,
            "file": f"{run_date}.md"
        })
    
    # Sort by date descending
    manifest["entries"] = sorted(
        manifest["entries"],
        key=lambda x: x["date"],
        reverse=True
    )
    
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)


def save_run_log(config: Dict[str, Any], output: DailyOutput) -> None:
    """Save run log to data/runs/."""
    runs_dir = Path(__file__).parent.parent / "data" / "runs"
    runs_dir.mkdir(parents=True, exist_ok=True)
    
    run_log = {
        "run_date": config["run_date"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": config["model"],
        "reasoning_effort": config["reasoning_effort"],
        "counts": {
            "evidence": len(output.evidence),
            "entities": len(output.entities),
            "leads": len(output.leads)
        },
        "evidence_ids": [ev.evidence_id for ev in output.evidence],
        "entity_ids": [ent.entity_id for ent in output.entities],
        "lead_ids": [ld.lead_id for ld in output.leads]
    }
    
    log_file = runs_dir / f"{config['run_date']}.json"
    with open(log_file, 'w') as f:
        json.dump(run_log, f, indent=2)


def main() -> None:
    """Main execution."""
    print("=== Ohmni Investigation Daily Worker (OpenAI Route) ===\n")
    
    # Load config
    config = load_config()
    print(f"Run date: {config['run_date']}")
    print(f"Model: {config['model']}")
    print(f"Max sources: {config['max_sources']}\n")
    
    # Initialize OpenAI client
    client = OpenAI(api_key=config["openai_api_key"])
    
    # Load prompts
    prompts = load_prompts()
    
    # Call OpenAI API
    print("Calling OpenAI API...")
    output = call_openai_api(client, config, prompts)
    print(f"✓ Received output: {len(output.evidence)} evidence, {len(output.entities)} entities, {len(output.leads)} leads\n")
    
    # Generate deterministic IDs
    print("Generating deterministic IDs...")
    output = generate_ids_for_output(output)
    print("✓ IDs generated\n")
    
    # Archive sources
    print("Archiving sources...")
    archive_sources(output.evidence, config)
    print("✓ Archiving complete\n")
    
    # Load existing artifacts
    print("Loading existing artifacts...")
    existing = load_existing_artifacts()
    print(f"✓ Loaded: {len(existing['evidence'])} evidence, {len(existing['entities'])} entities, {len(existing['leads'])} leads\n")
    
    # Merge
    print("Merging artifacts...")
    merged_evidence = merge_evidence_list(
        existing["evidence"],
        [ev.model_dump() for ev in output.evidence]
    )
    merged_entities = merge_entity_list(
        existing["entities"],
        [ent.model_dump() for ent in output.entities]
    )
    merged_leads = merge_lead_list(
        existing["leads"],
        [ld.model_dump() for ld in output.leads]
    )
    print(f"✓ Merged: {len(merged_evidence)} evidence, {len(merged_entities)} entities, {len(merged_leads)} leads\n")
    
    # Convert back to Pydantic models
    evidence_models = [Evidence(**ev) for ev in merged_evidence]
    entity_models = [Entity(**ent) for ent in merged_entities]
    lead_models = [Lead(**ld) for ld in merged_leads]
    
    # Save artifacts
    print("Saving artifacts...")
    save_artifacts(evidence_models, entity_models, lead_models)
    print("✓ Artifacts saved\n")
    
    # Save casebook
    print("Saving casebook...")
    save_casebook(config["run_date"], output.casebook_markdown)
    print("✓ Casebook saved\n")
    
    # Save run log
    print("Saving run log...")
    save_run_log(config, output)
    print("✓ Run log saved\n")
    
    print("=== Daily run complete ===")


if __name__ == "__main__":
    main()

