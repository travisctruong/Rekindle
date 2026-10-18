import './css/rekindle-list.css'

function RekindleList({ songs, onPlaySongs }) {
    if (songs.length === 0) {
        return null
    }

    return (
        <section className="rekindle-list">
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
                                    que-icon="heart_plus"
                                    type="button"
                                    // onClick={() => onPlaySongs(songs, index)}
                                    // disabled={!song.apple_music_id}
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
