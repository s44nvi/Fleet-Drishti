import requests

API_URL = "http://127.0.0.1:8000"

# Second bus
BUS_ID = "312f8278-5bd1-493e-81a6-f678ed74795e"
ROUTE_ID = "7f974462-2d79-43dd-b2e9-c4e014778eb3"
CAMERA_ID = "273194d5-0b98-4ec2-9b53-00afbcb509d5"


# Login
login_response = requests.post(
    f"{API_URL}/auth/login",
    json={
        "email": "admin@citylens.com",
        "password": "admin123",
    },
)

print("LOGIN:", login_response.status_code)

token = login_response.json()["access_token"]

headers = {
    "Authorization": f"Bearer {token}"
}


# Second bus observes the same pothole area
payload = {
    "type": "road_defect",
    "subtype": "pothole",
    "confidence": 0.88,
    "timestamp": "2026-09-12T18:35:00",
    "gps": {
        "lat": 19.0761,
        "lng": 72.8778,
    },
    "bus_id": BUS_ID,
    "route_id": ROUTE_ID,
    "camera_id": CAMERA_ID,
}


event_response = requests.post(
    f"{API_URL}/events",
    json=payload,
    headers=headers,
)

print("SECOND BUS EVENT:", event_response.status_code)
print(event_response.json())