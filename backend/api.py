from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from firebase_admin import auth
from models import User, Club, ClubRole, ClubStatus, ClubType
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
def list_clubs(status: str = "active"):
    """List all clubs (default: active only)"""
    club_status = ClubStatus(status) if status else None
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

@app.put("/clubs/{club_id}/status", response_model=Club)
def update_club_status(club_id: str, status: ClubStatus, user: User = Depends(get_current_user)):
    """Update club status (Admin only)"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    club = ClubService.update_club_status(club_id, status)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club





# ============================================================================
# USER ENDPOINTS
# ============================================================================

@app.get("/users/me", response_model=User)
def get_my_profile(user: User = Depends(get_current_user)):
    return user

@app.get("/users/me/memberships")
def get_my_memberships(user: User = Depends(get_current_user)):
    return ClubService.get_user_memberships(user.uid)


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
