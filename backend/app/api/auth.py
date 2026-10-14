import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import settings
from app.db.dependencies import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserResponse
from app.core.security import(password_hash, verify_password, create_access_token, get_current_user)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_create: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_create.email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="email already registered"
        )

    hashed_password = password_hash(user_create.password)

    user = User(
        email=user_create.email,
        hashed_password=hashed_password
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == form_data.username)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(
        form_data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        data={"sub": str(user.id)}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/magic-login")
def magic_login(token: str, db: Session = Depends(get_db)):
    if not settings.MAGIC_LOGIN_TOKEN or not settings.MAGIC_LOGIN_USER_EMAIL:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if not secrets.compare_digest(token, settings.MAGIC_LOGIN_TOKEN):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    user = (
        db.query(User)
        .filter(User.email == settings.MAGIC_LOGIN_USER_EMAIL)
        .first()
    )

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    access_token = create_access_token(data={"sub": str(user.id)})

    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/auth/magic-callback#token={access_token}"
    )