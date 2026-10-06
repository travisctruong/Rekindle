from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.database import get_db
import httpx

from apple_music.auth import generate_developer_token
from services.apple_music_service import AppleMusicService


router = APIRouter(prefix="/api/apple-music")

music_user_token: str | None = None

class MusicUserToken(BaseModel):
    music_user_token: str  

@router.get("/test")
async def test_apple():
    """
    Test gathering a specific song 
    """
    token = generate_developer_token()

    headers = {
        "Authorization": f"Bearer {token}"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.music.apple.com/v1/catalog/us/songs/203709340",
            headers=headers
        )

    return {
        "status": response.status_code,
        "data": response.json()
    }

@router.get("/developer-token")
def get_developer_token():
    """
    Obtain developer token
    """
    return {
        "token": generate_developer_token()
    }

@router.post("/connect")
def connect_apple_music(data: MusicUserToken):
    """
    Grab User token - confirmation of connection
    """
    global music_user_token
    music_user_token = data.music_user_token
    return {"message": "Received music user token"}

@router.get("/songs")
async def get_apple_music_songs(db: Session = Depends(get_db)):
    """
    Grab User's music
    """
    if not music_user_token:
        raise HTTPException(status_code=400, detail="Connect Apple Music first")
    try:
        count = await AppleMusicService(db).fetch_and_store_songs(
            music_user_token=music_user_token,
        )
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=504,
            detail="Apple Music API timed out; retry the request later",
        ) from exc
    except httpx.HTTPStatusError as exc:
        status_code = 429 if exc.response.status_code == 429 else 502
        detail = (
            "Apple Music rate limit reached; retry the request later"
            if status_code == 429
            else "Apple Music API request failed"
        )
        raise HTTPException(status_code=status_code, detail=detail) from exc
    return {"stored": count}