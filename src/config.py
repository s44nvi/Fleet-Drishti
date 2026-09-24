import os


# Bus / camera identity
BUS_ID = os.getenv("BUS_ID", "fff745f2-138e-47e2-a9dd-b7dd43e13621")
ROUTE_ID = os.getenv("ROUTE_ID", "76322705-b364-4cc1-9e0f-d2182c755856")
CAMERA_ID = os.getenv("CAMERA_ID", "783ecb97-91f5-414a-ab4d-3ac2b930f4a5")

# M4 backend
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

# Video processing
FRAME_SAMPLE_RATE = int(os.getenv("FRAME_SAMPLE_RATE", "5"))

# Detector mode
# "mock" keeps the pipeline runnable without model weights or a GPU
# (local dev / CI). "yolo" loads real YOLO weights from disk.
DETECTOR_MODE = os.getenv("DETECTOR_MODE", "mock")

# Road-defect model
ROAD_DEFECT_MODEL_PATH = os.getenv(
    "ROAD_DEFECT_MODEL_PATH",
    "models/road_defect_yolov8.pt",
)
ROAD_DEFECT_CONFIDENCE = float(
    os.getenv("ROAD_DEFECT_CONFIDENCE", "0.35")
)

# Vehicle / density model
VEHICLE_MODEL_PATH = os.getenv("VEHICLE_MODEL_PATH", "yolov8n.pt")
VEHICLE_CONFIDENCE = float(os.getenv("VEHICLE_CONFIDENCE", "0.40"))

# Rolling traffic-density signal
DENSITY_WINDOW_SECONDS = float(
    os.getenv("DENSITY_WINDOW_SECONDS", "10.0")
)
DENSITY_MODERATE_COUNT = float(
    os.getenv("DENSITY_MODERATE_COUNT", "6")
)
DENSITY_HEAVY_COUNT = float(os.getenv("DENSITY_HEAVY_COUNT", "12"))
DENSITY_MIN_GAP_SECONDS = float(
    os.getenv("DENSITY_MIN_GAP_SECONDS", "30.0")
)

# Pedestrian safety
PEDESTRIAN_MODEL_PATH = os.getenv("PEDESTRIAN_MODEL_PATH", "yolov8n.pt")
PEDESTRIAN_CONFIDENCE = float(
    os.getenv("PEDESTRIAN_CONFIDENCE", "0.40")
)

# The bus path: the middle of the frame, below the horizon. A pedestrian
# inside this zone is in front of the bus rather than on the footpath.
HAZARD_ZONE_LEFT = float(os.getenv("HAZARD_ZONE_LEFT", "0.25"))
HAZARD_ZONE_RIGHT = float(os.getenv("HAZARD_ZONE_RIGHT", "0.75"))
HAZARD_ZONE_TOP = float(os.getenv("HAZARD_ZONE_TOP", "0.45"))

# A person box this tall relative to the frame is very close to the bus.
HAZARD_CLOSE_HEIGHT_RATIO = float(
    os.getenv("HAZARD_CLOSE_HEIGHT_RATIO", "0.45")
)
HAZARD_GROUP_SIZE = int(os.getenv("HAZARD_GROUP_SIZE", "3"))
HAZARD_MIN_GAP_SECONDS = float(
    os.getenv("HAZARD_MIN_GAP_SECONDS", "5.0")
)

# Vehicle tracking (incidents)
TRACKER_IOU_THRESHOLD = float(
    os.getenv("TRACKER_IOU_THRESHOLD", "0.30")
)
TRACKER_MAX_AGE_SECONDS = float(
    os.getenv("TRACKER_MAX_AGE_SECONDS", "2.0")
)

# Incident heuristics
# Speed is measured as box-centre travel per second, as a fraction of the
# frame diagonal, so it does not depend on camera resolution.
RASH_SPEED_RATIO = float(os.getenv("RASH_SPEED_RATIO", "0.35"))
RASH_DIRECTION_CHANGES = int(
    os.getenv("RASH_DIRECTION_CHANGES", "3")
)
COLLISION_IOU = float(os.getenv("COLLISION_IOU", "0.15"))
INCIDENT_MIN_GAP_SECONDS = float(
    os.getenv("INCIDENT_MIN_GAP_SECONDS", "10.0")
)

# ANPR (number-plate reading)
# "mock" needs no OCR engine installed; "easyocr" reads real plates.
ANPR_MODE = os.getenv("ANPR_MODE", "mock")
ANPR_LANGUAGES = os.getenv("ANPR_LANGUAGES", "en").split(",")
ANPR_MIN_CONFIDENCE = float(os.getenv("ANPR_MIN_CONFIDENCE", "0.30"))
ANPR_USE_GPU = os.getenv("ANPR_USE_GPU", "false").lower() == "true"
