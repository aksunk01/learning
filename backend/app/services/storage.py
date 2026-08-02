from minio import Minio
from app.core.config import settings

minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ROOT_USER,
    secret_key=settings.MINIO_ROOT_PASSWORD,
    secure=False
)


def check_minio():
    try:
        minio_client.list_buckets()
        return "ok"
    except Exception:
        return "error"