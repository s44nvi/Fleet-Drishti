# Fleet Drishti — Backend API Integration

## Base URL

```text
http://127.0.0.1:8000
```

---

## Authentication

### Login

```http
POST /auth/login
```

Request:

```json
{
  "email": "admin@citylens.com",
  "password": "admin123"
}
```

The response returns an access token.

For protected endpoints, send:

```text
Authorization: Bearer <access_token>
```

---

## M5 → M4: Event Detection

M5 sends each AI detection to the backend.

### Create Event

```http
POST /events
```

Request:

```json
{
  "type": "road_defect",
  "subtype": "pothole",
  "confidence": 0.88,
  "timestamp": "2026-09-12T18:35:00",
  "gps": {
    "lat": 19.0761,
    "lng": 72.8778
  },
  "bus_id": "BUS_UUID",
  "route_id": "ROUTE_UUID",
  "camera_id": "CAMERA_UUID"
}
```

Required fields:

- `type`
- `subtype`
- `confidence`
- `timestamp`
- `gps.lat`
- `gps.lng`
- `bus_id`

Optional fields:

- `route_id`
- `camera_id`

`confidence` must be between `0.0` and `1.0`.

After receiving an event, the backend automatically creates a new persistent Issue or attaches the event to an existing nearby Issue.

---

## M3: Events

### Get Events

```http
GET /events
```

Optional query parameters:

```text
skip=0
limit=100
```

### Get One Event

```http
GET /events/{event_id}
```

Event data contains:

```text
id
type
subtype
confidence
lat
lng
timestamp
bus_id
route_id
camera_id
issue_id
created_at
```

`issue_id` links the detection to its persistent Issue.

---

## M3: Issues

### Get Issues

```http
GET /issues
```

### Get One Issue

```http
GET /issues/{issue_id}
```

Issue data contains:

```text
id
type
subtype
lat
lng
severity
priority
status
first_seen
last_seen
created_at
```

### Update Issue Status

```http
PATCH /issues/{issue_id}/status
```

Request:

```json
{
  "status": "acknowledged"
}
```

---

## Evidence

### Create Evidence

```http
POST /evidence
```

Request:

```json
{
  "event_id": "EVENT_UUID",
  "frame_path": "path/to/frame.jpg",
  "video_path": "path/to/video.mp4",
  "timestamp": "2026-09-12T18:35:00",
  "gps": {
    "lat": 19.0761,
    "lng": 72.8778
  },
  "bus_id": "BUS_UUID",
  "route_id": "ROUTE_UUID",
  "confidence": 0.88
}
```

Optional fields:

- `frame_path`
- `video_path`
- `route_id`

### Get Evidence

```http
GET /evidence
```

```http
GET /evidence/{evidence_id}
```

---

## Citizen Reports

### Submit Report

```http
POST /citizen-reports
```

Request:

```json
{
  "description": "Large pothole near junction",
  "photo_path": "path/to/photo.jpg",
  "video_path": null,
  "timestamp": "2026-09-12T18:35:00",
  "gps": {
    "lat": 19.0761,
    "lng": 72.8778
  }
}
```

Optional fields:

- `description`
- `photo_path`
- `video_path`

### Get Reports

```http
GET /citizen-reports
```

---

## Fleet

### Get Buses

```http
GET /buses
```

### Get Routes

```http
GET /routes
```

These endpoints return the buses and routes available to the frontend.

---

## Analytics

### Overview

```http
GET /analytics
```

### Defects

```http
GET /analytics/defects
```

### Congestion

```http
GET /analytics/congestion
```

### Routes

```http
GET /analytics/routes
```

### Coverage

```http
GET /analytics/coverage
```

---

## Integration Flow

```text
M1 / M5
   |
   | POST /events
   v
Backend Event
   |
   v
Issue Fusion
   |
   +--> Existing nearby Issue
   |       |
   |       +--> Attach Event
   |
   +--> No matching Issue
           |
           +--> Create Issue
   |
   v
M3 Frontend
   |
   +--> GET /events
   +--> GET /issues
   +--> GET /analytics
   |
   v
Authority
   |
   +--> PATCH /issues/{issue_id}/status
```

---

## Important IDs

The backend uses IDs for:

```text
bus_id
route_id
camera_id
event_id
issue_id
```

M5 should use the actual bus, route, and camera IDs provided by the backend.

---

## Prototype Notes

- Event confidence must be between `0.0` and `1.0`.
- Events contain GPS coordinates and timestamps.
- Repeated observations of the same defect can be fused into one persistent Issue.
- Current Issue matching uses the same type/subtype and an approximate 50-meter distance threshold.
- Protected endpoints require authentication.