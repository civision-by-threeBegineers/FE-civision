# Server-side per-column sorting for the Detail Laporan table

The report table can now be sorted on the server by Lokasi, Tanggal, Waktu, Media and Status, in either direction. The BE accepts a whitelisted `sortBy`/`sortDir` on `GET /api/reports` and maps it to a fixed Prisma `orderBy` with a `createdAt desc, id desc` tiebreaker. The FE keeps one `{column, dir}` state in `useReports`, sends it with every page fetch, resets to page 1 on change, and renders a `<button>` inside each sortable `<th>` with a "v" chevron that turns to "^" for ascending. The default is still Tanggal descending (newest first), and `reportNumber` is back on the forward formula.

Watch for: `#` is not sortable (planned decision D3, but the user said "semua kolom"; it has to be explained to the user) (confirmed). Waktu sorts by the full timestamp, not by time of day (confirmed). Neither one blocks the change.

**Verdict**: APPROVED

## High-level view

Sorting happens in the backend, so it covers all pages and not only the visible rows. `parseSort` only accepts the four whitelisted strings and exactly `asc`/`desc`. Anything else, including arrays, other casing and injection-like strings, returns a 400 with a Bahasa Indonesia message. `violationOrderBy` builds `orderBy` from a switch, so no raw query value reaches Prisma. With no params the order is the same as before (`createdAt desc, id desc`). The repository still uses the batch-array `$transaction`.

On the FE, only one column is active at a time. Clicking the active column flips the direction, and clicking another column makes it active starting at desc. The active `<th>` gets `aria-sort`, a dark background and a fully opaque arrow. Inactive arrows show at 0.45 opacity. Focus-visible and reduced-motion styles are in place, and all CSS uses the `report-table__` prefix. The Dashboard ReviewTable shares `useReports`, so it now sends `sortBy=createdAt&sortDir=desc` explicitly. That matches the default, so its order does not change. The stat cards still come from `ReportService.stats()` and do not depend on the sort.

The table features from earlier work are still there: map pages, `MapReportPanel`, `ReportStatusDetails`, settings and the translation are all already in HEAD and not touched by this diff. Nothing was committed or pushed. Tests cover `nextSort`, `DEFAULT_SORT` and the Tanggal/Waktu → `createdAt` mapping, and the restored `reportNumber` cases. The BE was checked with a temporary assert script and live requests, but the BE has no permanent test file.

<details>
<summary>Issues (4)</summary>

1. **`#` column not sortable** (confirmed): the user asked for all columns, but `COLUMNS` leaves `#` without `sort` (plan D3: it is the row position, so sorting it changes nothing). The final summary must tell the user this explicitly. Non-blocking.
2. **Waktu = full timestamp** (confirmed): `SORT_FIELD.waktu` is `createdAt`, so Waktu sorts the same way as Tanggal. Mention it to the user. Sorting by time of day would need a separate BE field. Non-blocking.
3. **Rows keep their place after a status change while sorted by Status** (likely): `applyStatusChange` updates the row in place, so the page is out of order until the next fetch. Accept it, or call `reload()` after `changeStatus` when `sort.column === 'status'`. Non-blocking.
4. **No permanent BE test for `parseSort`/`violationOrderBy`** (confirmed): the assert self-check was deleted after it ran. Adding it as a kept test would cover the trust-boundary whitelist. Non-blocking.

</details>

<details>
<summary>Details</summary>

### Whitelist at the trust boundary

`parseSort` runs inside the controller's existing try, so a `ReportError` takes the same 400 path as pagination errors. A missing param falls back to `createdAt`/`desc`. A repeated param arrives as an array and fails the `typeof === 'string'` check. `ASC` fails the strict comparison. The repository switch returns literal objects, and the typed `SortParams` covers every case, so an unknown value cannot reach `orderBy`. Location sorting puts rows without an address last (`nulls: "last"`). The live data had no such rows, so that part was only checked by the self-check.

```
FE header click → nextSort → useReports {column,dir}
   → SORT_FIELD[column] → ?sortBy=&sortDir= → parseSort (400 on bad input)
   → violationOrderBy → prisma.$transaction([findMany(orderBy), count])
```

### Shared Tanggal/Waktu field and the single-active rule

Both columns map to `createdAt`, but `nextSort` compares UI columns, not fields. Going from Tanggal asc to Waktu therefore resets to desc, and Waktu becomes the only active header even though the order is the same field. This keeps the "one active column" rule. Waktu never sorts by time of day, and the user needs to hear that.

### Status sort and in-place edits

While Status is the active sort, changing a row from the verification dropdown or `EditReportDialog` updates it in place through `applyStatusChange`. The row stays where it was until the next page change or reload. This is likely fine for a review workflow, but the sorted view can look wrong right after an edit.

### Deployment order

If the FE ships before the BE, the old BE ignores the unknown params and returns the default order. The headers would then show a sort that is not actually applied. This does not break anything, and the plan already includes it in the user-facing risks.

### Test coverage

FE vitest covers the `nextSort` transitions and the default, and `reportNumber` checks 00001/00011/00023 again. Not tested: the header rendering and `aria-sort` (no component test), keyboard activation in a browser, the BE whitelist as a kept test, and nulls-last against real mixed data.

</details>

<details>
<summary>File map</summary>

BE-civision: `controller/report.controller.ts` (calls parseSort), `interface/report.interface.ts` (SortParams types), `repository/report.repository.ts` (violationOrderBy, batch transaction kept), `service/report.service.ts` (parseSort whitelist, listTable sort arg).

FE-civision: `services/report/getReports.ts` (optional sortBy/sortDir), `feat-report/reportState.ts` (+ test) (sort types, DEFAULT_SORT, SORT_FIELD, nextSort), `feat-report/useReports.ts` (sort state, changeSort → page 1), `feat-report/ReportTable.tsx` (sortable headers), `feat-report/ReportTable.css` (sort header styles).

Full diff: `git diff` in each repo (uncommitted).

</details>
