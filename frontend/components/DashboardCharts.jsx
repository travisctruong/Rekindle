import { useState } from 'react'

const colors = ['var(--color-accent)', 'var(--color-blue-300)', 'var(--color-accent-hover)']

export function MonthlySyncSparkline({ events, asOf, label }) {
    if (events === null) return <span className="monthly-sparkline__unavailable">Sync history unavailable</span>

    const now = new Date(asOf)
    const counts = Array.from({ length: now.getDate() }, () => 0)
    for (const event of events) {
        const date = new Date(event.at)
        if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
            counts[date.getDate() - 1] += event.count
        }
    }

    const max = Math.max(...counts, 1)
    const points = counts.length === 1
        ? `1,${31 - counts[0] / max * 28} 99,${31 - counts[0] / max * 28}`
        : counts.map((count, index) => `${1 + index / (counts.length - 1) * 98},${31 - count / max * 28}`).join(' ')
    const summary = counts.map((count, index) => `${index + 1}: ${count}`).join(', ')

    return (
        <svg className="monthly-sparkline" viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label={`${label} first synced per day this month: ${summary}`}>
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
    )
}

export function GenreChart({ genres }) {
    const entries = Object.entries(genres || {}).filter(([, count]) => count > 0)
    const total = entries.reduce((sum, [, count]) => sum + count, 0)

    if (!total) return <p className="dashboard-chart__empty">No genres yet</p>

    const colorFor = (index) => colors[
        index === entries.length - 1 && index > 0 && index % colors.length === 0
            ? 1
            : index % colors.length
    ]
    let offset = 0
    const stops = entries.map(([, count], index) => {
        const start = offset
        offset += count / total * 100
        return `${colorFor(index)} ${start}% ${offset}%`
    })

    return (
        <>
            <div className="genre-chart">
                <div className="genre-chart__plot">
                    <div className="genre-chart__pie" style={{ background: `conic-gradient(${stops.join(', ')})` }} aria-hidden="true" />
                </div>
                <ul className="genre-chart__legend">
                    {entries.map(([genre, count], index) => (
                        <li key={genre}>
                            <span className="genre-chart__swatch" style={{ backgroundColor: colorFor(index) }} />
                            <span>{genre}</span><strong>{count}</strong>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    )
}

export function RecentSyncChart({ periods }) {
    const [period, setPeriod] = useState('week')
    const values = periods[period]
    const max = Math.max(...Object.values(values), 1)

    return (
        <div className="sync-chart">
            <label>
                Period
                <select value={period} onChange={(event) => setPeriod(event.target.value)}>
                    <option value="day">Past 24 hours</option>
                    <option value="week">Past 7 days</option>
                    <option value="month">Past 30 days</option>
                </select>
            </label>
            <div className="sync-chart__rows">
                {Object.entries(values).map(([name, count]) => (
                    <div className="sync-chart__row" key={name}>
                        <span>{name}</span>
                        <div className="sync-chart__track"><div className="sync-chart__bar" style={{ width: `${count / max * 100}%` }} /></div>
                        <strong>{count}</strong>
                    </div>
                ))}
            </div>
            <p>* First synced to Rekindle, not necessarily added to Apple Music during this period.</p> 
            <p>* Albums and artists are counted when first seen.</p>
        </div>
    )
}
