"""
Auth Router
-----------
POST /auth/register - Create a new user account
POST /auth/login     - Authenticate and receive a JWT
GET  /auth/me        - Get the current logged-in user's info
"""
import logging

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

from services.auth import create_access_token, verify_password
from services.document_repo import create_user, get_user_by_email
from services.auth_deps import get_current_user_required

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])

MIN_PASSWORD_LENGTH = 8


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


def _validate_password(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
        )


@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest):
    """Create a new user account and return a JWT."""
    _validate_password(payload.password)

    try:
        user = create_user(email=payload.email.lower(), password=payload.password)
    except ValueError:
        raise HTTPException(status_code=409, detail="Email already registered")
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

    token = create_access_token(user_id=user["id"], email=user["email"])
    return AuthResponse(access_token=token, user=user)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    """Authenticate with email + password and return a JWT."""
    user = get_user_by_email(payload.email.lower())
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user_id=user["id"], email=user["email"])
    return AuthResponse(
        access_token=token,
        user={"id": user["id"], "email": user["email"]}
    )


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user_required)):
    """Get the current logged-in user's info. Requires a valid token."""
    return current_user