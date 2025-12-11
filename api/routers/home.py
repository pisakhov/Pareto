from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Dict, Optional, List, Any
import os
import sys

from db.crud import get_crud
from db.calculation import get_calculation_service

# Agent imports
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
# We import invoke_agent lazily or inside the route if possible to avoid circular dep issues during startup if any
# But here it should be fine as ai depends on db, and api depends on db and ai.
from ai.pareto_agent import invoke_agent

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
    crud = get_crud()
    item = crud.get_item(item_id)
    offers = crud.get_offers_for_item_optimization(item_id, quantity)

    if not offers:
        return JSONResponse(
            content={
                "item_id": item_id,
                "item_name": item['item_name'],
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

    for i, offer in enumerate(offers):
        offer["is_optimal"] = (i == 0)

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
            "item_name": item['item_name'],
            "quantity": quantity,
            "offers": offers,
            "summary": summary
        }
    )


# Pydantic models for multi-product optimization
class OptimizationRequest(BaseModel):
    product_quantities: Dict[int, int]
    use_manual_tiers: bool = False
    tier_volume_overrides: Optional[Dict[int, float]] = None


@router.get("/api/optimization/products")
async def get_optimization_products():
    """Get all active products for optimization dashboard."""
    calc = get_calculation_service()
    products = calc.get_all_active_products()
    return JSONResponse(content=products)


@router.post("/api/optimization/cost")
async def calculate_current_cost(request: OptimizationRequest):
    """Calculate current cost based on product quantities and allocations."""
    calc = get_calculation_service()
    result = calc.calculate_current_cost(
        request.product_quantities, 
        use_manual_tiers=request.use_manual_tiers
    )
    return JSONResponse(content=result)


@router.post("/api/optimization/tier-status")
async def get_tier_status(request: OptimizationRequest):
    """Get tier status for all providers based on product quantities."""
    calc = get_calculation_service()
    tier_status = calc.get_provider_tier_status(request.product_quantities)
    return JSONResponse(content=tier_status)


class CompareRequest(BaseModel):
    product_quantities: Dict[int, int]
    optimized_allocations: Dict
    use_manual_tiers: bool = False
    tier_volume_overrides: Optional[Dict[int, float]] = None


@router.post("/api/optimization/compare")
async def compare_allocations(request: CompareRequest):
    """Compare current vs optimized allocations."""
    calc = get_calculation_service()

    current_allocations = calc.get_current_allocations(request.product_quantities)
    current_result = calc.calculate_cost_with_allocations(
        request.product_quantities,
        current_allocations,
        use_manual_tiers=request.use_manual_tiers
    )

    optimized_result = calc.calculate_cost_with_allocations(
        request.product_quantities,
        request.optimized_allocations,
        use_manual_tiers=request.use_manual_tiers,
        tier_volume_overrides=request.tier_volume_overrides
    )

    delta_amount = optimized_result['total_cost'] - current_result['total_cost']
    delta_percent = (delta_amount / current_result['total_cost'] * 100) if current_result['total_cost'] > 0 else 0

    return JSONResponse(content={
        'current': current_result,
        'optimized': optimized_result,
        'delta': {
            'amount': round(delta_amount, 2),
            'percent': round(delta_percent, 2)
        }
    })

# Agent API
class AgentMessage(BaseModel):
    role: str
    content: Any
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None
    name: Optional[str] = None

class AgentChatRequest(BaseModel):
    messages: List[AgentMessage]

@router.post("/api/agent/chat")
async def chat_agent(request: AgentChatRequest):
    """Interact with the Pareto Agent."""
    # Convert input messages to LangChain format
    lc_messages = []
    for msg in request.messages:
        if msg.role == "user":
            lc_messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            # If it has tool_calls, we must include them
            tool_calls = []
            if msg.tool_calls:
                # We need to ensure tool_calls are in the format LangChain expects
                # specifically including 'id' which matches the subsequent ToolMessage's tool_call_id
                tool_calls = msg.tool_calls
            
            lc_messages.append(AIMessage(content=msg.content, tool_calls=tool_calls))
        elif msg.role == "tool":
            lc_messages.append(ToolMessage(
                content=msg.content,
                tool_call_id=msg.tool_call_id,
                name=msg.name
            ))

    # Invoke agent
    try:
        final_messages = invoke_agent(lc_messages)
    except Exception as e:
        print(f"Error invoking agent: {e}")
        # In case of error, we can return a fallback message or just raise
        # For better UX, we return the error as a message
        return JSONResponse(content={"messages": [{"role": "assistant", "content": f"Sorry, I encountered an error: {str(e)}"}]})

    # Convert back to JSON-friendly format
    response_messages = []
    for msg in final_messages:
        role = "unknown"
        content = msg.content
        tool_calls = None
        tool_call_id = None
        name = None
        
        if isinstance(msg, HumanMessage):
            role = "user"
        elif isinstance(msg, AIMessage):
            role = "assistant"
            if msg.tool_calls:
                tool_calls = msg.tool_calls
        elif isinstance(msg, ToolMessage):
             role = "tool"
             tool_call_id = msg.tool_call_id
             name = msg.name
        
        response_messages.append({
            "role": role,
            "content": content,
            "tool_calls": tool_calls,
            "tool_call_id": tool_call_id,
            "name": name
        })
    
    return JSONResponse(content={"messages": response_messages})