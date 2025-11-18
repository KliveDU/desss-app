const express = require('express');
const router = express.Router();

const {
  getAllExams,
  createExam,
  approveExamForFaculty,
  unassignExamForFaculty,
  assignExamByAdmin,
  updateExam,    
  deleteExam     
} = require('../controllers/examController');

const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getAllExams)
  .post(protect, admin, createExam);

router.post('/approve/:id', protect, approveExamForFaculty);
router.post('/unassign/:id', protect, unassignExamForFaculty);
router.post('/assign/:id', protect, admin, assignExamByAdmin);
router.put('/:id', protect, admin, updateExam);
router.delete('/:id', protect, admin, deleteExam);

module.exports = router;