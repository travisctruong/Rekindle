import { useState } from 'react'
import './css/rekindle-list.css'

function RekindleList({ songs, onPlaySongs }) {
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
            setFavourites((current) => ({ ...current, [songId]: result.favourite }))
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
                {songs.map((song, index) => (
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
                            <div className='rekindle-list-button__container'>
                                <button
                                    className="rekindle-favourite-button"
                                    que-icon={(favourites[song.id] ?? song.favourite) ? "heart_check" : "heart_plus"}
                                    type="button"
                                    aria-label={favourites[song.id] ?? song.favourite ? "Remove from favourites" : "Add to favourites"}
                                    aria-pressed={favourites[song.id] ?? song.favourite}
                                    onClick={() => void toggleFavourite(song.id)}
                                    disabled={updatingSongId === song.id}
                                >
                                </button>
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
                ))}
            </ol>
        </section>
    )
}

export default RekindleList
