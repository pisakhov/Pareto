from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional, List, Dict
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
    process_id: int
    tier_number: int
    price_per_unit: float
    status: Optional[str] = "active"


class OfferUpdate(BaseModel):
    tier_number: Optional[int] = None
    price_per_unit: Optional[float] = None
    status: Optional[str] = None


@router.get("/contracts", response_class=HTMLResponse)
async def contracts_page(request: Request):
    """Redirect to the first process or show processes list if none exist."""
    crud = get_crud()
    processes = crud.get_all_processes()

    # If there are processes, redirect to the first one
    if processes and len(processes) > 0:
        from fastapi.responses import RedirectResponse
        first_process_id = processes[0]["process_id"]
        return RedirectResponse(url=f"/contracts/{first_process_id}", status_code=302)

    # If no processes, show the contracts page with empty state
    return templates.TemplateResponse("contracts/index.html", {"request": request, "current_process": None, "processes": processes})


@router.get("/contracts/{process_id}", response_class=HTMLResponse)
async def contracts_process_detail(request: Request, process_id: int):
    """Render contracts page for specific process."""
    crud = get_crud()

    # Get process details
    process = crud.get_process(process_id)
    if not process:
        # Redirect to main contracts page if process not found
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/contracts", status_code=302)

    # Get all processes for navigation
    processes = crud.get_all_processes()

    return templates.TemplateResponse(
        "contracts/index.html",
        {
            "request": request,
            "current_process": process,
            "processes": processes
        }
    )


# Provider endpoints
@router.get("/api/providers")
async def get_providers():
    """Get all providers."""
    crud = get_crud()
    providers = crud.get_all_providers_with_tier_counts()
    return JSONResponse(content=providers)


@router.get("/api/providers/allocations")
async def get_provider_allocations():
    """Get all provider item allocations."""
    crud = get_crud()
    allocations = crud.get_all_allocations()
    return JSONResponse(content=allocations)


@router.post("/api/providers")
async def create_provider(provider: ProviderCreate):
    """Create a new provider."""
    crud = get_crud()
    new_provider = crud.create_provider(
        company_name=provider.company_name,
        details=provider.details,
        status=provider.status,
    )
    return JSONResponse(content=new_provider)


@router.get("/api/providers/{provider_id}")
async def get_provider(provider_id: int):
    """Get a specific provider."""
    crud = get_crud()
    provider = crud.get_provider(provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail=f"Provider with ID {provider_id} not found")
    return JSONResponse(content=provider)


@router.put("/api/providers/{provider_id}")
async def update_provider(provider_id: int, provider: ProviderUpdate):
    """Update a provider."""
    crud = get_crud()
    success = crud.update_provider(
        provider_id=provider_id,
        company_name=provider.company_name,
        details=provider.details,
        status=provider.status,
    )
    if not success:
        raise HTTPException(status_code=404, detail=f"Provider with ID {provider_id} not found")
    return JSONResponse(content={"message": "Provider updated successfully"})


@router.delete("/api/providers/{provider_id}")
async def delete_provider(provider_id: int):
    """Delete a provider."""
    crud = get_crud()
    try:
        crud.delete_provider(provider_id)
        return JSONResponse(content={"message": "Provider deleted successfully"})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Offer endpoints
@router.get("/api/offers")
async def get_offers(
    item_id: Optional[int] = Query(None),
    provider_id: Optional[int] = Query(None)
):
    """Get offers, optionally filtered by item and/or provider."""
    crud = get_crud()
    if item_id is not None or provider_id is not None:
        offers = crud.get_offers_filtered(item_id=item_id, provider_id=provider_id)
    else:
        offers = crud.get_all_offers()

    for offer in offers:
        if "tier_number" in offer:
            offer["tier_number"] = offer.pop("tier_number")
    return JSONResponse(content=offers)


@router.get("/api/offers/provider/{provider_id}")
async def get_offers_by_provider(provider_id: int):
    """Get all offers for a specific provider."""
    crud = get_crud()
    offers = crud.get_offers_by_provider(provider_id)
    return JSONResponse(content=offers)


@router.post("/api/offers")
async def create_offer(offer: OfferCreate):
    """Create a new offer."""
    crud = get_crud()

    new_offer = crud.create_offer(
        item_id=offer.item_id,
        provider_id=offer.provider_id,
        process_id=offer.process_id,
        tier_number=offer.tier_number,
        price_per_unit=offer.price_per_unit,
        status=offer.status,
    )

    return JSONResponse(content=new_offer)


@router.put("/api/offers/{offer_id}")
async def update_offer(offer_id: int, offer: OfferUpdate):
    """Update an offer."""
    crud = get_crud()
    success = crud.update_offer(
        offer_id=offer_id,
        tier_number=offer.tier_number,
        price_per_unit=offer.price_per_unit,
        status=offer.status,
    )
    if not success:
        raise HTTPException(status_code=404, detail=f"Offer with ID {offer_id} not found")
    return JSONResponse(content={"message": "Offer updated successfully"})


@router.get("/api/offers/{offer_id}")
async def get_offer(offer_id: int):
    """Get a specific offer."""
    crud = get_crud()
    offer = crud.get_offer(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail=f"Offer with ID {offer_id} not found")
    return JSONResponse(content=offer)


@router.delete("/api/offers/{offer_id}")
async def delete_offer(offer_id: int):
    """Delete an offer."""
    crud = get_crud()
    crud.delete_offer(offer_id)
    return JSONResponse(content={"message": "Offer deleted successfully"})


@router.delete("/api/items/{item_id}/offers")
async def delete_offers_for_item(item_id: int):
    """Delete all offers for an item."""
    crud = get_crud()
    count = crud.delete_offers_for_item(item_id)
    return JSONResponse(content={"message": f"{count} offers deleted successfully"})


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
    crud = get_crud()
    items = crud.get_all_items()
    return JSONResponse(
        content=[
            {
                "item_id": i[0],
                "item_name": i[1],
                "description": i[2],
                "status": i[3],
                "date_creation": i[4],
                "date_last_update": i[5],
            }
            for i in items
        ]
    )


@router.post("/api/items")
async def create_item(item: ItemCreate):
    """Create a new item and associate providers."""
    crud = get_crud()

    new_item = crud.create_item(
        item_name=item.item_name, description=item.description, status=item.status
    )

    if item.provider_ids is not None:
        crud.set_providers_for_item(new_item["item_id"], item.provider_ids)

    return JSONResponse(content=new_item)


@router.get("/api/items/{item_id}")
async def get_item(item_id: int):
    """Get a specific item."""
    crud = get_crud()
    item = crud.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Item with ID {item_id} not found")
    return JSONResponse(content=item)


@router.get("/api/items/{item_id}/providers")
async def get_item_providers(item_id: int):
    """Get all providers for a specific item with full details."""
    crud = get_crud()
    provider_ids = crud.get_providers_for_item(item_id)

    providers = []
    for provider_id in provider_ids:
        provider = crud.get_provider(provider_id)
        if provider and provider["status"] == 'active':
            providers.append({
                'provider_id': provider["provider_id"],
                'company_name': provider["company_name"],
                'status': provider["status"]
            })

    return JSONResponse(content=providers)


@router.put("/api/items/{item_id}")
async def update_item(item_id: int, item: ItemUpdate):
    """Update an item and its provider associations."""
    crud = get_crud()

    success = crud.update_item(
        item_id=item_id,
        item_name=item.item_name,
        description=item.description,
        status=item.status,
    )
    if not success:
        raise HTTPException(status_code=404, detail=f"Item with ID {item_id} not found")

    if item.provider_ids is not None:
        crud.set_providers_for_item(item_id, item.provider_ids)

    return JSONResponse(content={"message": "Item updated successfully"})


@router.delete("/api/items/{item_id}")
async def delete_item(item_id: int):
    """Delete an item."""
    crud = get_crud()
    crud.delete_item(item_id)
    return JSONResponse(content={"message": "Item deleted successfully"})


# Provider-Item relationship endpoints
@router.get("/api/provider-items")
async def get_provider_items():
    """Get all provider-item relationships."""
    crud = get_crud()
    relationships = crud.get_provider_item_relationships()
    return JSONResponse(
        content=[
            {
                "provider_id": r[0],
                "item_id": r[1],
                "date_creation": r[2],
            }
            for r in relationships
        ]
    )


# Tier-based pricing endpoints
@router.get("/api/providers/{provider_id}/tier-thresholds")
async def get_tier_thresholds(provider_id: int):
    """Get tier thresholds for all processes with this provider."""
    crud = get_crud()
    processes = crud.get_all_processes()
    provider_processes = [p for p in processes if p['provider_id'] == provider_id]
    tier_data = {}
    for process in provider_processes:
        if process['tier_thresholds'] and process['tier_thresholds'] != '{}':
            tier_data[process['process_id']] = {
                'process_name': process['process_name'],
                'tier_thresholds': process['tier_thresholds']
            }
    return JSONResponse(content=tier_data)


@router.get("/api/contract-tiers/process/{process_id}/provider/{provider_id}")
async def get_contract_tiers_by_process_and_provider(process_id: int, provider_id: int):
    """Get tier thresholds for a specific provider in a specific process."""
    crud = get_crud()
    # Get the contract for this process and provider
    contracts = crud.get_contracts_for_process(process_id)
    contract = None
    for c in contracts:
        if c['provider_id'] == provider_id:
            contract = c
            break

    if not contract:
        return JSONResponse(
            content={"error": f"No contract found for provider {provider_id} in process {process_id}"},
            status_code=404
        )

    # Get tiers for this contract
    tiers = crud.get_contract_tiers_for_contract(contract['contract_id'])

    # Format tiers as key-value pairs
    tier_thresholds = {}
    for tier in tiers:
        tier_thresholds[str(tier['tier_number'])] = tier['threshold_units']

    return JSONResponse(content={
        "contract_id": contract['contract_id'],
        "tier_thresholds": tier_thresholds
    })


# =====================================
# NEW SCHEMA ENTITY ENDPOINTS
# =====================================

# Process management endpoints
class ProcessCreate(BaseModel):
    process_name: str
    description: Optional[str] = ""
    provider_id: int
    tier_thresholds: Optional[str] = "{}"
    status: Optional[str] = "active"


class ProcessUpdate(BaseModel):
    process_name: Optional[str] = None
    description: Optional[str] = None
    provider_id: Optional[int] = None
    tier_thresholds: Optional[str] = None
    status: Optional[str] = None


@router.get("/api/processes")
async def get_processes():
    """Get all processes."""
    crud = get_crud()
    processes = crud.get_all_processes()
    return JSONResponse(content=processes)


@router.post("/api/processes")
async def create_process(process: ProcessCreate):
    """Create a new process."""
    crud = get_crud()
    new_process = crud.create_process(
        process_name=process.process_name,
        description=process.description,
        provider_id=process.provider_id,
        tier_thresholds=process.tier_thresholds,
        status=process.status,
    )
    return JSONResponse(status_code=201, content=new_process)


@router.get("/api/processes/{process_id}")
async def get_process(process_id: int):
    """Get a specific process."""
    crud = get_crud()
    process = crud.get_process(process_id)
    return JSONResponse(content=process)


@router.put("/api/processes/{process_id}")
async def update_process(process_id: int, process: ProcessUpdate):
    """Update a process."""
    crud = get_crud()
    result = crud.update_process(
        process_id=process_id,
        process_name=process.process_name,
        description=process.description,
        provider_id=process.provider_id,
        tier_thresholds=process.tier_thresholds,
        status=process.status,
    )
    return JSONResponse(content={"message": "Process updated successfully"})


@router.delete("/api/processes/{process_id}")
async def delete_process(process_id: int):
    """Delete a process."""
    crud = get_crud()
    try:
        crud.delete_process(process_id)
        return JSONResponse(content={"message": "Process deleted successfully"})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Process graph endpoints
@router.get("/api/process-graph")
async def get_process_graph():
    """Get all process graph connections."""
    crud = get_crud()
    connections = crud.get_process_graph()
    # Convert tuples to objects for JavaScript
    result = [
        {"from_process_id": conn[0], "to_process_id": conn[1]}
        for conn in connections
    ]
    return JSONResponse(content=result)


@router.post("/api/process-graph")
async def add_process_edge(
    from_process_id: int = Query(..., description="Source process ID"),
    to_process_id: int = Query(..., description="Target process ID")
):
    """Add a connection between processes."""
    crud = get_crud()
    success = crud.add_process_graph_edge(from_process_id, to_process_id)
    if success:
        return JSONResponse(content={"message": "Connection added successfully"})
    return JSONResponse(content={"error": "Failed to add connection"}, status_code=400)


@router.delete("/api/process-graph")
async def remove_process_edge(
    from_process_id: int = Query(..., description="Source process ID"),
    to_process_id: int = Query(..., description="Target process ID")
):
    """Remove a connection between processes."""
    crud = get_crud()
    crud.remove_process_graph_edge(from_process_id, to_process_id)
    # DELETE is idempotent - always return success even if connection didn't exist
    return JSONResponse(content={"message": "Connection removed successfully"})


# Forecast management endpoints
class ForecastCreate(BaseModel):
    product_id: int
    year: int
    month: int
    forecast_units: int


class ForecastUpdate(BaseModel):
    forecast_units: Optional[int] = None


@router.get("/api/forecasts")
async def get_forecasts():
    """Get all forecasts."""
    crud = get_crud()
    forecasts = crud.get_all_forecasts()
    return JSONResponse(content=forecasts)


@router.get("/api/forecasts/product/{product_id}")
async def get_forecasts_for_product(product_id: int):
    """Get forecasts for a specific product."""
    crud = get_crud()
    forecasts = crud.get_forecasts_for_product(product_id)
    return JSONResponse(content=forecasts)


@router.post("/api/forecasts")
async def create_forecast(forecast: ForecastCreate):
    """Create a new forecast."""
    crud = get_crud()
    new_forecast = crud.create_forecast(
        product_id=forecast.product_id,
        year=forecast.year,
        month=forecast.month,
        forecast_units=forecast.forecast_units,
    )
    return JSONResponse(content=new_forecast)


@router.put("/api/forecasts/{forecast_id}")
async def update_forecast(forecast_id: int, forecast: ForecastUpdate):
    """Update a forecast."""
    crud = get_crud()
    crud.update_forecast(
        forecast_id=forecast_id,
        forecast_units=forecast.forecast_units,
    )
    return JSONResponse(content={"message": "Forecast updated successfully"})


@router.delete("/api/forecasts/{forecast_id}")
async def delete_forecast(forecast_id: int):
    """Delete a forecast."""
    crud = get_crud()
    crud.delete_forecast(forecast_id)
    return JSONResponse(content={"message": "Forecast deleted successfully"})


# Actual management endpoints
class ActualCreate(BaseModel):
    product_id: int
    year: int
    month: int
    actual_units: int


class ActualUpdate(BaseModel):
    actual_units: Optional[int] = None


@router.get("/api/actuals")
async def get_actuals():
    """Get all actuals."""
    crud = get_crud()
    actuals = crud.get_all_actuals()
    return JSONResponse(content=actuals)


@router.get("/api/actuals/product/{product_id}")
async def get_actuals_for_product(product_id: int):
    """Get actuals for a specific product."""
    crud = get_crud()
    actuals = crud.get_actuals_for_product(product_id)
    return JSONResponse(content=actuals)


@router.post("/api/actuals")
async def create_actual(actual: ActualCreate):
    """Create a new actual."""
    crud = get_crud()
    new_actual = crud.create_actual(
        product_id=actual.product_id,
        year=actual.year,
        month=actual.month,
        actual_units=actual.actual_units,
    )
    return JSONResponse(content=new_actual)


@router.put("/api/actuals/{actual_id}")
async def update_actual(actual_id: int, actual: ActualUpdate):
    """Update an actual."""
    crud = get_crud()
    crud.update_actual(
        actual_id=actual_id,
        actual_units=actual.actual_units,
    )
    return JSONResponse(content={"message": "Actual updated successfully"})


@router.delete("/api/actuals/{actual_id}")
async def delete_actual(actual_id: int):
    """Delete an actual."""
    crud = get_crud()
    crud.delete_actual(actual_id)
    return JSONResponse(content={"message": "Actual deleted successfully"})


# =====================================
# CONTRACT API ENDPOINTS
# =====================================

class ContractCreate(BaseModel):
    process_id: int
    provider_id: int
    contract_name: Optional[str] = None
    status: Optional[str] = "active"


class ContractUpdate(BaseModel):
    contract_name: Optional[str] = None
    status: Optional[str] = None


class ContractTierCreate(BaseModel):
    contract_id: int
    tier_number: int
    threshold_units: int
    is_selected: Optional[bool] = False


class ContractTierUpdate(BaseModel):
    threshold_units: Optional[int] = None
    is_selected: Optional[bool] = None


# Contract endpoints
@router.get("/api/contracts")
async def get_contracts():
    """Get all contracts."""
    crud = get_crud()
    contracts = crud.get_all_processes()  # Get all processes
    # Group by process name
    result = {}
    for process in contracts:
        process_name = process['process_name']
        if process_name not in result:
            result[process_name] = []
        result[process_name].append(process)
    return JSONResponse(content=result)


@router.get("/api/contracts/process/{process_name}")
async def get_contracts_for_process(process_name: str):
    """Get all contracts for a specific process name (all processes with that name)."""
    crud = get_crud()
    # Get ALL processes with this name (not just one)
    all_processes = crud.get_all_processes()
    processes_with_name = [p for p in all_processes if p['process_name'] == process_name]

    if not processes_with_name:
        return JSONResponse(content=[])

    # Get contracts for all processes with this name
    all_contracts = []
    for process in processes_with_name:
        contracts = crud.get_contracts_for_process(process['process_id'])
        all_contracts.extend(contracts)

    return JSONResponse(content=all_contracts)


@router.get("/api/contracts/by-process/{process_id}")
async def get_contracts_by_process_id(process_id: int):
    """Get all contracts for a specific process ID."""
    crud = get_crud()
    contracts = crud.get_contracts_for_process(process_id)
    return JSONResponse(content=contracts)


@router.post("/api/contracts")
async def create_contract(contract: ContractCreate):
    """Create a new contract."""
    crud = get_crud()
    new_contract = crud.create_contract(
        process_id=contract.process_id,
        provider_id=contract.provider_id,
        contract_name=contract.contract_name,
        status=contract.status
    )
    return JSONResponse(content=new_contract)


@router.get("/api/contracts/{contract_id}")
async def get_contract(contract_id: int):
    """Get a specific contract."""
    crud = get_crud()
    contract = crud.get_contract(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail=f"Contract with ID {contract_id} not found")
    return JSONResponse(content=contract)


@router.put("/api/contracts/{contract_id}")
async def update_contract(contract_id: int, contract: ContractUpdate):
    """Update a contract."""
    crud = get_crud()
    success = crud.update_contract(
        contract_id=contract_id,
        contract_name=contract.contract_name,
        status=contract.status
    )
    if not success:
        raise HTTPException(status_code=404, detail=f"Contract with ID {contract_id} not found")
    return JSONResponse(content={"message": "Contract updated successfully"})


@router.delete("/api/contracts/{contract_id}")
async def delete_contract(contract_id: int):
    """Delete a contract."""
    crud = get_crud()
    crud.delete_contract(contract_id)
    return JSONResponse(content={"message": "Contract deleted successfully"})


# Contract Tier endpoints
@router.get("/api/contract-tiers/{contract_id}")
async def get_contract_tiers(contract_id: int):
    """Get all tiers for a specific contract."""
    crud = get_crud()
    tiers = crud.get_contract_tiers_for_contract(contract_id)
    return JSONResponse(content=tiers)


@router.post("/api/contract-tiers")
async def create_contract_tier(tier: ContractTierCreate):
    """Create a new contract tier."""
    crud = get_crud()
    new_tier = crud.create_contract_tier(
        contract_id=tier.contract_id,
        tier_number=tier.tier_number,
        threshold_units=tier.threshold_units,
        is_selected=tier.is_selected
    )
    return JSONResponse(content=new_tier)


@router.put("/api/contract-tiers/{contract_tier_id}")
async def update_contract_tier(contract_tier_id: int, tier: ContractTierUpdate):
    """Update a contract tier."""
    crud = get_crud()
    success = crud.update_contract_tier(
        contract_tier_id=contract_tier_id,
        threshold_units=tier.threshold_units,
        is_selected=tier.is_selected
    )
    if not success:
        raise HTTPException(status_code=404, detail=f"Contract tier with ID {contract_tier_id} not found")
    return JSONResponse(content={"message": "Contract tier updated successfully"})


@router.delete("/api/contract-tiers/{contract_tier_id}")
async def delete_contract_tier(contract_tier_id: int):
    """Delete a contract tier."""
    crud = get_crud()
    crud.delete_contract_tier(contract_tier_id)
    return JSONResponse(content={"message": "Contract tier deleted successfully"})

