from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Query,
    BackgroundTasks,
)
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
from services.thumbnail_service import generate_thumbnail

router = APIRouter(prefix="/files", tags=["files"])
logger = logging.getLogger(__name__)


async def _generate_and_upload_thumbnail(
    file_content: bytes,
    file_id: UUID,
    user_id: str,
    storage_service: StorageService,
    file_service: FileService,
) -> None:
    try:
        thumbnail_bytes = await generate_thumbnail(file_content)

        # Upload thumbnail to storage
        thumbnail_path = await storage_service.upload_thumbnail(
            user_id=user_id,
            file_id=str(file_id),
            thumbnail_data=thumbnail_bytes,
        )

        await file_service.update_thumbnail_metadata(
            file_id=file_id,
            has_thumbnail=True,
            thumbnail_url=thumbnail_path,
        )

    except Exception as e:
        await file_service.update_thumbnail_metadata(
            file_id=file_id,
            has_thumbnail=False,
        )


@router.post("/upload", response_model=FileUploadResponse, status_code=201)
async def upload_file(
    file: Annotated[UploadFile, File()],
    background_tasks: BackgroundTasks,
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

        # Create metadata record
        file_metadata = await file_service.create_file_metadata(
            user_id=UUID(current_user.id),
            file_id=file_id,
            filename=sanitized_filename,
            file_size=file_size,
            storage_path=storage_path,
        )

        is_image = file_service.is_image_file(sanitized_filename)
        logger.info(f"File '{sanitized_filename}' is_image: {is_image}")

        if is_image:
            logger.info(
                f"Adding thumbnail generation task to background_tasks for file {file_id}"
            )
            background_tasks.add_task(
                _generate_and_upload_thumbnail,
                file_content=file_content,
                file_id=file_id,
                user_id=current_user.id,
                storage_service=storage_service,
                file_service=file_service,
            )
        else:
            logger.info(
                f"Skipping thumbnail generation for non-image file: {sanitized_filename}"
            )

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
    storage_service = StorageService(supabase)

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

        # Generate pre-signed URLs for thumbnails
        for file in files:
            if file.get("has_thumbnail"):
                thumbnail_path = file.get("thumbnail_url")
                if not thumbnail_path:
                    storage_path = file["storage_path"]
                    thumbnail_path = storage_path.rsplit("/", 1)[0] + "/thumbnail.webp"

                try:
                    signed_url = await storage_service.generate_signed_url(
                        file_path=thumbnail_path,
                        expiry_seconds=3600,  # 1 hour
                    )
                    file["thumbnail_url"] = signed_url
                except Exception as e:
                    logger.error(
                        f"Failed to generate thumbnail URL for file {file['id']}: {str(e)}"
                    )
                    file["thumbnail_url"] = None
            else:
                file["thumbnail_url"] = None

        # Convert to FileMetadata objects
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
        file_metadata = await file_service.get_file_metadata(
            file_id=file_id, user_id=UUID(current_user.id)
        )
        if not file_metadata:
            raise HTTPException(status_code=404, detail="File not found")

        storage_path = file_metadata["storage_path"]
        try:
            await storage_service.delete_file(storage_path)
        except Exception as e:
            logger.error(f"Error deleting file from storage: {str(e)}")

        # Delete thumbnail if it exists
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
        # Get file metadata to verify ownership
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
