import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import settings
from app.db.dependencies import get_db
from app.models.semester import Semester
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserResponse, UserUpdate, PasswordChange
from app.core.security import(password_hash, verify_password, create_access_token, get_current_user)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserResponse)
def update_me(
    update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if update.display_name is not None:
        current_user.display_name = update.display_name or None

    if update.dashboard_layout is not None:
        current_user.dashboard_layout = update.dashboard_layout

    if "favorite_semester_id" in update.model_fields_set:
        if update.favorite_semester_id is not None:
            semester = (
                db.query(Semester)
                .filter(
                    Semester.id == update.favorite_semester_id,
                    Semester.user_id == current_user.id,
                )
                .first()
            )

            if semester is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Semester not found",
                )

        current_user.favorite_semester_id = update.favorite_semester_id

    db.commit()
    db.refresh(current_user)

    return current_user

@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    current_user.hashed_password = password_hash(payload.new_password)
    db.commit()

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


def _resolve_magic_login_user(token: str, db: Session) -> User:
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

    return user


@router.get("/magic-login")
def magic_login(token: str, db: Session = Depends(get_db)):
    user = _resolve_magic_login_user(token, db)
    access_token = create_access_token(data={"sub": str(user.id)})

    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/auth/magic-callback#token={access_token}"
    )


@router.get("/magic-token")
def magic_token(token: str, db: Session = Depends(get_db)):
    """JSON sibling of /magic-login for non-browser clients (e.g. a Siri
    Shortcut) that can't follow a redirect's URL fragment - returns the
    access token directly instead of redirecting the frontend to it."""
    user = _resolve_magic_login_user(token, db)
    access_token = create_access_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }