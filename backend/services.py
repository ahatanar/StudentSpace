"""
Business logic layer for StudentSpace.
Handles Firestore interactions and permission checks.
"""

import firebase_admin
from firebase_admin import credentials, firestore
from models import (
    User, Club, ClubMembership, 
    ClubRole, ClubStatus, 
    is_executive_anywhere, can_manage_club, can_create_events
)
from datetime import datetime
from typing import List, Optional
import os

# Initialize Firebase Admin
# NOTE: You need to set GOOGLE_APPLICATION_CREDENTIALS env var or place serviceAccountKey.json in root
try:
    if not firebase_admin._apps:
        # Look for service account key in common locations or env var
        cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'serviceAccountKey.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            print(f"Warning: {cred_path} not found. Firestore features will fail.")
            # For development without auth, you might want to mock this or handle gracefully
            
    db = firestore.client()
except Exception as e:
    print(f"Error initializing Firebase: {e}")
    db = None


class UserService:
    @staticmethod
    def create_or_update_user(user: User) -> User:
        if not db: raise Exception("Database not connected")
        
        user.updated_at = datetime.now()
        if not user.created_at:
            user.created_at = datetime.now()
            
        # Convert to dict and remove None values to avoid overwriting with nulls if partial
        data = user.dict(exclude_none=True)
        db.collection('users').document(user.uid).set(data, merge=True)
        return user

    @staticmethod
    def get_user(uid: str) -> Optional[User]:
        if not db: raise Exception("Database not connected")
        
        doc = db.collection('users').document(uid).get()
        if doc.exists:
            return User(**doc.to_dict())
        return None

    @staticmethod
    def get_user_by_email(email: str) -> Optional[User]:
        if not db: raise Exception("Database not connected")
        
        # Query users by email
        docs = db.collection('users').where('email', '==', email).limit(1).stream()
        for doc in docs:
            return User(**doc.to_dict())
        return None


class ClubService:
    @staticmethod
    def create_club(club: Club, user: User) -> Club:
        if not db: raise Exception("Database not connected")
        
        # 1. Create Club Document
        club.created_at = datetime.now()
        club.updated_at = datetime.now()
        club.status = ClubStatus.PENDING # Default to pending
        
        # Auto-generate ID if not present
        if not club.id:
            doc_ref = db.collection('clubs').document()
            club.id = doc_ref.id
        else:
            doc_ref = db.collection('clubs').document(club.id)
            
        doc_ref.set(club.dict())
        
        # 2. Add Creator as President (Pending until club approved?)
        # Logic: Creator becomes president immediately, but club is hidden
        ClubService.add_membership(club.id, user.uid, ClubRole.PRESIDENT)
        
        return club

    @staticmethod
    def get_club(club_id: str) -> Optional[Club]:
        if not db: raise Exception("Database not connected")
        doc = db.collection('clubs').document(club_id).get()
        if doc.exists:
            return Club(**doc.to_dict())
        return None

    @staticmethod
    def update_club(club_id: str, updates: dict) -> bool:
        """Update club details"""
        if not db: raise Exception("Database not connected")
        try:
            updates["updated_at"] = datetime.now()
            db.collection('clubs').document(club_id).update(updates)
            return True
        except Exception as e:
            print(f"Error updating club: {e}")
            return False

    @staticmethod
    def list_clubs(status: Optional[ClubStatus] = ClubStatus.ACTIVE) -> List[Club]:
        if not db: raise Exception("Database not connected")
        
        query = db.collection('clubs')
        if status:
            query = query.where('status', '==', status.value)
            
        docs = query.stream()
        return [Club(**doc.to_dict()) for doc in docs]

    @staticmethod
    def search_clubs(query: str, status: Optional[ClubStatus] = ClubStatus.ACTIVE) -> List[Club]:
        if not db: raise Exception("Database not connected")
        
        # Firestore doesn't support native full-text search.
        # For this MVP, we'll fetch all clubs of the given status and filter in memory.
        # This is acceptable for a small number of clubs (< 1000).
        
        clubs_ref = db.collection('clubs')
        if status:
            clubs_ref = clubs_ref.where('status', '==', status.value)
            
        docs = clubs_ref.stream()
        all_clubs = [Club(**doc.to_dict()) for doc in docs]
        
        # Case-insensitive filtering
        query = query.lower()
        return [c for c in all_clubs if query in c.name.lower() or query in c.description.lower()]

    @staticmethod
    def add_membership(club_id: str, user_id: str, role: ClubRole) -> ClubMembership:
        if not db: raise Exception("Database not connected")
        
        # Check if membership exists
        existing = db.collection('club_memberships')\
            .where('club_id', '==', club_id)\
            .where('user_id', '==', user_id)\
            .limit(1).get()
            
        if len(list(existing)) > 0:
            # Update existing
            doc_id = list(existing)[0].id
            membership = ClubMembership(
                id=doc_id, club_id=club_id, user_id=user_id, role=role, joined_at=datetime.now()
            )
            db.collection('club_memberships').document(doc_id).set(membership.dict(), merge=True)
        else:
            # Create new
            doc_ref = db.collection('club_memberships').document()
            membership = ClubMembership(
                id=doc_ref.id,
                club_id=club_id,
                user_id=user_id,
                role=role,
                joined_at=datetime.now()
            )
            doc_ref.set(membership.dict())
            
        return membership

    @staticmethod
    def add_executive(club_id: str, user_id: str) -> ClubMembership:
        """Promote a user to executive of a club"""
        return ClubService.add_membership(club_id, user_id, ClubRole.EXECUTIVE)

    @staticmethod
    def remove_membership(club_id: str, user_id: str) -> bool:
        """Remove a user's membership from a club (leave club)"""
        if not db: raise Exception("Database not connected")
        
        # Find existing membership
        existing = db.collection('club_memberships')\
            .where('club_id', '==', club_id)\
            .where('user_id', '==', user_id)\
            .limit(1).get()
        
        existing_list = list(existing)
        if len(existing_list) > 0:
            doc_id = existing_list[0].id
            db.collection('club_memberships').document(doc_id).delete()
            return True
        return False

    @staticmethod
    def get_user_memberships(user_id: str) -> List[ClubMembership]:
        if not db: raise Exception("Database not connected")
        docs = db.collection('club_memberships').where('user_id', '==', user_id).stream()
        return [ClubMembership(**doc.to_dict()) for doc in docs]

    @staticmethod
    def update_member_role(club_id: str, user_id: str, new_role: ClubRole) -> bool:
        """Update a member's role in a club"""
        if not db: raise Exception("Database not connected")
        
        # Find existing membership
        existing = db.collection('club_memberships')\
            .where('club_id', '==', club_id)\
            .where('user_id', '==', user_id)\
            .limit(1).get()
        
        existing_list = list(existing)
        if len(existing_list) > 0:
            doc_id = existing_list[0].id
            db.collection('club_memberships').document(doc_id).update({
                'role': new_role.value
            })
            return True
        return False

    @staticmethod
    def get_club_members(club_id: str) -> List[dict]:
        """Get all members of a club with their user info"""
        if not db: raise Exception("Database not connected")
        
        # Get all memberships for this club
        memberships = db.collection('club_memberships').where('club_id', '==', club_id).stream()
        
        members = []
        for m in memberships:
            membership_data = m.to_dict()
            user_id = membership_data.get('user_id')
            
            # Get user info
            user_doc = db.collection('users').document(user_id).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                members.append({
                    'user_id': user_id,
                    'display_name': user_data.get('display_name', 'Unknown'),
                    'email': user_data.get('email', ''),
                    'role': membership_data.get('role', 'member'),
                    'joined_at': membership_data.get('joined_at')
                })
        
        return members

    @staticmethod
    def update_club_status(club_id: str, status: ClubStatus) -> Optional[Club]:
        if not db: raise Exception("Database not connected")
        
        doc_ref = db.collection('clubs').document(club_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return None
            
        doc_ref.update({'status': status.value, 'updated_at': datetime.now()})
        
        # Return updated club
        return Club(**doc_ref.get().to_dict())

    @staticmethod
    def delete_club(club_id: str):
        if not db: raise Exception("Database not connected")
        db.collection('clubs').document(club_id).delete()
        # Also delete memberships? For now, keep them or delete them. 
        # Ideally we should delete memberships too to keep DB clean.
        memberships = db.collection('club_memberships').where('club_id', '==', club_id).stream()
        for m in memberships:
            m.reference.delete()






