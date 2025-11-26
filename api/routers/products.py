from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os

from db.crud import get_crud


router = APIRouter()

# Get the absolute path to the frontend directory
FRONTEND_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend"
)

# Initialize templates
templates = Jinja2Templates(directory=FRONTEND_DIR)


# Pydantic models
class ProductBase(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = ""
    status: Optional[str] = "active"
    contract_selections: Optional[Dict[int, List[int]]] = None
    allocations: Optional[Dict[str, Any]] = None
    price_multipliers: Optional[Dict[int, Any]] = None
    forecasts: Optional[List[Dict[str, Any]]] = None
    actuals: Optional[List[Dict[str, Any]]] = None

class ProductCreate(ProductBase):
    name: str 

class ProductUpdate(ProductBase):
    pass


@router.get("/products", response_class=HTMLResponse)
async def products_page(request: Request):
    """Render the products page."""
    return templates.TemplateResponse("products/index.html", {"request": request})


def _format_product_summary(product, item_ids):
    """Helper to format product summary response."""
    return {
        "product_id": product['product_id'],
        "name": product['name'],
        "description": product['description'],
        "status": product['status'],
        "date_creation": product['date_creation'],
        "date_last_update": product['date_last_update'],
        "item_ids": item_ids,
    }


# API endpoints for products
@router.get("/api/products")
async def get_products():
    """Get all products with their items."""
    crud = get_crud()
    products = crud.get_all_products()

    result = []
    for p in products:
        # Convert tuple to dict (UAT normalization)
        p_dict = {
            "product_id": p[0],
            "name": p[1],
            "description": p[2],
            "status": p[3],
            "date_creation": p[4],
            "date_last_update": p[5]
        }
        item_ids = crud.get_item_ids_for_product(p_dict["product_id"])
        result.append(_format_product_summary(p_dict, item_ids))
    return JSONResponse(content=result)


def _update_time_series(crud, product_id, data, is_forecast):
    """Helper to update forecasts or actuals."""
    if data is None:
        return

    # Select operations based on type
    if is_forecast:
        get_existing = crud.get_forecasts_for_product
        delete_item = crud.delete_forecast
        create_item = crud.create_forecast
        id_key = 'forecast_id'
        val_key = 'forecast_units'
    else:
        get_existing = crud.get_actuals_for_product
        delete_item = crud.delete_actual
        create_item = crud.create_actual
        id_key = 'actual_id'
        val_key = 'actual_units'

    # Replace all existing entries (simple full update)
    for item in get_existing(product_id):
        delete_item(item[id_key])
    
    for item in data:
        create_item(
            product_id=product_id,
            year=item.get('year'),
            month=item.get('month'),
            **{val_key: item.get(val_key)}
        )


def _update_product_relations(crud, product_id: int, product_data: BaseModel):
    """Helper to update product relations (allocations, multipliers, forecasts, actuals)."""
    if product_data.contract_selections is not None:
        crud.update_product_items_from_contracts(product_id, product_data.contract_selections)

    if product_data.allocations is not None:
        crud.set_allocations_for_product(product_id, product_data.allocations)

    if product_data.price_multipliers is not None:
        crud.set_price_multipliers_for_product(product_id, product_data.price_multipliers)

    _update_time_series(crud, product_id, product_data.forecasts, is_forecast=True)
    _update_time_series(crud, product_id, product_data.actuals, is_forecast=False)


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

    return JSONResponse(content=_format_product_summary(new_product, item_ids))


@router.get("/api/products/{product_id}")
async def get_product(product_id: int):
    """Get a specific product."""
    crud = get_crud()
    product = crud.get_product(product_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    item_ids = crud.get_item_ids_for_product(product['product_id'])
    
    # Base summary
    response = _format_product_summary(product, item_ids)
    
    # Add details
    response.update({
        "contracts": crud.get_product_contracts_with_selected_items(product['product_id']),
        "allocations": crud.get_allocations_for_product(product['product_id']),
        "price_multipliers": crud.get_price_multipliers_for_product(product['product_id']),
        "forecasts": [
            {k: f[k] for k in ('forecast_id', 'year', 'month', 'forecast_units', 'date_creation', 'date_last_update')}
            for f in crud.get_forecasts_for_product(product_id)
        ],
        "actuals": [
            {k: a[k] for k in ('actual_id', 'year', 'month', 'actual_units', 'date_creation', 'date_last_update')}
            for a in crud.get_actuals_for_product(product_id)
        ]
    })

    return JSONResponse(content=response)


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
    crud.delete_product(product_id)
    return JSONResponse(content={"message": "Product deleted successfully"})