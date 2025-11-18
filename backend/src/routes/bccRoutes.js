// backend/src/routes/bccRoutes.js
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');

// ✅ Import assignBccToSlot
const {
  getAllBcc,
  assignBccToSlot, // ✅ Import it here
  deleteBcc,
  bulkDeleteBcc
} = require('../controllers/bccController');

// Routes
router.get('/', protect, admin, getAllBcc);
router.post('/assign', protect, admin, assignBccToSlot); // ✅ Now defined
router.delete('/:id', protect, admin, deleteBcc);
router.post('/bulk-delete', protect, admin, bulkDeleteBcc);

module.exports = router;