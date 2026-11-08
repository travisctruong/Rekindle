import './css/sidebar.css'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

async function fetchLastSyncText() {
    const response = await fetch('http://localhost:8000/api/rekindle/latest-first-sync', { credentials: 'include' })
    if (!response.ok) throw new Error(`Failed to load sync date (${response.status})`)
    const value = await response.json()
    const date = value ? new Date(value) : null
    if (date && Number.isNaN(date.getTime())) throw new Error('Invalid sync date')
    return date ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'No sync recorded'
}

function Sidebar({ connectionReady, isConnected }) {
    const [syncText, setSyncText] = useState('Loading...')
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncError, setSyncError] = useState('')

    useEffect(() => {
        if (!connectionReady) return
        let cancelled = false

        async function getLastSynced() {
            try {
                const text = await fetchLastSyncText()
                if (!cancelled) setSyncText(text)
            } catch (error) {
                if (!cancelled) setSyncText(error instanceof Error ? error.message : 'Failed to load sync date')
            }
        }

        getLastSynced()
        return () => { cancelled = true }
    }, [connectionReady, isConnected])

    async function syncLibrary() {
        setSyncError('')
        setIsSyncing(true)
        let songsSynced = false
        try {
            for (const resource of ['songs', 'playlists']) {
                const response = await fetch(`http://localhost:8000/api/apple-music/${resource}`, { credentials: 'include' })
                if (!response.ok) {
                    const details = await response.json()
                    throw new Error(typeof details.detail === 'string' ? details.detail : `Request failed (${response.status})`)
                }
                if (resource === 'songs') songsSynced = true
            }
            window.location.reload()
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            setSyncError(songsSynced ? `Songs synced, but playlist sync failed: ${message}` : `Song sync failed: ${message}`)
            setIsSyncing(false)
        }
    }

    return (
        <aside className='sidebar'>
            <h2>
                <a href='/'>REKINDLE</a>
            </h2>
            <nav className='sidebar__nav'>
                <NavLink to="/">
                    <span que-icon="dashboard">Overview</span>
                </NavLink>
                <NavLink to="/rekindle">
                    <span que-icon="favorite">Rekindle!</span>
                </NavLink>
                <NavLink to="/library">
                    <span que-icon="video_library">Library</span>
                </NavLink>
            </nav>
            <div className="sidebar__sync">
                <p>Last sync: {syncText}</p>
                <button type="button" className="sidebar__sync-button" onClick={syncLibrary} disabled={!connectionReady || !isConnected || isSyncing}>
                    {isSyncing && <span className="sidebar__sync-spinner" aria-hidden="true" />}
                    {isSyncing ? 'Syncing...' : 'Sync Library'}
                </button>
                {syncError && <p className="sidebar__sync-error" role="alert">{syncError}</p>}
            </div>
        </aside>
    );
}
export default Sidebar;