from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import apple_music, songs

from database.database import Base, engine


app = FastAPI()

app.include_router(apple_music.router)
app.include_router(songs.router)

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def main():
    return {"message": "Rekindle API"}
