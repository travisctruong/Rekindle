import { useState } from 'react'
import './css/rekindle-list.css'

function RekindleList({ songs, onPlaySongs, showFavourites = true, onFavouriteChange, showDuration = false }) {
    const [favourites, setFavourites] = useState({})
    const [updatingSongId, setUpdatingSongId] = useState(null)
    const [error, setError] = useState('')

    if (songs.length === 0) {
        return null
    }

    async function toggleFavourite(songId) {
        setUpdatingSongId(songId)
        setError('')

        try {
            const response = await fetch(`http://localhost:8000/api/rekindle/${songId}/favourite`, {
                method: 'POST',
            })
            const result = await response.json()
            if (!response.ok) {
                throw new Error(result.detail || 'Failed to update favourite')
            }
            if (onFavouriteChange) {
                onFavouriteChange(songId, result.favourite)
            } else {
                setFavourites((current) => ({ ...current, [songId]: result.favourite }))
            }
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Failed to update favourite')
        } finally {
            setUpdatingSongId(null)
        }
    }

    return (
        <section className="rekindle-list">
            {error && <p role="alert">{error}</p>}
            <ol className="rekindle-list__items">
                {songs.map((song, index) => {
                    const isFavourite = onFavouriteChange
                        ? song.favourite
                        : favourites[song.id] ?? song.favourite

                    return (
                        <li
                            className="rekindle-list__item"
                            key={song.id}
                            style={{ animationDelay: `${index * 70}ms` }}
                        >
                            <div className="rekindle-list__row">
                                <div className="rekindle-list__track">
                                    {song.artwork && (
                                        <img
                                            className="rekindle-list__artwork"
                                            src={song.artwork.replace('{w}', '96').replace('{h}', '96')}
                                            alt=""
                                            loading="lazy"
                                        />
                                    )}
                                    <div className="rekindle-list__details">
                                        <strong>{song.title}</strong>
                                        <span>{song.artist}</span>
                                    </div>
                                </div>
                                <span className="rekindle-list__album" title={song.album || 'Unknown album'}>
                                    {song.album || null}
                                </span>
                                {showDuration && song.duration && (
                                    <span className="rekindle-list__duration">{song.duration}</span>
                                )}
                                <div className='rekindle-list-button__container'>
                                    {showFavourites && (
                                        <button
                                            className="rekindle-favourite-button"
                                            que-icon={isFavourite ? "heart_check" : "heart_plus"}
                                            type="button"
                                            aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
                                            aria-pressed={isFavourite}
                                            onClick={() => void toggleFavourite(song.id)}
                                            disabled={updatingSongId === song.id || song.canFavourite === false}
                                        >
                                        </button>
                                    )}
                                    <button
                                        que-icon="play_circle"
                                        type="button"
                                        onClick={() => onPlaySongs(songs, index)}
                                        disabled={!song.apple_music_id}
                                    >
                                    </button>
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ol>
        </section>
    )
}

export default RekindleList
