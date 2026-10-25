import { useEffect, useRef, type ComponentType } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Icon } from './Icons'
import civisionLogo from '../assets/civision-logo.png'

interface NavItemData {
  key: string
  label: string
  icon: ComponentType
  to?: string
}

// Items with a `to` path open a page. The others don't have a page yet.
const NAV_TOP: NavItemData[] = [
  { key: 'dashboard', label: 'Dasbor', icon: Icon.Dashboard, to: '/dashboard' },
  { key: 'map', label: 'Peta', icon: Icon.Pin, to: '/map' },
  { key: 'report', label: 'Detail Laporan', icon: Icon.Report, to: '/report' },
  { key: 'upload', label: 'Unggah Media', icon: Icon.Upload, to: '/upload' },
]

const NAV_MID: NavItemData[] = [
  { key: 'profile', label: 'Profil', icon: Icon.Profile, to: '/profile' },
  { key: 'settings', label: 'Pengaturan', icon: Icon.Settings, to: '/settings' },
  { key: 'help', label: 'Bantuan', icon: Icon.Help, to: '/help' },
]

function NavItem({ item }: { item: NavItemData }) {
  const IconComp = item.icon

  if (item.to) {
    // NavLink knows which page is open and marks its item as active.
    return (
      <NavLink
        to={item.to}
        className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
      >
        <IconComp />
        <span>{item.label}</span>
      </NavLink>
    )
  }

  return (
    <button type="button" className="nav-item">
      <IconComp />
      <span>{item.label}</span>
    </button>
  )
}

// open / onClose are only used on small screens, where the sidebar slides in
// from the left. On desktop it's always visible and these do nothing.
interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Move keyboard focus into the sidebar when it slides in
  useEffect(() => {
    if (open) closeButtonRef.current?.focus()
  }, [open])

  return (
    <aside id="app-sidebar" className={`sidebar${open ? ' sidebar--open' : ''}`}>
      <div className="sidebar__logo">
        <img className="sidebar__logo-img" src={civisionLogo} alt="Civision" />
        <button
          ref={closeButtonRef}
          type="button"
          className="sidebar__close"
          aria-label="Tutup menu"
          onClick={onClose}
        >
          <Icon.Close />
        </button>
      </div>

      <nav className="sidebar__nav">
        {NAV_TOP.map((item) => (
          <NavItem key={item.key} item={item} />
        ))}

        <div className="sidebar__divider" />

        {NAV_MID.map((item) => (
          <NavItem key={item.key} item={item} />
        ))}
      </nav>

      <button type="button" className="nav-item nav-item--logout" onClick={() => navigate('/')}>
        <Icon.Logout />
        <span>Keluar</span>
      </button>
    </aside>
  )
}
