from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import sys

# Add parent directory to path to import db module
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))
from db.crud import get_crud


router = APIRouter()

# Get the absolute path to the frontend directory
FRONTEND_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend"
)

# Initialize templates
templates = Jinja2Templates(directory=FRONTEND_DIR)


# Pydantic models
class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    status: Optional[str] = "active"
    contract_selections: Optional[Dict[int, List[int]]] = {}
    allocations: Optional[Dict[str, Any]] = None
    price_multipliers: Optional[Dict[int, Any]] = None
    forecasts: Optional[List[Dict[str, Any]]] = None
    actuals: Optional[List[Dict[str, Any]]] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    contract_selections: Optional[Dict[int, List[int]]] = None
    allocations: Optional[Dict[str, Any]] = None
    price_multipliers: Optional[Dict[int, Any]] = None
    forecasts: Optional[List[Dict[str, Any]]] = None
    actuals: Optional[List[Dict[str, Any]]] = None


@router.get("/products", response_class=HTMLResponse)
async def products_page(request: Request):
    """Render the products page."""
    return templates.TemplateResponse("products/index.html", {"request": request})


# API endpoints for products
@router.get("/api/products")
async def get_products():
    """Get all products with their items."""
    crud = get_crud()
    products = crud.get_all_products()

    result = []
    for p in products:
        item_ids = crud.get_item_ids_for_product(p[0])
        result.append(
            {
                "product_id": p[0],
                "name": p[1],
                "description": p[2],
                "proxy_quantity": p[3],
                "status": p[4],
                "date_creation": p[5],
                "date_last_update": p[6],
                "item_ids": item_ids,
            }
        )
    return JSONResponse(content=result)


@router.post("/api/products")
async def create_product(product: ProductCreate):
    """Create a new product."""
    crud = get_crud()
    new_product = crud.create_product(
        name=product.name,
        description=product.description,
        status=product.status,
    )

    if product.contract_selections:
        crud.update_product_items_from_contracts(new_product['product_id'], product.contract_selections)

    if product.allocations:
        crud.set_allocations_for_product(new_product['product_id'], product.allocations)

    if product.price_multipliers:
        crud.set_price_multipliers_for_product(new_product['product_id'], product.price_multipliers)

    if product.forecasts:
        for forecast in product.forecasts:
            crud.create_forecast(
                product_id=new_product['product_id'],
                year=forecast.get('year'),
                month=forecast.get('month'),
                forecast_units=forecast.get('forecast_units')
            )

    if product.actuals:
        for actual in product.actuals:
            crud.create_actual(
                product_id=new_product['product_id'],
                year=actual.get('year'),
                month=actual.get('month'),
                actual_units=actual.get('actual_units')
            )

    item_ids = crud.get_item_ids_for_product(new_product['product_id'])

    return JSONResponse(
        content={
            "product_id": new_product['product_id'],
            "name": new_product['name'],
            "description": new_product['description'],
            "status": new_product['status'],
            "date_creation": new_product['date_creation'],
            "date_last_update": new_product['date_last_update'],
            "item_ids": item_ids,
        }
    )




@router.get("/api/products/pricing-details")
async def get_products_pricing_details(process_id: int = 1):
    """Get pricing details for all products including per-item rates."""
    crud = get_crud()

    products = crud.get_all_products()
    result = {}

    print(f"[PRICING DETAILS] Starting pricing details calculation for {len(products)} products")

    for product in products:
        print(f"[PRICING DETAILS] Processing product ID: {product[0]}, Name: {product[1]}")
        allocations = crud.get_allocations_for_product(product[0])
        price_multipliers = crud.get_price_multipliers_for_product(product[0])

        print(f"[PRICING DETAILS] Product {product[0]} allocations structure: {allocations}")
        print(f"[PRICING DETAILS] Product {product[0]} price_multipliers: {price_multipliers}")

        product_pricing = {}

        # Check if allocations is in collective format (new) or per-item format (legacy)
        # Collective format: single object with mode, locked, providers
        # Per-item format: dict with item_id keys
        allocation_keys = list(allocations.keys()) if allocations else []
        # Check if the first key is a positive integer (item ID)
        is_collective_format = False
        if len(allocation_keys) == 0:
            is_collective_format = True
        elif len(allocation_keys) > 0:
            try:
                first_key = allocation_keys[0]
                # Try to parse as integer
                parsed = int(str(first_key))
                # If it's a positive integer, it's likely an item ID (legacy format)
                is_collective_format = not (parsed > 0)
            except (ValueError, TypeError):
                # If we can't parse it as integer, it's likely a field name (collective format)
                is_collective_format = True

        print(f"[PRICING DETAILS] Product {product[0]} is_collective_format: {is_collective_format}")

        if is_collective_format:
            # Collective allocation format - apply to all items
            print(f"[PRICING DETAILS] Product {product[0]} using collective allocation format")
            # For collective allocations, we need to get all items for this product
            item_ids = crud.get_item_ids_for_product(product[0])
            print(f"[PRICING DETAILS] Product {product[0]} has {len(item_ids)} items: {item_ids}")

            # Get providers from the collective allocation
            providers_list = allocations.get('providers', [])
            print(f"[PRICING DETAILS] Product {product[0]} has {len(providers_list)} providers in collective allocation")

            for item_id in item_ids:
                item_prices = []
                print(f"[PRICING DETAILS] Product {product[0]}, Item {item_id}: Processing collective providers")

                for provider_alloc in providers_list:
                    provider_id = provider_alloc.get('provider_id')
                    print(f"[PRICING DETAILS] Product {product[0]}, Item {item_id}: Processing provider {provider_id}")

                    provider = crud.get_provider(provider_id)
                    if not provider:
                        print(f"[PRICING DETAILS] Product {product[0]}, Item {item_id}: Provider {provider_id} not found!")
                        continue

                    tier_data = crud.get_provider_tier_thresholds(provider_id)
                    thresholds = tier_data.get('thresholds', {})
                    print(f"[PRICING DETAILS] Product {product[0]}, Item {item_id}: Provider {provider_id} tier thresholds: {thresholds}")

                    allocations_data = crud.get_all_allocations()
                    provider_items = allocations_data
                    total_files = 0
                    if str(provider_id) in provider_items:
                        for item_data in provider_items[str(provider_id)].values():
                            total_files += item_data.get('total', 0)

                    print(f"[PRICING DETAILS] Product {product[0]}, Item {item_id}: Provider {provider_id} total_files: {total_files}")

                    current_tier = 1
                    if total_files > 0 and thresholds:
                        tier_keys = sorted([int(k) for k in thresholds.keys()])
                        print(f"[PRICING DETAILS] Product {product[0]}, Item {item_id}: Provider {provider_id} tier_keys: {tier_keys}")
                        for tier in tier_keys:
                            if total_files < thresholds[str(tier)]:
                                current_tier = tier
                                break
                            current_tier = tier

                    print(f"[PRICING DETAILS] Product {product[0]}, Item {item_id}: Provider {provider_id} current_tier: {current_tier}")

                    base_price = crud.get_price_for_item_at_tier(provider_id, item_id, current_tier, process_id)
                    print(f"[PRICING DETAILS] Product {product[0]}, Item {item_id}: Provider {provider_id} base_price: {base_price}")

                    if base_price:

                        multiplier = 1.0
                        if price_multipliers:
                            m = price_multipliers.get(item_id) or price_multipliers.get(str(item_id))
                            if m is not None:
                                if isinstance(m, dict) and 'multiplier' in m:
                                    multiplier = float(m['multiplier'])
                                else:
                                    multiplier = float(m)
                        print(f"[PRICING DETAILS] Product {product[0]}, Item {item_id}: Provider {provider_id} multiplier: {multiplier}")

                        final_price = base_price * multiplier
                        print(f"[PRICING DETAILS] Product {product[0]}, Item {item_id}: Provider {provider_id} final_price: {final_price}")

                        item_prices.append({
                            'provider_id': provider_id,
                            'provider_name': provider['company_name'],
                            'tier': current_tier,
                            'base_price': base_price,
                            'multiplier': multiplier,
                            'final_price': final_price
                        })

                if item_prices:
                    product_pricing[str(item_id)] = item_prices[0] if len(item_prices) == 1 else item_prices
                    print(f"[PRICING DETAILS] Product {product[0]}, Item {item_id}: Added pricing data")

        else:
            # Legacy per-item allocation format
            print(f"[PRICING DETAILS] Product {product[0]} using legacy per-item allocation format")

            for item_id, item_data in allocations.items():
                item_prices = []

                providers_list = item_data.get('providers', [])
                print(f"[PRICING DETAILS] Product {product[0]}, Item {item_id}: Has {len(providers_list)} providers")

                for provider_alloc in providers_list:
                    provider_id = provider_alloc.get('provider_id')

                    provider = crud.get_provider(provider_id)
                    if not provider:
                        print(f"[PRICING DETAILS] Product {product[0]}, Item {item_id}: Provider {provider_id} not found!")
                        continue

                    tier_data = crud.get_provider_tier_thresholds(provider_id)
                    thresholds = tier_data.get('thresholds', {})

                    allocations_data = crud.get_all_allocations()
                    provider_items = allocations_data
                    total_files = 0
                    if str(provider_id) in provider_items:
                        for item_data_inner in provider_items[str(provider_id)].values():
                            total_files += item_data_inner.get('total', 0)

                    current_tier = 1
                    if total_files > 0 and thresholds:
                        tier_keys = sorted([int(k) for k in thresholds.keys()])
                        for tier in tier_keys:
                            if total_files < thresholds[str(tier)]:
                                current_tier = tier
                                break
                            current_tier = tier

                    base_price = crud.get_price_for_item_at_tier(provider_id, item_id, current_tier, process_id)
                    if base_price:

                        multiplier = 1.0
                        if price_multipliers:
                            m = price_multipliers.get(item_id) or price_multipliers.get(str(item_id))
                            if m is not None:
                                if isinstance(m, dict) and 'multiplier' in m:
                                    multiplier = float(m['multiplier'])
                                else:
                                    multiplier = float(m)
                        final_price = base_price * multiplier
                        item_prices.append({
                            'provider_id': provider_id,
                            'provider_name': provider['company_name'],
                            'tier': current_tier,
                            'base_price': base_price,
                            'multiplier': multiplier,
                            'final_price': final_price
                        })

                if item_prices:
                    product_pricing[str(item_id)] = item_prices[0] if len(item_prices) == 1 else item_prices

        result[str(product[0])] = product_pricing
        print(f"[PRICING DETAILS] Product {product[0]}: Final pricing data: {product_pricing}")

    print(f"[PRICING DETAILS] Completed. Returning data for {len(result)} products")
    return JSONResponse(content=result)


@router.get("/api/products/{product_id}")
async def get_product(product_id: int):
    """Get a specific product."""
    crud = get_crud()

    try:
        product = crud.get_product(product_id)

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        item_ids = crud.get_item_ids_for_product(product['product_id'])
        contracts = crud.get_product_contracts_with_selected_items(product['product_id'])
        allocations = crud.get_allocations_for_product(product['product_id'])
        price_multipliers = crud.get_price_multipliers_for_product(product['product_id'])

        forecasts = crud.get_forecasts_for_product(product_id)
        forecasts_data = [{
            "forecast_id": f['forecast_id'],
            "year": f['year'],
            "month": f['month'],
            "forecast_units": f['forecast_units'],
            "date_creation": f['date_creation'],
            "date_last_update": f['date_last_update']
        } for f in forecasts]

        actuals = crud.get_actuals_for_product(product_id)
        actuals_data = [{
            "actual_id": a['actual_id'],
            "year": a['year'],
            "month": a['month'],
            "actual_units": a['actual_units'],
            "date_creation": a['date_creation'],
            "date_last_update": a['date_last_update']
        } for a in actuals]

        return JSONResponse(
            content={
                "product_id": product['product_id'],
                "name": product['name'],
                "description": product['description'],
                "status": product['status'],
                "date_creation": product['date_creation'],
                "date_last_update": product['date_last_update'],
                "item_ids": item_ids,
                "contracts": contracts,
                "allocations": allocations,
                "price_multipliers": price_multipliers,
                "forecasts": forecasts_data,
                "actuals": actuals_data,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.put("/api/products/{product_id}")
async def update_product(product_id: int, product: ProductUpdate):
    """Update a product."""
    crud = get_crud()
    success = crud.update_product(
        product_id=product_id,
        name=product.name,
        description=product.description,
        status=product.status,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.contract_selections is not None:
        crud.update_product_items_from_contracts(product_id, product.contract_selections)

    if product.allocations is not None:
        crud.set_allocations_for_product(product_id, product.allocations)

    if product.price_multipliers is not None:
        crud.set_price_multipliers_for_product(product_id, product.price_multipliers)

    if product.forecasts is not None:
        existing_forecasts = crud.get_forecasts_for_product(product_id)
        for forecast in existing_forecasts:
            crud.delete_forecast(forecast['forecast_id'])

        for forecast_data in product.forecasts:
            crud.create_forecast(
                product_id=product_id,
                year=forecast_data.get('year'),
                month=forecast_data.get('month'),
                forecast_units=forecast_data.get('forecast_units')
            )

    if product.actuals is not None:
        existing_actuals = crud.get_actuals_for_product(product_id)
        for actual in existing_actuals:
            crud.delete_actual(actual['actual_id'])

        for actual_data in product.actuals:
            crud.create_actual(
                product_id=product_id,
                year=actual_data.get('year'),
                month=actual_data.get('month'),
                actual_units=actual_data.get('actual_units')
            )

    return JSONResponse(content={"message": "Product updated successfully"})







@router.delete("/api/products/{product_id}")
async def delete_product(product_id: int):
    """Delete a product."""
    crud = get_crud()

    # Delete forecasts and actuals for this product
    forecasts = crud.get_forecasts_for_product(product_id)
    for forecast in forecasts:
        crud.delete_forecast(forecast['forecast_id'])

    actuals = crud.get_actuals_for_product(product_id)
    for actual in actuals:
        crud.delete_actual(actual['actual_id'])

    crud.delete_product(product_id)
    return JSONResponse(content={"message": "Product deleted successfully"})


@router.get("/api/products/{product_id}/items")
async def get_product_items(product_id: int):
    """Get all items for a specific product."""
    crud = get_crud()
    items = crud.get_items_for_product(product_id)
    return JSONResponse(
        content=[
            {
                "item_id": i.item_id,
                "item_name": i.item_name,
                "description": i.description,
                "status": i.status,
            }
            for i in items
        ]
    )
