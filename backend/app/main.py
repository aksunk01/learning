from fastapi import FastAPI
from app.db.database import engine
from sqlalchemy import text
from app.api import health
from app.api.v1 import users


app = FastAPI(
    title="AI Academic Assistant API",
    version = "0.1.0"
)

app.include_router(users.router, prefix="/api/v1")
app.include_router(health.router)


@app.get("/health/database")
def database_health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {
            "database": "connected"
        }
    
    except Exception as e:
        return {
            "database": "disconnected",
            "error": str(e)
        }