from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


# ---------- shared ----------

class GPS(BaseModel):
    lat: float
    lng: float


# ---------- Bus ----------

class BusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    bus_code: str
    route_id: Optional[str] = None
    created_at: datetime


# ---------- Route ----------

class RouteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    route_code: str
    name: Optional[str] = None
    created_at: datetime


# ---------- Event ----------

class EventCreate(BaseModel):
    """
    This is the exact payload M5 must send to POST /events.
    type/subtype/confidence/timestamp/gps/bus_id/route_id/camera_id
    are the fields the document specifies an event must carry.
    """
    type: str = Field(..., examples=["road_defect"])
    subtype: str = Field(..., examples=["pothole"])
    confidence: float = Field(..., ge=0.0, le=1.0)
    timestamp: datetime
    gps: GPS
    bus_id: str
    route_id: Optional[str] = None
    camera_id: Optional[str] = None


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    subtype: str
    confidence: float
    lat: float
    lng: float
    timestamp: datetime
    bus_id: str
    route_id: Optional[str] = None
    camera_id: Optional[str] = None
    issue_id: Optional[str] = None
    created_at: datetime


# ---------- Issue ----------

class IssueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    subtype: str
    lat: float
    lng: float
    severity: Optional[str] = None
    priority: Optional[float] = None
    confidence: float = 0.0
    status: str
    first_seen: datetime
    last_seen: datetime
    created_at: datetime


class IssueStatusUpdate(BaseModel):
    status: str = Field(
        ...,
        examples=["acknowledged"]
    )


# ---------- Evidence ----------

class EvidenceCreate(BaseModel):
    event_id: str
    frame_path: Optional[str] = None
    video_path: Optional[str] = None
    timestamp: datetime
    gps: GPS
    bus_id: str
    route_id: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)


class EvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_id: str
    frame_path: Optional[str] = None
    video_path: Optional[str] = None
    timestamp: datetime
    lat: float
    lng: float
    bus_id: str
    route_id: Optional[str] = None
    confidence: float
    created_at: datetime


# ---------- Citizen Reports ----------

class CitizenReportCreate(BaseModel):
    description: Optional[str] = None
    photo_path: Optional[str] = None
    video_path: Optional[str] = None
    timestamp: datetime
    gps: GPS


class CitizenReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    description: Optional[str] = None
    photo_path: Optional[str] = None
    video_path: Optional[str] = None
    timestamp: datetime
    lat: float
    lng: float
    status: str
    matched_issue_id: Optional[str] = None
    created_at: datetime