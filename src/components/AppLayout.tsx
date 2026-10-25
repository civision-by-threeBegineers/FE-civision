import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Icon } from './Icons'
import './AppLayout.css'

// Same breakpoint as AppLayout.css: above this the sidebar is always visible.
const DESKTOP_QUERY = '(min-width: 901px)'

// Shared shell for the pages after login: sidebar on the left,
// topbar + the page's own content on the right.
// fitScreen: lock the page to the screen height so it can't scroll (used by the Dashboard).
// hero: paint a purple band behind the topbar and turn the topbar text white (used by Profile).
// showTopbar: set to false for pages with their own header (used by Notification).
//   On small screens a bar with only the hamburger button is shown instead, so the
//   sidebar can still be opened.
interface AppLayoutProps {
  title: string
  fitScreen?: boolean
  hero?: boolean
  showTopbar?: boolean
  // fullBleed: content fills the whole area right of the sidebar, no padding and no
  //   page scrolling (used by the full-screen map)
  fullBleed?: boolean
  children?: ReactNode
}

export function AppLayout({
  title,
  fitScreen = false,
  hero = false,
  showTopbar = true,
  fullBleed = false,
  children,
}: AppLayoutProps) {
  // Only used on small screens, where the sidebar slides in from the left.
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()

  const closeMenu = () => {
    setMenuOpen(false)
    menuButtonRef.current?.focus() // give focus back to the hamburger button
  }

  // Close the menu after navigating to another page
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // While the menu is open: Escape closes it, and the page behind can't scroll
  useEffect(() => {
    if (!menuOpen) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  // If the window gets wide again, the sidebar is always visible, so drop the open state
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY)
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMenuOpen(false)
    }
    desktop.addEventListener('change', handleChange)
    return () => desktop.removeEventListener('change', handleChange)
  }, [])

  return (
    <div
      className={`app-layout${fitScreen ? ' app-layout--fit-screen' : ''}${hero ? ' app-layout--hero' : ''}${fullBleed ? ' app-layout--full-bleed' : ''}`}
    >
      <Sidebar open={menuOpen} onClose={closeMenu} />

      {/* Dark layer behind the open sidebar on small screens. Clicking it closes the menu. */}
      <div
        className={`sidebar-backdrop${menuOpen ? ' sidebar-backdrop--visible' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <main className="main">
        {showTopbar ? (
          <Topbar
            title={title}
            menuOpen={menuOpen}
            menuButtonRef={menuButtonRef}
            onMenuClick={() => setMenuOpen(true)}
          />
        ) : (
          // Small screens only (hidden on desktop, where the sidebar is always visible)
          <div className="menu-bar">
            <button
              ref={menuButtonRef}
              type="button"
              className="icon-btn"
              aria-label="Buka menu"
              aria-controls="app-sidebar"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Icon.Menu />
            </button>
          </div>
        )}
        {/* Only the page content animates in. The sidebar and topbar stay static. */}
        <div className="page-content">{children}</div>
      </main>
    </div>
  )
}
