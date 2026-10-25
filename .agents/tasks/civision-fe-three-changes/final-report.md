# Laporan Akhir: Peta di /map, Status Laporan, Bahasa Indonesia, Panel Detail di Peta

Status: BELUM ADA COMMIT dan BELUM ADA PUSH. Semua perubahan masih di folder kerja `FE-civision` (branch `main`, sejajar dengan `origin/main` di commit `f77442c`). Silakan tes dulu.

## 1. Ringkasan perubahan dalam bahasa sederhana

- Tugas 1, Peta punya halaman sendiri: peta sekarang ada di `/map`. Di sidebar ada menu baru "Peta" (ikon pin lokasi) di bawah "Dasbor". Kalau kotak peta kecil di Dasbor diklik, Anda dibawa ke `/map`. Alamat lama `/dashboard/map` tetap bisa dibuka dan otomatis pindah ke `/map`.
- Tugas 2, Status di Detail Laporan tidak dobel lagi:
  - "Belum Diverifikasi": hanya ada dropdown status (dengan panah), tanpa pensil. Untuk memverifikasi, pilih Valid atau Tidak Valid langsung dari dropdown.
  - "Valid" / "Tidak Valid": label berwarna tanpa panah, plus ikon pensil. Pensil membuka jendela "Ubah Status Laporan".
  - Ikon PDF tetap ada di semua baris.
- Tugas 3, Bahasa Indonesia: semua teks yang terlihat di web sekarang berbahasa Indonesia, mulai dari menu, judul, tombol, kolom tabel, pencarian, pesan error, notifikasi, sampai halaman login, unggah, profil, pengaturan, dan bantuan. Label status: Valid, Tidak Valid, Belum Diverifikasi. Halaman Pengaturan (`/settings`) juga dipasang lagi.
- Tugas 4, Panel detail di peta: kalau pin di `/map` diklik, panel muncul di sisi kanan. Isinya foto bukti, ID Laporan, Lokasi, Koordinat, Tanggal, Waktu, Media, dan tombol Valid / Tidak Valid / Belum Diverifikasi. Panel ditutup dengan tombol X atau tombol Esc. Kotak popup kecil yang lama di atas pin sudah dihapus. Di HP, panel muncul dari bawah layar.

## 2. Daftar file yang tersentuh/berubah

Diubah (29 file):
- `index.html` (bahasa halaman jadi `id`)
- `src/App.tsx` (rute `/map`, pengalihan `/dashboard/map`, rute `/settings`)
- `src/components/Sidebar.tsx`, `src/components/AppLayout.tsx`, `src/components/AppLayout.css`, `src/components/Topbar.tsx`
- `src/pages/feat-dashboard/Dashboard.tsx`, `src/pages/feat-dashboard/ReviewTable.tsx`
- `src/pages/feat-maps/MapPage.tsx`, `MapPage.css`, `MapControls.tsx`, `ViolationMap.tsx`, `ViolationMap.css`, `useMapData.ts`
- `src/pages/feat-report/ReportTable.tsx`, `ReportTable.css`, `ReportPage.tsx`, `EditReportDialog.tsx`
- `src/pages/feat-help/HelpPage.tsx`, `src/pages/feat-login/LoginPage.tsx`, `src/pages/feat-notification/NotificationPage.tsx`, `src/pages/feat-profile/ProfilePage.tsx`
- `src/pages/feat-upload/UploadPage.tsx`, `src/pages/feat-upload/DetectionResult.tsx`
- `src/pages/model-diagnostic.tsx`
- `src/services/dashboard/mapData.ts`, `src/services/dashboard/mapData.test.ts`
- `src/services/upload/uploadPhotos.ts`, `src/services/yolo/preprocessing.ts` (hanya teks pesan error)

File baru:
- `src/pages/feat-maps/MapReportPanel.tsx` (panel kanan di peta)
- `src/pages/feat-report/ReportStatusDetails.tsx` (isi detail dan tombol status, dipakai bersama oleh panel peta dan jendela "Ubah Status Laporan")
- `src/pages/feat-settings/` (halaman Pengaturan, teksnya ikut diterjemahkan)

Catatan kerja (bukan kode aplikasi): `.agents/`.

## 3. Langkah tes manual

Tidak perlu `git pull`, karena belum ada yang di-push. Cukup:

```
cd "c:\Project Pribadi\Lomba AI PKL\FE-civision"
npm run dev
```

Buka alamat yang muncul (biasanya `http://localhost:5173`).

A. Peta (Tugas 1)
1. Buka `http://localhost:5173/map`. Hasil: peta layar penuh muncul dan menu "Peta" di sidebar tersorot.
2. Buka `http://localhost:5173/dashboard/map`. Hasil: alamat langsung berubah jadi `/map`.
3. Buka `/dashboard`, lalu klik kotak peta kecil. Hasil: pindah ke `/map`.
4. Di peta, klik tombol panah kiri (kiri atas). Hasil: kembali ke Dasbor.

B. Status di Detail Laporan (Tugas 2), lewat menu "Detail Laporan"
1. Baris "Belum Diverifikasi": ada dropdown berpanah dan tidak ada pensil. Pilih "Valid". Hasil: baris jadi label hijau "Valid" dengan pensil, dan angka di kartu atas ikut berubah.
2. Baris "Valid"/"Tidak Valid": label tanpa panah, ada pensil. Klik pensil. Hasil: jendela "Ubah Status Laporan" muncul dengan 6 baris detail, 3 tombol, dan tulisan "Status saat ini: ...". Pilih "Belum Diverifikasi". Hasil: baris kembali jadi dropdown tanpa pensil.
3. Ikon unduh di setiap baris masih membuka PDF.

C. Panel detail di peta (Tugas 4), di `/map`
1. Klik salah satu pin. Hasil: panel muncul di kanan, berisi foto, judul "Detail Laporan", ID Laporan, Lokasi, Koordinat, Tanggal, Waktu, Media, dan 3 tombol status. Popup kecil lama tidak muncul.
2. Klik tombol X di pojok kanan atas panel. Hasil: panel tertutup.
3. Klik pin lagi, lalu tekan Esc. Hasil: panel tertutup dan Anda tetap di peta. Kalau Esc ditekan sekali lagi, Anda kembali ke Dasbor.
4. Buka panel, lalu klik "Tidak Valid". Hasil: pin itu hilang dari peta, tapi panel tetap terbuka dengan tulisan "Status saat ini: Tidak Valid". Klik "Belum Diverifikasi". Hasil: pin muncul lagi.
5. Ketik nama jalan di kolom "Cari lokasi...", lalu klik salah satu hasilnya. Hasil: peta bergerak ke lokasi itu dan panelnya terbuka.
6. Di HP, atau dengan mode HP di DevTools (F12, ikon HP, lebar 390): klik pin. Hasil: panel muncul dari bawah, dan tombol X bisa ditekan.

D. Bahasa Indonesia dan Pengaturan (Tugas 3)
1. Buka satu per satu halaman Login (`/`), Dasbor, Peta, Detail Laporan, Unggah Media, Profil, Pengaturan, Bantuan, dan Notifikasi. Hasil: semua teks berbahasa Indonesia, kecuali yang ada di daftar pengecualian di bawah.
2. Klik "Pengaturan" di sidebar. Hasil: halaman Pengaturan muncul dan menunya tersorot.

PERHATIAN: Langkah B1, B2, dan C4 mengubah data asli di backend live. Setelah selesai tes, kembalikan status laporan ke semula. Langkah C4 juga sudah termasuk cara mengembalikannya.

## 4. Fitur lain yang berisiko ikut rusak (cek dulu sebelum tes)

- RISIKO: Jendela "Ubah Status Laporan" di Detail Laporan sekarang memakai komponen yang sama dengan panel peta. Di browser tampilannya utuh (6 baris, 3 tombol, Esc menutup), tapi tetap cek sekali.
- RISIKO: Di HP, panel peta yang muncul dari bawah menutupi tombol zoom +/- selama panel terbuka. Zoom dengan dua jari tetap bisa dipakai.
- RISIKO: Baris "Media" di panel peta menampilkan alamat foto mentah, karena nama file tidak ada di data peta. Alamatnya panjang, jadi baris ini bisa memakan beberapa baris teks.
- RISIKO: Pin yang dekat tepi kanan bisa tertutup panel, karena peta tidak bergeser otomatis.
- RISIKO kecil: Kalau Anda mengklik pin lain saat status pin sebelumnya masih disimpan, pesan error dari pin pertama (kalau ada) bisa muncul di panel pin kedua. Datanya tetap benar.
- RISIKO kecil: Setelah rentang waktu (Harian/Mingguan/Bulanan) diganti, panel yang sedang terbuka tetap terbuka walaupun pinnya sudah tidak terlihat.
- RISIKO: Kolom Status di tabel sedikit dilebarkan karena teks "Belum Diverifikasi" lebih panjang. Cek di layar sempit.
- RISIKO: Teks Indonesia lebih panjang, jadi bisa terpotong atau turun baris di tombol (Masuk, Unggah, tab Notifikasi, filter waktu, sidebar).
- RISIKO kecil (keyboard): Setelah memilih status dari dropdown pakai keyboard, fokus pindah ke awal halaman.
- RISIKO: Git stash. Halaman Pengaturan dipasang ulang secara manual dari `stash@{0}`, dan stash itu masih ada. JANGAN jalankan `git stash pop`/`apply`.
- Masalah lama yang tidak diubah: di Unggah Media, file yang sama masih bisa ditambahkan dua kali.

## Keputusan di titik yang ambigu

- `/dashboard/map`: tetap ada sebagai pengalihan otomatis ke `/map`, jadi bookmark lama tetap jalan.
- Tombol kembali di peta: selalu ke Dasbor, seperti sebelumnya. Ini juga berlaku kalau Anda masuk dari menu "Peta" di halaman lain.
- Laporan "Belum Diverifikasi" tanpa pensil tetap bisa diverifikasi lewat dropdown di barisnya. Di panel peta, ketiga tombol status selalu tersedia.
- Ikon menu Peta: memakai ikon pin lokasi (`Icon.Pin`) yang sudah ada di `src/components/Icons.tsx`. Tidak ada ikon baru.
- Status jadi "Tidak Valid" dari panel peta: pin langsung hilang, tapi panel tetap terbuka supaya salah klik bisa langsung dibatalkan. Kalau status dikembalikan, pin muncul lagi.
- Warna pin: semua pin memang ungu (belum ada aturan warna per status), jadi warna pin tidak berubah setelah status diubah. Hasil uji: warna pin sebelum dan sesudah sama, `rgb(90, 79, 207)`. Satu-satunya perubahan yang terlihat di peta: pin "Tidak Valid" disembunyikan.
- Popup lama: dihapus seluruhnya dan diganti panel kanan.
- ID Laporan di panel peta hanya menampilkan ID, tanpa nomor urut "00001 /", karena nomor urut itu hanya ada di tabel. Tanggal dan Waktu memakai format yang sama dengan tabel (DD/MM/YYYY, HH:MM:SS, waktu Jakarta).

## Hasil verifikasi

- Typecheck (`tsc --noEmit`): 0 error.
- Tes otomatis (`vitest`): 4 file, 19 tes lulus (17 tes lama ditambah 2 tes baru untuk panel peta).
- Build (`vite build`): berhasil. Hanya ada peringatan lama soal ukuran file di atas 500 kB.
- Code review: Tugas 1-3 APPROVED, Tugas 4 APPROVED. Catatan non-blocking dari review sudah dimasukkan ke bagian 4.
- Uji browser asli memakai Microsoft Edge headless dan hasil build. Semua data backend ditiru di browser, termasuk 3 status sekaligus dan jawaban "berhasil" untuk ubah status, jadi data backend asli TIDAK berubah. Hasilnya 35 dari 35 cek LULUS:
  - Tugas 1:
    - `/map` terbuka dan hanya menu "Peta" yang tersorot. LULUS.
    - `/dashboard/map` pindah ke `/map`. LULUS.
    - Klik kotak peta di Dasbor pindah ke `/map`. LULUS.
  - Tugas 2:
    - Valid dan Tidak Valid tampil sebagai label tanpa panah, dengan pensil dan PDF. LULUS.
    - Belum Diverifikasi tampil sebagai dropdown berpanah, tanpa pensil. LULUS.
    - Memilih Valid dari dropdown mengirim perubahan (dicegat), dan baris berubah jadi label dengan pensil. LULUS.
    - Pensil membuka jendela "Ubah Status Laporan" dengan 6 baris dan 3 tombol, dan Esc menutupnya. LULUS.
  - Tugas 4, desktop 1280x800:
    - Pin Tidak Valid tidak tampil (2 dari 3 pin). LULUS.
    - Klik pin membuka panel di kanan (lebar 380px, setinggi layar). LULUS.
    - Foto bukti tampil. LULUS.
    - Keenam baris detail ada. LULUS.
    - Ada 3 tombol status. LULUS.
    - Popup lama tidak muncul. LULUS.
    - Tombol X menutup panel. LULUS.
    - Esc menutup panel dan halaman tetap di `/map`. LULUS.
    - Ubah ke Valid: perubahan dikirim (dicegat), tulisan berubah jadi "Status saat ini: Valid", dan pin tetap ada. LULUS.
    - Ubah ke Tidak Valid: pin hilang dan panel tetap terbuka. LULUS.
    - Kembalikan ke Belum Diverifikasi: pin muncul lagi. LULUS.
    - Pilih hasil pencarian "Kemanggisan": panel laporan itu terbuka dan popup tetap tidak muncul. LULUS.
  - Tugas 4, HP 390x844:
    - Panel muncul dari bawah, masih di dalam layar, setinggi 558px (kurang dari 70% layar). LULUS.
    - Tombol X berukuran 44x44px dan terlihat. LULUS.
    - Menekan X di posisi sebenarnya menutup panel. LULUS.
  - Tugas 3:
    - `/settings` terbuka dan menu "Pengaturan" tersorot. LULUS.
    - Halaman Dasbor, Peta, Detail Laporan, Pengaturan, Unggah, Profil, Bantuan, dan Notifikasi dicek otomatis untuk kata Inggris umum (Dashboard, Upload, Settings, Search, Unverified, Weekly, Download, dan lain-lain). Tidak ada yang ditemukan. LULUS.
  - Tidak ada permintaan ubah data yang lolos ke backend asli. LULUS.
- Tidak dicek di browser: halaman Login, tablet, dan perubahan status sungguhan ke backend (sengaja tidak dilakukan supaya data asli tidak berubah).
- Screenshot ada di `c:\Project Pribadi\Lomba AI PKL\FE-civision\.agents\tasks\civision-fe-three-changes\screenshots\`:
  - `01-dashboard-desktop.png`
  - `02-report-desktop.png`
  - `03-report-dialog-desktop.png`
  - `04-map-panel-desktop.png`
  - `05-map-panel-mobile.png`
  - `06-report-mobile.png`
  - `07-settings-desktop.png`
  - Semua teks yang terlihat di screenshot berbahasa Indonesia. Foto di screenshot peta adalah gambar tiruan.
- Bersih-bersih: Edge dan server uji sudah dimatikan. Folder profil sementara, `_bc`, dan semua file `zz*` sudah dihapus. Di `git status --short` hanya tampil file sumber di atas, ditambah `.agents/`. Belum ada commit baru, dan branch masih sejajar dengan `origin/main`.

## Teks bahasa Inggris yang sengaja dibiarkan

- Merek `Civision`/`CiVision` (judul tab dan logo).
- Istilah serapan/umum: Status, Media, Valid, Email, Filter, PDF, Total, error, backend, ONNX, WebGPU.
- Atribusi peta `© OpenStreetMap contributors`. Ini wajib menurut lisensi.
- Halaman diagnostik model (`/model-diagnostic`): istilah teknis seperti `opset`, `protobuf`, `inputNames:`, `Status:`.
- Pesan error internal model di `services/yolo/session.ts`. Pesan ini tidak pernah tampil, karena halaman Unggah menggantinya dengan pesan berbahasa Indonesia.
- Kode, komentar, nama class CSS, dan nilai API (`valid`/`invalid`/`unverified`, `daily`/`weekly`/`monthly`).
