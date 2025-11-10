from typing import Optional, TypedDict


class SupabaseUser(TypedDict):
    id: str
    email: str
    created_at: str
    email_confirmed_at: Optional[str]
    last_sign_in_at: Optional[str]
    role: Optional[str]
    updated_at: Optional[str]


class SupabaseAuthResponse(TypedDict):
    user: SupabaseUser
    session: Optional["SupabaseSession"]


class SupabaseSession(TypedDict):
    access_token: str
    token_type: str
    expires_in: int
    expires_at: Optional[int]
    refresh_token: str
    user: SupabaseUser
