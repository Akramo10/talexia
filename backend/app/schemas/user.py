from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import AuthProvider

ALLOWED_REGISTER_PLANS = {"trial_3_months", "six_months", "twelve_months"}


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    google_id: Optional[str] = None
    avatar_url: Optional[str] = None
    auth_provider: AuthProvider
    is_active: bool
    is_admin: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)
    full_name: Optional[str] = None
    phone: Optional[str] = Field(default=None, pattern=r"^\+?[0-9\s().-]{7,20}$")
    plan: str = "trial_3_months"

    @field_validator("plan")
    @classmethod
    def validate_plan(cls, value: str) -> str:
        if value not in ALLOWED_REGISTER_PLANS:
            raise ValueError("Plan invalide")
        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str


class GoogleLoginRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
