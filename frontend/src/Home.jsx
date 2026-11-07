import { useEffect, useState } from 'react';
import Statcard from '../components/Statcard';
import Spinner from '../components/Spinner';
import { GenreChart, MonthlySyncSparkline, RecentSyncChart } from '../components/DashboardCharts';
import '../css/home.css';

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

function monthlyGrowth(value) {
    if (!value) return 'Monthly growth unavailable'
    if (!value.baseline) return value.added ? 'First synced this month' : 'No change this month'
    return `+${(value.added / value.baseline * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}% this month`
}

function Home() {

    const [genreCount, setGenreCount] = useState(null)
    const [recentlyAdded, setRecentlyAdded] = useState(null)
    const [lastSynced, setLastSynced] = useState(null)
    const [dashboardStats, setDashboardStats] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelled = false

        // API fetches
        async function getLibraryCounts() {
            try {
                const now = new Date()
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
                const endpoints = [
                    ['genre', 'http://localhost:8000/api/songs/genre-count'],
                    ['recentlyAdded', 'http://localhost:8000/api/apple-music/recently-added'],
                    ['lastSynced', 'http://localhost:8000/api/rekindle/last-synced'],
                    ['dashboardStats', `http://localhost:8000/api/rekindle/dashboard-stats?month_start=${encodeURIComponent(monthStart)}`],
                ]
                const counts = await Promise.all(endpoints.map(async ([name, url]) => {
                    const response = await fetch(url, { credentials: 'include' })
                    if (!response.ok) {
                        throw new Error(`Failed to get ${name} count (${response.status})`)
                    }
                    return response.json()
                }))

                if (!cancelled) {
                    setGenreCount(counts[0])
                    setRecentlyAdded(counts[1])
                    setLastSynced(counts[2])
                    setDashboardStats(counts[3])
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

    if (!error && dashboardStats === null) {
        return <Spinner />
    }

    if (error && dashboardStats === null) {
        return <div className="body"><p role="alert">{error}</p></div>
    }

    // Formatting Recently Added Widget
    const recentlyAddedItems = !recentlyAdded || Object.entries(recentlyAdded).length === 0
            ? <p>No recently added albums</p>
            : (
                <div className="recently-added__items">
                    {Object.entries(recentlyAdded).map(([id, album]) => {
                        const artwork = album.artwork
                        const artworkUrl = typeof artwork === 'string' ? artwork : artwork?.url
                        const artworkUrlSized = artworkUrl?.replace('{w}', '120').replace('{h}', '120')
                        const albumName = album.name || 'Unknown album'
                        const artistName = album.artistName || album.artist || 'Unknown artist'
                        const dateAdded = album.dateAdded ? formatDate(album.dateAdded) : 'Date added unavailable'
                        const isNew = Boolean(album.dateAdded && lastSynced)
                            && new Date(album.dateAdded) > new Date(lastSynced)

                        return (
                            <article className="recently-added__item" key={id}>
                                {artworkUrlSized && <img className='recently-added__artwork' src={artworkUrlSized} alt="" />}
                                <div className="recently-added__details">
                                    <strong className="recently-added__album">{albumName}</strong>
                                    <span className="recently-added__artist">{artistName}</span>
                                    <time className="recently-added__date">{dateAdded}</time>
                                </div>
                                {isNew && <span className="recently-added__badge">New</span>}
                            </article>
                        )
                    })}
                </div>
            )

    const songRate = (count) => dashboardStats.songs
        ? `${Math.round(count / dashboardStats.songs * 100)}%`
        : '0%'

    return (
        <div className="body">
            <header>
                <h1>Welcome Travis!</h1>
            </header>

            {error && <p role="alert">{error}</p>}
            <div className='dashboard-grid'>
                <Statcard title="Songs in Library" className="statcard--trend" value={<>{dashboardStats.songs}<MonthlySyncSparkline events={dashboardStats.monthly_sync.songs} asOf={dashboardStats.as_of} label="Songs" /></>} detail={monthlyGrowth(dashboardStats.monthly.songs)} />
                <Statcard title="Unique Albums" className="statcard--trend" value={<>{dashboardStats.albums}<MonthlySyncSparkline events={dashboardStats.monthly_sync.albums} asOf={dashboardStats.as_of} label="Albums" /></>} detail={monthlyGrowth(dashboardStats.monthly.albums)} />
                <Statcard title="Unique Artists" className="statcard--trend" value={<>{dashboardStats.artists}<MonthlySyncSparkline events={dashboardStats.monthly_sync.artists} asOf={dashboardStats.as_of} label="Artists" /></>} detail={monthlyGrowth(dashboardStats.monthly.artists)} />
                <Statcard title="Playlists" value={dashboardStats.playlists} />
                <Statcard title="Recently Synced" value={dashboardStats ? <RecentSyncChart periods={dashboardStats.periods} /> : '...'} className="dashboard-grid__large" />
                <Statcard title="Top Genres" value={<GenreChart genres={genreCount} />} className="dashboard-grid__large statcard--genres" />
                <Statcard title="Recently Added to Library" value={<>{recentlyAddedItems}<p className="dashboard-chart__note">* Recently added to Apple Music, not necessarily synced to Rekindle.</p></>} className="dashboard-grid__large statcard--recently-added" />
                <Statcard title="Rekindled Rate" value={songRate(dashboardStats.rekindled)} className="dashboard-grid__rate" />
                <Statcard title="Favourited Rate" value={songRate(dashboardStats.favourites)} className="dashboard-grid__rate" />
            </div>
        </div>
    );
}

export default Home;