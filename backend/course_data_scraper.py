import asyncio
import aiohttp
import re
import json
from datetime import datetime

BASE_URL = "https://ssp.mycampus.ca/StudentRegistrationSsb/ssb"
MEP_CODE = "UOIT"

async def search_course_codes(session, query, term, offset=1, limit=10):
    url = f"{BASE_URL}/classSearch/get_subjectcoursecombo"
    params = {
        "searchTerm": query,
        "term": term,
        "offset": offset,
        "max": limit,
        "mepCode": MEP_CODE,
    }
    async with session.get(url, params=params) as response:
        response.raise_for_status()
        return await response.json()


async def reset_data_form(session, jsessionid):
    cookies = {"JSESSIONID": jsessionid}
    url = f"{BASE_URL}/classSearch/resetDataForm"
    async with session.post(url, cookies=cookies) as response:
        response.raise_for_status()


def extract_meetings(sec):
    meetings = sec.get("meetingsFaculty", [])
    results = []

    for m in meetings:
        mt = m.get("meetingTime")
        if not mt:
            continue

        days = ""
        if mt.get("monday"): days += "M"
        if mt.get("tuesday"): days += "T"
        if mt.get("wednesday"): days += "W"
        if mt.get("thursday"): days += "R"
        if mt.get("friday"): days += "F"
        if mt.get("saturday"): days += "S"
        if mt.get("sunday"): days += "U"
        if days == "":
            days = "TBA"

        start = format_time(mt.get("beginTime"))
        end = format_time(mt.get("endTime"))
        time_str = f"{start} - {end}" if start and end else "TBA"

        results.append({"days": days, "time": time_str})

    return results


async def get_sections(
    session,
    jsessionid,
    term,
    course_code=None,
    schedule_type=None,
    offset=0,
    limit=500,
):
    await reset_data_form(session, jsessionid)

    cookies = {"JSESSIONID": jsessionid}

    url = f"{BASE_URL}/searchResults/searchResults"
    params = {
        "txt_subject": course_code,
        "txt_term": term,
        "txt_scheduleType": schedule_type,
        "startDatepicker": "",
        "endDatepicker": "",
        "pageOffset": offset,
        "pageMaxSize": limit,
        "sortColumn": "subjectDescription",
        "sortDirection": "asc",
        "mepCode": MEP_CODE,
    }
    params = clean_params(params)

    async with session.get(url, params=params, cookies=cookies) as response:
        response.raise_for_status()
        data = await response.json()

        if data["data"] is None:
            raise ValueError("No results — your JSESSIONID is wrong.")

        return data["data"]


def clean_params(params: dict) -> dict:
    return {k: v for k, v in params.items() if v is not None}

def load_subject_codes(filename="course.txt"):
    with open(filename, "r", encoding="utf-8") as f:
        return [item["code"] for item in json.load(f)]


def format_time(t):
    if not t or len(t) != 4:
        return ""
    hours = int(t[:2])
    minutes = t[2:]
    suffix = "AM"
    if hours >= 12:
        suffix = "PM"
    if hours > 12:
        hours -= 12
    return f"{hours}:{minutes} {suffix}"

async def main():
    jsessionid = "BB90D244EE8A9D944C052E93BCEB6365"   
    term = "202601"
    print("MAIN STARTED")

    # Load all subjects from courses.txt
    subjects = load_subject_codes("courses.txt")
    print(f"Loaded {len(subjects)} subjects.")

    async with aiohttp.ClientSession() as session:

        all_output = []

        for subject in subjects:
            print(f"\n=== Scraping {subject} ===")

            try:
                sections = await get_sections(session, jsessionid, term, course_code=subject)
            except Exception as e:
                print(f"  Error for subject {subject}: {e}")
                continue

            print(f"  Found {len(sections)} sections.")

            subject_output = []

            for sec in sections:
                title = sec.get("courseTitle")
                cnum = sec.get("courseNumber")
                stype = sec.get("scheduleTypeDescription")
                days = sec.get("meetingDays", "")
                start = format_time(sec.get("beginTime"))
                end = format_time(sec.get("endTime"))
                instructor = sec.get("faculty", "")
                crn = sec.get("courseReferenceNumber")
                seats = sec.get("seatsAvailable")
                max_seats = sec.get("maximumEnrollment")
                meetings = extract_meetings(sec)

                print(f"  {subject} {cnum} | CRN {crn} | {title}")

                subject_output.append({
                    "subject": subject,
                    "course_number": cnum,
                    "crn": crn,
                    "title": title,
                    "type": stype,
                    "instructor": instructor,
                    "seats": seats,
                    "max_seats": max_seats,
                    "meetings": meetings,
                    "raw_days": days,
                    "raw_start": start,
                    "raw_end": end
                })

                all_output.append(subject_output)

            # Save per-subject file
            filename = f"courses_{subject}_{term}.json"
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(subject_output, f, indent=4)

            print(f"  Saved {filename}")

        # Save everything in one file
        with open("all_courses.json", "w", encoding="utf-8") as f:
            json.dump(all_output, f, indent=4)

        print("\nDone. Saved all_courses.json")

asyncio.run(main())