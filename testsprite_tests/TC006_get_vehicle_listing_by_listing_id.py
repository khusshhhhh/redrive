import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_get_vehicle_listing_by_listing_id():
    headers = {
        "Content-Type": "application/json"
    }

    # Sample data to create a new vehicle listing
    listing_data = {
        "title": "Test Vehicle Listing " + str(uuid.uuid4()),
        "description": "A test vehicle listing for API testing.",
        "imageSrcs": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
        "category": "car",
        "guestCount": 4,
        "doorCount": 4,
        "sleepCount": 0,
        "company": "Test Company",
        "modal": "Test Model",
        "year": 2020,
        "fuelType": "Petrol",
        "driveChain": "FWD",
        "price": 100,
        "state": "NSW",
        "suburb": "Sydney",
        "address": "123 Test St",
        "regoNumber": "TEST123",
        "regoEndDate": "2026-12-31"
    }

    listing_id = None
    try:
        # Create a new vehicle listing to get a valid listingId
        create_resp = requests.post(
            f"{BASE_URL}/api/listings",
            json=listing_data,
            headers=headers,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 200, f"Failed to create listing: {create_resp.text}"
        create_resp_json = create_resp.json()
        # The response should contain the created listing ID; if not, try to extract it
        # Assuming the API returns the created listing object with an 'id' or '_id' field
        if isinstance(create_resp_json, dict):
            listing_id = create_resp_json.get("id") or create_resp_json.get("_id")
        if not listing_id:
            # If no ID returned, try to get from response headers or fail
            raise AssertionError("Listing ID not returned in create response")

        # Now get the vehicle listing by listingId
        get_resp = requests.get(
            f"{BASE_URL}/api/listings/{listing_id}",
            headers=headers,
            timeout=TIMEOUT
        )
        assert get_resp.status_code == 200, f"Failed to get listing by ID: {get_resp.text}"
        listing = get_resp.json()
        # Validate that the returned listing matches the created data
        assert isinstance(listing, dict), "Listing response is not a JSON object"
        assert listing.get("title") == listing_data["title"], "Title does not match"
        assert listing.get("description") == listing_data["description"], "Description does not match"
        assert listing.get("category") == listing_data["category"], "Category does not match"
        assert listing.get("price") == listing_data["price"], "Price does not match"
        assert listing.get("state") == listing_data["state"], "State does not match"
        assert listing.get("suburb") == listing_data["suburb"], "Suburb does not match"
        assert listing.get("regoNumber") == listing_data["regoNumber"], "Rego number does not match"
        # Additional fields can be asserted similarly

    finally:
        # Cleanup: delete the created listing if possible
        if listing_id:
            try:
                del_resp = requests.delete(
                    f"{BASE_URL}/api/listings/{listing_id}",
                    headers=headers,
                    timeout=TIMEOUT
                )
                # It's okay if delete fails, just log or ignore
            except Exception:
                pass

test_get_vehicle_listing_by_listing_id()