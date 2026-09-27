from fastapi import APIRouter
from pydantic import BaseModel
import httpx

from apple_music.auth import generate_developer_token


router = APIRouter(prefix="/api/apple-music")

class MusicUserToken(BaseModel):
    music_user_token: str

# Obtain developer token
@router.get("/developer-token")
def get_developer_token():
    return {
        "token": generate_developer_token()
    }

@router.get("/test")
async def test_apple():
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

# Grab User token - confirmation of connection
@router.post("/connect")
def connect_apple_music(data: MusicUserToken):
    global music_user_token
    music_user_token = data.music_user_token
    print(music_user_token)
    return {"message": "Received music user token"}


# Grab User's music
@router.get("/songs")
async def get_apple_music_songs():

    developer_token = generate_developer_token()

    headers = {
        "Authorization": f"Bearer {developer_token}",
        "Music-User-Token": music_user_token
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.music.apple.com/v1/me/library/songs",
            headers=headers
        )

    response.raise_for_status()

    return response.json()