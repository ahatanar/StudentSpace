import json
import os

# Define the path to the data file
# We assume the file is in the same directory as this script or in a 'data' subdirectory
# Adjust as needed based on your file structure
DATA_FILE_PATH = "202601.json"

def load_sections(file_path=DATA_FILE_PATH):
    """
    Reads the JSON file from disk and returns the list of section objects.
    """
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

def build_simple_heatmap():
    """
    Loads sections, filters for Oshawa campus and In-Person delivery,
    and returns a structured dict.
    """
    raw_sections = load_sections()
    filtered_sections = []

    for section in raw_sections:
        # Filter 1: Oshawa campus
        # Check 'campusDescription' or 'meetingsFaculty' -> 'meetingTime' -> 'campusDescription'
        is_oshawa = False
        campus_desc = section.get("campusDescription")
        if campus_desc and "Oshawa" in campus_desc:
            is_oshawa = True
        
        # Also check meeting times if top-level campus is ambiguous (though usually top-level is enough)
        # The prompt says: Use campusDescription or meetingTime.campusDescription that contains “Oshawa”.
        if not is_oshawa:
            meetings = section.get("meetingsFaculty") or []
            for meeting in meetings:
                mt = meeting.get("meetingTime") or {}
                mt_campus = mt.get("campusDescription")
                if mt_campus and "Oshawa" in mt_campus:
                    is_oshawa = True
                    break
        
        # Filter 2: In-person sections
        # Use instructionalMethodDescription (e.g. “In-Person”)
        is_in_person = False
        method_desc = section.get("instructionalMethodDescription")
        if method_desc and "In-Person" in method_desc:
            is_in_person = True

        if is_oshawa and is_in_person:
            filtered_sections.append(section)

    return {
        "term": "202601",
        "campus": "Oshawa",
        "totalSections": len(filtered_sections),
        "rawSections": filtered_sections
    }
