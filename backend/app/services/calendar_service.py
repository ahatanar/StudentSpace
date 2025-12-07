"""
Google Calendar integration service.
Handles OAuth flow and calendar event syncing.
"""

import os
from datetime import datetime
from typing import Optional, List, Dict
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from cryptography.fernet import Fernet
import base64
import hashlib
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Environment variables
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CALENDAR_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CALENDAR_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_CALENDAR_REDIRECT_URI", "http://localhost:8000/api/calendar/oauth-callback")
FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", "http://localhost:3000")

# Encryption key for refresh tokens (generate with Fernet.generate_key())
# In production, store this in env var or secret manager
ENCRYPTION_KEY = os.getenv("CALENDAR_ENCRYPTION_KEY", "")

# OAuth scopes
SCOPES = ["https://www.googleapis.com/auth/calendar.events"]


def get_encryption_key() -> bytes:
    """Get or generate encryption key for tokens."""
    if ENCRYPTION_KEY:
        return ENCRYPTION_KEY.encode()
    # Fallback: derive key from client secret (not ideal but works for dev)
    if GOOGLE_CLIENT_SECRET:
        key = hashlib.sha256(GOOGLE_CLIENT_SECRET.encode()).digest()
        return base64.urlsafe_b64encode(key)
    raise ValueError("No encryption key available")


def encrypt_token(token: str) -> str:
    """Encrypt a refresh token for storage."""
    f = Fernet(get_encryption_key())
    return f.encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    """Decrypt a stored refresh token."""
    f = Fernet(get_encryption_key())
    return f.decrypt(encrypted.encode()).decode()


class CalendarService:
    """Service for Google Calendar integration."""
    
    @staticmethod
    def is_configured() -> bool:
        """Check if Google Calendar OAuth is configured."""
        return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    
    @staticmethod
    def get_oauth_url(user_id: str) -> str:
        """
        Generate OAuth URL for user to authorize Calendar access.
        
        Args:
            user_id: Firebase UID to include in state
            
        Returns:
            Authorization URL to redirect user to
        """
        if not CalendarService.is_configured():
            raise ValueError("Google Calendar not configured. Set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET")
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [GOOGLE_REDIRECT_URI],
                }
            },
            scopes=SCOPES,
        )
        flow.redirect_uri = GOOGLE_REDIRECT_URI
        
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            prompt="consent",
            state=user_id,  # Pass user_id in state for callback
        )
        
        return auth_url
    
    @staticmethod
    def handle_oauth_callback(code: str, state: str, db) -> Dict:
        """
        Handle OAuth callback from Google.
        Exchange code for tokens and store refresh token.
        
        Args:
            code: Authorization code from Google
            state: State parameter containing user_id
            db: Firestore database instance
            
        Returns:
            Dict with success status and message
        """
        if not CalendarService.is_configured():
            return {"success": False, "error": "Calendar not configured"}
        
        user_id = state
        
        try:
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": GOOGLE_CLIENT_ID,
                        "client_secret": GOOGLE_CLIENT_SECRET,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [GOOGLE_REDIRECT_URI],
                    }
                },
                scopes=SCOPES,
            )
            flow.redirect_uri = GOOGLE_REDIRECT_URI
            
            # Exchange code for tokens
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            if not credentials.refresh_token:
                return {"success": False, "error": "No refresh token received. Try revoking access and reconnecting."}
            
            # Encrypt and store refresh token
            encrypted_token = encrypt_token(credentials.refresh_token)
            
            db.collection("users").document(user_id).update({
                "calendar_connected": True,
                "google_refresh_token": encrypted_token,
                "updated_at": datetime.now(),
            })
            
            return {"success": True, "user_id": user_id}
            
        except Exception as e:
            print(f"OAuth callback error: {e}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def disconnect_calendar(user_id: str, db) -> bool:
        """
        Disconnect user's Google Calendar.
        
        Args:
            user_id: Firebase UID
            db: Firestore database instance
            
        Returns:
            True if successful
        """
        try:
            db.collection("users").document(user_id).update({
                "calendar_connected": False,
                "google_refresh_token": None,
                "updated_at": datetime.now(),
            })
            return True
        except Exception as e:
            print(f"Disconnect error: {e}")
            return False
    
    @staticmethod
    def _get_calendar_service(refresh_token_encrypted: str):
        """
        Create a Google Calendar API service instance.
        
        Args:
            refresh_token_encrypted: Encrypted refresh token
            
        Returns:
            Google Calendar API service
        """
        refresh_token = decrypt_token(refresh_token_encrypted)
        
        credentials = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=SCOPES,
        )
        
        return build("calendar", "v3", credentials=credentials)
    
    @staticmethod
    def push_event_to_user(
        user_id: str,
        event_id: str,
        event_data: Dict,
        db
    ) -> Optional[str]:
        """
        Add a club event to a user's Google Calendar.
        
        Args:
            user_id: Firebase UID
            event_id: Club event ID
            event_data: Event details (name, description, location, start_time, end_time)
            db: Firestore database instance
            
        Returns:
            Google Calendar event ID, or None if failed
        """
        try:
            # Get user's refresh token
            user_doc = db.collection("users").document(user_id).get()
            if not user_doc.exists:
                return None
            
            user_data = user_doc.to_dict()
            if not user_data.get("calendar_connected") or not user_data.get("google_refresh_token"):
                return None
            
            # Build calendar service
            service = CalendarService._get_calendar_service(user_data["google_refresh_token"])
            
            # Format event for Google Calendar
            start_time = event_data.get("start_time")
            end_time = event_data.get("end_time") or start_time
            
            # Handle datetime formatting
            if isinstance(start_time, datetime):
                start_iso = start_time.isoformat()
                end_iso = end_time.isoformat() if isinstance(end_time, datetime) else start_iso
            else:
                start_iso = start_time
                end_iso = end_time or start_time
            
            calendar_event = {
                "summary": event_data.get("name", "Club Event"),
                "description": event_data.get("description", ""),
                "location": event_data.get("location", ""),
                "start": {
                    "dateTime": start_iso,
                    "timeZone": "America/Toronto",
                },
                "end": {
                    "dateTime": end_iso,
                    "timeZone": "America/Toronto",
                },
            }
            
            # Insert event
            result = service.events().insert(
                calendarId="primary",
                body=calendar_event
            ).execute()
            
            google_event_id = result.get("id")
            
            # Store link
            db.collection("calendar_event_links").add({
                "event_id": event_id,
                "user_id": user_id,
                "google_event_id": google_event_id,
                "synced_at": datetime.now(),
            })
            
            return google_event_id
            
        except HttpError as e:
            if e.resp.status == 401:
                # Token revoked - mark as disconnected
                db.collection("users").document(user_id).update({
                    "calendar_connected": False,
                    "google_refresh_token": None,
                })
            print(f"Calendar API error for user {user_id}: {e}")
            return None
        except Exception as e:
            print(f"Calendar push error for user {user_id}: {e}")
            return None
    
    @staticmethod
    def push_event_to_all_members(event_id: str, db) -> Dict:
        """
        Push a club event to all opted-in members' calendars.
        
        Args:
            event_id: Club event ID
            db: Firestore database instance
            
        Returns:
            Dict with success count and errors
        """
        results = {"success": 0, "failed": 0, "skipped": 0}
        
        try:
            # Get event
            event_doc = db.collection("events").document(event_id).get()
            if not event_doc.exists:
                return {"error": "Event not found"}
            
            event_data = event_doc.to_dict()
            club_id = event_data.get("club_id")
            
            # Get club members
            memberships = db.collection("club_memberships").where("club_id", "==", club_id).stream()
            
            for membership in memberships:
                member_data = membership.to_dict()
                user_id = member_data.get("user_id")
                
                # Check if user has calendar connected
                user_doc = db.collection("users").document(user_id).get()
                if not user_doc.exists:
                    results["skipped"] += 1
                    continue
                
                user_data = user_doc.to_dict()
                if not user_data.get("calendar_connected"):
                    results["skipped"] += 1
                    continue
                
                # Push event
                google_event_id = CalendarService.push_event_to_user(
                    user_id, event_id, event_data, db
                )
                
                if google_event_id:
                    results["success"] += 1
                else:
                    results["failed"] += 1
            
            return results
            
        except Exception as e:
            print(f"Push to all members error: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def update_calendar_event(event_id: str, event_data: Dict, db) -> Dict:
        """
        Update a club event in all synced user calendars.
        
        Args:
            event_id: Club event ID
            event_data: Updated event details
            db: Firestore database instance
            
        Returns:
            Dict with success count and errors
        """
        results = {"success": 0, "failed": 0}
        
        try:
            # Get all calendar links for this event
            links = db.collection("calendar_event_links").where("event_id", "==", event_id).stream()
            
            for link in links:
                link_data = link.to_dict()
                user_id = link_data.get("user_id")
                google_event_id = link_data.get("google_event_id")
                
                try:
                    # Get user's refresh token
                    user_doc = db.collection("users").document(user_id).get()
                    if not user_doc.exists:
                        continue
                    
                    user_data = user_doc.to_dict()
                    if not user_data.get("google_refresh_token"):
                        continue
                    
                    service = CalendarService._get_calendar_service(user_data["google_refresh_token"])
                    
                    # Format update
                    start_time = event_data.get("start_time")
                    end_time = event_data.get("end_time") or start_time
                    
                    if isinstance(start_time, datetime):
                        start_iso = start_time.isoformat()
                        end_iso = end_time.isoformat() if isinstance(end_time, datetime) else start_iso
                    else:
                        start_iso = start_time
                        end_iso = end_time or start_time
                    
                    calendar_event = {
                        "summary": event_data.get("name", "Club Event"),
                        "description": event_data.get("description", ""),
                        "location": event_data.get("location", ""),
                        "start": {"dateTime": start_iso, "timeZone": "America/Toronto"},
                        "end": {"dateTime": end_iso, "timeZone": "America/Toronto"},
                    }
                    
                    service.events().update(
                        calendarId="primary",
                        eventId=google_event_id,
                        body=calendar_event
                    ).execute()
                    
                    results["success"] += 1
                    
                except Exception as e:
                    print(f"Update error for user {user_id}: {e}")
                    results["failed"] += 1
            
            return results
            
        except Exception as e:
            print(f"Update all error: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def delete_calendar_event(event_id: str, db) -> Dict:
        """
        Delete a club event from all synced user calendars.
        
        Args:
            event_id: Club event ID
            db: Firestore database instance
            
        Returns:
            Dict with success count and errors
        """
        results = {"success": 0, "failed": 0}
        
        try:
            # Get all calendar links for this event
            links = db.collection("calendar_event_links").where("event_id", "==", event_id).stream()
            
            for link in links:
                link_data = link.to_dict()
                user_id = link_data.get("user_id")
                google_event_id = link_data.get("google_event_id")
                
                try:
                    user_doc = db.collection("users").document(user_id).get()
                    if not user_doc.exists:
                        continue
                    
                    user_data = user_doc.to_dict()
                    if not user_data.get("google_refresh_token"):
                        continue
                    
                    service = CalendarService._get_calendar_service(user_data["google_refresh_token"])
                    
                    service.events().delete(
                        calendarId="primary",
                        eventId=google_event_id
                    ).execute()
                    
                    # Delete the link
                    link.reference.delete()
                    
                    results["success"] += 1
                    
                except Exception as e:
                    print(f"Delete error for user {user_id}: {e}")
                    results["failed"] += 1
            
            return results
            
        except Exception as e:
            print(f"Delete all error: {e}")
            return {"error": str(e)}
