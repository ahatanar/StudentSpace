import unittest
from unittest.mock import patch, MagicMock
from app.services.heatmap.builder import build_simple_heatmap

class TestHeatmapBuilder(unittest.TestCase):

    @patch('app.services.heatmap.builder.load_sections')
    def test_filtering_logic(self, mock_load_sections):
        """Test that sections are filtered correctly."""
        
        mock_sections = [
            # 1. Valid Oshawa In-Person
            {
                "courseNumber": "1001",
                "campusDescription": "Oshawa",
                "instructionalMethodDescription": "In-Person",
                "enrollment": 10,
                "meetingsFaculty": [{"meetingTime": {"beginTime": "0900", "endTime": "1000", "monday": True}}]
            },
            # 2. Not Oshawa
            {
                "courseNumber": "1002",
                "campusDescription": "Whitby",
                "instructionalMethodDescription": "In-Person",
                "enrollment": 10,
                "meetingsFaculty": [{"meetingTime": {"beginTime": "0900", "endTime": "1000", "monday": True}}]
            },
            # 3. Online
            {
                "courseNumber": "1003",
                "campusDescription": "Oshawa",
                "instructionalMethodDescription": "Online",
                "enrollment": 10,
                "meetingsFaculty": [{"meetingTime": {"beginTime": "0900", "endTime": "1000", "monday": True}}]
            },
            # 4. In-Person with Web (Hybrid)
            {
                "courseNumber": "1004",
                "campusDescription": "Oshawa",
                "instructionalMethodDescription": "In-Person with Web Component",
                "enrollment": 10,
                "meetingsFaculty": [{"meetingTime": {"beginTime": "0900", "endTime": "1000", "monday": True}}]
            },
             # 5. Hybrid Explicit
            {
                "courseNumber": "1005",
                "campusDescription": "Oshawa",
                "instructionalMethodDescription": "Hybrid: In-Person and Online",
                "enrollment": 10,
                "meetingsFaculty": [{"meetingTime": {"beginTime": "0900", "endTime": "1000", "monday": True}}]
            }
        ]
        
        mock_load_sections.return_value = mock_sections
        
        # Test 1: Default behavior (include_hybrid=True)
        print("Testing include_hybrid=True (Default)...")
        result = build_simple_heatmap(term="202509", include_hybrid=True)
        raw_sections = result["rawSections"]
        course_numbers = [s["courseNumber"] for s in raw_sections]
        print(f"  Surviving courses: {course_numbers}")
        
        self.assertIn("1001", course_numbers) # Pure In-Person
        self.assertNotIn("1002", course_numbers) # Wrong Campus
        self.assertNotIn("1003", course_numbers) # Pure Online
        self.assertIn("1004", course_numbers) # Hybrid 1
        self.assertIn("1005", course_numbers) # Hybrid 2
        
        # Test 2: Strict behavior (include_hybrid=False)
        print("\nTesting include_hybrid=False (Strict)...")
        result_strict = build_simple_heatmap(term="202509", include_hybrid=False)
        raw_sections_strict = result_strict["rawSections"]
        course_numbers_strict = [s["courseNumber"] for s in raw_sections_strict]
        print(f"  Surviving courses: {course_numbers_strict}")
        
        self.assertIn("1001", course_numbers_strict) # Pure In-Person
        self.assertNotIn("1004", course_numbers_strict) # Hybrid 1 excluded
        self.assertNotIn("1005", course_numbers_strict) # Hybrid 2 excluded

if __name__ == '__main__':
    unittest.main()
