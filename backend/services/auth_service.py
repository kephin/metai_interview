from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client

from database import get_supabase_client
from models.auth import User, AuthData, SignupRequest, LoginRequest


security = HTTPBearer()


class AuthService:
    def __init__(self, supabase: Client = Depends(get_supabase_client)):
        self.supabase = supabase

    async def signup(self, request: SignupRequest) -> AuthData:
        try:
            response = self.supabase.auth.sign_up(
                {"email": request.email, "password": request.password}
            )

            if not response.user or not response.session:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to create user account",
                )

            user = User(
                id=response.user.id,
                email=response.user.email,
                created_at=response.user.created_at,
            )

            return AuthData(access_token=response.session.access_token, user=user)

        except Exception as e:
            error_message = str(e).lower()

            if (
                "already registered" in error_message
                or "already exists" in error_message
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already registered",
                )

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Signup failed: {str(e)}",
            )

    async def login(self, request: LoginRequest) -> AuthData:
        try:
            response = self.supabase.auth.sign_in_with_password(
                {"email": request.email, "password": request.password}
            )

            if not response.user or not response.session:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials",
                )

            user = User(
                id=response.user.id,
                email=response.user.email,
                created_at=response.user.created_at,
            )

            return AuthData(access_token=response.session.access_token, user=user)

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
            )

    async def logout(self, token: str) -> dict:
        try:
            self.supabase.auth.set_session(token, token)
            self.supabase.auth.sign_out()
            return {"message": "Successfully logged out"}

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Logout failed"
            )

    async def get_user_from_token(self, token: str) -> User:
        try:
            response = self.supabase.auth.get_user(token)

            if not response.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                )

            user = User(
                id=response.user.id,
                email=response.user.email,
                created_at=response.user.created_at,
            )

            return user

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client),
) -> User:
    auth_service = AuthService(supabase)
    return await auth_service.get_user_from_token(credentials.credentials)
