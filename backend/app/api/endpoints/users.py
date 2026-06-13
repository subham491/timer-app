"""
User management endpoints.
"""

from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr, Field

from app.api.deps import CurrentUser
from app.db.connection import DBSession
from app.models import MessageResponse
from app.services import user_service

router = APIRouter()


class UserRoleResponse(BaseModel):
    id: int
    name: str
    label: str
    rank: int


class UserReferenceResponse(BaseModel):
    id: str
    userId: int
    displayName: str
    email: str


class UserResponse(BaseModel):
    id: str
    userId: int
    displayName: str
    email: str
    status: str
    role: UserRoleResponse
    manager: UserReferenceResponse | None
    isSelf: bool
    createdAt: datetime
    updatedAt: datetime
    deletedAt: datetime | None


class UserListResponse(BaseModel):
    items: list[UserResponse]


class UserLookupsResponse(BaseModel):
    roles: list[UserRoleResponse]
    managerCandidates: list[UserReferenceResponse]


class UserCreateRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role_id: int = Field(default=1)
    manager_id: int | None = None


class UserUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    manager_id: int | None = None


class UserRoleChangeRequest(BaseModel):
    role_id: int


@router.get("", response_model=UserListResponse)
def list_users(db: DBSession, user: CurrentUser):
    return user_service.list_users(db, acting_user_id=user["user_id"], acting_role_id=user["role_id"])


@router.get("/lookups", response_model=UserLookupsResponse)
def get_user_lookups(db: DBSession, user: CurrentUser):
    return user_service.get_user_lookups(
        db,
        acting_user_id=user["user_id"],
        acting_role_id=user["role_id"],
    )


@router.post("", response_model=UserResponse, status_code=201)
def create_user(body: UserCreateRequest, db: DBSession, user: CurrentUser):
    return user_service.create_user(
        db,
        acting_user_id=user["user_id"],
        acting_role_id=user["role_id"],
        display_name=body.display_name,
        email=body.email,
        password=body.password,
        role_id=body.role_id,
        manager_id=body.manager_id,
    )


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: str, body: UserUpdateRequest, db: DBSession, user: CurrentUser):
    return user_service.update_user(
        db,
        user_id,
        acting_user_id=user["user_id"],
        acting_role_id=user["role_id"],
        display_name=body.display_name,
        email=body.email,
        manager_id=body.manager_id,
        manager_id_provided="manager_id" in body.model_fields_set,
        email_provided="email" in body.model_fields_set,
    )


@router.patch("/{user_id}/role", response_model=UserResponse)
def change_user_role(user_id: str, body: UserRoleChangeRequest, db: DBSession, user: CurrentUser):
    return user_service.change_role(
        db,
        user_id,
        role_id=body.role_id,
        acting_user_id=user["user_id"],
        acting_role_id=user["role_id"],
    )


@router.delete("/{user_id}", response_model=MessageResponse)
def soft_delete_user(user_id: str, db: DBSession, user: CurrentUser):
    user_service.soft_delete_user(
        db,
        user_id,
        acting_user_id=user["user_id"],
        acting_role_id=user["role_id"],
    )
    return {"message": "User archived and soft deleted successfully."}
