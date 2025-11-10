from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import RedirectResponse
from supabase import Client
from uuid import UUID, uuid4
from typing import Annotated
import logging
from database import get_supabase_client
from services.auth_service import get_current_user
from models.auth import User
from models.file import FileMetadata, FileListResponse, FileUploadResponse
from services.file_service import FileService
from services.storage_service import StorageService

router = APIRouter(prefix="/files", tags=["files"])
logger = logging.getLogger(__name__)


@router.post("/upload", response_model=FileUploadResponse, status_code=201)
async def upload_file(
    file: Annotated[UploadFile, File()],
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    file_service = FileService(supabase)
    storage_service = StorageService(supabase)

    try:
        # Validate file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        try:
            file_service.validate_file_size(file_size)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Sanitize filename
        try:
            sanitized_filename = file_service.sanitize_filename(
                file.filename or "untitled"
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Check for duplicate filename
        existing_file = await file_service.check_duplicate_filename(
            user_id=UUID(current_user.id), filename=sanitized_filename
        )
        if existing_file:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "File with this name already exists",
                    "existing_file": {
                        "id": existing_file["id"],
                        "filename": existing_file["filename"],
                        "file_size": existing_file["file_size"],
                        "uploaded_at": existing_file["uploaded_at"],
                    },
                },
            )

        # Uploads to Supabase Storage
        file_id = uuid4()
        storage_path = file_service.generate_storage_path(
            user_id=UUID(current_user.id),
            file_id=file_id,
            filename=sanitized_filename,
        )
        file_content = await file.read()
        await storage_service.upload_file(
            file_path=storage_path,
            file_data=file_content,
            content_type=file.content_type,
        )

        # Creates metadata record
        file_metadata = await file_service.create_file_metadata(
            user_id=UUID(current_user.id),
            filename=sanitized_filename,
            file_size=file_size,
            storage_path=storage_path,
        )

        # TODO: Trigger async thumbnail generation for images

        return FileUploadResponse(
            file=FileMetadata(**file_metadata), message="File uploaded successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Internal server error during file upload"
        )


@router.get("", response_model=FileListResponse)
async def list_files(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("uploaded_at", description="Sort field: name, date, size"),
    sort_order: str = Query("desc", description="Sort order: asc, desc"),
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    file_service = FileService(supabase)

    try:
        files, total_count = await file_service.list_user_files(
            user_id=UUID(current_user.id),
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        total_pages = (
            (total_count + page_size - 1) // page_size if total_count > 0 else 0
        )
        file_metadata_list = [FileMetadata(**f) for f in files]

        return FileListResponse(
            files=file_metadata_list,
            total=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Internal server error while listing files"
        )


@router.delete("/{file_id}", status_code=204)
async def delete_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    file_service = FileService(supabase)
    storage_service = StorageService(supabase)

    try:
        # Verify ownership
        file_metadata = await file_service.get_file_metadata(
            file_id=file_id, user_id=UUID(current_user.id)
        )
        if not file_metadata:
            raise HTTPException(status_code=404, detail="File not found")

        # Delete from storage
        storage_path = file_metadata["storage_path"]
        try:
            await storage_service.delete_file(storage_path)
        except Exception as e:
            logger.error(f"Error deleting file from storage: {str(e)}")

        # Delete thumbnail
        if file_metadata.get("has_thumbnail"):
            thumbnail_path = storage_path.rsplit("/", 1)[0] + "/thumbnail.webp"
            try:
                await storage_service.delete_file(thumbnail_path)
            except Exception as e:
                logger.error(f"Error deleting thumbnail: {str(e)}")

        # Delete metadata
        await file_service.delete_file_metadata(
            file_id=file_id, user_id=UUID(current_user.id)
        )

        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Internal server error during file deletion"
        )


@router.get("/{file_id}/download")
async def download_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    file_service = FileService(supabase)
    storage_service = StorageService(supabase)

    try:
        # Verify ownership
        file_metadata = await file_service.get_file_metadata(
            file_id=file_id, user_id=UUID(current_user.id)
        )
        if not file_metadata:
            raise HTTPException(status_code=404, detail="File not found")

        # Generate pre-signed URL
        signed_url = await storage_service.generate_signed_url(
            file_path=file_metadata["storage_path"],
            expiry_seconds=3600,  # 1 hour
        )
        return RedirectResponse(url=signed_url)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating download URL: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Internal server error during download"
        )
