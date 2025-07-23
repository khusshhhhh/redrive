import requests
import uuid
from datetime import date, timedelta

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_update_reservation_status():
    headers = {
        "Content-Type": "application/json"
    }

    # Step 1: Create a vehicle listing (required for reservation)
    listing_payload = {
        "title": "Test Vehicle " + str(uuid.uuid4()),
        "description": "A test vehicle for reservation status update test.",
        "imageSrcs": ["https://example.com/image1.jpg"],
        "category": "car",
        "guestCount": 4,
        "doorCount": 4,
        "sleepCount": 0,
        "company": "TestCompany",
        "modal": "TestModel",
        "year": 2020,
        "fuelType": "petrol",
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
        resp = requests.post(f"{BASE_URL}/api/listings", json=listing_payload, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Failed to create listing: {resp.text}"
        listing_data = resp.json()
        listing_id = listing_data.get("id") or listing_data.get("_id") or listing_data.get("listingId")
        assert listing_id, "Listing ID not returned in response"

        # Step 2: Create a reservation for the listing
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        reservation_payload = {
            "listingId": listing_id,
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "totalPrice": 300,
            "insuranceType": "basic",
            "insuranceFee": 30
        }

        resp = requests.post(f"{BASE_URL}/api/reservations", json=reservation_payload, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Failed to create reservation: {resp.text}"
        reservation_data = resp.json()
        reservation_id = reservation_data.get("id") or reservation_data.get("_id") or reservation_data.get("reservationId")
        assert reservation_id, "Reservation ID not returned in response"

        # Step 3: Update reservation status
        update_payload = {
            "status": "confirmed"
        }

        resp = requests.put(f"{BASE_URL}/api/reservations/{reservation_id}", json=update_payload, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Failed to update reservation status: {resp.text}"
        updated_data = resp.json()
        assert updated_data.get("status") == "confirmed", "Reservation status was not updated correctly"

        # Step 4: Verify update by fetching reservation
        resp = requests.get(f"{BASE_URL}/api/reservations/{reservation_id}", headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Failed to get reservation after update: {resp.text}"
        fetched_data = resp.json()
        assert fetched_data.get("status") == "confirmed", "Fetched reservation status does not match updated status"

    finally:
        # Cleanup: delete reservation if possible
        if reservation_id:
            try:
                requests.delete(f"{BASE_URL}/api/reservations/{reservation_id}", headers=headers, timeout=TIMEOUT)
            except Exception:
                pass
        # Cleanup: delete listing if possible
        if listing_id:
            try:
                requests.delete(f"{BASE_URL}/api/listings/{listing_id}", headers=headers, timeout=TIMEOUT)
            except Exception:
                pass

test_update_reservation_status()