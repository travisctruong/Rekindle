# from fastapi import APIRouter
# from app.services.music_service import AppleMusicClient

# router = APIRouter(prefix="/api/apple-music")

# client = AppleMusicClient()


# @router.get("/songs")
# async def get_songs():
#     return await client.get_library_songs(
#         developer_token="YOUR_DEVELOPER_TOKEN",
#         user_token="USER_TOKEN"
#     )

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.database import get_db
from models.song import Song

router = APIRouter()


@router.get("/songs")
def get_songs(db: Session = Depends(get_db)):
    return db.query(Song).all()