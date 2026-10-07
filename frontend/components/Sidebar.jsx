import './css/sidebar.css'
import { NavLink } from 'react-router-dom'

function Sidebar() {
    return (
        <aside className='sidebar'>
            <h2>
                <a href='/'>Rekindle</a>
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
        </aside>
    );
}
export default Sidebar;