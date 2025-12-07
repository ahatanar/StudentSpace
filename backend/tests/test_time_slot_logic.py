import unittest
from datetime import time
from app.services.heatmap.time_slots import parse_meeting_time, get_time_slots_for_meeting, build_heatmap_grid

class TestTimeSlotProcessor(unittest.TestCase):

    def test_parse_meeting_time_valid(self):
        """Test parsing valid time strings."""
        self.assertEqual(parse_meeting_time("0940"), time(9, 40))
        self.assertEqual(parse_meeting_time("1330"), time(13, 30))
        self.assertEqual(parse_meeting_time("0000"), time(0, 0))
        self.assertEqual(parse_meeting_time("2359"), time(23, 59))
        # Test padding
        self.assertEqual(parse_meeting_time("900"), time(9, 0))
        self.assertEqual(parse_meeting_time("930"), time(9, 30))

    def test_parse_meeting_time_invalid(self):
        """Test parsing invalid time strings."""
        self.assertIsNone(parse_meeting_time(None))
        self.assertIsNone(parse_meeting_time(""))
        self.assertIsNone(parse_meeting_time("abc"))
        self.assertIsNone(parse_meeting_time("2400"))  # Invalid hour
        self.assertIsNone(parse_meeting_time("1260"))  # Invalid minute
        self.assertIsNone(parse_meeting_time("12345")) # Too long

    def test_get_time_slots_standard(self):
        """Test standard meeting times aligned with slots."""
        # 09:00 to 10:00 (30 min slots: 09:00, 09:30)
        slots = get_time_slots_for_meeting("0900", "1000", interval_minutes=30)
        expected = {"09:00", "09:30"}
        self.assertEqual(slots, expected)

    def test_get_time_slots_overlap(self):
        """Test meeting times that partially overlap slots."""
        # 09:10 to 10:10
        # Slot 09:00-09:30: Overlaps (09:10-09:30)
        # Slot 09:30-10:00: Fully contained
        # Slot 10:00-10:30: Overlaps (10:00-10:10)
        slots = get_time_slots_for_meeting("0910", "1010", interval_minutes=30)
        expected = {"09:00", "09:30", "10:00"}
        self.assertEqual(slots, expected)

    def test_get_time_slots_short_meeting(self):
        """Test a short meeting contained within one slot."""
        # 09:10 to 09:20
        # Slot 09:00-09:30: Contains meeting
        slots = get_time_slots_for_meeting("0910", "0920", interval_minutes=30)
        expected = {"09:00"}
        self.assertEqual(slots, expected)

    def test_get_time_slots_cross_boundary(self):
        """Test a meeting crossing a slot boundary."""
        # 09:20 to 09:40
        # Slot 09:00-09:30: Overlaps
        # Slot 09:30-10:00: Overlaps
        slots = get_time_slots_for_meeting("0920", "0940", interval_minutes=30)
        expected = {"09:00", "09:30"}
        self.assertEqual(slots, expected)

    def test_build_heatmap_grid(self):
        """Test building the heatmap grid from sections."""
        sections = [
            {
                "enrollment": 10,
                "meetingsFaculty": [
                    {
                        "meetingTime": {
                            "beginTime": "0900",
                            "endTime": "1000",
                            "monday": True,
                            "wednesday": True
                        }
                    }
                ]
            },
            {
                "enrollment": 5,
                "meetingsFaculty": [
                    {
                        "meetingTime": {
                            "beginTime": "0930",
                            "endTime": "1030",
                            "monday": True
                        }
                    }
                ]
            }
        ]
        
        # Monday:
        # Section 1 (10 students): 09:00-10:00 -> Slots 09:00, 09:30
        # Section 2 (5 students): 09:30-10:30 -> Slots 09:30, 10:00
        # Result Monday:
        # 09:00: 10
        # 09:30: 10 + 5 = 15
        # 10:00: 5
        
        # Wednesday:
        # Section 1 (10 students): 09:00-10:00 -> Slots 09:00, 09:30
        # Result Wednesday:
        # 09:00: 10
        # 09:30: 10
        
        grid = build_heatmap_grid(sections, interval_minutes=30)
        
        self.assertEqual(grid["Monday"]["09:00"], 10)
        self.assertEqual(grid["Monday"]["09:30"], 15)
        self.assertEqual(grid["Monday"]["10:00"], 5)
        
        self.assertEqual(grid["Wednesday"]["09:00"], 10)
        self.assertEqual(grid["Wednesday"]["09:30"], 10)
        self.assertEqual(grid["Wednesday"]["10:00"], 0)
        
        # Tuesday should be empty
        self.assertEqual(grid["Tuesday"]["09:00"], 0)

    def test_build_heatmap_grid_overlapping_meetings(self):
        """Test handling of overlapping meetings within the same section."""
        # This scenario checks if enrollment is double-counted when meetings overlap
        sections = [
            {
                "enrollment": 10,
                "meetingsFaculty": [
                    {
                        "meetingTime": {
                            "beginTime": "0900",
                            "endTime": "1000",
                            "monday": True
                        }
                    },
                    {
                        "meetingTime": {
                            "beginTime": "0930",
                            "endTime": "1030",
                            "monday": True
                        }
                    }
                ]
            }
        ]
        
        # Meeting 1: 09:00-10:00 -> Slots 09:00, 09:30
        # Meeting 2: 09:30-10:30 -> Slots 09:30, 10:00
        # Overlap at 09:30.
        # If simply additive:
        # 09:00: 10
        # 09:30: 10 + 10 = 20
        # 10:00: 10
        
        grid = build_heatmap_grid(sections, interval_minutes=30)
        
        self.assertEqual(grid["Monday"]["09:00"], 10)
        self.assertEqual(grid["Monday"]["09:30"], 20) # This confirms double counting behavior
        self.assertEqual(grid["Monday"]["10:00"], 10)

if __name__ == '__main__':
    unittest.main()
