const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getLoggedInUser,
  bulkCreateUsers
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, admin, getAllUsers)
  .post(protect, admin, createUser);

router.post('/bulk', protect, admin, bulkCreateUsers); // ← NEW

router.get('/self', protect, getLoggedInUser);

router.route('/:id')
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

  module.exports = router;