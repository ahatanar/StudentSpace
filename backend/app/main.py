"""
FastAPI application entry point.
"""

# Load environment variables FIRST before any imports
import os
from dotenv import load_dotenv
load_dotenv()
from fastapi.responses import JSONResponse

# Now import everything else
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from app.routers import clubs, users, events, calendar, heatmap

app = FastAPI(title="StudentSpace API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(clubs.router)
app.include_router(users.router)
app.include_router(events.router)
app.include_router(calendar.router)
app.include_router(heatmap.router)

# Legacy route for club-types (backward compatibility)
from app.models.schemas import ClubType
from typing import List

@app.get("/club-types", response_model=List[str])
def get_club_types():
    """Return list of available club types (legacy endpoint)"""
    return [t.value for t in ClubType]

@app.get("/health")
async def health_get():
    return {"status": "ok"}

@app.head("/health")
async def health_head():
    return JSONResponse(status_code=200, content=None)