import { useState } from 'react'
import AppleMusicConnect from '../components/AppleMusicConnect'
import Sidebar from '../components/Sidebar'

function Rekindle() {
    const [songs, setSongs] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleRekindle = async () => {
        setIsLoading(true)
        setError('')

        try {
            const response = await fetch('http://localhost:8000/api/songs/rekindle')
            if (!response.ok) {
                throw new Error(`Failed to rekindle songs (${response.status})`)
            }

            const rekindledSongs = await response.json()
            setSongs(rekindledSongs)
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Failed to rekindle songs')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className='layout'>
            <Sidebar />
            <div className="body">
                <AppleMusicConnect />
                <button que-icon="favorite" className="service-button" onClick={handleRekindle} disabled={isLoading}>
                    {isLoading ? 'Finding songs...' : 'Rekindle Your Music'}
                </button>
                {error && <p role="alert">{error}</p>}
                {songs.length > 0 && (
                    <ul>
                        {songs.map((song) => (
                            <li key={song.id}>
                                <strong>{song.title}</strong> — {song.artist}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default Rekindle;