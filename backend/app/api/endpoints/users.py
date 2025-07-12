from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=list[dict])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return all users except the one that is currently logged-in.
    """
    rows = (
        db.query(User.id, User.username)
        .filter(User.id != current_user.id)
        .all()
    )
    return [{"id": u.id, "username": u.username} for u in rows]