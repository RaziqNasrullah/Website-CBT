# Arsitektur CBT App

Layered architecture (Controller → Service → Repository) di atas Express + MySQL,
dengan frontend mini-SPA vanilla JS (hash routing, tanpa build step).

```
CBT/
├── package.json
├── package-lock.json
├── .env.example                        # Template environment variable (isi asli ada di .env, tidak di-commit)
├── .gitignore
├── README.md
├── architecture.md                     # Dokumen ini
│
├── backend/
│   ├── server.js                       # Entry point Express (mount routes, static /uploads, error handler)
│   │
│   ├── uploads/                        # File hasil upload (foto profil, gambar soal) - runtime, di-gitignore
│   │   ├── profiles/
│   │   └── questions/
│   │
│   ├── config/
│   │   └── db.js                       # Koneksi MySQL (connection pool, mysql2)
│   │
│   ├── database/
│   │   ├── migrate.js                  # Bikin/upgrade skema tabel (idempotent, aman dijalankan berkali-kali)
│   │   └── seed.js                     # Seed role default (Admin/Guru/Siswa) + 1 akun Admin awal
│   │
│   ├── repositories/                   # === DATA ACCESS LAYER (query SQL parameterized) ===
│   │   ├── userRepository.js           # CRUD user, OTP (setOtp/markEmailVerified), findByEmail
│   │   ├── examRepository.js
│   │   ├── examAssignmentRepository.js # Assignment ujian -> siswa (siapa yang meng-assign, dsb.)
│   │   ├── questionRepository.js       # + updateImageUrl/clearImageUrl (gambar soal)
│   │   ├── attemptRepository.js
│   │   ├── subjectRepository.js
│   │   ├── teacherProfileRepository.js
│   │   ├── studentProfileRepository.js
│   │   └── teacherStudentRepository.js
│   │
│   ├── services/                       # === BUSINESS LOGIC LAYER ===
│   │   ├── authService.js              # register (kirim OTP), verifyOtp, resendOtp, login, approval guard
│   │   ├── emailService.js             # Kirim email OTP via SMTP Gmail (nodemailer)
│   │   ├── userService.js              # Approve/reject/delete user (+ guard FK: guru dgn ujian aktif)
│   │   ├── examService.js              # CRUD ujian & soal + setQuestionImage/removeQuestionImage
│   │   ├── assignmentService.js        # Assign ujian ke siswa
│   │   ├── attemptService.js           # Logic remedial, attempt counter, scoring
│   │   ├── teacherProfileService.js    # + updatePhoto/removePhoto (foto profil)
│   │   └── studentProfileService.js
│   │
│   ├── controllers/                    # === CONTROLLER LAYER (HTTP req/res) ===
│   │   ├── authController.js           # /auth/register, /auth/verify-otp, /auth/resend-otp, /auth/login
│   │   ├── userController.js
│   │   ├── examController.js           # + uploadQuestionImage/deleteQuestionImage
│   │   ├── assignmentController.js
│   │   ├── attemptController.js
│   │   ├── teacherProfileController.js # + uploadPhoto/removePhoto
│   │   └── studentProfileController.js
│   │
│   ├── middlewares/
│   │   ├── authMiddleware.js           # Verifikasi JWT
│   │   ├── roleMiddleware.js           # Guard per-role (Admin/Guru/Siswa)
│   │   ├── uploadMiddleware.js         # Multer: profileUpload (foto guru), questionUpload (gambar soal)
│   │   └── errorHandler.js             # Global error handler (AppError -> response JSON)
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── examRoutes.js
│   │   ├── assignmentRoutes.js
│   │   ├── attemptRoutes.js
│   │   ├── teacherProfileRoutes.js
│   │   └── studentProfileRoutes.js
│   │
│   └── utils/
│       ├── AppError.js                 # Custom error class (message + HTTP status)
│       ├── asyncHandler.js             # Wrapper try/catch untuk controller async
│       └── otp.js                      # Generator kode OTP 6 digit
│
└── frontend/
    ├── index.html                      # Shell HTML (Tailwind CDN, memuat js/main.js sebagai module)
    └── js/
        ├── main.js                     # Bootstrap app, cek sesi, mount router
        ├── core/
        │   ├── api.js                  # Wrapper fetch ke backend (+ apiUpload untuk multipart/file)
        │   ├── router.js               # Hash-based router (termasuk route berparameter, mis. #verify-otp/<username>)
        │   ├── store.js                # Sesi login (token + user) di localStorage
        │   ├── dom.js                  # Helper render/manipulasi DOM
        │   └── utils.js                # Helper umum (format, toast, dsb.)
        ├── layout/
        │   └── shell.js                # Layout umum (navbar/sidebar per role)
        └── views/
            ├── auth.js                 # Login, Register, Verifikasi OTP
            ├── admin.js                # Dashboard Admin (approval user, kelola subject)
            ├── guru.js                 # Dashboard Guru (ujian/soal + gambar soal, nilai siswa, foto profil)
            ├── siswa.js                # Dashboard Siswa (kerjakan ujian, lihat gambar soal & foto guru)
            └── profile.js              # Lengkapi profil (guru/siswa)
```

## Alur Request (contoh: Guru membuat ujian)

```
frontend/js/views/guru.js
  -> api.js (POST /api/exams, attach JWT)
  -> backend/routes/examRoutes.js
  -> backend/middlewares/authMiddleware.js   (verifikasi token)
  -> backend/middlewares/roleMiddleware.js   (harus role Guru)
  -> backend/controllers/examController.js   (parse req.body)
  -> backend/services/examService.js         (validasi bisnis: passing grade, dst.)
  -> backend/repositories/examRepository.js  (INSERT ke MySQL)
```

## Autentikasi & Registrasi (dengan Verifikasi Email OTP)

Sejak fitur verifikasi email ditambahkan, registrasi tidak langsung membuat akun
`pending` seperti sebelumnya — ada tahap verifikasi OTP di antaranya:

```
1. POST /auth/register        (username, email @gmail.com, password, name, roleName)
     -> userRepository.create(status='unverified')
     -> generateOtp() + userRepository.setOtp(...)
     -> emailService.sendOtpEmail()   (SMTP Gmail, nodemailer)

2. POST /auth/verify-otp       (username, otp)
     -> cek kecocokan kode & belum expired (otp_expires_at, 10 menit)
     -> userRepository.markEmailVerified()   -> status: unverified -> pending

3. (Admin) approve/reject user pending, seperti alur sebelumnya
     -> status: pending -> approved / rejected

4. POST /auth/login   -> hanya berhasil kalau status === 'approved'
```

`POST /auth/resend-otp` mengirim ulang kode OTP baru, dibatasi cooldown 3 menit
sejak pengiriman terakhir (`otp_last_sent_at`), dicek di backend (bukan cuma UI)
supaya tidak bisa dibypass.

## Status Akun (kolom `users.status`)

```
unverified --(verifikasi OTP email)--> pending --(admin approve)--> approved
                                             \--(admin reject)-----> rejected
```

## Skema Database (MySQL, ringkas)

Tabel utama & relasi penting (lihat `backend/database/migrate.js` untuk DDL lengkap):

- **roles** — Admin / Guru / Siswa
- **users** — akun (username, email, password hash, role_id, status, kolom OTP:
  `otp_code`, `otp_expires_at`, `otp_last_sent_at`, `email_verified`)
- **subjects** — mata pelajaran (dibuat Admin)
- **exams** — ujian (dimiliki oleh `teacher_id`, punya `passing_grade`)
- **questions** / **question_options** — soal pilihan ganda per ujian (`questions.image_url` untuk gambar soal, opsional)
- **exam_assignments** — penugasan ujian ke siswa (`student_id`, `assigned_by`)
- **exam_attempts** / **student_answers** — riwayat pengerjaan & jawaban siswa
- **teacher_profiles** / **student_profiles** — data profil tambahan (`teacher_profiles.photo_url` untuk foto profil, opsional)
- **teacher_students** — relasi guru-siswa (mis. per kelas)

## Upload File (Foto Profil & Gambar Soal)

```
POST   /api/profile/photo           (Guru, multipart field: photo)   -> unggah/ganti foto profil
DELETE /api/profile/photo           (Guru)                           -> hapus foto profil
POST   /api/questions/:id/image     (Guru, multipart field: image)   -> unggah/ganti gambar soal
DELETE /api/questions/:id/image     (Guru)                           -> hapus gambar soal
```

- Ditangani `backend/middlewares/uploadMiddleware.js` (Multer): validasi tipe file (JPEG/PNG/GIF/WebP) & ukuran maks 5MB, simpan ke `backend/uploads/profiles/` atau `backend/uploads/questions/`.
- File disajikan statis lewat `express.static` di `backend/server.js` (prefix `/uploads`).
- Saat foto/gambar diganti atau dihapus, file lama di disk otomatis dibersihkan (`deleteFileIfExists` di masing-masing service).
- Folder `backend/uploads/` di-gitignore (runtime data, bukan kode) — pastikan folder ini ada saat deploy (dibuat otomatis oleh `uploadMiddleware.js` jika belum ada).

### Kebijakan FK saat user dihapus (hard delete)

Supaya hapus akun tidak gagal dengan error FK tapi juga tidak diam-diam merusak
data milik user lain:

| Tabel.kolom                        | Perilaku saat user direferensikan dihapus         |
|-------------------------------------|----------------------------------------------------|
| `exam_attempts.user_id`             | `ON DELETE CASCADE` — riwayat attempt milik siswa itu sendiri ikut terhapus |
| `exam_assignments.assigned_by`      | `ON DELETE SET NULL` — assignment ke siswa tetap ada, hanya info pemberi tugas yang hilang |
| `exam_assignments.student_id`       | `ON DELETE CASCADE` |
| `exams.teacher_id`                  | **RESTRICT** (default) — sengaja diblokir; `userService.deleteUser` mengecek dulu & kasih pesan jelas kalau guru masih punya ujian, supaya ujian + riwayat nilai siswa lain tidak ikut lenyap |
| `teacher_profiles/student_profiles.user_id` | `ON DELETE CASCADE` |
| `teacher_students.teacher_id/student_id`    | `ON DELETE CASCADE` |

## Environment Variables Kunci

Lihat `.env.example` untuk daftar lengkap. Yang berkaitan dengan OTP/email:

```
EMAIL_USER=akun_pengirim@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   # App Password Gmail (bukan password akun biasa)
OTP_EXPIRES_MINUTES=10
OTP_RESEND_COOLDOWN_MINUTES=3
```