import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_create_new_vehicle_listing_with_complete_data():
    url = f"{BASE_URL}/api/listings"
    headers = {
        "Content-Type": "application/json"
    }

    # Prepare complete vehicle listing data
    unique_suffix = str(uuid.uuid4())[:8]
    payload = {
        "title": f"Test Vehicle Listing {unique_suffix}",
        "description": "A fully equipped test vehicle for rental purposes.",
        "imageSrcs": [
            "https://example.com/images/vehicle1.jpg",
            "https://example.com/images/vehicle2.jpg"
        ],
        "category": "motorhome",
        "guestCount": 4,
        "doorCount": 3,
        "sleepCount": 4,
        "company": "Test Motors",
        "modal": "Model X",
        "year": 2023,
        "fuelType": "diesel",
        "driveChain": "4WD",
        "price": 150,
        "state": "NSW",
        "suburb": "Sydney",
        "address": "123 Test Street",
        "regoNumber": f"TEST{unique_suffix.upper()}",
        "regoEndDate": "2026-12-31"
    }

    listing_id = None
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        response_json = response.json()
        # Validate response contains an ID or similar confirmation
        assert isinstance(response_json, dict), "Response is not a JSON object"
        # Try to get listing ID from response for cleanup
        listing_id = response_json.get("id") or response_json.get("_id") or response_json.get("listingId")
        assert listing_id is not None, "Listing ID not found in response"
        # Validate returned fields match input where applicable
        for key in ["title", "description", "category", "price", "state", "suburb", "address", "regoNumber"]:
            assert response_json.get(key) == payload[key], f"Mismatch in field '{key}'"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    finally:
        # Cleanup: delete the created listing if possible
        if listing_id:
            try:
                delete_url = f"{BASE_URL}/api/listings/{listing_id}"
                del_response = requests.delete(delete_url, timeout=TIMEOUT)
                # Accept 200 or 204 as successful deletion
                assert del_response.status_code in (200, 204), f"Failed to delete listing, status code {del_response.status_code}"
            except Exception:
                pass

test_create_new_vehicle_listing_with_complete_data()