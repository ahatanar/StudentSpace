"""
User-related API endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends

from app.models.schemas import User, is_executive_anywhere
from app.services.user_service import UserService
from app.services.club_service import ClubService
from app.services import db
from app.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=User)
def get_my_profile(user: User = Depends(get_current_user)):
    return user


@router.get("/me/memberships")
def get_my_memberships(user: User = Depends(get_current_user)):
    return ClubService.get_user_memberships(user.uid)


@router.get("/me/is-executive")
def check_is_executive(user: User = Depends(get_current_user)):
    """Check if current user is an executive or president in any club.
    
    This determines access to premium features like the campus heatmap.
    """
    is_exec = is_executive_anywhere(user.uid, db)
    return {"is_executive": is_exec}


@router.get("/search", response_model=User)
def search_user(email: str, user: User = Depends(get_current_user)):
    """Search for a user by email (Authenticated users only)"""
    found_user = UserService.get_user_by_email(email)
    if not found_user:
        raise HTTPException(status_code=404, detail="User not found")
    return found_user
