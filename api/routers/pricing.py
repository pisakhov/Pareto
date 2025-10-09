from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional, List, Dict
import os
import sys

# Add parent directory to path to import db module
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))
from db.pricing_repository import get_pricing_repo

router = APIRouter()

# Get the absolute path to the frontend directory
FRONTEND_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend"
)

# Initialize templates
templates = Jinja2Templates(directory=FRONTEND_DIR)


# Pydantic models for request/response
class ProviderCreate(BaseModel):
    company_name: str
    details: Optional[str] = ""
    status: Optional[str] = "active"


class ProviderUpdate(BaseModel):
    company_name: Optional[str] = None
    details: Optional[str] = None
    status: Optional[str] = None


class OfferCreate(BaseModel):
    item_id: int
    provider_id: int
    unit_range: int
    price_per_unit: float
    status: Optional[str] = "active"


class OfferUpdate(BaseModel):
    unit_range: Optional[int] = None
    price_per_unit: Optional[float] = None
    status: Optional[str] = None


@router.get("/pricing", response_class=HTMLResponse)
async def pricing_page(request: Request):
    """Render the pricing page."""
    return templates.TemplateResponse("pricing/index.html", {"request": request})


# Provider endpoints
@router.get("/api/providers")
async def get_providers():
    """Get all providers."""
    try:
        repo = get_pricing_repo()
        providers = repo.get_all_providers()
        return JSONResponse(
            content=[
                {
                    "provider_id": p.provider_id,
                    "company_name": p.company_name,
                    "details": p.details,
                    "status": p.status,
                    "date_creation": p.date_creation,
                    "date_last_update": p.date_last_update,
                }
                for p in providers
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/providers")
async def create_provider(provider: ProviderCreate):
    """Create a new provider."""
    try:
        repo = get_pricing_repo()
        new_provider = repo.create_provider(
            company_name=provider.company_name,
            details=provider.details,
            status=provider.status,
        )
        return JSONResponse(
            content={
                "provider_id": new_provider.provider_id,
                "company_name": new_provider.company_name,
                "details": new_provider.details,
                "status": new_provider.status,
                "date_creation": new_provider.date_creation,
                "date_last_update": new_provider.date_last_update,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/providers/{provider_id}")
async def get_provider(provider_id: int):
    """Get a specific provider."""
    try:
        repo = get_pricing_repo()
        provider = repo.get_provider(provider_id)
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        return JSONResponse(
            content={
                "provider_id": provider.provider_id,
                "company_name": provider.company_name,
                "details": provider.details,
                "status": provider.status,
                "date_creation": provider.date_creation,
                "date_last_update": provider.date_last_update,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/providers/{provider_id}")
async def update_provider(provider_id: int, provider: ProviderUpdate):
    """Update a provider."""
    try:
        repo = get_pricing_repo()
        success = repo.update_provider(
            provider_id=provider_id,
            company_name=provider.company_name,
            details=provider.details,
            status=provider.status,
        )
        if not success:
            raise HTTPException(status_code=404, detail="Provider not found")
        return JSONResponse(content={"message": "Provider updated successfully"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/providers/{provider_id}")
async def delete_provider(provider_id: int):
    """Delete a provider."""
    try:
        repo = get_pricing_repo()
        repo.delete_provider(provider_id)
        return JSONResponse(content={"message": "Provider deleted successfully"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Offer endpoints
@router.get("/api/offers")
async def get_offers():
    """Get all offers with provider information."""
    try:
        repo = get_pricing_repo()
        offers = repo.get_all_offers()
        return JSONResponse(content=offers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/offers/provider/{provider_id}")
async def get_offers_by_provider(provider_id: int):
    """Get all offers for a specific provider."""
    try:
        repo = get_pricing_repo()
        offers = repo.get_offers_by_provider(provider_id)
        return JSONResponse(
            content=[
                {
                    "offer_id": o.offer_id,
                    "provider_id": o.provider_id,
                    "unit_range": o.unit_range,
                    "price_per_unit": float(o.price_per_unit),
                    "status": o.status,
                    "date_creation": o.date_creation,
                    "date_last_update": o.date_last_update,
                }
                for o in offers
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/offers")
async def create_offer(offer: OfferCreate):
    """Create a new offer."""
    try:
        repo = get_pricing_repo()
        new_offer = repo.create_offer(
            item_id=offer.item_id,
            provider_id=offer.provider_id,
            unit_range=offer.unit_range,
            price_per_unit=offer.price_per_unit,
            status=offer.status,
        )
        if not new_offer:
            raise HTTPException(status_code=400, detail="Provider or Item not found")
        return JSONResponse(
            content={
                "offer_id": new_offer.offer_id,
                "item_id": new_offer.item_id,
                "provider_id": new_offer.provider_id,
                "unit_range": new_offer.unit_range,
                "price_per_unit": new_offer.price_per_unit,
                "status": new_offer.status,
                "date_creation": new_offer.date_creation,
                "date_last_update": new_offer.date_last_update,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/offers/{offer_id}")
async def update_offer(offer_id: int, offer: OfferUpdate):
    """Update an offer."""
    try:
        repo = get_pricing_repo()
        success = repo.update_offer(
            offer_id=offer_id,
            unit_range=offer.unit_range,
            price_per_unit=offer.price_per_unit,
            status=offer.status,
        )
        if not success:
            raise HTTPException(status_code=404, detail="Offer not found")
        return JSONResponse(content={"message": "Offer updated successfully"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/offers/{offer_id}")
async def get_offer(offer_id: int):
    """Get a specific offer."""

    try:
        repo = get_pricing_repo()

        offer = repo.get_offer(offer_id)

        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")

        return JSONResponse(
            content={
                "offer_id": offer.offer_id,
                "item_id": offer.item_id,
                "provider_id": offer.provider_id,
                "unit_range": offer.unit_range,
                "price_per_unit": float(offer.price_per_unit),
                "status": offer.status,
                "date_creation": offer.date_creation,
                "date_last_update": offer.date_last_update,
            }
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/offers/{offer_id}")
async def delete_offer(offer_id: int):
    """Delete an offer."""
    try:
        repo = get_pricing_repo()
        repo.delete_offer(offer_id)
        return JSONResponse(content={"message": "Offer deleted successfully"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/pricing/data")
async def get_pricing_data():
    """Get all pricing data for the management interface."""
    try:
        repo = get_pricing_repo()
        providers_with_offers = repo.get_providers_with_offers()
        return JSONResponse(content=providers_with_offers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Item management endpoints
class ItemCreate(BaseModel):
    item_name: str
    description: Optional[str] = ""
    status: str = "active"
    provider_ids: Optional[List[int]] = None


class ItemUpdate(BaseModel):
    item_name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    provider_ids: Optional[List[int]] = None


@router.get("/api/items")
async def get_items():
    """Get all items."""
    try:
        repo = get_pricing_repo()
        items = repo.get_all_items()
        return JSONResponse(
            content=[
                {
                    "item_id": i.item_id,
                    "item_name": i.item_name,
                    "description": i.description,
                    "status": i.status,
                    "date_creation": i.date_creation,
                    "date_last_update": i.date_last_update,
                }
                for i in items
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/items")
async def create_item(item: ItemCreate):
    """Create a new item and associate providers."""
    try:
        repo = get_pricing_repo()

        # Create the item first
        new_item = repo.create_item(
            item_name=item.item_name, description=item.description, status=item.status
        )

        # If provider_ids are provided, set the relationships
        if item.provider_ids is not None:
            repo.set_providers_for_item(new_item.item_id, item.provider_ids)

        return JSONResponse(
            content={
                "item_id": new_item.item_id,
                "item_name": new_item.item_name,
                "description": new_item.description,
                "status": new_item.status,
                "date_creation": new_item.date_creation,
                "date_last_update": new_item.date_last_update,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/items/{item_id}")
async def get_item(item_id: int):
    """Get a specific item."""
    try:
        repo = get_pricing_repo()
        item = repo.get_item(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return JSONResponse(
            content={
                "item_id": item.item_id,
                "item_name": item.item_name,
                "description": item.description,
                "status": item.status,
                "date_creation": item.date_creation,
                "date_last_update": item.date_last_update,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/items/{item_id}/providers")
async def get_item_providers(item_id: int):
    """Get all provider IDs for a specific item."""
    try:
        repo = get_pricing_repo()
        provider_ids = repo.get_providers_for_item(item_id)
        return JSONResponse(content=provider_ids)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/items/{item_id}")
async def update_item(item_id: int, item: ItemUpdate):
    """Update an item and its provider associations."""
    try:
        repo = get_pricing_repo()

        # Update item details
        success = repo.update_item(
            item_id=item_id,
            item_name=item.item_name,
            description=item.description,
            status=item.status,
        )

        if not success:
            raise HTTPException(status_code=404, detail="Item not found")

        # If provider_ids are provided, update the relationships
        if item.provider_ids is not None:
            repo.set_providers_for_item(item_id, item.provider_ids)

        return JSONResponse(content={"message": "Item updated successfully"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/items/{item_id}")
async def delete_item(item_id: int):
    """Delete an item."""
    try:
        repo = get_pricing_repo()
        repo.delete_item(item_id)
        return JSONResponse(content={"message": "Item deleted successfully"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Provider-Item relationship endpoints
class RelationshipRequest(BaseModel):
    relationships: List[Dict[str, int]]


@router.get("/api/provider-items")
async def get_provider_items():
    """Get all provider-item relationships."""
    try:
        repo = get_pricing_repo()
        relationships = repo.get_provider_item_relationships()
        return JSONResponse(
            content=[
                {
                    "provider_id": r.provider_id,
                    "item_id": r.item_id,
                    "date_creation": r.date_creation,
                }
                for r in relationships
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/provider-items/bulk")
async def bulk_update_relationships(request: RelationshipRequest):
    """Bulk update provider-item relationships."""
    try:
        repo = get_pricing_repo()
        success = repo.bulk_update_provider_item_relationships(request.relationships)
        if not success:
            raise HTTPException(
                status_code=500, detail="Failed to update relationships"
            )
        return JSONResponse(content={"message": "Relationships updated successfully"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
