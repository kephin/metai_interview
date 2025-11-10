from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from uuid import UUID
from typing import Optional


class FileMetadata(BaseModel):
    id: UUID
    user_id: UUID
    filename: str = Field(..., max_length=255)
    file_size: int = Field(..., gt=0, le=52428800)  # 50MB max
    storage_path: str
    thumbnail_url: Optional[str] = None
    has_thumbnail: bool = False
    uploaded_at: datetime

    class Config:
        from_attributes = True


class FileUploadRequest(BaseModel):
    filename: str = Field(..., max_length=255)

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, v: str) -> str:
        # Sanitize filename (remove path traversal, control chars)
        import re

        if re.search(r'[<>"\'`\n\r\t\0/\\]', v):
            raise ValueError("Filename contains invalid characters")
        if ".." in v:
            raise ValueError("Filename cannot contain path traversal")
        return v


class FileListResponse(BaseModel):
    files: list[FileMetadata]
    total: int
    page: int
    page_size: int
    total_pages: int


class FileUploadResponse(BaseModel):
    file: FileMetadata
    message: str = "File uploaded successfully"


class ErrorResponse(BaseModel):
    success: bool = False
    error: dict
    data: None = None
