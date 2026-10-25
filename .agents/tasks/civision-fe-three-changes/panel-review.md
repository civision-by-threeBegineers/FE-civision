# Panel detail laporan di sisi kanan peta /map

Klik pin di `/map` sekarang membuka panel `<aside>` di kanan (lembar bawah di layar ≤ 900px) yang berisi foto bukti, heading "Detail Laporan", lalu baris detail dan tombol status yang sama dengan dialog "Ubah Status Laporan". Detail dan tombol diekstrak ke `ReportStatusDetails.tsx` dan dipakai dialog Report maupun panel, jadi tidak ada duplikasi markup. Ubah status di panel memanggil `updateReportStatus` yang sama, lalu memperbarui marker lokal lewat `applyMarkerStatus`. Pin `invalid` disaring dari peta dan hasil pencarian, tapi panelnya tetap terbuka supaya bisa dibatalkan. Popup Leaflet lama dihapus seluruhnya.

Watch for: hasil simpan yang terlambat bisa menempel ke panel pin lain (likely, minor); di ≤ 900px lembar bawah menutupi tombol zoom dan notifikasi (confirmed, minor); alur `changeStatus` disalin dari `useReports`, bukan dipakai bersama (confirmed, minor).

**Verdict**: APPROVED

## High-level view

Pemakaian ulang sudah benar. `EditReportDialog` sekarang hanya kerangka modal (portal, fokus, Escape, perangkap Tab) di sekitar `ReportStatusDetails`. Markup, class `edit-report__*`, dan teks sama, jadi halaman Report tetap berperilaku sama. Satu-satunya perubahan yang terlihat di sana adalah "Status saat ini" yang sekarang menampilkan label Indonesia, bukan nilai mentah `valid`. Itu sejalan dengan Tugas 3.

Popup Leaflet sudah hilang: `<Popup>`, `markerRef`, `popupAnchor`, dan CSS `.vpopup*` dihapus, dan pin diberi handler `click` yang memanggil `onMarkerClick`. Dasbor tidak mengirim `onMarkerClick` dan marker-nya `interactive={false}`. Penyaringan `invalid` hanya ada di MapPage, jadi preview Dasbor tidak berubah. Pemakai `formatDateTime` yang tersisa (`MapControls`) tetap utuh.

Alur status di MapPage meniru `useReports.changeStatus`: set saving, panggil API, update lokal hanya kalau berhasil, dan pesan error tampil di panel lewat `role="alert"`. Kalau gagal, marker tidak berubah. Escape menutup daftar pencarian/rentang waktu dulu, lalu panel (kecuali sedang menyimpan), lalu kembali ke dasbor. Pilih hasil pencarian membuka panel setelah `moveend`.

Aksesibilitas sudah ditangani. Panel memakai `aria-labelledby` ke heading h2, tombol X punya `aria-label="Tutup detail laporan"`, foto punya alt berisi lokasi dengan fallback "Foto tidak tersedia", fokus masuk ke panel saat dibuka dan kembali ke pin/kolom cari saat ditutup, dan ada `prefers-reduced-motion`. Semua teks baru berbahasa Indonesia. Yang kurang ada di kasus tepi: state yang dibagi antar pin, dan tata letak di layar kecil.

<details>
<summary>Issues (4)</summary>

1. **Hasil simpan terlambat menempel ke pin lain** — `statusError`/`savingId` berlaku untuk satu halaman, sementara panel tidak modal. Error dari simpanan pin A bisa muncul di panel pin B, dan `finally` dari simpanan pertama ikut mengosongkan `savingId` milik simpanan kedua. Abaikan hasil kalau `id !== selectedId`, atau kunci pemilihan pin selama menyimpan.
2. **Lembar bawah menutupi kontrol** — di ≤ 900px panel (z-index 1200, maks. 70% tinggi) menutupi `.map-zoom` dan `.map-page__notice` (bottom 24/28px, z-index 1100). Aturan geser hanya ada untuk ≥ 901px. Geser kontrol di atas lembar, atau terima saja karena pinch-zoom masih jalan.
3. **Salinan alur changeStatus** — `MapPage.changeStatus` menyalin isi try/catch/finally dari `useReports.changeStatus`, termasuk teks fallback. Kalau penanganan error di salah satunya berubah, keduanya bisa berbeda. Ini bisa diterima untuk 10 baris, cukup dicatat.
4. **Panel tetap terbuka untuk pin yang tersaring** — `selected` dicari di daftar lengkap, jadi setelah rentang waktu diganti, panel tetap menampilkan laporan yang pin-nya sudah tidak ada di peta. Untuk `invalid` itu disengaja. Untuk rentang waktu, perlu diputuskan apakah ini juga diinginkan.

</details>

<details>
<summary>Details</summary>

### Pemakaian ulang ReportStatusDetails dan dampaknya ke halaman Report

`ReportStatusDetails` menerima `Pick<ReportRow, ...>` ditambah `idText`. Dialog Report mengirim `${number} / ${row.id}` sehingga ID tetap sama. Panel mengirim `id` saja dan `mediaName: null`, sehingga tautan Media menampilkan URL mentah. Itu konsisten dengan perilaku Report ketika `mediaName` kosong, tapi teksnya panjang. `overflow-wrap: anywhere` pada `dd` menjaga tata letaknya.

Komponen ini mengimpor `ReportTable.css` sendiri, jadi seluruh stylesheet tabel Report ikut dimuat di `/map`. Semua class di sana ber-prefix (`report-table`, `edit-report`), jadi tidak ada bentrok yang terlihat (likely).

Catatan kecil: tombol yang sedang aktif (`aria-pressed`) tidak melakukan apa-apa saat diklik. Itu perilaku dialog lama yang dibawa apa adanya.

### Status, penyaringan invalid, dan state bersama

```
klik pin ──▶ openPanel(v) ─▶ selectedId
                               │
tombol status ─▶ changeStatus(id) ─▶ updateReportStatus ─▶ updateStatus (applyMarkerStatus)
                               │                                  │
                         savingId/statusError              violations ─▶ visible (tanpa invalid)
                         (satu per halaman)
```

`applyMarkerStatus` tidak memutasi data dan diuji. Setelah status menjadi `invalid`, marker tetap ada di `violations` tapi keluar dari `visible`. Karena `selected` dicari di `violations`, panel tetap terbuka. Kalau panel lalu ditutup, `previous.isConnected` bernilai false sehingga fokus tidak diarahkan ke pin yang sudah hilang.

Karena panel tidak modal, petugas bisa mengklik pin lain saat simpanan masih berjalan (likely). `openPanel` menghapus `statusError`, tapi simpanan pin sebelumnya yang gagal belakangan akan memanggil `setStatusError` dan pesannya tampil di panel pin baru. Kalau dua simpanan berjalan bersamaan, `finally` dari simpanan pertama mengosongkan `savingId` milik simpanan kedua, sehingga tombolnya aktif lagi sebelum simpanan kedua selesai. Datanya tidak rusak, karena `applyMarkerStatus` selalu memakai `id` yang benar. Yang menyesatkan hanya pesan dan status tombolnya. Dialog Report tidak punya masalah ini karena modal.

Escape bergantung pada `selectedId`, bukan `selected`. Kalau `selectedId` merujuk ke data yang sudah tidak ada (misalnya setelah `retry`), Escape tidak melakukan apa-apa dan tidak kembali ke dasbor (possible, sangat jarang). Untuk memastikan, perlu dicek apakah `retry` bisa terjadi ketika panel sedang terbuka.

### Tata letak di layar kecil

Di ≥ 901px dropdown rentang waktu, tombol zoom, dan notifikasi digeser sejauh `--map-panel-width`. Di ≤ 900px tidak ada aturan yang setara, padahal lembar bawah (z-index 1200, sampai 70% tinggi) berada di atas `.map-zoom` (bottom 24px) dan `.map-page__notice` (bottom 28px), keduanya z-index 1100 (confirmed dari CSS). Kolom cari di atas tetap terlihat. Tombol X 44px dan reduced-motion untuk animasi lembar sudah ada.

### Fokus dan keyboard

`opener` diambil dari `document.activeElement` saat render pertama. Ini bergantung pada pin Leaflet (`keyboard={true}` → `tabindex=0`) yang menerima fokus saat diklik. Untuk Enter itu sudah pasti, untuk klik mouse kemungkinan besar juga (likely, perlu dicek di browser). Fokus kembali ke panel setelah simpanan selesai, karena tombol yang dinonaktifkan kehilangan fokus. Panel `outline: none` tanpa indikator fokus, tapi fokus pertama mendarat di wadah, bukan di kontrol.

### Verifikasi

Menurut `panel-verification.md`, `tsc` lolos, build lolos, dan vitest 19/19 lolos (+2 tes untuk `formatReportDateTime` dan `applyMarkerStatus`). Saya mencoba mengulang tsc+vitest, tapi waktunya habis (240 detik) tanpa keluaran, jadi klaim itu tidak saya ulang. Interaksi panel (klik pin, Escape, alur API, lembar bawah) belum punya tes dan belum dicoba di browser.

</details>

<details>
<summary>File map</summary>

- `src/pages/feat-report/ReportStatusDetails.tsx` (baru): detail + tombol status, diekstrak dari dialog.
- `src/pages/feat-report/EditReportDialog.tsx`: memakai `ReportStatusDetails`.
- `src/pages/feat-maps/MapReportPanel.tsx` (baru): panel foto + X + heading + detail.
- `src/pages/feat-maps/MapPage.tsx`: state panel, Escape, alur simpan status, penyaringan `invalid`.
- `src/pages/feat-maps/ViolationMap.tsx` / `.css`: popup dihapus, `onMarkerClick`.
- `src/pages/feat-maps/MapPage.css`: style panel, geser kontrol, lembar bawah, reduced-motion.
- `src/pages/feat-maps/useMapData.ts`: `updateStatus`.
- `src/services/dashboard/mapData.ts` / `.test.ts`: `formatReportDateTime`, `applyMarkerStatus` + tes.

Diff lengkap: `git diff` di `FE-civision`.

</details>
