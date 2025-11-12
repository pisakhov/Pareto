#!/usr/bin/env python3
"""
Example: Simplified Contract Tier System

This example demonstrates the simplified contract tier system
for managing provider contracts with tier thresholds.

Scenario:
- Acquisition Contract with providers Experian and Equifax
- Items: base file, FICO, FACTA, FRAUD
- Products: Retail Cards (100k units), Branded Cards (200k units)

Tier Structure (UAT Simple):
- Tier 1: < 1,000 units
- Tier 2: < 4,000 units
- Tier 3: < 6,000 units
"""

from db.crud import get_crud
from datetime import datetime
import json


def main():
    # Initialize database
    crud = get_crud()

    # Create providers
    print("Creating providers...")
    experian = crud.create_provider(
        company_name="Experian",
        details="Credit bureau services"
    )
    equifax = crud.create_provider(
        company_name="Equifax",
        details="Credit bureau services"
    )

    # Create a contract for acquisition process
    print("\nCreating acquisition contract...")
    acquisition_contract = crud.create_contract(
        provider_id=equifax["provider_id"],
        contract_name="Acquisition Contract - Equifax"
    )

    # Create simplified tier structure (UAT simple: just thresholds)
    print("\nCreating contract tiers...")
    print("Tier 1: < 1,000 units")
    print("Tier 2: < 4,000 units")
    print("Tier 3: < 6,000 units")

    crud.create_contract_tier(
        contract_id=acquisition_contract["contract_id"],
        tier_number=1,
        threshold_units=1000,
        is_selected=False
    )

    crud.create_contract_tier(
        contract_id=acquisition_contract["contract_id"],
        tier_number=2,
        threshold_units=4000,
        is_selected=True  # Currently active
    )

    crud.create_contract_tier(
        contract_id=acquisition_contract["contract_id"],
        tier_number=3,
        threshold_units=6000,
        is_selected=False
    )

    print("\nContract tiers created:")
    tiers = crud.get_all_contract_tiers(acquisition_contract["contract_id"])
    for tier in tiers:
        print(f"  Tier {tier['tier_number']}: < {tier['threshold_units']:,} units (Selected: {tier['is_selected']})")

    # Create sample products
    print("\nCreating products...")
    retail_product = crud.create_product(
        name="Retail Cards",
        description="Standard retail credit cards",
        proxy_quantity=100000
    )

    branded_product = crud.create_product(
        name="Branded Cards",
        description="Premium branded credit cards",
        proxy_quantity=200000
    )

    # Add some historical actual data for simulation
    print("\nAdding historical actuals...")
    for month in range(1, 13):
        crud.create_actual(
            product_id=retail_product["product_id"],
            year=2024,
            month=month,
            actual_units=100000
        )
        crud.create_actual(
            product_id=branded_product["product_id"],
            year=2024,
            month=month,
            actual_units=200000
        )

    # Add some forecasts for simulation
    print("\nAdding forecasts...")
    for month in range(1, 7):
        crud.create_forecast(
            product_id=retail_product["product_id"],
            year=2025,
            month=month,
            forecast_units=110000  # Slight increase
        )
        crud.create_forecast(
            product_id=branded_product["product_id"],
            year=2025,
            month=month,
            forecast_units=220000  # Slight increase
        )

    # Simulate different scenarios
    print("\n" + "="*60)
    print("TIER CALCULATION SCENARIOS")
    print("="*60)

    # Scenario 1: Calculate tier based on latest actuals (0 months back)
    print("\n1. Calculate based on latest month (0mo actual):")
    result = crud.calculate_tier_for_contract(
        contract_id=acquisition_contract["contract_id"],
        months_back=0,
        use_forecasts=False
    )
    print(f"   Total units: {result['total_units']:,}")
    if result['selected_tier']:
        print(f"   Calculated tier: Tier {result['selected_tier']['tier_number']} (< {result['selected_tier']['threshold_units']:,})")
    else:
        print(f"   Calculated tier: None")

    # Scenario 2: Calculate tier based on 12 months of actuals
    print("\n2. Calculate based on 12 months of actuals:")
    result = crud.calculate_tier_for_contract(
        contract_id=acquisition_contract["contract_id"],
        months_back=-12,
        use_forecasts=False
    )
    print(f"   Total units (12mo): {result['total_units']:,}")
    if result['selected_tier']:
        print(f"   Calculated tier: Tier {result['selected_tier']['tier_number']} (< {result['selected_tier']['threshold_units']:,})")
    else:
        print(f"   Calculated tier: None")

    # Scenario 3: Calculate tier based on forecasts
    print("\n3. Calculate based on forecast (next 6 months):")
    result = crud.calculate_tier_for_contract(
        contract_id=acquisition_contract["contract_id"],
        months_back=-6,
        use_forecasts=True
    )
    print(f"   Forecasted units (6mo): {result['total_units']:,}")
    if result['selected_tier']:
        print(f"   Calculated tier: Tier {result['selected_tier']['tier_number']} (< {result['selected_tier']['threshold_units']:,})")
    else:
        print(f"   Calculated tier: None")

    # Scenario 4: Full simulation over forecast period
    print("\n4. Full tier simulation over 6 months of forecasts:")
    forecast_months = [(2025, m) for m in range(1, 7)]
    simulation = crud.simulate_contract_tiers(
        contract_id=acquisition_contract["contract_id"],
        forecast_months=forecast_months
    )

    print(f"   Simulation period: {simulation['simulation_period']}")
    print("\n   Monthly breakdown:")
    for month_result in simulation["results"]:
        tier_info = f"Tier {month_result['tier_number']} (< {month_result['threshold_units']:,})" if month_result['tier_number'] else "No Tier"
        print(f"   {month_result['year']}-{month_result['month']:02d}: "
              f"{month_result['forecast_units']:,} units → {tier_info}")

    # Scenario 5: Abuse detection - simulate high volume
    print("\n5. Abuse detection simulation (what-if 5000 units):")
    tiers = crud.get_all_contract_tiers(acquisition_contract["contract_id"])
    for tier in tiers:
        if 5000 < tier["threshold_units"]:
            print(f"   5,000 units → Tier {tier['tier_number']} (< {tier['threshold_units']:,})")
        elif tier == tiers[-1]:  # Last tier (highest)
            print(f"   5,000 units → Tier {tier['tier_number']} (< {tier['threshold_units']:,}) - EXCEEDED!")

    print("\n" + "="*60)
    print("EXAMPLE COMPLETE")
    print("="*60)
    print("\nKey Features Demonstrated:")
    print("✓ Simplified tier structure (tier_number + threshold_units only)")
    print("✓ Volume-based tier selection")
    print("✓ Historical lookback calculation (0mo, 12mo)")
    print("✓ Forecast-based tier simulation")
    print("✓ Monthly tier progression tracking")
    print("✓ Abuse detection (what-if scenarios)")
    print("\nUAT Philosophy: Simple, direct, minimal")


if __name__ == "__main__":
    main()
