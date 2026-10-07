import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './Home'
import Rekindle from './Rekindle'
import Library from './Library'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/rekindle" element={<Rekindle />} />
                <Route path="/library" element={<Library />} />
                <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App