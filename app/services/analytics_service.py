from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.core import Event, Issue, Route


def get_overview(db: Session):
    total_events = db.query(func.count(Event.id)).scalar() or 0
    total_issues = db.query(func.count(Issue.id)).scalar() or 0

    unresolved_issues = (
        db.query(func.count(Issue.id))
        .filter(Issue.status == "unresolved")
        .scalar()
        or 0
    )

    return {
        "total_events": total_events,
        "total_issues": total_issues,
        "unresolved_issues": unresolved_issues,
    }


def get_defects(db: Session):
    rows = (
        db.query(
            Issue.subtype,
            func.count(Issue.id).label("count"),
        )
        .group_by(Issue.subtype)
        .all()
    )

    return [
        {
            "subtype": subtype,
            "count": count,
        }
        for subtype, count in rows
    ]


def get_congestion(db: Session):
    rows = (
        db.query(
            Event.subtype,
            func.count(Event.id).label("count"),
        )
        .filter(Event.type == "traffic")
        .group_by(Event.subtype)
        .all()
    )

    return [
        {
            "subtype": subtype,
            "count": count,
        }
        for subtype, count in rows
    ]


def get_routes(db: Session):
    rows = (
        db.query(
            Route.route_code,
            Route.name,
            func.count(Event.id).label("event_count"),
        )
        .outerjoin(Event, Event.route_id == Route.id)
        .group_by(Route.id, Route.route_code, Route.name)
        .all()
    )

    return [
        {
            "route_code": route_code,
            "name": name,
            "event_count": event_count,
        }
        for route_code, name, event_count in rows
    ]


def get_coverage(db: Session):
    bus_count = (
        db.query(func.count(func.distinct(Event.bus_id)))
        .scalar()
        or 0
    )

    route_count = (
        db.query(func.count(func.distinct(Event.route_id)))
        .filter(Event.route_id.isnot(None))
        .scalar()
        or 0
    )

    return {
        "buses_with_events": bus_count,
        "routes_with_events": route_count,
    }