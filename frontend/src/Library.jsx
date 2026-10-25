import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../css/library.css'

function Library() {
    const navigate = useNavigate()
    const [playlists, setPlaylists] = useState([])
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        async function getPlaylists() {
            try {
                const response = await fetch('http://localhost:8000/api/apple-music/user-playlists')
                if (!response.ok) {
                    throw new Error(`Failed to get user playlists (${response.status})`)
                }

                const playlistData = await response.json()
                if (!cancelled) {
                    setPlaylists(Object.entries(playlistData))
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError instanceof Error ? requestError.message : 'Failed to get user playlists')
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        getPlaylists()
        return () => {
            cancelled = true
        }
    }, [])

    return (
        <div className="body">
            <header>
                <button
                    className="global__back__button"
                    que-icon="arrow_back_ios"
                    type="button"
                    onClick={() => navigate('/')}
                    aria-label="Back to Rekindle"
                ></button>
                <h1>Library</h1>
                <p>Browse your Apple Music playlists</p>
            </header>

            {error && <p role="alert">{error}</p>}
            {!error && isLoading && <p>Loading playlists...</p>}
            {!error && !isLoading && playlists.length === 0 && <p>No playlists found.</p>}

            <div className="library-playlist-grid">
                {playlists.map(([playlistId, playlist], index) => {
                    const artwork = playlist.artwork
                    const artworkUrl = typeof artwork === 'string' ? artwork : artwork?.url
                    const sizedArtworkUrl = artworkUrl
                        ?.replace('{w}', '160')
                        .replace('{h}', '160')

                    return (
                        <section key={playlistId}>
                            <button
                                className="statcard library-playlist-card"
                                type="button"
                                onClick={() => navigate(`/playlist/${encodeURIComponent(playlistId)}`)}
                                style={{ animationDelay: `${index * 70}ms` }}
                            >
                                <img
                                    className="library-playlist-card__artwork"
                                    src={sizedArtworkUrl || '/rekindle-favicon.jpeg'}
                                    alt=""
                                    loading="lazy"
                                />
                                <span className="library-playlist-card__details">
                                    <span className="statcard__title">{playlist.name || 'Untitled playlist'}</span>
                                </span>
                            </button>
                        </section>
                    )
                })}
            </div>
        </div>
    )
}

export default Library
