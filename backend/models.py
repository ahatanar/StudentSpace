"""
Data models for StudentSpace application.

PERMISSION MODEL:
-----------------
- System Admins (is_admin=True): Approve clubs, manage platform, NOT in clubs
- Students (is_admin=False): Regular users, join clubs, get features based on ClubRole

ClubRole determines feature access:
- MEMBER: View events from subscribed clubs only
- EXECUTIVE/PRESIDENT: Access heatmap/calendar tools + create events for their clubs
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


# ============================================================================
# ENUMS
# ============================================================================

class ClubRole(str, Enum):
    """
    Per-club roles that unlock features:
    - PRESIDENT: Runs club, assigns executives, creates events, access to heatmap
    - EXECUTIVE: Creates events, edits club, access to heatmap
    - MEMBER: Subscribes to club events (no special features)
    """
    PRESIDENT = "president"
    EXECUTIVE = "executive"
    MEMBER = "member"


class ClubStatus(str, Enum):
    """Club approval status"""
    PENDING = "pending"  # Awaiting admin approval
    ACTIVE = "active"    # Approved and visible
    SUSPENDED = "suspended"  # Temporarily disabled


class ClubType(str, Enum):
    """Types of clubs available"""
    ACADEMIC = "Academic"
    SPORTS = "Sports"
    ARTS = "Arts"
    SOCIAL = "Social"
    CULTURAL = "Cultural"
    TECHNOLOGY = "Technology"
    CHARITY = "Charity"
    RELIGIOUS = "Religious"
    OTHER = "Other"


# ============================================================================
# MODELS
# ============================================================================

class User(BaseModel):
    """
    User model.
    is_admin determines if user can manage platform (approve clubs, etc.)
    System admins don't join clubs.
    """
    uid: str  # Firebase Auth UID
    email: EmailStr
    display_name: str
    is_admin: bool = False  # True for system admins only
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Club(BaseModel):
    """
    Club model.
    Creator becomes president upon admin approval.
    """
    id: Optional[str] = None  # Firestore auto-generates
    name: str
    abbreviation: Optional[str] = None # e.g. "CS Club" -> "CS"
    description: str
    type: ClubType  # Academic, Sports, Arts, Social, etc. (for UI)
    created_by: Optional[str] = None  # User UID
    president_id: Optional[str] = None  # User UID (current president)
    status: ClubStatus = ClubStatus.PENDING
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ClubMembership(BaseModel):
    """
    User-Club relationship.
    ClubRole determines what features user can access.
    Executives/Presidents in ANY club get access to heatmap/calendar tools.
    """
    id: Optional[str] = None
    club_id: str
    user_id: str
    role: ClubRole  # Determines feature access
    joined_at: Optional[datetime] = None


class Event(BaseModel):
    """
    Event model for club activities.

    Only Presidents and Executives of a club can create events.
    System admins may edit/delete any event.

    Fields:
    - id: Firestore auto-generated ID
    - club_id: Which club the event belongs to
    - name: Event title
    - description: Short event details
    - location: Where the event is being held
    - start_time: Event start datetime
    - end_time: Event end datetime
    - created_by: UID of event creator
    - created_at: Timestamp when created
    - updated_at: Timestamp when updated

    These fields support calendar views + filtering on frontend.
    """

    id: Optional[str] = None
    club_id: str
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None

    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None



# ============================================================================
# PERMISSION HELPER METHODS
# ============================================================================

def is_executive_anywhere(user_id: str, db) -> bool:
    """
    Check if user is an executive or president in ANY club.
    This determines access to heatmap/calendar features.
    
    Args:
        user_id: User's Firebase UID
        db: Firestore database instance
        
    Returns:
        True if user is executive/president in at least one club
    """
    memberships = db.collection('club_memberships') \
        .where('user_id', '==', user_id) \
        .where('role', 'in', [ClubRole.EXECUTIVE.value, ClubRole.PRESIDENT.value]) \
        .limit(1) \
        .get()
    
    return len(list(memberships)) > 0


def can_manage_club(user_id: str, club_id: str, db, user: Optional[User] = None) -> bool:
    """
    Check if user can edit/manage a specific club.
    
    Permissions:
    - System admin: Can manage any club
    - President of the club: Can manage their club
    - Executives: Can edit club details (but not delete)
    
    Args:
        user_id: User's Firebase UID
        club_id: Club document ID
        db: Firestore database instance
        user: Optional User object (to skip admin check lookup)
        
    Returns:
        True if user can manage the club
    """
    # System admin can manage any club
    if user and user.is_admin:
        return True
    
    # Check if user is executive or president of this club
    membership = db.collection('club_memberships') \
        .where('user_id', '==', user_id) \
        .where('club_id', '==', club_id) \
        .where('role', 'in', [ClubRole.EXECUTIVE.value, ClubRole.PRESIDENT.value]) \
        .limit(1) \
        .get()
    
    return len(list(membership)) > 0


def can_create_events(user_id: str, club_id: str, db) -> bool:
    """
    Check if user can create events for a specific club.
    User must be executive or president of that club.
    
    Args:
        user_id: User's Firebase UID
        club_id: Club document ID
        db: Firestore database instance
        
    Returns:
        True if user can create events for this club
    """
    # Same logic as can_manage_club (executives and presidents can create events)
    return can_manage_club(user_id, club_id, db)


def is_club_president(user_id: str, club_id: str, db) -> bool:
    """
    Check if user is the president of a specific club.
    Only presidents can assign/remove executives.
    
    Args:
        user_id: User's Firebase UID
        club_id: Club document ID
        db: Firestore database instance
        
    Returns:
        True if user is president of this club
    """
    membership = db.collection('club_memberships') \
        .where('user_id', '==', user_id) \
        .where('club_id', '==', club_id) \
        .where('role', '==', ClubRole.PRESIDENT.value) \
        .limit(1) \
        .get()
    
    return len(list(membership)) > 0


def get_user_memberships(user_id: str, db) -> list:
    """
    Get all club memberships for a user.
    
    Args:
        user_id: User's Firebase UID
        db: Firestore database instance
        
    Returns:
        List of ClubMembership objects
    """
    memberships = db.collection('club_memberships') \
        .where('user_id', '==', user_id) \
        .get()
    
    return [ClubMembership(id=m.id, **m.to_dict()) for m in memberships]



def can_edit_event(user_id: str, event: dict, db, user: Optional[User] = None) -> bool:
    """
    Check if user can edit or delete a specific event.

    Permissions:
    - System admins: Can edit/delete ANY event
    - Club presidents/executives: Can edit/delete events for THEIR club
    - Event creators (optional future feature): Can edit their own event

    Args:
        user_id: Firebase UID
        event: Event Firestore document as dict
        db: Firestore DB instance
        user: Optional User model (skip admin lookup)

    Returns:
        True if user can edit/delete this event
    """

    club_id = event.get("club_id")

    # System admin override
    if user and user.is_admin:
        return True

    # OPTIONAL: If you later store "created_by" on events
    if event.get("created_by") == user_id:
        return True

    # Check if user is executive or president of this club
    membership = db.collection("club_memberships") \
        .where("user_id", "==", user_id) \
        .where("club_id", "==", club_id) \
        .where("role", "in", [ClubRole.EXECUTIVE.value, ClubRole.PRESIDENT.value]) \
        .limit(1) \
        .get()

    return len(list(membership)) > 0
