from fastapi import APIRouter, Depends, status
from supabase import Client

from database import get_supabase_client
from models.auth import (
    SignupRequest,
    LoginRequest,
    AuthResponse,
    LogoutResponse,
    LogoutData,
    CurrentUserResponse,
    User,
)
from services.auth_service import AuthService, get_current_user


router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="User signup",
    description="Register a new user account with email and password",
)
async def signup(
    request: SignupRequest, supabase: Client = Depends(get_supabase_client)
) -> AuthResponse:
    try:
        auth_service = AuthService(supabase)
        auth_data = await auth_service.signup(request)

        return AuthResponse(success=True, data=auth_data, error=None)
    except Exception as e:
        return AuthResponse(success=False, data=None, error=str(e))


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="User login",
    description="Authenticate user and create session",
)
async def login(
    request: LoginRequest, supabase: Client = Depends(get_supabase_client)
) -> AuthResponse:
    try:
        auth_service = AuthService(supabase)
        auth_data = await auth_service.login(request)

        return AuthResponse(success=True, data=auth_data, error=None)
    except Exception as e:
        return AuthResponse(success=False, data=None, error=str(e))


@router.post(
    "/logout",
    response_model=LogoutResponse,
    status_code=status.HTTP_200_OK,
    summary="User logout",
    description="Logout user and invalidate session",
)
async def logout(current_user: User = Depends(get_current_user)) -> LogoutResponse:
    try:
        # Note: Token validation happens via get_current_user dependency
        # For MVP, we return success as token will expire naturally (30 min)
        # Client-side will clear localStorage token
        result = {"message": "Successfully logged out"}

        return LogoutResponse(
            success=True, data=LogoutData(message=result["message"]), error=None
        )
    except Exception as e:
        return LogoutResponse(success=False, data=None, error=str(e))


@router.get(
    "/me",
    response_model=CurrentUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user",
    description="Get current authenticated user information",
)
async def get_me(current_user: User = Depends(get_current_user)) -> CurrentUserResponse:
    try:
        return CurrentUserResponse(success=True, data=current_user, error=None)
    except Exception as e:
        return CurrentUserResponse(success=False, data=None, error=str(e))
