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
def get_heatmap():
    return build_simple_heatmap()
