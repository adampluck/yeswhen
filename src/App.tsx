import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Event from './pages/Event'

// Early links used /a/ and /e/ prefixes; keep them working.
function LegacyAdmin() {
  const { token = '' } = useParams()
  return <Navigate to={`/admin/${token}`} replace />
}

function LegacyEvent() {
  const { token = '' } = useParams()
  return <Navigate to={`/${token}`} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin/:token" element={<Admin />} />
      <Route path="/a/:token" element={<LegacyAdmin />} />
      <Route path="/e/:token" element={<LegacyEvent />} />
      <Route path="/:token" element={<Event />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
