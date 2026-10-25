import { useEffect, useState, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './Icons'
import { Time } from './Time'

interface TopbarProps {
  title: string
  menuOpen?: boolean
  menuButtonRef?: RefObject<HTMLButtonElement>
  onMenuClick?: () => void
}

// onMenuClick opens the sidebar on small screens (the hamburger button is hidden on desktop).
export function Topbar({ title, menuOpen = false, menuButtonRef, onMenuClick }: TopbarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // True once the page is scrolled down. Switches on the glass background.
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Tanggal hari ini, contoh: "22 September 2026"
  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <header className={`topbar${scrolled ? ' topbar--scrolled' : ''}`}>
      <div className="topbar__start">
        <button
          ref={menuButtonRef}
          type="button"
          className="icon-btn topbar__menu"
          aria-label="Buka menu"
          aria-controls="app-sidebar"
          aria-expanded={menuOpen}
          onClick={onMenuClick}
        >
          <Icon.Menu />
        </button>
        <div>
          <h1 className="topbar__title">{title}</h1>
          <p className="topbar__subtitle">
            <Time />
            <span className="topbar__date"> - {today}</span>
          </p>
        </div>
      </div>
      <div className="topbar__actions">
        <button
          type="button"
          className="icon-btn"
          aria-label="Notifikasi"
          aria-current={pathname === '/notifications' ? 'page' : undefined}
          onClick={() => navigate('/notifications')}
        >
          <Icon.Bell />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Profil"
          aria-current={pathname === '/profile' ? 'page' : undefined}
          onClick={() => navigate('/profile')}
        >
          <Icon.Avatar />
        </button>
      </div>
    </header>
  )
}
