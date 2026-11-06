# 🎙️ LiveHost Pro - Sistem Manajemen Host Live Streaming Part-Time

[![CI / Automated Testing](https://github.com/livehost/livehost-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/livehost/livehost-pro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python: 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/)

Aplikasi lengkap dan siap pakai (*production-grade*) untuk agensi, toko online (*brand/seller*), atau manajemen konten dalam mengelola **host live streaming part-time** di berbagai platform (TikTok Live, Shopee Live, Tokopedia Play, Instagram Live).

---

## 🌟 4 Fitur Utama (Core Pillars)

### 1. 📅 Manajemen Jadwal Shift (Scheduling)
* Penjadwalan shift siaran lengkap dengan tanggal, jam mulai, jam selesai, dan alokasi platform (TikTok, Shopee, Tokopedia, Instagram).
* Penetapan target GMV (omset penjualan) spesifik per shift.
* Status shift dinamis: *Scheduled*, *In Progress*, *Completed*, *Canceled*.

### 2. ⏱️ Absensi Kehadiran & Jam Kerja (Attendance)
* **Terminal Clock-In & Clock-Out** real-time dengan pencatatan detik siaran langsung.
* Input link URL room siaran & link bukti screenshot sebagai validasi kehadiran.
* Deteksi keterlambatan otomatis (*late minutes detection*) terhadap jam jadwal.
* Perhitungan otomatis jam kerja aktual (*actual hours*).

### 3. 📊 Tracking Performa & Penjualan (Performance Tracking)
* Pencatatan metrik live lengkap:
  * **Peak Concurrent Viewers (PCV)** & **Average Viewers**.
  * **Total Pesanan (Orders / Checkout Keranjang Kuning)**.
  * **Realisasi GMV Penjualan (Rupiah)** vs Target GMV.
  * **Conversion Rate (%)** & **Rating Evaluasi Host (1.0 - 5.0)**.
* Progress bar visual pencapaian target dan status lolos target bonus.

### 4. 💰 Perhitungan & Pembayaran Gaji Part-Time (Payroll & Payout)
* Skema penggajian fleksibel dan transparan untuk pekerja part-time:
  $$\text{Gaji Net} = \text{Gaji Pokok Jam} + \text{Komisi GMV} + \text{Bonus Target} - \text{Potongan Terlambat}$$
  * **Gaji Pokok Jam**: `Total Jam Aktual × Rate Honor Host (misal Rp 35.000 - Rp 50.000/jam)`.
  * **Komisi GMV**: Persentase komisi omset (misal `1.5% - 3.0% × Realisasi GMV`).
  * **Bonus Target**: Insentif tambahan flat (misal Rp 50.000/sesi saat omset tembus target).
  * **Potongan Keterlambatan**: Denda flat per blok 15 menit keterlambatan.
* Penerbitan **Slip Gaji Digital** resmi (nomor slip `#PAY-XXX`) beserta data rekening bank.
* Manajemen status pembayaran: *Menunggu Transfer* vs *Lunas / Ditransfer* dengan nomor referensi bank.

---

## 🚀 Panduan Memulai Cepat (Quick Start)

Aplikasi ini dirancang dengan **zero external dependencies** (menggunakan Python Standard Library) sehingga dapat langsung dijalankan tanpa perlu instalasi `pip` tambahan!

### 1. Jalankan Aplikasi Secara Lokal
```bash
# Masuk ke direktori proyek
cd /Users/mac/.gemini/antigravity/scratch/hostlive-parttime-app

# Jalankan server aplikasi
./run.sh
# Atau:
# python3 -m app.server
```

Buka browser Anda di:
👉 **[http://localhost:8080](http://localhost:8080)**

---

## 🐙 Panduan Menghubungkan ke GitHub

Untuk mengunggah proyek ini ke akun GitHub Anda:

### Langkah 1: Buat Repositori Baru di GitHub
1. Buka [GitHub New Repository](https://github.com/new).
2. Beri nama repositori, contoh: `livehost-parttime-app` atau `hostlive-pro`.
3. Pilih visibilitas **Public** atau **Private**.
4. **Jangan** centang *"Add a README file"* atau *.gitignore* (karena sudah dibuatkan lengkap di proyek ini).
5. Klik **Create repository**.

### Langkah 2: Hubungkan & Push dari Terminal
Jalankan perintah berikut di folder proyek ini:

```bash
cd /Users/mac/.gemini/antigravity/scratch/hostlive-parttime-app

# 1. Konfigurasi remote URL GitHub Anda (ganti <username> dengan username GitHub Anda)
git remote add origin https://github.com/<username>/livehost-parttime-app.git

# 2. Pastikan branch utama bernama main
git branch -M main

# 3. Push seluruh kode ke GitHub
git push -u origin main
```

*(Jika Anda menggunakan GitHub SSH key, gunakan: `git remote add origin git@github.com:<username>/livehost-parttime-app.git`)*

---

## 📁 Struktur Direktori Proyek

```
hostlive-parttime-app/
├── .github/
│   ├── workflows/
│   │   └── ci.yml               # Automated CI Testing pada Push & PR
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md        # Template laporan bug
│       └── feature_request.md   # Template usulan fitur
├── app/
│   ├── __init__.py
│   ├── database.py              # Koneksi SQLite, skema tabel & seed sample data
│   ├── services.py              # Business logic (Jadwal, Absensi, Performa, Payroll)
│   ├── server.py                # REST API Server & HTTP Handler (Zero-dependency)
│   └── static/
│       ├── index.html           # Modern Single-Page Dashboard (Tailwind CSS)
│       ├── app.js               # Frontend controller & integrasi API
│       └── style.css            # Custom badge & styling tema
├── tests/
│   ├── __init__.py
│   └── test_payroll.py          # Unit tests verifikasi logika sistem
├── .gitignore                   # Ignore file cache, virtualenv, dan db
├── LICENSE                      # MIT License
├── requirements.txt             # Panduan dependensi jika diperluas ke FastAPI
├── run.sh                       # Script bash peluncur server
└── README.md                    # Dokumentasi lengkap proyek
```

---

## 🧪 Menjalankan Pengujian (Unit Tests)

Proyek ini telah dilengkapi dengan unit test otomatis untuk memverifikasi kalkulasi formula gaji, pencatatan absensi, dan metrik performa:

```bash
python3 -m unittest discover tests
```

Output:
```text
.....
----------------------------------------------------------------------
Ran 5 tests in 0.088s

OK
```

---

## 🔌 Dokumentasi REST API

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/overview` | Ringkasan metrik dashboard (host, jam, GMV, payroll) |
| `GET` | `/api/hosts` | Daftar seluruh host terdaftar |
| `POST` | `/api/hosts` | Menambahkan profil host baru |
| `GET` | `/api/schedules` | Daftar jadwal shift (filter: date, platform, host_id) |
| `POST` | `/api/schedules` | Membuat jadwal shift live baru |
| `POST` | `/api/attendance/clock-in` | Melakukan Clock-In sesi siaran langsung |
| `POST` | `/api/attendance/clock-out` | Melakukan Clock-Out dan menghitung jam aktual |
| `POST` | `/api/performances` | Menginput metrik performa hasil live |
| `GET` | `/api/payroll/calculate` | Menghitung simulasi gaji host berdasarkan periode |
| `POST` | `/api/payroll/generate` | Menerbitkan dan menyimpan slip gaji ke database |
| `GET` | `/api/payrolls` | Daftar riwayat seluruh slip gaji |
| `POST` | `/api/payroll/pay` | Menandai slip gaji sebagai LUNAS / Sudah Ditransfer |

---

## 📄 Lisensi

Proyek ini didistribusikan di bawah lisensi **MIT License**. Silakan gunakan dan kembangkan secara bebas untuk kebutuhan komersial maupun personal.
