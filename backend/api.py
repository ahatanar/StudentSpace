# Load environment variables FIRST before any imports
import os
from dotenv import load_dotenv
load_dotenv()

# Now import everything else
from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from typing import List, Optional
from firebase_admin import auth
from models import User, Club, ClubMembership, ClubRole, ClubStatus, ClubType, Event
from services import UserService, ClubService, db
from heatmap_builder import build_simple_heatmap
from calendar_service import CalendarService

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# AUTH DEPENDENCY
# ============================================================================

async def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    """
    Verify Firebase ID Token and return the User object.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split("Bearer ")[1]
    
    try:
        # Verify token with Firebase Admin
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        
        # Get user from DB
        user = UserService.get_user(uid)
        if not user:
            # Create user if not exists (first login)
            user = User(
                uid=uid,
                email=decoded_token.get('email', ''),
                display_name=decoded_token.get('name', 'Unknown'),
                is_admin=False
            )
            UserService.create_or_update_user(user)
            
        return user
        
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")


# ============================================================================
# CLUB ENDPOINTS
# ============================================================================

@app.get("/club-types", response_model=List[str])
def get_club_types():
    """Return list of available club types"""
    return [t.value for t in ClubType]

@app.post("/clubs", response_model=Club)
def create_club(club: Club, user: User = Depends(get_current_user)):
    """Create a new club (Pending approval)"""
    club.created_by = user.uid
    club.president_id = user.uid
    return ClubService.create_club(club, user)

@app.get("/clubs", response_model=List[Club])
def list_clubs(status: str = "active", search: Optional[str] = None):
    """List all clubs (default: active only). Optional search query."""
    club_status = ClubStatus(status) if status else None
    
    if search:
        return ClubService.search_clubs(search, club_status)
    
    return ClubService.list_clubs(club_status)

@app.get("/clubs/{club_id}", response_model=Club)
def get_club(club_id: str):
    club = ClubService.get_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club

@app.put("/clubs/{club_id}")
def update_club(club_id: str, name: str = None, abbreviation: str = None, club_type: str = None, description: str = None, current_user: User = Depends(get_current_user)):
    """Update club details (President only)"""
    club = ClubService.get_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    # Check if user is president or admin
    memberships = ClubService.get_user_memberships(current_user.uid)
    is_president = any(m.club_id == club_id and m.role == ClubRole.PRESIDENT for m in memberships)
    
    if not is_president and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only the Club President can update club details")
    
    updates = {}
    if name is not None:
        updates["name"] = name
    if abbreviation is not None:
        updates["abbreviation"] = abbreviation
    if club_type is not None:
        updates["type"] = club_type
    if description is not None:
        updates["description"] = description
    
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    result = ClubService.update_club(club_id, updates)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to update club")
    return {"message": "Club updated successfully"}

@app.post("/clubs/{club_id}/join")
def join_club(club_id: str, user: User = Depends(get_current_user)):
    """Join a club as a member"""
    return ClubService.add_membership(club_id, user.uid, ClubRole.MEMBER)

@app.post("/clubs/{club_id}/leave")
def leave_club(club_id: str, user: User = Depends(get_current_user)):
    """Leave a club"""
    success = ClubService.remove_membership(club_id, user.uid)
    if not success:
        raise HTTPException(status_code=404, detail="Membership not found")
    return {"message": "Successfully left the club"}

@app.get("/clubs/{club_id}/members")
def get_club_members(club_id: str, user: User = Depends(get_current_user)):
    """Get all members of a club"""
    club = ClubService.get_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return ClubService.get_club_members(club_id)

@app.put("/clubs/{club_id}/status", response_model=Club)
def update_club_status(club_id: str, status: ClubStatus, user: User = Depends(get_current_user)):
    """Update club status (Admin only)"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    club = ClubService.update_club_status(club_id, status)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club

@app.delete("/clubs/{club_id}")
def delete_club(club_id: str, user: User = Depends(get_current_user)):
    """Delete a club (Admin only)"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin permissions required")
    
    club = ClubService.get_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    ClubService.delete_club(club_id)
    return {"message": "Club deleted successfully", "club_id": club_id}


# ============================================================================
# CLUB IMAGE UPLOAD ENDPOINTS
# ============================================================================

@app.post("/clubs/{club_id}/upload-icon")
async def upload_club_icon(club_id: str, file: UploadFile, user: User = Depends(get_current_user)):
    """Upload club icon image (President/Admin only)"""
    from storage_service import StorageService
    
    # Check if club exists
    club = ClubService.get_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    # Check permissions (president or admin)
    memberships = ClubService.get_user_memberships(user.uid)
    is_president = any(m.club_id == club_id and m.role == ClubRole.PRESIDENT for m in memberships)
    
    if not is_president and not user.is_admin:
        raise HTTPException(status_code=403, detail="Only the Club President can upload images")
    
    # Upload image
    icon_url = StorageService.upload_club_image(club_id, file, "icon")
    
    # Update club document
    ClubService.update_club(club_id, {"icon_url": icon_url})
    
    return {"message": "Icon uploaded successfully", "icon_url": icon_url}


@app.post("/clubs/{club_id}/upload-banner")
async def upload_club_banner(club_id: str, file: UploadFile, user: User = Depends(get_current_user)):
    """Upload club banner image (President/Admin only)"""
    from storage_service import StorageService
    
    # Check if club exists
    club = ClubService.get_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    # Check permissions (president or admin)
    memberships = ClubService.get_user_memberships(user.uid)
    is_president = any(m.club_id == club_id and m.role == ClubRole.PRESIDENT for m in memberships)
    
    if not is_president and not user.is_admin:
        raise HTTPException(status_code=403, detail="Only the Club President can upload images")
    
    # Upload image
    banner_url = StorageService.upload_club_image(club_id, file, "banner")
    
    # Update club document
    ClubService.update_club(club_id, {"banner_url": banner_url})
    
    return {"message": "Banner uploaded successfully", "banner_url": banner_url}


@app.delete("/clubs/{club_id}/icon")
def delete_club_icon(club_id: str, user: User = Depends(get_current_user)):
    """Delete club icon (President/Admin only)"""
    from storage_service import StorageService
    
    # Check if club exists
    club = ClubService.get_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    # Check permissions
    memberships = ClubService.get_user_memberships(user.uid)
    is_president = any(m.club_id == club_id and m.role == ClubRole.PRESIDENT for m in memberships)
    
    if not is_president and not user.is_admin:
        raise HTTPException(status_code=403, detail="Only the Club President can delete images")
    
    # Delete from storage
    StorageService.delete_club_image(club_id, "icon")
    
    # Update club document
    ClubService.update_club(club_id, {"icon_url": None})
    
    return {"message": "Icon deleted successfully"}


@app.delete("/clubs/{club_id}/banner")
def delete_club_banner(club_id: str, user: User = Depends(get_current_user)):
    """Delete club banner (President/Admin only)"""
    from storage_service import StorageService
    
    # Check if club exists
    club = ClubService.get_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    # Check permissions
    memberships = ClubService.get_user_memberships(user.uid)
    is_president = any(m.club_id == club_id and m.role == ClubRole.PRESIDENT for m in memberships)
    
    if not is_president and not user.is_admin:
        raise HTTPException(status_code=403, detail="Only the Club President can delete images")
    
    # Delete from storage
    StorageService.delete_club_image(club_id, "banner")
    
    # Update club document
    ClubService.update_club(club_id, {"banner_url": None})
    
    return {"message": "Banner deleted successfully"}



# ============================================================================
# USER ENDPOINTS
# ============================================================================

@app.get("/users/me", response_model=User)
def get_my_profile(user: User = Depends(get_current_user)):
    return user

@app.get("/users/me/memberships")
def get_my_memberships(user: User = Depends(get_current_user)):
    return ClubService.get_user_memberships(user.uid)

@app.get("/users/me/is-executive")
def check_is_executive(user: User = Depends(get_current_user)):
    """Check if current user is an executive or president in any club.
    
    This determines access to premium features like the campus heatmap.
    """
    from services import db
    from models import is_executive_anywhere
    
    is_exec = is_executive_anywhere(user.uid, db)
    return {"is_executive": is_exec}

@app.get("/users/search", response_model=User)
def search_user(email: str, user: User = Depends(get_current_user)):
    """Search for a user by email (Authenticated users only)"""
    found_user = UserService.get_user_by_email(email)
    if not found_user:
        raise HTTPException(status_code=404, detail="User not found")
    return found_user

@app.post("/clubs/{club_id}/executives", response_model=ClubMembership)
def add_club_executive(club_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    """Add a user as an executive to a club (President/Admin only)"""
    # Check permissions
    if not current_user.is_admin:
        club = ClubService.get_club(club_id)
        if not club:
            raise HTTPException(status_code=404, detail="Club not found")
            
        memberships = ClubService.get_user_memberships(current_user.uid)
        is_president = any(m.club_id == club_id and m.role == ClubRole.PRESIDENT for m in memberships)
        
        if not is_president:
             raise HTTPException(status_code=403, detail="Only the Club President can add executives")

    return ClubService.add_executive(club_id, user_id)

@app.put("/clubs/{club_id}/members/{user_id}/role")
def update_member_role(club_id: str, user_id: str, role: str, current_user: User = Depends(get_current_user)):
    """Update a member's role (President only) - promote to executive or demote to member"""
    # Check permissions
    club = ClubService.get_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    memberships = ClubService.get_user_memberships(current_user.uid)
    is_president = any(m.club_id == club_id and m.role == ClubRole.PRESIDENT for m in memberships)
    
    if not is_president and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only the Club President can update member roles")
    
    # Can't change president role
    if role == "president":
        raise HTTPException(status_code=400, detail="Cannot assign president role")
    
    # Validate role
    if role not in ["executive", "member"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'executive' or 'member'")
    
    new_role = ClubRole.EXECUTIVE if role == "executive" else ClubRole.MEMBER
    result = ClubService.update_member_role(club_id, user_id, new_role)
    if not result:
        raise HTTPException(status_code=404, detail="Membership not found")
    return {"message": f"Role updated to {role}"}

@app.delete("/clubs/{club_id}/president")
def delete_club_as_president(club_id: str, current_user: User = Depends(get_current_user)):
    """Delete a club (President only)"""
    club = ClubService.get_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    memberships = ClubService.get_user_memberships(current_user.uid)
    is_president = any(m.club_id == club_id and m.role == ClubRole.PRESIDENT for m in memberships)
    
    if not is_president and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only the Club President can delete the club")
    
    ClubService.delete_club(club_id)
    return {"message": "Club deleted successfully"}


# ============================================================================
# HEATMAP (EXISTING)
# ============================================================================

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/heatmap")
def get_heatmap(interval: int = 30, term: str = "202601", include_raw: bool = False):
    result = build_simple_heatmap(interval, term)
    if not include_raw and 'rawSections' in result:
        raw_count = len(result['rawSections'])
        del result['rawSections']
        result['rawSectionsCount'] = raw_count
    return result


# ============================================================================
# EVENTS ENDPOINTS
# ============================================================================

@app.get("/events")
def get_events(
    start_date: Optional[str] = None,  # ISO format: 2025-01-01
    end_date: Optional[str] = None,    # ISO format: 2025-01-31
    club_id: Optional[str] = None      # Filter by specific club
):
    """
    Get events within a date range for the calendar.
    
    - start_date/end_date: ISO date strings to filter events
    - club_id: Optional filter for specific club's events
    - Returns events with club name included for display
    """
    from services import db
    from datetime import datetime
    
    if not db:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    # Build query
    events_ref = db.collection('events')
    
    # Apply club filter if provided
    if club_id:
        events_ref = events_ref.where('club_id', '==', club_id)
    
    # Get all events (Firestore doesn't support complex date range queries well)
    docs = events_ref.stream()
    
    events = []
    for doc in docs:
        event_data = doc.to_dict()
        event_data['id'] = doc.id
        
        # Convert Firestore timestamps to ISO strings
        if 'start_time' in event_data and event_data['start_time']:
            start_time = event_data['start_time']
            if hasattr(start_time, 'isoformat'):
                event_data['start_time'] = start_time.isoformat()
            elif hasattr(start_time, 'timestamp'):
                # Firestore Timestamp
                event_data['start_time'] = start_time.timestamp()
        
        if 'end_time' in event_data and event_data['end_time']:
            end_time = event_data['end_time']
            if hasattr(end_time, 'isoformat'):
                event_data['end_time'] = end_time.isoformat()
            elif hasattr(end_time, 'timestamp'):
                event_data['end_time'] = end_time.timestamp()
        
        # Get club name for display
        if 'club_id' in event_data:
            club = ClubService.get_club(event_data['club_id'])
            event_data['club_name'] = club.name if club else 'Unknown Club'
            event_data['club_abbreviation'] = club.abbreviation if club else None
        
        events.append(event_data)
    
    # Filter by date range in Python (Firestore limitation)
    if start_date or end_date:
        filtered_events = []
        try:
            start_dt = datetime.fromisoformat(start_date) if start_date else None
            end_dt = datetime.fromisoformat(end_date) if end_date else None
            # Add end of day for end_date
            if end_dt:
                end_dt = end_dt.replace(hour=23, minute=59, second=59)
        except Exception as e:
            print(f"Date parse error: {e}")
            start_dt = None
            end_dt = None
        
        for event in events:
            event_start = event.get('start_time')
            if event_start:
                try:
                    # Handle both timestamp (float) and ISO string
                    if isinstance(event_start, (int, float)):
                        event_dt = datetime.fromtimestamp(event_start)
                    else:
                        # Parse ISO string and remove timezone info for comparison
                        event_dt = datetime.fromisoformat(event_start.replace('Z', '+00:00').replace('+00:00', ''))
                        # Handle if still has timezone
                        if hasattr(event_dt, 'tzinfo') and event_dt.tzinfo:
                            event_dt = event_dt.replace(tzinfo=None)
                    
                    # Check if within range
                    if start_dt and event_dt.date() < start_dt.date():
                        continue
                    if end_dt and event_dt.date() > end_dt.date():
                        continue
                        
                    filtered_events.append(event)
                except Exception as e:
                    print(f"Event date parse error: {e}, event_start={event_start}")
                    # Include event if we can't parse its date
                    filtered_events.append(event)
        
        events = filtered_events
    
    # Sort by start_time
    events.sort(key=lambda x: x.get('start_time', '') if isinstance(x.get('start_time'), str) else 0)
    
    return {"events": events, "count": len(events)}


# ============================================================================
# CALENDAR INTEGRATION ENDPOINTS
# ============================================================================

FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", "http://localhost:3000")

@app.get("/api/calendar/status")
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


@app.get("/api/calendar/oauth-callback")
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


@app.post("/api/calendar/disconnect")
def disconnect_calendar(user: User = Depends(get_current_user)):
    """Disconnect user's Google Calendar."""
    success = CalendarService.disconnect_calendar(user.uid, db)
    if success:
        return {"message": "Calendar disconnected successfully"}
    raise HTTPException(status_code=500, detail="Failed to disconnect calendar")


# ============================================================================
# EVENT CRUD ENDPOINTS (with Calendar Sync)
# ============================================================================

@app.post("/events", response_model=dict)
def create_event(
    club_id: str,
    name: str,
    start_time: str,
    end_time: Optional[str] = None,
    description: Optional[str] = None,
    location: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """
    Create a new club event.
    Only executives/presidents of the club can create events.
    Automatically syncs to connected members' Google Calendars.
    """
    from datetime import datetime
    from models import can_create_events
    
    # Check permissions
    if not can_create_events(user.uid, club_id, db) and not user.is_admin:
        raise HTTPException(status_code=403, detail="Only club executives can create events")
    
    # Parse times
    try:
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00')) if end_time else None
    except:
        raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO 8601.")
    
    # Create event in Firestore
    event_data = {
        "club_id": club_id,
        "name": name,
        "description": description,
        "location": location,
        "start_time": start_dt,
        "end_time": end_dt,
        "created_by": user.uid,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    }
    
    doc_ref = db.collection("events").document()
    event_data["id"] = doc_ref.id
    doc_ref.set(event_data)
    
    # Sync to calendars (async in production, sync for now)
    if CalendarService.is_configured():
        sync_result = CalendarService.push_event_to_all_members(doc_ref.id, db)
        return {
            "message": "Event created successfully",
            "event_id": doc_ref.id,
            "calendar_sync": sync_result
        }
    
    return {"message": "Event created successfully", "event_id": doc_ref.id}


@app.put("/events/{event_id}")
def update_event(
    event_id: str,
    name: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    description: Optional[str] = None,
    location: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Update an existing event and sync changes to calendars."""
    from datetime import datetime
    from models import can_edit_event
    
    # Get existing event
    event_doc = db.collection("events").document(event_id).get()
    if not event_doc.exists:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_data = event_doc.to_dict()
    
    # Check permissions
    if not can_edit_event(user.uid, event_data, db, user):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Build update
    updates = {"updated_at": datetime.now()}
    if name:
        updates["name"] = name
    if description is not None:
        updates["description"] = description
    if location is not None:
        updates["location"] = location
    if start_time:
        updates["start_time"] = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
    if end_time:
        updates["end_time"] = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
    
    db.collection("events").document(event_id).update(updates)
    
    # Sync to calendars
    if CalendarService.is_configured():
        updated_event = {**event_data, **updates}
        CalendarService.update_calendar_event(event_id, updated_event, db)
    
    return {"message": "Event updated successfully"}


@app.delete("/events/{event_id}")
def delete_event(event_id: str, user: User = Depends(get_current_user)):
    """Delete an event and remove from all synced calendars."""
    from models import can_edit_event
    
    # Get event
    event_doc = db.collection("events").document(event_id).get()
    if not event_doc.exists:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_data = event_doc.to_dict()
    
    # Check permissions
    if not can_edit_event(user.uid, event_data, db, user):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Delete from calendars first
    if CalendarService.is_configured():
        CalendarService.delete_calendar_event(event_id, db)
    
    # Delete event
    db.collection("events").document(event_id).delete()
    
    return {"message": "Event deleted successfully"}

