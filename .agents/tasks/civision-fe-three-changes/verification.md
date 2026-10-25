# Verification — iteration 1

Run from `FE-civision` via a temp `cmd` script (output redirected to files, then read; temp files deleted).

| Command | Result |
|---|---|
| `npx tsc --noEmit` | EXIT=0, no output (0 errors) |
| `npx vite build --outDir _bc --emptyOutDir` | EXIT=0, `✓ 165 modules transformed`, `✓ built in 5.56s`. Only the pre-existing >500 kB chunk warning. `_bc/` deleted afterwards. |
| `npx vitest --run` | EXIT=0, Test Files 4 passed (4), Tests 17 passed (17) — same as baseline (mapData 8, deviceLocation 2, manualCoordinate 3, reportState 4) |

No test changes needed: no `*.test.ts` asserts on UI text.

## Leftover English, kept on purpose
- Brand `Civision`/`CiVision` (`<title>`, logo `alt`).
- `Status`, `Media`, `Valid`, `Email`, `#`, `Total` (in "Total Laporan"), `Filter`, `PDF`, `error`/`backend`/`ONNX`/`WebGPU` (accepted loanwords / technical terms).
- `/model-diagnostic` dev page: `<code>` tokens (`08`, `3c`, `opset`, `is not implemented`, `protobuf`/`parse`), `inputNames:`/`outputNames:` debug lines, `Status:`, `content-type: none`.
- `services/yolo/session.ts` ModelLoadError messages (never shown; UploadPage `friendlyError` maps them to Indonesian).
- `services/violation/submitViolation.ts` (unused), `violationRule.ts` (developer error).
- OSM attribution `&copy; OpenStreetMap contributors`.
- `console.log` text, identifiers, comments, CSS class names, API values (`valid`/`invalid`/`unverified`, `daily`/`weekly`/`monthly`).
- Extra beyond plan: `Upload berhasil` → `Unggah berhasil` (UploadPage success dialog), `upload gagal` → `unggah gagal` (uploadPhotos.ts error shown in the upload error list).

## Not verified here
Browser check (layout of longer labels, status cell, /map navigation) is left for the dedicated verify step.
