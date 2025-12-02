from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# How to run:
# 1. Ensure you have fastapi and uvicorn installed: pip install fastapi uvicorn
# 2. Run the server: uvicorn api:app --reload
#    (Or: python -m uvicorn api:app --reload)
# 3. Access the API at http://localhost:8000
# 4. View documentation at http://localhost:8000/docs
#
# Data Source:
# This API currently reads from '202601.json' in the same directory.
# Ensure this file exists and contains valid course data.

app = FastAPI()

# Add CORS middleware to allow requests from the frontend (e.g., localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now (dev mode)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from heatmap_builder import build_simple_heatmap

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/heatmap")
def get_heatmap(interval: int = 30, term: str = "202601", include_raw: bool = False):
    """
    Get heatmap data with configurable time interval and term.
    
    Args:
        interval: Minutes per time slot (default 30, supports 10, 15, 30, etc.)
        term: Term code (default "202601", options: "202509", "202601")
        include_raw: Include raw section data (default False to reduce payload size)
    
    Returns:
        Heatmap data with the specified granularity for the selected term
    """
    result = build_simple_heatmap(interval, term)
    
    # Exclude rawSections by default to prevent large payloads from hanging
    if not include_raw and 'rawSections' in result:
        # Keep count but remove the actual data
        raw_count = len(result['rawSections'])
        del result['rawSections']
        result['rawSectionsCount'] = raw_count
    
    return result
