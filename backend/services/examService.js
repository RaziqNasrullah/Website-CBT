/**
 * Exam Service
 * Business Logic Layer - CRUD ujian, soal, dan opsi jawaban (async/await, MySQL).
 * Validasi kepemilikan (hanya Guru pembuat ujian yang boleh mengubah/menghapus).
 */
const path = require('path');
const fs = require('fs');

const examRepository = require('../repositories/examRepository');
const questionRepository = require('../repositories/questionRepository');
const subjectRepository = require('../repositories/subjectRepository');
const AppError = require('../utils/AppError');

function ensureOwnership(exam, teacherId) {
  if (!exam) {
    throw new AppError('Ujian tidak ditemukan.', 404);
  }
  if (Number(exam.teacher_id) !== Number(teacherId)) {
    throw new AppError('Anda tidak memiliki akses untuk mengubah ujian ini.', 403);
  }
}

function deleteFileIfExists(filePath) {
  if (!filePath) return;
  const abs = path.join(__dirname, '..', filePath);
  fs.unlink(abs, (err) => {
    if (err) console.warn('Tidak bisa hapus file lama:', err.message);
  });
}

const examService = {
  // ---- Subjects ----
  async listSubjects() {
    return subjectRepository.findAll();
  },

  async createSubject(subjectName) {
    if (!subjectName || !subjectName.trim()) {
      throw new AppError('Nama mata pelajaran wajib diisi.');
    }
    const existing = await subjectRepository.findByName(subjectName.trim());
    if (existing) {
      throw new AppError('Mata pelajaran sudah ada.', 409);
    }
    return subjectRepository.create(subjectName.trim());
  },

  // ---- Exams ----
  async listActiveExams() {
    return examRepository.findAllActive();
  },

  async listExamsByTeacher(teacherId) {
    return examRepository.findAllByTeacher(teacherId);
  },

  async listAllExams() {
    return examRepository.findAll();
  },

  async getExamDetail(examId) {
    const exam = await examRepository.findById(examId);
    if (!exam) {
      throw new AppError('Ujian tidak ditemukan.', 404);
    }
    return exam;
  },

  async createExam(teacherId, { title, subject_id, duration, minimum_score }) {
    if (!title || !subject_id || !duration || minimum_score === undefined) {
      throw new AppError('Semua field ujian wajib diisi (judul, mapel, durasi, nilai minimal).');
    }
    if (duration <= 0) {
      throw new AppError('Durasi ujian harus lebih dari 0 menit.');
    }
    if (minimum_score < 0 || minimum_score > 100) {
      throw new AppError('Nilai minimal harus berada di antara 0 - 100.');
    }

    const subject = await subjectRepository.findById(subject_id);
    if (!subject) {
      throw new AppError('Mata pelajaran tidak ditemukan.', 404);
    }

    return examRepository.create({
      title: title.trim(),
      subject_id,
      teacher_id: teacherId,
      duration,
      minimum_score,
      is_active: true,
    });
  },

  async updateExam(examId, teacherId, { title, subject_id, duration, minimum_score, is_active }) {
    const exam = await examRepository.findById(examId);
    ensureOwnership(exam, teacherId);

    if (minimum_score !== undefined && (minimum_score < 0 || minimum_score > 100)) {
      throw new AppError('Nilai minimal harus berada di antara 0 - 100.');
    }

    return examRepository.update(examId, {
      title: title ?? exam.title,
      subject_id: subject_id ?? exam.subject_id,
      duration: duration ?? exam.duration,
      minimum_score: minimum_score ?? exam.minimum_score,
      is_active: is_active ?? exam.is_active,
    });
  },

  async deleteExam(examId, teacherId) {
    const exam = await examRepository.findById(examId);
    ensureOwnership(exam, teacherId);
    await examRepository.deleteById(examId);
    return { message: 'Ujian berhasil dihapus.' };
  },

  // ---- Questions & Options ----
  async getQuestionsForTeacher(examId, teacherId) {
    const exam = await examRepository.findById(examId);
    ensureOwnership(exam, teacherId);
    return questionRepository.findAllByExamWithOptions(examId);
  },

  async getQuestionsForStudent(examId) {
    const exam = await examRepository.findById(examId);
    if (!exam) {
      throw new AppError('Ujian tidak ditemukan.', 404);
    }
    return questionRepository.findAllByExamForStudent(examId);
  },

  async addQuestion(examId, teacherId, { question_text, score_weight, options }) {
    const exam = await examRepository.findById(examId);
    ensureOwnership(exam, teacherId);

    if (!question_text || !question_text.trim()) {
      throw new AppError('Teks pertanyaan wajib diisi.');
    }
    if (!Array.isArray(options) || options.length < 2) {
      throw new AppError('Soal pilihan ganda minimal harus punya 2 opsi jawaban.');
    }
    const correctCount = options.filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      throw new AppError('Setiap soal wajib memiliki tepat satu jawaban benar.');
    }

    const question = await questionRepository.create({
      exam_id: examId,
      question_text: question_text.trim(),
      score_weight: score_weight || 1,
    });

    for (const opt of options) {
      await questionRepository.createOption({
        question_id: question.id,
        option_text: opt.option_text,
        is_correct: !!opt.is_correct,
      });
    }

    const allQuestions = await questionRepository.findAllByExamWithOptions(examId);
    return allQuestions.find((q) => q.id === question.id);
  },

  async updateQuestion(questionId, teacherId, { question_text, score_weight, options }) {
    const question = await questionRepository.findById(questionId);
    if (!question) {
      throw new AppError('Pertanyaan tidak ditemukan.', 404);
    }
    const exam = await examRepository.findById(question.exam_id);
    ensureOwnership(exam, teacherId);

    await questionRepository.update(questionId, {
      question_text: question_text ?? question.question_text,
      score_weight: score_weight ?? question.score_weight,
    });

    if (Array.isArray(options)) {
      const correctCount = options.filter((o) => o.is_correct).length;
      if (correctCount !== 1) {
        throw new AppError('Setiap soal wajib memiliki tepat satu jawaban benar.');
      }
      await questionRepository.deleteOptionsByQuestion(questionId);
      for (const opt of options) {
        await questionRepository.createOption({
          question_id: questionId,
          option_text: opt.option_text,
          is_correct: !!opt.is_correct,
        });
      }
    }

    const allQuestions = await questionRepository.findAllByExamWithOptions(exam.id);
    return allQuestions.find((q) => q.id === questionId);
  },

  async deleteQuestion(questionId, teacherId) {
    const question = await questionRepository.findById(questionId);
    if (!question) {
      throw new AppError('Pertanyaan tidak ditemukan.', 404);
    }
    const exam = await examRepository.findById(question.exam_id);
    ensureOwnership(exam, teacherId);
    // Hapus gambar soal dari disk jika ada, sebelum baris DB-nya dihapus
    deleteFileIfExists(question.image_url);
    await questionRepository.deleteById(questionId);
    return { message: 'Pertanyaan berhasil dihapus.' };
  },

  // ---- Question Image ----
  async setQuestionImage(questionId, teacherId, imageUrl) {
    const question = await questionRepository.findById(questionId);
    if (!question) throw new AppError('Pertanyaan tidak ditemukan.', 404);
    const exam = await examRepository.findById(question.exam_id);
    ensureOwnership(exam, teacherId);
    // Hapus gambar lama dari disk sebelum diganti
    deleteFileIfExists(question.image_url);
    return questionRepository.updateImageUrl(questionId, imageUrl);
  },

  async removeQuestionImage(questionId, teacherId) {
    const question = await questionRepository.findById(questionId);
    if (!question) throw new AppError('Pertanyaan tidak ditemukan.', 404);
    const exam = await examRepository.findById(question.exam_id);
    ensureOwnership(exam, teacherId);
    if (!question.image_url) throw new AppError('Tidak ada gambar pada soal ini.', 400);
    deleteFileIfExists(question.image_url);
    return questionRepository.clearImageUrl(questionId);
  },
};

module.exports = examService;
