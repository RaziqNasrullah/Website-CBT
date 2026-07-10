const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Semua route di bawah wajib login
router.use(authMiddleware);

// ---- Subjects ----
router.get('/subjects', examController.listSubjects);
router.post('/subjects', roleMiddleware('Guru', 'Admin'), examController.createSubject);

// ---- Exams ----
router.get('/exams', examController.listActive); // daftar ujian aktif (semua role)
router.get('/exams/mine', roleMiddleware('Guru'), examController.listMine);
router.get('/exams/all', roleMiddleware('Admin'), examController.listAll);
router.get('/exams/:id', examController.getDetail);
router.post('/exams', roleMiddleware('Guru'), examController.create);
router.put('/exams/:id', roleMiddleware('Guru'), examController.update);
router.delete('/exams/:id', roleMiddleware('Guru'), examController.remove);

// ---- Questions (scoped to exam) ----
router.get('/exams/:id/questions', roleMiddleware('Guru'), examController.getQuestionsForTeacher);
router.post('/exams/:id/questions', roleMiddleware('Guru'), examController.addQuestion);

// ---- Questions (scoped to question id) ----
router.put('/questions/:questionId', roleMiddleware('Guru'), examController.updateQuestion);
router.delete('/questions/:questionId', roleMiddleware('Guru'), examController.deleteQuestion);

module.exports = router;
