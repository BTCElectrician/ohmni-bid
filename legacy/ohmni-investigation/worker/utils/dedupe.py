"""Deduplication and merging utilities for Evidence, Entity, and Lead objects."""

from typing import List, Dict, Any
from datetime import datetime, timezone


def merge_evidence_list(
    existing: List[Dict[str, Any]],
    new_items: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Merge new evidence items into existing list.
    
    Key: evidence_id
    Policy: Update if exists, preserve created_at, update updated_at
    """
    evidence_map = {item["evidence_id"]: item for item in existing}
    
    for new_item in new_items:
        eid = new_item["evidence_id"]
        
        if eid in evidence_map:
            # Update existing
            old_item = evidence_map[eid]
            new_item["created_at"] = old_item["created_at"]
            new_item["updated_at"] = datetime.now(timezone.utc).isoformat()
            evidence_map[eid] = new_item
        else:
            # Add new
            now = datetime.now(timezone.utc).isoformat()
            new_item["created_at"] = now
            new_item["updated_at"] = now
            evidence_map[eid] = new_item
    
    return list(evidence_map.values())


def merge_entity_list(
    existing: List[Dict[str, Any]],
    new_items: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Merge new entity items into existing list.
    
    Key: entity_id
    Policy: Update if exists, merge aliases, preserve created_at
    """
    entity_map = {item["entity_id"]: item for item in existing}
    
    for new_item in new_items:
        eid = new_item["entity_id"]
        
        if eid in entity_map:
            # Update existing
            old_item = entity_map[eid]
            
            # Merge aliases (unique)
            old_aliases = set(old_item.get("aliases", []))
            new_aliases = set(new_item.get("aliases", []))
            merged_aliases = sorted(list(old_aliases | new_aliases))
            new_item["aliases"] = merged_aliases
            
            # Merge relationships (unique by entity_id + relationship_type)
            old_rels = old_item.get("relationships", [])
            new_rels = new_item.get("relationships", [])
            rel_key_map = {}
            
            for rel in old_rels:
                key = (rel["entity_id"], rel["relationship_type"])
                rel_key_map[key] = rel
            
            for rel in new_rels:
                key = (rel["entity_id"], rel["relationship_type"])
                if key in rel_key_map:
                    # Merge evidence_ids
                    old_ev_ids = set(rel_key_map[key].get("evidence_ids", []))
                    new_ev_ids = set(rel.get("evidence_ids", []))
                    rel["evidence_ids"] = sorted(list(old_ev_ids | new_ev_ids))
                rel_key_map[key] = rel
            
            new_item["relationships"] = list(rel_key_map.values())
            
            # Preserve timestamps
            new_item["created_at"] = old_item["created_at"]
            new_item["updated_at"] = datetime.now(timezone.utc).isoformat()
            entity_map[eid] = new_item
        else:
            # Add new
            now = datetime.now(timezone.utc).isoformat()
            new_item["created_at"] = now
            new_item["updated_at"] = now
            entity_map[eid] = new_item
    
    return list(entity_map.values())


def merge_lead_list(
    existing: List[Dict[str, Any]],
    new_items: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Merge new lead items into existing list.
    
    Key: lead_id
    Policy: Update if exists, append new evidence_ids, preserve created_at
    """
    lead_map = {item["lead_id"]: item for item in existing}
    
    for new_item in new_items:
        lid = new_item["lead_id"]
        
        if lid in lead_map:
            # Update existing
            old_item = lead_map[lid]
            
            # Merge evidence_ids (unique)
            old_ev_ids = set(old_item.get("evidence_ids", []))
            new_ev_ids = set(new_item.get("evidence_ids", []))
            merged_ev_ids = sorted(list(old_ev_ids | new_ev_ids))
            new_item["evidence_ids"] = merged_ev_ids
            
            # Merge entity_ids (unique)
            old_ent_ids = set(old_item.get("entity_ids", []))
            new_ent_ids = set(new_item.get("entity_ids", []))
            merged_ent_ids = sorted(list(old_ent_ids | new_ent_ids))
            new_item["entity_ids"] = merged_ent_ids
            
            # Take higher confidence
            if new_item["confidence"] < old_item["confidence"]:
                new_item["confidence"] = old_item["confidence"]
            
            # Preserve timestamps
            new_item["created_at"] = old_item["created_at"]
            new_item["updated_at"] = datetime.now(timezone.utc).isoformat()
            lead_map[lid] = new_item
        else:
            # Add new
            now = datetime.now(timezone.utc).isoformat()
            new_item["created_at"] = now
            new_item["updated_at"] = now
            lead_map[lid] = new_item
    
    return list(lead_map.values())

