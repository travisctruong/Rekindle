from dataclasses import Field

from pydantic import BaseModel, Field, field_validator


class PlaylistValidation(BaseModel):
    playlist_name: str = Field(min_length=1, max_length=255)
    song_ids: list[int] = Field(min_length=10, max_length=10)
    timezone_offset_minutes: int = Field(ge=-840, le=840)
    timezone_name: str = Field(min_length=1, max_length=64)

    @field_validator("playlist_name")
    @classmethod
    def validate_playlist_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Playlist name cannot be empty")
        return value

    @field_validator("song_ids")
    @classmethod
    def validate_unique_song_ids(cls, value: list[int]) -> list[int]:
        if len(set(value)) != len(value):
            raise ValueError("Playlist songs must be unique")
        return value

    @field_validator("timezone_name")
    @classmethod
    def validate_timezone_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Timezone name cannot be empty")
        return value