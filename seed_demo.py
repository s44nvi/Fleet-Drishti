from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models.core import (
    Bus,
    Route,
    Camera,
    Event,
    Issue,
    CitizenReport,
)
from app.services.issue_service import process_event_for_issue


# -------------------------------------------------------------------
# Demo configuration
# -------------------------------------------------------------------

DEMO_BUSES = [
    {
        "bus_code": "BUS-014",
        "route_code": "R-22",
        "route_name": "Andheri - Colaba",
        "camera_code": "CAM-FRONT-014",
    },
    {
        "bus_code": "BUS-027",
        "route_code": "R-45",
        "route_name": "Bandra - Powai",
        "camera_code": "CAM-FRONT-027",
    },
]


# -------------------------------------------------------------------
# Fleet helpers
# -------------------------------------------------------------------

def get_or_create_route(db, route_code, name):
    route = (
        db.query(Route)
        .filter(Route.route_code == route_code)
        .first()
    )

    if not route:
        route = Route(
            route_code=route_code,
            name=name,
        )
        db.add(route)
        db.flush()

    return route


def get_or_create_bus(db, bus_code, route):
    bus = (
        db.query(Bus)
        .filter(Bus.bus_code == bus_code)
        .first()
    )

    if not bus:
        bus = Bus(
            bus_code=bus_code,
            route_id=route.id,
        )
        db.add(bus)
        db.flush()

    elif bus.route_id != route.id:
        bus.route_id = route.id
        db.flush()

    return bus


def get_or_create_camera(db, camera_code, bus):
    camera = (
        db.query(Camera)
        .filter(Camera.camera_code == camera_code)
        .first()
    )

    if not camera:
        camera = Camera(
            camera_code=camera_code,
            bus_id=bus.id,
        )
        db.add(camera)
        db.flush()

    elif camera.bus_id != bus.id:
        camera.bus_id = bus.id
        db.flush()

    return camera


# -------------------------------------------------------------------
# Event helpers
# -------------------------------------------------------------------

def create_demo_event(
    db,
    bus,
    route,
    camera,
    event_type,
    subtype,
    confidence,
    timestamp,
    lat,
    lng,
):
    event = Event(
        type=event_type,
        subtype=subtype,
        confidence=confidence,
        lat=lat,
        lng=lng,
        timestamp=timestamp,
        bus_id=bus.id,
        route_id=route.id,
        camera_id=camera.id,
    )

    db.add(event)
    db.flush()

    # Let the normal M4 fusion logic process the event.
    process_event_for_issue(db, event)

    return event


# -------------------------------------------------------------------
# Citizen report helper
# -------------------------------------------------------------------

def create_demo_citizen_report(
    db,
    description,
    timestamp,
    lat,
    lng,
    photo_path=None,
):
    report = CitizenReport(
        description=description,
        photo_path=photo_path,
        video_path=None,
        timestamp=timestamp,
        lat=lat,
        lng=lng,
        status="submitted",
        matched_issue_id=None,
    )

    db.add(report)
    db.flush()

    return report


# -------------------------------------------------------------------
# Main seed function
# -------------------------------------------------------------------

def seed_demo_data():
    db = SessionLocal()

    try:
        # -----------------------------------------------------------
        # Buses / Routes / Cameras
        # -----------------------------------------------------------

        fleet = {}

        for item in DEMO_BUSES:
            route = get_or_create_route(
                db,
                item["route_code"],
                item["route_name"],
            )

            bus = get_or_create_bus(
                db,
                item["bus_code"],
                route,
            )

            camera = get_or_create_camera(
                db,
                item["camera_code"],
                bus,
            )

            fleet[item["bus_code"]] = {
                "route": route,
                "bus": bus,
                "camera": camera,
            }

        db.commit()

        bus_014 = fleet["BUS-014"]
        bus_027 = fleet["BUS-027"]

        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # -----------------------------------------------------------
        # ROAD DEFECT DEMO DATA
        # -----------------------------------------------------------
        #
        # We only create these if road-defect demo events do not
        # already exist.
        #
        # This prevents duplicates when the seed is run repeatedly.
        # -----------------------------------------------------------

        has_road_defect_events = (
            db.query(Event)
            .filter(
                Event.type == "road_defect",
                Event.subtype.in_([
                    "pothole",
                    "road_damage",
                    "waterlogging",
                ]),
            )
            .count()
            > 0
        )

        if not has_road_defect_events:

            # -------------------------------------------------------
            # Pothole observed by BUS-014
            # -------------------------------------------------------

            create_demo_event(
                db,
                bus_014["bus"],
                bus_014["route"],
                bus_014["camera"],
                "road_defect",
                "pothole",
                0.93,
                now - timedelta(hours=3),
                19.0760,
                72.8777,
            )

            # -------------------------------------------------------
            # Same pothole observed by BUS-027
            #
            # This should be fused into the same persistent Issue.
            # -------------------------------------------------------

            create_demo_event(
                db,
                bus_027["bus"],
                bus_027["route"],
                bus_027["camera"],
                "road_defect",
                "pothole",
                0.88,
                now - timedelta(hours=2),
                19.0761,
                72.8778,
            )

            # -------------------------------------------------------
            # Separate road damage
            # -------------------------------------------------------

            create_demo_event(
                db,
                bus_014["bus"],
                bus_014["route"],
                bus_014["camera"],
                "road_defect",
                "road_damage",
                0.82,
                now - timedelta(hours=1, minutes=30),
                19.0820,
                72.8850,
            )

            # -------------------------------------------------------
            # Waterlogging
            # -------------------------------------------------------

            create_demo_event(
                db,
                bus_027["bus"],
                bus_027["route"],
                bus_027["camera"],
                "road_defect",
                "waterlogging",
                0.91,
                now - timedelta(hours=1),
                19.0700,
                72.8700,
            )

            db.commit()

            print("Road-defect demo data added.")

        else:
            print("Road-defect demo data already exists. Skipping.")

        # -----------------------------------------------------------
        # TRAFFIC DEMO DATA
        # -----------------------------------------------------------
        #
        # IMPORTANT:
        # Traffic has its own check.
        #
        # This means existing pothole data will NOT prevent traffic
        # demo events from being created.
        # -----------------------------------------------------------

        has_traffic_events = (
            db.query(Event)
            .filter(
                Event.type == "traffic",
                Event.subtype == "traffic_congestion",
            )
            .count()
            > 0
        )

        if not has_traffic_events:

            # -------------------------------------------------------
            # Traffic congestion observed by BUS-014
            # -------------------------------------------------------

            create_demo_event(
                db,
                bus_014["bus"],
                bus_014["route"],
                bus_014["camera"],
                "traffic",
                "traffic_congestion",
                0.89,
                now - timedelta(minutes=45),
                19.0790,
                72.8810,
            )

            # -------------------------------------------------------
            # Traffic congestion observed by BUS-027
            # -------------------------------------------------------

            create_demo_event(
                db,
                bus_027["bus"],
                bus_027["route"],
                bus_027["camera"],
                "traffic",
                "traffic_congestion",
                0.84,
                now - timedelta(minutes=30),
                19.0810,
                72.8830,
            )

            db.commit()

            print("Traffic demo data added.")

        else:
            print("Traffic demo data already exists. Skipping.")

        # -----------------------------------------------------------
        # CITIZEN REPORTS
        # -----------------------------------------------------------

        existing_reports = db.query(CitizenReport).count()

        if existing_reports == 0:

            create_demo_citizen_report(
                db,
                "Large pothole near the road junction.",
                now - timedelta(minutes=50),
                19.0762,
                72.8779,
                "citizen/photos/pothole-01.jpg",
            )

            create_demo_citizen_report(
                db,
                "Water accumulation causing difficulty for vehicles.",
                now - timedelta(minutes=25),
                19.0702,
                72.8702,
                "citizen/photos/waterlogging-01.jpg",
            )

            db.commit()

            print("Citizen-report demo data added.")

        else:
            print("Citizen-report demo data already exists. Skipping.")

        # -----------------------------------------------------------
        # Summary
        # -----------------------------------------------------------

        print("\nDemo data seeded successfully.")

        print("\nFleet:")
        for item in DEMO_BUSES:
            print(
                f"  {item['bus_code']} "
                f"→ {item['route_code']} "
                f"→ {item['camera_code']}"
            )

        print("\nCurrent counts:")
        print(f"  Buses: {db.query(Bus).count()}")
        print(f"  Routes: {db.query(Route).count()}")
        print(f"  Cameras: {db.query(Camera).count()}")
        print(f"  Events: {db.query(Event).count()}")
        print(f"  Issues: {db.query(Issue).count()}")
        print(f"  Citizen Reports: {db.query(CitizenReport).count()}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()