"""
Ohmni Estimate - API Routes
Drop into: backend/routes/estimation_routes.py

Register in app_minimal.py:
    from backend.routes.estimation_routes import estimation_bp
    app.register_blueprint(estimation_bp, url_prefix='/api/estimates')
"""

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging

from backend.services.estimation_service import EstimationService, import_pricing_database
from backend.models.estimate_models import Estimate, EstimateLineItem, PricingItem
from backend.extensions import db

logger = logging.getLogger(__name__)

estimation_bp = Blueprint('estimation', __name__)


# =============================================================================
# HELPER
# =============================================================================

def get_service():
    """Get estimation service for current user."""
    user_id = get_jwt_identity()
    return EstimationService(user_id)


# =============================================================================
# ESTIMATE CRUD ENDPOINTS
# =============================================================================

@estimation_bp.route('', methods=['POST'])
@jwt_required()
def create_estimate():
    """
    Create a new estimate.

    POST /api/estimates
    {
        "project_name": "Office Buildout",
        "project_type": "office",
        "square_footage": 5000,
        "gc_name": "ABC Construction",
        "project_location": "123 Main St",
        "labor_rate": 118.00,
        "material_tax_rate": 0.1025,
        "overhead_profit_rate": 0.15
    }
    """
    try:
        data = request.get_json()
        service = get_service()

        estimate = service.create_estimate(
            project_name=data.get('project_name', 'New Estimate'),
            project_type=data.get('project_type'),
            square_footage=data.get('square_footage'),
            gc_name=data.get('gc_name'),
            project_location=data.get('project_location'),
            chat_session_id=data.get('chat_session_id'),
            labor_rate=data.get('labor_rate', 118.00),
            material_tax_rate=data.get('material_tax_rate', 0.1025),
            overhead_profit_rate=data.get('overhead_profit_rate', 0)
        )

        return jsonify({
            'success': True,
            'estimate': estimate.to_dict()
        }), 201

    except Exception as e:
        logger.error(f"Error creating estimate: {e}")
        return jsonify({'error': str(e)}), 500


@estimation_bp.route('', methods=['GET'])
@jwt_required()
def list_estimates():
    """
    List user's estimates.

    GET /api/estimates?status=draft&limit=20
    """
    try:
        service = get_service()
        status = request.args.get('status')
        limit = request.args.get('limit', 50, type=int)

        estimates = service.get_user_estimates(status=status, limit=limit)

        return jsonify({
            'success': True,
            'estimates': [e.to_dict() for e in estimates],
            'count': len(estimates)
        })

    except Exception as e:
        logger.error(f"Error listing estimates: {e}")
        return jsonify({'error': str(e)}), 500


@estimation_bp.route('/<estimate_id>', methods=['GET'])
@jwt_required()
def get_estimate(estimate_id):
    """
    Get estimate with line items.

    GET /api/estimates/{id}
    """
    try:
        service = get_service()
        estimate = service.get_estimate(estimate_id)

        if not estimate:
            return jsonify({'error': 'Estimate not found'}), 404

        return jsonify({
            'success': True,
            'estimate': estimate.to_dict(include_line_items=True)
        })

    except Exception as e:
        logger.error(f"Error getting estimate: {e}")
        return jsonify({'error': str(e)}), 500


@estimation_bp.route('/<estimate_id>', methods=['PATCH'])
@jwt_required()
def update_estimate(estimate_id):
    """
    Update estimate fields.

    PATCH /api/estimates/{id}
    {
        "project_name": "Updated Name",
        "overhead_profit_rate": 0.20
    }
    """
    try:
        data = request.get_json()
        service = get_service()

        estimate = service.update_estimate(estimate_id, **data)

        if not estimate:
            return jsonify({'error': 'Estimate not found'}), 404

        return jsonify({
            'success': True,
            'estimate': estimate.to_dict(include_line_items=True)
        })

    except Exception as e:
        logger.error(f"Error updating estimate: {e}")
        return jsonify({'error': str(e)}), 500


@estimation_bp.route('/<estimate_id>', methods=['DELETE'])
@jwt_required()
def delete_estimate(estimate_id):
    """
    Delete an estimate.

    DELETE /api/estimates/{id}
    """
    try:
        service = get_service()
        success = service.delete_estimate(estimate_id)

        if not success:
            return jsonify({'error': 'Estimate not found'}), 404

        return jsonify({'success': True})

    except Exception as e:
        logger.error(f"Error deleting estimate: {e}")
        return jsonify({'error': str(e)}), 500


# =============================================================================
# LINE ITEM ENDPOINTS
# =============================================================================

@estimation_bp.route('/<estimate_id>/items', methods=['POST'])
@jwt_required()
def add_line_item(estimate_id):
    """
    Add a line item to an estimate.

    POST /api/estimates/{id}/items
    {
        "category": "POWER_RECEPTACLES",
        "description": "Duplex Receptacle",
        "quantity": 25,
        "material_unit_cost": 60.00,
        "labor_hours_per_unit": 1.30,
        "unit_type": "E"
    }

    OR use pricing_item_id:
    {
        "pricing_item_id": "uuid-here",
        "quantity": 25
    }
    """
    try:
        data = request.get_json()
        service = get_service()

        # Check if using pricing item
        if 'pricing_item_id' in data:
            item = service.add_line_item_from_pricing(
                estimate_id=estimate_id,
                pricing_item_id=data['pricing_item_id'],
                quantity=data.get('quantity', 1),
                source=data.get('source', 'manual')
            )
        else:
            item = service.add_line_item(
                estimate_id=estimate_id,
                category=data.get('category', 'GENERAL_CONDITIONS'),
                description=data['description'],
                quantity=data.get('quantity', 1),
                material_unit_cost=data.get('material_unit_cost', 0),
                labor_hours_per_unit=data.get('labor_hours_per_unit', 0),
                unit_type=data.get('unit_type', 'E'),
                source=data.get('source', 'manual'),
                ai_confidence=data.get('ai_confidence'),
                ai_notes=data.get('ai_notes')
            )

        if not item:
            return jsonify({'error': 'Failed to add line item'}), 400

        # Get updated estimate
        estimate = service.get_estimate(estimate_id)

        return jsonify({
            'success': True,
            'line_item': item.to_dict(),
            'estimate_totals': {
                'total_material': float(estimate.total_material),
                'total_labor_hours': float(estimate.total_labor_hours),
                'final_bid': float(estimate.final_bid)
            }
        }), 201

    except Exception as e:
        logger.error(f"Error adding line item: {e}")
        return jsonify({'error': str(e)}), 500


@estimation_bp.route('/<estimate_id>/items/bulk', methods=['POST'])
@jwt_required()
def bulk_add_line_items(estimate_id):
    """
    Add multiple line items at once.

    POST /api/estimates/{id}/items/bulk
    {
        "items": [
            {"category": "INTERIOR_LIGHTING", "description": "2x4 LED Panel", "quantity": 50, "material_unit_cost": 50, "labor_hours_per_unit": 1.5},
            {"category": "POWER_RECEPTACLES", "description": "Duplex Receptacle", "quantity": 30, "material_unit_cost": 60, "labor_hours_per_unit": 1.3}
        ],
        "source": "chat"
    }
    """
    try:
        data = request.get_json()
        service = get_service()

        items = service.bulk_add_line_items(
            estimate_id=estimate_id,
            items=data.get('items', []),
            source=data.get('source', 'manual')
        )

        estimate = service.get_estimate(estimate_id)

        return jsonify({
            'success': True,
            'items_added': len(items),
            'estimate': estimate.to_dict(include_line_items=True)
        }), 201

    except Exception as e:
        logger.error(f"Error bulk adding line items: {e}")
        return jsonify({'error': str(e)}), 500


@estimation_bp.route('/<estimate_id>/items/<item_id>', methods=['PATCH'])
@jwt_required()
def update_line_item(estimate_id, item_id):
    """
    Update a line item.

    PATCH /api/estimates/{estimate_id}/items/{item_id}
    {
        "quantity": 30
    }
    """
    try:
        data = request.get_json()
        service = get_service()

        item = service.update_line_item(item_id, estimate_id, **data)

        if not item:
            return jsonify({'error': 'Line item not found'}), 404

        estimate = service.get_estimate(estimate_id)

        return jsonify({
            'success': True,
            'line_item': item.to_dict(),
            'estimate_totals': {
                'final_bid': float(estimate.final_bid)
            }
        })

    except Exception as e:
        logger.error(f"Error updating line item: {e}")
        return jsonify({'error': str(e)}), 500


@estimation_bp.route('/<estimate_id>/items/<item_id>', methods=['DELETE'])
@jwt_required()
def delete_line_item(estimate_id, item_id):
    """Delete a line item."""
    try:
        service = get_service()
        success = service.delete_line_item(item_id, estimate_id)

        if not success:
            return jsonify({'error': 'Line item not found'}), 404

        estimate = service.get_estimate(estimate_id)

        return jsonify({
            'success': True,
            'estimate_totals': {
                'final_bid': float(estimate.final_bid) if estimate else 0
            }
        })

    except Exception as e:
        logger.error(f"Error deleting line item: {e}")
        return jsonify({'error': str(e)}), 500


# =============================================================================
# PRICING DATABASE ENDPOINTS
# =============================================================================

@estimation_bp.route('/pricing/search', methods=['GET'])
@jwt_required()
def search_pricing():
    """
    Search pricing items.

    GET /api/estimates/pricing/search?q=receptacle&category=POWER_RECEPTACLES
    """
    try:
        query = request.args.get('q', '')
        category = request.args.get('category')
        limit = request.args.get('limit', 20, type=int)

        items = EstimationService.search_pricing_items(
            query=query,
            category=category,
            limit=limit
        )

        return jsonify({
            'success': True,
            'items': [item.to_dict() for item in items],
            'count': len(items)
        })

    except Exception as e:
        logger.error(f"Error searching pricing: {e}")
        return jsonify({'error': str(e)}), 500


@estimation_bp.route('/pricing/categories', methods=['GET'])
@jwt_required()
def get_pricing_categories():
    """
    Get all pricing categories with item counts.

    GET /api/estimates/pricing/categories
    """
    try:
        categories = db.session.query(
            PricingItem.category,
            db.func.count(PricingItem.id)
        ).filter(
            PricingItem.is_active == True
        ).group_by(PricingItem.category).all()

        return jsonify({
            'success': True,
            'categories': [
                {'name': cat, 'count': count}
                for cat, count in categories
            ]
        })

    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        return jsonify({'error': str(e)}), 500


@estimation_bp.route('/pricing/category/<category>', methods=['GET'])
@jwt_required()
def get_category_items(category):
    """
    Get all items in a category.

    GET /api/estimates/pricing/category/INTERIOR_LIGHTING
    """
    try:
        items = EstimationService.get_pricing_by_category(category.upper())

        return jsonify({
            'success': True,
            'category': category.upper(),
            'items': [item.to_dict() for item in items],
            'count': len(items)
        })

    except Exception as e:
        logger.error(f"Error getting category items: {e}")
        return jsonify({'error': str(e)}), 500


# =============================================================================
# QUICK QUOTE ENDPOINT
# =============================================================================

@estimation_bp.route('/quick-quote', methods=['POST'])
@jwt_required()
def quick_quote():
    """
    Generate a quick quote without saving.

    POST /api/estimates/quick-quote
    {
        "items": [
            {"name": "Duplex Receptacle", "quantity": 25},
            {"name": "2x4 LED", "quantity": 50},
            {"name": "Single Pole Switch", "quantity": 10}
        ],
        "labor_rate": 118.00,
        "overhead_profit_rate": 0.15
    }
    """
    try:
        data = request.get_json()
        service = get_service()

        result = service.quick_quote(
            items=data.get('items', []),
            labor_rate=data.get('labor_rate', 118.00),
            tax_rate=data.get('material_tax_rate', 0.1025),
            op_rate=data.get('overhead_profit_rate', 0)
        )

        return jsonify({
            'success': True,
            'quote': result
        })

    except Exception as e:
        logger.error(f"Error generating quick quote: {e}")
        return jsonify({'error': str(e)}), 500


# =============================================================================
# FEEDER CALCULATOR ENDPOINT
# =============================================================================

@estimation_bp.route('/calculate-feeder', methods=['POST'])
@jwt_required()
def calculate_feeder():
    """
    Calculate feeder pricing.

    POST /api/estimates/calculate-feeder
    {
        "wire_material": "CU",
        "wire_size": "#500 MCM",
        "conduit_type": "EMT_SS",
        "conduit_size": "4",
        "length_feet": 150,
        "conductor_count": 4,
        "ampacity_multiplier": 2
    }
    """
    try:
        data = request.get_json()
        service = get_service()

        result = service.calculate_feeder(
            wire_material=data['wire_material'],
            wire_size=data['wire_size'],
            conduit_type=data['conduit_type'],
            conduit_size=data['conduit_size'],
            length_feet=data['length_feet'],
            conductor_count=data.get('conductor_count', 4),
            ampacity_multiplier=data.get('ampacity_multiplier', 1.0)
        )

        return jsonify({
            'success': True,
            'feeder': result
        })

    except Exception as e:
        logger.error(f"Error calculating feeder: {e}")
        return jsonify({'error': str(e)}), 500


# =============================================================================
# OUTCOME TRACKING
# =============================================================================

@estimation_bp.route('/<estimate_id>/outcome', methods=['POST'])
@jwt_required()
def record_outcome(estimate_id):
    """
    Record bid outcome (won/lost).

    POST /api/estimates/{id}/outcome
    {
        "won": true,
        "won_amount": 125000,
        "notes": "Beat competition by 5%"
    }
    """
    try:
        data = request.get_json()
        service = get_service()

        estimate = service.record_outcome(
            estimate_id=estimate_id,
            won=data.get('won', False),
            won_amount=data.get('won_amount'),
            notes=data.get('notes')
        )

        if not estimate:
            return jsonify({'error': 'Estimate not found'}), 404

        return jsonify({
            'success': True,
            'estimate': estimate.to_dict()
        })

    except Exception as e:
        logger.error(f"Error recording outcome: {e}")
        return jsonify({'error': str(e)}), 500


# =============================================================================
# ADMIN: IMPORT PRICING DATABASE
# =============================================================================

@estimation_bp.route('/admin/import-pricing', methods=['POST'])
@jwt_required()
def import_pricing():
    """
    Import pricing database from JSON.
    Admin only - run once during setup.

    POST /api/estimates/admin/import-pricing
    {
        "json_path": "flask_integration/data/pricing_database.json"
    }
    """
    try:
        # TODO: Add admin role check
        data = request.get_json()
        json_path = data.get('json_path', 'flask_integration/data/pricing_database.json')

        stats = import_pricing_database(json_path)

        return jsonify({
            'success': True,
            'imported': stats
        })

    except Exception as e:
        logger.error(f"Error importing pricing: {e}")
        return jsonify({'error': str(e)}), 500
