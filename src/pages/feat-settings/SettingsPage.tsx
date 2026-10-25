import { useState, type ComponentType, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/AppLayout'
import { Icon } from '../../components/Icons'
import './SettingsPage.css'

// A titled card that holds one or more rows.
function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="settings-group" aria-labelledby={id}>
      <h2 id={id} className="settings-group__title">
        {title}
      </h2>
      <div className="settings-card">{children}</div>
    </section>
  )
}

// A row that ends with ">". Without onClick it only has hover and press effects.
function LinkRow({
  icon: IconComp,
  label,
  onClick,
}: {
  icon: ComponentType
  label: string
  onClick?: () => void
}) {
  return (
    <button type="button" className="settings-row settings-row--button" onClick={onClick}>
      <span className="settings-row__icon">
        <IconComp />
      </span>
      <span className="settings-row__label">{label}</span>
      <span className="settings-row__chevron">
        <Icon.ChevronLeft />
      </span>
    </button>
  )
}

// A row that ends with an on/off switch.
function ToggleRow({
  icon: IconComp,
  label,
  checked,
  onChange,
}: {
  icon: ComponentType
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="settings-row">
      <span className="settings-row__icon">
        <IconComp />
      </span>
      <span className="settings-row__label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`settings-switch${checked ? ' settings-switch--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="settings-switch__thumb" />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  // shortcut: switches only live in memory and reset on reload; save them to the backend once it has a settings API.
  const [push, setPush] = useState(false)
  const [email, setEmail] = useState(false)

  return (
    <AppLayout title="Pengaturan">
      <div className="settings-page">
        <Group id="settings-account" title="Profil & Akun">
          {/* The only row that opens another page. */}
          <LinkRow icon={Icon.Profile} label="Detail Profil" onClick={() => navigate('/profile')} />
          <LinkRow icon={Icon.Upload} label="Riwayat Unggahan" />
        </Group>

        <Group id="settings-notifications" title="Pengaturan Notifikasi">
          <ToggleRow icon={Icon.Bell} label="Notifikasi Push" checked={push} onChange={setPush} />
          <ToggleRow icon={Icon.Mail} label="Notifikasi Email" checked={email} onChange={setEmail} />
        </Group>

        <Group id="settings-others" title="Lainnya">
          <LinkRow icon={Icon.Profile} label="Hubungi Dukungan" />
        </Group>

        <p className="settings-version">Versi 1.0.0</p>
      </div>
    </AppLayout>
  )
}
