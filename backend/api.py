from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from firebase_admin import auth
from models import User, Club, ClubMembership, ClubRole, ClubStatus, ClubType
from services import UserService, ClubService
from heatmap_builder import build_simple_heatmap

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
