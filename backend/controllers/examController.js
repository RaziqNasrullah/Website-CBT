/**
 * Exam Controller
 * Controller Layer - CRUD mata pelajaran, ujian, soal, dan opsi jawaban.
 */
const examService = require('../services/examService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const examController = {
  // ---- Subjects ----
  // GET /api/subjects
  listSubjects: asyncHandler(async (req, res) => {
    const subjects = await examService.listSubjects();
    res.status(200).json({ success: true, data: subjects });
  }),

  // POST /api/subjects
  createSubject: asyncHandler(async (req, res) => {
    const subject = await examService.createSubject(req.body.subject_name);
    res.status(201).json({ success: true, data: subject });
  }),

  // ---- Exams ----
  // GET /api/exams - daftar ujian aktif (untuk Siswa)
  listActive: asyncHandler(async (req, res) => {
    const exams = await examService.listActiveExams();
    res.status(200).json({ success: true, data: exams });
  }),

  // GET /api/exams/mine - daftar ujian milik Guru yang login
  listMine: asyncHandler(async (req, res) => {
    const exams = await examService.listExamsByTeacher(req.user.id);
    res.status(200).json({ success: true, data: exams });
  }),

  // GET /api/exams/all - daftar semua ujian (untuk Admin)
  listAll: asyncHandler(async (req, res) => {
    const exams = await examService.listAllExams();
    res.status(200).json({ success: true, data: exams });
  }),

  // GET /api/exams/:id
  getDetail: asyncHandler(async (req, res) => {
    const exam = await examService.getExamDetail(req.params.id);
    res.status(200).json({ success: true, data: exam });
  }),

  // POST /api/exams
  create: asyncHandler(async (req, res) => {
    const { title, subject_id, duration, minimum_score } = req.body;
    const exam = await examService.createExam(req.user.id, {
      title,
      subject_id,
      duration,
      minimum_score,
    });
    res.status(201).json({ success: true, message: 'Ujian berhasil dibuat.', data: exam });
  }),

  // PUT /api/exams/:id
  update: asyncHandler(async (req, res) => {
    const { title, subject_id, duration, minimum_score, is_active } = req.body;
    const exam = await examService.updateExam(req.params.id, req.user.id, {
      title,
      subject_id,
      duration,
      minimum_score,
      is_active,
    });
    res.status(200).json({ success: true, message: 'Ujian berhasil diperbarui.', data: exam });
  }),

  // DELETE /api/exams/:id
  remove: asyncHandler(async (req, res) => {
    const result = await examService.deleteExam(req.params.id, req.user.id);
    res.status(200).json({ success: true, ...result });
  }),

  // ---- Questions ----
  // GET /api/exams/:id/questions (Guru, lengkap dengan jawaban benar)
  getQuestionsForTeacher: asyncHandler(async (req, res) => {
    const questions = await examService.getQuestionsForTeacher(req.params.id, req.user.id);
    res.status(200).json({ success: true, data: questions });
  }),

  // POST /api/exams/:id/questions
  addQuestion: asyncHandler(async (req, res) => {
    const { question_text, score_weight, options } = req.body;
    const question = await examService.addQuestion(req.params.id, req.user.id, {
      question_text,
      score_weight,
      options,
    });
    res.status(201).json({ success: true, message: 'Soal berhasil ditambahkan.', data: question });
  }),

  // PUT /api/questions/:questionId
  updateQuestion: asyncHandler(async (req, res) => {
    const { question_text, score_weight, options } = req.body;
    const question = await examService.updateQuestion(req.params.questionId, req.user.id, {
      question_text,
      score_weight,
      options,
    });
    res.status(200).json({ success: true, message: 'Soal berhasil diperbarui.', data: question });
  }),

  // DELETE /api/questions/:questionId
  deleteQuestion: asyncHandler(async (req, res) => {
    const result = await examService.deleteQuestion(req.params.questionId, req.user.id);
    res.status(200).json({ success: true, ...result });
  }),

  // ---- Question Image ----
  // POST /api/questions/:questionId/image — multipart, field: image
  uploadQuestionImage: asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('File gambar tidak ditemukan.', 400);
    const imageUrl = `/uploads/questions/${req.file.filename}`;
    const question = await examService.setQuestionImage(req.params.questionId, req.user.id, imageUrl);
    res.status(200).json({
      success: true,
      message: 'Gambar soal berhasil diunggah.',
      data: { image_url: imageUrl, question },
    });
  }),

  // DELETE /api/questions/:questionId/image
  deleteQuestionImage: asyncHandler(async (req, res) => {
    await examService.removeQuestionImage(req.params.questionId, req.user.id);
    res.status(200).json({ success: true, message: 'Gambar soal berhasil dihapus.' });
  }),
};

module.exports = examController;
