import './css/sidebar.css'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

function Sidebar({ connectionReady, isConnected }) {
    const [syncText, setSyncText] = useState('Loading...')

    useEffect(() => {
        if (!connectionReady) return
        let cancelled = false

        async function getLastSynced() {
            try {
                const response = await fetch('http://localhost:8000/api/rekindle/latest-first-sync', { credentials: 'include' })
                if (!response.ok) throw new Error(`Failed to load sync date (${response.status})`)
                const value = await response.json()
                const date = value ? new Date(value) : null
                if (date && Number.isNaN(date.getTime())) throw new Error('Invalid sync date')
                if (!cancelled) setSyncText(date ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'No sync recorded')
            } catch (error) {
                if (!cancelled) setSyncText(error instanceof Error ? error.message : 'Failed to load sync date')
            }
        }

        getLastSynced()
        return () => { cancelled = true }
    }, [connectionReady, isConnected])

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
            <p className="sidebar__sync">Last sync: {syncText}</p>
        </aside>
    );
}
export default Sidebar;