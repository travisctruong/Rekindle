import { useState } from "react";

function AppleMusicConnect() {
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState("");

    const connectAppleMusic = async () => {
        setError("");
        setConnected(false);

        try {
            // Get Developer Token from FastAPI
            const response = await fetch(
                "http://localhost:8000/api/apple-music/developer-token"
            );

            const { token } = await response.json();

            // Configure MusicKit
            await MusicKit.configure({
                developerToken: token,
                app: {
                    name: "Rekindle",
                    build: "1.0.0"
                }
            });

            const music = MusicKit.getInstance();

            // Ask user to authorize Apple Music
            await music.authorize();

            // Music User Token
            const musicUserToken = music.musicUserToken;

            const connectResponse = await fetch("http://localhost:8000/api/apple-music/connect", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    music_user_token: musicUserToken
                })
            });

            if (!connectResponse.ok) {
                const details = await connectResponse.json();
                throw new Error(details.detail || "Failed to connect Apple Music");
            }

            setConnected(true);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Failed to connect Apple Music");
        }
    };

    return (
        <>
            <button onClick={connectAppleMusic}>
                {connected ? "Apple Music Connected" : "Connect Apple Music"}
            </button>
            {error && <p role="alert">{error}</p>}
        </>
    );
}

export default AppleMusicConnect;