"""
Calculation Services - Business logic for cost calculations and optimization

This module provides cost calculation and allocation optimization services.
"""

from typing import Dict, List, Any, Tuple
from db.crud import get_crud


class CalculationService:
    """Service for optimization calculations and scenarios"""

    def __init__(self):
        self.crud = get_crud()

    def calculate_current_cost(self, product_quantities: Dict[int, int]) -> Dict[str, Any]:
        """Calculate current cost based on product quantities using tier-based pricing."""

        total_credit_files = sum(product_quantities.values())
        total_cost = 0.0
        provider_breakdown = {}
        product_breakdown = {}
        provider_tiers = {}
        allocation_details = {}

        all_providers = self.crud.get_all_providers()

        for provider in all_providers:
            if provider[3] != 'active':
                continue

            provider_id = provider[0]
            provider_name = provider[1]

            override = self.crud.get_provider_tier_override(provider_id)
            if override:
                effective_tier = override[1]
                calculated_tier = self.crud.get_tier_for_credit_files(provider_id, total_credit_files)
            else:
                effective_tier = self.crud.get_tier_for_credit_files(provider_id, total_credit_files)
                calculated_tier = effective_tier

            provider_tiers[provider_name] = {
                'provider_id': provider_id,
                'calculated_tier': calculated_tier,
                'override_tier': override[1] if override else None,
                'effective_tier': effective_tier,
                'total_credit_files': total_credit_files
            }

            provider_cost = 0.0

            for product_id, credit_files in product_quantities.items():
                product = self.crud.get_product(product_id)
                if not product:
                    continue

                if product_id not in allocation_details:
                    allocation_details[product_id] = {
                        'product_name': product[1],
                        'items': {}
                    }

                item_ids = self.crud.get_item_ids_for_product(product_id)
                allocations = self.crud.get_allocations_for_product(product_id)
                multipliers = self.crud.get_price_multipliers_for_product(product_id)

                product_cost_for_provider = 0.0

                for item_id in item_ids:
                    item = self.crud.get_item(item_id)
                    if not item or item[3] != 'active':
                        continue

                    if item_id not in allocation_details[product_id]['items']:
                        item_alloc = allocations.get(item_id) or allocations.get(str(item_id)) or {}
                        providers_alloc = []
                        for pa in item_alloc.get('providers', []):
                            prov_id = pa.get('provider_id')
                            prov = self.crud.get_provider(prov_id)
                            providers_alloc.append({
                                'provider_id': prov_id,
                                'provider_name': prov[1] if prov else '',
                                'mode': item_alloc.get('mode') or item_alloc.get('allocation_mode') or 'percentage',
                                'value': pa.get('value', 0)
                            })
                        allocation_details[product_id]['items'][item_id] = {
                            'item_name': item[1],
                            'allocations': providers_alloc
                        }

                    item_alloc = allocations.get(item_id) or allocations.get(str(item_id)) or {}
                    providers_list = item_alloc.get('providers', [])
                    mode = item_alloc.get('mode') or item_alloc.get('allocation_mode') or 'percentage'
                    alloc_entry = next((pa for pa in providers_list if pa.get('provider_id') == provider_id), None)
                    if not alloc_entry:
                        continue

                    value = float(alloc_entry.get('value', 0))
                    if mode == 'percentage':
                        assigned_files = credit_files * (value / 100.0)
                    elif mode == 'units':
                        assigned_files = value
                    else:
                        assigned_files = 0.0

                    if assigned_files <= 0:
                        continue

                    price = self.crud.get_price_for_item_at_tier(provider_id, item_id, effective_tier)
                    if price is None:
                        continue

                    multiplier_info = multipliers.get(item_id, {})
                    multiplier = multiplier_info.get('multiplier', 1.0) if isinstance(multiplier_info, dict) else 1.0

                    cost = assigned_files * price * multiplier
                    product_cost_for_provider += cost

                    if provider_name not in provider_breakdown:
                        provider_breakdown[provider_name] = {
                            'provider_id': provider_id,
                            'items': {},
                            'total_cost': 0.0,
                            'total_units': 0,
                            'tier_info': provider_tiers[provider_name]
                        }

                    if item[1] not in provider_breakdown[provider_name]['items']:
                        provider_breakdown[provider_name]['items'][item[1]] = []

                    provider_breakdown[provider_name]['items'][item[1]].append({
                        'product_name': product[1],
                        'product_id': product_id,
                        'credit_files': assigned_files,
                        'unit_price': price,
                        'multiplier': multiplier,
                        'cost': cost,
                        'tier': effective_tier
                    })

                if product_cost_for_provider > 0:
                    provider_cost += product_cost_for_provider

                    if product_id not in product_breakdown:
                        product_breakdown[product_id] = {
                            'product_name': product[1],
                            'credit_files': credit_files,
                            'cost': 0.0
                        }
                    product_breakdown[product_id]['cost'] += product_cost_for_provider

            if provider_cost > 0:
                provider_breakdown[provider_name]['total_cost'] = provider_cost
                provider_breakdown[provider_name]['total_units'] = total_credit_files
                total_cost += provider_cost

        return {
            'total_cost': round(total_cost, 2),
            'total_credit_files': total_credit_files,
            'provider_breakdown': provider_breakdown,
            'product_breakdown': product_breakdown,
            'provider_tiers': provider_tiers,
            'allocation_details': allocation_details
        }

    def get_provider_tier_status(self, product_quantities: Dict[int, int]) -> Dict[str, Any]:
        """Get tier status for all providers."""

        total_credit_files = sum(product_quantities.values())
        tier_status = {}

        all_providers = self.crud.get_all_providers()

        for provider in all_providers:
            if provider[3] != 'active':
                continue

            provider_id = provider[0]
            provider_name = provider[1]

            calculated_tier = self.crud.get_tier_for_credit_files(provider_id, total_credit_files)
            override = self.crud.get_provider_tier_override(provider_id)

            tier_status[provider_name] = {
                'provider_id': provider_id,
                'calculated_tier': calculated_tier,
                'override_tier': override[1] if override else None,
                'effective_tier': override[1] if override else calculated_tier,
                'total_credit_files': total_credit_files,
                'override_notes': override[2] if override else None
            }

        return tier_status

    def get_all_active_products(self) -> List[Dict[str, Any]]:
        """Get all active products for optimization input"""

        products = self.crud.get_all_products()
        result = []

        for product in products:
            if product[4] == 'active':
                item_ids = self.crud.get_item_ids_for_product(product[0])
                result.append({
                    'product_id': product[0],
                    'name': product[1],
                    'description': product[2],
                    'item_count': len(item_ids)
                })

        return result

    def get_current_allocations(self, product_quantities: Dict[int, int]) -> Dict[int, int]:
        """Get current item-provider allocations from product configurations."""

        allocations = {}

        for product_id in product_quantities.keys():
            item_ids = self.crud.get_item_ids_for_product(product_id)
            product_allocations = self.crud.get_allocations_for_product(product_id)

            for item_id in item_ids:
                if item_id in allocations:
                    continue

                item_alloc = product_allocations.get(item_id) or product_allocations.get(str(item_id))
                if item_alloc and 'providers' in item_alloc:
                    providers_list = item_alloc['providers']
                    if providers_list:
                        best_provider = max(providers_list, key=lambda p: p.get('value', 0))
                        allocations[item_id] = best_provider['provider_id']
                        continue

                providers_for_item = self.crud.get_providers_for_item(item_id)
                if providers_for_item:
                    allocations[item_id] = providers_for_item[0]

        return allocations

    def calculate_cost_with_allocations(
        self,
        product_quantities: Dict[int, int],
        allocations: Dict[int, int]
    ) -> Dict[str, Any]:
        """Calculate cost using specific item-provider allocations."""

        total_credit_files = sum(product_quantities.values())
        total_cost = 0.0
        provider_breakdown = {}
        product_breakdown = {}
        provider_tiers = {}
        allocation_details = {}

        all_providers = self.crud.get_all_providers()

        for provider in all_providers:
            if provider[3] != 'active':
                continue

            provider_id = provider[0]
            provider_name = provider[1]

            override = self.crud.get_provider_tier_override(provider_id)
            if override:
                effective_tier = override[1]
                calculated_tier = self.crud.get_tier_for_credit_files(provider_id, total_credit_files)
            else:
                effective_tier = self.crud.get_tier_for_credit_files(provider_id, total_credit_files)
                calculated_tier = effective_tier

            provider_tiers[provider_name] = {
                'provider_id': provider_id,
                'calculated_tier': calculated_tier,
                'override_tier': override[1] if override else None,
                'effective_tier': effective_tier,
                'total_credit_files': total_credit_files
            }

            provider_cost = 0.0

            for product_id, credit_files in product_quantities.items():
                product = self.crud.get_product(product_id)
                if not product:
                    continue

                if product_id not in allocation_details:
                    allocation_details[product_id] = {
                        'product_name': product[1],
                        'items': {}
                    }

                item_ids = self.crud.get_item_ids_for_product(product_id)
                multipliers = self.crud.get_price_multipliers_for_product(product_id)

                product_alloc = allocations.get(product_id) or allocations.get(str(product_id)) or {}
                items_alloc = product_alloc.get('items', {}) if isinstance(product_alloc, dict) else {}

                for item_id in item_ids:
                    item = self.crud.get_item(item_id)
                    if not item or item[3] != 'active':
                        continue

                    item_alloc_def = items_alloc.get(item_id) or items_alloc.get(str(item_id))
                    if isinstance(item_alloc_def, dict) and item_id not in allocation_details[product_id]['items']:
                        allocs = []
                        for pa in item_alloc_def.get('allocations', []):
                            prov = self.crud.get_provider(pa.get('provider_id'))
                            allocs.append({
                                'provider_id': pa.get('provider_id'),
                                'provider_name': prov[1] if prov else '',
                                'mode': item_alloc_def.get('mode', 'percentage'),
                                'value': pa.get('value', 0)
                            })
                        allocation_details[product_id]['items'][item_id] = {
                            'item_name': item[1],
                            'allocations': allocs
                        }

                    assigned_files = 0.0
                    if isinstance(item_alloc_def, dict) and 'allocations' in item_alloc_def:
                        mode = item_alloc_def.get('mode', 'percentage')
                        pa = next((p for p in item_alloc_def['allocations'] if p.get('provider_id') == provider_id), None)
                        if pa:
                            value = float(pa.get('value', 0))
                            if mode == 'percentage':
                                assigned_files = credit_files * (value / 100.0)
                            elif mode == 'units':
                                assigned_files = value
                    else:
                        selected_provider = allocations.get(item_id)
                        if selected_provider == provider_id:
                            assigned_files = credit_files

                    if assigned_files <= 0:
                        continue

                    price = self.crud.get_price_for_item_at_tier(provider_id, item_id, effective_tier)
                    if price is None:
                        continue

                    multiplier_info = multipliers.get(item_id, {})
                    multiplier = multiplier_info.get('multiplier', 1.0) if isinstance(multiplier_info, dict) else 1.0

                    cost = assigned_files * price * multiplier
                    provider_cost += cost

                    if provider_name not in provider_breakdown:
                        provider_breakdown[provider_name] = {
                            'provider_id': provider_id,
                            'items': {},
                            'total_cost': 0.0,
                            'total_units': 0,
                            'tier_info': provider_tiers[provider_name]
                        }

                    if item[1] not in provider_breakdown[provider_name]['items']:
                        provider_breakdown[provider_name]['items'][item[1]] = []

                    provider_breakdown[provider_name]['items'][item[1]].append({
                        'product_name': product[1],
                        'product_id': product_id,
                        'credit_files': assigned_files,
                        'unit_price': price,
                        'multiplier': multiplier,
                        'cost': cost,
                        'tier': effective_tier
                    })

                    if product_id not in product_breakdown:
                        product_breakdown[product_id] = {
                            'product_name': product[1],
                            'credit_files': credit_files,
                            'cost': 0.0
                        }
                    product_breakdown[product_id]['cost'] += cost

            if provider_cost > 0:
                provider_breakdown[provider_name]['total_cost'] = provider_cost
                provider_breakdown[provider_name]['total_units'] = total_credit_files
                total_cost += provider_cost

        return {
            'total_cost': round(total_cost, 2),
            'total_credit_files': total_credit_files,
            'provider_breakdown': provider_breakdown,
            'product_breakdown': product_breakdown,
            'provider_tiers': provider_tiers,
            'allocations': allocations,
            'allocation_details': allocation_details
        }


# Global calculation service instance
_calculation_service = None


def get_calculation_service():
    """Get or create the global calculation service instance"""
    global _calculation_service
    if _calculation_service is None:
        _calculation_service = CalculationService()
    return _calculation_service
