from supabase import Client
from uuid import UUID
from typing import Optional
import re
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 52428800  # 50MB in bytes
MAX_FILENAME_LENGTH = 255
ALLOWED_FILENAME_PATTERN = re.compile(r"^[a-zA-Z0-9._\-\s()]+$")


class FileService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    def sanitize_filename(self, filename: str) -> str:
        if not filename or not filename.strip():
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            return f"untitled_{timestamp}"

        # Remove path components
        filename = filename.split("/")[-1].split("\\")[-1]

        # Check for path traversal
        if ".." in filename:
            raise ValueError("Filename cannot contain path traversal sequences")

        # Check for control characters and script injection
        if re.search(r'[<>"\'`\n\r\t\0]', filename):
            raise ValueError("Filename contains invalid characters")

        # Validate against allowed pattern
        if not ALLOWED_FILENAME_PATTERN.match(filename):
            raise ValueError("Filename contains characters outside allowed pattern")

        # Check filename length
        if len(filename) > MAX_FILENAME_LENGTH:
            raise ValueError(
                f"Filename exceeds maximum length of {MAX_FILENAME_LENGTH} characters"
            )

        return filename

    def validate_file_size(self, file_size: int) -> None:
        if file_size <= 0:
            raise ValueError("File size must be greater than 0")

        if file_size > MAX_FILE_SIZE:
            raise ValueError(
                f"File size exceeds maximum allowed size of {MAX_FILE_SIZE} bytes (50MB)"
            )

    async def check_duplicate_filename(
        self, user_id: UUID, filename: str
    ) -> Optional[dict]:
        try:
            response = (
                self.supabase.table("files")
                .select("*")
                .eq("user_id", str(user_id))
                .eq("filename", filename)
                .execute()
            )

            if response.data and len(response.data) > 0:
                return response.data[0]

            return None
        except Exception as e:
            logger.error(f"Error checking duplicate filename: {str(e)}")
            raise

    async def create_file_metadata(
        self, user_id: UUID, filename: str, file_size: int, storage_path: str
    ) -> dict:
        try:
            file_data = {
                "user_id": str(user_id),
                "filename": filename,
                "file_size": file_size,
                "storage_path": storage_path,
                "has_thumbnail": False,
                "uploaded_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("files").insert(file_data).execute()

            if not response.data or len(response.data) == 0:
                raise ValueError("Failed to create file metadata")

            return response.data[0]
        except Exception as e:
            logger.error(f"Error creating file metadata: {str(e)}")
            raise

    async def get_file_metadata(self, file_id: UUID, user_id: UUID) -> Optional[dict]:
        try:
            response = (
                self.supabase.table("files")
                .select("*")
                .eq("id", str(file_id))
                .eq("user_id", str(user_id))
                .execute()
            )

            if response.data and len(response.data) > 0:
                return response.data[0]

            return None
        except Exception as e:
            logger.error(f"Error getting file metadata: {str(e)}")
            raise

    async def delete_file_metadata(self, file_id: UUID, user_id: UUID) -> bool:
        try:
            response = (
                self.supabase.table("files")
                .delete()
                .eq("id", str(file_id))
                .eq("user_id", str(user_id))
                .execute()
            )

            return True
        except Exception as e:
            logger.error(f"Error deleting file metadata: {str(e)}")
            raise

    async def list_user_files(
        self,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "uploaded_at",
        sort_order: str = "desc",
    ) -> tuple[list[dict], int]:
        try:
            sort_field_map = {
                "name": "filename",
                "date": "uploaded_at",
                "size": "file_size",
                "uploaded_at": "uploaded_at",
                "filename": "filename",
                "file_size": "file_size",
            }

            sort_field = sort_field_map.get(sort_by, "uploaded_at")

            # Get total count
            count_response = (
                self.supabase.table("files")
                .select("id", count="exact")
                .eq("user_id", str(user_id))
                .execute()
            )
            total_count = (
                count_response.count if hasattr(count_response, "count") else 0
            )

            # Get paginated data
            offset = (page - 1) * page_size

            query = self.supabase.table("files").select("*").eq("user_id", str(user_id))

            # Apply sorting
            if sort_order.lower() == "asc":
                query = query.order(sort_field, desc=False)
            else:
                query = query.order(sort_field, desc=True)

            # Apply pagination
            query = query.range(offset, offset + page_size - 1)

            response = query.execute()

            return response.data or [], total_count
        except Exception as e:
            logger.error(f"Error listing user files: {str(e)}")
            raise

    def is_image_file(self, filename: str) -> bool:
        image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
        ext = filename.lower().split(".")[-1] if "." in filename else ""
        return f".{ext}" in image_extensions

    def generate_storage_path(self, user_id: UUID, file_id: UUID, filename: str) -> str:
        return f"{user_id}/{file_id}/{filename}"
