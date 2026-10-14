import { useEffect, useMemo, useRef } from 'react'
import { AppLayout } from '../../components/AppLayout'
import { Icon } from '../../components/Icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { ViolationMap } from '../feat-maps/ViolationMap'
import { useMapData } from '../feat-maps/useMapData'
import { filterByTimeRange } from '../../services/dashboard/mapData'
import { ReportTable } from '../feat-report/ReportTable'
import { useReports } from '../feat-report/useReports'
import Officer from '../../assets/officer-dashboard.png'
import './Dashboard.css'

const REVIEW_ROWS_PER_PAGE = 10

export default function Dashboard() {
  const navigate = useNavigate()
  const reports = useReports(REVIEW_ROWS_PER_PAGE)
  const location = useLocation()
  const mapPreviewRef = useRef<HTMLDivElement>(null)
  const { violations, zones, error: mapError } = useMapData()
  const previewViolations = useMemo(() => filterByTimeRange(violations, 'weekly'), [violations])

  const openMap = () => navigate('/dashboard/map')

  // Coming back from the full-screen map: put keyboard focus back on the map card
  useEffect(() => {
    if ((location.state as { focusMap?: boolean } | null)?.focusMap) {
      mapPreviewRef.current?.focus()
    }
  }, [location.state])

  return (
    // fitScreen: the dashboard always fits on one screen and can't be scrolled
    <AppLayout title="Dashboard" fitScreen>
      {/* Welcome banner */}
      <section className="banner">
        <div className="banner__text">
          <h2 className="banner__greeting">Good Morning, John Doe</h2>
          <p className="banner__desc" onClick={() => navigate('/report')}>
            You currently have <a href="#incidents">10 new incidents</a> queued up for review.
            <br />
            Let&apos;s tackle them!
          </p>
          <button type="button" className="banner__btn" onClick={() => navigate('/report')}>Review It</button>
        </div>
        <div className="banner__illustration" aria-hidden="true">
          <img className="banner__officer-img" src={Officer} alt="" />
        </div>
      </section>

      {/* Review progress + map */}
      <section className="content">
        <div className="review">
          <div className="review__head">
            <h3 className="review__title">Review Progress</h3>
            <div className="search">
              <input
                className="search__input"
                placeholder="Search something..."
                aria-label="Search review progress"
              />
              <button className="search__btn" aria-label="Search">
                <Icon.Search />
              </button>
            </div>
          </div>

          {/* Same table as Report Details (real data, paging, verification).
              It scrolls inside this column when the screen is too short. */}
          <ReportTable reports={reports} />
        </div>

        {/* Static map preview. Clicking it (or Enter/Space) opens the full-screen map. */}
        <div
          ref={mapPreviewRef}
          className="map"
          role="button"
          tabIndex={0}
          aria-label="Perbesar peta lokasi pelanggaran"
          onClick={openMap}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault() // Space would otherwise scroll the page
              openMap()
            }
          }}
        >
          <ViolationMap violations={previewViolations} zones={zones} interactive={false} />
          {/* Catches every click so the preview map itself never reacts */}
          <span className="map__hit" aria-hidden="true" />
          {mapError && <span className="map__notice">Data pelanggaran gagal dimuat</span>}
        </div>
      </section>
    </AppLayout>
  )
}

/* Simple flat officer illustration for the banner (inline SVG) */
function OfficerBanner() {
  return (
    <svg viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="banner__officer">
      {/* Body */}
      <path d="M60 220v-40c0-28 22-50 50-50s50 22 50 50v40H60Z" fill="#9fb4d8" />
      <path d="M110 130c-18 0-34 9-42 24h84c-8-15-24-24-42-24Z" fill="#7f97c4" />
      {/* Tie / collar */}
      <path d="M104 130l6 14 6-14-6-6-6 6Z" fill="#2d2b6b" />
      {/* Neck */}
      <rect x="98" y="92" width="24" height="30" rx="10" fill="#f2c9a8" />
      {/* Head */}
      <circle cx="110" cy="72" r="30" fill="#f7d3b3" />
      {/* Hair under cap */}
      <path d="M84 74c0-6 2-12 5-16 6 6 36 6 42 0 3 4 5 10 5 16-4-8-14-12-26-12s-22 4-26 12Z" fill="#1b1b1b" />
      {/* Cap */}
      <path d="M80 58c0-14 14-24 30-24s30 10 30 24H80Z" fill="#2d2b6b" />
      <rect x="78" y="58" width="64" height="8" rx="4" fill="#22214f" />
      <rect x="102" y="48" width="16" height="8" rx="2" fill="#e2b53a" />
      {/* Eyes */}
      <circle cx="100" cy="72" r="3.2" fill="#1b1b1b" />
      <circle cx="120" cy="72" r="3.2" fill="#1b1b1b" />
      {/* Smile */}
      <path d="M102 82c4 4 12 4 16 0" stroke="#c98b63" strokeWidth="3" strokeLinecap="round" />
      {/* Badge */}
      <circle cx="140" cy="150" r="8" fill="#e2b53a" />
    </svg>
  )
}
