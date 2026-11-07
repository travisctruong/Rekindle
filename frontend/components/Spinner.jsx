import { useLayoutEffect, useRef } from 'react'
import './css/spinner.css'

function Spinner() {
    const spinnerRef = useRef(null)

    useLayoutEffect(() => {
        const spinner = spinnerRef.current
        const sidebar = document.querySelector('.sidebar')
        const player = document.querySelector('.music-player')

        function updatePosition() {
            const sidebarRect = sidebar?.getBoundingClientRect()
            const isTopNavigation = sidebarRect && sidebarRect.width >= window.innerWidth * 0.9
            const sidebarRight = sidebarRect && !isTopNavigation ? sidebarRect.right : 0
            const sidebarBottom = isTopNavigation ? sidebarRect.bottom : 0
            const playerTop = player ? player.getBoundingClientRect().top : window.innerHeight
            spinner.style.setProperty('--spinner-left', `${Math.max(0, sidebarRight)}px`)
            spinner.style.setProperty('--spinner-top', `${Math.max(0, sidebarBottom)}px`)
            spinner.style.setProperty('--spinner-bottom', `${Math.max(0, window.innerHeight - playerTop)}px`)
        }

        const observer = new ResizeObserver(updatePosition)
        if (sidebar) observer.observe(sidebar)
        if (player) observer.observe(player)
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition)
        updatePosition()

        return () => {
            observer.disconnect()
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition)
        }
    }, [])

    return (
        <div ref={spinnerRef} className="spinner" role="status" aria-label="Loading">
            <div className="spinner__position">
                <div className="spinner__ring" />
            </div>
        </div>
    )
}

export default Spinner
