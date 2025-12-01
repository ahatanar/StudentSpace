"""
Time slot processor for heatmap generation.

This module handles all time-slot-related logic for converting course sections
into configurable time chunks across Monday-Friday.
"""

from typing import Dict, List, Set, Optional
from datetime import time, datetime, timedelta


def generate_time_slots(start_hour: int = 8, end_hour: int = 22, interval_minutes: int = 30) -> List[str]:
    """
    Generate list of time slots with configurable interval.
    
    Args:
        start_hour: Starting hour (default 8 for 8:00 AM)
        end_hour: Ending hour (default 22 for 10:00 PM)
        interval_minutes: Minutes between slots (default 30, can be 10, 15, etc.)
    
    Returns:
        List of time strings in "HH:MM" format (e.g., ["08:00", "08:30", ...])
    """
    slots = []
    current = time(start_hour, 0)
    end = time(end_hour, 0)
    
    while current <= end:
        slots.append(current.strftime("%H:%M"))
        # Add interval minutes
        dt = datetime.combine(datetime.today(), current)
        dt += timedelta(minutes=interval_minutes)
        current = dt.time()
    
    return slots


def parse_meeting_time(meeting_time_str: Optional[str]) -> Optional[time]:
    """
    Parse Banner API time format to Python time object.
    
    Banner uses 4-digit military time: "0940" = 9:40 AM, "1330" = 1:30 PM
    
    Args:
        meeting_time_str: Time string in "HHMM" format (e.g., "0940")
    
    Returns:
        Python time object, or None if invalid/missing
    """
    if not meeting_time_str:
        return None
    
    try:
        # Ensure it's a 4-digit string (pad with leading zeros if needed)
        time_str = str(meeting_time_str).zfill(4)
        
        if len(time_str) != 4:
            return None
        
        hour = int(time_str[:2])
        minute = int(time_str[2:])
        
        if hour > 23 or minute > 59:
            return None
        
        return time(hour, minute)
    except (ValueError, TypeError):
        return None


def to_minutes(time_str: Optional[str]) -> Optional[int]:
    """Convert 'HHMM' string to minutes from midnight."""
    if not time_str:
        return None
    try:
        s = str(time_str).zfill(4)
        if len(s) != 4:
            return None
        h = int(s[:2])
        m = int(s[2:])
        return h * 60 + m
    except (ValueError, TypeError):
        return None

def minutes_to_time_str(minutes: int) -> str:
    """Convert minutes from midnight to 'HH:MM' string."""
    h = (minutes // 60) % 24
    m = minutes % 60
    return f"{h:02d}:{m:02d}"

def get_time_slots_for_meeting(begin_time_str: Optional[str], 
                               end_time_str: Optional[str],
                               interval_minutes: int = 30) -> Set[str]:
    """
    Determine which time slots a meeting occupies using integer arithmetic.
    
    Args:
        begin_time_str: Meeting start time in "HHMM" format
        end_time_str: Meeting end time in "HHMM" format
        interval_minutes: Minutes per time slot (default 30)
    
    Returns:
        Set of time slot strings that this meeting overlaps
    """
    begin_min = to_minutes(begin_time_str)
    end_min = to_minutes(end_time_str)
    
    if begin_min is None or end_min is None:
        return set()
    
    slots = set()
    
    # Iterate through all possible slots in a day (00:00 to 23:59)
    # 24 * 60 = 1440 minutes
    for slot_start in range(0, 1440, interval_minutes):
        slot_end = slot_start + interval_minutes
        
        # Check for overlap:
        # The meeting overlaps the slot if the meeting interval [begin, end)
        # intersects with the slot interval [slot_start, slot_end).
        # Intersection exists if max(start1, start2) < min(end1, end2)
        
        if max(begin_min, slot_start) < min(end_min, slot_end):
            slots.add(minutes_to_time_str(slot_start))
            
    return slots


def build_heatmap_grid(sections: List[dict], interval_minutes: int = 30) -> Dict:
    """
    Build heatmap data structure from course sections.
    
    Processes all sections to create a Monday-Friday grid where each cell
    contains the total number of enrolled students in classes during that
    time slot.
    
    Args:
        sections: List of section dictionaries (filtered for campus/mode)
        interval_minutes: Minutes per time slot (default 30, can be 10, 15, etc.)
    
    Returns:
        Dictionary with structure:
        {
            "Monday": {"08:00": 150, "08:30": 200, ...},
            "Tuesday": {...},
            ...
        }
    """
    # Initialize data structure
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    time_slots = generate_time_slots(interval_minutes=interval_minutes)
    
    heatmap_data = {
        day: {slot: 0 for slot in time_slots}
        for day in days
    }
    
    # Day mapping: Banner uses boolean fields
    day_mapping = {
        "Monday": "monday",
        "Tuesday": "tuesday",
        "Wednesday": "wednesday",
        "Thursday": "thursday",
        "Friday": "friday"
    }
    
    # Process each section
    for section in sections:
        enrollment = section.get("enrollment", 0)
        
        # Get meeting times
        meetings = section.get("meetingsFaculty", [])
        
        for meeting in meetings:
            meeting_time = meeting.get("meetingTime")
            if not meeting_time:
                continue
            
            begin_time = meeting_time.get("beginTime")
            end_time = meeting_time.get("endTime")
            
            # Get which time slots this meeting occupies
            occupied_slots = get_time_slots_for_meeting(begin_time, end_time, interval_minutes)
            
            # Add enrollment count to each day this meeting occurs
            for day_name, day_field in day_mapping.items():
                if meeting_time.get(day_field, False):
                    for slot in occupied_slots:
                        if slot in heatmap_data[day_name]:
                            heatmap_data[day_name][slot] += enrollment
    
    return heatmap_data
