import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_update_vehicle_listing_by_listing_id():
    headers = {
        "Content-Type": "application/json"
    }

    # Step 1: Create a new vehicle listing to update later
    create_payload = {
        "title": "Test Vehicle " + str(uuid.uuid4()),
        "description": "A test vehicle listing for update test.",
        "imageSrcs": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
        "category": "car",
        "guestCount": 4,
        "doorCount": 4,
        "sleepCount": 0,
        "company": "Test Company",
        "modal": "Test Modal",
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
        create_resp = requests.post(f"{BASE_URL}/api/listings", json=create_payload, headers=headers, timeout=TIMEOUT)
        assert create_resp.status_code == 200, f"Failed to create listing, status code: {create_resp.status_code}"
        create_data = create_resp.json()
        # Expecting the response to contain the created listing ID
        # If not specified, try to get 'id' or '_id' or 'listingId' from response
        listing_id = create_data.get("id") or create_data.get("_id") or create_data.get("listingId")
        assert listing_id, "Listing ID not returned in create response"

        # Step 2: Update the created vehicle listing
        update_payload = {
            "title": "Updated Test Vehicle " + str(uuid.uuid4()),
            "description": "Updated description for the vehicle listing.",
            "imageSrcs": ["https://example.com/image3.jpg"],
            "category": "motorhome",
            "guestCount": 6,
            "doorCount": 3,
            "sleepCount": 4,
            "company": "Updated Test Company",
            "modal": "Updated Modal",
            "year": 2022,
            "fuelType": "Diesel",
            "driveChain": "AWD",
            "price": 150,
            "state": "VIC",
            "suburb": "Melbourne",
            "address": "456 Updated St",
            "regoNumber": "UPD123",
            "regoEndDate": "2027-06-30"
        }

        update_resp = requests.put(f"{BASE_URL}/api/listings/{listing_id}", json=update_payload, headers=headers, timeout=TIMEOUT)
        assert update_resp.status_code == 200, f"Failed to update listing, status code: {update_resp.status_code}"
        update_data = update_resp.json()
        # Validate that the updated fields match the payload
        for key, value in update_payload.items():
            assert update_data.get(key) == value, f"Mismatch in updated field '{key}': expected {value}, got {update_data.get(key)}"

        # Step 3: Retrieve the updated listing to verify changes persisted
        get_resp = requests.get(f"{BASE_URL}/api/listings/{listing_id}", headers=headers, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Failed to get updated listing, status code: {get_resp.status_code}"
        get_data = get_resp.json()
        for key, value in update_payload.items():
            assert get_data.get(key) == value, f"Mismatch in retrieved field '{key}': expected {value}, got {get_data.get(key)}"

    finally:
        # Cleanup: Delete the created listing if possible
        if listing_id:
            try:
                del_resp = requests.delete(f"{BASE_URL}/api/listings/{listing_id}", headers=headers, timeout=TIMEOUT)
                # Accept 200 or 204 as successful deletion
                assert del_resp.status_code in (200, 204), f"Failed to delete listing, status code: {del_resp.status_code}"
            except Exception:
                pass

test_update_vehicle_listing_by_listing_id()