from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time

app = FastAPI(title="Sentinel – Sensor Intelligence")

# Allow frontend / phone access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================
# IN-MEMORY STORE (PER DEVICE)
# ==========================
LATEST_DATA = {}   # device_id -> data

# ==========================
# ROOT (health check)
# ==========================
@app.get("/")
def root():
    return {
        "project": "Sentinel – Sensor Intelligence",
        "version": "1.0",
        "status": "running"
    }

# ==========================
# INGEST ENDPOINT
# ==========================
@app.post("/ingest")
def ingest(data: dict):
    device_id = data.get("device_id", "default")

    LATEST_DATA[device_id] = {
        "battery": data.get("battery"),
        "wifi": data.get("wifi"),
        "timestamp": time.time()
    }

    return {
        "status": "ingested",
        "device_id": device_id
    }

# ==========================
# BATTERY API
# ==========================
@app.get("/battery")
def battery(device_id: str = "default"):
    if device_id not in LATEST_DATA:
        return {"error": "Battery data not available"}
    return LATEST_DATA[device_id]["battery"]

# ==========================
# WIFI API
# ==========================
@app.get("/wifi")
def wifi(device_id: str = "default"):
    if device_id not in LATEST_DATA:
        return {"error": "WiFi data not available"}
    return LATEST_DATA[device_id]["wifi"]
