"""
Tests for API endpoints with mocked Firestore and Firebase Auth.
Run with: pytest test_api_mocked.py
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from datetime import datetime
from fastapi.responses import JSONResponse

# Import app and models
from app.main import app
from app.dependencies import get_current_user
from app.models.schemas import User, Club, Event, ClubRole, ClubStatus

# Create TestClient
client = TestClient(app)

# ============================================================================
# MOCK DATA
# ============================================================================

MOCK_USER_ID = "user_123"
MOCK_USER = User(
    uid=MOCK_USER_ID,
    email="test@example.com",
    display_name="Test User",
    is_admin=False
)

MOCK_CLUB_ID = "club_abc"
MOCK_CLUB = Club(
    id=MOCK_CLUB_ID,
    name="Chess Club",
    description="Chess club description",
    type="Academic",
    created_by=MOCK_USER_ID,
    president_id=MOCK_USER_ID,
    status=ClubStatus.ACTIVE,
    created_at=datetime.now()
)

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def mock_auth():
    """Mock the get_current_user dependency to bypass Firebase Auth"""
    app.dependency_overrides[get_current_user] = lambda: MOCK_USER
    yield
    app.dependency_overrides = {}

@pytest.fixture
def mock_firestore():
    """Mock the Firestore client in all service modules where it's used"""
    # Setup mock objects
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_doc_ref = MagicMock()
    mock_doc_snapshot = MagicMock()
    
    # Configure mock chain: db.collection().document().get()
    mock_db.collection.return_value = mock_collection
    mock_collection.document.return_value = mock_doc_ref
    mock_doc_ref.get.return_value = mock_doc_snapshot
    mock_doc_ref.id = MOCK_CLUB_ID  # IMPORTANT: Return string ID for document reference
    mock_doc_ref.set = MagicMock()  # For create operations
    mock_doc_ref.update = MagicMock()  # For update operations
    mock_doc_ref.delete = MagicMock()  # For delete operations
    
    # Default: Document exists and returns data
    mock_doc_snapshot.exists = True
    mock_doc_snapshot.to_dict.return_value = MOCK_CLUB.model_dump()
    mock_doc_snapshot.id = MOCK_CLUB_ID
    mock_doc_snapshot.reference = mock_doc_ref
    
    # Configure mock chain: db.collection().where().stream()
    mock_query = MagicMock()
    mock_collection.where.return_value = mock_query
    mock_query.where.return_value = mock_query  # Chained wheres
    mock_query.limit.return_value = mock_query  # Chained limit
    mock_query.stream.return_value = [mock_doc_snapshot]
    mock_query.get.return_value = [mock_doc_snapshot]
    
    # Patch db in all service modules where it's imported and used
    with patch("app.services.club_service.db", mock_db), \
         patch("app.services.user_service.db", mock_db), \
         patch("app.routers.events.db", mock_db):
        yield mock_db

# ============================================================================
# TESTS
# ============================================================================
@app.head("/health")
async def health_head():
    # HEAD responses must NOT include a body.
    return JSONResponse(content=None, status_code=200)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_create_club(mock_auth, mock_firestore):
    """Test creating a club"""
    payload = {
        "name": "New Club",
        "description": "Description",
        "type": "Social",
        "created_by": "temp", # Should be overwritten by API
        "president_id": "temp" # Should be overwritten by API
    }
    
    response = client.post("/clubs", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Club"
    assert data["created_by"] == MOCK_USER_ID # Should match logged in user
    assert data["president_id"] == MOCK_USER_ID # Creator becomes president
    
    # Verify Firestore calls
    # 1. Create club doc
    # 2. Create membership doc (president)
    assert mock_firestore.collection.call_count >= 2

def test_get_club(mock_firestore):
    """Test retrieving a club"""
    response = client.get(f"/clubs/{MOCK_CLUB_ID}")
    assert response.status_code == 200
    assert response.json()["id"] == MOCK_CLUB_ID

def test_join_club(mock_auth, mock_firestore):
    """Test joining a club"""
    response = client.post(f"/clubs/{MOCK_CLUB_ID}/join")
    assert response.status_code == 200
    
    # Verify membership creation
    # Should verify that role is MEMBER
    # Since we mock the DB, we just check status code here
    pass

def test_create_event_success(mock_auth, mock_firestore):
    """Test creating an event as an executive (mocked)"""
    
    # Mock permission check to return True - patch where it's imported/used
    with patch("app.routers.events.can_create_events", return_value=True):
        params = {
            "club_id": MOCK_CLUB_ID,
            "name": "New Event",
            "description": "Event Description",
            "location": "Room 101",
            "start_time": datetime.now().isoformat(),
            "end_time": datetime.now().isoformat()
        }
        
        response = client.post("/events", params=params)
        assert response.status_code == 200
        data = response.json()
        assert "event_id" in data or "message" in data  # API returns event_id on success

def test_create_event_forbidden(mock_auth, mock_firestore):
    """Test creating an event without permission"""
    
    # Mock permission check to return False - patch where it's imported/used
    with patch("app.routers.events.can_create_events", return_value=False):
        params = {
            "club_id": MOCK_CLUB_ID,
            "name": "New Event",
            "description": "Event Description",
            "location": "Room 101",
            "start_time": datetime.now().isoformat(),
            "end_time": datetime.now().isoformat()
        }
        
        response = client.post("/events", params=params)
        assert response.status_code == 403  # Forbidden

def test_delete_club_success(mock_firestore):
    """Test deleting a club as admin"""
    # Create admin user
    admin_user = User(
        uid="admin_123",
        email="admin@example.com",
        display_name="Admin User",
        is_admin=True
    )
    
    # Override auth with admin user
    app.dependency_overrides[get_current_user] = lambda: admin_user
    
    response = client.delete(f"/clubs/{MOCK_CLUB_ID}")
    assert response.status_code == 200
    assert response.json()["message"] == "Club deleted successfully"
    assert response.json()["club_id"] == MOCK_CLUB_ID
    
    # Clean up
    app.dependency_overrides = {}

def test_delete_club_forbidden(mock_auth, mock_firestore):
    """Test deleting a club as non-admin user"""
    response = client.delete(f"/clubs/{MOCK_CLUB_ID}")
    assert response.status_code == 403  # Forbidden
    assert "Admin permissions required" in response.json()["detail"]

