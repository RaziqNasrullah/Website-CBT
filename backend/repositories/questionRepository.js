/**
 * Question Repository
 * Data Access Layer - query mentah ke tabel questions & options (MySQL, async/await).
 */
const pool = require('../config/db');

const questionRepository = {
  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM questions WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findAllByExam(examId) {
    const [rows] = await pool.execute(
      'SELECT * FROM questions WHERE exam_id = ? ORDER BY id ASC',
      [examId]
    );
    return rows;
  },

  // Soal lengkap beserta opsi jawaban (untuk Guru, termasuk is_correct)
  async findAllByExamWithOptions(examId) {
    const questions = await this.findAllByExam(examId);
    const result = [];
    for (const q of questions) {
      const [options] = await pool.execute(
        'SELECT * FROM options WHERE question_id = ? ORDER BY id ASC',
        [q.id]
      );
      result.push({ ...q, options });
    }
    return result;
  },

  // Soal untuk Siswa saat mengerjakan ujian (tanpa is_correct)
  async findAllByExamForStudent(examId) {
    const questions = await this.findAllByExam(examId);
    const result = [];
    for (const q of questions) {
      const [options] = await pool.execute(
        'SELECT id, question_id, option_text FROM options WHERE question_id = ? ORDER BY id ASC',
        [q.id]
      );
      result.push({ ...q, options });
    }
    return result;
  },

  async create({ exam_id, question_text, score_weight }) {
    const [result] = await pool.execute(
      `INSERT INTO questions (exam_id, question_text, score_weight)
       VALUES (?, ?, ?)`,
      [exam_id, question_text, score_weight]
    );
    return this.findById(result.insertId);
  },

  async update(id, { question_text, score_weight }) {
    await pool.execute(
      'UPDATE questions SET question_text = ?, score_weight = ? WHERE id = ?',
      [question_text, score_weight, id]
    );
    return this.findById(id);
  },

  async deleteById(id) {
    const [result] = await pool.execute('DELETE FROM questions WHERE id = ?', [id]);
    return result;
  },

  // ---- Options ----
  async findOptionById(id) {
    const [rows] = await pool.execute('SELECT * FROM options WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findOptionsByQuestion(questionId) {
    const [rows] = await pool.execute('SELECT * FROM options WHERE question_id = ?', [questionId]);
    return rows;
  },

  async createOption({ question_id, option_text, is_correct }) {
    const [result] = await pool.execute(
      `INSERT INTO options (question_id, option_text, is_correct)
       VALUES (?, ?, ?)`,
      [question_id, option_text, is_correct ? 1 : 0]
    );
    return this.findOptionById(result.insertId);
  },

  async updateOption(id, { option_text, is_correct }) {
    await pool.execute(
      'UPDATE options SET option_text = ?, is_correct = ? WHERE id = ?',
      [option_text, is_correct ? 1 : 0, id]
    );
    return this.findOptionById(id);
  },

  async deleteOptionById(id) {
    const [result] = await pool.execute('DELETE FROM options WHERE id = ?', [id]);
    return result;
  },

  async deleteOptionsByQuestion(questionId) {
    const [result] = await pool.execute('DELETE FROM options WHERE question_id = ?', [questionId]);
    return result;
  },
};

module.exports = questionRepository;
