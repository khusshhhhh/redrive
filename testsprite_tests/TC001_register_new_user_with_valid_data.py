import requests
import uuid

BASE_URL = "http://localhost:3000"
REGISTER_ENDPOINT = f"{BASE_URL}/api/register"
TIMEOUT = 30

def test_register_new_user_with_valid_data():
    unique_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": unique_email,
        "name": "Test User",
        "password": "StrongPassword123!"
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(REGISTER_ENDPOINT, json=payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code in (200, 201), f"Expected status code 200 or 201, got {response.status_code}"
        # Optionally check response content if any
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_register_new_user_with_valid_data()
