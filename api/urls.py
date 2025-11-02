from fastapi import APIRouter
from fastapi.staticfiles import StaticFiles
import os

from api.routers import home, pricing, products

# Create main API router
api_router = APIRouter()

# Include all routers
api_router.include_router(home.router, prefix="", tags=["home"])
api_router.include_router(pricing.router, prefix="", tags=["pricing"])
api_router.include_router(products.router, prefix="", tags=["products"])

# Static files configuration
def setup_static_files(app):
    """Setup static files serving."""
    # Get the absolute path to the frontend directory
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

    # Mount static files
    if os.path.exists(frontend_dir):
        app.mount("/static", StaticFiles(directory=frontend_dir), name="static")