import asyncio
import json
import os
import sqlite3

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
try:
    with open(config_path, "r") as config_file:
        config = json.load(config_file)
    allowed_origins = config.get("allowed_origins", ["*"])
except FileNotFoundError:  # fallback
    allowed_origins = ["*"]

app = FastAPI()


class SensorReading(BaseModel):
    temperature: float
    ph: float
    tds: float


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def init_db():
    with sqlite3.connect("fishtank.db") as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sensor_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                temperature REAL,
                ph REAL,
                tds REAL
            )
            """
        )


def get_db():
    conn = sqlite3.connect("fishtank.db")
    conn.row_factory = sqlite3.Row  # makes SQLite return dictionaries instead of lists
    try:
        yield conn
    finally:
        conn.close()


@app.get("/api/sensors/latest")
def get_latest_item(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="No data available yet")
    return dict(row)


@app.get("/api/sensors/history")
def get_sensor_history(limit: int = 60, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT ?", (limit,)
    )
    rows = cursor.fetchall()
    return [dict(row) for row in rows]


@app.post("/api/sensors")
def add_item(item: SensorReading, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO sensor_data (temperature, ph, tds) VALUES (?, ?, ?)",
        (item.temperature, item.ph, item.tds),
    )
    db.commit()

    return {"message": "Success"}


frontend_dir = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend"
)
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


def prune_old_data():
    # delete readings older than 30 days
    try:
        with sqlite3.connect("fishtank.db") as conn:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM sensor_data WHERE TIMESTAMP <= datetime('now', '-30 days')"
            )
            deleted_rows = cursor.rowcount
            conn.commit()
            if deleted_rows > 0:
                print(f"Pruned {deleted_rows} old records from the database.")
    except Exception as e:
        print(f"Error pruning database: {e}")


async def schedule_pruning():
    # runs once every 24 hours
    while True:
        prune_old_data()
        await asyncio.sleep(86400)


@app.on_event("startup")
async def startup_event():
    init_db()
    asyncio.create_task(schedule_pruning())
