from fastapi import FastAPI
from app.db.database import engine
from sqlalchemy import text
from app.api import health, auth
from app.api.v1 import users, courses, course_materials, rag, assignments, dashboard


app = FastAPI(
    title="AI Academic Assistant API",
    version = "0.1.0"
)

app.include_router(users.router, prefix="/api/v1")
app.include_router(health.router)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(courses.router, prefix="/api/v1")
app.include_router(course_materials.router, prefix="/api/v1")
app.include_router(rag.router, prefix="/api/v1")
app.include_router(assignments.router, prefix="/api/v1")
app.include_router(assignments.all_assignments_router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")


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