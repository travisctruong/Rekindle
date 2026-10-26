from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.database import get_db
import httpx

from apple_music.auth import generate_developer_token
from services.apple_music_service import AppleMusicService
from services.playlists import fetch_apple_playlists, fetch_user_playlists


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
    Grab User's music from Apple Music API
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

@router.get("/playlists")
async def get_apple_music_playlists(db: Session = Depends(get_db)):
    """
    Grab User's playlists from Apple Music API
    """
    if not music_user_token:
        raise HTTPException(status_code=400, detail="Connect Apple Music first")
    try:
        count = await AppleMusicService(db).fetch_and_store_playlists(
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

@router.get("/recently-added")
async def get_recently_added(db: Session = Depends(get_db)):
    """
    Grab user's 10 most recently added albums
    """
    if not music_user_token:
        raise HTTPException(status_code=400, detail="Connect Apple Music first")
    try:
        recently_added = await AppleMusicService(db).fetch_recently_added(
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
    return recently_added

@router.get("/user-playlists")
async def get_user_playlists(
    all_playlists: bool = Query(False, alias="all"),
    db: Session = Depends(get_db),
):
    """
    Get all of the user's playlists
    """
    if not music_user_token:
        raise HTTPException(status_code=400, detail="Connect Apple Music first")
    user_playlists = fetch_user_playlists(
        db=db,
        music_user_token=music_user_token,
        limit=None if all_playlists else 6,
    )
    return user_playlists

@router.get("/apple-playlists")
async def get_apple_playlists(
    all_playlists: bool = Query(False, alias="all"),
    db: Session = Depends(get_db),
):
    """
    Get all of the user's saved Apple Music playlists
    """
    if not music_user_token:
        raise HTTPException(status_code=400, detail="Connect Apple Music first")
    apple_playlists = fetch_apple_playlists(
        db=db,
        music_user_token=music_user_token,
        limit=None if all_playlists else 6,
    )
    return apple_playlists

@router.get("/playlist-data/{id}")
async def get_playlist_data(id: str, db: Session = Depends(get_db)):
    """
    Get data from user's Apple Music playlist by ID
    """
    if not music_user_token:
        raise HTTPException(status_code=400, detail="Connect Apple Music first")
    try:
        playlist_data = await AppleMusicService(db).fetch_playlist_data(
            music_user_token=music_user_token, playlist_id=id
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
    return playlist_data