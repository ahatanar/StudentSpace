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


def get_time_slots_for_meeting(begin_time_str: Optional[str], 
                               end_time_str: Optional[str],
                               interval_minutes: int = 30) -> Set[str]:
    """
    Determine which time slots a meeting occupies.
    
    Args:
        begin_time_str: Meeting start time in "HHMM" format
        end_time_str: Meeting end time in "HHMM" format
        interval_minutes: Minutes per time slot (default 30)
    
    Returns:
        Set of time slot strings that this meeting overlaps
    
    Example:
        >>> get_time_slots_for_meeting("0940", "1100", 30)
        {"09:30", "10:00", "10:30"}
    """
    begin_time = parse_meeting_time(begin_time_str)
    end_time = parse_meeting_time(end_time_str)
    
    if not begin_time or not end_time:
        return set()
    
    slots = set()
    
    # Generate all possible slots with the specified interval
    all_slots = generate_time_slots(0, 23, interval_minutes)
    
    for slot_str in all_slots:
        slot_time = datetime.strptime(slot_str, "%H:%M").time()
        
        # A slot overlaps the meeting if:
        # - The slot starts during the meeting, OR
        # - The meeting starts during the slot
        slot_end = (datetime.combine(datetime.today(), slot_time) + 
                   timedelta(minutes=interval_minutes)).time()
        
        # Check if there's any overlap
        if (begin_time <= slot_time < end_time or
            begin_time < slot_end <= end_time or
            (slot_time <= begin_time and end_time <= slot_end)):
            slots.add(slot_str)
    
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
