"""
Heatmap API endpoints.
"""

from fastapi import APIRouter

from app.services.heatmap.builder import build_simple_heatmap

router = APIRouter(tags=["heatmap"])


@router.get("/health")
def health_check():
    return {"status": "ok"}


@router.get("/heatmap")
def get_heatmap(interval: int = 30, term: str = "202601", include_raw: bool = False):
    result = build_simple_heatmap(interval, term)
    if not include_raw and 'rawSections' in result:
        raw_count = len(result['rawSections'])
        del result['rawSections']
        result['rawSectionsCount'] = raw_count
    return result
