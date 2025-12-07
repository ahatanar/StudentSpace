"""
Shared dependencies for FastAPI routes.
"""

from fastapi import Header, HTTPException, Depends
from typing import Optional

from app.models.schemas import User
from app.services.user_service import UserService
from firebase_admin import auth


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
