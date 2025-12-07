"""
Club-related API endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile
from typing import List, Optional

from app.models.schemas import User, Club, ClubMembership, ClubRole, ClubStatus, ClubType
from app.services.club_service import ClubService
from app.dependencies import get_current_user

router = APIRouter(prefix="/clubs", tags=["clubs"])


@router.get("/types", response_model=List[str])
def get_club_types():
    """Return list of available club types"""
    return [t.value for t in ClubType]


@router.post("", response_model=Club)
def create_club(club: Club, user: User = Depends(get_current_user)):
    """Create a new club (Pending approval)"""
    club.created_by = user.uid
    club.president_id = user.uid
    return ClubService.create_club(club, user)


@router.get("", response_model=List[Club])
def list_clubs(status: str = "active", search: Optional[str] = None):
    """List all clubs (default: active only). Optional search query."""
    club_status = ClubStatus(status) if status else None
    
    if search:
        return ClubService.search_clubs(search, club_status)
    
    return ClubService.list_clubs(club_status)


@router.get("/{club_id}", response_model=Club)
def get_club(club_id: str):
    club = ClubService.get_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club


@router.put("/{club_id}")
def update_club(
    club_id: str, 
    name: str = None, 
    abbreviation: str = None, 
    club_type: str = None, 
    description: str = None, 
    current_user: User = Depends(get_current_user)
):
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


@router.post("/{club_id}/join")
def join_club(club_id: str, user: User = Depends(get_current_user)):
    """Join a club as a member"""
    return ClubService.add_membership(club_id, user.uid, ClubRole.MEMBER)


@router.post("/{club_id}/leave")
def leave_club(club_id: str, user: User = Depends(get_current_user)):
    """Leave a club"""
    success = ClubService.remove_membership(club_id, user.uid)
    if not success:
        raise HTTPException(status_code=404, detail="Membership not found")
    return {"message": "Successfully left the club"}


@router.get("/{club_id}/members")
def get_club_members(club_id: str, user: User = Depends(get_current_user)):
    """Get all members of a club"""
    club = ClubService.get_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return ClubService.get_club_members(club_id)


@router.put("/{club_id}/status", response_model=Club)
def update_club_status(club_id: str, status: ClubStatus, user: User = Depends(get_current_user)):
    """Update club status (Admin only)"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    club = ClubService.update_club_status(club_id, status)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club


@router.delete("/{club_id}")
def delete_club(club_id: str, user: User = Depends(get_current_user)):
    """Delete a club (Admin only)"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin permissions required")
    
    club = ClubService.get_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    ClubService.delete_club(club_id)
    return {"message": "Club deleted successfully", "club_id": club_id}


@router.post("/{club_id}/executives", response_model=ClubMembership)
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


@router.put("/{club_id}/members/{user_id}/role")
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


@router.delete("/{club_id}/president")
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
# CLUB IMAGE UPLOAD ENDPOINTS
# ============================================================================

@router.post("/{club_id}/upload-icon")
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


@router.post("/{club_id}/upload-banner")
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


@router.delete("/{club_id}/icon")
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


@router.delete("/{club_id}/banner")
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
