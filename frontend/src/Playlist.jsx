import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import RekindleList from '../components/RekindleList'
import '../css/playlist.css'

function formatTrackDuration(durationInMillis) {
    if (!Number.isFinite(durationInMillis) || durationInMillis < 0) {
        return ''
    }

    const totalSeconds = Math.floor(durationInMillis / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function Playlist({ onPlaySongs }) {
    const navigate = useNavigate()
    const { playlistId } = useParams()
    const [playlist, setPlaylist] = useState({})
    const [playlistData, setPlaylistData] = useState({})
    const [error, setError] = useState('')
    const [favouriteError, setFavouriteError] = useState('')
    const [isFavouriting, setIsFavouriting] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        async function getPlaylist() {
            try {
                const endpoints =  [
                    ['playlist', `http://localhost:8000/api/apple-music/user-playlists/`],
                    ['playlistData', `http://localhost:8000/api/apple-music/playlist-data/${decodeURIComponent(playlistId)}`],
                ]

                const counts = await Promise.all(endpoints.map(async ([name, url]) => {
                    const response = await fetch(url)
                    if (!response.ok) {
                        throw new Error(`Failed to get ${name} count (${response.status})`)
                    }
                    return response.json()
                }))

                if (!cancelled) {
                    setPlaylist(counts[0])
                    setPlaylistData(counts[1])
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
        getPlaylist()
        return () => {
            cancelled = true
        }
    }, [playlistId])

    const playlistDetail = playlist[playlistId]
    const artwork = playlistDetail?.artwork
    const artworkUrl = typeof artwork === 'string' ? artwork : artwork?.url
    const sizedArtworkUrl = artworkUrl
        ?.replace('{w}', '100')
        .replace('{h}', '100')
    const playlistDescription = playlistDetail?.description
    const trackCount = Object.keys(playlistData).length
    const songs = Object.entries(playlistData).map(([id, track]) => ({
        id: track.songId ?? id,
        rekindle_song_id: track.songId ?? null,
        apple_music_id: id,
        title: track.name || 'Unknown track',
        artist: track.artistName || 'Unknown artist',
        album: track.albumName || '',
        duration: formatTrackDuration(track.durationInMillis),
        artwork: track.artwork?.url || '',
        favourite: track.favourite ?? false,
        canFavourite: track.songId != null,
    }))
    const favouritableSongs = songs.filter((song) => song.canFavourite)
    const areAllSongsFavourited = favouritableSongs.length > 0
        && favouritableSongs.every((song) => song.favourite)

    async function setPlaylistFavourite(favourite) {
        const songIds = favouritableSongs.map((song) => song.id)
        if (songIds.length === 0) {
            return
        }

        setIsFavouriting(true)
        setFavouriteError('')
        try {
            const response = await fetch('http://localhost:8000/api/rekindle/favourites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ song_ids: songIds, favourite }),
            })
            const result = await response.json()
            if (!response.ok) {
                throw new Error(result.detail || `Failed to ${favourite ? 'favourite' : 'unfavourite'} playlist`)
            }

            const favouritedIds = new Set(result.song_ids)
            setPlaylistData((current) => Object.fromEntries(
                Object.entries(current).map(([id, track]) => [
                    id,
                    favouritedIds.has(track.songId) ? { ...track, favourite } : track,
                ])
            ))
        } catch (requestError) {
            setFavouriteError(
                requestError instanceof Error
                    ? requestError.message
                    : `Failed to ${favourite ? 'favourite' : 'unfavourite'} playlist`
            )
        } finally {
            setIsFavouriting(false)
        }
    }

    function updateFavourite(songId, favourite) {
        setPlaylistData((current) => Object.fromEntries(
            Object.entries(current).map(([id, track]) => [
                id,
                track.songId === songId ? { ...track, favourite } : track,
            ])
        ))
    }

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
            </header>
            {error && <p role="alert">{error}</p>}

            <div className='playlist-container'>
                <div className='playlist-header'>
                    {playlistDetail && (
                        <img
                            className="playlist-artwork"
                            src={sizedArtworkUrl || '/rekindle-favicon.jpeg'}
                            alt=""
                        />
                    )}
                    <div className='playlist-information'>
                        <h1>{playlistDetail?.name || (isLoading ? 'Loading playlist...' : 'Playlist not found')}</h1>
                        <h4>{playlistDescription}</h4>
                        <h4 className='playlist-information__track-count'>{trackCount} Tracks</h4>
                        {playlistDetail && Object.keys(playlistData).length === 0 && !isLoading && (
                            <p>This playlist has no tracks.</p>
                        )}
                        <div className="playlist-information__actions">
                            <button
                                className='global__service__button'
                                que-icon='play_arrow'
                                type="button"
                                onClick={() => onPlaySongs(songs, 0)}
                                disabled={songs.length === 0}
                            >
                                Play All
                            </button>
                            <button
                                className='global__service__button'
                                que-icon={areAllSongsFavourited ? 'heart_broken' : 'favorite'}
                                type="button"
                                onClick={() => void setPlaylistFavourite(!areAllSongsFavourited)}
                                disabled={isFavouriting || favouritableSongs.length === 0}
                            >
                                <span
                                    className="playlist-favourite-label"
                                    key={areAllSongsFavourited ? 'unfavourite' : 'favourite'}
                                >
                                    {areAllSongsFavourited ? 'Unfavourite' : 'Favourite'}
                                </span>
                            </button>
                        </div>
                        {favouriteError && <p role="alert">{favouriteError}</p>}
                    </div>
                </div>

                <div className='playlist-tracks'>
                    <RekindleList
                        songs={songs}
                        onPlaySongs={onPlaySongs}
                        onFavouriteChange={updateFavourite}
                        showDuration
                    />
                </div>
            </div>

        </div>
    )
}

export default Playlist
