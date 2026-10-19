import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import RekindleList from '../components/RekindleList'
import '../css/rekindle.css'

function formatDateTime(value) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return '...'
    }

    return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
    })
}

async function fetchLastSynced() {
    const response = await fetch('http://localhost:8000/api/rekindle/last-synced')
    if (!response.ok) {
        throw new Error(`Failed to get last synced time (${response.status})`)
    }
    return response.json()
}

function CreatePlaylistButton({ songs }) {
    const [isOpen, setIsOpen] = useState(false)
    const [playlistName, setPlaylistName] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    async function handleSubmit(event) {
        event.preventDefault()
        setIsCreating(true)
        setError('')
        setSuccess('')

        try {
            const response = await fetch('http://localhost:8000/api/songs/create-playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playlist_name: playlistName,
                    song_ids: songs.map((song) => song.id),
                    timezone_offset_minutes: new Date().getTimezoneOffset(),
                    timezone_name: new Intl.DateTimeFormat('en-US', {
                        timeZoneName: 'short',
                    }).formatToParts(new Date()).find((part) => part.type === 'timeZoneName')?.value
                        || Intl.DateTimeFormat().resolvedOptions().timeZone,
                }),
            })
            const result = await response.json()
            if (!response.ok) {
                throw new Error(result.detail || 'Failed to create playlist')
            }

            setSuccess(`Created "${result.name}" in Apple Music.`)
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Failed to create playlist')
        } finally {
            setIsCreating(false)
        }
    }

    if (songs.length === 0) {
        return null
    }

    return (
        <>
            <button
                que-icon="download"
                className="global__service__button"
                type="button"
                onClick={() => {
                    setError('')
                    setSuccess('')
                    setIsOpen(true)
                }}
                disabled={songs.length !== 10}
            >
                Save as Playlist
            </button>
            {isOpen && (
                <div className="rekindle-playlist-overlay">
                    <section
                        aria-labelledby="rekindle-playlist-title"
                        aria-modal="true"
                        className="statcard rekindle-playlist-dialog"
                        role="dialog"
                    >
                        <button
                            aria-label="Close playlist form"
                            className="rekindle-playlist-dialog__close"
                            type="button"
                            onClick={() => setIsOpen(false)}
                            disabled={isCreating}
                        >
                            ×
                        </button>
                        <h2 className="statcard__title" id="rekindle-playlist-title">
                            Create a playlist
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <label htmlFor="rekindle-playlist-name">Playlist name</label>
                            <input
                                autoFocus
                                id="rekindle-playlist-name"
                                maxLength={255}
                                onChange={(event) => setPlaylistName(event.target.value)}
                                required
                                disabled={Boolean(success)}
                                value={playlistName}
                            />
                            {error && <p role="alert">{error}</p>}
                            <button type="submit" disabled={isCreating || Boolean(success) || !playlistName.trim()}>
                                {isCreating ? 'Creating...' : success ? 'Playlist Created!' : 'Create playlist'}
                            </button>
                        </form>
                    </section>
                </div>
            )}
        </>
    )
}

function Rekindle() {
    const navigate = useNavigate()

    return (
        <div className="body">
            <header>
                <h1>Rekindle</h1>
                <p>Rediscover the music you already love</p>
            </header>

            <div className='rekindle-type__container'>
                <section className='rekindle-type-section rekindle-all'>
                    <span que-icon="music_note" aria-hidden="true"></span>
                    <strong>Rekindle All</strong>
                    <span>Get 10 songs from your entire library that you haven't heard in a while</span>
                    <button
                        type="button"
                        que-icon="arrow_forward_ios"
                        className='rekindle-direct__button'
                        aria-label="Open Rekindle All"
                        onClick={() => navigate('/rekindle/all')}
                    ></button>
                </section>

                <section className='rekindle-type-section rekindle-genre'>
                    <span que-icon="tune" aria-hidden="true"></span>
                    <strong>Rekindle by Genre</strong>
                    <span>Choose one of your favourite genres and get 10 songs from your library that you haven't heard in a while</span>
                    <button
                        type="button"
                        que-icon="arrow_forward_ios"
                        className='rekindle-direct__button'
                        aria-label="Open Rekindle by Genre"
                        onClick={() => navigate('/rekindle/genre')}
                    ></button>
                </section>
            </div>
        </div>
    );
}

function RekindleSelect() {
    const navigate = useNavigate()
    const [popularGenres, setPopularGenres] = useState([])
    const [genreArtwork, setGenreArtwork] = useState({})
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false

        async function getPopularGenres() {
            try {
                const [genresResponse, artworkResponse] = await Promise.all([
                    fetch('http://localhost:8000/api/songs/genre-count'),
                    fetch('http://localhost:8000/api/songs/genre-artwork'),
                ])
                if (!genresResponse.ok) {
                    throw new Error(`Failed to get popular genres (${genresResponse.status})`)
                }
                if (!artworkResponse.ok) {
                    throw new Error(`Failed to get genre artwork (${artworkResponse.status})`)
                }

                const [genres, artwork] = await Promise.all([
                    genresResponse.json(),
                    artworkResponse.json(),
                ])
                if (!cancelled) {
                    setPopularGenres(Object.entries(genres))
                    setGenreArtwork(artwork)
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError instanceof Error ? requestError.message : 'Failed to get popular genres')
                }
            }
        }

        getPopularGenres()
        return () => {
            cancelled = true
        }
    }, [])

    return (
        <div className='body'>
            <header>
                <button className="global__back__button" que-icon="arrow_back_ios" type="button" onClick={() => navigate('/rekindle')}></button>
                <h1>Rekindle</h1>
                <p>Choose one of your favourite genres and get 10 songs from your library that you haven't heard in a while</p>
            </header>

            {error && <p role="alert">{error}</p>}
            <div className="rekindle-genre-grid">
                {popularGenres.map(([genre, count], index) => (
                    <section>
                        <button
                            className="statcard rekindle-genre-card"
                            key={genre}
                            type="button"
                            onClick={() => navigate(`/rekindle/genre/results?genre=${encodeURIComponent(genre)}`)}
                            style={{ animationDelay: `${index * 70}ms` }}
                        >
                            {genreArtwork[genre] && (
                                <img
                                    className="rekindle-genre-card__artwork"
                                    src={genreArtwork[genre].replace('{w}', '160').replace('{h}', '160')}
                                    alt=""
                                    loading="lazy"
                                />
                            )}
                            <span className="rekindle-genre-card__details">
                                <span className="statcard__title">{genre}</span>
                                <span className="statcard__value">{count}</span>
                            </span>
                        </button>
                    </section>
                ))}
            </div>
        </div>
    )
}

function RekindleAll({ onPlaySongs }) {
    const navigate = useNavigate()
    const [songs, setSongs] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [lastSynced, setLastSynced] = useState(null)
    const hasLoadedRecommendations = useRef(false)

    useEffect(() => {
        let cancelled = false

        async function getLastSynced() {
            try {
                const value = await fetchLastSynced()
                if (!cancelled) {
                    setLastSynced(value)
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError instanceof Error ? requestError.message : 'Failed to get last synced time')
                }
            }
        }

        getLastSynced()
        return () => {
            cancelled = true
        }
    }, [])

    const handleRekindle = useCallback(async () => {
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
    }, [])

    useEffect(() => {
        if (hasLoadedRecommendations.current) {
            return
        }

        hasLoadedRecommendations.current = true
        void handleRekindle()
    }, [handleRekindle])

    return (
        <div className="body">
            <header>
                <button className="global__back__button" que-icon="arrow_back_ios" type="button" onClick={() => navigate('/rekindle')}></button>
                <h1>Rekindle</h1>
                <p>10 songs from your entire library that you haven't heard in a while</p>
            </header>

            <div className='rekindle-action__container'>
                <button que-icon ="shuffle" className='rekindle-shuffle__button' onClick={() => handleRekindle()} disabled={isLoading}>
                    {isLoading ? 'Finding songs...' : 'Rekindle'}
                </button>
                <span className="rekindle-last-synced">
                    Last synced: {lastSynced ? formatDateTime(lastSynced) : '...'}
                </span>
                {error && <p role="alert">{error}</p>}
                <RekindleList songs={songs} onPlaySongs={onPlaySongs} />
                <CreatePlaylistButton songs={songs} />
            </div>
        </div>
    );
}

function RekindleGenre({ onPlaySongs }) {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const genre = searchParams.get('genre') ?? ''
    const [songs, setSongs] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [lastSynced, setLastSynced] = useState(null)
    const hasLoadedRecommendations = useRef(false)

    useEffect(() => {
        let cancelled = false

        async function getLastSynced() {
            try {
                const value = await fetchLastSynced()
                if (!cancelled) {
                    setLastSynced(value)
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError instanceof Error ? requestError.message : 'Failed to get last synced time')
                }
            }
        }

        getLastSynced()
        return () => {
            cancelled = true
        }
    }, [])

    const handleRekindle = useCallback(async () => {
        if (!genre) {
            setError('Choose a genre to rekindle.')
            return
        }

        setIsLoading(true)
        setError('')

        try {
            const response = await fetch(
                `http://localhost:8000/api/songs/rekindle/genre?genre=${encodeURIComponent(genre)}`
            )
            if (!response.ok) {
                throw new Error(`Failed to rekindle songs (${response.status})`)
            }

            setSongs(await response.json())
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Failed to rekindle songs')
        } finally {
            setIsLoading(false)
        }
    }, [genre])

    useEffect(() => {
        if (hasLoadedRecommendations.current) {
            return
        }

        hasLoadedRecommendations.current = true
        void handleRekindle()
    }, [handleRekindle])

    return (
        <div className="body">
            <header>
                <button
                    className="global__back__button"
                    que-icon="arrow_back_ios"
                    type="button"
                    aria-label="Back to genres"
                    onClick={() => navigate('/rekindle/genre')}
                />
                <h1>{genre ? `Rekindle - ${genre}` : 'Rekindle by Genre'}</h1>
                <p>10 songs from your {genre || 'selected'} genre that you haven't heard in a while</p>
            </header>

            <div className="rekindle-action__container">
                <button
                    que-icon="shuffle"
                    className="rekindle-shuffle__button"
                    type="button"
                    onClick={() => void handleRekindle()}
                    disabled={isLoading || !genre}
                >
                    {isLoading ? 'Finding songs...' : 'Rekindle'}
                </button>
                <span className="rekindle-last-synced">
                    Last synced: {lastSynced ? formatDateTime(lastSynced) : '...'}
                </span>
                {error && <p role="alert">{error}</p>}
                <RekindleList songs={songs} onPlaySongs={onPlaySongs} />
                <CreatePlaylistButton songs={songs} />
            </div>
        </div>
    )
}

export default Rekindle;
export { RekindleSelect, RekindleAll, RekindleGenre }