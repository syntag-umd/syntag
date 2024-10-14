from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.tables.user import User
from app.models.schemas import WhoamiResponse

from app.utils import (
    get_user_from_req,
)

router = APIRouter()


@router.get("/whoami", response_model=WhoamiResponse)
async def whoami(
    user: User = Depends(get_user_from_req),
    db: Session = Depends(get_db),
) -> WhoamiResponse:
    return WhoamiResponse(user_uuid=str(user.uuid))
