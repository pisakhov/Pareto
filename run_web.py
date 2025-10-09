import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import os

from api.urls import api_router, setup_static_files

# Create FastAPI application
app = FastAPI(
    title="Pareto",
    description="Efficient point for productivity and optimization",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(api_router)

# Setup static files
setup_static_files(app)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Welcome to Pareto API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Pareto"}


# Development server
if __name__ == "__main__":
    print("Starting Pareto web application...")
    print("Server will be available at: http://localhost:5000")
    print("API documentation available at: http://localhost:5000/docs")

    uvicorn.run(
        "run_web:app",
        host="0.0.0.0",
        port=5001,
        reload=True,  # Enable auto-reload for development
        log_level="info"
    )