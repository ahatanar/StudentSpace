# StudentSpace Backend

Backend API and data scraper for Ontario Tech course scheduling and campus heatmap visualization.

## 📁 Project Structure

```
Backend/
├── api.py                      # FastAPI server with /heatmap endpoint
├── heatmap_builder.py          # Builds heatmap data from course sections
├── time_slot_processor.py      # Time slot aggregation logic
├── scraper_client.py           # Ontario Tech Banner API client
├── update_sections.py          # CLI tool to fetch course data
├── course_data_scraper.py      # Legacy scraper (reference)
├── 202509.json                 # Fall 2025 course data
├── 202601.json                 # Winter 2026 course data
└── 202501.json                 # Winter 2025 course data
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install fastapi uvicorn aiohttp
```

### 2. Run the API Server

```bash
# From the StudentSpace root directory
cd Backend
python -m uvicorn api:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### 3. Test the Heatmap Endpoint

Visit: `http://localhost:8000/heatmap`

**Query Parameters:**
- `interval` (optional): Time granularity in minutes (10 or 30, default: 30)
  - Example: `http://localhost:8000/heatmap?interval=10`

## 📊 Fetching Course Data

### Get JSESSIONID Cookie

1. Go to [Ontario Tech Course Search](https://ssp.mycampus.ca/StudentRegistrationSsb/ssb/classSearch/classSearch)
2. Open DevTools (F12) → Application → Cookies
3. Copy the `JSESSIONID` value

### Run the Update Script

```bash
python update_sections.py <TERM_CODE> --jsessionid <YOUR_JSESSIONID>
```

**Example:**
```bash
python update_sections.py 202509 --jsessionid 6FA174847612735A784B5DCA74942625
```

**Common Term Codes:**
- `202501` - Winter 2025
- `202505` - Spring/Summer 2025
- `202509` - Fall 2025
- `202601` - Winter 2026

### Output

The script will:
1. Fetch all unique subjects (CSCI, MATH, BIOL, etc.)
2. Download all course sections for each subject
3. Save to `<TERM_CODE>.json` in the Backend folder

**Example output:**
```
Starting update for term: 202509
Fetching subject list...
Found 55 unique subjects: ['APBS', 'AUTE', 'BIOL', ...]

Fetching sections for subject: CSCI
  Found 143 sections for CSCI

...

Successfully saved 15234 sections to 202509.json
```

## 📡 API Endpoints

### `GET /heatmap`

Returns campus occupancy heatmap data.

**Query Parameters:**
- `interval` (int, optional): Time slot interval in minutes (default: 30)
  - `30` = 30-minute blocks (29 time slots from 8 AM - 10 PM)
  - `10` = 10-minute blocks (87 time slots from 8 AM - 10 PM)

**Response:**
```json
{
  "term": "202601",
  "campus": "Oshawa",
  "totalSections": 1552,
  "interval": 30,
  "heatmapData": {
    "Monday": {
      "08:00": 2834,
      "08:30": 3432,
      "09:00": 3871,
      ...
    },
    "Tuesday": { ... },
    "Wednesday": { ... },
    "Thursday": { ... },
    "Friday": { ... }
  },
  "timeSlots": ["08:00", "08:30", "09:00", ...],
  "rawSections": [...]
}
```

**Filters Applied:**
- ✅ Oshawa campus only
- ✅ In-person classes only (excludes online/remote/virtual)
- ❌ Excludes: Online, Remote, Virtual, Web-based, Distance learning

## 🏗️ Architecture

### Heatmap Pipeline

```
Course Data (JSON)
    ↓
heatmap_builder.py (filters: Oshawa + In-Person)
    ↓
time_slot_processor.py (aggregates into time slots)
    ↓
API Response (heatmap data)
    ↓
Frontend (React visualization)
```

### Key Components

**`scraper_client.py`**
- Interfaces with Ontario Tech Banner API
- Handles session management and term selection
- Fetches course sections by subject

**`time_slot_processor.py`**
- Generates configurable time slots (10, 15, 30 min intervals)
- Maps course meetings to time slots
- Aggregates student enrollment per slot

**`heatmap_builder.py`**
- Loads and filters course data
- Applies campus and instructional method filters
- Builds Monday-Friday heatmap grid

**`api.py`**
- FastAPI server
- Exposes `/heatmap` endpoint with interval parameter
- Serves data to frontend

## 🛠️ Troubleshooting

### "No sections found" Error

**Problem:** Script returns 0 sections even with valid JSESSIONID

**Solutions:**
1. **Get a fresh JSESSIONID** - cookies expire quickly
2. **Verify term code** - check if the term is actually published
3. **Check term availability** - visit the course search site to confirm courses are available

### JSESSIONID Expired

**Symptoms:**
- `totalCount: 0` in API response
- "No sections found" error

**Fix:** Get a new JSESSIONID from the browser (see instructions above)

### Port Already in Use

**Error:** `WinError 10013` or "Address already in use"

**Fix:**
```bash
# Find and kill the process using port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or use a different port
python -m uvicorn api:app --reload --port 8001
```

## 📝 Notes

- **JSESSIONID Duration:** Session cookies typically expire after 20-30 minutes of inactivity
- **Rate Limiting:** The Banner API may rate limit if too many requests are made too quickly
- **Data Freshness:** Re-run `update_sections.py` periodically to get the latest enrollment numbers
- **File Size:** Term JSON files can be 30-50MB depending on the number of sections

## 🎯 Next Steps

- Set up automated data updates (cron job or scheduled task)
- Add support for multiple campuses (Durham, etc.)
- Implement caching to reduce API load
- Add term code auto-detection

---

**Need help?** Check the main project README or contact the development team.
