"""
Calculation Services - Business logic for cost calculations and optimization

This module provides cost calculation and allocation optimization services.
"""

from typing import Dict, List, Any, Optional
from db.crud import get_crud


class CalculationService:
    """Service for optimization calculations and scenarios"""

    def __init__(self):
        self.crud = get_crud()

    def _get_contract_for_offer(self, provider_id: int, process_id: int) -> Optional[Dict[str, Any]]:
        """Find the active contract for a provider and process."""
        # This is a bit inefficient if called repeatedly, should be cached in the main loop
        # But for now, let's rely on the crud method or implement a helper
        # crud.get_contracts_for_process returns list.
        contracts = self.crud.get_contracts_for_process(process_id)
        for contract in contracts:
            if contract['provider_id'] == provider_id and contract['status'] == 'active':
                return contract
        return None

    def calculate_current_cost(self, product_quantities: Dict[Any, int], use_manual_tiers: bool = False) -> Dict[str, Any]:
        """Calculate current cost based on product quantities using tier-based pricing."""
        # Ensure keys are integers
        quantities = {int(k): int(v) for k, v in product_quantities.items()}
        
        # Get current allocations (default)
        allocations = self.get_current_allocations(quantities)
        
        return self.calculate_cost_with_allocations(quantities, allocations, use_manual_tiers=use_manual_tiers)

    def calculate_cost_with_allocations(
        self,
        product_quantities: Dict[Any, int],
        allocations: Dict[Any, Any],
        use_manual_tiers: bool = False,
        tier_volume_overrides: Optional[Dict[int, float]] = None
    ) -> Dict[str, Any]:
        """
        Calculate cost using specific item-provider allocations.
        
        Args:
            product_quantities: Dict of product_id -> quantity
            allocations: Dict of allocation definitions
            use_manual_tiers: If True, use manually selected tiers instead of calculated ones
            tier_volume_overrides: Optional Dict of provider_id -> volume to use for Tier Lookup
        """
        
        # Normalize inputs
        quantities = {int(k): int(v) for k, v in product_quantities.items()}
        tier_volume_overrides = tier_volume_overrides or {}
        
        # Normalize allocations to be accessible by item_id
        # If it's the nested structure from SimulationAllocation (product -> items -> item -> allocations)
        flat_allocations = {}
        
        # Detect structure
        first_val = next(iter(allocations.values())) if allocations else None
        is_nested_product_structure = first_val and isinstance(first_val, dict) and 'items' in first_val
        
        if is_nested_product_structure:
            for pid, pdata in allocations.items():
                items = pdata.get('items', {})
                for iid, idata in items.items():
                    flat_allocations[int(iid)] = idata # Expects {mode, allocations: []}
        else:
            # Assume it's item_id keys directly
            for k, v in allocations.items():
                flat_allocations[int(k)] = v

        # Data Collection Phase
        contract_volumes = {} # contract_id -> volume
        item_details = []     # List of calculations to be done {item_id, provider_id, volume, product_id, ...}
        
        # Pre-fetch all active providers to avoid repeated queries
        all_providers = {p['provider_id']: p for p in [
            self._row_to_dict(row, ['provider_id', 'company_name', 'details', 'status', 'date_creation', 'date_last_update']) 
            for row in self.crud.get_all_providers()
        ]}
        
        # Pre-fetch offers cache: (item_id, provider_id) -> offer
        # We can't easily pre-fetch all offers efficiently without a huge query, 
        # so we'll cache as we go or fetch all active offers once.
        all_offers = self.crud.get_all_offers()
        offers_map = {} # (item_id, provider_id) -> offer (with process_id)
        for offer in all_offers:
            if offer['status'] == 'active':
                offers_map[(offer['item_id'], offer['provider_id'])] = offer

        # Pre-fetch contracts: (process_id, provider_id) -> contract
        all_contracts = self.crud.get_all_contracts()
        contracts_map = {} # (process_id, provider_id) -> contract
        for contract in all_contracts:
            if contract['status'] == 'active':
                contracts_map[(contract['process_id'], contract['provider_id'])] = contract

        # 1. Aggregate Volumes
        for product_id, total_units in quantities.items():
            product = self.crud.get_product(product_id)
            if not product: continue
            
            # Get items for product
            product_items = self.crud.get_items_for_product(product_id)
            
            # Get Multipliers
            multipliers = self.crud.get_price_multipliers_for_product(product_id)
            
            for item_row in product_items:
                # item_row is tuple from get_items_for_product or dict? 
                # get_items_for_product returns list of rows (tuples)
                item_id = item_row[0]
                item_name = item_row[1]
                
                # Determine allocation for this item
                alloc_def = flat_allocations.get(item_id)
                
                # Distribute volume to providers
                item_provider_volumes = {}
                
                if not alloc_def:
                    # No allocation defined, skip or default? 
                    # Assuming allocations are complete for this calculation
                    continue
                    
                if isinstance(alloc_def, int):
                    # Simple provider_id
                    item_provider_volumes[alloc_def] = total_units
                elif isinstance(alloc_def, dict):
                    mode = alloc_def.get('mode', 'percentage')
                    # Handle both 'providers' (backend format) and 'allocations' (frontend format) keys
                    providers_list = alloc_def.get('allocations') or alloc_def.get('providers') or []
                    
                    for entry in providers_list:
                        p_id = int(entry.get('provider_id'))
                        val = float(entry.get('value', 0))
                        
                        if mode == 'percentage':
                            vol = total_units * (val / 100.0)
                        else:
                            vol = val
                            
                        if vol > 0:
                            item_provider_volumes[p_id] = vol

                # Process each provider for this item
                for provider_id, volume in item_provider_volumes.items():
                    # Find Offer to link to Contract
                    offer = offers_map.get((item_id, provider_id))
                    
                    contract_id = None
                    process_id = None
                    
                    if offer:
                        process_id = offer['process_id']
                        contract = contracts_map.get((process_id, provider_id))
                        if contract:
                            contract_id = contract['contract_id']
                    
                    if contract_id:
                        contract_volumes[contract_id] = contract_volumes.get(contract_id, 0) + volume
                    
                    # Store detail for Cost Step
                    item_details.append({
                        'product_id': product_id,
                        'product_name': product['name'],
                        'item_id': item_id,
                        'item_name': item_name,
                        'provider_id': provider_id,
                        'provider_name': all_providers.get(provider_id, {}).get('company_name', 'Unknown'),
                        'volume': volume,
                        'contract_id': contract_id,
                        'process_id': process_id,
                        'multiplier': multipliers.get(item_id, {}).get('multiplier', 1.0)
                    })

        # 2. Determine Tiers
        contract_active_tiers = {} # contract_id -> tier_number
        
        # Helper to find contract provider
        contract_providers = {} # contract_id -> provider_id
        for (pid, prov_id), c in contracts_map.items():
            contract_providers[c['contract_id']] = prov_id

        for contract_id, total_vol in contract_volumes.items():
            # Determine lookup volume
            lookup_vol = total_vol
            provider_id = contract_providers.get(contract_id)
            
            if provider_id and provider_id in tier_volume_overrides:
                lookup_vol = tier_volume_overrides[provider_id]
            
            tiers = self.crud.get_contract_tiers_for_contract(contract_id)
            # Sort by threshold
            tiers.sort(key=lambda x: x['threshold_units'])
            
            active_tier = 1
            found = False
            
            # Find the highest tier where volume < threshold
            for t in tiers:
                if t['threshold_units'] > lookup_vol:
                    active_tier = t['tier_number']
                    found = True
                    break
            
            if not found and tiers:
                # Exceeds all thresholds, use highest tier
                active_tier = tiers[-1]['tier_number']
            
            tier_source = 'calculated'
            if use_manual_tiers:
                # Check for manual selection
                selected = next((t for t in tiers if t['is_selected']), None)
                if selected:
                    active_tier = selected['tier_number']
                    tier_source = 'manual'
                
            contract_active_tiers[contract_id] = {'tier': active_tier, 'source': tier_source, 'lookup_volume': lookup_vol}

        # 3. Calculate Costs
        total_cost = 0.0
        provider_breakdown = {}
        product_breakdown = {}
        allocation_details_out = {} # Structured for frontend
        
        for detail in item_details:
            contract_id = detail['contract_id']
            tier_info = contract_active_tiers.get(contract_id, {'tier': 1, 'source': 'default', 'lookup_volume': 0})
            tier = tier_info['tier']
            
            # Get Price
            price = 0.0
            if detail['process_id']:
                price = self.crud.get_price_for_item_at_tier(
                    detail['provider_id'], 
                    detail['item_id'], 
                    tier, 
                    detail['process_id']
                ) or 0.0
            
            cost = detail['volume'] * price * detail['multiplier']
            total_cost += cost
            
            # Aggregations
            p_name = detail['provider_name']
            if p_name not in provider_breakdown:
                provider_breakdown[p_name] = {
                    'total_cost': 0,
                    'total_units': 0,
                    'tier_info': {'effective_tier': tier, 'source': tier_info['source'], 'lookup_volume': tier_info.get('lookup_volume', 0)},
                    'rows': []
                }
            
            provider_breakdown[p_name]['total_cost'] += cost
            provider_breakdown[p_name]['total_units'] += detail['volume']
            
            # Detailed Item Row
            provider_breakdown[p_name]['rows'].append({
                'item_name': detail['item_name'],
                'allocated_units': detail['volume'],
                'price_per_unit': price,
                'multiplier_display': detail['multiplier'] if detail['multiplier'] != 1.0 else '-',
                'total_cost': cost,
                'calculated_tier': tier
            })
            
            prod_id = detail['product_id']
            if prod_id not in product_breakdown:
                product_breakdown[prod_id] = {
                    'product_name': detail['product_name'],
                    'cost': 0
                }
            product_breakdown[prod_id]['cost'] += cost
            
            # Allocation Details Structure
            if prod_id not in allocation_details_out:
                allocation_details_out[prod_id] = {
                    'product_name': detail['product_name'],
                    'items': {}
                }
            
            item_id = detail['item_id']
            if item_id not in allocation_details_out[prod_id]['items']:
                allocation_details_out[prod_id]['items'][item_id] = {
                    'item_name': detail['item_name'],
                    'allocations': []
                }
            
            # Check if this provider entry exists (merge if needed, though loop shouldn't duplicate)
            allocation_details_out[prod_id]['items'][item_id]['allocations'].append({
                'provider_id': detail['provider_id'],
                'provider_name': p_name,
                'value': detail['volume'], # Use volume for display? Or stick to input? 
                # Frontend expects input values (percentage or units).
                # We should pass back what was effective. 
                # But for "Simulated", maybe normalized?
                # Let's pass back the computed volume for now or simple percentage if we can calc it.
                # Actually, frontend "Base" view uses this. 
                # Let's calculate percentage of total for that item/product
                'mode': 'percentage' # Normalize to % for simple display?
            })

        # Post-process allocation_details to normalize percentages for display
        for pid, pdata in allocation_details_out.items():
            for iid, idata in pdata['items'].items():
                total_vol = sum(a['value'] for a in idata['allocations'])
                for alloc in idata['allocations']:
                    if total_vol > 0:
                        alloc['value'] = round((alloc['value'] / total_vol) * 100, 1)
                    else:
                        alloc['value'] = 0

        return {
            'total_cost': round(total_cost, 2),
            'provider_breakdown': provider_breakdown,
            'product_breakdown': product_breakdown,
            'allocation_details': allocation_details_out
        }

    def get_current_allocations(self, product_quantities: Dict[int, int]) -> Dict[int, Any]:
        """Get current item-provider allocations from product configurations."""
        allocations = {}

        for product_id in product_quantities.keys():
            # Get allocations from DB
            # This returns either nested {mode, providers} (Collective) or {item_id: {mode, providers}} (Per Item)
            db_alloc = self.crud.get_allocations_for_product(product_id)
            
            # We need to format this into the "Nested Product Structure" expected by calculate_cost_with_allocations
            # { product_id: { items: { item_id: { mode, allocations: [] } } } }
            
            if not db_alloc:
                continue
                
            # Check if collective
            is_collective = 'mode' in db_alloc and 'providers' in db_alloc
            
            item_ids = self.crud.get_item_ids_for_product(product_id)
            
            if product_id not in allocations:
                product = self.crud.get_product(product_id)
                allocations[product_id] = {
                    'product_name': product['name'] if product else f'Product {product_id}',
                    'items': {}
                }
            
            if is_collective:
                # Apply to all items
                for item_id in item_ids:
                    allocations[product_id]['items'][item_id] = {
                        'mode': db_alloc['mode'],
                        'allocations': db_alloc['providers'] # [{provider_id, value}, ...]
                    }
            else:
                # Per item
                for item_id in item_ids:
                    if item_id in db_alloc:
                        allocations[product_id]['items'][item_id] = {
                            'mode': db_alloc[item_id].get('mode', 'percentage'),
                            'allocations': db_alloc[item_id].get('providers', [])
                        }
                    elif str(item_id) in db_alloc:
                        allocations[product_id]['items'][item_id] = {
                            'mode': db_alloc[str(item_id)].get('mode', 'percentage'),
                            'allocations': db_alloc[str(item_id)].get('providers', [])
                        }

        return allocations

    def get_provider_tier_status(self, product_quantities: Dict[Any, int]) -> Dict[str, Any]:
        """
        Get tier status for all providers.
        Note: Tiers are technically per-Contract. This provides a summary aggregating across contracts.
        """
        # Reuse the logic from calculate_cost to get volumes per contract
        # Then aggregate by Provider
        
        quantities = {int(k): int(v) for k, v in product_quantities.items()}
        allocations = self.get_current_allocations(quantities)
        
        # We can run a "dry run" of calculation to get volumes
        # But calculate_cost_with_allocations returns "provider_breakdown" which has tier_info!
        
        result = self.calculate_cost_with_allocations(quantities, allocations)
        
        status = {}
        for p_name, data in result['provider_breakdown'].items():
            status[p_name] = {
                'calculated_tier': data['tier_info'].get('effective_tier'),
                'effective_tier': data['tier_info'].get('effective_tier'),
                'total_credit_files': data['total_units'],
                'override_tier': None
            }
            
        return status

    def get_all_active_products(self) -> List[Dict[str, Any]]:
        """Get all active products for optimization input"""
        products = self.crud.get_all_products()
        result = []
        for product in products:
            # product is tuple/list: (id, name, desc, status, ...)
            if product[3] == 'active':
                item_ids = self.crud.get_item_ids_for_product(product[0])
                result.append({
                    'product_id': product[0],
                    'name': product[1],
                    'description': product[2],
                    'item_count': len(item_ids)
                })
        return result

    def _row_to_dict(self, row, columns):
        return dict(zip(columns, row))

# Global calculation service instance
_calculation_service = None

def get_calculation_service():
    """Get or create the global calculation service instance"""
    global _calculation_service
    if _calculation_service is None:
        _calculation_service = CalculationService()
    return _calculation_service