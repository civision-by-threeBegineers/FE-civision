# Tugas 4 — Panel detail laporan di /map: verifikasi

## Hasil
- `npx tsc --noEmit` → EXIT=0, 0 error.
- `npx vite build --outDir _bc --emptyOutDir` → EXIT=0 (hanya peringatan ukuran chunk > 500 kB yang sudah ada sebelumnya). `_bc` sudah dihapus.
- `npx vitest --run` → 4 file, 19 tes lolos (sebelumnya 17; +2 tes baru di `mapData.test.ts`).
- Belum diuji di browser (dikerjakan di langkah lain). Tidak ada commit/push/stash.

## File yang diubah
- `src/pages/feat-report/ReportStatusDetails.tsx` (baru): baris detail (ID Laporan, Lokasi, Koordinat, Tanggal, Waktu, Media) + pesan error + tombol Valid / Tidak Valid / Belum Diverifikasi + "Status saat ini: ...". Diekstrak apa adanya dari `EditReportDialog.tsx`.
- `src/pages/feat-report/EditReportDialog.tsx`: isi dialog diganti `<ReportStatusDetails idText={`${number} / ${row.id}`} ... />`. Markup, class, teks, fokus, Escape, perangkap Tab tidak berubah.
- `src/pages/feat-maps/MapReportPanel.tsx` (baru): panel kanan (foto di atas, tombol X, heading "Detail Laporan", lalu `ReportStatusDetails`).
- `src/pages/feat-maps/MapPage.tsx`: state `selectedId`/`savingId`/`statusError`; klik pin dan pilih hasil pencarian membuka panel; Escape menutup panel dulu; ubah status lewat `updateReportStatus`; `invalid` disembunyikan dari peta.
- `src/pages/feat-maps/ViolationMap.tsx`: `<Popup>` dan prop `markerRef` dihapus; prop baru `onMarkerClick`. Ikon/thumbnail pin tidak berubah.
- `src/pages/feat-maps/ViolationMap.css`: style `.vpopup*` yang sudah tidak dipakai dihapus.
- `src/pages/feat-maps/MapPage.css`: style `.map-panel*`, geser kontrol saat panel terbuka, versi lembar bawah di <= 900px, `prefers-reduced-motion`.
- `src/pages/feat-maps/useMapData.ts`: tambah `updateStatus(id, status)`.
- `src/services/dashboard/mapData.ts`: tambah `formatReportDateTime` dan `applyMarkerStatus`.
- `src/services/dashboard/mapData.test.ts`: 2 tes untuk kedua fungsi itu.

## Keputusan
- Pemakaian ulang: detail dan tombol status diekstrak ke `ReportStatusDetails` dan dipakai dialog maupun panel, dengan class `edit-report__*` yang sama. Komponen ini mengimpor `ReportTable.css` sendiri supaya style-nya tetap ada di /map. API: `updateReportStatus` yang sama, alurnya sama seperti `useReports.changeStatus`.
- Tanggal/Waktu: halaman Report memakai string dari backend (`formatJakarta`: DD/MM/YYYY dan HH:MM:SS, Asia/Jakarta). Data peta cuma punya ISO `createdAt`, jadi `formatReportDateTime` menghasilkan format yang sama di frontend. Kalau kosong atau tidak valid, tampil '-'.
- Field yang tidak ada di data peta:
  - ID Laporan menampilkan `id` saja, tanpa nomor urut "00001 /", karena nomor itu indeks halaman tabel Report dan tidak ada di peta.
  - Media: `mediaName` tidak ada, jadi teks tautan menampilkan URL foto (sama seperti halaman Report ketika `mediaName` kosong). Kalau foto tidak ada, tampil '-'.
  - Lokasi tanpa alamat tampil '-'.
- Status `invalid`: panel tetap terbuka dan menampilkan "Status saat ini: Tidak Valid", sedangkan pin-nya hilang dari peta (juga dari hasil pencarian). Alasannya, petugas bisa langsung membatalkan salah klik dengan memilih Valid/Belum Diverifikasi, dan pin muncul lagi. Caranya: marker tetap disimpan di daftar dengan status baru (`applyMarkerStatus`), dan yang disaring hanya tampilan peta. Kalau panel ditutup setelah pin hilang, fokus tidak dikembalikan karena elemen pin sudah tidak ada.
- Warna pin: sekarang semua pin ungu, belum ada aturan warna per status. Jadi yang berubah setelah ubah status hanya: `invalid` disembunyikan, status lain tetap tampil. Warna per status tidak ditambahkan karena di luar aturan yang ada dan akan ikut mengubah preview di Dasbor.
- Klik pin / Enter pada pin (Leaflet memicu click saat Enter) membuka panel. Popup Leaflet dihapus. Pilih hasil pencarian → peta terbang ke lokasi, lalu panel terbuka.
- Escape: daftar pencarian/rentang waktu yang terbuka ditutup dulu (seperti sebelumnya). Lalu panel ditutup, kecuali sedang menyimpan. Baru setelah itu kembali ke dasbor.
- Saat menyimpan, tombol X dan Escape dinonaktifkan, sama seperti dialog Report.
- Panel tidak modal (`<aside>` dengan heading, `tabIndex=-1`): peta tetap bisa dipakai. Fokus pindah ke panel saat dibuka dan kembali ke pemicu (pin/kolom cari) saat ditutup. Panel di-remount per pin (`key`), jadi fokus kembali ke pin terakhir yang diklik. Tombol X `aria-label="Tutup detail laporan"`, foto `alt="Foto bukti pelanggaran di <lokasi>"`, dan kalau foto tidak ada/gagal dimuat tampil "Foto tidak tersedia".
- Tampilan: desktop lebar 380px, tinggi penuh, menempel kanan, sudut kiri membulat, bayangan, foto 220px `object-fit: contain`, bisa di-scroll. Saat panel terbuka, dropdown rentang waktu, tombol zoom, dan notifikasi bergeser supaya tidak tertutup. <= 900px: lembar dari bawah selebar layar (maks. 70% tinggi), tombol X 44px. `prefers-reduced-motion` mematikan animasi masuk.
- Preview Dasbor (`interactive={false}`): tidak ada handler klik yang aktif (marker tidak interaktif, dan Dasbor tidak mengirim `onMarkerClick`). Penyaringan `invalid` hanya di MapPage, jadi perilaku Dasbor tidak berubah.

## Risiko untuk uji browser
- Pin di dekat tepi kanan bisa tertutup panel. Peta tidak digeser otomatis.
- Pilih hasil pencarian yang lokasinya sudah di tengah pada zoom >= 17: panel bergantung pada event `moveend` dari `flyTo` (pola yang sama dengan popup sebelumnya).
- Dialog "Ubah Status Laporan" di halaman Report sekarang memakai komponen hasil ekstraksi. Perlu dicek tampilannya tetap identik.
