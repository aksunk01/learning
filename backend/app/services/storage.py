from minio import Minio
from app.core.config import settings
from minio.error import S3Error
from io import BytesIO


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

def ensure_bucket_exists()-> None:
    if not minio_client.bucket_exists(settings.MINIO_BUCKET):
        minio_client.make_bucket(settings.MINIO_BUCKET)

def upload_file(object_name: str, file_data: bytes, content_type: str | None = None) -> None:
    minio_client.put_object(
        settings.MINIO_BUCKET,
        object_name,
        BytesIO(file_data),
        length=len(file_data),
        content_type=content_type or "application/octet-stream",
    )

def download_file(object_name: str) -> bytes:
    try:
        response = minio_client.get_object(settings.MINIO_BUCKET, object_name)
        return response.read()
    finally:
        response.close()
        response.release_conn()

def delete_file(object_name: str) -> None:
    minio_client.remove_object(settings.MINIO_BUCKET, object_name)

def file_exists(object_name: str) -> bool:
    try:
        minio_client.stat_object(settings.MINIO_BUCKET, object_name)
        return True
    except S3Error as e:
        if e.code in ("NoSuchKey", "NoSuchObject", "NotFound"):
            return False
        raise