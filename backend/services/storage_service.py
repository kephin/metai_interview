from supabase import Client
from typing import BinaryIO, Optional
import logging

logger = logging.getLogger(__name__)


class StorageService:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.bucket_name = "user-files"

    async def upload_file(
        self, file_path: str, file_data: BinaryIO, content_type: Optional[str] = None
    ) -> dict:
        try:
            options = {}
            if content_type:
                options["content-type"] = content_type

            response = self.supabase.storage.from_(self.bucket_name).upload(
                path=file_path, file=file_data, file_options=options
            )

            return response
        except Exception as e:
            logger.error(f"Failed to upload file to {file_path}: {str(e)}")
            raise

    async def delete_file(self, file_path: str) -> None:
        try:
            self.supabase.storage.from_(self.bucket_name).remove([file_path])
        except Exception as e:
            logger.error(f"Failed to delete file at {file_path}: {str(e)}")
            raise

    async def generate_signed_url(
        self, file_path: str, expiry_seconds: int = 3600
    ) -> str:
        try:
            response = self.supabase.storage.from_(self.bucket_name).create_signed_url(
                path=file_path, expires_in=expiry_seconds
            )

            if isinstance(response, dict) and "signedURL" in response:
                return response["signedURL"]

            raise ValueError("Failed to generate signed URL")
        except Exception as e:
            logger.error(f"Failed to generate signed URL for {file_path}: {str(e)}")
            raise

    async def file_exists(self, file_path: str) -> bool:
        try:
            files = self.supabase.storage.from_(self.bucket_name).list(
                path="/".join(file_path.split("/")[:-1])
            )
            filename = file_path.split("/")[-1]
            return any(f.get("name") == filename for f in files)
        except Exception as e:
            logger.error(f"Failed to check if file exists at {file_path}: {str(e)}")
            return False

    async def upload_thumbnail(
        self, user_id: str, file_id: str, thumbnail_data: bytes
    ) -> str:
        thumbnail_path = f"{user_id}/{file_id}/thumbnail.webp"

        response = self.supabase.storage.from_(self.bucket_name).upload(
            path=thumbnail_path,
            file=thumbnail_data,
            file_options={"content-type": "image/webp"},
        )

        return thumbnail_path
