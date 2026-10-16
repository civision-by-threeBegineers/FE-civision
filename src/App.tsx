import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './pages/feat-login/LoginPage'
import Dashboard from './pages/feat-dashboard/Dashboard'
import ReportPage from './pages/feat-report/ReportPage'
import UploadPage from './pages/feat-upload/UploadPage'
import ProfilePage from './pages/feat-profile/ProfilePage'
import HelpPage from './pages/feat-help/HelpPage'
import MapPage from './pages/feat-maps/MapPage'
import NotificationPage from './pages/feat-notification/NotificationPage'
import ModelDiagnostic from './pages/model-diagnostic'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/map" element={<MapPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/notifications" element={<NotificationPage />} />
        <Route path="/model-diagnostic" element={<ModelDiagnostic />} />
      </Routes>
    </BrowserRouter>
  )
}
