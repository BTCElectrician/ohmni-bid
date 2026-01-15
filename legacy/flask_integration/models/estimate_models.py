"""
Ohmni Estimate - SQLAlchemy Models
Drop into: backend/models/estimate_models.py

Then add to backend/models/__init__.py:
    from .estimate_models import Estimate, EstimateLineItem, PricingItem, Proposal
"""

from datetime import datetime
from sqlalchemy import Index
from sqlalchemy.dialects.postgresql import JSONB
from backend.extensions import db
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class PricingItem(db.Model):
    """
    Master pricing database - conduit, wire, equipment, devices, fixtures
    Import from pricing_database.json on setup
    """
    __tablename__ = 'pricing_items'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    # Classification
    category = db.Column(db.String(50), nullable=False, index=True)
    # CONDUIT, WIRE, EQUIPMENT, DEVICE, FIXTURE, TEMP_POWER, MECHANICAL, FIRE_ALARM, etc.

    subcategory = db.Column(db.String(50), nullable=True)
    # For conduit: EMT_SS, EMT_COMP, HW, IMC, PVC, PVC_GRC
    # For wire: CU_THHN, AL_THHN

    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # Sizing (for conduit/wire)
    size = db.Column(db.String(20), nullable=True)  # "1/2", "3/4", "#12", "500 MCM"

    # Pricing
    material_cost = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    labor_hours = db.Column(db.Numeric(8, 3), nullable=False, default=0)

    # Unit type: E=Each, C=per 100ft, M=per 1000ft, Lot=Lump sum
    unit_type = db.Column(db.String(10), nullable=False, default='E')

    # For wire - track market price separately for updates
    market_price = db.Column(db.Numeric(10, 2), nullable=True)
    markup_percent = db.Column(db.Numeric(5, 4), nullable=True)

    # Metadata
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Search optimization
    __table_args__ = (
        Index('idx_pricing_category_name', 'category', 'name'),
        Index('idx_pricing_subcategory', 'subcategory'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'subcategory': self.subcategory,
            'name': self.name,
            'description': self.description,
            'size': self.size,
            'material_cost': float(self.material_cost) if self.material_cost else 0,
            'labor_hours': float(self.labor_hours) if self.labor_hours else 0,
            'unit_type': self.unit_type,
            'market_price': float(self.market_price) if self.market_price else None,
        }


class Estimate(db.Model):
    """
    A complete electrical estimate/bid
    Can be linked to a ChatSession for conversational estimates
    """
    __tablename__ = 'estimates'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)

    # Optional link to chat session (for conversational estimates)
    chat_session_id = db.Column(db.String(36), db.ForeignKey('chat_sessions.id'), nullable=True)

    # Project info
    project_name = db.Column(db.String(255), nullable=False)
    project_number = db.Column(db.String(50), nullable=True)
    project_location = db.Column(db.Text, nullable=True)

    # Client info
    gc_name = db.Column(db.String(255), nullable=True)
    contact_name = db.Column(db.String(255), nullable=True)
    contact_email = db.Column(db.String(255), nullable=True)
    contact_phone = db.Column(db.String(50), nullable=True)

    # Project specs
    square_footage = db.Column(db.Integer, nullable=True)
    project_type = db.Column(db.String(50), nullable=True)  # warehouse, office, retail, industrial

    # Pricing parameters (can override defaults per estimate)
    labor_rate = db.Column(db.Numeric(10, 2), default=118.00)
    material_tax_rate = db.Column(db.Numeric(5, 4), default=0.1025)
    overhead_profit_rate = db.Column(db.Numeric(5, 4), default=0)

    # Calculated totals (denormalized for quick access)
    total_material = db.Column(db.Numeric(12, 2), default=0)
    total_material_with_tax = db.Column(db.Numeric(12, 2), default=0)
    total_labor_hours = db.Column(db.Numeric(10, 2), default=0)
    total_labor_cost = db.Column(db.Numeric(12, 2), default=0)
    subtotal = db.Column(db.Numeric(12, 2), default=0)
    overhead_profit = db.Column(db.Numeric(12, 2), default=0)
    final_bid = db.Column(db.Numeric(12, 2), default=0)
    price_per_sqft = db.Column(db.Numeric(8, 2), nullable=True)

    # Status tracking
    status = db.Column(db.String(20), default='draft')  # draft, submitted, won, lost
    submitted_at = db.Column(db.DateTime, nullable=True)
    outcome_at = db.Column(db.DateTime, nullable=True)
    won_amount = db.Column(db.Numeric(12, 2), nullable=True)  # Actual contract amount if won

    # Metadata for AI learning
    estimate_metadata = db.Column(JSONB, default=dict)
    # Store: source (chat/photo/manual), confidence scores, AI suggestions, etc.

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    line_items = db.relationship('EstimateLineItem', backref='estimate', lazy='dynamic',
                                  cascade='all, delete-orphan')
    proposals = db.relationship('Proposal', backref='estimate', lazy='dynamic',
                                 cascade='all, delete-orphan')
    user = db.relationship('User', backref='estimates')

    def to_dict(self, include_line_items=False):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'chat_session_id': self.chat_session_id,
            'project_name': self.project_name,
            'project_number': self.project_number,
            'project_location': self.project_location,
            'gc_name': self.gc_name,
            'contact_name': self.contact_name,
            'square_footage': self.square_footage,
            'project_type': self.project_type,
            'labor_rate': float(self.labor_rate) if self.labor_rate else 118.00,
            'material_tax_rate': float(self.material_tax_rate) if self.material_tax_rate else 0.1025,
            'overhead_profit_rate': float(self.overhead_profit_rate) if self.overhead_profit_rate else 0,
            'total_material': float(self.total_material) if self.total_material else 0,
            'total_material_with_tax': float(self.total_material_with_tax) if self.total_material_with_tax else 0,
            'total_labor_hours': float(self.total_labor_hours) if self.total_labor_hours else 0,
            'total_labor_cost': float(self.total_labor_cost) if self.total_labor_cost else 0,
            'subtotal': float(self.subtotal) if self.subtotal else 0,
            'overhead_profit': float(self.overhead_profit) if self.overhead_profit else 0,
            'final_bid': float(self.final_bid) if self.final_bid else 0,
            'price_per_sqft': float(self.price_per_sqft) if self.price_per_sqft else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_line_items:
            data['line_items'] = [item.to_dict() for item in self.line_items]
            data['category_totals'] = self.get_category_totals()
        return data

    def get_category_totals(self):
        """Calculate totals by category"""
        totals = {}
        for item in self.line_items:
            cat = item.category
            if cat not in totals:
                totals[cat] = 0
            totals[cat] += float(item.total_cost) if item.total_cost else 0
        return totals

    def recalculate_totals(self):
        """Recalculate all totals from line items"""
        total_material = 0
        total_labor_hours = 0

        for item in self.line_items:
            total_material += float(item.material_extension) if item.material_extension else 0
            total_labor_hours += float(item.labor_extension) if item.labor_extension else 0

        labor_rate = float(self.labor_rate) if self.labor_rate else 118.00
        tax_rate = float(self.material_tax_rate) if self.material_tax_rate else 0.1025
        op_rate = float(self.overhead_profit_rate) if self.overhead_profit_rate else 0

        self.total_material = total_material
        self.total_material_with_tax = total_material * (1 + tax_rate)
        self.total_labor_hours = total_labor_hours
        self.total_labor_cost = total_labor_hours * labor_rate
        self.subtotal = self.total_material_with_tax + self.total_labor_cost
        self.overhead_profit = float(self.subtotal) * op_rate
        self.final_bid = round(float(self.subtotal) + float(self.overhead_profit))

        if self.square_footage and self.square_footage > 0:
            self.price_per_sqft = float(self.final_bid) / self.square_footage


class EstimateLineItem(db.Model):
    """
    Individual line items within an estimate
    """
    __tablename__ = 'estimate_line_items'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    estimate_id = db.Column(db.String(36), db.ForeignKey('estimates.id'), nullable=False, index=True)

    # Optional link to master pricing item
    pricing_item_id = db.Column(db.String(36), db.ForeignKey('pricing_items.id'), nullable=True)

    # Category for grouping
    category = db.Column(db.String(50), nullable=False)
    # TEMP_POWER, ELECTRICAL_SERVICE, MECHANICAL_CONNECTIONS, INTERIOR_LIGHTING,
    # EXTERIOR_LIGHTING, POWER_RECEPTACLES, SITE_CONDUITS, SECURITY, FIRE_ALARM, GENERAL_CONDITIONS

    # Item details
    description = db.Column(db.Text, nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    unit_type = db.Column(db.String(10), nullable=False, default='E')

    # Pricing (snapshot at time of estimate)
    material_unit_cost = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    labor_hours_per_unit = db.Column(db.Numeric(8, 3), nullable=False, default=0)

    # Calculated extensions
    material_extension = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    labor_extension = db.Column(db.Numeric(10, 3), nullable=False, default=0)
    total_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    # Source tracking
    source = db.Column(db.String(20), default='manual')  # manual, chat, photo, import

    # AI metadata
    ai_confidence = db.Column(db.Numeric(3, 2), nullable=True)  # 0.00 to 1.00
    ai_notes = db.Column(db.Text, nullable=True)

    # Ordering
    sort_order = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to pricing item
    pricing_item = db.relationship('PricingItem', backref='line_items')

    def to_dict(self):
        return {
            'id': self.id,
            'estimate_id': self.estimate_id,
            'pricing_item_id': self.pricing_item_id,
            'category': self.category,
            'description': self.description,
            'quantity': float(self.quantity) if self.quantity else 0,
            'unit_type': self.unit_type,
            'material_unit_cost': float(self.material_unit_cost) if self.material_unit_cost else 0,
            'labor_hours_per_unit': float(self.labor_hours_per_unit) if self.labor_hours_per_unit else 0,
            'material_extension': float(self.material_extension) if self.material_extension else 0,
            'labor_extension': float(self.labor_extension) if self.labor_extension else 0,
            'total_cost': float(self.total_cost) if self.total_cost else 0,
            'source': self.source,
            'ai_confidence': float(self.ai_confidence) if self.ai_confidence else None,
            'sort_order': self.sort_order,
        }

    def calculate(self, labor_rate=118.00, tax_rate=0.1025, op_rate=0):
        """Calculate extensions and total cost"""
        qty = float(self.quantity) if self.quantity else 0
        mat_cost = float(self.material_unit_cost) if self.material_unit_cost else 0
        labor_hrs = float(self.labor_hours_per_unit) if self.labor_hours_per_unit else 0

        # Calculate extensions based on unit type
        if self.unit_type == 'C':  # Per 100 ft
            self.material_extension = (qty * mat_cost) / 100
            self.labor_extension = (qty * labor_hrs) / 100
        elif self.unit_type == 'M':  # Per 1000 ft
            self.material_extension = (qty * mat_cost) / 1000
            self.labor_extension = (qty * labor_hrs) / 1000
        else:  # Each or Lot
            self.material_extension = qty * mat_cost
            self.labor_extension = qty * labor_hrs

        # Calculate total: ((labor × rate) + (material × (1 + tax))) × (1 + O&P)
        labor_cost = float(self.labor_extension) * labor_rate
        material_with_tax = float(self.material_extension) * (1 + tax_rate)
        subtotal = labor_cost + material_with_tax
        self.total_cost = subtotal * (1 + op_rate)


class Proposal(db.Model):
    """
    Generated proposal documents from estimates
    """
    __tablename__ = 'proposals'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    estimate_id = db.Column(db.String(36), db.ForeignKey('estimates.id'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)

    # Document content
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=True)  # Markdown or HTML

    # Scope of work (auto-generated or custom)
    scope_of_work = db.Column(db.Text, nullable=True)
    exclusions = db.Column(db.Text, nullable=True)

    # PDF storage
    pdf_url = db.Column(db.String(500), nullable=True)

    # Validity
    valid_days = db.Column(db.Integer, default=30)
    valid_until = db.Column(db.DateTime, nullable=True)

    # Versioning
    version = db.Column(db.Integer, default=1)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'estimate_id': self.estimate_id,
            'title': self.title,
            'content': self.content,
            'scope_of_work': self.scope_of_work,
            'exclusions': self.exclusions,
            'pdf_url': self.pdf_url,
            'valid_days': self.valid_days,
            'valid_until': self.valid_until.isoformat() if self.valid_until else None,
            'version': self.version,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
