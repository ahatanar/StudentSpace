"""
Event-related API endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime

from app.models.schemas import User, can_create_events, can_edit_event
from app.services.club_service import ClubService
from app.services.calendar_service import CalendarService
from app.services import db
from app.dependencies import get_current_user

router = APIRouter(prefix="/events", tags=["events"])


@router.get("")
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


@router.post("", response_model=dict)
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


@router.put("/{event_id}")
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


@router.delete("/{event_id}")
def delete_event(event_id: str, user: User = Depends(get_current_user)):
    """Delete an event and remove from all synced calendars."""
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
