import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_get_authenticated_user_data():
    # Credentials for authentication - replace with valid test user credentials
    register_url = f"{BASE_URL}/api/register"
    auth_user_url = f"{BASE_URL}/api/auth/user"

    # Test user data for registration and login
    test_user = {
        "email": "testuser_tc002@example.com",
        "name": "Test User TC002",
        "password": "TestPass123!"
    }

    session = requests.Session()
    try:
        # Register the user (ignore if already exists)
        reg_resp = session.post(register_url, json=test_user, timeout=TIMEOUT)
        if reg_resp.status_code not in (200, 409):
            # 409 Conflict if user already exists, treat as okay for test continuation
            reg_resp.raise_for_status()

        # Attempt to get authenticated user data
        resp = session.get(auth_user_url, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        # Validate response contains expected user data fields
        assert isinstance(data, dict), "Response JSON is not an object"
        assert "email" in data, "Response missing 'email'"
        assert data["email"].lower() == test_user["email"].lower(), "Email in response does not match authenticated user"
        assert "name" in data, "Response missing 'name'"
        assert data["name"] == test_user["name"], "Name in response does not match authenticated user"

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

test_get_authenticated_user_data()
