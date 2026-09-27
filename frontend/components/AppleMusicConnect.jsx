import { useState } from "react";

function AppleMusicConnect() {
    const [connected, setConnected] = useState(false);

    const connectAppleMusic = async () => {
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

        console.log("Music User Token:", musicUserToken);

        setConnected(true);

        await fetch("http://localhost:8000/api/apple-music/connect", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                music_user_token: musicUserToken
            })
        });
    };

    return (
        <button onClick={connectAppleMusic}>
            {connected ? "Apple Music Connected" : "Connect Apple Music"}
        </button>
    );
}

export default AppleMusicConnect;