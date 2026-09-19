# import httpx

# APPLE_MUSIC_URL = "https://api.music.apple.com/v1"

# class AppleMusicClient:

#     async def get_library_songs(self, developer_token: str, user_token: str):
#         headers = {
#             "Authorization": f"Bearer {developer_token}",
#             "Music-User-Token": user_token
#         }

#         async with httpx.AsyncClient() as client:
#             response = await client.get(
#                 f"{APPLE_MUSIC_URL}/me/library/songs",
#                 headers=headers
#             )

#             response.raise_for_status()

#             return response.json()