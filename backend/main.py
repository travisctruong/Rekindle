from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session
import httpx

from apple_music.auth import generate_developer_token
from database.database import Base, engine, get_db
from models.song import Song

Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def main():
    return {"message": "Hello World"}

@app.get("/songs")
def get_songs(db: Session = Depends(get_db)):
    songs = db.query(Song).all()
    return songs

@app.get("/test-token")
def test_token():
    token = generate_developer_token()

    return {
        "token": token
    }

@app.get("/test-apple")
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