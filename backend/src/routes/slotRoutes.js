// desss/backend/src/routes/slotRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllSlots,
  getMySlots,
  createSlot,
  applyToSlot,
  unapplyFromSlot,
  adminAssignToSlot,
  adminUnassignFromSlot,
  updateSlot,
  deleteSlot,
  bulkUpsertSlots,
  assignAsBcc
} = require('../controllers/slotController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, getAllSlots);

router.get('/my', protect, getMySlots);

router.post('/', protect, admin, createSlot);

router.post('/:id/apply', protect, applyToSlot);

router.delete('/:id/unapply', protect, unapplyFromSlot);

router.post('/:id/admin-assign', protect, admin, adminAssignToSlot);

router.post('/:id/admin-unassign', protect, admin, adminUnassignFromSlot);

router.put('/:id', protect, admin, updateSlot);

router.delete('/:id', protect, admin, deleteSlot);

router.post('/bulk-upsert', protect, admin, bulkUpsertSlots);

router.post('/:id/assign-bcc', protect, admin, assignAsBcc);

module.exports = router;