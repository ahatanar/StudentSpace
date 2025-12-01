import json
import os

# Get the directory where this script is located
DATA_DIR = os.path.dirname(os.path.abspath(__file__))

def load_sections(term: str = "202601"):
    """
    Reads the JSON file from disk and returns the list of section objects.
    
    Args:
        term: Term code (e.g., "202509", "202601")
    """
    file_path = os.path.join(DATA_DIR, f"{term}.json")
    
    if not os.path.exists(file_path):
        print(f"Error: Data file not found at {file_path}")
        return []

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data
    except Exception as e:
        print(f"Error loading JSON data: {e}")
        return []

def build_simple_heatmap(interval_minutes: int = 30, term: str = "202601", include_hybrid: bool = True):
    """
    Loads sections, filters for Oshawa campus and In-Person delivery,
    and returns a structured dict with time-based heatmap data.
    
    Args:
        interval_minutes: Minutes per time slot (default 30, can be 10, 15, etc.)
        term: Term code to load data for (default "202601")
        include_hybrid: If True, includes "In-Person & Online" mixed modes. 
                        If False, strictly excludes anything mentioning "Online".
    """
    raw_sections = load_sections(term)
    filtered_sections = []

    for section in raw_sections:
        # Filter 1: Oshawa campus
        # Check 'campusDescription' or 'meetingsFaculty' -> 'meetingTime' -> 'campusDescription'
        is_oshawa = False
        campus_desc = section.get("campusDescription")
        if campus_desc and "Oshawa" in campus_desc:
            is_oshawa = True
        
        # Also check meeting times if top-level campus is ambiguous (though usually top-level is enough)
        # The prompt says: Use campusDescription or meetingTime.campusDescription that contains "Oshawa".
        if not is_oshawa:
            meetings = section.get("meetingsFaculty") or []
            for meeting in meetings:
                mt = meeting.get("meetingTime") or {}
                mt_campus = mt.get("campusDescription")
                if mt_campus and "Oshawa" in mt_campus:
                    is_oshawa = True
                    break
        
        # Filter 2: In-person sections only (exclude online/remote)
        # Use instructionalMethodDescription (e.g. "In-Person")
        is_in_person = False
        is_online = False
        
        method_desc = (section.get("instructionalMethodDescription") or "").lower()
        
        # Check if it's explicitly in-person
        if "in-person" in method_desc or "in person" in method_desc:
            is_in_person = True
        
        # Explicitly exclude online/remote classes
        if any(keyword in method_desc for keyword in ["online", "remote", "virtual", "web", "distance"]):
            is_online = True

        # Logic:
        # 1. Must be Oshawa.
        # 2. Must have some "In-Person" component.
        # 3. If include_hybrid is False, we strictly ban "is_online".
        #    If include_hybrid is True, we allow "is_online" AS LONG AS "is_in_person" is also True.
        
        should_include = False
        
        if is_oshawa and is_in_person:
            if include_hybrid:
                # Allow it even if it's also online (hybrid)
                should_include = True
            else:
                # Strict mode: must NOT be online
                if not is_online:
                    should_include = True

        if should_include:
            filtered_sections.append(section)

    # Import and use time slot processor with specified interval
    from time_slot_processor import build_heatmap_grid, generate_time_slots
    
    heatmap_data = build_heatmap_grid(filtered_sections, interval_minutes)
    time_slots = generate_time_slots(interval_minutes=interval_minutes)

    return {
        "term": term,
        "campus": "Oshawa",
        "totalSections": len(filtered_sections),
        "heatmapData": heatmap_data,
        "timeSlots": time_slots,
        "interval": interval_minutes,
        "rawSections": filtered_sections
    }
