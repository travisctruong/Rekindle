import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppleMusicConnect from '../components/AppleMusicConnect'
import MusicPlayer from '../components/MusicPlayer'
import Sidebar from '../components/Sidebar'
import Home from './Home'
import Rekindle, { RekindleAll, RekindleGenre, RekindleSelect } from './Rekindle'
import Library from './Library'
import Playlist from './Playlist'

let musicKitPromise

function getMusicKit() {
    if (!musicKitPromise) {
        musicKitPromise = (async () => {
            if (!window.MusicKit) {
                throw new Error('Apple Music is still loading. Please try again.')
            }

            const response = await fetch('http://localhost:8000/api/apple-music/developer-token')
            if (!response.ok) {
                throw new Error(`Failed to get Apple Music developer token (${response.status})`)
            }

            const { token } = await response.json()
            await window.MusicKit.configure({
                developerToken: token,
                app: {
                    name: 'Rekindle',
                    build: '1.0.0',
                },
            })

            return window.MusicKit.getInstance()
        })().catch((error) => {
            musicKitPromise = undefined
            throw error
        })
    }

    return musicKitPromise
}

function App() {
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [connectionError, setConnectionError] = useState('')
    const [music, setMusic] = useState(null)
    const [playerQueue, setPlayerQueue] = useState([])
    const [playerStartIndex, setPlayerStartIndex] = useState(0)
    const [playRequest, setPlayRequest] = useState(0)

    const connectAppleMusic = async () => {
        setConnectionError('')
        setIsConnecting(true)

        try {
            const musicKit = await getMusicKit()
            if (!musicKit.isAuthorized) {
                await musicKit.authorize()
            }

            const musicUserToken = musicKit.musicUserToken
            if (!musicUserToken) {
                throw new Error('Apple Music authorization did not return a user token.')
            }

            const response = await fetch('http://localhost:8000/api/apple-music/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ music_user_token: musicUserToken }),
            })

            if (!response.ok) {
                const details = await response.json()
                throw new Error(details.detail || 'Failed to connect Apple Music')
            }

            setMusic(musicKit)
            setIsConnected(true)
        } catch (error) {
            setConnectionError(error instanceof Error ? error.message : 'Failed to connect Apple Music')
        } finally {
            setIsConnecting(false)
        }
    }

    const playSongs = (songs, selectedIndex) => {
        if (!isConnected) {
            setConnectionError('Connect Apple Music before playing a song.')
            return
        }

        setConnectionError('')
        setPlayerQueue(songs)
        setPlayerStartIndex(selectedIndex)
        setPlayRequest((request) => request + 1)
    }

    return (
        <BrowserRouter>
            <div className="layout">
                <Sidebar />
                <main className="app-main">
                    <AppleMusicConnect
                        connected={isConnected}
                        isConnecting={isConnecting}
                        error={connectionError}
                        onConnect={connectAppleMusic}
                    />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/rekindle" element={<Rekindle />} />
                        <Route path="/rekindle/all" element={<RekindleAll onPlaySongs={playSongs} />} />
                        <Route path="/rekindle/genre" element={<RekindleSelect />} />
                        <Route path="/rekindle/genre/results" element={<RekindleGenre onPlaySongs={playSongs} />} />
                        <Route path="/library" element={<Library />} />
                        <Route path="/playlist/:playlistId" element={<Playlist onPlaySongs={playSongs} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    <MusicPlayer
                        music={music}
                        isConnected={isConnected}
                        queue={playerQueue}
                        startIndex={playerStartIndex}
                        playRequest={playRequest}
                    />
                </main>
            </div>
        </BrowserRouter>
    )
}

export default App
