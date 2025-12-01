import json
import os

def create_mock_winter_data():
    source_file = "202509.json"
    target_file = "202601.json"
    
    if not os.path.exists(source_file):
        print(f"Error: {source_file} not found.")
        return

    print(f"Reading {source_file}...")
    with open(source_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    print(f"Loaded {len(data)} sections.")
    
    # Modify term to 202601
    print("Converting term 202509 -> 202601...")
    for section in data:
        section["term"] = "202601"
        section["termDesc"] = "Winter 2026"
        
        # Also update nested term fields if they exist
        if "meetingsFaculty" in section:
            for meeting in section["meetingsFaculty"]:
                meeting["term"] = "202601"
                if "meetingTime" in meeting and meeting["meetingTime"]:
                     meeting["meetingTime"]["term"] = "202601"
                     
        if "faculty" in section:
            for faculty in section["faculty"]:
                faculty["term"] = "202601"

    print(f"Writing to {target_file}...")
    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
    print("Done! Winter 2026 mock data created.")

if __name__ == "__main__":
    create_mock_winter_data()
