import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Float, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Bus(Base):
    """
    Document reference: 'Bus' entity, listed under M4 Database.
    Fields beyond bus_id/route/camera link are a technical implementation
    choice — the document only names the entity, not its columns.
    """
    __tablename__ = "buses"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    bus_code = Column(String, unique=True, nullable=False)
    route_id = Column(
        UUID(as_uuid=False),
        ForeignKey("routes.id"),
        nullable=True
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    route = relationship("Route", back_populates="buses")
    cameras = relationship("Camera", back_populates="bus")
    events = relationship("Event", back_populates="bus")


class Route(Base):
    """Document reference: 'Route' entity."""
    __tablename__ = "routes"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    route_code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    buses = relationship("Bus", back_populates="route")
    events = relationship("Event", back_populates="route")


class Camera(Base):
    """Document reference: 'Camera' entity."""
    __tablename__ = "cameras"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    camera_code = Column(String, unique=True, nullable=False)
    bus_id = Column(
        UUID(as_uuid=False),
        ForeignKey("buses.id"),
        nullable=True
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    bus = relationship("Bus", back_populates="cameras")
    events = relationship("Event", back_populates="camera")


class Event(Base):
    """
    Document reference: 'Event' entity + Event APIs (POST/GET /events).
    """
    __tablename__ = "events"
    __table_args__ = (
        UniqueConstraint("id", name="uq_event_id"),
    )

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)

    type = Column(String, nullable=False)
    subtype = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)

    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False)

    bus_id = Column(
        UUID(as_uuid=False),
        ForeignKey("buses.id"),
        nullable=False
    )
    route_id = Column(
        UUID(as_uuid=False),
        ForeignKey("routes.id"),
        nullable=True
    )
    camera_id = Column(
        UUID(as_uuid=False),
        ForeignKey("cameras.id"),
        nullable=True
    )

    # Links repeated observations to a persistent Issue.
    issue_id = Column(
        UUID(as_uuid=False),
        ForeignKey("issues.id"),
        nullable=True
    )

    created_at = Column(DateTime, default=datetime.utcnow)

    bus = relationship("Bus", back_populates="events")
    route = relationship("Route", back_populates="events")
    camera = relationship("Camera", back_populates="events")
    issue = relationship("Issue", back_populates="events")

    # Evidence attached to this event.
    evidence = relationship("Evidence", back_populates="event")


class Issue(Base):
    """
    Persistent issue created by grouping repeated observations/events.
    M4 owns persistent issue/fusion.
    """
    __tablename__ = "issues"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)

    type = Column(String, nullable=False)
    subtype = Column(String, nullable=False)

    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)

    severity = Column(String, nullable=True)
    priority = Column(Float, nullable=True)

    # Running fused confidence (noisy-OR) that this issue is a real,
    # persistent defect, distinct from `priority` (which factors in
    # severity/age/traffic as well). 0.0 = no confidence yet.
    confidence = Column(Float, nullable=False, default=0.0)

    status = Column(String, nullable=False, default="unresolved")

    first_seen = Column(DateTime, nullable=False)
    last_seen = Column(DateTime, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    events = relationship("Event", back_populates="issue")


class Evidence(Base):
    """
    Evidence associated with an Event.

    M4 stores the evidence reference and metadata.
    """
    __tablename__ = "evidence"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)

    event_id = Column(
        UUID(as_uuid=False),
        ForeignKey("events.id"),
        nullable=False
    )

    # Detection evidence paths/references.
    frame_path = Column(String, nullable=True)
    video_path = Column(String, nullable=True)

    # Evidence metadata required by the team document.
    timestamp = Column(DateTime, nullable=False)

    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)

    bus_id = Column(
        UUID(as_uuid=False),
        ForeignKey("buses.id"),
        nullable=False
    )

    route_id = Column(
        UUID(as_uuid=False),
        ForeignKey("routes.id"),
        nullable=True
    )

    confidence = Column(Float, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="evidence")
    bus = relationship("Bus")
    route = relationship("Route")


class CitizenReport(Base):
    """
    Citizen-submitted report of a road issue.
    """
    __tablename__ = "citizen_reports"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)

    description = Column(String, nullable=True)
    photo_path = Column(String, nullable=True)
    video_path = Column(String, nullable=True)

    timestamp = Column(DateTime, nullable=False)

    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)

    status = Column(String, nullable=False, default="submitted")

    matched_issue_id = Column(
        UUID(as_uuid=False),
        ForeignKey("issues.id"),
        nullable=True
    )

    created_at = Column(DateTime, default=datetime.utcnow)

    matched_issue = relationship("Issue")


class Authority(Base):
    """
    Authority user responsible for managing CityLens issues.
    """
    __tablename__ = "authorities"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)

    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="authority")

    created_at = Column(DateTime, default=datetime.utcnow)