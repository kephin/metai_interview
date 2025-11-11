from io import BytesIO
from PIL import Image
import logging

logger = logging.getLogger(__name__)

THUMBNAIL_SIZE = (100, 100)
THUMBNAIL_FORMAT = "WebP"
THUMBNAIL_BACKGROUND_COLOR = (255, 255, 255)


async def generate_thumbnail(image_bytes: bytes) -> bytes:
    try:
        image = Image.open(BytesIO(image_bytes))

        # Convert to RGB if necessary (handles RGBA, grayscale, etc.)
        if image.mode not in ("RGB", "L"):
            if image.mode == "RGBA":
                background = Image.new("RGB", image.size, THUMBNAIL_BACKGROUND_COLOR)
                background.paste(image, mask=image.split()[3])
                image = background
            else:
                image = image.convert("RGB")

        # Calculate aspect ratio preserving dimensions
        image.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)

        # Create white background canvas
        canvas = Image.new("RGB", THUMBNAIL_SIZE, THUMBNAIL_BACKGROUND_COLOR)

        # Center the thumbnail on the canvas
        offset_x = (THUMBNAIL_SIZE[0] - image.size[0]) // 2
        offset_y = (THUMBNAIL_SIZE[1] - image.size[1]) // 2
        canvas.paste(image, (offset_x, offset_y))

        # Save to bytes buffer as WebP
        buffer = BytesIO()
        canvas.save(buffer, format=THUMBNAIL_FORMAT, quality=85)
        buffer.seek(0)

        return buffer.getvalue()

    except Exception as e:
        logger.error(f"Failed to generate thumbnail: {str(e)}")
        raise
