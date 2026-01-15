"""
Ohmni Estimate - Estimation Service
Drop into: backend/services/estimation_service.py

Core business logic for electrical estimating.
"""

from typing import List, Dict, Optional, Tuple
from decimal import Decimal
import json
import logging
from datetime import datetime, timedelta

from backend.extensions import db
from backend.models.estimate_models import (
    Estimate, EstimateLineItem, PricingItem, Proposal
)

logger = logging.getLogger(__name__)


# =============================================================================
# CONSTANTS
# =============================================================================

DEFAULT_LABOR_RATE = 118.00
DEFAULT_TAX_RATE = 0.1025
DEFAULT_OP_RATE = 0.0

CATEGORY_ORDER = [
    'TEMP_POWER',
    'ELECTRICAL_SERVICE',
    'MECHANICAL_CONNECTIONS',
    'INTERIOR_LIGHTING',
    'EXTERIOR_LIGHTING',
    'POWER_RECEPTACLES',
    'SITE_CONDUITS',
    'SECURITY',
    'FIRE_ALARM',
    'GENERAL_CONDITIONS'
]

# Ampacity multipliers for feeder sizing
AMPACITY_MULTIPLIERS = {
    '4000A': 10, '3000A': 10, '2500A': 7, '2000A': 6,
    '1600A': 5, '1200A': 4, '1000A': 3, '800A': 2,
    '600A': 2, '400A': 1, '250A': 1, '225A': 1,
    '200A': 1, '150A': 1, '125A': 1, '100A': 1
}


# =============================================================================
# ESTIMATION SERVICE CLASS
# =============================================================================

class EstimationService:
    """
    Core service for managing estimates and calculations.
    """

    def __init__(self, user_id: str):
        self.user_id = user_id

    # -------------------------------------------------------------------------
    # ESTIMATE CRUD
    # -------------------------------------------------------------------------

    def create_estimate(
        self,
        project_name: str,
        project_type: Optional[str] = None,
        square_footage: Optional[int] = None,
        gc_name: Optional[str] = None,
        project_location: Optional[str] = None,
        chat_session_id: Optional[str] = None,
        labor_rate: float = DEFAULT_LABOR_RATE,
        material_tax_rate: float = DEFAULT_TAX_RATE,
        overhead_profit_rate: float = DEFAULT_OP_RATE
    ) -> Estimate:
        """Create a new estimate."""
        estimate = Estimate(
            user_id=self.user_id,
            project_name=project_name,
            project_type=project_type,
            square_footage=square_footage,
            gc_name=gc_name,
            project_location=project_location,
            chat_session_id=chat_session_id,
            labor_rate=labor_rate,
            material_tax_rate=material_tax_rate,
            overhead_profit_rate=overhead_profit_rate,
            status='draft'
        )
        db.session.add(estimate)
        db.session.commit()
        logger.info(f"Created estimate {estimate.id} for user {self.user_id}")
        return estimate

    def get_estimate(self, estimate_id: str) -> Optional[Estimate]:
        """Get an estimate by ID (scoped to user)."""
        return Estimate.query.filter_by(
            id=estimate_id,
            user_id=self.user_id
        ).first()

    def get_user_estimates(
        self,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Estimate]:
        """Get all estimates for the current user."""
        query = Estimate.query.filter_by(user_id=self.user_id)
        if status:
            query = query.filter_by(status=status)
        return query.order_by(Estimate.updated_at.desc()).limit(limit).all()

    def update_estimate(
        self,
        estimate_id: str,
        **kwargs
    ) -> Optional[Estimate]:
        """Update estimate fields."""
        estimate = self.get_estimate(estimate_id)
        if not estimate:
            return None

        allowed_fields = [
            'project_name', 'project_number', 'project_location',
            'gc_name', 'contact_name', 'contact_email', 'contact_phone',
            'square_footage', 'project_type',
            'labor_rate', 'material_tax_rate', 'overhead_profit_rate',
            'status'
        ]

        for field, value in kwargs.items():
            if field in allowed_fields:
                setattr(estimate, field, value)

        # Recalculate if pricing params changed
        if any(f in kwargs for f in ['labor_rate', 'material_tax_rate', 'overhead_profit_rate']):
            self._recalculate_all_line_items(estimate)

        estimate.recalculate_totals()
        db.session.commit()
        return estimate

    def delete_estimate(self, estimate_id: str) -> bool:
        """Delete an estimate and all related items."""
        estimate = self.get_estimate(estimate_id)
        if not estimate:
            return False
        db.session.delete(estimate)
        db.session.commit()
        logger.info(f"Deleted estimate {estimate_id}")
        return True

    # -------------------------------------------------------------------------
    # LINE ITEM MANAGEMENT
    # -------------------------------------------------------------------------

    def add_line_item(
        self,
        estimate_id: str,
        category: str,
        description: str,
        quantity: float,
        material_unit_cost: float,
        labor_hours_per_unit: float,
        unit_type: str = 'E',
        pricing_item_id: Optional[str] = None,
        source: str = 'manual',
        ai_confidence: Optional[float] = None,
        ai_notes: Optional[str] = None
    ) -> Optional[EstimateLineItem]:
        """Add a line item to an estimate."""
        estimate = self.get_estimate(estimate_id)
        if not estimate:
            return None

        # Determine sort order
        max_order = db.session.query(
            db.func.max(EstimateLineItem.sort_order)
        ).filter_by(estimate_id=estimate_id).scalar() or 0

        line_item = EstimateLineItem(
            estimate_id=estimate_id,
            category=category,
            description=description,
            quantity=quantity,
            material_unit_cost=material_unit_cost,
            labor_hours_per_unit=labor_hours_per_unit,
            unit_type=unit_type,
            pricing_item_id=pricing_item_id,
            source=source,
            ai_confidence=ai_confidence,
            ai_notes=ai_notes,
            sort_order=max_order + 1
        )

        # Calculate the line item
        line_item.calculate(
            labor_rate=float(estimate.labor_rate),
            tax_rate=float(estimate.material_tax_rate),
            op_rate=float(estimate.overhead_profit_rate)
        )

        db.session.add(line_item)

        # Recalculate estimate totals
        estimate.recalculate_totals()
        db.session.commit()

        logger.info(f"Added line item to estimate {estimate_id}: {description}")
        return line_item

    def add_line_item_from_pricing(
        self,
        estimate_id: str,
        pricing_item_id: str,
        quantity: float,
        source: str = 'manual'
    ) -> Optional[EstimateLineItem]:
        """Add a line item using a pricing item from the database."""
        pricing_item = PricingItem.query.get(pricing_item_id)
        if not pricing_item:
            return None

        return self.add_line_item(
            estimate_id=estimate_id,
            category=pricing_item.category,
            description=pricing_item.name,
            quantity=quantity,
            material_unit_cost=float(pricing_item.material_cost),
            labor_hours_per_unit=float(pricing_item.labor_hours),
            unit_type=pricing_item.unit_type,
            pricing_item_id=pricing_item_id,
            source=source
        )

    def update_line_item(
        self,
        line_item_id: str,
        estimate_id: str,
        **kwargs
    ) -> Optional[EstimateLineItem]:
        """Update a line item."""
        line_item = EstimateLineItem.query.filter_by(
            id=line_item_id,
            estimate_id=estimate_id
        ).first()
        if not line_item:
            return None

        estimate = self.get_estimate(estimate_id)
        if not estimate:
            return None

        allowed_fields = [
            'category', 'description', 'quantity',
            'material_unit_cost', 'labor_hours_per_unit',
            'unit_type', 'sort_order'
        ]

        for field, value in kwargs.items():
            if field in allowed_fields:
                setattr(line_item, field, value)

        # Recalculate
        line_item.calculate(
            labor_rate=float(estimate.labor_rate),
            tax_rate=float(estimate.material_tax_rate),
            op_rate=float(estimate.overhead_profit_rate)
        )
        estimate.recalculate_totals()
        db.session.commit()
        return line_item

    def delete_line_item(self, line_item_id: str, estimate_id: str) -> bool:
        """Delete a line item."""
        line_item = EstimateLineItem.query.filter_by(
            id=line_item_id,
            estimate_id=estimate_id
        ).first()
        if not line_item:
            return False

        estimate = self.get_estimate(estimate_id)
        db.session.delete(line_item)

        if estimate:
            estimate.recalculate_totals()

        db.session.commit()
        return True

    def bulk_add_line_items(
        self,
        estimate_id: str,
        items: List[Dict],
        source: str = 'chat'
    ) -> List[EstimateLineItem]:
        """Add multiple line items at once."""
        estimate = self.get_estimate(estimate_id)
        if not estimate:
            return []

        added_items = []
        for item_data in items:
            line_item = self.add_line_item(
                estimate_id=estimate_id,
                category=item_data.get('category', 'GENERAL_CONDITIONS'),
                description=item_data['description'],
                quantity=item_data['quantity'],
                material_unit_cost=item_data.get('material_unit_cost', 0),
                labor_hours_per_unit=item_data.get('labor_hours_per_unit', 0),
                unit_type=item_data.get('unit_type', 'E'),
                source=source,
                ai_confidence=item_data.get('ai_confidence'),
                ai_notes=item_data.get('ai_notes')
            )
            if line_item:
                added_items.append(line_item)

        return added_items

    # -------------------------------------------------------------------------
    # PRICING DATABASE QUERIES
    # -------------------------------------------------------------------------

    @staticmethod
    def search_pricing_items(
        query: str,
        category: Optional[str] = None,
        limit: int = 20
    ) -> List[PricingItem]:
        """Search pricing items by name/description."""
        q = PricingItem.query.filter(PricingItem.is_active == True)

        if category:
            q = q.filter(PricingItem.category == category)

        if query:
            search_term = f"%{query}%"
            q = q.filter(
                db.or_(
                    PricingItem.name.ilike(search_term),
                    PricingItem.description.ilike(search_term)
                )
            )

        return q.limit(limit).all()

    @staticmethod
    def get_pricing_by_category(category: str) -> List[PricingItem]:
        """Get all pricing items in a category."""
        return PricingItem.query.filter_by(
            category=category,
            is_active=True
        ).order_by(PricingItem.name).all()

    @staticmethod
    def get_conduit_pricing(conduit_type: str, size: str) -> Optional[PricingItem]:
        """Get specific conduit pricing."""
        return PricingItem.query.filter_by(
            category='CONDUIT',
            subcategory=conduit_type,
            size=size,
            is_active=True
        ).first()

    @staticmethod
    def get_wire_pricing(material: str, size: str) -> Optional[PricingItem]:
        """Get specific wire pricing."""
        subcategory = f"{material}_THHN"
        return PricingItem.query.filter_by(
            category='WIRE',
            subcategory=subcategory,
            size=size,
            is_active=True
        ).first()

    # -------------------------------------------------------------------------
    # FEEDER CALCULATIONS
    # -------------------------------------------------------------------------

    def calculate_feeder(
        self,
        wire_material: str,  # 'CU' or 'AL'
        wire_size: str,
        conduit_type: str,
        conduit_size: str,
        length_feet: float,
        conductor_count: int = 4,
        ampacity_multiplier: float = 1.0
    ) -> Dict:
        """
        Calculate feeder pricing combining wire and conduit.
        Returns dict with material_cost, labor_hours, description.
        """
        wire = self.get_wire_pricing(wire_material, wire_size)
        conduit = self.get_conduit_pricing(conduit_type, conduit_size)

        if not wire or not conduit:
            return {
                'error': 'Wire or conduit pricing not found',
                'material_cost': 0,
                'labor_hours': 0
            }

        # Wire cost: (price per 1000ft × conductors) / 10 for per 100ft
        wire_cost_per_100ft = (float(wire.material_cost) * conductor_count) / 10
        wire_labor_per_100ft = (float(wire.labor_hours) * conductor_count) / 10

        # Conduit is already per 100ft
        conduit_cost_per_100ft = float(conduit.material_cost)
        conduit_labor_per_100ft = float(conduit.labor_hours)

        # Combined with multiplier
        total_cost_per_100ft = (wire_cost_per_100ft + conduit_cost_per_100ft) * ampacity_multiplier
        total_labor_per_100ft = (wire_labor_per_100ft + conduit_labor_per_100ft) * ampacity_multiplier

        # Scale to actual length
        material_cost = (total_cost_per_100ft * length_feet) / 100
        labor_hours = (total_labor_per_100ft * length_feet) / 100

        description = f"{int(length_feet)}' of {conductor_count}-{wire_size} {wire_material} in {conduit_size} {conduit_type}"

        return {
            'material_cost': round(material_cost, 2),
            'labor_hours': round(labor_hours, 2),
            'description': description,
            'wire': wire.name,
            'conduit': conduit.name
        }

    # -------------------------------------------------------------------------
    # QUICK QUOTE
    # -------------------------------------------------------------------------

    def quick_quote(
        self,
        items: List[Dict],
        labor_rate: float = DEFAULT_LABOR_RATE,
        tax_rate: float = DEFAULT_TAX_RATE,
        op_rate: float = DEFAULT_OP_RATE
    ) -> Dict:
        """
        Generate a quick quote without creating an estimate.
        Items format: [{'name': 'Duplex Receptacle', 'quantity': 10}, ...]
        """
        total_material = 0
        total_labor_hours = 0
        line_items = []

        for item in items:
            # Try to find matching pricing item
            pricing_items = self.search_pricing_items(item['name'], limit=1)
            if not pricing_items:
                continue

            pricing = pricing_items[0]
            qty = item.get('quantity', 1)
            unit_type = pricing.unit_type

            # Calculate extensions
            if unit_type == 'C':
                mat_ext = (qty * float(pricing.material_cost)) / 100
                lbr_ext = (qty * float(pricing.labor_hours)) / 100
            elif unit_type == 'M':
                mat_ext = (qty * float(pricing.material_cost)) / 1000
                lbr_ext = (qty * float(pricing.labor_hours)) / 1000
            else:
                mat_ext = qty * float(pricing.material_cost)
                lbr_ext = qty * float(pricing.labor_hours)

            total_material += mat_ext
            total_labor_hours += lbr_ext

            # Calculate line total
            labor_cost = lbr_ext * labor_rate
            mat_with_tax = mat_ext * (1 + tax_rate)
            line_total = (labor_cost + mat_with_tax) * (1 + op_rate)

            line_items.append({
                'description': pricing.name,
                'quantity': qty,
                'unit_type': unit_type,
                'material_extension': round(mat_ext, 2),
                'labor_extension': round(lbr_ext, 2),
                'total': round(line_total, 2)
            })

        # Calculate totals
        total_material_with_tax = total_material * (1 + tax_rate)
        total_labor_cost = total_labor_hours * labor_rate
        subtotal = total_material_with_tax + total_labor_cost
        overhead = subtotal * op_rate
        final_total = round(subtotal + overhead)

        return {
            'line_items': line_items,
            'total_material': round(total_material, 2),
            'total_material_with_tax': round(total_material_with_tax, 2),
            'total_labor_hours': round(total_labor_hours, 2),
            'total_labor_cost': round(total_labor_cost, 2),
            'subtotal': round(subtotal, 2),
            'overhead_profit': round(overhead, 2),
            'final_total': final_total,
            'parameters': {
                'labor_rate': labor_rate,
                'tax_rate': tax_rate,
                'overhead_profit_rate': op_rate
            }
        }

    # -------------------------------------------------------------------------
    # OUTCOME TRACKING (for AI learning)
    # -------------------------------------------------------------------------

    def record_outcome(
        self,
        estimate_id: str,
        won: bool,
        won_amount: Optional[float] = None,
        notes: Optional[str] = None
    ) -> Optional[Estimate]:
        """Record whether an estimate was won or lost."""
        estimate = self.get_estimate(estimate_id)
        if not estimate:
            return None

        estimate.status = 'won' if won else 'lost'
        estimate.outcome_at = datetime.utcnow()

        if won and won_amount:
            estimate.won_amount = won_amount

        if notes:
            metadata = estimate.estimate_metadata or {}
            metadata['outcome_notes'] = notes
            estimate.estimate_metadata = metadata

        db.session.commit()
        logger.info(f"Recorded outcome for estimate {estimate_id}: {'won' if won else 'lost'}")
        return estimate

    # -------------------------------------------------------------------------
    # HELPERS
    # -------------------------------------------------------------------------

    def _recalculate_all_line_items(self, estimate: Estimate):
        """Recalculate all line items when pricing params change."""
        labor_rate = float(estimate.labor_rate)
        tax_rate = float(estimate.material_tax_rate)
        op_rate = float(estimate.overhead_profit_rate)

        for item in estimate.line_items:
            item.calculate(labor_rate, tax_rate, op_rate)


# =============================================================================
# PRICING IMPORT UTILITY
# =============================================================================

def import_pricing_database(json_path: str) -> Dict:
    """
    Import pricing data from JSON file.
    Run once during setup: import_pricing_database('flask_integration/data/pricing_database.json')
    """
    with open(json_path, 'r') as f:
        data = json.load(f)

    stats = {'conduit': 0, 'wire': 0, 'line_items': 0}

    # Import conduit
    for item in data.get('conduit', []):
        pricing = PricingItem(
            category='CONDUIT',
            subcategory=item['type'],
            name=item['name'],
            size=item['size'],
            material_cost=item['materialCostPer100ft'],
            labor_hours=item['laborHoursPer100ft'],
            unit_type='C'
        )
        db.session.add(pricing)
        stats['conduit'] += 1

    # Import wire
    for item in data.get('wire', []):
        pricing = PricingItem(
            category='WIRE',
            subcategory=f"{item['material']}_{item['type']}",
            name=item['name'],
            size=item['size'],
            material_cost=item['materialCostPer1000ft'],
            labor_hours=item['laborHoursPer1000ft'],
            unit_type='M',
            market_price=item.get('marketPricePer1000ft')
        )
        db.session.add(pricing)
        stats['wire'] += 1

    # Import line items (equipment, devices, fixtures)
    for item in data.get('lineItems', []):
        pricing = PricingItem(
            category=item['category'],
            name=item['name'],
            material_cost=item['materialUnitCost'],
            labor_hours=item['laborHoursPerUnit'],
            unit_type=item.get('unitType', 'E')
        )
        db.session.add(pricing)
        stats['line_items'] += 1

    db.session.commit()
    logger.info(f"Imported pricing database: {stats}")
    return stats
