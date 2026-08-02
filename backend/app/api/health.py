from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.services.redis import check_redis
from app.services.storage import check_minio

from app.db.dependencies import get_db



router = APIRouter()

@router.get("/health")
def health(db: Session = Depends(get_db)):
    
    database_status = "unknown"

    try:
        db.execute(text("SELECT 1"))
        database_status = "ok"
    except Exception as e:
        database_status = "error"

    redis_status = check_redis()

    minio_status = check_minio()

    return{
        "status":"ok",
        "database": database_status,
        "redis": redis_status,
        "storage": minio_status
    }