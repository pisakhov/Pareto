import sys
import json
from db.crud import get_crud

def dump_simulation_data():
    crud = get_crud()
    
    # 1. Get Active Processes
    processes = crud.get_all_processes()
    active_processes = [p for p in processes if p['status'] == 'active']
    
    if not active_processes:
        print("No active processes found.")
        return

    target_process = active_processes[0]
    process_id = target_process['process_id']
    print(f"Analyzing Process: {target_process['process_name']} (ID: {process_id})")
    
    # 2. Get Contracts
    contracts = crud.get_contracts_for_process(process_id)
    print(f"\nContracts ({len(contracts)}):")
    for c in contracts:
        print(f" - ID: {c['contract_id']}, Provider: {c.get('provider_name')}, Name: {c.get('contract_name')}")
        
        # Tiers
        tiers = crud.get_contract_tiers_for_contract(c['contract_id'])
        print(f"   Tiers: {len(tiers)}")
        for t in tiers:
             print(f"    - Threshold: {t['threshold_units']}, Selected: {t.get('is_selected')}")

        # Lookup/Strategy
        lookup = crud.get_contract_lookup(c['contract_id'])
        print(f"   Strategy: Method={lookup.get('method')}, Lookback={lookup.get('lookback_months')}")

    # 3. Get Forecasts and Actuals
    try:
        # Fetch all data
        all_forecasts = crud.get_all_forecasts()
        all_actuals = crud.get_all_actuals()
        
        # Filter for current process
        process_forecasts = [f for f in all_forecasts if str(f.get('process_id')) == str(process_id)]
        process_actuals = [a for a in all_actuals if str(a.get('process_id')) == str(process_id)]
        
        print(f"\nData Points:")
        print(f" - Forecasts: {len(process_forecasts)}")
        print(f" - Actuals:   {len(process_actuals)}")
        
        # Identify unique products
        product_ids = set()
        for f in process_forecasts: product_ids.add(f['product_id'])
        for a in process_actuals: product_ids.add(a['product_id'])
        
        print(f"\nProducts involved ({len(product_ids)}):")
        
        for pid in product_ids:
            # Get product details
            prod_details = crud.get_product(pid)
            print(f"\nProduct: {prod_details.get('name')} (ID: {pid})")
            
            # Get Allocations
            allocations = crud.get_allocations_for_product(pid)
            print(f"   Allocations: {json.dumps(allocations, indent=2)}")
            
            # Build Timeline
            p_forecasts = [f for f in process_forecasts if f['product_id'] == pid]
            p_actuals = [a for a in process_actuals if a['product_id'] == pid]
            
            # Merge
            timeline_map = {}
            
            for a in p_actuals:
                key = f"{a['year']}-{a['month']:02d}"
                timeline_map[key] = {'type': 'actual', 'val': a['actual_units'], 'year': a['year'], 'month': a['month']}
                
            for f in p_forecasts:
                key = f"{f['year']}-{f['month']:02d}"
                # If actual exists, it usually takes precedence in a "merged" view, 
                # but for simulation we might want to see both or split them.
                # For now, let's note if we have overlap.
                if key in timeline_map:
                    timeline_map[key]['forecast_val'] = f['forecast_units']
                    timeline_map[key]['has_overlap'] = True
                else:
                    timeline_map[key] = {'type': 'forecast', 'val': f['forecast_units'], 'year': f['year'], 'month': f['month']}
            
            # Sort
            sorted_keys = sorted(timeline_map.keys())
            print(f"   Timeline ({len(sorted_keys)} points):")
            
            # Print first 3 and last 3 points to verify sort and structure
            display_keys = sorted_keys[:3] + ['...'] + sorted_keys[-3:] if len(sorted_keys) > 6 else sorted_keys
            
            for key in display_keys:
                if key == '...':
                    print("     ...")
                    continue
                data = timeline_map[key]
                overlap_msg = f" (Forecast: {data.get('forecast_val')})" if data.get('has_overlap') else ""
                print(f"     {key}: {data['type'].upper()} = {data['val']}{overlap_msg}")

    except Exception as e:
        print(f"Error fetching data: {e}")

if __name__ == "__main__":
    dump_simulation_data()
