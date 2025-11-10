from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (min 8 chars)")

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """
        Validate password meets requirements:
        - At least 8 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one number
        """
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class User(BaseModel):
    id: str = Field(..., description="User UUID")
    email: str = Field(..., description="User email address")
    created_at: datetime = Field(..., description="Account creation timestamp")

    class Config:
        from_attributes = True


class AuthData(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    user: User = Field(..., description="User information")


class AuthResponse(BaseModel):
    success: bool = Field(default=True, description="Operation success status")
    data: Optional[AuthData] = Field(None, description="Authentication data")
    error: Optional[str] = Field(None, description="Error message if failed")


class LogoutData(BaseModel):
    message: str = Field(..., description="Logout confirmation message")


class LogoutResponse(BaseModel):
    success: bool = Field(default=True, description="Operation success status")
    data: Optional[LogoutData] = Field(None, description="Logout data")
    error: Optional[str] = Field(None, description="Error message if failed")


class CurrentUserResponse(BaseModel):
    success: bool = Field(default=True, description="Operation success status")
    data: Optional[User] = Field(None, description="Current user data")
    error: Optional[str] = Field(None, description="Error message if failed")
