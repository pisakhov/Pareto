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
    proxy_quantity: Optional[int] = 0
    status: Optional[str] = "active"
    item_ids: Optional[List[int]] = []
    allocations: Optional[Dict[str, Any]] = None
    price_multipliers: Optional[Dict[int, Any]] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    proxy_quantity: Optional[int] = None
    status: Optional[str] = None
    item_ids: Optional[List[int]] = None
    allocations: Optional[Dict[str, Any]] = None
    price_multipliers: Optional[Dict[int, Any]] = None


@router.get("/products", response_class=HTMLResponse)
async def products_page(request: Request):
    """Render the products page."""
    return templates.TemplateResponse("products/index.html", {"request": request})


# API endpoints for products
@router.get("/api/products")
async def get_products():
    """Get all products with their items."""
    crud = get_crud()
    products = repo.get_all_products()

    result = []
    for p in products:
        item_ids = repo.get_item_ids_for_product(p.product_id)
        result.append(
            {
                "product_id": p.product_id,
                "name": p.name,
                "description": p.description,
                "proxy_quantity": p.proxy_quantity,
                "status": p.status,
                "date_creation": p.date_creation,
                "date_last_update": p.date_last_update,
                "item_ids": item_ids,
            }
        )
    return JSONResponse(content=result)


@router.post("/api/products")
async def create_product(product: ProductCreate):
    """Create a new product."""
    crud = get_crud()
    new_product = repo.create_product(
        name=product.name,
        description=product.description,
        proxy_quantity=product.proxy_quantity,
        status=product.status,
    )

    if product.item_ids:
        repo.set_items_for_product(new_product.product_id, product.item_ids)

    if product.allocations:
        repo.set_allocations_for_product(new_product.product_id, product.allocations)

    if product.price_multipliers:
        repo.set_price_multipliers_for_product(new_product.product_id, product.price_multipliers)

    return JSONResponse(
        content={
            "product_id": new_product.product_id,
            "name": new_product.name,
            "description": new_product.description,
            "proxy_quantity": new_product.proxy_quantity,
            "status": new_product.status,
            "date_creation": new_product.date_creation,
            "date_last_update": new_product.date_last_update,
            "item_ids": product.item_ids,
        }
    )




@router.get("/api/products/pricing-details")
async def get_products_pricing_details():
    """Get pricing details for all products including per-item rates."""
    crud = get_crud()

    products = crud.get_all_products()
    result = {}

    for product in products:
        allocations = crud.get_allocations_for_product(product.product_id)
        price_multipliers = crud.get_price_multipliers_for_product(product.product_id)

        product_pricing = {}

        for item_id, item_data in allocations.items():
            item_prices = []

            providers_list = item_data.get('providers', [])
            for provider_alloc in providers_list:
                provider_id = provider_alloc.get('provider_id')

                provider = crud.get_provider(provider_id)
                if not provider:
                    continue

                tier_data = crud.get_provider_tier_thresholds(provider_id)
                thresholds = tier_data.get('thresholds', {})

                allocations_data = crud.get_provider_item_allocations()
                provider_items = allocations_data.get('provider_items', {})
                total_files = 0
                if str(provider_id) in provider_items:
                    for item_data in provider_items[str(provider_id)].values():
                        total_files += item_data.get('total', 0)

                current_tier = 1
                if total_files > 0 and thresholds:
                    tier_keys = sorted([int(k) for k in thresholds.keys()])
                    for tier in tier_keys:
                        if total_files < thresholds[str(tier)]:
                            current_tier = tier
                            break
                        current_tier = tier

                base_price = crud.get_price_for_item_at_tier(provider_id, item_id, current_tier)
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
                        'provider_name': provider.company_name,
                        'tier': current_tier,
                        'base_price': base_price,
                        'multiplier': multiplier,
                        'final_price': final_price
                    })

            if item_prices:
                product_pricing[str(item_id)] = item_prices[0] if len(item_prices) == 1 else item_prices

        result[str(product.product_id)] = product_pricing

    return JSONResponse(content=result)


@router.get("/api/products/{product_id}")
async def get_product(product_id: int):
    """Get a specific product."""
    crud = get_crud()
    product = repo.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    item_ids = repo.get_item_ids_for_product(product.product_id)
    allocations = repo.get_allocations_for_product(product.product_id)
    price_multipliers = repo.get_price_multipliers_for_product(product.product_id)

    return JSONResponse(
        content={
            "product_id": product.product_id,
            "name": product.name,
            "description": product.description,
            "proxy_quantity": product.proxy_quantity,
            "status": product.status,
            "date_creation": product.date_creation,
            "date_last_update": product.date_last_update,
            "item_ids": item_ids,
            "allocations": allocations,
            "price_multipliers": price_multipliers,
        }
    )


@router.put("/api/products/{product_id}")
async def update_product(product_id: int, product: ProductUpdate):
    """Update a product."""
    crud = get_crud()
    success = repo.update_product(
        product_id=product_id,
        name=product.name,
        description=product.description,
        proxy_quantity=product.proxy_quantity,
        status=product.status,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.item_ids is not None:
        repo.set_items_for_product(product_id, product.item_ids)

    if product.allocations is not None:
        repo.set_allocations_for_product(product_id, product.allocations)

    if product.price_multipliers is not None:
        repo.set_price_multipliers_for_product(product_id, product.price_multipliers)

    return JSONResponse(content={"message": "Product updated successfully"})







@router.delete("/api/products/{product_id}")
async def delete_product(product_id: int):
    """Delete a product."""
    crud = get_crud()
    repo.delete_product(product_id)
    return JSONResponse(content={"message": "Product deleted successfully"})


@router.get("/api/products/{product_id}/items")
async def get_product_items(product_id: int):
    """Get all items for a specific product."""
    crud = get_crud()
    items = repo.get_items_for_product(product_id)
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
