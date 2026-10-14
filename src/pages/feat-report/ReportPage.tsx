import { AppLayout } from '../../components/AppLayout'
// Placeholder officer. Save the officer from the Report Details design as
// src/assets/officer-report.png, then change this line to import that file instead.
import officerImg from '../../assets/officer-report.png'
import type { ReportStats } from '../../services/report/getReports'
import { ReportTable } from './ReportTable'
import { useReports } from './useReports'
import './ReportPage.css'

const ROWS_PER_PAGE = 10

const STAT_CARDS: { key: keyof ReportStats; label: string }[] = [
  { key: 'total', label: 'Total Reports' },
  { key: 'valid', label: 'Valid Reports' },
  { key: 'invalid', label: 'Invalid Reports' },
  { key: 'unverified', label: 'Unverified Reports' },
]

export default function ReportPage() {
  const reports = useReports(ROWS_PER_PAGE)
  const { data } = reports

  return (
    <AppLayout title="Report Details">
      {/* Stats card + officer. The numbers follow along when a report is verified. */}
      <section className="report-hero">
        <div className="report-stats">
          {STAT_CARDS.map((stat) => (
            <div key={stat.key} className={`report-stat report-stat--${stat.key}`}>
              <span className="report-stat__value">{data ? data.stats[stat.key] : '–'}</span>
              <span className="report-stat__label">{stat.label}</span>
            </div>
          ))}
        </div>
        <img className="report-hero__officer" src={officerImg} alt="" />
      </section>

      {/* Reports table, pagination and report verification */}
      <ReportTable reports={reports} />
    </AppLayout>
  )
}
