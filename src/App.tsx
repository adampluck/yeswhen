import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Event from './pages/Event'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/a/:token" element={<Admin />} />
      <Route path="/e/:token" element={<Event />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
