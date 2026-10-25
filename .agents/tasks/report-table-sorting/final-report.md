# Laporan Akhir: Urutkan Kolom Tabel "Detail Laporan"

Status: semua verifikasi lulus. **Belum ada commit dan belum ada push** di kedua repo (BE-civision dan FE-civision). Perubahan masih berupa file yang diubah di komputer lokal.

## 1. Ringkasan perubahan dalam bahasa sederhana

- Saat halaman /report dibuka, tabel otomatis diurutkan dari **tanggal & waktu terbaru** di baris paling atas. Header "Tanggal" tampil gelap dengan panah "v".
- Kolom Lokasi, Tanggal, Waktu, Media, dan Status sekarang bisa diklik untuk mengurutkan.
  - "v" (panah ke bawah) = besar ke kecil (descending).
  - "^" (panah ke atas) = kecil ke besar (ascending).
  - Klik pertama pada kolom lain: kolom itu aktif dengan "v". Klik lagi pada kolom yang sama: arah dibalik ("v" jadi "^", dan sebaliknya).
  - Hanya satu kolom yang aktif. Header kolom aktif berwarna ungu gelap dengan panah terang. Kolom lain panahnya samar dan urutannya diabaikan.
- Pengurutan dilakukan di server (backend), jadi berlaku untuk **semua laporan di semua halaman**, tidak hanya 10 baris yang sedang terlihat. Setiap kali urutan diganti, tabel kembali ke halaman 1.
- Nomor "#" selalu mulai dari 00001 di baris paling atas (nomor urut posisi, bukan ID laporan).

Keputusan yang diambil di setiap titik keputusan:

| No | Keputusan | Alasan |
|---|---|---|
| D1 | Urutan dikerjakan di backend (parameter `sortBy` & `sortDir` di GET /api/reports). Tanpa parameter = terbaru dulu, sama seperti sebelumnya. | Tabel memakai halaman (pagination). Kalau hanya halaman yang terlihat yang diurutkan, hasilnya salah. |
| D2 | Lokasi = alamat, Tanggal = waktu dibuat, **Waktu = waktu dibuat juga**, Media = nama file, Status = status. | Tanggal dan Waktu adalah satu cap waktu. Mengurutkan berdasarkan jam saja (tanpa tanggal) perlu kolom baru di database. Yang tersorot tetap hanya header yang diklik. |
| D3 | Kolom **"#" tidak bisa diurutkan**. | "#" adalah nomor posisi baris (selalu 00001 di atas). Mengurutkannya tidak mengubah apa pun yang terlihat. |
| D4 | Laporan tanpa alamat selalu ditaruh di paling bawah saat urut Lokasi (kedua arah). | Supaya baris yang hanya berisi koordinat tidak menumpuk di atas. |
| D5 | Media diurutkan berdasarkan nama file foto. | Tabel hanya menampilkan "Tautan"; nama file satu-satunya pembeda yang masuk akal. |
| D6 | Status: ^ = Belum Diverifikasi → Valid → Tidak Valid; v = kebalikannya. | Status tidak punya besar/kecil; yang penting laporan dengan status sama berkumpul. |
| D7 | Jika nilai sama (misal alamat sama), urutan cadangan = terbaru dulu. | Supaya tidak ada laporan yang muncul dobel atau hilang antar halaman. |
| D8 | Nilai parameter yang tidak dikenal (mis. `sortBy=foo`, `sortDir=ASC`, parameter dobel) ditolak dengan HTTP 400 "Parameter sortBy/sortDir tidak valid." | Keamanan: hanya daftar nilai yang diizinkan yang sampai ke database. |
| D9 | Klik kolom baru selalu mulai dari "v" (besar ke kecil). Klik kolom yang sama membalik arah. Ganti urutan = kembali ke halaman 1. | Sesuai permintaan ("v kebawah itu gede ke kecil") dan sama dengan default. |
| D10 | Pilihan urutan tidak disimpan di URL. Setelah refresh, kembali ke default (terbaru dulu). | Default yang diminta adalah terbaru dulu; perubahan paling kecil. |
| D11 | Dashboard (Review Progress) tidak diubah; tetap terbaru dulu. | Dashboard memakai pengambil data yang sama dan selalu mengirim urutan default. |
| D12 | Kolom aktif ditandai dengan **latar header ungu gelap + teks tebal + panah putih terang**, bukan panah ungu. | Header sudah berwarna ungu; panah ungu tidak akan terlihat. |
| D13 | Ikon "v" memakai ikon panah yang sudah ada; "^" adalah ikon yang sama diputar. Animasi putar dimatikan jika pengguna memilih "kurangi gerakan" di sistem. | Pakai komponen yang sudah ada. |
| D14 | Header bisa dipakai dengan keyboard (Tab lalu Enter/Spasi) dan pembaca layar (aria-sort). Tooltip berbahasa Indonesia. | Aksesibilitas. |
| D15 | Tidak dipecah jadi langkah commit per fitur. | Pengguna melarang commit. |

## 2. Daftar file yang tersentuh/berubah

BE (`BE-civision`), 4 file:
- `src/interface/report.interface.ts`: tipe untuk pilihan urutan.
- `src/service/report.service.ts`: pemeriksaan parameter `sortBy`/`sortDir` (daftar nilai yang diizinkan, 400 jika salah).
- `src/repository/report.repository.ts`: menyusun urutan query database.
- `src/controller/report.controller.ts`: menyambungkan parameter urutan ke endpoint GET /api/reports.

FE (`FE-civision`), 6 file:
- `src/services/report/getReports.ts`: mengirim `sortBy`/`sortDir` ke backend.
- `src/pages/feat-report/reportState.ts`: aturan klik (default, balik arah, ganti kolom). Penomoran "#" dikembalikan ke rumus awal (00001 di atas).
- `src/pages/feat-report/reportState.test.ts`: tes otomatis untuk aturan klik dan penomoran.
- `src/pages/feat-report/useReports.ts`: menyimpan pilihan urutan, kembali ke halaman 1 saat urutan diganti.
- `src/pages/feat-report/ReportTable.tsx`: header tabel bisa diklik, ikon "v"/"^".
- `src/pages/feat-report/ReportTable.css`: tampilan header aktif/tidak aktif.

Tidak ada file sementara yang tertinggal. Folder `.agents/` (catatan kerja + screenshot) tidak dilacak git.

## 3. Langkah tes manual

Penting: perubahan backend **belum di-push**, jadi Vercel belum punya fitur urut. Website Vercel saat ini akan tetap terbaru dulu, apa pun kolom yang diklik. Tes harus dilakukan secara lokal.

### Menyiapkan (cara paling sederhana dan aman, tanpa mengubah file .env)

1. Buka terminal PowerShell pertama:
   ```powershell
   cd "c:\Project Pribadi\Lomba AI PKL\BE-civision"
   npm run dev
   ```
   Tunggu sampai muncul `BE is running on http://localhost:3000`.
2. Buka terminal PowerShell **kedua** (baru):
   ```powershell
   cd "c:\Project Pribadi\Lomba AI PKL\FE-civision"
   $env:VITE_API_BASE_URL = "http://localhost:3000"
   npm run dev
   ```
   Browser terbuka di http://localhost:5173. Pengaturan `$env:...` hanya berlaku di terminal itu saja; file `.env` tidak diubah.
3. Mengembalikan setelah tes: tekan `Ctrl+C` di kedua terminal lalu tutup terminalnya. Pengaturan otomatis hilang. (Kalau terminal kedua mau dipakai lagi: `Remove-Item Env:VITE_API_BASE_URL`.)

Catatan: database yang dipakai adalah database asli (Supabase). Melihat dan mengurutkan aman. **Mengubah status laporan saat tes akan mengubah data asli.**

### Langkah tes

| No | Yang diklik/dilakukan | Hasil yang seharusnya muncul |
|---|---|---|
| 1 | Buka http://localhost:5173/report | Header "Tanggal" ungu gelap dengan "v". Baris teratas = laporan terbaru (saat ini 25/10/2026 14:01:49), nomor 00001. Panah kolom lain samar. |
| 2 | Klik "Tanggal" | Panah berubah jadi "^". Laporan terlama di atas (24/10/2026 22:31:58). Nomor teratas tetap 00001. |
| 3 | Klik "Tanggal" lagi | Kembali "v", terbaru di atas. |
| 4 | Klik "Lokasi" | Lokasi menjadi gelap dengan "v"; Tanggal kembali ungu biasa (samar). Urutan alamat Z→A. (Data sekarang punya 3 alamat yang sama, jadi urutannya terbaru dulu.) |
| 5 | Klik "Waktu", lalu sekali lagi | Waktu aktif "v" (terbaru dulu), lalu "^" (terlama dulu). Waktu diurutkan bersama tanggalnya. |
| 6 | Klik "Media", lalu sekali lagi | "v": nama file Z→A (file `20261013_173318...` di atas). "^": A→Z (file `20261001_173452...` di atas). Arahkan mouse ke "Tautan" untuk melihat nama file. |
| 7 | Klik "Status", lalu sekali lagi | "v": Valid di atas, lalu Belum Diverifikasi. "^": Belum Diverifikasi di atas, lalu Valid. |
| 8 | Arahkan mouse ke header | Tooltip: "Klik untuk mengurutkan berdasarkan …" (tidak aktif) atau "Urutan: besar ke kecil / kecil ke besar. Klik untuk membalik." (aktif). |
| 9 | Tekan Tab sampai header terpilih, lalu Enter | Kolom yang dipilih menjadi aktif, sama seperti diklik. Ada garis fokus putih di header. |
| 10 | Klik header "#" | Tidak terjadi apa-apa (memang tidak bisa diurutkan). |
| 11 | Di kolom Status, lihat tanpa mengklik | Laporan Belum Diverifikasi masih punya dropdown; laporan Valid/Tidak Valid punya ikon pensil; semua baris punya ikon PDF. |
| 12 | Pagination (hanya muncul jika laporan > 10) | Buka halaman 2, lalu klik header lain: tabel kembali ke halaman 1 dengan urutan baru. Dengan 3 laporan sekarang, tombol halaman belum muncul. |
| 13 | Buka http://localhost:5173/dashboard | Review Progress tetap terbaru dulu, angka kartu statistik tidak berubah. |
| 14 | Refresh /report setelah mengurutkan | Kembali ke default: Tanggal "v", terbaru dulu. |

### Hasil verifikasi yang sudah dijalankan (otomatis)

- BE `npx tsc --noEmit -p .`: 0 error.
- FE `npx tsc --noEmit`: 0 error. `npx vitest --run`: 4 file, **23 tes lulus** (0 gagal). `npx vite build`: berhasil (hanya peringatan lama ukuran file > 500 kB).
- Cek API lokal (backend di port 3000, database Supabase, hanya membaca; ada 3 laporan):

| Parameter | HTTP | Hasil |
|---|---|---|
| tanpa parameter | 200 | terbaru dulu (25/10 14:01:49 → 24/10 22:32:56 → 24/10 22:31:58); sama persis dengan `sortBy=createdAt&sortDir=desc` |
| createdAt asc / desc | 200 / 200 | terlama dulu / terbaru dulu, benar |
| location asc / desc | 200 / 200 | benar; ketiga alamat sama ("Jalan Rawa Belong, Kebon Jeruk"), jadi urutan cadangan terbaru dulu berlaku |
| media asc / desc | 200 / 200 | A→Z (`20261001_173452…` dulu) / Z→A (`20261013_173318…` dulu), benar |
| status asc / desc | 200 / 200 | Belum Diverifikasi, Belum Diverifikasi, Valid / Valid, Belum Diverifikasi, Belum Diverifikasi, benar |
| `sortBy=foo`, `sortBy=address`, `sortDir=ASC`, `sortBy` dobel, `sortBy=createdAt; DROP`, `sortDir=up` | 400 | semua: "Parameter sortBy/sortDir tidak valid." |
| hanya `sortDir=asc` | 200 | diterima (sortBy default = tanggal) |

  Statistik `{total:3, valid:1, invalid:0, unverified:2}` tidak terpengaruh urutan (dicek di iterasi sebelumnya dan sama di cek ini).
- Cek browser asli (Microsoft Edge headless, build FE diarahkan ke backend lokal; semua permintaan selain baca diblokir di browser, sehingga tidak ada data yang berubah):
  - Default: hanya Tanggal aktif, `aria-sort="descending"`, panah "v", latar ungu gelap (rgb 45,43,107); kolom lain tanpa aria-sort, panah samar (opacity 0.45). Baris pertama 00001 = 25/10/2026 14:01:49.
  - Lokasi, Waktu, Media, Status, Tanggal masing-masing diklik 2 kali: klik pertama → hanya kolom itu aktif, "v", `descending`; klik kedua → "^" (ikon diputar 180°), `ascending`. Urutan baris berubah sesuai tabel API di atas. Permintaan yang dikirim browser benar (mis. `sortBy=media&sortDir=asc`).
  - Kolom "#" tidak punya tombol urut.
  - Pagination: karena data hanya 3, ukuran halaman dipaksa 2 khusus untuk tes (permintaan diubah di browser, kode tidak diubah). Media ^ halaman 1 = 2 baris, halaman 2 = 1 baris sisanya (tidak ada dobel/hilang). Setelah klik Status di halaman 2, tabel kembali ke halaman 1. (Nomor di halaman 2 tampil 00011 karena tampilan tetap mengira 10 baris per halaman; ini efek dari trik tes saja, bukan bug.)
  - Keyboard: fokus ke header Lokasi + Enter → Lokasi aktif `descending`.
  - Dropdown verifikasi (2 baris Belum Diverifikasi), pensil (1 baris Valid), dan ikon PDF (semua baris) tetap ada. Status tidak diklik.
- Screenshot:
  - `c:\Project Pribadi\Lomba AI PKL\FE-civision\.agents\tasks\report-table-sorting\screenshots\01-default-tanggal-desc.png` (default: Tanggal aktif "v")
  - `c:\Project Pribadi\Lomba AI PKL\FE-civision\.agents\tasks\report-table-sorting\screenshots\02-media-asc.png` (Media aktif "^")
- `git status --short`: BE hanya 4 file sumber di atas; FE hanya 6 file sumber di atas + folder `.agents/`. Backend lokal dimatikan, file sementara (zz*, _bc, profil browser) dihapus.

## 4. Fitur lain yang berisiko ikut rusak

- ⚠️ **RISIKO: Vercel/produksi belum punya fitur urut.** Backend belum di-push. Kalau hanya FE yang di-deploy, header bisa diklik dan panah berubah, tapi urutan data **tetap terbaru dulu** (backend lama mengabaikan parameter). Tidak error, tapi menyesatkan. Deploy BE dulu atau bersamaan dengan FE.
- ⚠️ **RISIKO: Ubah status saat diurutkan berdasarkan Status.** Setelah status diubah (dropdown atau pensil), baris tetap di posisinya sampai pindah halaman/ganti urutan/refresh. Data tetap benar; hanya urutannya sementara tidak rapi.
- ⚠️ **RISIKO: Dashboard Review Progress** memakai pengambil data yang sama. Sudah dicek tetap terbaru dulu, tapi tolong buka /dashboard sekali (langkah 13).
- ⚠️ **RISIKO: Verifikasi status (dropdown & pensil) dan PDF** ada di baris yang sama dengan header yang diubah. Kodenya tidak diubah dan elemennya sudah dicek ada, tapi mengubah status **tidak** dites di browser supaya data asli tidak berubah.
- Batasan yang perlu diketahui (bukan kerusakan):
  - "#" tidak bisa diurutkan (D3).
  - "Waktu" mengurutkan berdasarkan tanggal + jam, bukan jam saja (D2).
  - Urutan Lokasi untuk banyak alamat berbeda, dan laporan tanpa alamat di paling bawah, hanya dicek lewat skrip; data asli sekarang punya 3 alamat yang sama.
  - Belum ada tes otomatis permanen untuk backend (BE tidak punya test runner; pemeriksaan backend dilakukan dengan skrip sementara dan cek API langsung).

**Belum ada commit maupun push di BE-civision dan FE-civision.** Silakan tes dulu; langkah berikutnya menunggu konfirmasi Anda.
