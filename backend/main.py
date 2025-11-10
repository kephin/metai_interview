from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
import os

from routers import auth

settings = get_settings()

app = FastAPI(
    title="File Management API",
    description="MetAI Full-Stack Interview - File Management System",
    version="0.1.0",
)

# Configure CORS
allowed_origins_str = os.getenv("CORS_ORIGINS", "").split(",")
allowed_origins = [origin.strip() for origin in allowed_origins_str if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "healthy", "environment": settings}


app.include_router(auth.router)
