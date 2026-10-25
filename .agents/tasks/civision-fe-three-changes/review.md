# Standalone /map route, read-only verified status badge, and Indonesian UI copy

The full-screen violation map moves from `/dashboard/map` to `/map`, gets a "Peta" sidebar entry (reusing `Icon.Pin`), and the old path redirects with `<Navigate replace>`. In the report table, unverified rows keep the inline status `<select>` with no pencil, while valid/invalid rows render a read-only badge (no chevron) plus a pencil that opens the edit dialog. All user-visible copy, aria-labels, placeholders and alt text are translated to Indonesian, with the three status labels consistent across ReportTable, ReviewTable, EditReportDialog and the stat cards. Identifiers, API values, CSS classes, routes other than `/map`, the CiVision brand, and mock names/emails are unchanged. The uncommitted Settings work (`/settings` route, `SettingsPage`, sidebar `to: '/settings'`) is still in place, and HEAD is still `f77442c` = `origin/main`, so nothing was committed or pushed.

Watch for: after a keyboard user picks a status in the unverified `<select>`, the select unmounts and focus drops to `<body>` (confirmed, non-blocking). The map page's back button and Escape always go to the dashboard, even when the user came from the new sidebar entry (likely, non-blocking).

**Verdict**: APPROVED

## High-level view

The routing change is small. `/map` renders `MapPage` inside `AppLayout`, so the sidebar shows "Peta" as active, and `/dashboard/map` redirects with `replace`, which keeps old bookmarks working without leaving an extra history entry. The dashboard preview card calls `navigate('/map')`, and the focus-restore handshake (`state.focusMap`) still works. A new `.nav-item svg` rule sizes every nav icon to 18px so the 14px Pin icon matches the others.

The status cell now branches on `row.status`. Unverified rows can still be verified straight from the row. Valid/invalid rows can only be changed through the pencil and the dialog. The dialog's hint line now shows the translated label instead of the raw API value. Column widths grew a little to fit "Belum Diverifikasi".

The translation covers every page, including the dev-only `/model-diagnostic` page and two error strings. The English that remains is documented in verification.md (brand, loanwords like Status/Media/Filter/PDF, code tokens, OSM attribution), and spot greps found no other English in user-facing text. `index.html` now declares `lang="id"`, which helps screen readers pronounce the copy.

Verification evidence is present: `tsc --noEmit` passed with 0 errors, `vite build` passed, and vitest passed 17/17, the same count as before the change. No browser check was done yet. Layout of the longer labels is left for the verify step.

<details>
<summary>Issues (2)</summary>

1. **Focus lost after inline verify** — when a status is picked in the unverified `<select>`, the row switches to the badge + pencil and the focused select unmounts, so a keyboard user's focus falls to `<body>`. Move focus to the new pencil button for that row after a successful change (non-blocking).
2. **Map back/Escape assumes the user came from the dashboard** — `/map` is now a top-level sidebar destination, but `goBack` always goes to `/dashboard` and the button says "Kembali ke dasbor". This is acceptable as-is. If it confuses users, consider `navigate(-1)` when there is history (non-blocking).

</details>

<details>
<summary>Details</summary>

### Status cell branching in ReportTable

```
unverified → [● <select>(Valid|Tidak Valid|Belum Diverifikasi) ▾]   (no pencil)
valid/invalid → [● label]  [✎ "Ubah status laporan N"]               (no chevron)
```

The one regression is keyboard focus (confirmed). `changeStatus` changes `row.status`, which swaps the whole subtree, so the element that had focus disappears. Before this change the same `<select>` stayed mounted for every status, so focus was never lost. Sighted mouse users won't notice. Keyboard and screen-reader users have to tab again from the top of the document. A small fix is to record the row id that was just verified and focus that row's pencil in an effect once `savingId` clears.

### /map as a sidebar destination

`MapPage` still treats itself as a child of the dashboard. `goBack` navigates to `/dashboard` with `focusMap: true`, the back button is labelled "Kembali ke dasbor", and Escape (when no popup or dropdown is open) runs `goBack`. This used to make sense when the page was only reachable from the dashboard card. Now it can be opened from the sidebar on any page, so opening it as Detail Laporan → Peta and pressing Escape or back lands on the dashboard, not on Detail Laporan (likely). This doesn't break anything and isn't part of the request, so it is noted rather than blocking.

### Translation consistency

The status labels are identical in all four places they appear (`ReportTable`, `ReviewTable`, `EditReportDialog` buttons, `ReportPage` stat cards), and API values (`valid`/`invalid`/`unverified`, `daily`/`weekly`/`monthly`) are untouched. Plural logic was simplified correctly for Indonesian (`N jam lalu`, `N Deteksi`). `preprocessing.ts` now throws a lowercase Indonesian message. If that error reaches the UI through `friendlyError`, it should be checked in the browser, but it isn't a correctness problem.

</details>

<details>
<summary>File map</summary>

- `src/App.tsx`: `/map` route, `/dashboard/map` → `Navigate replace`, plus the `/settings` route from the earlier Settings work
- `src/components/Sidebar.tsx`: "Peta" item with `Icon.Pin`, Indonesian labels, settings `to: '/settings'`
- `src/components/AppLayout.css`: uniform 18px nav icon size
- `src/components/AppLayout.tsx`, `Topbar.tsx`: aria-labels translated
- `src/pages/feat-dashboard/Dashboard.tsx`: `openMap` → `/map`, copy translated
- `src/pages/feat-dashboard/ReviewTable.tsx`: status labels and headers
- `src/pages/feat-report/ReportTable.tsx` / `.css`: status cell branching, badge style, wider status column
- `src/pages/feat-report/EditReportDialog.tsx`, `ReportPage.tsx`: labels, translated hint
- `src/pages/feat-maps/MapPage.tsx`, `MapControls.tsx`: comment, aria-label, placeholder, time-range labels
- `src/pages/feat-{help,login,notification,profile,upload}/*`, `model-diagnostic.tsx`, `services/upload/uploadPhotos.ts`, `services/yolo/preprocessing.ts`: copy translated
- `index.html`: `lang="id"`
- `src/pages/feat-settings/` (untracked): Settings page, preserved

Full diff: `git diff` in `FE-civision`.

</details>
