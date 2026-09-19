import time
import jwt

from config import (
    APPLE_TEAM_ID,
    APPLE_KEY_ID,
    APPLE_PRIVATE_KEY_PATH
)


def generate_developer_token():

    with open(APPLE_PRIVATE_KEY_PATH, "r") as file:
        private_key = file.read()

    now = int(time.time())

    payload = {
        "iss": APPLE_TEAM_ID,
        "iat": now,
        "exp": now + (60 * 60 * 24 * 30)
    }

    headers = {
        "alg": "ES256",
        "kid": APPLE_KEY_ID
    }

    token = jwt.encode(
        payload,
        private_key,
        algorithm="ES256",
        headers=headers
    )

    return token