import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FeatureCard, { FeatureCardGroup } from '../components/FeatureCard'
import '../css/library.css'

function PlaylistGrid({ playlists }) {
    const navigate = useNavigate()

    return (
        <div className="library-playlist-grid">
            {Object.entries(playlists).map(([playlistId, playlist], index) => {
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
    )
}

function Library() {
    const navigate = useNavigate()
    const [userPlaylists, setUserPlaylists] = useState([])
    const [applePlaylists, setApplePlaylists] = useState([])
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        async function getPlaylists() {
            try {
                const endpoints = [
                    ['userPlaylists', 'http://localhost:8000/api/apple-music/user-playlists'],
                    ['applePlaylists', 'http://localhost:8000/api/apple-music/apple-playlists'],
                ]

                const counts = await Promise.all(endpoints.map(async ([name, url]) => {
                    const response = await fetch(url)
                    if (!response.ok) {
                        throw new Error(`Failed to get ${name} count (${response.status})`)
                    }
                    return response.json()
                }))

                if (!cancelled) {
                    setUserPlaylists(counts[0])
                    setApplePlaylists(counts[1])
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError instanceof Error ? requestError.message : 'Failed to get playlist details')
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
        <div className="body library-page">
            <style>{`
                .library-page .feature-card-group {
                    min-height: 35vh;
                    margin-block: 0.25rem;
                }

                .library-page .feature-card {
                    min-height: 360px;
                }
            `}</style>
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
            {!error && !isLoading && (
                <>
                    <FeatureCardGroup>
                        <FeatureCard
                            icon="person"
                            title="Your Playlists"
                            description="View and manage the playlists you've created and saved"
                            backgroundImage="/images/image3.jpg"
                            ariaLabel="Open your playlists"
                            onClick={() => navigate('/playlists/users')}
                        />
                        <FeatureCard
                            icon="home"
                            title="Apple Music Playlists"
                            description="Browse your saved playlists from Apple Music, including artist essentials, mood playlists, and more"
                            backgroundImage="/images/image4.jpg"
                            ariaLabel="Open Apple Music playlists"
                            onClick={() => navigate('/playlists/apple')}
                        />
                    </FeatureCardGroup>


                    <section style={{ marginBlock: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h2>Your Playlists</h2>
                            <button
                                className="feature-card__button"
                                type="button"
                                que-icon="arrow_forward_ios"
                                aria-label="View all your playlists"
                                onClick={() => navigate('/playlists/users')}
                                style={{ flex: '0 0 54px', margin: 0 }}
                            />
                        </div>
                        {Object.keys(userPlaylists).length > 0
                            ? <PlaylistGrid playlists={userPlaylists} />
                            : <p>No user playlists found.</p>}
                    </section>
                    <section style={{ marginBlock: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h2>Apple Music Playlists</h2>
                            <button
                                className="feature-card__button"
                                type="button"
                                que-icon="arrow_forward_ios"
                                aria-label="View all Apple Music playlists"
                                onClick={() => navigate('/playlists/apple')}
                                style={{ flex: '0 0 54px', margin: 0 }}
                            />
                        </div>
                        {Object.keys(applePlaylists).length > 0
                            ? <PlaylistGrid playlists={applePlaylists} />
                            : <p>No Apple Music playlists found.</p>}
                    </section>
                </>
            )}
        </div>
    )
}

function PlaylistCollection({ type }) {
    const navigate = useNavigate()
    const [playlists, setPlaylists] = useState({})
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const isApplePlaylist = type === 'apple'
    const title = isApplePlaylist ? 'Apple Music Playlists' : 'Your Playlists'
    const endpoint = isApplePlaylist ? 'apple-playlists' : 'user-playlists'

    useEffect(() => {
        let cancelled = false

        async function getPlaylists() {
            try {
                const response = await fetch(`http://localhost:8000/api/apple-music/${endpoint}?all=true`)
                if (!response.ok) {
                    throw new Error(`Failed to get playlists (${response.status})`)
                }

                const playlistData = await response.json()
                if (!cancelled) {
                    setPlaylists(playlistData)
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError instanceof Error ? requestError.message : 'Failed to get playlists')
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
    }, [endpoint])

    return (
        <div className="body">
            <header>
                <button
                    className="global__back__button"
                    que-icon="arrow_back_ios"
                    type="button"
                    onClick={() => navigate('/library')}
                    aria-label="Back to Library"
                ></button>
                <h1>{title}</h1>
            </header>
            {error && <p role="alert">{error}</p>}
            {!error && isLoading && <p>Loading playlists...</p>}
            {!error && !isLoading && Object.keys(playlists).length === 0 && <p>No playlists found.</p>}
            {!error && !isLoading && Object.keys(playlists).length > 0 && (
                <PlaylistGrid playlists={playlists} />
            )}
        </div>
    )
}

export function UserPlaylists() {
    return <PlaylistCollection type="user" />
}

export function ApplePlaylists() {
    return <PlaylistCollection type="apple" />
}

export default Library
