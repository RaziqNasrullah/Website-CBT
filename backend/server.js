require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes            = require('./routes/authRoutes');
const userRoutes            = require('./routes/userRoutes');
const examRoutes            = require('./routes/examRoutes');
const attemptRoutes         = require('./routes/attemptRoutes');
const assignmentRoutes      = require('./routes/assignmentRoutes');
const teacherProfileRoutes  = require('./routes/teacherProfileRoutes');
const studentProfileRoutes  = require('./routes/studentProfileRoutes');
const errorHandler          = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sajikan frontend Mini-SPA (Vanilla JS) secara statis
app.use(express.static(path.join(__dirname, '../frontend')));

// Healthcheck (didaftarkan sebelum router lain agar tidak ikut tertahan authMiddleware)
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'CBT App API berjalan normal.' });
});

// ---- API Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', examRoutes);            // /api/subjects, /api/exams, /api/questions/:id
app.use('/api', attemptRoutes);         // /api/student/exams, /api/attempts/:id/...
app.use('/api', assignmentRoutes);      // /api/teachers/:id/students, /api/exams/:id/assignments
app.use('/api', teacherProfileRoutes);  // /api/profile/me, /api/profile/requests
app.use('/api', studentProfileRoutes);  // /api/student/profile/me

// Fallback ke index.html untuk mendukung hash routing Mini-SPA
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handler harus didaftarkan paling akhir
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`CBT App server berjalan di http://localhost:${PORT}`);
});