import requests
import uuid
from datetime import date, timedelta

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_create_new_reservation_with_insurance_and_pricing():
    headers = {"Content-Type": "application/json"}

    # Step 1: Create a new vehicle listing to get a valid listingId for reservation
    listing_payload = {
        "title": "Test Vehicle for Reservation " + str(uuid.uuid4()),
        "description": "A test vehicle used for reservation creation test.",
        "imageSrcs": ["https://example.com/image1.jpg"],
        "category": "car",
        "guestCount": 4,
        "doorCount": 4,
        "sleepCount": 0,
        "company": "TestCompany",
        "modal": "TestModel",
        "year": 2022,
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
    reservation_id = None

    try:
        # Create listing
        resp_listing = requests.post(
            f"{BASE_URL}/api/listings",
            json=listing_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp_listing.status_code == 200, f"Failed to create listing: {resp_listing.text}"
        listing_data = resp_listing.json()
        # Expecting the response to contain the created listing ID
        # If not specified, try to extract from response
        if isinstance(listing_data, dict) and "id" in listing_data:
            listing_id = listing_data["id"]
        else:
            # fallback: try to parse id from response or raise
            raise AssertionError("Listing creation response missing 'id' field")

        # Step 2: Create a new reservation with insurance and pricing
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        reservation_payload = {
            "listingId": listing_id,
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "totalPrice": 450,  # example total price
            "insuranceType": "Full Coverage",
            "insuranceFee": 50
        }

        resp_reservation = requests.post(
            f"{BASE_URL}/api/reservations",
            json=reservation_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp_reservation.status_code == 200, f"Failed to create reservation: {resp_reservation.text}"
        reservation_data = resp_reservation.json()
        # Validate response contains expected fields
        assert isinstance(reservation_data, dict), "Reservation response is not a JSON object"
        assert reservation_data.get("listingId") == listing_id, "Reservation listingId mismatch"
        assert reservation_data.get("startDate") == reservation_payload["startDate"], "Reservation startDate mismatch"
        assert reservation_data.get("endDate") == reservation_payload["endDate"], "Reservation endDate mismatch"
        assert reservation_data.get("totalPrice") == reservation_payload["totalPrice"], "Reservation totalPrice mismatch"
        assert reservation_data.get("insuranceType") == reservation_payload["insuranceType"], "Reservation insuranceType mismatch"
        assert reservation_data.get("insuranceFee") == reservation_payload["insuranceFee"], "Reservation insuranceFee mismatch"

        reservation_id = reservation_data.get("id") or reservation_data.get("_id")

    finally:
        # Cleanup: delete the created reservation and listing if possible
        if reservation_id:
            try:
                requests.delete(f"{BASE_URL}/api/reservations/{reservation_id}", timeout=TIMEOUT)
            except Exception:
                pass
        if listing_id:
            try:
                requests.delete(f"{BASE_URL}/api/listings/{listing_id}", timeout=TIMEOUT)
            except Exception:
                pass

test_create_new_reservation_with_insurance_and_pricing()