# CBT App — Computer Based Test (Local, MySQL/XAMPP)

Aplikasi CBT lokal berbasis arsitektur REST API Monolitik Tiga-Lapis (Express + MySQL + Vanilla JS Mini-SPA).

## Cara Menjalankan (XAMPP)

1. **Nyalakan MySQL** di XAMPP Control Panel (modul Apache tidak wajib, server Node.js sendiri yang menyajikan frontend).
2. **Install dependency**
   ```
   npm install
   ```
3. **Siapkan file environment**
   ```
   cp .env.example .env
   ```
   Sesuaikan `DB_PASSWORD` jika root MySQL XAMPP-mu memakai password (default XAMPP biasanya kosong).
4. **Migrasi database** (otomatis membuat database `cbt_app` beserta seluruh tabel)
   ```
   npm run migrate
   ```
5. **Seed data awal** (role Admin/Guru/Siswa + 1 akun Admin default)
   ```
   npm run seed
   ```
6. **Jalankan server**
   ```
   npm start
   ```
   Buka `http://localhost:3000` di browser.

## Akun Admin Default

Sesuai `.env` (`DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD`), default:
- Username: `admin`
- Password: `admin123`

**Segera ganti password ini setelah login pertama kali** (lewat fitur buat akun baru / ganti password jika sudah diimplementasikan, atau langsung lewat database).

## Alur Pemakaian

1. Login sebagai Admin (akun default), buat **minimal satu Mata Pelajaran** di dashboard Admin.
2. Daftar akun Guru dan Siswa lewat halaman `#register` (status `pending`), lalu **setujui (approve)** dari dashboard Admin.
3. Login sebagai Guru → buat ujian baru (isi **Nilai Minimal Lulus**) → tambah soal pilihan ganda.
4. Login sebagai Siswa → kerjakan ujian. Jika nilai di bawah passing grade, tombol berubah jadi **"Ulangi Ujian (Remedial)"**.
5. Guru bisa memantau nilai tertinggi & **jumlah percobaan (attempt count)** tiap siswa di menu "Nilai" pada setiap ujian.

## Struktur Folder

```
backend/
  config/         -> koneksi MySQL (connection pool)
  controllers/     -> HTTP layer (req/res)
  services/        -> business logic (remedial, scoring, approval)
  repositories/     -> query SQL murni (parameterized, anti SQL Injection)
  middlewares/      -> JWT auth guard & role guard
  routes/           -> definisi endpoint REST
  database/         -> migrate.js & seed.js
  server.js         -> entry point
frontend/
  index.html         -> Mini-SPA (Vanilla JS + Tailwind CDN, hash routing)
```

## Catatan Teknis

- Password di-hash dengan `bcryptjs` (pure JS, tanpa kompilasi native — aman dipakai di Windows/XAMPP tanpa build tools tambahan).
- Sesi login pakai JWT (`Authorization: Bearer <token>`), expiry diatur via `JWT_EXPIRES_IN` di `.env`.
- Jika port `3306` MySQL XAMPP berbeda dari default, sesuaikan `DB_PORT` di `.env`.
