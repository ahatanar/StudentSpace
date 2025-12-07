import asyncio
import json
import sys
import argparse
import aiohttp
import re

# Assuming api.py is in the same directory
from scraper_client import get_sections, search_course_codes

async def get_all_sections(term: str, jsessionid: str):
    """Retrieve all course sections for a given term by iterating through all subjects."""
    all_data = []
    
    async with aiohttp.ClientSession() as session:
        # Set cookie for the session
        session.cookie_jar.update_cookies({"JSESSIONID": jsessionid})

        # 1. Fetch all subjects
        print("Fetching subject list...")
        try:
            # Increase limit to fetch more courses to discover subjects
            subjects_data = await search_course_codes(session, "%", term, limit=1000)
            
            # Extract unique subject codes (e.g. "CSCI" from "CSCI1000U")
            unique_subjects = set()
            for item in subjects_data:
                code = item['code']
                # Extract the alpha part of the code (e.g. "CSCI" from "CSCI1000U")
                match = re.match(r"([A-Z]+)", code)
                if match:
                    unique_subjects.add(match.group(1))
            
            subjects = sorted(list(unique_subjects))
            print(f"Found {len(subjects)} unique subjects: {subjects}")
        except Exception as e:
            print(f"Failed to fetch subjects: {e}")
            return []

        # 2. Iterate through each subject
        for subject in subjects:
            print(f"\nFetching sections for subject: {subject}")
            offset = 0
            limit = 500
            subject_sections = []

            while True:
                try:
                    # print(f"  Offset {offset}...")
                    result = await get_sections(
                        session, jsessionid, term, course_code=subject, offset=offset, limit=limit
                    )
                    
                    if not result or "data" not in result or result["data"] is None:
                         break

                    chunk = result["data"]
                    subject_sections.extend(chunk)
                    
                    offset += limit
                    if offset >= result["totalCount"]:
                        break
                except Exception as e:
                    print(f"  Error fetching {subject} offset {offset}: {e}")
                    break
            
            print(f"  Found {len(subject_sections)} sections for {subject}")
            all_data.extend(subject_sections)

    return all_data

async def main():
    parser = argparse.ArgumentParser(description="Update course sections")
    parser.add_argument("term", help="The term to update (e.g., 202601)")
    parser.add_argument("--jsessionid", required=True, help="The JSESSIONID cookie value")
    
    args = parser.parse_args()

    term = args.term
    jsessionid = args.jsessionid

    print(f"Starting update for term: {term}")
    
    try:
        sections = await get_all_sections(term, jsessionid)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

    filename = f"{term}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(sections, f, indent=2)

    print(f"Successfully saved {len(sections)} sections to {filename}")

if __name__ == "__main__":
    asyncio.run(main())