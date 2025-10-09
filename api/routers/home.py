from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
import os
import sys

# Add parent directory to path to import db module
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))
from db.pricing_repository import get_pricing_repo

router = APIRouter()

# Get the absolute path to the frontend directory
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend")

# Initialize templates
templates = Jinja2Templates(directory=FRONTEND_DIR)


@router.get("/", response_class=HTMLResponse)
async def home_page(request: Request):
    """Render the home page."""
    return templates.TemplateResponse("home/index.html", {"request": request})


@router.get("/api/optimization/calculate")
async def calculate_optimization(
    item_id: int = Query(..., description="The item ID to optimize pricing for"),
    quantity: int = Query(..., gt=0, description="The quantity of units needed")
):
    """Calculate optimal pricing for an item and quantity."""
    try:
        repo = get_pricing_repo()
        
        # Verify item exists and is active
        item = repo.get_item(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        if item.status != "active":
            raise HTTPException(status_code=400, detail="Item is not active")
        
        # Get applicable offers
        offers = repo.get_offers_for_item_optimization(item_id, quantity)
        
        if not offers or len(offers) == 0:
            return JSONResponse(
                content={
                    "item_id": item_id,
                    "item_name": item.item_name,
                    "quantity": quantity,
                    "offers": [],
                    "summary": {
                        "best_provider": None,
                        "best_total_cost": None,
                        "worst_total_cost": None,
                        "average_cost": None,
                        "total_providers": 0,
                        "max_savings": 0.0
                    },
                    "message": "No pricing offers found for this item and quantity"
                }
            )
        
        # Mark the optimal offer (first one, already sorted by price_per_unit ASC)
        for i, offer in enumerate(offers):
            offer["is_optimal"] = (i == 0)
        
        # Calculate summary statistics
        total_costs = [offer["total_cost"] for offer in offers]
        best_cost = min(total_costs)
        worst_cost = max(total_costs)
        average_cost = sum(total_costs) / len(total_costs)
        
        best_offer = offers[0]
        
        summary = {
            "best_provider": best_offer["provider_name"],
            "best_total_cost": best_cost,
            "worst_total_cost": worst_cost,
            "average_cost": average_cost,
            "total_providers": len(offers),
            "max_savings": worst_cost - best_cost
        }
        
        return JSONResponse(
            content={
                "item_id": item_id,
                "item_name": item.item_name,
                "quantity": quantity,
                "offers": offers,
                "summary": summary
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
