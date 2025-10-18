"""
Optimization Repository - Handles cost calculations and optimization scenarios

This module provides cost calculation and allocation optimization for products.
"""

from typing import Dict, List, Any, Tuple
from db.products_repository import get_products_repo
from db.pricing_repository import get_pricing_repo


class OptimizationRepository:
    """Repository for optimization calculations and scenarios"""

    def __init__(self):
        self.products_repo = get_products_repo()
        self.pricing_repo = get_pricing_repo()

    def calculate_current_cost(self, product_quantities: Dict[int, int]) -> Dict[str, Any]:
        """Calculate current cost based on product quantities using tier-based pricing."""
        
        total_credit_files = sum(product_quantities.values())
        total_cost = 0.0
        provider_breakdown = {}
        product_breakdown = {}
        provider_tiers = {}
        
        all_providers = self.pricing_repo.get_all_providers()
        
        for provider in all_providers:
            if provider.status != 'active':
                continue
                
            provider_id = provider.provider_id
            provider_name = provider.company_name
            
            override = self.pricing_repo.get_provider_tier_override(provider_id)
            if override:
                effective_tier = override.manual_tier
                calculated_tier = self.pricing_repo.get_tier_for_credit_files(provider_id, total_credit_files)
            else:
                effective_tier = self.pricing_repo.get_tier_for_credit_files(provider_id, total_credit_files)
                calculated_tier = effective_tier
            
            provider_tiers[provider_name] = {
                'provider_id': provider_id,
                'calculated_tier': calculated_tier,
                'override_tier': override.manual_tier if override else None,
                'effective_tier': effective_tier,
                'total_credit_files': total_credit_files
            }
            
            provider_cost = 0.0
            
            for product_id, credit_files in product_quantities.items():
                product = self.products_repo.get_product(product_id)
                if not product:
                    continue
                
                item_ids = self.products_repo.get_item_ids_for_product(product_id)
                allocations = self.products_repo.get_allocations_for_product(product_id)
                multipliers = self.products_repo.get_price_multipliers_for_product(product_id)
                
                product_cost_for_provider = 0.0
                
                for item_id in item_ids:
                    item = self.pricing_repo.get_item(item_id)
                    if not item or item.status != 'active':
                        continue
                    
                    provider_ids_for_item = self.pricing_repo.get_providers_for_item(item_id)
                    if provider_id not in provider_ids_for_item:
                        continue
                    
                    price = self.pricing_repo.get_price_for_item_at_tier(provider_id, item_id, effective_tier)
                    if price is None:
                        continue
                    
                    multiplier_info = multipliers.get(item_id, {})
                    multiplier = multiplier_info.get('multiplier', 1.0) if isinstance(multiplier_info, dict) else 1.0
                    
                    cost = credit_files * price * multiplier
                    product_cost_for_provider += cost
                    
                    if provider_name not in provider_breakdown:
                        provider_breakdown[provider_name] = {
                            'provider_id': provider_id,
                            'items': {},
                            'total_cost': 0.0,
                            'total_units': 0,
                            'tier_info': provider_tiers[provider_name]
                        }
                    
                    if item.item_name not in provider_breakdown[provider_name]['items']:
                        provider_breakdown[provider_name]['items'][item.item_name] = []
                    
                    provider_breakdown[provider_name]['items'][item.item_name].append({
                        'product_name': product.name,
                        'product_id': product_id,
                        'credit_files': credit_files,
                        'unit_price': price,
                        'multiplier': multiplier,
                        'cost': cost,
                        'tier': effective_tier
                    })
                
                if product_cost_for_provider > 0:
                    provider_cost += product_cost_for_provider
                    
                    if product_id not in product_breakdown:
                        product_breakdown[product_id] = {
                            'product_name': product.name,
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
            'provider_tiers': provider_tiers
        }

    def get_provider_tier_status(self, product_quantities: Dict[int, int]) -> Dict[str, Any]:
        """Get tier status for all providers."""
        
        total_credit_files = sum(product_quantities.values())
        tier_status = {}
        
        all_providers = self.pricing_repo.get_all_providers()
        
        for provider in all_providers:
            if provider.status != 'active':
                continue
            
            provider_id = provider.provider_id
            provider_name = provider.company_name
            
            calculated_tier = self.pricing_repo.get_tier_for_credit_files(provider_id, total_credit_files)
            override = self.pricing_repo.get_provider_tier_override(provider_id)
            
            tier_status[provider_name] = {
                'provider_id': provider_id,
                'calculated_tier': calculated_tier,
                'override_tier': override.manual_tier if override else None,
                'effective_tier': override.manual_tier if override else calculated_tier,
                'total_credit_files': total_credit_files,
                'override_notes': override.notes if override else None
            }
        
        return tier_status

    def get_all_active_products(self) -> List[Dict[str, Any]]:
        """Get all active products for optimization input"""
        
        products = self.products_repo.get_all_products()
        result = []
        
        for product in products:
            if product.status == 'active':
                item_ids = self.products_repo.get_item_ids_for_product(product.product_id)
                result.append({
                    'product_id': product.product_id,
                    'name': product.name,
                    'description': product.description,
                    'item_count': len(item_ids)
                })
        
        return result


# Global instance
optimization_repo = None


def get_optimization_repo():
    """Get or create the global optimization repository instance"""
    global optimization_repo
    if optimization_repo is None:
        optimization_repo = OptimizationRepository()
    return optimization_repo
