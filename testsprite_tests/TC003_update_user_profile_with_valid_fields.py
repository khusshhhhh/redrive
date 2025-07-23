import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_update_user_profile_with_valid_fields():
    # Step 1: Register a new user to obtain authentication and user context
    register_url = f"{BASE_URL}/api/register"
    user_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    user_password = "TestPass123!"
    user_name = "Test User"
    register_payload = {
        "email": user_email,
        "name": user_name,
        "password": user_password
    }

    register_resp = requests.post(register_url, json=register_payload, timeout=TIMEOUT)
    assert register_resp.status_code == 200, "User registration failed"

    # Step 2: Authenticate user to get auth token (assuming login endpoint exists)
    # Since no explicit login endpoint is given, assume token is returned on registration or no auth needed.
    # If auth is required, this part should be adapted accordingly.
    # For this test, assume no auth token needed or session cookie handled by server.

    # Step 3: Update user profile with valid fields
    update_profile_url = f"{BASE_URL}/api/profile"
    update_payload = {
        "name": "Updated Test User",
        "number": "123",
        "streetAddress": "456 Test St",
        "suburb": "Testville",
        "state": "TS",
        "postcode": "12345",
        "licenseType": "Full",
        "licenseImage": "https://example.com/license-image.jpg"
    }
    headers = {
        "Content-Type": "application/json"
    }

    update_resp = requests.put(update_profile_url, json=update_payload, headers=headers, timeout=TIMEOUT)
    assert update_resp.status_code == 200, f"Profile update failed: {update_resp.text}"

    # Step 4: Optionally, verify the profile was updated by fetching user profile if endpoint available
    # The PRD shows /api/auth/user/route.ts GET endpoint for authenticated user data
    # Assuming no auth token, skip this verification or implement if auth is available

test_update_user_profile_with_valid_fields()
