import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Statcard from '../components/Statcard';

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

function formatDate(value) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return '...'
    }

    return date.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })
}

function Home() {

    const [songCount, setSongCount] = useState(null)
    const [albumCount, setAlbumCount] = useState(null)
    const [artistCount, setArtistCount] = useState(null)
    const [genreCount, setGenreCount] = useState(null)
    const [recentlyAdded, setRecentlyAdded] = useState(null)
    const [lastSynced, setLastSynced] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelled = false

        // API fetches
        async function getLibraryCounts() {
            try {
                const endpoints = [
                    ['song', 'http://localhost:8000/api/songs/songs-count'],
                    ['album', 'http://localhost:8000/api/songs/albums-count'],
                    ['artist', 'http://localhost:8000/api/songs/artists-count'],
                    ['genre', 'http://localhost:8000/api/songs/genre-count'],
                    ['recentlyAdded', 'http://localhost:8000/api/apple-music/recently-added'],
                    ['lastSynced', 'http://localhost:8000/api/rekindle/last-synced'],
                ]
                const counts = await Promise.all(endpoints.map(async ([name, url]) => {
                    const response = await fetch(url)
                    if (!response.ok) {
                        throw new Error(`Failed to get ${name} count (${response.status})`)
                    }
                    return response.json()
                }))

                if (!cancelled) {
                    setSongCount(counts[0])
                    setAlbumCount(counts[1])
                    setArtistCount(counts[2])
                    setGenreCount(counts[3])
                    setRecentlyAdded(counts[4])
                    setLastSynced(counts[5])
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError instanceof Error ? requestError.message : 'Failed to get library counts')
                }
            }
        }

        getLibraryCounts()
        return () => {
            cancelled = true
        }
    }, [])

    // Formatting Top Genres Widget
    const topGenres = genreCount
        ? Object.entries(genreCount).map(([genre, count]) => `${genre} (${count})`).join(', ') || 'No genres'
        : '...'

    // Formatting Recently Added Widget
    const recentlyAddedItems = recentlyAdded === null
        ?? Object.entries(recentlyAdded).length === 0
            ? <p>No recently added albums</p>
            : (
                <div className="recently-added__items">
                    {Object.entries(recentlyAdded).map(([id, album]) => {
                        const artwork = album.artwork
                        const artworkUrl = typeof artwork === 'string' ? artwork : artwork?.url
                        const artworkUrlSized = artworkUrl.replace('{w}', '120').replace('{h}', '120')
                        const albumName = album.name || 'Unknown album'
                        const artistName = album.artistName || album.artist || 'Unknown artist'
                        const dateAdded = album.dateAdded ? formatDate(album.dateAdded) : 'Date added unavailable'

                        return (
                            <article className="recently-added__item" key={id}>
                                <img className='recently-added__artwork' src={artworkUrlSized} alt="" />
                                <div className="recently-added__details">
                                    <strong className="recently-added__album">{albumName}</strong>
                                    <span className="recently-added__artist">{artistName}</span>
                                    <time className="recently-added__date">{dateAdded}</time>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )

    // Formatting Last-Synced Widget
    const lastSyncedFormatted = lastSynced ? formatDateTime(lastSynced) : '...'

    return (
        <div className='layout'>
            <Sidebar />

            <div className="body">
                <h1>Welcome Travis!</h1>

                <div className='statcard__container'>
                    {error && <p role="alert">{error}</p>}
                    <Statcard title="Last-Synced" value={lastSyncedFormatted}/>
                    <Statcard title="Songs in Library" value={songCount ?? '...'} />
                    <Statcard title="Unique Albums" value={albumCount ?? '...'} />
                    <Statcard title="Unique Artists" value={artistCount ?? '...'} />
                    <Statcard title="Top Genres" value={topGenres} />
                </div>
                <Statcard title="Recently Added to Library" value={recentlyAddedItems} className="statcard--recently-added" />

            </div>
        </div>
    );
}

export default Home;