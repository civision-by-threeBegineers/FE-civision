import { useState, type ComponentType } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/AppLayout'
import { Icon } from '../../components/Icons'
import './NotificationPage.css'

type NotificationType = 'report' | 'verified' | 'warning'
type TabKey = 'all' | 'today' | 'week'

interface Notification {
  id: number
  type: NotificationType
  title: string
  message: string
  hoursAgo: number // replace with a real timestamp once this comes from the API
  unread: boolean
}

/* ---------- Mock data (replace with data from the API later) ---------- */
const NOTIFICATIONS: Notification[] = [
  { id: 1, type: 'report', title: 'Laporan Baru Ditambahkan', message: 'Gerobak PKL baru dilaporkan di Jl. KH. Mas Mansyur.', hoursAgo: 2, unread: true },
  { id: 2, type: 'report', title: 'Laporan Baru Ditambahkan', message: 'Gerobak PKL baru dilaporkan di Jl. KH. Mas Mansyur.', hoursAgo: 6, unread: true },
  { id: 3, type: 'report', title: 'Laporan Baru Ditambahkan', message: 'Gerobak PKL baru dilaporkan di Jl. KH. Mas Mansyur.', hoursAgo: 10, unread: true },
  { id: 4, type: 'verified', title: 'Laporan Terverifikasi', message: 'Laporan gerobak PKL Anda di Jl. KH. Mas Mansyur telah disetujui.', hoursAgo: 18, unread: false },
  { id: 5, type: 'warning', title: 'Laporan Berulang Terdeteksi', message: 'Gerobak PKL terus dilaporkan di koordinat: -6.1925, 106.7695', hoursAgo: 23, unread: false },
  { id: 6, type: 'report', title: 'Laporan Baru Ditambahkan', message: 'Gerobak PKL baru dilaporkan di Jl. KH. Mas Mansyur.', hoursAgo: 48, unread: true },
]

const TYPE_ICONS: Record<NotificationType, ComponentType> = {
  report: Icon.Stall,
  verified: Icon.CheckSquare,
  warning: Icon.Warning,
}

// Today = the last 24 hours. This Week = earlier this week (1 to 7 days ago).
const TABS: { key: TabKey; label: string; matches: (n: Notification) => boolean }[] = [
  { key: 'all', label: 'Semua', matches: () => true },
  { key: 'today', label: 'Hari Ini', matches: (n) => n.hoursAgo < 24 },
  { key: 'week', label: 'Minggu Ini', matches: (n) => n.hoursAgo >= 24 && n.hoursAgo < 24 * 7 },
]

function timeAgo(hours: number) {
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}

export default function NotificationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState<TabKey>('all')

  const activeTab = TABS.find((t) => t.key === tab)!
  const items = NOTIFICATIONS.filter(activeTab.matches)

  // Go back to the page the bell was pressed on. If this page was opened
  // directly (no history inside the app), go to the dashboard instead.
  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate('/dashboard')
  }

  return (
    // No topbar: this page has its own header (back button + title), like the design
    <AppLayout title="Notifikasi" fitScreen showTopbar={false}>
      <div className="notif">
        <header className="notif__header">
          <button type="button" className="notif__back" aria-label="Kembali" onClick={goBack}>
            <Icon.ChevronLeft />
          </button>
          <h1 className="notif__title">Notifikasi</h1>
        </header>

        {/* Filter tabs. The badge shows how many unread notifications each tab has. */}
        <div className="notif-tabs" role="group" aria-label="Filter notifikasi">
          {TABS.map((t) => {
            const unread = NOTIFICATIONS.filter((n) => t.matches(n) && n.unread).length
            return (
              <button
                key={t.key}
                type="button"
                className={`notif-tab${t.key === tab ? ' notif-tab--active' : ''}`}
                aria-pressed={t.key === tab}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <span className="notif-tab__badge" aria-label={`${unread} belum dibaca`}>
                  {unread}
                </span>
              </button>
            )
          })}
        </div>

        {/* The list scrolls inside itself, so the header and tabs stay in place */}
        <div className="notif-list-wrap">
          {items.length === 0 ? (
            <p className="notif-empty">Tidak ada notifikasi.</p>
          ) : (
            <ul className="notif-list" aria-label={`Notifikasi ${activeTab.label}`}>
              {items.map((n) => {
                const TypeIcon = TYPE_ICONS[n.type]
                return (
                  <li key={n.id} className={`notif-item${n.unread ? ' notif-item--unread' : ''}`}>
                    <span className="notif-item__icon">
                      <TypeIcon />
                    </span>
                    <div className="notif-item__text">
                      <p className="notif-item__title">{n.title}</p>
                      <p className="notif-item__message">{n.message}</p>
                    </div>
                    <div className="notif-item__meta">
                      {n.unread && (
                        <span className="notif-item__dot">
                          <span className="visually-hidden">Belum dibaca</span>
                        </span>
                      )}
                      <span className="notif-item__time">{timeAgo(n.hoursAgo)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
