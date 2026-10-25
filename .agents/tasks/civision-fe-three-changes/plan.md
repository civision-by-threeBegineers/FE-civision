# Implementation Plan — CiVision FE: /map route, Report status cell, Indonesian UI

Repo: `c:\Project Pribadi\Lomba AI PKL\FE-civision` (branch `main`, work in the working copy, no worktree).
Commands (from package.json): `npm run typecheck` (tsc --noEmit), `npm test` (vitest --run, only `src/**/*.test.ts`), `npm run build` (vite build).
Baseline before any change: `npm test` → 4 test files, 17 tests passing; `npm run typecheck` → clean.

Hard rules for the implementer:
- DO NOT commit, DO NOT push, DO NOT `git stash`/`reset`/`checkout`/`clean`. The user tests first.
- Do not stage or delete `.agents/` (this plan lives there; it is not gitignored).
- Do not edit `dist/`.
- Never change: identifiers, API field names/values (`valid` / `invalid` / `unverified` stay as values), CSS class names, route paths other than `/map`, brand `CiVision`/`Civision`, code comments (except the two route comments named below), person names/emails in mock data.

## Finding that changes step 0

`git status` shows only `src/pages/feat-settings/` (untracked). The Settings edits to `src/App.tsx` and `src/components/Sidebar.tsx` are NOT in the working copy: they were stashed (`stash@{0}: WIP on main: a1015d0`, reflog `reset: moving to HEAD`) before the fast-forward pull to `f77442c`. The stash holds exactly:
- `src/App.tsx`: `import SettingsPage from './pages/feat-settings/SettingsPage'` + `<Route path="/settings" element={<SettingsPage />} />`
- `src/components/Sidebar.tsx`: Settings item gets `to: '/settings'`

Decision: re-apply these two edits by hand (not `git stash pop/apply`): HEAD's App.tsx gained the `/model-diagnostic` route since the stash base, so apply could conflict, and pop would drop the stash. Leave `stash@{0}` in place; tell the user it still exists.

---

- [ ] 0. Restore the Settings wiring from the stash by hand.
      In `src/App.tsx` add `import SettingsPage from './pages/feat-settings/SettingsPage'` (after the ProfilePage import) and `<Route path="/settings" element={<SettingsPage />} />` (after `/profile`). In `src/components/Sidebar.tsx` change the settings item to `{ key: 'settings', label: 'Settings', icon: Icon.Settings, to: '/settings' }`. Keep `/model-diagnostic` route. Do not touch `src/pages/feat-settings/*` content in this item.
      Files: src/App.tsx, src/components/Sidebar.tsx
      Verify: `npm run typecheck` clean; `npm test` → 4 files / 17 passed.

## Task 1 — Map on its own route `/map`

Decisions:
- Redirect: keep `/dashboard/map` as `<Route path="/dashboard/map" element={<Navigate to="/map" replace />} />`. One line, old bookmarks/history keep working, `replace` keeps Back from bouncing into the redirect.
- MapPage back button + Escape: keep `goBack` → `/dashboard` with `state: { focusMap: true }`. The map is still opened mainly from the dashboard card, Dashboard.tsx already restores focus to the card from that state, and the sidebar (with the new Peta item) is always available for other navigation. Switching to `navigate(-1)` would change behavior the user didn't ask about.
- Icon: reuse `Icon.Pin` (existing map-pin in `src/components/Icons.tsx`; no other map/location icon exists in `src/components/`). Pin's svg is 14×14 while sidebar icons are 18×18, so add one CSS rule `.nav-item svg { width: 18px; height: 18px; flex: none; }` in `src/components/AppLayout.css` (all other nav icons are already 18, so they don't change). No new icon needed.
- Active state: NavLink `to="/map"` is active at `/map`. `/dashboard` is no longer a prefix of the map URL, so Dashboard is not also highlighted there.

- [ ] 1. Move the map route, redirect the old path, point the dashboard card at `/map`, add the sidebar item.
      - `src/App.tsx`: import `Navigate` from `react-router-dom`; `<Route path="/map" element={<MapPage />} />`; replace the old `/dashboard/map` route with the `<Navigate to="/map" replace />` route above.
      - `src/pages/feat-dashboard/Dashboard.tsx`: `const openMap = () => navigate('/map')`.
      - `src/pages/feat-maps/MapPage.tsx`: update the comment `(/dashboard/map)` → `(/map)`; goBack unchanged.
      - `src/components/Sidebar.tsx`: in `NAV_TOP` insert right after dashboard: `{ key: 'map', label: 'Maps', icon: Icon.Pin, to: '/map' }` (label becomes 'Peta' in item 3).
      - `src/components/AppLayout.css`: add the `.nav-item svg` sizing rule.
      Files: src/App.tsx, src/pages/feat-dashboard/Dashboard.tsx, src/pages/feat-maps/MapPage.tsx, src/components/Sidebar.tsx, src/components/AppLayout.css
      Verify: `npm run typecheck` clean; `npm test` 17 passed. (Only remaining `/dashboard/map` in src must be the redirect route and `services/dashboard/mapData.ts`'s backend endpoint `/api/dashboard/map`, which must NOT change.)

## Task 2 — Status cell in Report Details

Current code (`src/pages/feat-report/ReportTable.tsx`): every row shows a `<select>` status picker (dot + label + `Icon.ChevronDown` arrow) that saves immediately via `changeStatus`, PLUS a pencil button that opens `EditReportDialog` with Valid / Invalid / Unverified buttons that also call `changeStatus`, PLUS the PDF link. Two controls doing the same thing = the redundancy.

Decision (closest to the user's rules, keeps verification):
- `unverified` row: keep the `<select>` picker with its dropdown arrow (this is how the officer verifies), NO pencil.
- `valid` / `invalid` row: show a static badge (same pill colors + dot, label text, no `<select>`, no `Icon.ChevronDown`) + the pencil button. The pencil opens the existing `EditReportDialog`, where the status can still be changed (including back to Belum Diverifikasi).
- PDF link stays on every row.
- No changes to `useReports.ts`, `reportState.ts`, `updateReportStatus.ts`, `ReportPage.tsx` logic (status values/API unchanged). Dashboard's `ReviewTable` is read-only already; untouched by this task.

- [ ] 2. Render the status cell by status.
      - `src/pages/feat-report/ReportTable.tsx`: inside `.report-table__status-cell`, if `row.status === 'unverified'` render the existing `<span className="report-status-pick report-status-pick--unverified">` with dot, `<select>` and `<Icon.ChevronDown />` (unchanged) and no pencil. Otherwise render `<span className={`report-status-pick report-status-pick--${row.status}`}>` with the dot and `<span className="report-status-pick__label">{STATUS_LABELS[row.status]}</span>`, followed by the existing pencil `<button>` (keep aria-label/title, keep `clearStatusError(); setEditingId(row.id)`). PDF `<a>` unchanged after both. Update the component comment above `ReportTable` to describe: unverified → pick in the row; valid/invalid → pencil opens the dialog.
      - `src/pages/feat-report/ReportTable.css`: add `.report-status-pick__label { padding: 5px 10px 5px 22px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }` (matches select padding minus the arrow space). Widen for the longer Indonesian label 'Belum Diverifikasi': `.report-status-pick` `max-width: 124px` → `160px`; in the `@container (max-width: 800px)` block `th:nth-child(6)` `200px` → `230px`; in the phones block `.report-table` `min-width: 720px` → `750px`.
      - Accessibility: the select keeps `aria-label={`Status laporan ${number}`}`; the pencil keeps its aria-label + focus-visible outline (already styled). The badge is plain text, not focusable.
      Files: src/pages/feat-report/ReportTable.tsx, src/pages/feat-report/ReportTable.css
      Verify: `npm run typecheck` clean; `npm test` 17 passed. No unit test added: the change is a JSX branch and the project has no DOM test setup (vitest runs node-only `*.test.ts`); behavior is checked in the later browser-verify step.

## Task 3 — All visible text to Indonesian

Status labels everywhere: `valid` → 'Valid', `invalid` → 'Tidak Valid', `unverified` → 'Belum Diverifikasi' (ViolationMap already uses these).
Term choices: Dashboard → 'Dasbor', Report → 'Laporan', Upload → 'Unggah', Timestamp column → 'Waktu', Email stays 'Email'.
Kept as-is (decided): brand 'Civision'/'CiVision' incl. `<title>Civision</title>` (brand only, nothing to translate); OSM attribution `&copy; OpenStreetMap contributors` (license attribution text); `services/yolo/session.ts` ModelLoadError messages (never shown: UploadPage `friendlyError` maps them to Indonesian); `services/violation/submitViolation.ts` (unused) and `violationRule.ts` (developer error); model class names on the canvas ('gerobak' already Indonesian); anything already Indonesian (CameraCapture, map popup, MapPage notices, services/report, services/upload, mapData).

- [ ] 3. Translate shell + navigation + dashboard + maps + report.
      - `index.html`: `<html lang="en">` → `<html lang="id">`; also close the truncated last tag `</html` → `</html>`.
      - `src/components/Sidebar.tsx`: 'Dashboard'→'Dasbor', 'Maps'→'Peta', 'Report Details'→'Detail Laporan', 'Upload Media'→'Unggah Media', 'Profile'→'Profil', 'Settings'→'Pengaturan', 'Get Help'→'Bantuan', aria 'Close menu'→'Tutup menu', 'Logout'→'Keluar'.
      - `src/components/AppLayout.tsx`: aria 'Open menu'→'Buka menu'.
      - `src/components/Topbar.tsx`: 'Open menu'→'Buka menu', 'Notifications'→'Notifikasi', 'Profile'→'Profil'.
      - `src/pages/feat-dashboard/Dashboard.tsx`: title 'Dashboard'→'Dasbor'; 'Good Morning, John Doe'→'Selamat Pagi, John Doe'; `You currently have <a href="#incidents">10 new incidents</a> queued up for review.` → `Saat ini ada <a href="#incidents">10 insiden baru</a> yang menunggu untuk ditinjau.`; `Let&apos;s tackle them!`→'Ayo selesaikan!'; 'Review It'→'Tinjau Sekarang'; 'Review Progress'→'Progres Peninjauan'; placeholder 'Search something...'→'Cari sesuatu...'; aria 'Search review progress'→'Cari progres peninjauan'; aria 'Search'→'Cari'.
      - `src/pages/feat-dashboard/ReviewTable.tsx`: headers 'Location'→'Lokasi', 'Timestamp'→'Waktu', 'Status' stays; STATUS_LABELS invalid→'Tidak Valid', unverified→'Belum Diverifikasi'.
      - `src/pages/feat-maps/MapPage.tsx`: aria 'Kembali ke dashboard'→'Kembali ke dasbor'.
      - `src/pages/feat-maps/MapControls.tsx`: placeholder 'Search something...'→'Cari lokasi...'; TIME_RANGE_OPTIONS 'Daily'→'Harian', 'Weekly'→'Mingguan', 'Monthly'→'Bulanan' (values unchanged).
      - `src/pages/feat-report/ReportPage.tsx`: title 'Detail Laporan'; stat labels 'Total Laporan', 'Laporan Valid', 'Laporan Tidak Valid', 'Laporan Belum Diverifikasi'.
      - `src/pages/feat-report/ReportTable.tsx`: STATUS_LABELS invalid→'Tidak Valid', unverified→'Belum Diverifikasi'; headers 'Location'→'Lokasi', 'Date'→'Tanggal', 'Timestamp'→'Waktu' ('#', 'Media', 'Status' stay); 'Link'→'Tautan'; pencil aria `Edit laporan ${number}`→`Ubah status laporan ${number}`, title 'Edit laporan'→'Ubah status laporan'; pagination aria 'Report pages'→'Halaman laporan', 'Next page'→'Halaman berikutnya'.
      - `src/pages/feat-report/EditReportDialog.tsx`: STATUS_BUTTONS labels 'Valid' / 'Tidak Valid' / 'Belum Diverifikasi'; heading 'Edit Report'→'Ubah Status Laporan'; dt 'ID Report'→'ID Laporan', 'Location'→'Lokasi', 'Coordinate'→'Koordinat', 'Date'→'Tanggal', 'Timestamp'→'Waktu' ('Media' stays); hint `Status saat ini: ${row.status}` → show the label instead of the raw value: `Status saat ini: ${STATUS_BUTTONS.find((b) => b.status === row.status)?.label ?? row.status}`.
      Files: index.html, src/components/Sidebar.tsx, src/components/AppLayout.tsx, src/components/Topbar.tsx, src/pages/feat-dashboard/Dashboard.tsx, src/pages/feat-dashboard/ReviewTable.tsx, src/pages/feat-maps/MapPage.tsx, src/pages/feat-maps/MapControls.tsx, src/pages/feat-report/ReportPage.tsx, src/pages/feat-report/ReportTable.tsx, src/pages/feat-report/EditReportDialog.tsx
      Verify: `npm run typecheck` clean; `npm test` 17 passed.

- [ ] 4. Translate login, help, notifications, profile, settings, upload, diagnostic.
      - `src/pages/feat-login/LoginPage.tsx`: 'Welcome Back!'→'Selamat Datang Kembali!'; placeholder 'Password'→'Kata Sandi' ('Email' stays); aria 'Hide password'/'Show password'→'Sembunyikan kata sandi'/'Tampilkan kata sandi'; 'Forgot Password?'→'Lupa Kata Sandi?'; 'Log In'→'Masuk'; `Having trouble signing in? <a href="#support">Get Support.</a>` → `Kesulitan masuk? <a href="#support">Hubungi Bantuan.</a>`.
      - `src/pages/feat-help/HelpPage.tsx`: aria 'Back to dashboard'→'Kembali ke dasbor'; heading `How can we<br />help you today?` → `Ada yang bisa kami<br />bantu hari ini?`; placeholder 'Type Your Questions...'→'Tulis pertanyaan Anda...'; aria 'Your question'→'Pertanyaan Anda'; 'Send'→'Kirim'.
      - `src/pages/feat-notification/NotificationPage.tsx`: AppLayout title and `<h1>` 'Notification'→'Notifikasi'; mock titles 'New Report Added'→'Laporan Baru Ditambahkan', 'Report Verified'→'Laporan Terverifikasi', 'Frequent Reports Detected'→'Laporan Berulang Terdeteksi'; mock messages 'New food stall reported at Jl. KH. Mas Mansyur.'→'Gerobak PKL baru dilaporkan di Jl. KH. Mas Mansyur.', 'Your food stall report on Jl. KH. Mas Mansyur has been approved.'→'Laporan gerobak PKL Anda di Jl. KH. Mas Mansyur telah disetujui.', 'Persistent food stall reports at Coordinate : -6.1925, 106.7695'→'Gerobak PKL terus dilaporkan di koordinat: -6.1925, 106.7695'; tabs 'View All'→'Semua', 'Today'→'Hari Ini', 'This Week'→'Minggu Ini'; `timeAgo` → `${hours} jam lalu` / `${days} hari lalu` (drop plural logic); aria 'Back'→'Kembali', 'Filter notifications'→'Filter notifikasi', `${unread} unread`→`${unread} belum dibaca`; 'No notifications.'→'Tidak ada notifikasi.'; list aria `${activeTab.label} notifications`→`Notifikasi ${activeTab.label}`; hidden 'Unread'→'Belum dibaca'.
      - `src/pages/feat-profile/ProfilePage.tsx`: title 'Profile'→'Profil'; role 'Inspector'→'Inspektur' (name/email/phone unchanged); STATS 'Total Validated Reports'→'Total Laporan Tervalidasi', 'Total Uploads'→'Total Unggahan', 'Active Task'→'Tugas Aktif'; alt `Photo of ${USER.name}`→`Foto ${USER.name}`.
      - `src/pages/feat-settings/SettingsPage.tsx` (user's uncommitted file: only change strings): title 'Settings'→'Pengaturan'; 'Profile & Account'→'Profil & Akun'; 'Profile Details'→'Detail Profil'; 'Upload History'→'Riwayat Unggahan'; 'Notification Settings'→'Pengaturan Notifikasi'; 'Push Notification'→'Notifikasi Push'; 'Email Notification'→'Notifikasi Email'; 'Others'→'Lainnya'; 'Contact Support'→'Hubungi Dukungan'; 'Version 1.0.0'→'Versi 1.0.0'.
      - `src/pages/feat-upload/UploadPage.tsx`: title 'Upload Media'→'Unggah Media'; errors `: only JPG and PNG files are allowed.`→`: hanya file JPG dan PNG yang diperbolehkan.`, `: file is larger than 10MB.`→`: ukuran file lebih dari 10MB.`; 'Drop Your Photos!'→'Letakkan Foto Anda di Sini!'; '*Accepted formats: JPG, PNG (Max 10MB per file)'→'*Format yang diterima: JPG, PNG (maks. 10MB per file)'; 'Add Files'→'Tambah File'; 'Use Camera'→'Gunakan Kamera'; aria 'Selected files'→'File terpilih'; aria `Remove ${file.name}`→`Hapus ${file.name}`; 'Submit'→'Kirim'; 'Detection Result'→'Hasil Deteksi'; `{totalDetections} total detection{s}` → `{totalDetections} deteksi total` (drop plural); 'Lihat Report'→'Lihat Laporan'.
      - `src/pages/feat-upload/DetectionResult.tsx`: 'No Detection'→'Tidak Ada Deteksi'; `${n} Detection${s}`→`${n} Deteksi`.
      - `src/services/yolo/preprocessing.ts`: `'The image has no dimensions yet. Wait for it to finish loading.'` → `'gambar belum selesai dimuat, coba lagi.'` (surfaces in the upload error list via friendlyError as `file.jpg: <message>`).
      - `src/pages/model-diagnostic.tsx` (dev page at /model-diagnostic, still visible web text): 'Model Diagnostic'→'Diagnostik Model'; intro → `Memuat <code>…</code> langsung lewat ONNX Runtime dan menampilkan error aslinya.`; '⏳ Checking...'→'⏳ Memeriksa...', '✅ Model loaded'→'✅ Model berhasil dimuat', '❌ Model failed to load'→'❌ Model gagal dimuat'; table 'File size'→'Ukuran file', 'First bytes'→'Byte awal', 'WebGPU available'→'WebGPU tersedia', 'yes'/'no'→'ya'/'tidak', 'Expected input name'→'Nama input yang diharapkan'; 'File error:'→'Error file:'; 'Backend attempts'→'Percobaan backend'; '✅ ok'/'❌ failed'→'✅ berhasil'/'❌ gagal'; 'Session created successfully.'→'Sesi berhasil dibuat.'; `HTTP ${res.status} fetching ${path}`→`HTTP ${res.status} saat mengambil ${path}`; 'File starts with "<" — server returned HTML, not an ONNX model.'→'File diawali "<": server mengembalikan HTML, bukan model ONNX.'; `'\n  ↳ caused by: '`→`'\n  ↳ disebabkan oleh: '`; 'How to read this:'→'Cara membaca hasil ini:' and translate the 4 list items keeping the `<code>` tokens (`08`, `3c`, `opset`, `is not implemented`, `protobuf` / `parse`) unchanged. Leave 'Status:' as is.
      Files: src/pages/feat-login/LoginPage.tsx, src/pages/feat-help/HelpPage.tsx, src/pages/feat-notification/NotificationPage.tsx, src/pages/feat-profile/ProfilePage.tsx, src/pages/feat-settings/SettingsPage.tsx, src/pages/feat-upload/UploadPage.tsx, src/pages/feat-upload/DetectionResult.tsx, src/services/yolo/preprocessing.ts, src/pages/model-diagnostic.tsx
      Verify: `npm run typecheck` clean; `npm test` 17 passed.

- [ ] 5. Final sweep and full verification.
      Search `src/**/*.tsx` for leftover English UI strings (JSX text, `placeholder=`, `aria-label=`, `title=`, `alt=`, `label:`), fixing any missed user-visible text under the rules above. Run the full checks. Then `git status --short` must show only: modified files listed in items 0–4, untracked `src/pages/feat-settings/` and `.agents/`; nothing staged, no commits; `git stash list` still shows `stash@{0}`.
      Tests to update: none. The 4 test files (`reportState.test.ts`, `mapData.test.ts`, `deviceLocation.test.ts`, `manualCoordinate.test.ts`) assert only status values, numbers and coordinate/accuracy formats, none of which change.
      Files: any stragglers found
      Verify: `npm run typecheck` clean; `npm test` → 4 files / 17 passed (same as baseline); `npm run build` succeeds.

## For the final report to the user (requested format)

The user asked for: 1) simple summary, 2) list of touched files, 3) specific manual test steps with expected results, 4) explicit list of features at risk BEFORE testing, and to wait for confirmation. Risks to flag:
- Settings route/sidebar link were in `git stash@{0}`, re-applied by hand; the stash still exists (don't `stash pop` it on top, it would duplicate/conflict).
- Report table status column: wider labels and new layout; check desktop, Dashboard-width and phone widths.
- Changing status: unverified via dropdown, valid/invalid via pencil → dialog (incl. back to Belum Diverifikasi); stat cards must update.
- Dashboard map card → `/map`; Back/Escape on the map → `/dashboard` with focus on the map card; old `/dashboard/map` URL redirects.
- Longer Indonesian labels could wrap/clip on buttons (Login 'Masuk', Upload buttons, notification tabs, map time filter, sidebar).
- Pre-existing, out of scope (not fixed): `isSameFile` in UploadPage.tsx has braces without `return`, so duplicate-file detection never matches.
