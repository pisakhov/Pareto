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
                "status": p[3],
                "date_creation": p[4],
                "date_last_update": p[5],
                "item_ids": item_ids,
            }
        )
    return JSONResponse(content=result)


def _update_time_series(crud, product_id, data, type_key):
    """Helper to update forecasts or actuals."""
    if data is None:
        return

    # Map type_key to CRUD operations
    is_forecast = type_key == 'forecasts'
    get_func = crud.get_forecasts_for_product if is_forecast else crud.get_actuals_for_product
    delete_func = crud.delete_forecast if is_forecast else crud.delete_actual
    create_func = crud.create_forecast if is_forecast else crud.create_actual
    id_key = 'forecast_id' if is_forecast else 'actual_id'
    value_key = 'forecast_units' if is_forecast else 'actual_units'

    existing = get_func(product_id)
    for item in existing:
        delete_func(item[id_key])
    
    for item in data:
        create_func(
            product_id=product_id,
            year=item.get('year'),
            month=item.get('month'),
            **{value_key: item.get(value_key)}
        )

def _update_product_relations(crud, product_id: int, product_data: BaseModel):
    """Helper to update product relations (allocations, multipliers, forecasts, actuals)."""
    if product_data.contract_selections is not None:
        crud.update_product_items_from_contracts(product_id, product_data.contract_selections)

    if product_data.allocations is not None:
        crud.set_allocations_for_product(product_id, product_data.allocations)

    if product_data.price_multipliers is not None:
        crud.set_price_multipliers_for_product(product_id, product_data.price_multipliers)

    _update_time_series(crud, product_id, product_data.forecasts, 'forecasts')
    _update_time_series(crud, product_id, product_data.actuals, 'actuals')


@router.post("/api/products")
async def create_product(product: ProductCreate):
    """Create a new product."""
    crud = get_crud()
    new_product = crud.create_product(
        name=product.name,
        description=product.description,
        status=product.status,
    )

    _update_product_relations(crud, new_product['product_id'], product)
    
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


def _calculate_item_price(crud, provider_id, item_id, process_id, price_multipliers, allocations_data):
    """Calculate price for a specific item and provider."""
    # Calculate total files for provider to determine tier
    total_files = 0
    if str(provider_id) in allocations_data:
        for item_data in allocations_data[str(provider_id)].values():
            total_files += item_data.get('total', 0)
    
    # Determine Tier
    tier_data = crud.get_provider_tier_thresholds(provider_id)
    thresholds = tier_data.get('thresholds', {})
    current_tier = 1
    
    if total_files > 0 and thresholds:
        tier_keys = sorted([int(k) for k in thresholds.keys()])
        for tier in tier_keys:
            if total_files < thresholds[str(tier)]:
                current_tier = tier
                break
            current_tier = tier

    # Get Base Price
    base_price = crud.get_price_for_item_at_tier(provider_id, item_id, current_tier, process_id)
    if base_price is None:
        return None

    # Apply Multiplier
    multiplier = 1.0
    if price_multipliers:
        m = price_multipliers.get(item_id) or price_multipliers.get(str(item_id))
        if m is not None:
            if isinstance(m, dict) and 'multiplier' in m:
                multiplier = float(m['multiplier'])
            else:
                multiplier = float(m)
    
    return {
        'provider_id': provider_id,
        'provider_name': crud.get_provider(provider_id)['company_name'],
        'tier': current_tier,
        'base_price': base_price,
        'multiplier': multiplier,
        'final_price': base_price * multiplier
    }


@router.get("/api/products/pricing-details")
async def get_products_pricing_details(process_id: int = 1):
    """Get pricing details for all products including per-item rates."""
    crud = get_crud()
    products = crud.get_all_products()
    allocations_data = crud.get_all_allocations() # Load once for efficiency
    result = {}

    for product in products:
        product_id = product[0]
        allocations = crud.get_allocations_for_product(product_id)
        price_multipliers = crud.get_price_multipliers_for_product(product_id)
        product_pricing = {}
        
        # Collective format: Same providers for all items (standard UAT format)
        providers_list = allocations.get('providers', [])
        all_item_ids = crud.get_item_ids_for_product(product_id)
        
        # Calculate prices
        for item_id in all_item_ids:
            item_prices = []
            for provider_alloc in providers_list:
                provider_id = provider_alloc.get('provider_id')
                price_info = _calculate_item_price(
                    crud, provider_id, item_id, process_id, price_multipliers, allocations_data
                )
                if price_info:
                    item_prices.append(price_info)
            
            if item_prices:
                product_pricing[str(item_id)] = item_prices[0] if len(item_prices) == 1 else item_prices

        result[str(product_id)] = product_pricing

    return JSONResponse(content=result)


@router.get("/api/products/{product_id}")
async def get_product(product_id: int):
    """Get a specific product."""
    crud = get_crud()
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

    _update_product_relations(crud, product_id, product)

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