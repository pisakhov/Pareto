from langchain_core.tools import tool
from typing import Optional, List, Dict, Any
from db.crud import get_crud

@tool
def search_entities(query: Optional[str] = None, entity_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Search for entities (providers, products, processes, items) in the system.
    
    Args:
        query: Optional text to filter by name.
        entity_type: Optional type filter: 'provider', 'product', 'process', 'item'.
    """
    crud = get_crud()
    results = []
    
    if not entity_type or entity_type == 'provider':
        # get_all_providers returns tuples: (id, name, ...)
        results.extend([{'type': 'provider', 'id': p[0], 'name': p[1]} for p in crud.get_all_providers()])
    if not entity_type or entity_type == 'product':
        # get_all_products returns tuples: (id, name, ...)
        results.extend([{'type': 'product', 'id': p[0], 'name': p[1]} for p in crud.get_all_products()])
    if not entity_type or entity_type == 'process':
        # get_all_processes returns DICTS
        results.extend([{'type': 'process', 'id': p['process_id'], 'name': p['process_name']} for p in crud.get_all_processes()])
    if not entity_type or entity_type == 'item':
        # get_all_items returns tuples: (id, name, ...)
        results.extend([{'type': 'item', 'id': p[0], 'name': p[1]} for p in crud.get_all_items()])
        
    if query:
        q = query.lower()
        results = [r for r in results if q in r['name'].lower()]
        
    return results

@tool
def get_contract_details(contract_id: int) -> str:
    """
    Get detailed information about a specific contract, including tiers and strategy.
    Use this to find tier thresholds (e.g., volume required for Tier 2).
    """
    crud = get_crud()
    contract = crud.get_contract(contract_id)
    if not contract:
        return f"Error: Contract with ID {contract_id} not found."
    
    tiers = crud.get_contract_tiers_for_contract(contract_id)
    tiers.sort(key=lambda x: x['tier_number'])
    
    lookup = crud.get_contract_lookup(contract_id)
    lookup_info = "Default (Sum Actuals 1mo)"
    if lookup:
        lookup_info = f"{lookup['method']} of {lookup['source']} over {lookup['lookback_months']} months"

    tier_lines = []
    for t in tiers:
        status = "*" if t['is_selected'] else ""
        tier_lines.append(f"  - Tier {t['tier_number']}: {t['threshold_units']:,} units {status}")

    return f"""
    Contract: {contract['contract_name']} (ID: {contract_id})
    Provider: {contract['provider_name']}
    Process: {contract['process_name']}
    Status: {contract['status']}
    Strategy: {lookup_info}
    
    Tiers:
    {chr(10).join(tier_lines)}
    (* = manually selected)
    """

@tool
def get_product_simulation(product_id: int, year: Optional[int] = None, month: Optional[int] = None, use_forecasts: bool = False) -> str:
    """
    Calculate pricing simulation for a product. Shows costs, active tiers, and effective prices.
    
    Args:
        product_id: The ID of the product.
        year: Year for simulation (Required if month is specified).
        month: Month for simulation (1-12).
        use_forecasts: True to use forecast data, False for actuals.
    """
    crud = get_crud()
    data = crud.get_product_pricing_table_data(product_id, year, month, use_forecasts)
    
    if not data['processes']:
        return "No active processes or data found for this product simulation."

    summary = []
    summary.append(f"Simulation for Product ID {product_id} ({'Forecast' if use_forecasts else 'Actuals'})")
    summary.append(f"Period: {data['month']}/{data['year']}")
    summary.append(f"Total Units: {data['units']:,}")
    summary.append("-" * 40)
    
    total_cost = 0
    
    for proc in data['processes']:
        summary.append(f"Process: {proc['process_name']}")
        for row in proc['rows']:
            item_cost = row['total_cost']
            total_cost += item_cost
            
            # Tier Logic Display
            active_tier = row['tier']
            eff_tier = row['effective_tier']
            calc_tier = row['calculated_tier']
            
            tier_status = f"T{active_tier}"
            if active_tier != eff_tier:
                tier_status += f" (Billed/Manual) vs Eff T{eff_tier}"
            elif active_tier != calc_tier:
                 tier_status += f" (Strategy) vs Raw T{calc_tier}"
            
            summary.append(f"  - {row['item_name']} ({row['provider_name']})")
            summary.append(f"    Vol: {row['allocated_units']:,} | Eff. Vol: {row['effective_volume']:,} ({row['strategy_label']})")
            summary.append(f"    {tier_status} | Price: ${row['price_per_unit']:.4f}")
            summary.append(f"    Cost: ${item_cost:,.2f}")
        summary.append("")
        
    summary.append("-" * 40)
    summary.append(f"Grand Total Cost: ${total_cost:,.2f}")
    
    return "\n".join(summary)

@tool
def get_provider_allocations(provider_id: int) -> str:
    """
    Find which products are allocated to a specific provider and their allocation strategy.
    Useful for understanding volume drivers for a provider.
    """
    crud = get_crud()
    # allocations structure: {provider_id: {item_id: {total: val, products: [...]}}} 
    # but crud.get_all_allocations is aggregated.
    # We need to scan products to be precise.
    
    products = crud.get_all_products()
    found = []
    
    for prod in products:
        # We need to fetch details to see allocations
        # This might be slow if many products, but ok for a tool
        pid = prod[0] # product_id (tuple index 0)
        prod_name = prod[1] # name (tuple index 1)
        
        allocs = crud.get_allocations_for_product(pid)
        
        # Check if provider is in allocs
        # allocs structure: {item_id: {mode: 'percentage', providers: [{provider_id, value}]}}
        # or collective: {mode: 'percentage', providers: [...]}
        
        relevant = False
        share_info = []
        
        if 'providers' in allocs: # Collective
            for p in allocs['providers']:
                if p['provider_id'] == provider_id and p['value'] > 0:
                    relevant = True
                    share_info.append(f"{p['value']}{'%' if allocs['mode'] == 'percentage' else 'u'}")
        else: # Per Item
            for item_id, details in allocs.items():
                for p in details['providers']:
                    if p['provider_id'] == provider_id and p['value'] > 0:
                        relevant = True
                        share_info.append(f"Item {item_id}: {p['value']}{'%' if details['mode'] == 'percentage' else 'u'}")
                        
        if relevant:
            unique_shares = list(set(share_info))
            found.append(f"- {prod_name} (ID: {pid}): {', '.join(unique_shares)}")
            
    if not found:
        return f"No products found with active allocations for Provider ID {provider_id}."
        
    return f"Products allocated to Provider ID {provider_id}:\n" + "\n".join(found)
@tool
def get_historical_volume(entity_id: int, entity_type: str = 'product', year: Optional[int] = None) -> str:
    """
    Get raw volume data (Actuals and Forecasts) for a product or global provider context.
    
    Args:
        entity_id: ID of the product.
        entity_type: 'product' (currently only product supported).
        year: Optional specific year.
    """
    if entity_type != 'product':
        return "Currently only 'product' entity type is supported for direct volume lookup."
        
    crud = get_crud()
    actuals = crud.get_actuals_for_product(entity_id)
    forecasts = crud.get_forecasts_for_product(entity_id)
    
    # Filter by year if needed
    if year:
        actuals = [a for a in actuals if a['year'] == year]
        forecasts = [f for f in forecasts if f['year'] == year]
        
    summary = [f"Volume Data for Product {entity_id} {f'({year})' if year else ''}"]
    
    # Group by Process/Month
    # Simplified view: List most recent first
    summary.append("Recent Actuals:")
    for a in actuals[:5]:
        summary.append(f"  {a['year']}-{a['month']}: {a['actual_units']:,} (Proc: {a['process_id']})")
        
    summary.append("Recent Forecasts:")
    for f in forecasts[:5]:
        summary.append(f"  {f['year']}-{f['month']}: {f['forecast_units']:,} (Proc: {f['process_id']})")
        
    return "\n".join(summary)

tools = [
    search_entities,
    get_contract_details,
    get_product_simulation,
    get_provider_allocations,
    get_historical_volume
]
