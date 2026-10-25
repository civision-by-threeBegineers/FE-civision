# Verification: report table sorting (iteration 1)

Nothing committed, pushed or stashed. Both repos `git pull`: already up to date.

## Changes
- Step 0 (FE): `reportNumber(page, pageSize, index)` forward formula restored; `git diff` of reportState.ts now only shows the new sort helpers, the test file only the new nextSort block.
- BE: `ReportSortBy`/`SortDir`/`SortParams` (interface); `ReportService.parseSort` (whitelist, 400 `Parameter sortBy/sortDir tidak valid.` on wrong value / case / array / object); `violationOrderBy` in the repository (switch over whitelist; location nulls last; createdAt desc, id desc tiebreakers; createdAt sort uses `[createdAt dir, id dir]`); batch `$transaction([...])` kept; controller calls parseSort inside the same try.
- FE: `getReports` sends optional `sortBy`/`sortDir`; `reportState.ts` has `SortColumn`, `TableSort`, `DEFAULT_SORT` (tanggal/desc), `SORT_FIELD`, `nextSort`; `useReports` holds sort state, `changeSort` resets page to 1; `ReportTable` renders headers from `COLUMNS` (`#` not sortable), `<button>` inside `<th>`, `aria-sort` only on the active header, Bahasa Indonesia titles, `Icon.ChevronDown` rotated 180deg for asc; CSS section "Sortable headers" (active header `var(--purple-dark)` + bold + opaque arrow, inactive arrow 0.45 opacity, white focus-visible outline, reduced-motion disables transition). Dashboard.tsx / ReviewTable.tsx untouched (Dashboard sends createdAt/desc = default).

## Results
- BE `npx tsc --noEmit -p .`: EXIT 0.
- BE assert self-check (temp file, `npx tsx`, deleted afterwards): `report sort check OK` (parseSort defaults/accepts/7 rejects incl. arrays, object, `ASC`, `createdAt; DROP`; violationOrderBy for all 4 fields both relevant dirs).
- FE `npx tsc --noEmit`: EXIT 0. `npx vitest --run`: 4 files, 23 tests passed (was 19; +4 nextSort tests; reportNumber test restored to 00001/00011/00023). `npx vite build --outDir _bc --emptyOutDir`: built OK (only the existing >500 kB chunk warning).
- Live local BE (port 3000, Supabase, read-only). First two runs got HTTP 500 from the DB side (P2028 transaction start timeout, then `EMAXCONNSESSION max clients reached in session mode, pool_size 15`); no other local BE was running, so the pooler was held elsewhere. After 30 s wait + retry-on-500, all checks passed (DB has 3 reports):
  - no params: 200, createdAt desc, same ids as explicit `sortBy=createdAt&sortDir=desc`.
  - createdAt asc / desc: correctly ordered (oldest 24/10 22:31:58 first for asc, newest 25/10 14:01:49 first for desc).
  - location asc / desc: ordered; 0 rows without address in the data, so nulls-last only covered by the self-check (all 3 rows have the same address).
  - media asc / desc: ordered by file name (`20261001_...` first for asc, last for desc).
  - status asc: unverified > valid; desc: valid > unverified; createdAt desc within each group.
  - paging stable: status asc page 1+2 (size 5) == page 1 (size 10).
  - `sortBy=foo`, `address`, `sortDir=ASC`, repeated `sortBy`, `createdAt; DROP`, `sortDir=up`: all 400 with the message. Only `sortDir=asc`: 200.
  - stats identical with and without sort: `{"total":3,"valid":1,"invalid":0,"unverified":2}`.
- Backend process stopped (by command line, not by image name). Temp files (zz*, _bc) deleted. `git status --short`: BE 4 source files; FE 6 source files + `.agents/`.

## Not verified
- No browser run of the UI (visual look, keyboard Tab/Enter on headers, screen reader announcement).
- Location nulls-last and Postgres collation for mixed addresses: the live data is too small/uniform.
