"""
User service: handles user-related Firestore operations.
"""

from datetime import datetime
from typing import Optional

from app.models.schemas import User
from app.services import db


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
