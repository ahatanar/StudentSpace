"""
Seed script to populate Firestore with sample events for all clubs.
Run from the backend directory: python seed_events.py

Timezone handling: All times stored in UTC. Frontend converts to local time.
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta, timezone
import random
import os

# Initialize Firebase if not already done
if not firebase_admin._apps:
    cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'serviceAccountKey.json')
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        print(f"Error: {cred_path} not found!")
        exit(1)

db = firestore.client()

# Sample event templates
EVENT_TEMPLATES = [
    {"name": "Weekly Meeting", "description": "Regular weekly meeting to discuss plans and activities.", "duration_hours": 1.5},
    {"name": "Workshop", "description": "Hands-on workshop for members.", "duration_hours": 2},
    {"name": "Social Night", "description": "Hang out with fellow club members! Snacks provided.", "duration_hours": 2.5},
    {"name": "Guest Speaker", "description": "Special guest sharing insights and experiences.", "duration_hours": 1.5},
    {"name": "Study Session", "description": "Collaborative study session.", "duration_hours": 2},
    {"name": "Competition Prep", "description": "Preparation for upcoming competition.", "duration_hours": 2},
    {"name": "Info Session", "description": "Learn about the club and how to get involved.", "duration_hours": 1},
    {"name": "Networking Event", "description": "Connect with industry professionals.", "duration_hours": 2},
    {"name": "Movie Night", "description": "Movie screening with popcorn!", "duration_hours": 2.5},
]

LOCATIONS = [
    "Student Center Room 101", "Library Meeting Room A", "Engineering Building 305",
    "Science Hall 210", "Campus Commons", "Virtual - Zoom", "Recreation Center",
    "Arts Building 102", "Business School Auditorium", "Student Union Ballroom",
]


def get_all_clubs():
    """Fetch all active clubs from Firestore."""
    clubs = db.collection('clubs').where('status', '==', 'active').stream()
    return [(doc.id, doc.to_dict()) for doc in clubs]


def generate_events_for_club(club_id: str, club_name: str, num_events: int = 6):
    """Generate random events for a specific club with proper UTC times."""
    events = []
    
    # Get current time in UTC
    now_utc = datetime.now(timezone.utc)
    today_utc = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    
    for i in range(num_events):
        template = random.choice(EVENT_TEMPLATES)
        
        # Random day: -7 to +45 days from today
        days_offset = random.randint(-7, 45)
        event_date = today_utc + timedelta(days=days_offset)
        
        # Random hour between 14:00-23:00 UTC (9am-6pm EST)
        hour = random.randint(14, 23)
        minute = random.choice([0, 30])
        
        # Create start and end times in UTC
        event_start = event_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
        duration = timedelta(hours=template["duration_hours"])
        event_end = event_start + duration
        
        # Ensure end doesn't go past 4am UTC next day (11pm EST)
        max_end = event_start.replace(hour=4, minute=0) + timedelta(days=1)
        if event_end > max_end:
            event_end = max_end
        
        event = {
            "club_id": club_id,
            "name": f"{club_name}: {template['name']}",
            "description": template["description"],
            "location": random.choice(LOCATIONS),
            "start_time": event_start,  # UTC datetime
            "end_time": event_end,      # UTC datetime
            "created_at": now_utc,
            "updated_at": now_utc,
            "created_by": None,
        }
        events.append(event)
    
    return events


def clear_all_events():
    """Delete all existing events."""
    print("🗑️  Clearing existing events...")
    existing = db.collection('events').stream()
    count = 0
    for doc in existing:
        doc.reference.delete()
        count += 1
    print(f"   Cleared {count} existing events.")
    return count


def seed_events(events_per_club: int = 6):
    """Main function to seed events."""
    print("🌱 Starting event seeding...")
    print("   Using UTC timezone for all event times.\n")
    
    # Always clear existing for clean slate
    clear_all_events()
    
    # Get all clubs
    clubs = get_all_clubs()
    print(f"📋 Found {len(clubs)} active clubs\n")
    
    if not clubs:
        print("❌ No active clubs found! Create some clubs first.")
        return
    
    # Generate and insert events
    total_events = 0
    for club_id, club_data in clubs:
        club_name = club_data.get('name', 'Unknown Club')
        abbrev = club_data.get('abbreviation') or club_name[:15]
        events = generate_events_for_club(club_id, abbrev, events_per_club)
        
        for event in events:
            db.collection('events').add(event)
            total_events += 1
        
        print(f"   ✅ {club_name}: {len(events)} events")
    
    print(f"\n🎉 Done! Created {total_events} events across {len(clubs)} clubs.")
    print("   Refresh your calendar to see the events!")


if __name__ == "__main__":
    import sys
    events_per_club = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    print(f"Creating {events_per_club} events per club...\n")
    seed_events(events_per_club)
