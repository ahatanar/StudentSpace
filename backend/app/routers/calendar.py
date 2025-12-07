"""
Google Calendar integration API endpoints.
"""

import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse

from app.models.schemas import User
from app.services.calendar_service import CalendarService
from app.services import db
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", "http://localhost:3000")


@router.get("/status")
def get_calendar_status(user: User = Depends(get_current_user)):
    """
    Check if user has connected Google Calendar.
    If not, return OAuth URL for connecting.
    """
    if not CalendarService.is_configured():
        return {
            "calendarConnected": False,
            "configured": False,
            "message": "Google Calendar integration not configured"
        }
    
    if user.calendar_connected and user.google_refresh_token:
        return {"calendarConnected": True}
    
    # Generate OAuth URL
    try:
        auth_url = CalendarService.get_oauth_url(user.uid)
        return {"calendarConnected": False, "authUrl": auth_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate auth URL: {e}")


@router.get("/oauth-callback")
def calendar_oauth_callback(code: str, state: str):
    """
    Handle OAuth callback from Google.
    Exchange code for tokens and redirect to frontend.
    """
    result = CalendarService.handle_oauth_callback(code, state, db)
    
    if result.get("success"):
        return RedirectResponse(f"{FRONTEND_APP_URL}/settings?calendar=connected")
    else:
        error = result.get("error", "Unknown error")
        return RedirectResponse(f"{FRONTEND_APP_URL}/settings?calendar=error&message={error}")


@router.post("/disconnect")
def disconnect_calendar(user: User = Depends(get_current_user)):
    """Disconnect user's Google Calendar."""
    success = CalendarService.disconnect_calendar(user.uid, db)
    if success:
        return {"message": "Calendar disconnected successfully"}
    raise HTTPException(status_code=500, detail="Failed to disconnect calendar")
