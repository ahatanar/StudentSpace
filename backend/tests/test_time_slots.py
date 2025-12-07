"""Test script to verify time slot processing and API response."""

import json
from app.services.heatmap.builder import build_simple_heatmap

def test_api_response():
    """Test the heatmap API response structure."""
    print("Testing heatmap API response format...\n")
    
    result = build_simple_heatmap()
    
    # Check top-level keys
    expected_keys = {"term", "campus", "totalSections", "heatmapData", "timeSlots", "rawSections"}
    actual_keys = set(result.keys())
    
    print(f"✓ Top-level keys: {actual_keys}")
    assert actual_keys == expected_keys, f"Missing keys: {expected_keys - actual_keys}"
    
    # Check heatmapData structure
    assert "heatmapData" in result
    heatmap_data = result["heatmapData"]
    
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    for day in days:
        assert day in heatmap_data, f"Missing day: {day}"
    
    print(f"✓ HeatmapData has all weekdays\n")
    
    # Check timeSlots
    time_slots = result["timeSlots"]
    print(f"✓ Time slots count: {len(time_slots)}")
    print(f"  First slot: {time_slots[0]}")
    print(f"  Last slot: {time_slots[-1]}\n")
    
    # Sample Monday data
    monday_data = heatmap_data["Monday"]
    print(f"✓ Monday time slots: {len(monday_data)}")
    
    # Find peak time
    peak_slot = max(monday_data.items(), key=lambda x: x[1])
    print(f"  Peak time: {peak_slot[0]} with {peak_slot[1]} students\n")
    
    # Show sample data
    print("Sample Monday data (first 5 slots):")
    for i, slot in enumerate(time_slots[:5]):
        count = monday_data.get(slot, 0)
        print(f"  {slot}: {count} students")
    
    print("\n✓ All tests passed!")
    print(f"\nSummary:")
    print(f"  Term: {result['term']}")
    print(f"  Campus: {result['campus']}")
    print(f"  Total Sections: {result['totalSections']}")

if __name__ == "__main__":
    try:
        test_api_response()
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
