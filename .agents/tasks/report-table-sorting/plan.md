# Implementation Plan: sort the Detail Laporan table (BE + FE)

Rules for the implementer: NO commit, NO push, NO git stash/reset/checkout. Use hand edits only. Both repos were already `git pull`ed (fast-forward, no conflicts). The FE working copy has 3 modified files (reportState.ts, reportState.test.ts, ReportTable.tsx) that this plan edits on purpose.

Repos (absolute paths, they contain spaces, so quote them):
- BE: `c:\Project Pribadi\Lomba AI PKL\BE-civision` (no test runner; typecheck = `npx tsc --noEmit -p .`, currently clean)
- FE: `c:\Project Pribadi\Lomba AI PKL\FE-civision` (`npm run typecheck`, `npm test` = vitest --run, `npm run build`)

## Decisions

- D1. Sorting runs on the server, because pagination is server-side (sorting only the visible page is wrong). GET /api/reports gets 2 optional query params: `sortBy` and `sortDir`. No params gives the current order: createdAt desc, id desc.
- D2. Column to sort field (whitelist `sortBy` values): Lokasi = `location` (Violation.address), Tanggal = `createdAt`, Waktu = `createdAt`, Media = `media` (analysis.media.originalName), Status = `status`. Waktu uses createdAt too: a time-of-day-only sort in Asia/Jakarta needs raw SQL, which Prisma orderBy cannot express; Tanggal and Waktu together are one timestamp, so both sort by it. The FE still tracks which of the two headers was clicked, so only the clicked one is highlighted.
- D3. The `#` column is NOT sortable. It is the row position in the current order (00001 at the top always), so sorting by it would change nothing visible. Tell the user this in the final summary.
- D4. Lokasi: `{ address: { sort: dir, nulls: 'last' } }`. Rows without an address show coordinates in the table; they go to the end in both directions so they never crowd the top. Prisma 7 supports `nulls` for optional fields (generated type `SortOrderInput` checked).
- D5. Media: `{ analysis: { media: { originalName: dir } } }`. Both relations are required in schema.prisma, so there are no nulls. The table shows "Tautan" with the file name as the hover title; sorting by file name is the only meaningful option.
- D6. Status: plain `{ status: dir }`. PostgreSQL sorts enums by declaration order (unverified, valid, invalid), so asc = Belum Diverifikasi, Valid, Tidak Valid; desc = the reverse. Statuses have no "big/small"; grouping is what matters, so this is accepted.
- D7. Tiebreakers for a stable page split (no duplicated/missing rows between pages): every non-date sort appends `{ createdAt: 'desc' }, { id: 'desc' }`. The createdAt sort uses `[{ createdAt: dir }, { id: dir }]` (matches the existing index for desc).
- D8. Bad input: `sortBy` not in the whitelist, `sortDir` not exactly `asc`/`desc`, or a repeated param (array) gives HTTP 400 `{ ok: false, message: "Parameter sortBy/sortDir tidak valid." }`, using the existing ReportError pattern from parsePagination. Each param is validated on its own; a missing one uses its default (`createdAt` / `desc`). Raw query values never reach orderBy: orderBy is built with a switch over the typed whitelist.
- D9. Click behavior: clicking an inactive column makes it active with `desc` (arrow "v"), the same direction everywhere. This matches the user's own words ("v = besar ke kecil") and the default state. Clicking the active column flips the direction. Any sort change jumps back to page 1.
- D10. Sort state is React state inside useReports, not in the URL. Refresh returns to the default (newest first), which is what the user asked as the default. It is also the smallest change and keeps the shared hook free of router coupling.
- D11. Dashboard stays the same. useReports always sends the sort params; the Dashboard never changes sort, so it always sends `sortBy=createdAt&sortDir=desc`, which is the default order. ReviewTable.tsx and Dashboard.tsx are not edited. An old backend ignores unknown query params, so FE and BE can be deployed in any order.
- D12. Arrow color: the header cells are already purple (`#6462b4`, white text), so a purple arrow would be invisible. Instead: the active header gets the dark brand background `var(--purple-dark)` (#2d2b6b), bold text, and a fully opaque white arrow. Inactive headers keep their background and show a white arrow at 0.45 opacity (1 on hover). This deviates from the brief's "purple arrow" only because of contrast; mention it in the summary.
- D13. Icon: reuse `Icon.ChevronDown` (looks like "v"). For asc, rotate it 180deg with CSS (looks like "^"). The transform transition is off under `prefers-reduced-motion: reduce`.
- D14. Accessibility: the sortable headers get a `<button type="button">` inside the `<th>`. The visible label stays the button name (no aria-label that would hide it), and the arrow is `aria-hidden`. The active `<th>` gets `aria-sort="descending"`/`"ascending"`; the other headers get no aria-sort. The `title` hint is in Bahasa Indonesia: active `"Urutan: besar ke kecil. Klik untuk membalik."` / `"Urutan: kecil ke besar. Klik untuk membalik."`, inactive `"Klik untuk mengurutkan berdasarkan <Label>"`. Use white `:focus-visible` outline (purple background).
- D15. Not restructured into FEAT steps: the work is one feature across 2 repos, and the user forbids commits, which the FEAT flow requires. The existing implement/review loop runs this plan.

# Steps

- [ ] 0. FE: restore the original forward numbering (hand edits, keep everything else in these files).
      - `src/pages/feat-report/reportState.ts`: put back the original `reportNumber(page, pageSize, index)` with the comment `// Running number across pages: page 2 with 10 rows per page starts at 00011.` and body `return String((page - 1) * pageSize + index + 1).padStart(5, '0')`. The `totalItems` param goes away.
      - `src/pages/feat-report/ReportTable.tsx`: `const numberOf = (index: number) => reportNumber(data?.pagination.page ?? page, pageSize, index)`.
      - `src/pages/feat-report/reportState.test.ts`: put back the original test `it('continues counting across pages', ...)` with `reportNumber(1,10,0) -> '00001'`, `(2,10,0) -> '00011'`, `(3,10,2) -> '00023'`.
      - Afterwards `git diff -- src/pages/feat-report/reportState.ts src/pages/feat-report/reportState.test.ts` must show no changes (ReportTable.tsx gets more changes in step 4).
      Files: the 3 above (FE).
      Verify (FE): `npm test` passes; `npm run typecheck` is clean.

- [ ] 1. BE: sort types + validation in the service.
      - `src/interface/report.interface.ts`: add
        `export type ReportSortBy = "createdAt" | "location" | "media" | "status";`
        `export type SortDir = "asc" | "desc";`
        `export interface SortParams { sortBy: ReportSortBy; sortDir: SortDir; }` (comment: validated `?sortBy=&sortDir=` of GET /api/reports).
      - `src/service/report.service.ts`: add constants `SORT_FIELDS: readonly ReportSortBy[] = ["createdAt", "location", "media", "status"]` and `INVALID_SORT_MESSAGE = "Parameter sortBy/sortDir tidak valid."`. Add `static parseSort(query: { sortBy?: unknown; sortDir?: unknown }): SortParams`, next to parsePagination:
        `sortBy`: undefined gives "createdAt"; a string in SORT_FIELDS is accepted; anything else (wrong value, array, object) throws `new ReportError(INVALID_SORT_MESSAGE)`. `sortDir`: undefined gives "desc"; exactly "asc" or "desc" is accepted; else throw the same error. Use `typeof raw === "string" && (SORT_FIELDS as readonly string[]).includes(raw)` to narrow the type.
      - Change `listTable({ page, pageSize }: PaginationParams, sort: SortParams)` to pass `sort` to `ReportRepository.findAllWithRelations(skip, pageSize, sort)`. Row mapping stays the same.
      Files: BE `src/interface/report.interface.ts`, `src/service/report.service.ts`.
      Verify: done together with step 2 (the repository signature must match first).

- [ ] 2. BE: orderBy built in the repository + controller wiring.
      - `src/repository/report.repository.ts`: `import type { Prisma } from "../../generated/prisma/client.js";` (same as violation.repository.ts) and `import type { SortParams } from "../interface/report.interface.js";`. Add an exported pure function:
        ```ts
        // Urutan tabel laporan. Hanya nilai whitelist (SortParams) yang sampai ke sini.
        // Pemecah seri createdAt desc, id desc: urutan stabil antar halaman.
        export function violationOrderBy({ sortBy, sortDir }: SortParams): Prisma.ViolationOrderByWithRelationInput[] {
          const newestFirst: Prisma.ViolationOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];
          switch (sortBy) {
            case "createdAt": return [{ createdAt: sortDir }, { id: sortDir }];
            case "location": return [{ address: { sort: sortDir, nulls: "last" } }, ...newestFirst];
            case "media": return [{ analysis: { media: { originalName: sortDir } } }, ...newestFirst];
            case "status": return [{ status: sortDir }, ...newestFirst];
          }
        }
        ```
        `findAllWithRelations(skip: number, take: number, sort: SortParams)` uses `orderBy: violationOrderBy(sort)`. Keep the BATCH array `prisma.$transaction([...])`; do NOT switch to an interactive transaction (it hung on Vercel). Update the comment above it.
      - `src/controller/report.controller.ts` `list`: `const sortParams = ReportService.parseSort(req.query);` right after parsePagination (inside the same try, so ReportError becomes a 400), and `ReportService.listTable(pageParams, sortParams)`. Update the route comment to `GET /api/reports?page=1&pageSize=10&sortBy=createdAt&sortDir=desc`. `src/routes/report.route.ts` does not change.
      - Do NOT add a Prisma migration or index. The existing createdAt index covers the default; the other sorts are fine at this data size.
      Files: BE `src/repository/report.repository.ts`, `src/controller/report.controller.ts`.
      Verify (BE): `npx tsc --noEmit -p .` is clean.

- [ ] 3. BE: assert self-check (no test runner in BE; do not add one).
      - Create `scripts/report-sort.check.ts` using `node:assert/strict`. Check:
        `ReportService.parseSort({})` deep-equals `{ sortBy: "createdAt", sortDir: "desc" }`;
        `parseSort({ sortBy: "location", sortDir: "asc" })` is accepted;
        `parseSort({ sortBy: "address" })`, `{ sortBy: "createdAt; DROP" }`, `{ sortDir: "ASC" }`, `{ sortBy: ["status", "media"] }` each throw a ReportError with status 400 and the message `"Parameter sortBy/sortDir tidak valid."`;
        `violationOrderBy({ sortBy: "createdAt", sortDir: "desc" })` deep-equals `[{ createdAt: "desc" }, { id: "desc" }]` (the old order);
        `violationOrderBy({ sortBy: "location", sortDir: "desc" })[0]` deep-equals `{ address: { sort: "desc", nulls: "last" } }` and ends with the createdAt/id desc tiebreakers;
        media returns `{ analysis: { media: { originalName: "asc" } } }` for asc.
        End with `console.log("report sort check OK")`. Importing the service builds the Prisma client but does not connect, so no DB is needed.
      Files: BE `scripts/report-sort.check.ts`.
      Verify (BE): `npx tsx scripts/report-sort.check.ts` prints `report sort check OK`; `npx tsc --noEmit -p .` is still clean.
      Optional live check if `.env` DATABASE_URL works: `npm run dev`, then `curl "http://localhost:<PORT>/api/reports?pageSize=3&sortBy=location&sortDir=asc"` returns ok:true; `?sortBy=foo` returns 400 with the message. Read the PORT from src/index.ts / .env; do not print secrets. If the DB cannot be reached, say so.

- [ ] 4. FE: sort helpers, service params and hook state (depends on step 0).
      - `src/services/report/getReports.ts`: add `export type ReportSortBy = 'createdAt' | 'location' | 'media' | 'status'` and `export type SortDir = 'asc' | 'desc'`. Change the signature to `getReports({ page, pageSize, sortBy, sortDir }: { page: number; pageSize: number; sortBy?: ReportSortBy; sortDir?: SortDir }, signal?)`, and call `params.set('sortBy', sortBy)` / `params.set('sortDir', sortDir)` only when given. Update the contract comment at the top.
      - `src/pages/feat-report/reportState.ts` gets pure helpers:
        ```ts
        export type SortColumn = 'lokasi' | 'tanggal' | 'waktu' | 'media' | 'status'
        export interface TableSort { column: SortColumn; dir: SortDir }
        // Default: newest date & time first.
        export const DEFAULT_SORT: TableSort = { column: 'tanggal', dir: 'desc' }
        // Tanggal and Waktu are one timestamp, so both sort by createdAt.
        export const SORT_FIELD: Record<SortColumn, ReportSortBy> = { lokasi: 'location', tanggal: 'createdAt', waktu: 'createdAt', media: 'media', status: 'status' }
        // Clicking the active column flips it; another column starts at "v" (desc).
        export function nextSort(current: TableSort, column: SortColumn): TableSort {
          if (current.column === column) return { column, dir: current.dir === 'desc' ? 'asc' : 'desc' }
          return { column, dir: 'desc' }
        }
        ```
      - `src/pages/feat-report/useReports.ts`: add `const [sort, setSort] = useState<TableSort>(DEFAULT_SORT)`, then `const sortBy = SORT_FIELD[sort.column]`. The fetch calls `getReports({ page, pageSize, sortBy, sortDir: sort.dir }, controller.signal)`; effect deps are `[page, pageSize, sortBy, sort.dir, reloadKey]`. Add `const changeSort = useCallback((column: SortColumn) => { setSort((s) => nextSort(s, column)); setPage(1) }, [])` and return `sort` and `changeSort`. Keep the abort logic and the "page no longer exists" logic. Do not edit Dashboard.tsx or ReviewTable.tsx (see D11).
      - `src/pages/feat-report/reportState.test.ts`: add `describe('nextSort')`. Cases: the default is tanggal/desc; clicking tanggal gives asc, and clicking again gives desc; from tanggal/asc, clicking lokasi gives lokasi/desc; from waktu/asc, clicking tanggal gives tanggal/desc (only one column is active). Also check `SORT_FIELD.tanggal === SORT_FIELD.waktu === 'createdAt'`.
      Files: FE `src/services/report/getReports.ts`, `src/pages/feat-report/reportState.ts`, `src/pages/feat-report/useReports.ts`, `src/pages/feat-report/reportState.test.ts`.
      Verify (FE): `npm test` passes (new nextSort tests plus the restored reportNumber test); `npm run typecheck` is clean.

- [ ] 5. FE: sortable headers in ReportTable + CSS (depends on step 4).
      - `src/pages/feat-report/ReportTable.tsx`: read `sort, changeSort` from `reports`. Replace the 6 hard-coded `<th>` with a module-level list `const COLUMNS: { label: string; sort?: SortColumn }[] = [{ label: '#' }, { label: 'Lokasi', sort: 'lokasi' }, { label: 'Tanggal', sort: 'tanggal' }, { label: 'Waktu', sort: 'waktu' }, { label: 'Media', sort: 'media' }, { label: 'Status', sort: 'status' }]`, so `COLUMN_COUNT` can be `COLUMNS.length`. Render:
        - no `sort`: `<th scope="col">{label}</th>`.
        - with `sort`: `const active = sort.column === col.sort`; `<th scope="col" className={active ? 'report-table__th--active' : undefined} aria-sort={active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : undefined}>` containing `<button type="button" className="report-table__sort" title={...D14 text...} onClick={() => changeSort(col.sort!)}>{label}<span className={`report-table__sort-icon${active && sort.dir === 'asc' ? ' report-table__sort-icon--asc' : ''}`} aria-hidden="true"><Icon.ChevronDown /></span></button>`. Inactive columns show "v" dimmed.
        The rows, status picker, pencil/EditReportDialog, PDF link, pagination and the loading dim stay the same.
      - `src/pages/feat-report/ReportTable.css` (new section `/* ---------- Sortable headers ---------- */` after the sticky header rule):
        `.report-table__sort { display: inline-flex; align-items: center; gap: 4px; padding: 0; border: none; background: none; color: inherit; font: inherit; cursor: pointer; border-radius: 3px; }`
        `.report-table__sort-icon { display: inline-flex; opacity: 0.45; transition: transform 0.15s ease, opacity 0.15s ease; }`
        `.report-table__sort:hover .report-table__sort-icon { opacity: 1; }`
        `.report-table__sort-icon--asc { transform: rotate(180deg); }`
        `.report-table th.report-table__th--active { background: var(--purple-dark); font-weight: 700; }`
        `.report-table__th--active .report-table__sort-icon { opacity: 1; }`
        `.report-table__sort:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }`
        `@media (prefers-reduced-motion: reduce) { .report-table__sort-icon { transition: none; } }`
        The Status header stays centered (the existing `th:nth-child(6)` rule; the button is inline so it centers). The column widths (nth-child rules) do not change.
      Files: FE `src/pages/feat-report/ReportTable.tsx`, `src/pages/feat-report/ReportTable.css`.
      Verify (FE): `npm run typecheck` clean, `npm test` passes, `npm run build` succeeds.

- [ ] 6. Final check + hand-off to the user (no commit).
      - BE: `npx tsc --noEmit -p .` and `npx tsx scripts/report-sort.check.ts`. FE: `npm run typecheck`, `npm test`, `npm run build`. Then `git status --short` in both repos and list the changed files. Nothing may be committed or stashed.
      - The answer to the user uses the format of message 6, in Bahasa Indonesia: (1) a plain summary; (2) the touched files; (3) manual tests: open /report, check Tanggal is dark with "v" and the newest is on top; click Tanggal to get "^" and the oldest on top, with numbering still 00001 at the top; click Lokasi to get Lokasi active with "v" (Z to A, rows without an address at the end) while Tanggal is dimmed; go to page 2, change the sort, and land back on page 1; check Media, Status (asc = Belum Diverifikasi, Valid, Tidak Valid) and Waktu; check the verification dropdown, the pencil, the PDF link and that the stat cards do not change when sorting; check the Dashboard Review Progress is still newest first; keyboard Tab to a header then Enter/Space flips the sort. (4) Risks: the BE must be deployed (Vercel) before sorting works on production; until then the FE falls back to the default order (an old BE ignores the params). Waktu sorts by full date+time, not time of day. `#` is not sortable. The active-header color is dark (not a purple arrow) because of contrast on the purple header. Stop and wait for the user's test confirmation.
