import { AppLayout } from '../../components/AppLayout'
import { Icon } from '../../components/Icons'
import './ProfilePage.css'

/* ---------- Mock data (replace with the logged-in user from the API later) ---------- */
const USER = {
  name: 'John Doe',
  role: 'Inspektur',
  employeeId: '85040123',
  phone: '+6281234567890',
  email: 'john.doe@gmail.com',
  // Set to an imported image (e.g. import photo from '../../assets/profile.jpg')
  // to show a photo. While it's null, the avatar shows the user's initials.
  photoUrl: null as string | null,
}

const STATS = [
  { key: 'validated', value: 1251, label: 'Total Laporan Tervalidasi' },
  { key: 'uploads', value: 130, label: 'Total Unggahan' },
  { key: 'tasks', value: 10, label: 'Tugas Aktif' },
]

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

export default function ProfilePage() {
  return (
    // hero: purple band behind the topbar, like the design
    <AppLayout title="Profil" hero>
      <section className="profile-card" aria-labelledby="profile-name">
        <div className="profile-card__head">
          <div className="profile-avatar">
            {USER.photoUrl ? (
              <img src={USER.photoUrl} alt={`Foto ${USER.name}`} />
            ) : (
              <span className="profile-avatar__initials" aria-hidden="true">
                {initials(USER.name)}
              </span>
            )}
          </div>

          <div className="profile-info">
            <h2 id="profile-name" className="profile-info__name">
              {USER.name}
            </h2>
            <p className="profile-info__role">
              {USER.role}, {USER.employeeId}
            </p>
            <ul className="profile-info__contacts">
              <li>
                <a href={`tel:${USER.phone}`}>
                  <Icon.Phone />
                  {USER.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${USER.email}`}>
                  <Icon.Mail />
                  {USER.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <dl className="profile-stats">
          {STATS.map((stat) => (
            <div key={stat.key} className="profile-stat">
              <dt className="profile-stat__label">{stat.label}</dt>
              <dd className="profile-stat__value">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </AppLayout>
  )
}
