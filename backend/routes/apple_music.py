from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.database import get_db
import httpx
import jwt

from apple_music.auth import generate_developer_token
from config import SESSION_SECRET
from models.user import User
from services.apple_music_service import AppleMusicService
from services.playlists import fetch_apple_playlists, fetch_user_playlists


router = APIRouter(prefix="/api/apple-music")

COOKIE_NAME = "rekindle_session"
COOKIE_MAX_AGE = 60 * 60 * 24 * 30


class MusicUserToken(BaseModel):
    music_user_token: str


def get_user_id(request: Request) -> int | None:
    """
    Read the user id from the signed session cookie (no database lookup)
    """
    cookie = request.cookies.get(COOKIE_NAME)
    if not cookie:
        return None
    try:
        return int(jwt.decode(cookie, SESSION_SECRET, algorithms=["HS256"])["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None


def get_music_user_token(request: Request, db: Session = Depends(get_db)) -> str:
    """
    Load the signed-in user's Apple Music token from the database
    """
    user_id = get_user_id(request)
    user = db.get(User, user_id) if user_id else None
    if user is None:
        raise HTTPException(status_code=400, detail="Connect Apple Music first")
    return user.user_token

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
def connect_apple_music(
    data: MusicUserToken, response: Response, db: Session = Depends(get_db)
):
    """
    Save the user's token and start a signed session cookie
    """
    user = db.scalar(select(User).where(User.user_token == data.music_user_token))
    if user is None:
        user = User(user_token=data.music_user_token, name="Test User")
        db.add(user)
        db.commit()

    response.set_cookie(
        COOKIE_NAME,
        jwt.encode({"sub": str(user.id)}, SESSION_SECRET, algorithm="HS256"),
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
    )
    return {"message": "Connected"}

@router.get("/status")
def apple_music_status(request: Request):
    """
    Whether this browser already has a valid session cookie
    """
    return {"connected": get_user_id(request) is not None}

@router.get("/songs")
async def get_apple_music_songs(
    music_user_token: str = Depends(get_music_user_token),
    db: Session = Depends(get_db),
):
    """
    Grab User's music from Apple Music API
    """
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
async def get_apple_music_playlists(
    music_user_token: str = Depends(get_music_user_token),
    db: Session = Depends(get_db),
):
    """
    Grab User's playlists from Apple Music API
    """
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
async def get_recently_added(
    music_user_token: str = Depends(get_music_user_token),
    db: Session = Depends(get_db),
):
    """
    Grab user's 5 most recently added albums
    """
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
    music_user_token: str = Depends(get_music_user_token),
    db: Session = Depends(get_db),
):
    """
    Get all of the user's playlists
    """
    user_playlists = fetch_user_playlists(
        db=db,
        music_user_token=music_user_token,
        limit=None if all_playlists else 6,
    )
    return user_playlists

@router.get("/apple-playlists")
async def get_apple_playlists(
    all_playlists: bool = Query(False, alias="all"),
    music_user_token: str = Depends(get_music_user_token),
    db: Session = Depends(get_db),
):
    """
    Get all of the user's saved Apple Music playlists
    """
    apple_playlists = fetch_apple_playlists(
        db=db,
        music_user_token=music_user_token,
        limit=None if all_playlists else 6,
    )
    return apple_playlists

@router.get("/playlist-data/{id}")
async def get_playlist_data(
    id: str,
    music_user_token: str = Depends(get_music_user_token),
    db: Session = Depends(get_db),
):
    """
    Get data from user's Apple Music playlist by ID
    """
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