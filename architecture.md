cbt-app/
├── package.json
├── .env.example
├── .gitignore
├── backend/
│   ├── server.js                  # Entry point (akan dibuat di tahap selanjutnya)
│   ├── config/
│   │   └── db.js                  # Koneksi better-sqlite3 (singleton)
│   ├── database/
│   │   ├── cbt.db                 # File database SQLite (auto-generated)
│   │   ├── migrate.js             # Script bikin tabel sesuai skema
│   │   ├── seed.js                # Seed role default & admin pertama
│   │   └── migrations/            # (opsional) file SQL terpisah per tabel
│   ├── repositories/              # === DATA ACCESS LAYER ===
│   │   ├── userRepository.js
│   │   ├── examRepository.js
│   │   ├── questionRepository.js
│   │   ├── attemptRepository.js
│   │   └── subjectRepository.js
│   ├── services/                  # === BUSINESS LOGIC LAYER ===
│   │   ├── authService.js         # login, register, approval
│   │   ├── examService.js         # CRUD ujian, soal
│   │   ├── attemptService.js      # logic remedial, attempt counter, scoring
│   │   └── userService.js
│   ├── controllers/                # === CONTROLLER LAYER ===
│   │   ├── authController.js
│   │   ├── examController.js
│   │   ├── attemptController.js
│   │   └── userController.js
│   ├── middlewares/
│   │   ├── authMiddleware.js      # verifikasi JWT
│   │   └── roleMiddleware.js      # guard per-role (admin/guru/siswa)
│   └── routes/
│       ├── authRoutes.js
│       ├── examRoutes.js
│       ├── attemptRoutes.js
│       └── userRoutes.js
└── frontend/
    └── index.html                  # Mini-SPA (Vanilla JS + Tailwind CDN, hash routing)