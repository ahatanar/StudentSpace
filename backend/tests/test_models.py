import unittest
from unittest.mock import MagicMock
from datetime import datetime
from app.models.schemas import (
    User, Club, ClubMembership, 
    ClubRole, ClubStatus,
    is_executive_anywhere, can_manage_club, 
    can_create_events, is_club_president
)

class TestModels(unittest.TestCase):
    def setUp(self):
        self.mock_db = MagicMock()
        self.mock_collection = MagicMock()
        self.mock_db.collection.return_value = self.mock_collection

    def test_user_model(self):
        """Test User model creation and defaults"""
        user = User(uid="u1", email="test@test.com", display_name="Test")
        self.assertEqual(user.uid, "u1")
        self.assertFalse(user.is_admin)
        self.assertIsNone(user.created_at)

    def test_club_model(self):
        """Test Club model creation and defaults"""
        club = Club(
            name="Chess Club",
            description="Play chess",
            type="Academic",
            created_by="u1",
            president_id="u1"
        )
        self.assertEqual(club.status, ClubStatus.PENDING)
        self.assertIsNone(club.id)

    def test_club_membership_model(self):
        """Test ClubMembership model"""
        membership = ClubMembership(
            club_id="c1",
            user_id="u1",
            role=ClubRole.MEMBER
        )
        self.assertEqual(membership.role, ClubRole.MEMBER)

    def test_is_executive_anywhere_true(self):
        """Test is_executive_anywhere returns True when user has executive role"""
        # Mock query results
        mock_stream = MagicMock()
        mock_stream.__iter__.return_value = [MagicMock()] # One result
        self.mock_collection.where.return_value.where.return_value.limit.return_value.get.return_value = [MagicMock()]
        
        # Note: The implementation uses chained .where().where().limit().get()
        # We need to mock the chain correctly
        # db.collection().where().where().limit().get()
        
        # Setup chain
        q1 = MagicMock()
        q2 = MagicMock()
        q3 = MagicMock()
        
        self.mock_collection.where.return_value = q1
        q1.where.return_value = q2
        q2.limit.return_value = q3
        q3.get.return_value = [MagicMock()] # Return list with 1 item
        
        result = is_executive_anywhere("u1", self.mock_db)
        self.assertTrue(result)

    def test_is_executive_anywhere_false(self):
        """Test is_executive_anywhere returns False when no executive roles found"""
        # Setup chain to return empty list
        q1 = MagicMock()
        q2 = MagicMock()
        q3 = MagicMock()
        
        self.mock_collection.where.return_value = q1
        q1.where.return_value = q2
        q2.limit.return_value = q3
        q3.get.return_value = [] # Empty list
        
        result = is_executive_anywhere("u1", self.mock_db)
        self.assertFalse(result)

    def test_can_manage_club_admin(self):
        """Test admin can manage any club"""
        user = User(uid="admin", email="admin@test.com", display_name="Admin", is_admin=True)
        result = can_manage_club("admin", "c1", self.mock_db, user=user)
        self.assertTrue(result)

    def test_can_manage_club_president(self):
        """Test president can manage their club"""
        # Mock membership check
        q1 = MagicMock()
        q2 = MagicMock()
        q3 = MagicMock()
        q4 = MagicMock()
        
        self.mock_collection.where.return_value = q1
        q1.where.return_value = q2
        q2.where.return_value = q3
        q3.limit.return_value = q4
        q4.get.return_value = [MagicMock()]
        
        result = can_manage_club("u1", "c1", self.mock_db)
        self.assertTrue(result)

    def test_is_club_president(self):
        """Test is_club_president check"""
        q1 = MagicMock()
        q2 = MagicMock()
        q3 = MagicMock()
        q4 = MagicMock()
        
        self.mock_collection.where.return_value = q1
        q1.where.return_value = q2
        q2.where.return_value = q3
        q3.limit.return_value = q4
        q4.get.return_value = [MagicMock()]
        
        result = is_club_president("u1", "c1", self.mock_db)
        self.assertTrue(result)

if __name__ == '__main__':
    unittest.main()
