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

            logger.info(f"Successfully uploaded file to {file_path}")
            return response
        except Exception as e:
            logger.error(f"Failed to upload file to {file_path}: {str(e)}")
            raise

    async def delete_file(self, file_path: str) -> None:
        try:
            self.supabase.storage.from_(self.bucket_name).remove([file_path])
            logger.info(f"Successfully deleted file at {file_path}")
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

            logger.error(f"Unexpected response format for signed URL: {response}")
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
