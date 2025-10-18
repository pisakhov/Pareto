from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import sys

from api.config import log

# Add parent directory to path to import db module
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))
from db.products_repository import get_products_repo
from db.pricing_repository import get_pricing_repo


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
    try:
        log("Starting get_products API call", "debug")
        repo = get_products_repo()
        log("Got products repository", "debug")

        products = repo.get_all_products()
        log(f"Retrieved {len(products)} products", "info")

        # For each product, get the associated item IDs
        result = []
        for p in products:
            log(f"Processing product {p.product_id}: {p.name}", "debug")
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
        log(f"Successfully processed {len(result)} products", "info")
        return JSONResponse(content=result)
    except Exception as e:
        log(f"ERROR in get_products: {str(e)}", "error")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/products")
async def create_product(product: ProductCreate):
    """Create a new product."""
    try:
        repo = get_products_repo()
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/products/{product_id}")
async def get_product(product_id: int):
    """Get a specific product."""
    try:
        repo = get_products_repo()
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/products/{product_id}")
async def update_product(product_id: int, product: ProductUpdate):
    """Update a product."""
    try:
        repo = get_products_repo()
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/products/{product_id}")
async def delete_product(product_id: int):
    """Delete a product."""
    try:
        repo = get_products_repo()
        repo.delete_product(product_id)
        return JSONResponse(content={"message": "Product deleted successfully"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/products/{product_id}/items")
async def get_product_items(product_id: int):
    """Get all items for a specific product."""
    try:
        repo = get_products_repo()
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
