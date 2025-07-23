import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_get_user_profile_by_user_id():
    # Register a new user to get a valid userId
    register_url = f"{BASE_URL}/api/register"
    user_email = f"testuser_{uuid.uuid4()}@example.com"
    user_password = "TestPass123!"
    user_name = "Test User"
    register_payload = {
        "email": user_email,
        "name": user_name,
        "password": user_password
    }
    headers = {"Content-Type": "application/json"}

    user_id = None
    try:
        # Register user
        reg_resp = requests.post(register_url, json=register_payload, headers=headers, timeout=TIMEOUT)
        assert reg_resp.status_code in [200, 201], f"User registration failed with status code {reg_resp.status_code}: {reg_resp.text}"

        # Extract userId from registration response
        try:
            user_data = reg_resp.json()
            user_id = user_data.get("id")
        except Exception:
            user_id = None

        assert user_id is not None, "User ID not returned on registration, cannot test profile retrieval."

        # Get user profile by userId
        profile_url = f"{BASE_URL}/api/profile/{user_id}"
        profile_resp = requests.get(profile_url, timeout=TIMEOUT)
        assert profile_resp.status_code == 200, f"Failed to get profile for userId {user_id}: {profile_resp.text}"

        profile_data = profile_resp.json()
        # Validate profile data contains expected fields
        assert isinstance(profile_data, dict), "Profile response is not a JSON object"
        # Check at least email or name matches
        assert profile_data.get("email") == user_email or profile_data.get("name") == user_name, "Profile data does not match registered user"

    finally:
        # Cleanup: No delete user endpoint specified, so cannot delete user
        pass

test_get_user_profile_by_user_id()