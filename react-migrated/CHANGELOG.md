# CHANGELOG
# Graphicat Story Generator — RSU Siloam Ambon

Semua perubahan signifikan dicatat di sini dalam format **[Versi] — Tanggal — Deskripsi**.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/).

---

## [v3.0.0] — 17 Agustus 2026 — Print-Safe Architecture & iframe Preview

### 🐛 Diperbaiki
- **KRITIS: Preview "ngezoom"** — HTML template (berisi `<html>`, `<head>`, `@page { size: A4 }`, Google Fonts) diinjeksikan ke React DOM via `dangerouslySetInnerHTML`. Browser memberlakukan `@page` rule dan style bocor ke seluruh halaman, menyebabkan tampilan preview membesar/ngezoom secara tidak terkontrol.
- **KRITIS: Settingan tidak terbaca saat Cetak** — Popup tab cetak dibuka dengan `window.open('', '_blank')` yang origin-nya `about:blank`. Semua URL relatif gambar (`/asset/logo/logo.png`, `/asset/brochure/1.png`) gagal dimuat karena tidak ada base URL, sehingga gambar blank dan kesan settingan tidak berlaku.

### ✅ Perubahan
- **Preview**: Diganti dari `dangerouslySetInnerHTML` ke **`<iframe srcDoc={previewHtml}>`** — template HTML sekarang terisolasi sempurna dari React DOM, tidak ada lagi style bleed atau zoom bug.
- **Print**: Ditambahkan **`<base href="http://localhost:5175/">`** ke `<head>` HTML sebelum ditulis ke popup — semua URL relatif gambar kini resolve dengan benar dari dev server.
- **CSS Scaling**: Diganti dari `zoom: globalScale/100` (tidak reliable di Firefox `@media print`) ke **direct value scaling** — semua nilai font-size, padding, margin di-multiply langsung dengan `sc = globalScale / 100`.
- **`@media print`**: Ditambahkan `!important` di semua aturan print pada kedua template agar dynamic CSS override dari slider selalu menang.

### 📁 File yang Diubah
- `src/components/Brochure/BrochureGenerator.jsx` — Preview → iframe; Print → base href injection
- `src/utils/brochureBuilder.js` — Hapus `zoom`, ganti ke direct scaling semua nilai
- `public/brochure-template-inside.html` — `@media print` dengan `!important`
- `public/brochure-template-outside.html` — `@media print` dengan `!important`

---

## [v2.9.0] — 16 Agustus 2026 — Accurate Pixel-Height Column Distribution

### 🐛 Diperbaiki
- **Jadwal terpotong di bawah kolom** — Algoritma lama menggunakan estimasi bobot kasar (`HEADER_WEIGHT` = 15, `DOCTOR_WEIGHT` = 28) yang tidak akurat, menyebabkan dokter/jadwal terpotong di batas bawah panel.
- **Gap besar antara header dan jadwal** — `justify-content: space-between` pada `.inside-content-wrapper` mendistribusikan ruang kosong secara merata antara header dan konten, menciptakan jarak besar yang tidak diinginkan.

### ✅ Perubahan
- **Kalkulasi tinggi akurat per elemen**:
  - Doctor card: dihitung berdasarkan jumlah pill jadwal (1-3 hari = 1 baris, 4-6 = 2 baris, >6 = 3 baris), font-size aktual, card padding, dan margin
  - Group header: `titleFontSize + 5 + specialtySpacing`
  - Column 1 (Inside Left) dikurangi `headerHeight` untuk kompensasi judul utama
- **Split dokter akurat**: Jika grup tidak muat, split berdasarkan akumulasi tinggi pixel aktual (bukan `Math.floor(availableForDocs / DOCTOR_WEIGHT)` kasar)
- **`justify-content: flex-start`**: Diganti dari `space-between`, header dan konten rapat ke atas
- Nama kelas wrapper diganti ke `.inside-content-wrapper` dan `.outside-column-wrapper` untuk menghindari konflik

### 📁 File yang Diubah
- `src/utils/brochureBuilder.js` — Fungsi `calculateDoctorPixelHeight()`, `calculateGroupHeaderPixelHeight()`, distribusi kolom baru
- `public/brochure-template-inside.html` — `justify-content: flex-start !important` pada `.inside-content-wrapper`
- `public/brochure-template-outside.html` — Rename `.content-wrapper` → `.outside-column-wrapper`

---

## [v2.8.0] — 15-16 Agustus 2026 — Full Layout Controls (5 Tab Sidebar)

### ✨ Fitur Baru
- **5 Tab Sidebar** untuk Regular Brochure Generator:
  1. **Layout** — Scale Semua (75%-125%), Geser X/Y, Jarak Head & Sub-head, Margin Header ke Jadwal, Spacing Antar Spesialis, Spacing Antar Kartu, Font Size Judul/Subtitle/Spesialis/Dokter/Jadwal
  2. **Gambar** — Kontrol per gambar:
     - Gambar 2 (Cover BG): Scale (50%-250%), Geser X/Y (±100px), Opacity (20%-100%)
     - Gambar 3 (Mockup HP): Scale (50%-150%), Geser X/Y (±50px)
     - Gambar 1 (Cover Depan): Scale (50%-150%), Geser X/Y (±50px)
  3. **Teks** — Edit semua teks brosur (Judul Utama, Subtitle, Tanggal Update, Nama RS, Alamat, Telepon, Cover Title 1 & 2, Tahun). Field clearable, preview live.
  4. **Urutan** — Geser spesialis & dokter (Up/Down). Toggle visibilitas per dokter (tampil/sembunyikan).
  5. **Upload** — Upload kustom: Logo RS, Gambar 1 (Cover Depan), Gambar 2 (BG Cover), Gambar 3 (Mockup HP)
- **Save & Load Config**: Tombol "Simpan Perubahan" → localStorage key `regular_brochure_saved_config_v4`
- **Export/Import Preset JSON**: Export konfigurasi ke file `.json`, import dari file `.json`
- **Reset ke Default**: Reset semua ke data segar dari database

### 🐛 Diperbaiki
- **Preview gepeng/terdistorsi** — Template menggunakan `width: 100%` yang menyebabkan panel A4 landscape mengikuti lebar viewport. Diperbaiki ke fixed `297mm × 210mm` dengan panel `99mm × 210mm`.
- **Gambar 3 (Phone Mockup) terpotong** — Panel tengah memiliki `overflow: hidden` yang memotong bagian atas phone mockup. Diperbaiki dengan `object-fit: contain`, `.single-image-container` flex-centered, dan `min-height: 0`.
- **Head & Sub-head terlalu jauh** — Ditambahkan slider `headSubheadGap` dan `headerMarginBottom` untuk kontrol presisi.

### 📁 File yang Diubah
- `src/components/Brochure/BrochureGenerator.jsx` — Rewrite major, 5 tab sistem
- `src/utils/brochureBuilder.js` — Terima `layoutConfig` & `textConfig`, generate `#custom-layout-overrides` CSS block
- `public/brochure-template-inside.html` — Header container dengan `.main-header-title` & `.main-header-subtitle`
- `public/brochure-template-outside.html` — `.cover-bg-layer`, `.single-image-container`, `.image3-img`

---

## [v2.7.0] — Agustus 2026 — Jadwal Executive di Brochure Generator

### ✨ Fitur Baru
- **Executive Bifold Brochure** diterapkan settingan terbaru dari Jadwal Executive
- Engine live preview ditambahkan: perubahan langsung terlihat di preview tanpa perlu refresh
- Upgrade engine distribusi kolom bifold

### 🐛 Diperbaiki
- Brosur Executive tidak terbaca perubahan dari mode Edit — diperbaiki dengan reactive state flow

---

## [v2.6.0] — Agustus 2026 — Save Mode & Empty Preview Fix

### ✨ Fitur Baru
- **Save Mode**: Semua perubahan (teks, layout, gambar, urutan) dapat disimpan ke localStorage. Perubahan tersimpan dimuat otomatis saat halaman dibuka kembali.

### 🐛 Diperbaiki
- **Preview tidak kosong saat field dikosongkan** — Jika teks dikosongkan di editor, preview juga harus menampilkan field kosong (bukan nilai default lama). Diperbaiki dengan fungsi `resolveTextValue()` yang menghormati string kosong `""`.

---

## [v2.5.0] — Agustus 2026 — Regular Brochure Editable Mode

### ✨ Fitur Baru
- **Mode Edit Brosur Reguler** — Semua teks di brochure regular dapat diedit langsung: judul, subtitle, alamat, telepon, teks cover, dll.
- Field teks mendukung clear (kosongkan) dan update live preview

---

## [v2.4.0] — Agustus 2026 — Brochure Engine Separation

### 🐛 Diperbaiki / Dipisahkan
- **Engine brochure reguler dipisah dari executive** — Sebelumnya ada percampuran kode yang menyebabkan perubahan pada satu brochure mempengaruhi yang lain. Sekarang sepenuhnya terpisah:
  - `BrochureGenerator.jsx` → hanya Regular Trifold
  - `ExecutiveBrochureGenerator.jsx` → hanya Executive Bifold
- Rollback perubahan yang tidak sengaja mempengaruhi Regular Brochure saat mengerjakan Executive

---

## [v2.3.0] — Agustus 2026 — Executive Bifold Brochure (White-Gold)

### ✨ Fitur Baru
- **Executive Bifold Brochure Generator** baru: `/executive-brochure`
- Theme White-Gold premium dengan:
  - Foto dokter circular dari database company-profile
  - Schedule pills per hari
  - 4-panel: Back Cover + Front Cover (Sheet 1), Inside Left + Inside Right (Sheet 2)
  - Logo RSU Siloam dari database (bukan static file)
- Data source: `/executive-doctors/grouped` + `/company-profile/data` (foto resolusi tinggi)
- Photo resolution chain: company-profile → SSTV → local webp → initials placeholder

---

## [v2.2.0] — Agustus 2026 — Regular Brochure: Logo Database

### ✨ Perubahan
- Logo RSU Siloam di brosur reguler diganti dari file statis ke logo yang diambil dari database (company-profile API)
- Warna cover berubah ke tema "White Gold" sesuai branding Executive Clinic

---

## [v2.1.0] — Agustus 2026 — Regular Trifold Brochure Generator

### ✨ Fitur Baru
- **Regular Trifold Brochure Generator**: `/brochure`
- A4 Landscape 3-lipat dengan:
  - Halaman Dalam: 3 kolom jadwal semua dokter spesialis
  - Halaman Luar: Panel kiri (dokter), Panel tengah (Gambar 3 + Alamat), Panel kanan (Cover depan)
- Data dari `/doctors?limit=200`
- Distribusi kolom otomatis dengan split "(Lanjutan)" jika grup tidak muat
- Tombol Preview (iframe) dan Cetak Brosur (popup tab)

---

## [v2.0.0] — Agustus 2026 — Executive Story Generator

### ✨ Fitur Baru
- **Executive Story Generator**: `/executive-story` dan `/executive-card`
- Poster premium Instagram Story (1080×1920) dan Square (1080×1080)
- 5 tema: White-Gold, Royal Navy Gold, Onyx Gold, Emerald Luxury, Siloam Blue
- Fitur lengkap:
  - Pilih dokter dari dropdown (data dari API)
  - Preview live real-time
  - Download PNG via html2canvas (skala 2x = 2160px resolusi)
  - Upload logo kustom (Cloudinary)
  - Kontrol posisi foto (Scale, X/Y offset, Mirror)
  - Kontrol posisi kartu dokter, jadwal, header
- State global via **Zustand** dengan `persist` middleware ke localStorage

---

## [v1.5.0] — Fase Awal — Story Generator (Legacy)

### ✨ Fitur Awal
- **Story Generator Legacy**: `/` (halaman utama)
- Generator poster jadwal dokter format Instagram Story
- Sidebar kontrol dengan pilihan dokter, format, dan tema dasar
- Preview workspace dengan zoom controls
- State dikelola via React Context (`StoryContext`)
- Export PNG via html2canvas

---

## [v1.0.0] — Initial Commit — Fondasi Aplikasi

### ✨ Dibangun dari Awal
- Setup React 19 + Vite 7 + React Router v7
- Tailwind CSS + lucide-react
- AdminLayout dengan navigasi top bar
- Koneksi ke API `dashdev2.netlify.app/.netlify/functions/api`
- Deploy ke Netlify dengan `netlify.toml`
- Struktur awal komponen: `Layout/`, `Preview/`, `Controls/`, `UI/`
- Integrasi Cloudinary untuk upload logo kustom
- Sistem utility: `imageHelper.js`, `cloudinaryUpload.js`, `downloadHelper.js`

---

*Changelog ini dibuat dan diperbarui per 17 Agustus 2026.*
