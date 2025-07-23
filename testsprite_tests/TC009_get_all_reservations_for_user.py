import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Replace these with valid credentials for an existing user or create a user before running this test
AUTH_EMAIL = "testuser@example.com"
AUTH_PASSWORD = "TestPassword123!"

def authenticate_user(email: str, password: str) -> str:
    """Authenticate user and return the access token."""
    login_url = f"{BASE_URL}/api/auth/login"
    # The PRD does not specify a login endpoint explicitly, assuming standard login endpoint
    # If login endpoint differs, adjust accordingly.
    payload = {
        "email": email,
        "password": password
    }
    try:
        response = requests.post(login_url, json=payload, timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
        token = data.get("accessToken") or data.get("token") or data.get("access_token")
        if not token:
            raise ValueError("Authentication token not found in response")
        return token
    except Exception as e:
        raise RuntimeError(f"Authentication failed: {e}")

def test_get_all_reservations_for_user():
    # Authenticate user to get token
    try:
        token = authenticate_user(AUTH_EMAIL, AUTH_PASSWORD)
    except Exception as e:
        assert False, f"User authentication failed: {e}"

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }

    url = f"{BASE_URL}/api/reservations"

    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to get reservations failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        reservations = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(reservations, list), "Reservations response should be a list"

    # Further validation: each reservation should have expected fields
    expected_fields = {"listingId", "startDate", "endDate", "totalPrice", "insuranceType", "insuranceFee"}
    for reservation in reservations:
        assert isinstance(reservation, dict), "Each reservation should be a dictionary"
        missing_fields = expected_fields - reservation.keys()
        assert not missing_fields, f"Reservation missing fields: {missing_fields}"

test_get_all_reservations_for_user()