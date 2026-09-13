import os


# Bus / camera identity
BUS_ID = os.getenv("BUS_ID", "fff745f2-138e-47e2-a9dd-b7dd43e13621")
ROUTE_ID = os.getenv("ROUTE_ID", "76322705-b364-4cc1-9e0f-d2182c755856")
CAMERA_ID = os.getenv("CAMERA_ID", "783ecb97-91f5-414a-ab4d-3ac2b930f4a5")

# M4 backend
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

# Video processing
FRAME_SAMPLE_RATE = int(os.getenv("FRAME_SAMPLE_RATE", "5"))